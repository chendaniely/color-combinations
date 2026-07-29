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
    // jsdom (29) still ships no showModal, so tests exercise this through the
    // polyfill in tests/setup.ts; the real modal semantics are asserted by the
    // Playwright suite instead, where an actual browser implements them.
    if (!el.open) el.showModal()
    return () => { if (el.open) el.close() }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      aria-label={label}
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
