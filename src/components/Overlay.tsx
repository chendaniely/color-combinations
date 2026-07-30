import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// The one full-screen modal used by every sampler, camera and capture screen.
//
// Two things it fixes, both of which were real defects repeated seven times:
//
// 1. ACCESSIBILITY. These were `<div role="dialog">`, which announces itself as
//    a dialog while behaving like nothing of the sort: Tab walked straight out
//    into the page behind, Escape did nothing, and screen readers were never
//    told the rest of the page was inert. A native <dialog> opened with
//    showModal() gets a real focus trap, Escape-to-dismiss and implicit
//    aria-modal from the browser, none of which we have to write or maintain.
//
// 2. CSS CASCADE. ColorSampler renders inside SearchBox's `.search-box`, so
//    `.search-box input` (specificity 0,1,1) beat every bare single-class rule
//    an overlay defined. That bit the colour picker once already (wrong font,
//    plus an orange focus underline that made valid fields look invalid) and
//    was patched by scoping selectors harder — which left the trap armed for
//    the next overlay anyone added. Portalling to <body> removes the ancestor,
//    so descendant selectors in the page can no longer reach in at all.
//    Note the top layer alone would NOT have fixed this: CSS inheritance and
//    descendant matching follow the DOM tree, not paint order.
//
// Backdrop clicks deliberately do NOT dismiss: FaceCapture and ProbeReview are
// mid-task screens where a stray tap should not throw the capture away.
export function Overlay({ label, onClose, closeLabel = 'Close', className, children }: {
  label: string
  onClose: () => void
  // The visible × button's accessible name. Pass null to render no button —
  // for screens that provide their own explicit way back.
  closeLabel?: string | null
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Where focus was before we opened, so it can be put back. Captured before
    // showModal(), which moves focus itself.
    const opener = document.activeElement as HTMLElement | null

    // jsdom (29) still ships no showModal, so tests exercise this through the
    // polyfill in tests/setup.ts; the real modal semantics are asserted by the
    // Playwright suite instead, where an actual browser implements them.
    if (!el.open) el.showModal()

    // Move focus onto the dialog itself. showModal() focuses the first tabbable
    // child, which here is the × button — so a screen reader user's first news
    // of the dialog is the word "Close". Focusing the dialog makes it announce
    // its own label first, then lets Tab walk the content in order.
    //
    // UNCONDITIONAL, and that matters: the first version guarded this with
    // `if (!el.contains(document.activeElement))`, which never fired, because
    // showModal has already put focus inside by this point. jsdom's polyfill
    // moves no focus at all, so the guard looked correct there and the real
    // browser had to say otherwise.
    //
    // An element marked `autofocus` still wins — nothing uses one today, but
    // silently overriding an explicit request would be the same mistake in the
    // other direction.
    if (!el.querySelector('[autofocus]')) el.focus()

    return () => {
      if (el.open) el.close()
      // Restore focus to whatever opened this. Without it, dismissing an
      // overlay drops focus to the top of <body> and a keyboard user has to
      // Tab back through the whole header to get where they were.
      // `isConnected` guards the case where the trigger itself unmounted.
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  // BACK DOES NOT CLOSE THIS YET, and that is a known gap rather than an
  // oversight — see the entry in TODO.md.
  //
  // On a phone there is no Escape key, these overlays fill the screen, and Back
  // is what "cancel" means. Two implementations were tried on 2026-07-29 and
  // both were reverted:
  //
  // 1. Push an entry per overlay, pop it on close. Broke the capture flow:
  //    FaceCapture unmounts straight into ProbeReview, `history.back()` is
  //    asynchronous, and the queued pop landed after the next overlay had
  //    pushed — closing the review screen the instant it opened.
  // 2. Pool one entry per RUN of overlays with a module-level count and a
  //    deferred pop. Fixed the handoff, then lost to `urlSync`: its
  //    `replaceState` overwrites whatever entry is current, which is the
  //    overlay's, wiping the `{ overlay: true }` marker the cleanup keys off.
  //    Result was a dead entry and a Back press that did nothing.
  //
  // The two mechanisms are fighting over the same history entry, so the fix is a
  // shared owner for it rather than a third attempt from either side. Recorded
  // rather than attempted again mid-loop.
  return createPortal(
    <dialog
      ref={ref}
      aria-label={label}
      // A <dialog> is not focusable on its own, so el.focus() above would be a
      // no-op without this. -1 keeps it out of the Tab order while still
      // allowing programmatic focus.
      tabIndex={-1}
      className={className ? `cam-overlay ${className}` : 'cam-overlay'}
      // Escape fires `cancel`. Prevent the browser's own close so React stays
      // the single owner of the open/closed state — otherwise the element
      // closes underneath a parent that still thinks it is mounted.
      onCancel={(e) => { e.preventDefault(); onClose() }}
    >
      {closeLabel !== null && (
        <button type="button" className="cam-close" onClick={onClose} aria-label={closeLabel}>×</button>
      )}
      {children}
    </dialog>,
    document.body,
  )
}
