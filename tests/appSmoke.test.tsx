import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { BrowseView } from '../src/components/BrowseView'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'
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
})
