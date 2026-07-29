// Clipboard with a fallback for older browsers/file: contexts.
//
// Returns false rather than throwing, and that is load-bearing: every caller
// checks the boolean and shows "copied ✓" only on true. A rejection instead of
// a false would skip the check entirely and surface as an unhandled promise
// rejection in the console.
//
// The second try/catch was missing until 2026-07-29. `navigator.clipboard`
// failing was handled; `document.execCommand` not EXISTING was not, so in any
// context with neither — an old browser, a non-secure origin, jsdom — this
// rejected instead of returning false. Found by a new test for ShareLink, which
// means it had been reachable from CopyField and Copy CSS the whole time.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fall through to the textarea route.
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    document.body.appendChild(ta)
    ta.select()
    // Deprecated, and still the only route without the async clipboard API.
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
