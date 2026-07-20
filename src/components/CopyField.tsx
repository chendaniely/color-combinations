import { useState } from 'react'
import { copyText } from '../copy'

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    if (await copyText(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div className="copy-field">
      <span className="copy-label">{label}</span>
      <code>{value}</code>
      <button onClick={onCopy} aria-label={`Copy ${label}`}>{copied ? 'copied ✓' : 'copy'}</button>
    </div>
  )
}
