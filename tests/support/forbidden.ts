// The forbidden-API patterns shared by the privacy guards
// (camera-privacy.test.ts and sample-privacy.test.ts).
//
// Extracted because both files carried their own copy of the same list, so
// hardening one left the other soft — and the two cover directories that handle
// the very same photographs.
//
// Each rule carries the samples that MUST match and MUST NOT match, and
// forbiddenSelfTest() runs them. A guard that cannot demonstrate it detects its
// own target is a green tick with nothing behind it; the earlier version of the
// download rule was JSX-shaped only and would have missed `a.download = ...`.
//
// FOOTGUN, deliberate: this is a scan of source TEXT, so it cannot tell code
// from a comment. Writing `// we never touch localStorage` inside a guarded
// directory fails the guard. That is the conservative side to err on — the
// alternative is parsing, and a guard nobody can read is worse than one that
// occasionally objects to prose. Say "browser storage" in those comments
// instead. The `allowed` samples below are therefore identifier-shaped, not
// commentary: they prove the rules do not fire on names that merely contain
// the word, e.g. `toDataURLish` or `localStorageBanned`.

export interface Rule {
  name: string
  patterns: RegExp[]
  /** Code that MUST be caught. */
  caught: string[]
  /** Code that must NOT be caught — guards against over-flagging. */
  allowed: string[]
}

export function matches(rule: Rule, src: string): boolean {
  return rule.patterns.some((re) => re.test(src))
}

// Transmission and persistence. Applies everywhere a user's imagery is handled.
export const NETWORK_AND_STORAGE: Rule[] = [
  {
    name: 'fetch(',
    patterns: [/\bfetch\s*\(/],
    caught: ['fetch("https://x")', 'await fetch(url)'],
    allowed: ['const prefetched = 1', 'refetchAll()'],
  },
  {
    name: 'XMLHttpRequest',
    patterns: [/\bXMLHttpRequest\b/],
    caught: ['new XMLHttpRequest()'],
    allowed: ['const XMLHttpRequestBanned = 1'],
  },
  {
    name: 'sendBeacon',
    patterns: [/\bsendBeacon\s*\(/, /['"]sendBeacon['"]/],
    caught: ['navigator.sendBeacon(u, d)', "navigator['sendBeacon'](u)"],
    allowed: ['const sendBeaconBanned = 1'],
  },
  {
    name: 'WebSocket',
    patterns: [/\bWebSocket\b/],
    caught: ['new WebSocket("wss://x")'],
    allowed: ['const WebSocketBanned = 1'],
  },
  {
    name: 'EventSource',
    patterns: [/\bEventSource\b/],
    caught: ['new EventSource("/x")'],
    allowed: ['const EventSourceBanned = 1'],
  },
  {
    name: 'localStorage',
    patterns: [/\blocalStorage\b/],
    caught: ['localStorage.setItem("a", b)'],
    allowed: ['const localStorageBanned = 1'],
  },
  {
    name: 'sessionStorage',
    patterns: [/\bsessionStorage\b/],
    caught: ['sessionStorage.setItem("a", b)'],
    allowed: ['const sessionStorageBanned = 1'],
  },
  {
    name: 'indexedDB',
    patterns: [/\bindexedDB\b/],
    caught: ['indexedDB.open("db")'],
    allowed: ['const indexedDBBanned = 1'],
  },
  {
    name: 'document.cookie',
    patterns: [/document\s*\.\s*cookie/, /['"]cookie['"]\s*\]/],
    caught: ['document.cookie = "a=b"', "document['cookie'] = x"],
    allowed: ['const documentCookieBanned = 1'],
  },
]

// Producing image BYTES. Camera-only: the camera must never be able to
// serialise a frame at all, whereas the sample components legitimately use
// createObjectURL to display a photo the visitor chose.
export const IMAGE_EXPORT: Rule[] = [
  {
    name: 'toDataURL',
    patterns: [/\btoDataURL\s*\(/, /['"]toDataURL['"]/],
    caught: ['canvas.toDataURL()', "canvas['toDataURL']()"],
    // The bare-substring version flagged any identifier containing the word.
    allowed: ['const toDataURLBanned = 1', 'toDataURLish'],
  },
  {
    name: 'toBlob',
    patterns: [/\btoBlob\s*\(/, /['"]toBlob['"]/],
    caught: ['canvas.toBlob(cb)', "canvas['toBlob'](cb)"],
    allowed: ['const toBlobBanned = 1', 'toBlobbed'],
  },
  {
    name: 'createObjectURL',
    patterns: [/\bcreateObjectURL\s*\(/, /['"]createObjectURL['"]/],
    caught: ['URL.createObjectURL(blob)'],
    allowed: ['const createObjectURLBanned = 1'],
  },
  {
    name: 'download',
    // Was JSX-shaped only, so a programmatic `a.download = ...; a.click()`
    // walked straight past it.
    patterns: [/<a[^>]*\sdownload\b/, /\.\s*download\s*=/, /['"]download['"]\s*\]\s*=/],
    caught: [
      '<a download href={u}>x</a>',
      'a.download = "frame.png"',
      "a['download'] = 'frame.png'",
    ],
    allowed: ['const downloadCount = 0', 'downloadable'],
  },
]

// Proves each rule catches what it is for and does not catch what it is not.
export function forbiddenSelfTest(rules: Rule[]): { rule: string; sample: string; expected: boolean; got: boolean }[] {
  const failures: { rule: string; sample: string; expected: boolean; got: boolean }[] = []
  for (const rule of rules) {
    for (const sample of rule.caught) {
      if (!matches(rule, sample)) failures.push({ rule: rule.name, sample, expected: true, got: false })
    }
    for (const sample of rule.allowed) {
      if (matches(rule, sample)) failures.push({ rule: rule.name, sample, expected: false, got: true })
    }
  }
  return failures
}
