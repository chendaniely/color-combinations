// The chord diagram. ALL D3 usage is quarantined in this file.
import * as d3 from 'd3'
import type { WheelNode } from '../core/chord'

export interface ChordCallbacks {
  onArcClick(key: string): void
  onRibbonClick(keyA: string, keyB: string): void
}

const SIZE = 840
const OUTER = SIZE / 2 - 60
const INNER = OUTER - 24

export function renderChord(
  svgEl: SVGSVGElement, nodes: WheelNode[], matrix: number[][], cb: ChordCallbacks,
): void {
  const svg = d3.select(svgEl)
    .attr('viewBox', `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`)

  svg.selectAll('g.wheel').transition().duration(200).style('opacity', 0).remove()

  const layout = d3.chord()
    .padAngle(nodes.length > 40 ? 0.004 : 0.02)
    .sortSubgroups(d3.descending)(matrix)

  const g = svg.append('g').attr('class', 'wheel').style('opacity', 0)
  g.transition().duration(300).style('opacity', 1)

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
    .attr('data-a', (d) => nodes[d.source.index].key)
    .attr('data-b', (d) => nodes[d.target.index].key)
    .on('click', (_e, d) => cb.onRibbonClick(nodes[d.source.index].key, nodes[d.target.index].key))
    .on('mouseenter', function (_e, d) {
      ribbons.classed('dimmed', (r) => r !== d)
      arcs.classed('dimmed', (_a, i) => i !== d.source.index && i !== d.target.index)
      centerLabel.text(`${nodes[d.source.index].label} × ${nodes[d.target.index].label}`)
    })
    .on('mouseleave', clearHover)

  // Arcs: one group per node; group nodes render member-colored segments.
  const arcGroups = g.append('g').selectAll('g.arc')
    .data(layout.groups)
    .join('g')
    .attr('class', 'arc')
    .on('click', (_e, d) => cb.onArcClick(nodes[d.index].key))
    .on('mouseenter', function (_e, d) {
      const key = nodes[d.index].key
      ribbons.classed('dimmed', (r) =>
        nodes[r.source.index].key !== key && nodes[r.target.index].key !== key)
      arcs.classed('dimmed', (_a, i) => i !== d.index)
      centerLabel.text(nodes[d.index].label)
    })
    .on('mouseleave', clearHover)

  const arcs = arcGroups.each(function (d) {
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

  function clearHover() {
    ribbons.classed('dimmed', false)
    arcs.classed('dimmed', false)
    centerLabel.text('')
  }
}
