import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('app shell', () => {
  it('renders header, nav and data-driven shell without crashing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Iro')
    expect(html).toContain('Browse')
    expect(html).toContain('Surprise me')
  })
})
