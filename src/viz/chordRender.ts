// The chord diagram. ALL D3 usage is quarantined in this file.
//
// Hover design note (see PROMPTS.md 2026-07-19/20): at the Colors level there
// are ~1000 thin ribbon paths with gaps between them plus a hollow center. An
// SVG <g> has no fill, so a cursor in a gap is "over nothing" — the old code
// then fired leave/clear and the wheel flashed back to full view (twitch).
// Fix: a transparent backing disc means the pointer is always within the
// wheel, and hover snaps to the NEAREST object by geometry (arc by angle when
// outside; nearest ribbon via a Delaunay index when inside) rather than
// relying on the cursor landing exactly on a path. State is keyed so the
// highlight only changes when the nearest object changes — it glides, never
// strobes.
import * as d3 from 'd3'
import type { AngleGroup, WheelNode } from '../core/chord'

export interface ChordCallbacks {
  onArcClick(key: string): void
  onRibbonClick(keyA: string, keyB: string): void
}

const SIZE = 840
const OUTER = SIZE / 2 - 60
const INNER = OUTER - 24
const RIBBON_R = INNER - 2
const HIT_R = OUTER + 30            // generous outer capture radius
const BLEND_MAX_NODES = 40
const TILT_DEG = -4                 // wabi-sabi: gently off-axis
const RIBBON_SAMPLES = 8

const TAU = 2 * Math.PI

function normAngle(a: number): number {
  const m = a % TAU
  return m < 0 ? m + TAU : m
}

function angularGap(a: number, b: number): number {
  const d = Math.abs(normAngle(a) - normAngle(b))
  return d > Math.PI ? TAU - d : d
}

export function renderChord(
  svgEl: SVGSVGElement, nodes: WheelNode[], matrix: number[][], cb: ChordCallbacks,
  anchorAngleFor?: (groups: readonly AngleGroup[]) => number,
): void {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const svg = d3.select(svgEl)
    .attr('viewBox', `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`)

  svg.selectAll('g.wheel').transition().duration(motionOk ? 200 : 0).style('opacity', 0).remove()

  const layout = d3.chord()
    .padAngle(nodes.length > 40 ? 0.004 : 0.02)
    .sortSubgroups(d3.descending)(matrix)

  const anchorRad = anchorAngleFor ? anchorAngleFor(layout.groups) : 0
  const anchorDeg = (anchorRad * 180) / Math.PI

  // The tilt lives on the group (not CSS on the <svg>) so d3.pointer's
  // getScreenCTM math includes it and pointer→angle stays exact.
  const g = svg.append('g')
    .attr('class', nodes.length <= BLEND_MAX_NODES ? 'wheel blend' : 'wheel')
    .attr('transform', `rotate(${TILT_DEG - anchorDeg})`)
    .style('opacity', 0)
  g.transition().duration(motionOk ? 300 : 0).style('opacity', 1)
  const gNode = g.node()!

  // Transparent backing: gives the whole disc a hit surface so there are no
  // dead gaps, and pointerleave only fires at the real outer edge.
  g.append('circle').attr('class', 'wheel-hit').attr('r', HIT_R)

  const arcGen = d3.arc<d3.ChordGroup>().innerRadius(INNER).outerRadius(OUTER)
  const ribbonGen = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(INNER - 2)

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
  const ribbonNodes = ribbons.nodes() as Element[]

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
  const arcNodes = arcGroups.nodes() as Element[]

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

  // Center label appended last so it always reads on top. Counter-rotate the
  // group's tilt so the hover text stays upright (only the wheel is off-axis).
  const centerLabel = g.append('text')
    .attr('class', 'wheel-center-label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('transform', `rotate(${anchorDeg - TILT_DEG})`)

  // --- Nearest-object index (the "snap") ------------------------------------
  // Sample points along each ribbon's centerline (a quadratic Bézier through
  // the origin, matching d3.ribbon) and index them so any cursor position
  // inside the disc resolves to the nearest ribbon in O(log n).
  const pts: [number, number][] = []
  const ribbonByPoint: number[] = []
  layout.forEach((d, k) => {
    const a0 = (d.source.startAngle + d.source.endAngle) / 2
    const a1 = (d.target.startAngle + d.target.endAngle) / 2
    const p0x = RIBBON_R * Math.sin(a0)
    const p0y = -RIBBON_R * Math.cos(a0)
    const p1x = RIBBON_R * Math.sin(a1)
    const p1y = -RIBBON_R * Math.cos(a1)
    for (let s = 0; s <= RIBBON_SAMPLES; s++) {
      const t = s / RIBBON_SAMPLES
      const w0 = (1 - t) * (1 - t)
      const w1 = t * t // control point is the origin, so its term drops out
      pts.push([w0 * p0x + w1 * p1x, w0 * p0y + w1 * p1y])
      ribbonByPoint.push(k)
    }
  })
  const delaunay = pts.length ? d3.Delaunay.from(pts) : null
  let findHint = 0

  function arcAtAngle(theta: number): number {
    let best = -1
    let bestGap = Infinity
    for (const grp of layout.groups) {
      if (theta >= grp.startAngle && theta <= grp.endAngle) return grp.index
      const gap = Math.min(angularGap(theta, grp.startAngle), angularGap(theta, grp.endAngle))
      if (gap < bestGap) { bestGap = gap; best = grp.index }
    }
    return best
  }

  interface Resolved { key: string; hot: Element[]; label: string; onClick: () => void }

  function resolveAt(x: number, y: number): Resolved | null {
    const r = Math.hypot(x, y)
    if (r >= INNER) {
      const i = arcAtAngle(normAngle(Math.atan2(x, -y)))
      if (i < 0) return null
      const hot: Element[] = [arcNodes[i]]
      layout.forEach((d, k) => {
        if (d.source.index === i || d.target.index === i) hot.push(ribbonNodes[k])
      })
      return { key: `a${i}`, hot, label: nodes[i].label, onClick: () => cb.onArcClick(nodes[i].key) }
    }
    if (!delaunay) return null
    findHint = delaunay.find(x, y, findHint)
    const k = ribbonByPoint[findHint]
    const d = layout[k]
    const hot: Element[] = [ribbonNodes[k], arcNodes[d.source.index], arcNodes[d.target.index]]
    return {
      key: `r${d.source.index}-${d.target.index}`,
      hot,
      label: `${nodes[d.source.index].label} × ${nodes[d.target.index].label}`,
      onClick: () => cb.onRibbonClick(nodes[d.source.index].key, nodes[d.target.index].key),
    }
  }

  // --- Keyed hover: only touch the DOM when the nearest object changes -------
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

  let raf = 0
  let lastXY: [number, number] | null = null

  function process(): void {
    raf = 0
    if (!lastXY) return
    const res = resolveAt(lastXY[0], lastXY[1])
    if (!res || res.key === hoverKey) return // no object → keep current, never flash
    hoverKey = res.key
    gNode.classList.add('dimming')
    setHot(res.hot)
    centerLabel.text(res.label)
  }

  g.on('pointermove', (event: PointerEvent) => {
    lastXY = d3.pointer(event, gNode)
    if (!raf) raf = requestAnimationFrame(process)
  })
  g.on('pointerleave', () => {
    if (raf) { cancelAnimationFrame(raf); raf = 0 }
    lastXY = null
    clearHover()
  })
  g.on('click', (event: PointerEvent) => {
    const [x, y] = d3.pointer(event, gNode)
    resolveAt(x, y)?.onClick()
  })
}
