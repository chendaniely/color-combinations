import { ancestorAtLevel, displayableCombinations, keyName, sizeBucket } from '../core/dataset'
import type { Action, AppState } from '../core/state'
import type { SizeBucket } from '../core/types'
import { dataset } from '../data'
import { PlateCard } from './PlateCard'

const SIZES: SizeBucket[] = [2, 3, 4]

export function BrowseView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { family, shade, colorId } = state.browse
  const setFilter = (patch: Partial<AppState['browse']>) =>
    dispatch({ type: 'setBrowseFilter', browse: { ...state.browse, ...patch } })

  const combos = displayableCombinations(dataset).filter((c) => {
    if (!state.sizes.includes(sizeBucket(c))) return false
    if (family && !c.colorIds.some((id) => ancestorAtLevel(dataset, id, 2) === family)) return false
    if (shade && !c.colorIds.some((id) => ancestorAtLevel(dataset, id, 1) === shade)) return false
    if (colorId && !c.colorIds.includes(Number(colorId))) return false
    return true
  })

  const comboCount = `${combos.length} combinations`
  const sections = SIZES
    .map((s) => ({ size: s, heading: s === 4 ? '4+ colors' : `${s} colors`, combos: combos.filter((c) => sizeBucket(c) === s) }))
    .filter((sec) => sec.combos.length > 0)

  return (
    <div className="browse-view">
      <div className="browse-filters">
        <div className="size-filter" aria-label="Colors per combination">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={state.sizes.includes(s)}
              onClick={() => dispatch({ type: 'toggleSize', size: s })}>
              {s === 4 ? '4+' : s}
            </button>
          ))}
        </div>
        <select value={family} onChange={(e) => setFilter({ family: e.target.value })} aria-label="Color family">
          <option value="">any family</option>
          {dataset.data.groups.broad.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={colorId} onChange={(e) => setFilter({ colorId: e.target.value })} aria-label="Contains color">
          <option value="">contains any color</option>
          {[...dataset.data.colors].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {shade && (
          <button className="filter-chip" onClick={() => setFilter({ shade: '' })}>
            {keyName(dataset, shade)} <span aria-label="Clear shade" title="Clear shade">×</span>
          </button>
        )}
        <span className="muted">{comboCount}</span>
      </div>
      <p className="hint">Taller bars suggest the dominant color — the main garment, the page background; slivers are accents.</p>
      {sections.map((sec) => (
        <section key={sec.size} className="browse-section">
          <h2 className="browse-section-head">
            {sec.heading} <span className="muted">{`— ${sec.combos.length}`}</span>
          </h2>
          <div className="browse-grid">
            {sec.combos.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
