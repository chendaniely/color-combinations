import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const tokens = readFileSync('src/styles/tokens.css', 'utf8')

// index.html is the one file no component owns and nobody re-reads. It went six
// releases without a meta description, and its theme-color duplicates a design
// token that HTML cannot reach — exactly the two-places-must-agree shape this
// release has been removing everywhere else.
describe('the page shell', () => {
  it('declares its language, for screen readers and translation', () => {
    expect(html).toMatch(/<html[^>]*\blang="en"/)
  })

  it('has a description, so a search result or a shared link says something', () => {
    const m = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)
    expect(m, 'no meta description').toBeTruthy()
    expect(m![1].length).toBeGreaterThan(50)
    expect(m![1]).toMatch(/Sanzo Wada/)
  })

  it('tints the mobile browser chrome to the paper colour', () => {
    const theme = html.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/)?.[1]
    const paper = tokens.match(/--paper-1:\s*(#[0-9a-fA-F]{6})/)?.[1]
    expect(theme, 'no theme-color').toBeTruthy()
    expect(paper, 'no --paper-1 token').toBeTruthy()
    // HTML cannot read a CSS custom property, so this is the only thing keeping
    // the two in step.
    expect(theme!.toLowerCase()).toBe(paper!.toLowerCase())
  })

  it('scales to a phone', () => {
    expect(html).toMatch(/name="viewport"[^>]*width=device-width/)
  })

  it('ships no analytics of its own — that is the build plugin\'s job', () => {
    // If the tag ever appears here it would fire during `make dev` too, which
    // is the thing tests/analytics.test.ts exists to prevent.
    expect(html).not.toContain('googletagmanager')
    expect(html).not.toContain('gtag(')
  })
})
