import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { AboutPanel } from '../src/components/AboutPanel'
import { BrowseView } from '../src/components/BrowseView'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'
import { GroupDetail } from '../src/components/GroupDetail'
import { RibbonDetail } from '../src/components/RibbonDetail'
import { initialState } from '../src/core/state'

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
    expect(renderToString(<GroupDetail groupId="blue" dispatch={noop} />)).toContain('colors')
    expect(
      renderToString(
        <RibbonDetail sel={{ kind: 'ribbon', level: 2, keyA: 'pink', keyB: 'blue' }} sizes={new Set<2 | 3 | 4>([2, 3, 4])} dispatch={noop} />,
      ),
    ).toContain('combination')
    expect(renderToString(<AboutPanel dispatch={noop} />)).toContain('Sanzo Wada')
  })
})
