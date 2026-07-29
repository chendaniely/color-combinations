import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// This repo is kept as a provenance record, not just a codebase — the owner's
// reason for the specs/plans rule in CLAUDE.md: "this way we have provinance on
// how this repo was built." TODO-completed.md is a load-bearing part of that
// chain: every finished item names the commit that finished it. A hash that
// does not resolve is a broken link in the record, and nothing would otherwise
// notice — a typo, a rebase, or a squashed branch all produce one silently.
//
// SHALLOW CLONES: CI checks out with actions/checkout@v4 at its default depth
// of 1, so old commits genuinely are not present there and this cannot run.
// It skips rather than fails, because "the history is not downloaded" is not
// the same fact as "the history is wrong", and a test that cries wolf in CI
// gets deleted. It runs on any full clone, which is every developer machine.
function isShallow(): boolean {
  try {
    return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' })
      .trim() === 'true'
  } catch {
    return true // no git at all: treat as un-checkable
  }
}

// One `git cat-file --batch-check` for every hash at once. The obvious version
// spawns a process per hash, which took 7.8s for 68 of them — a large share of
// a suite that otherwise runs in about ten seconds, and this release already
// spent a pass diagnosing a timeout caused by slow tests.
function missingCommits(hashes: string[]): string[] {
  if (hashes.length === 0) return []
  const out = execFileSync('git', ['cat-file', '--batch-check'], {
    input: hashes.map((h) => `${h}^{commit}`).join('\n') + '\n',
    encoding: 'utf8',
  })
  // A resolvable object prints "<sha> commit <size>"; an unknown one prints
  // "<what you asked for> missing".
  return out.trim().split('\n')
    .map((line, i) => (line.endsWith('missing') ? hashes[i] : null))
    .filter((h): h is string => h !== null)
}

const HASHES = [...new Set(
  (readFileSync('TODO-completed.md', 'utf8').match(/\b[0-9a-f]{7,40}\b/g) ?? [])
    // Filter to things that look like short hashes rather than, say, a hex
    // colour written without its leading #.
    .filter((h) => h.length === 7 || h.length === 40),
)]

describe('the provenance chain in TODO-completed.md', () => {
  it.skipIf(isShallow())('every commit hash it cites still resolves', () => {
    expect(HASHES.length, 'no hashes found — has the format changed?').toBeGreaterThan(20)
    expect(missingCommits(HASHES), 'referenced but do not exist').toEqual([])
  })

  it('every completed entry carries a hash, as the contract requires', () => {
    const text = readFileSync('TODO-completed.md', 'utf8')
    // Entries are "- [x] …", possibly wrapped over several lines; an entry ends
    // at the next bullet or blank-line-separated block.
    const entries = text.split(/\n(?=- \[x\])/).filter((e) => e.startsWith('- [x]'))
    expect(entries.length).toBeGreaterThan(20)
    const missing = entries
      .filter((e) => !/\b[0-9a-f]{7,40}\b/.test(e))
      .map((e) => e.split('\n')[0].slice(0, 70))
    expect(missing, 'completed items with no commit hash').toEqual([])
  })
})
