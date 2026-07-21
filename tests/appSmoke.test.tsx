import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { AboutPanel } from '../src/components/AboutPanel'
import { BrowseView } from '../src/components/BrowseView'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'
import { GroupDetail } from '../src/components/GroupDetail'
import { MatchPage } from '../src/components/MatchPage'
import { RibbonDetail } from '../src/components/RibbonDetail'
import { initialState } from '../src/core/state'
import { dataset } from '../src/data'

describe('app shell', () => {
  it('renders header, nav and data-driven shell without crashing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Iro')
    expect(html).toContain('Browse')
    expect(html).toContain('Surprise me')
  })

  it('renders detail panels for real data without crashing', () => {
    const noop = () => {}
    expect(renderToString(<ColorDetail colorId={1} dispatch={noop} />)).toContain('Hermosa Pink')
    expect(renderToString(<CombinationDetail comboId={176} dispatch={noop} />)).toContain('Combination 176')
  })

  it('renders browse view with all 338 displayable combos', () => {
    const html = renderToString(<BrowseView state={initialState} dispatch={() => {}} />)
    expect(html).toContain('338 combinations')
  })

  it('renders group, ribbon, and about panels without crashing', () => {
    const noop = () => {}
    expect(renderToString(<GroupDetail groupId="blue" dispatch={noop} />)).toContain('Pairs well with')
    expect(
      renderToString(
        <RibbonDetail sel={{ kind: 'ribbon', level: 2, keyA: 'pink', keyB: 'blue' }} sizes={new Set<2 | 3 | 4>([2, 3, 4])} dispatch={noop} />,
      ),
    ).toContain('combination')
    expect(renderToString(<AboutPanel dispatch={noop} />)).toContain('Sanzo Wada')
  })

  it('match page shows the picker when empty and suggestions when seeded', () => {
    const empty = { ...initialState, view: 'match' as const }
    expect(renderToString(<MatchPage state={empty} dispatch={() => {}} />)).toContain('Pick a shade')

    const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
    const seeded = { ...initialState, view: 'match' as const, palette: { level: 1 as const, keys: [olives] } }
    const html = renderToString(<MatchPage state={seeded} dispatch={() => {}} />)
    expect(html).toContain('Your palette')
    expect(html).toContain('Build a palette')
  })

  it('match page offers a Colors level with a snap/search prompt when empty', () => {
    const empty = { ...initialState, view: 'match' as const, palette: { level: 0 as const, keys: [] } }
    const html = renderToString(<MatchPage state={empty} dispatch={() => {}} />)
    expect(html).toContain('Colors')
    expect(html).toContain('snap a color')
  })
  it('match page renders a color-key palette by color name', () => {
    const seeded = { ...initialState, view: 'match' as const, palette: { level: 0 as const, keys: ['c1'] } }
    expect(renderToString(<MatchPage state={seeded} dispatch={() => {}} />)).toContain('Hermosa Pink')
  })

  it('group panel shows breadcrumb, matches, and narrow-to for a shade', () => {
    const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
    const html = renderToString(<GroupDetail groupId={olives} dispatch={() => {}} />)
    expect(html).toContain('Pairs well with')
    expect(html).toContain('Build a palette from this')
    expect(html).toContain('Narrow to a single color')
  })
})
