// Which overlays are open, as one registry both `Overlay` and `urlSync` read.
//
// THIS EXISTS BECAUSE THE TWO OF THEM KEPT FIGHTING OVER ONE HISTORY ENTRY.
// Back with a full-screen overlay up should dismiss it — there is no Escape key
// on a phone, the overlay fills the screen, and Back is what "cancel" means.
// Two implementations were tried on 2026-07-29 and both were reverted:
//
//   1. Push an entry per overlay, pop it on close. Broke the capture flow:
//      FaceCapture unmounts straight into ProbeReview, `history.back()` is
//      asynchronous, and the queued pop landed AFTER the next overlay had
//      pushed — closing the review screen the instant it opened.
//   2. Pool one entry per RUN of overlays, with a module-level count and a
//      deferred pop. Fixed the handoff, then lost to urlSync: its
//      `replaceState` overwrites whatever entry is current, which was the
//      overlay's, wiping the marker the cleanup keyed off.
//
// TODO.md's diagnosis was that the fix is a shared owner rather than a third
// attempt from either side, and this is it. Overlays only say "I am open" and
// "here is how to close me". urlSync owns the history stack outright, and is
// the only thing that touches it.
//
// The count, not a boolean: FaceCapture -> ProbeReview unmounts one overlay and
// mounts the next in a single React commit. urlSync subscribes through
// useSyncExternalStore, so it observes the settled value after that commit and
// never sees the momentary dip to zero that killed attempt 1.
type Closer = () => void

const closers = new Set<Closer>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

/** Called by `Overlay` on mount. The returned function unregisters it. */
export function registerOverlay(close: Closer): () => void {
  closers.add(close)
  emit()
  return () => {
    closers.delete(close)
    emit()
  }
}

export function subscribeOverlays(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function anyOverlayOpen(): boolean {
  return closers.size > 0
}

/**
 * Dismiss whatever is open, innermost first.
 *
 * Closing ALL of them rather than only the top one is deliberate: the owner's
 * report was about the sampler as a whole — *"clicking back on sample should
 * close that drop down"* — and the nested screens (card list, capture, review)
 * are steps within one task, not a stack a visitor thinks of as separate
 * places. Back dismisses the task.
 *
 * Which is why `ColorSampler` registers its own dismiss here as well as its
 * current screen's. A capture screen's own close steps BACK to the card list,
 * so calling only that would walk the task backwards one screen per press.
 * Innermost first, then the task's, and one press ends it from any depth.
 */
export function closeAllOverlays(): void {
  for (const close of [...closers].reverse()) close()
}
