import { describe, expect, it } from 'vitest'
import type { Plugin } from 'vite'

import config from '../vite.config'
import { GA_MEASUREMENT_ID } from '../vite.config'

// The Google Analytics tag is injected into index.html at BUILD time only, so
// the owner's local `make dev` sessions never report as real traffic. These
// tests guard that gate — see docs/superpowers/specs/2026-07-28-google-analytics-design.md
function gaPlugin(): Plugin {
  const plugins = (config as { plugins?: unknown[] }).plugins ?? []
  const found = plugins
    .flat(Infinity)
    .find((p): p is Plugin => !!p && typeof p === 'object' && (p as Plugin).name === 'google-analytics')
  if (!found) throw new Error('no plugin named "google-analytics" in vite.config.ts')
  return found
}

function transform(html: string): string {
  const hook = gaPlugin().transformIndexHtml
  if (typeof hook !== 'function') throw new Error('transformIndexHtml must be a plain function')
  // Vite's hook signature passes a context we don't use; the plugin ignores it.
  return hook.call({} as never, html, {} as never) as string
}

const PAGE = '<!doctype html>\n<html>\n  <head>\n    <title>Iro</title>\n  </head>\n  <body></body>\n</html>\n'

describe('google analytics tag', () => {
  it('only applies to the production build, never dev', () => {
    // Load-bearing: without this, `make dev` reports to the live GA property.
    expect(gaPlugin().apply).toBe('build')
  })

  it('injects the tag inside <head>', () => {
    const out = transform(PAGE)
    expect(out).toContain('googletagmanager.com/gtag/js')
    const head = out.slice(out.indexOf('<head>'), out.indexOf('</head>'))
    expect(head).toContain('googletagmanager.com/gtag/js')
    expect(head).toContain('gtag(')
  })

  it('reports to the owner\'s measurement ID', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-CHW8X8EX18')
    const out = transform(PAGE)
    expect(out).toContain(`gtag/js?id=${GA_MEASUREMENT_ID}`)
    expect(out).toContain(`gtag('config', '${GA_MEASUREMENT_ID}')`)
  })

  it('leaves the rest of the page alone', () => {
    const out = transform(PAGE)
    expect(out).toContain('<title>Iro</title>')
    expect(out).toContain('<body></body>')
  })
})
