import { useEffect, useRef, useState } from 'react'

// A small "what does this word mean?" button beside a measured term.
//
// Opens on CLICK rather than hover alone: this is primarily a phone feature —
// people photograph their own face on a phone — and a hover-only tooltip is
// unreachable with a finger. Hover still works on a pointer device via title.
//
// Closes on a second click, on Escape, or on a click anywhere outside, matching
// how the accessibility goggles menu already behaves.
export function InfoTip({ label, body }: { label: string; body: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onOutside(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [open])

  return (
    <span className="infotip" ref={wrapRef}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`What does ${label} mean?`}
        title={`What does ${label} mean?`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <span className="infotip-body" role="tooltip">
          <b>{label}</b>
          {body}
        </span>
      )}
    </span>
  )
}
