import { useState } from 'react'
import { copyText } from '../copy'

// Copies the current address, so what is on screen can be sent to somebody.
//
// The address bar already reflects the state — src/urlSync.ts keeps it there —
// so this button is, strictly, redundant on a desktop. It exists because MOBILE
// BROWSERS HIDE THE ADDRESS BAR while you scroll, and the You tab is used on a
// phone by definition: that is where the camera is. Without a button the whole
// feature would be invisible on the device where it matters most.
//
// Reads `location.href` at click time rather than holding it in state. The URL
// changes as the visitor moves around, and a captured value would go stale the
// moment they opened a different colour — copying the wrong link is worse than
// no button at all.
export function ShareLink({ label = 'Copy link', className }: {
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    if (await copyText(location.href)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    // A failed copy deliberately says nothing. `copyText` already falls back to
    // a hidden textarea, so a false here means the browser refused both routes,
    // and the honest response is to leave the button alone rather than claim
    // something happened. Asserted in tests/browser/takeaways.spec.ts for the
    // sibling copy affordances.
  }

  return (
    <button
      type="button"
      className={className ? `share-link ${className}` : 'share-link'}
      onClick={onCopy}
      aria-label={label}
    >
      {copied ? 'Link copied ✓' : label}
    </button>
  )
}
