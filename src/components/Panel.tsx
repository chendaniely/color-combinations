import { useEffect, type ReactNode } from 'react'

export function Panel({ title, onClose, children }:
  { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <aside className="panel" aria-label={title}>
      <div className="panel-head">
        <h2>{title}</h2>
        <button className="panel-close" onClick={onClose} aria-label="Close panel">×</button>
      </div>
      <div className="panel-body">{children}</div>
    </aside>
  )
}
