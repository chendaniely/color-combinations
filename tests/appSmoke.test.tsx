import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { AboutPanel } from '../src/components/AboutPanel'
import { BrowseView } from '../src/components/BrowseView'
import { CaptureResult } from '../src/components/camera/CaptureResult'
import { ChordWheel } from '../src/components/ChordWheel'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'
import { GroupDetail } from '../src/components/GroupDetail'
import { Header } from '../src/components/Header'
import { MatchPage } from '../src/components/MatchPage'
import { RibbonDetail } from '../src/components/RibbonDetail'
import { hexToRgb } from '../src/core/colorMath'
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

  it('browse view shows a dismissible chip for an active shade filter', () => {
    const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
    const state = { ...initialState, view: 'browse' as const, browse: { family: '', shade: olives, colorId: '' } }
    const html = renderToString(<BrowseView state={state} dispatch={() => {}} />)
    expect(html).toContain('Olives')
    expect(html).toContain('Clear shade')
  })

  it('capture result heroes the closest color and offers all three levels + destinations', () => {
    const html = renderToString(
      <CaptureResult rgb={hexToRgb('#7e8743')} onMatch={() => {}} onBrowse={() => {}} />,
    )
    expect(html).toContain('Dark Citrine') // closest book color
    expect(html).toContain('Color'); expect(html).toContain('Shade'); expect(html).toContain('Family')
    expect(html).toContain('Match'); expect(html).toContain('Browse')
  })

  it('search box uses the new placeholder copy', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Find a color…')
  })

  it('hosts the accessibility goggles once, floating in the content area', () => {
    // The control lives once in <main> (App), floating in the top-right on every
    // view, and drives one global selection.
    const app = renderToString(<App />)
    expect(app).toContain('Accessibility')
    expect(app).toContain('Color-blind safe')

    // Neither the header nor the individual views render their own copy — guards
    // against re-duplicating it.
    const header = renderToString(<Header state={initialState} dispatch={() => {}} />)
    expect(header).not.toContain('Accessibility')
    const browse = renderToString(<BrowseView state={{ ...initialState, view: 'browse' }} dispatch={() => {}} />)
    expect(browse).not.toContain('Accessibility')
    const match = renderToString(<MatchPage state={{ ...initialState, view: 'match' }} dispatch={() => {}} />)
    expect(match).not.toContain('Accessibility')
  })

  it('browse filters to fewer combos when a lens is active', () => {
    const all = renderToString(<BrowseView state={initialState} dispatch={() => {}} />)
    expect(all).toContain('338 combinations')
    const filtered = renderToString(
      <BrowseView state={{ ...initialState, access: ['print-bw'] }} dispatch={() => {}} />,
    )
    expect(filtered).toContain('57 combinations')
  })

  it('wheel shows an empty-state note when goggles filter out every combination', () => {
    const state = { ...initialState, sizes: [4] as (2 | 3 | 4)[], access: ['print-bw' as const] }
    const html = renderToString(<ChordWheel state={state} dispatch={() => {}} />)
    expect(html).toContain('No combinations match these goggles')
  })
})
