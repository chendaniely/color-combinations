// The browser half of deep linking: `location`, `history`, and the dataset.
//
// All the string logic is in src/core/urlState.ts, which is pure. This file
// owns the three things that cannot be: the address bar, the history stack, and
// checking a decoded id against the book.
//
// Why the split matters beyond tidiness — `tests/core-purity.test.ts` forbids
// browser globals in src/core, and that rule is what makes the encoder testable
// without a browser at all. 21 hostile URLs run in
// milliseconds because of it.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { isColorKey, keyColorId } from './core/dataset'
import { decodeState, encodeState } from './core/urlState'
import { initialState, type Action, type AppState } from './core/state'
import { dataset } from './data'
import { anyOverlayOpen, closeAllOverlays, subscribeOverlays } from './overlayHistory'

/**
 * Drops values the book does not contain.
 *
 * A deliberate asymmetry here, and it is a UX decision rather than a technical
 * one:
 *
 * - FILTERS and PALETTE KEYS are silently dropped. They refine a view, so a
 *   stale one should quietly stop applying — a shared Match palette that has
 *   lost one colour is still worth opening.
 * - The SELECTION is left alone even when its id is unknown, so the detail
 *   panels can show `MissingPanel` and say "this isn't in the book". The
 *   selection is the SUBJECT of the link; silently dropping it would land the
 *   reader on a page with no explanation of what they were sent.
 *
 * Dropping the palette keys is also load-bearing rather than cosmetic:
 * `keyName` throws on an unknown key, and until v1.7.2 that took the whole app
 * down. Both remaining callers now use the tolerant `keyLabel`, so this is
 * belt and braces.
 */
export function sanitise(partial: Partial<AppState>): Partial<AppState> {
  const out = { ...partial }

  const knownKey = (key: string): boolean =>
    isColorKey(key)
      ? dataset.colorById.has(keyColorId(key))
      : dataset.groupById.has(key)

  if (out.palette) {
    const keys = out.palette.keys.filter(knownKey)
    out.palette = { ...out.palette, keys }
  }

  if (out.browse) {
    const { family, shade, colorId, palette } = out.browse
    const cleaned = {
      family: family && dataset.groupById.has(family) ? family : '',
      shade: shade && dataset.groupById.has(shade) ? shade : '',
      colorId: colorId && dataset.colorById.has(Number(colorId)) ? colorId : '',
      // Never comes from a URL (see urlState.ts), but a caller could pass one.
      palette: palette ? { ...palette, ids: palette.ids.filter((id) => dataset.colorById.has(id)) } : null,
    }
    // All three dropdowns gone AND no palette means the block said nothing; let
    // the default stand rather than carrying an object of empty strings.
    if (!cleaned.family && !cleaned.shade && !cleaned.colorId && !cleaned.palette) delete out.browse
    else out.browse = cleaned
  }

  return out
}

/** The state a page load should start in, given whatever is in the address bar. */
export function initialStateFromUrl(): AppState {
  if (typeof location === 'undefined') return initialState
  return { ...initialState, ...sanitise(decodeState(location.hash)) }
}

/**
 * Keeps the address bar in step with the state, and honours Back and Forward.
 *
 * NAVIGATIONS PUSH, REFINEMENTS REPLACE. Opening a panel or switching tab adds
 * a history entry, so Back closes the panel or returns to the previous tab —
 * what people expect, and on Android Back IS the gesture for "dismiss this".
 * Filters, granularity, sizes, goggles, the floor and the season all replace, so
 * browsing does not bury the site in history entries.
 *
 * The owner's decision covered panels and filters. Views were not mentioned and
 * were first built as refinements, which meant opening the You tab, taking a
 * photo and pressing Back left the SITE and lost the reading. Corrected after
 * probing it in a real browser.
 */
