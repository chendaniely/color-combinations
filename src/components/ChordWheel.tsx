import { useEffect, useMemo, useRef } from 'react'
import { chordMatrix } from '../core/chord'
import type { Action, AppState } from '../core/state'
import { dataset } from '../data'
import { renderChord } from '../viz/chordRender'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function ChordWheel({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sizes = useMemo(() => new Set(state.sizes), [state.sizes])
  const { granularity } = state

  useEffect(() => {
    if (!svgRef.current) return
    const { nodes, matrix } = chordMatrix(dataset, granularity, sizes)
    renderChord(svgRef.current, nodes, matrix, {
      onArcClick: (key) =>
        dispatch({
          type: 'select',
          selection: granularity === 0
            ? { kind: 'color', id: Number(key.slice(1)) }
            : { kind: 'group', id: key },
        }),
      onRibbonClick: (keyA, keyB) =>
        dispatch({ type: 'select', selection: { kind: 'ribbon', level: granularity, keyA, keyB } }),
    })
  }, [granularity, sizes, dispatch])

  return <svg ref={svgRef} className="chord-wheel" role="img"
    aria-label="Chord diagram of Sanzo Wada's color combinations. Use the Browse view for a list alternative." />
}
