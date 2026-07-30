// Documentation claims that can be checked mechanically, checked mechanically.
//
// CLAUDE.md's documentation contract opens with "Wrong documentation is worse
// than no documentation" and requires the Makefile to "always match reality;
// every target works". A contract that strong should not rest on somebody
// remembering to re-read it.
//
// Written during an audit that found five stale claims, four of which were
// numbers nobody had recounted and one of which was a command the README never
// learned about. Every assertion here corresponds to a real thing that was
// wrong.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { wcagContrast } from 'culori'

const makefile = readFileSync('Makefile', 'utf8')
const readme = readFileSync('README.md', 'utf8')
const claude = readFileSync('CLAUDE.md', 'utf8')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const tokens = readFileSync('src/styles/tokens.css', 'utf8')

/** Targets the Makefile advertises in `make help` (those with a `##` comment). */
function documentedTargets(): string[] {
  return [...makefile.matchAll(/^([a-z][a-z-]*):[^\n]*##/gm)].map((m) => m[1])
}

function token(name: string): string {
  const m = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!m) throw new Error(`--${name} is not a hex token`)
  return m[1]
}

describe('the Makefile matches reality', () => {
  it('advertises only targets it defines', () => {
    for (const t of documentedTargets()) {
      expect(new RegExp(`^${t}:`, 'm').test(makefile), `make ${t} is advertised but undefined`)
        .toBe(true)
    }
  })

  it('declares every documented target as .PHONY', () => {
    // None of them produce a file of their own name, so a stray file called
    // "test" or "check" would silently stop them running.
    const phony = (makefile.match(/^\.PHONY:(.*)$/m)?.[1] ?? '').split(/\s+/)
    for (const t of documentedTargets()) {
      expect(phony, `make ${t} is not .PHONY`).toContain(t)
    }
  })
})

describe('the README documents what exists', () => {
  // The gap that prompted this file: `make check` was added to the Makefile and
  // the README never learned about it — the inverse of "never document a command
  // that doesn't work", and just as misleading for a non-JS reader who is told
  // the README is complete.
  it('lists every command the Makefile advertises', () => {
    const missing = documentedTargets().filter((t) => !readme.includes(`make ${t}\``))
    expect(missing, 'commands that exist but are undocumented in README.md').toEqual([])
  })

  it('does not document commands that do not exist', () => {
    const documented = [...readme.matchAll(/`make ([a-z][a-z-]*)`/g)].map((m) => m[1])
    const ghosts = [...new Set(documented)]
      .filter((t) => !new RegExp(`^${t}:`, 'm').test(makefile))
    expect(ghosts, 'README documents commands with no Makefile target').toEqual([])
  })
})

describe('CLAUDE.md matches package.json', () => {
  it('mentions every installed dependency', () => {
    const all = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]
    const unmentioned = all.filter((d) => !claude.includes(d))
    expect(unmentioned, 'installed but undocumented in CLAUDE.md').toEqual([])
  })
})

// The rule CLAUDE.md states most forcefully about colour, given teeth. It said
// "both papers" until an audit counted three: --paper-hi is mostly a foreground
// on dark, but app.css also uses it as a background.
describe('the three ink tokens stay WCAG AA on every paper', () => {
  const inks = ['ink', 'ink-muted', 'ink-faint']
  const papers = ['paper-1', 'paper-2', 'paper-hi']

  it('has three papers, not two', () => {
    const defined = [...tokens.matchAll(/^\s*(--paper[a-z0-9-]*):/gm)].map((m) => m[1])
    expect(defined.sort()).toEqual(['--paper-1', '--paper-2', '--paper-hi'])
  })

  it('clears 4.5:1 for small text on all of them', () => {
    for (const ink of inks) {
      for (const paper of papers) {
        const ratio = wcagContrast(token(ink), token(paper))
        expect(ratio, `--${ink} on --${paper} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('confirms --paper-2 is the binding constraint CLAUDE.md names', () => {
    // If this ever stops being true, the guidance to measure against paper-2
    // first is misleading and should be re-measured rather than trusted.
    const worst = inks.flatMap((ink) =>
      papers.map((paper) => ({ ink, paper, ratio: wcagContrast(token(ink), token(paper)) })))
      .sort((a, b) => a.ratio - b.ratio)[0]
    expect(worst.paper).toBe('paper-2')
    expect(worst.ink).toBe('ink-faint')
  })

  it('keeps the three inks visibly distinct, which is why they were solved together', () => {
    // Darkening --ink-faint "until it passes" lands it on --ink-muted.
    const ratios = inks.map((i) => wcagContrast(token(i), token('paper-1')))
    for (let n = 1; n < ratios.length; n++) {
      expect(ratios[n - 1] - ratios[n], `${inks[n - 1]} and ${inks[n]} are too close`)
        .toBeGreaterThan(1)
    }
  })
})