export function useUrlSync(state: AppState, dispatch: (a: Action) => void): void {
  // What we last wrote, so a hash WE caused is never mistaken for the visitor
  // navigating. pushState and replaceState fire neither popstate nor
  // hashchange, but a hand-edited address bar fires hashchange, and that is a
  // real thing to support.
  const written = useRef<string | null>(null)
  // The previous selection and view, to decide push versus replace.
  const lastSelection = useRef(state.selection)
  const lastView = useRef(state.view)
  // The reading never enters a URL, so it must be carried across a history
  // move by hand. Without this, pressing Back after a capture would silently
  // discard the visitor's own analysis and send them to the photo prompt.
  const reading = useRef(state.you.reading)
  reading.current = state.you.reading

  // BACK DISMISSES A FULL-SCREEN OVERLAY instead of leaving the site.
  //
  // Owner, 2026-07-30: "clicking back on sample should close that drop down,
  // right now back actually goes back on the URL. so i will kick myself out of
  // the site." On a fresh load the sampler is the first thing many people open,
  // so there is nothing behind it and Back really does leave.
  //
  // An entry has to be PUSHED when the overlay opens; there is no way to
  // "absorb" a Back that has nothing to go back to. urlSync pushes it, urlSync
  // consumes it, and Overlay only reports that it is open — see
  // src/overlayHistory.ts for the two attempts that failed by splitting this.
  const overlayOpen = useSyncExternalStore(
    subscribeOverlays, anyOverlayOpen, () => false)
  /** We pushed an entry for the current run of overlays and it is still live. */
  const marker = useRef(false)
  /** Pops we caused ourselves, which must not be read as the visitor moving. */
  const selfPops = useRef(0)
  /**
   * The marker is still the current entry and the next write must REPLACE it.
   *
   * Without this the state effect below saw a changed view and PUSHED, leaving
   * the marker behind as a duplicate of the pre-overlay entry — so one Back
   * press visibly did nothing. Measured: Browse -> Sample -> Pick -> Explore ->
   * Match, then Back gave #/browse, #/browse, /. That is the same dead entry
   * this whole mechanism records as attempt 2's failure mode, arriving by a
   * different door.
   */
  const overwriteMarker = useRef(false)

  // A marker left over from a previous page life: `history.state` survives a
  // reload, so a page can start sitting on an entry flagged as an overlay with
  // no overlay open. Clearing the flag stops a later close from trying to pop
  // an entry that is not ours.
  //
  // MOUNT ONLY, and deliberately so. A Forward press can also land on a stale
  // marker, which this does not catch — but both readers of `history.state`
  // gate on `marker.current`, which is only ever set by a push we made in this
  // page life, so a stale flag is inert rather than harmful. An earlier version
  // of this comment claimed to cover the Forward case, which it never did.
  //
  // What survives either way is the marker ENTRY. After a reload with an
  // overlay open, the first Back lands on a duplicate of the current URL and
  // appears to do nothing. Removing a history entry is not something the
  // platform offers, so this is a residual of the design, not an oversight.
  useEffect(() => {
    if (history.state?.overlay && !anyOverlayOpen()) {
      history.replaceState(null, '',
        `${location.pathname}${location.search}${location.hash}`)
    }
  }, [])

  useEffect(() => {
    if (overlayOpen && !marker.current) {
      marker.current = true
      // Same URL: an overlay is not a place, and putting one in the address bar
      // would make it shareable, which a half-finished capture should not be.
      history.pushState({ overlay: true }, '',
        `${location.pathname}${location.search}${location.hash}`)
      return
    }
    if (!overlayOpen && marker.current) {
      marker.current = false
      // Two ways out, and they need opposite treatment.
      //
      // CLOSED WITH NOTHING CHANGED (the x, or Escape): the marker is still the
      // current entry and is now litter. Pop it, or the visitor's next Back
      // press lands on an identical URL and appears to do nothing.
      //
      // CLOSED BY CHOOSING SOMETHING (ColorMatches seeding Match, or sending a
      // palette to Browse): the state effect below is about to write the new
      // URL, and because it was suspended while the overlay was up, the entry it
      // replaces is the marker. So the marker BECOMES the new state and must not
      // be popped — popping here as well is the race that broke the first
      // attempt.
      //
      // The consequence is a KNOWN GAP, not a claim that this is ideal: Back
      // from the destination lands on whatever preceded the overlay, skipping
      // the task rather than stepping back through it. Measured 2026-07-30 —
      // from the wheel, sampling a colour into Match and pressing Back returns
      // to the wheel, not to the sampler's nearest-colour list. The owner wants
      // that changed; see TODO.md, and the test that pins it.
      if (encodeState(state) === written.current && history.state?.overlay) {
        selfPops.current += 1
        history.back()
      } else if (history.state?.overlay) {
        overwriteMarker.current = true
      }
    }
  }, [overlayOpen, state])

  useEffect(() => {
    // Suspended while an overlay is up. Nothing may touch the stack between the
    // marker being pushed and the overlay closing: a replaceState here would
    // overwrite the marker, which is exactly how the second attempt failed.
    if (overlayOpen) return

    const hash = encodeState(state)
    const url = `${location.pathname}${location.search}${hash}`
    const current = `${location.pathname}${location.search}${location.hash}`
    if (url === current) {
      written.current = hash
      lastSelection.current = state.selection
      lastView.current = state.view
      return
    }

    // Push for a NAVIGATION, replace for a refinement.
    //
    // Opening a panel is a navigation, which is the owner's decision. So is
    // switching tab, which the decision did not mention and which the first
    // implementation treated as a refinement — with the result that going to the
    // You tab, taking a photo and pressing Back left the SITE rather than
    // returning to the wheel, losing the reading. Four tabs cannot pollute a
    // history the way granularity clicks would, and returning to the previous
    // tab is what Back means everywhere else on the web.
    //
    // Filters, granularity, sizes, goggles, the floor and the season all still
    // replace: those are refinements of a view you are already looking at.
    const opened = state.selection !== null && state.selection !== lastSelection.current
    const changedView = state.view !== lastView.current
    // Overwriting a live marker always replaces, whatever kind of change this
    // is: the marker occupies the slot this write belongs in, and pushing over
    // it would strand it as a duplicate the visitor has to press Back through.
    if (overwriteMarker.current) {
      history.replaceState(null, '', url)
      overwriteMarker.current = false
    } else if (opened || changedView) history.pushState(null, '', url)
    else history.replaceState(null, '', url)

    written.current = hash
    lastSelection.current = state.selection
    lastView.current = state.view
  }, [state, overlayOpen])

  useEffect(() => {
    const onNavigate = () => {
      // A pop we asked for while tidying up the marker. Not the visitor.
      if (selfPops.current > 0) {
        selfPops.current -= 1
        written.current = location.hash
        return
      }
      // Back with an overlay up means DISMISS. The entry being popped is the
      // marker, so the state behind it is the state we are already in: close
      // the overlay and restore nothing.
      //
      // BUT ONLY WHEN THE ADDRESS DID NOT ACTUALLY CHANGE. This used to return
      // unconditionally, which swallowed any real navigation that arrived while
      // an overlay was open — a pasted deep link, a Forward press, a
      // `location.hash =` — and then the state effect wrote the old URL back
      // over it. The visitor's navigation vanished with no sign it had been
      // ignored. Now a genuine hash change closes the overlay and then falls
      // through to be honoured like any other.
      if (anyOverlayOpen()) {
        marker.current = false
        closeAllOverlays()
        if (location.hash === written.current) {
          written.current = location.hash
          return
        }
      }
      if (location.hash === written.current) return
      const restored = { ...initialState, ...sanitise(decodeState(location.hash)) }
      dispatch({
        type: 'restore',
        // Keep the reading the visitor already has: the URL cannot carry one,
        // so taking the decoded null at face value would throw their analysis
        // away on a Back press.
        state: { ...restored, you: { ...restored.you, reading: reading.current } },
      })
      written.current = location.hash
    }
    addEventListener('popstate', onNavigate)
    addEventListener('hashchange', onNavigate)
    return () => {
      removeEventListener('popstate', onNavigate)
      removeEventListener('hashchange', onNavigate)
    }
  }, [dispatch])
}
