import { useMemo } from 'react'
import { idealPairs } from '../../color/seasonFit'
import type { SubSeason } from '../../core/seasons'
import { dataset, type SeasonData } from '../../data'

// How well Wada's book can serve a season, shown rather than implied.
//
// The book is a 1933 pigment book: measured on 2026-07-29 its median chroma is
// C* 52.7, 83 of its 157 colours sit above C* 50, and only 11 usable colours
// fall below C* 20. The four seasons DEFINED by mutedness are sharing those
// eleven. Nearest-neighbour will always return something, so without this
// panel a season the book cannot serve looks exactly as confident as one it
// serves well. Showing the ideal beside the nearest real colour is the whole
// point of the feature.
export function SeasonFit({ sub, data }: { sub: SubSeason; data: SeasonData }) {
  const pairs = useMemo(
    () => idealPairs(data.seasonRules, sub, data.pccsGrid, dataset.data.colors),
    [sub, data],
  )
  const nameOf = (id: number) => dataset.data.colors.find((c) => c.id === id)?.name ?? ''
  const hexOf = (id: number) => dataset.data.colors.find((c) => c.id === id)?.hex ?? '#000'

  // The headline number is how many DISTINCT colours serve these ideals, not
  // how many are a good match. Measured across all twelve seasons, only one
  // ideal of 142 has no close match — so "12 of 12 are a good match" is true
  // and sounds like a triumph, while hiding that 2 to 4 colours are each doing
  // the work of several. The crowding is the real limit of a 157-colour book.
  const distinct = new Set(pairs.map((p) => p.colorId)).size

  return (
    <section className="season-fit" aria-label={`How well the book covers ${sub.name}`}>
      <h4>What the book has for {sub.name}</h4>

      <ol className="fit-pairs">
        {pairs.map((p) => (
          <li key={p.hue} className={`fit-${p.band.replace(' ', '-')}`}>
            <i className="fit-ideal" style={{ background: p.idealHex }}
              aria-hidden="true" />
            <span className="fit-arrow" aria-hidden="true">→</span>
            <i className="fit-actual" style={{ background: hexOf(p.colorId) }}
              aria-hidden="true" />
            <span className="fit-name">{nameOf(p.colorId)}</span>
            <span className="fit-band">{p.band}</span>
          </li>
        ))}
      </ol>

      {/* Required, not decorative. The owner's instruction: be clear this is
          the closest match to the book's palette, so things will not map 100%. */}
      <p className="fit-caveat">
        One row per ideal {sub.name} colour, around the hue circle. Left is the
        ideal; right is the <b>nearest match in Wada's book</b>.
        {distinct < pairs.length
          ? <> These {pairs.length} ideals are served by just <b>{distinct} different
            colours</b> — where one appears twice, the book has nothing else near
            either ideal.</>
          : <> All {pairs.length} ideals get their own distinct colour.</>}
        {' '}These are the nearest matches in the book, <b>not exact season
        colours</b>: it was printed in 1933 for pigments, not for personal colour
        analysis.
      </p>
    </section>
  )
}
