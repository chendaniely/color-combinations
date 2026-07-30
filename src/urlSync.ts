// The browser half of deep linking: `location`, `history`, and the dataset.
//
// All the string logic is in src/core/urlState.ts, which is pure. This file
// owns the three things that cannot be: the address bar, the history stack, and
// checking a decoded id against the book.
//
// Why the split matters beyond tidiness — `tests/core-purity.test.ts` forbids
// browser globals in src/core, and that rule is what makes the encoder testable
// without a browser at all. 29 assertions about hostile URLs run in
// milliseconds because of it.
import { useEffect, useRef } from 'react'
import { isColorKey, keyColorId } from './core/dataset'
import { decodeState, encodeState } from './core/urlState'
import { initialState, type Action, type AppState } from './core/state'
import { dataset } from './data'

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
    const { family, shade, colorId } = out.browse
    out.browse = {
      family: family && dataset.groupById.has(family) ? family : '',
      shade: shade && dataset.groupById.has(shade) ? shade : '',
      colorId: colorId && dataset.colorById.has(Number(colorId)) ? colorId : '',
    }
    // All three gone means the filter block said nothing; let the default stand
    // rather than carrying an object of empty strings.
    const b = out.browse
    if (!b.family && !b.shade && !b.colorId) delete out.browse
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

  useEffect(() => {
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
    if (opened || changedView) history.pushState(null, '', url)
    else history.replaceState(null, '', url)

    written.current = hash
    lastSelection.current = state.selection
    lastView.current = state.view
  }, [state])

  useEffect(() => {
    const onNavigate = () => {
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
