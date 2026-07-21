import { useEffect, useMemo, useRef } from 'react'
import { chordMatrix, redAnchorAngle } from '../core/chord'
import type { Action, AppState } from '../core/state'
import { allowedFor, dataset } from '../data'
import { renderChord } from '../viz/chordRender'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function ChordWheel({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sizes = useMemo(() => new Set(state.sizes), [state.sizes])
  const allowed = useMemo(() => allowedFor(state.access), [state.access])
  const { granularity } = state
  const { nodes, matrix } = useMemo(
    () => chordMatrix(dataset, granularity, sizes, allowed),
    [granularity, sizes, allowed],
  )
  const isEmpty = matrix.every((row) => row.every((v) => v === 0))

  useEffect(() => {
    if (!svgRef.current) return
    renderChord(svgRef.current, nodes, matrix, {
      onArcClick: (key) =>
        dispatch({
          type: 'select',
          selection: granularity === 0
            ? { kind: 'color', id: Number(key.slice(1)) }
            : { kind: 'group', id: key },
        }),
      onRibbonClick: (keyA, keyB) =>
        dispatch({
          type: 'select',
          selection: { kind: 'ribbon', level: granularity, keyA, keyB, sizes: [...state.sizes] },
        }),
    }, (groups) => redAnchorAngle(dataset, granularity, groups, nodes))
  }, [nodes, matrix, granularity, dispatch, state.sizes])

  return (
    <div className="wheel-wrap">
      <svg ref={svgRef} className="chord-wheel" role="img"
        aria-label="Chord diagram of Sanzo Wada's color combinations. Use the Browse view for a list alternative." />
      {isEmpty && state.access.length > 0 && (
        <p className="empty-note wheel-empty">No combinations match these goggles — loosen one.</p>
      )}
    </div>
  )
}
