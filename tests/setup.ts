// Runs before every test file, in that file's own environment.
//
// jsdom 29 implements <dialog> as an element but none of its modal behaviour —
// showModal/show/close are simply absent. Overlay.tsx calls showModal() on
// mount, so without this every overlay test would throw.
//
// This polyfill only tracks the `open` attribute, which is what jsdom needs to
// stop applying `dialog:not([open]) { display: none }` and hiding the content
// from getByRole. It deliberately does NOT fake the focus trap, Escape
// handling or inertness: pretending to test those in jsdom would be worse than
// not testing them, since a passing assertion would mean nothing. Those are
// asserted for real in tests/browser/ under Playwright.
//
// The guard matters: most test files run in the `node` environment, where
// HTMLDialogElement does not exist at all.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (returnValue !== undefined) this.returnValue = returnValue
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
