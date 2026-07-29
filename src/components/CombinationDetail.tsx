import { cssVariablesFor, jsonFor } from '../core/export'
import type { Action } from '../core/state'
import { copyText } from '../copy'
import { downloadPlatePng } from '../exportPng'
import { CopyField } from './CopyField'
import { MissingPanel } from './MissingPanel'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { ShareLink } from './ShareLink'
import { dataset } from '../data'
import { useState } from 'react'

export function CombinationDetail({ comboId, dispatch }: { comboId: number; dispatch: (a: Action) => void }) {
  const found = dataset.comboById.get(comboId)
  const colors = found?.colorIds.map((id) => dataset.colorById.get(id)!) ?? []
  const [copiedWhat, setCopiedWhat] = useState<string | null>(null)
  async function copyAs(label: string, text: string) {
    if (await copyText(text)) {
      setCopiedWhat(label)
      setTimeout(() => setCopiedWhat(null), 1500)
    }
  }
  // AFTER the hook, deliberately: an early return above useState would make the
  // hook call conditional, which React forbids and the linter catches.
  if (!found) return <MissingPanel what="combination" id={comboId} dispatch={dispatch} />
  const combo = found
  return (
    <Panel title={`Combination ${combo.id}`} onClose={() => dispatch({ type: 'closePanel' })}>
      <PlateCard comboId={comboId} large />
      {colors.map((c) => (
        <div key={c.id} className="combo-color-row">
          <button className="linklike"
            onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })}>
            {c.name}
          </button>
          <CopyField label="HEX" value={c.hex} />
        </div>
      ))}
      <div className="export-row">
        <button onClick={() => copyAs('css', cssVariablesFor(dataset, combo))}>
          {copiedWhat === 'css' ? 'copied ✓' : 'Copy CSS variables'}
        </button>
        <button onClick={() => copyAs('json', jsonFor(dataset, combo))}>
          {copiedWhat === 'json' ? 'copied ✓' : 'Copy JSON'}
        </button>
        <button onClick={() => downloadPlatePng(dataset, combo)}>Download PNG</button>
        <ShareLink label="Copy link to this combination" />
      </div>
    </Panel>
  )
}
