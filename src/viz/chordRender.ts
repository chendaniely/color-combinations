// The chord diagram. ALL D3 usage is quarantined in this file.
//
// Hover design note: at the Colors level there are ~1000 ribbon paths and the
// entire disc interior is covered by them. Hover state therefore uses three
// delegated listeners on the wheel group and O(hovered-neighborhood) class
// writes — never per-element listeners or full-scene class sweeps, which
// caused visible flicker (see PROMPTS.md 2026-07-19 session 3).
import * as d3 from 'd3'
import type { WheelNode } from '../core/chord'

export interface ChordCallbacks {
  onArcClick(key: string): void
  onRibbonClick(keyA: string, keyB: string): void
}

const SIZE = 840
const OUTER = SIZE / 2 - 60
const INNER = OUTER - 24
// mix-blend-mode is painterly but expensive; only worth it when few ribbons.
const BLEND_MAX_NODES = 40

export function renderChord(
  svgEl: SVGSVGElement, nodes: WheelNode[], matrix: number[][], cb: ChordCallbacks,
): void {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const svg = d3.select(svgEl)
    .attr('viewBox', `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`)

  svg.selectAll('g.wheel').transition().duration(motionOk ? 200 : 0).style('opacity', 0).remove()

  const layout = d3.chord()
    .padAngle(nodes.length > 40 ? 0.004 : 0.02)
    .sortSubgroups(d3.descending)(matrix)

  const g = svg.append('g')
    .attr('class', nodes.length <= BLEND_MAX_NODES ? 'wheel blend' : 'wheel')
    .style('opacity', 0)
  g.transition().duration(motionOk ? 300 : 0).style('opacity', 1)
  const gNode = g.node()!

  const arcGen = d3.arc<d3.ChordGroup>().innerRadius(INNER).outerRadius(OUTER)
  const ribbonGen = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(INNER - 2)

  const centerLabel = g.append('text')
    .attr('class', 'wheel-center-label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')

  function nodeColor(i: number): string {
    const hexes = nodes[i].swatchHexes
    return hexes[Math.floor(hexes.length / 2)]
  }

  // Ribbons first (under the arcs).
  const ribbons = g.append('g').selectAll('path')
    .data(layout)
    .join('path')
    .attr('class', 'ribbon')
    .attr('d', ribbonGen as never)
    .attr('fill', (d) => nodeColor(d.source.index))

  // Arcs: one group per node; group nodes render member-colored segments.
  const arcGroups = g.append('g').selectAll('g.arc')
    .data(layout.groups)
    .join('g')
    .attr('class', 'arc')

  arcGroups.each(function (d) {
    const hexes = nodes[d.index].swatchHexes
    const step = (d.endAngle - d.startAngle) / hexes.length
    d3.select(this).selectAll('path')
      .data(hexes.map((hex, k) => ({
        hex,
        startAngle: d.startAngle + k * step,
        endAngle: d.startAngle + (k + 1) * step,
      })))
      .join('path')
      .attr('d', (seg) => arcGen(seg as never))
      .attr('fill', (seg) => seg.hex)
  })

  // Labels for group levels only (few arcs); color level names show in center.
  if (nodes.length <= 24) {
    arcGroups.append('text')
      .attr('class', 'arc-label')
      .attr('transform', (d) => {
        const angle = (d.startAngle + d.endAngle) / 2
        const r = OUTER + 14
        const deg = (angle * 180) / Math.PI - 90
        const flip = angle > Math.PI ? 'rotate(180)' : ''
        return `rotate(${deg}) translate(${r},0) ${flip}`
      })
      .attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
      .attr('dy', '0.35em')
      .text((d) => nodes[d.index].label)
  }

  // --- Delegated hover & click ---------------------------------------------
  // State is keyed so repeated pointerover events within the same element
  // (e.g. crossing sub-segments of one arc) are no-ops, and moving between
  // elements swaps state directly with no intermediate "clear all" flash.
  let hoverKey: string | null = null
  let hotEls: Element[] = []

  function setHot(els: Element[]): void {
    for (const el of hotEls) el.classList.remove('hot')
    hotEls = els
    for (const el of hotEls) el.classList.add('hot')
  }

  function clearHover(): void {
    hoverKey = null
    gNode.classList.remove('dimming')
    setHot([])
    centerLabel.text('')
  }

  function resolveTarget(target: Element): { ribbonEl: Element | null; arcEl: Element | null } {
    return { ribbonEl: target.closest('path.ribbon'), arcEl: target.closest('g.arc') }
  }

  g.on('pointerover', (event: PointerEvent) => {
    const { ribbonEl, arcEl } = resolveTarget(event.target as Element)
    if (ribbonEl) {
      const d = d3.select(ribbonEl).datum() as d3.Chord
      const key = `r${d.source.index}-${d.target.index}`
      if (key === hoverKey) return
      hoverKey = key
      // Ribbon hover brightens just this ribbon — no full-scene dimming
      // (the disc interior is all ribbons; dimming here strobes the wheel).
      gNode.classList.remove('dimming')
      setHot([ribbonEl])
      centerLabel.text(`${nodes[d.source.index].label} × ${nodes[d.target.index].label}`)
    } else if (arcEl) {
      const d = d3.select(arcEl).datum() as d3.ChordGroup
      const key = `a${d.index}`
      if (key === hoverKey) return
      hoverKey = key
      const connected: Element[] = [arcEl]
      ribbons.each(function (r) {
        if (r.source.index === d.index || r.target.index === d.index) connected.push(this as Element)
      })
      gNode.classList.add('dimming')
      setHot(connected)
      centerLabel.text(nodes[d.index].label)
    }
    // Anything else (gaps, center): keep the current state — no flashing.
  })

  g.on('pointerleave', clearHover)

  g.on('click', (event: PointerEvent) => {
    const { ribbonEl, arcEl } = resolveTarget(event.target as Element)
    if (ribbonEl) {
      const d = d3.select(ribbonEl).datum() as d3.Chord
      cb.onRibbonClick(nodes[d.source.index].key, nodes[d.target.index].key)
    } else if (arcEl) {
      const d = d3.select(arcEl).datum() as d3.ChordGroup
      cb.onArcClick(nodes[d.index].key)
    }
  })
}
