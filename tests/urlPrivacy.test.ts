// A skin reading may never enter a URL.
//
// This is the enforcement of a decision the owner made on 2026-07-29, when
// shareable links were designed. `SkinReading` holds `skin` and `hair` — the
// visitor's actual skin and hair colour, white-balanced off their face. A link
// carrying those, pasted into Slack or iMessage, would publish the sender's
// skin tone to someone else's server: by their own hand, enabled by our design,
// and probably without them realising.
//
// Hash fragments are never sent to OUR server, which is a real privacy property
// of the design. It does not help here. The risk is the recipient.
//
// So a shared You-tab link carries the SEASON and the floor, and nothing else.
// The accepted costs are recorded in the spec: the "Measured for you" palette
// cannot be reproduced from a link, and nobody can bookmark their own full
// result.
//
// This file belongs with tests/sample-privacy.test.ts, tests/camera-privacy.
// test.ts and tests/facePrivacy.test.ts, and like them it must NEVER be
// weakened. Widening it is not a refactor; it is a change to what the site
// promises.
import { describe, expect, it } from 'vitest'
import { encodeState } from '../src/core/urlState'
import { initialState, type AppState } from '../src/core/state'
import type { SkinReading } from '../src/core/types'

// Distinctive values on purpose: every one of these is searched for in the
// output, so a leak is caught even if the FIELD were renamed.
const READING: SkinReading = {
  skin: '#a1673f',
  hair: '#1a1110',
  undertone: 'warm',
  depth: 'deep',
  contrast: 'high',
  skinL: 49.4,
  skinHue: 57.1,
  ita: -1,
  contrastGap: 43.5,
  whiteBalanced: true,
}

const WITH_READING: AppState = {
  ...initialState,
  view: 'you',
  you: { reading: READING, season: 'deep-autumn', floor: 3 },
}

const encoded = encodeState(WITH_READING)

describe('the encoded URL never carries the reading', () => {
  it('names none of the reading fields', () => {
    for (const field of Object.keys(READING)) {
      expect(encoded, `"${field}" appears in ${encoded}`).not.toContain(field)
    }
  })

  // The check that survives a rename. Field names can change; the visitor's
  // skin colour is the thing that must not travel.
  it('contains neither the skin nor the hair colour, with or without the hash', () => {
    for (const hex of [READING.skin, READING.hair!]) {
      expect(encoded, `${hex} appears in ${encoded}`).not.toContain(hex)
      expect(encoded, `${hex} appears unhashed in ${encoded}`).not.toContain(hex.slice(1))
      expect(encoded.toLowerCase()).not.toContain(hex.slice(1).toLowerCase())
    }
  })

  it('contains none of the measured numbers', () => {
    for (const n of [READING.skinL, READING.skinHue, READING.contrastGap!]) {
      expect(encoded, `${n} appears in ${encoded}`).not.toContain(String(n))
    }
  })

  it('leaks nothing for any plausible reading, not just this one', () => {
    const readings: SkinReading[] = [
      READING,
      { ...READING, hair: null, contrastGap: null },
      { ...READING, skin: '#ffffff', hair: '#000000', undertone: 'cool', depth: 'light' },
      { ...READING, skin: '#2f2a26', whiteBalanced: false, ita: 55.5 },
    ]
    for (const reading of readings) {
      const out = encodeState({ ...WITH_READING, you: { ...WITH_READING.you, reading } })
      for (const hex of [reading.skin, reading.hair].filter(Boolean) as string[]) {
        expect(out, `${hex} leaked`).not.toContain(hex.slice(1))
      }
      expect(out).not.toContain(String(reading.skinL))
      expect(out).not.toContain(String(reading.ita))
    }
  })
})

// A test that passes by encoding nothing is worthless. These pin what a You
// link DOES carry, so the guard above cannot be satisfied by breaking the
// feature.
describe('but the link still carries what makes it worth sharing', () => {
  it('carries the season', () => {
    expect(encoded).toContain('season=deep-autumn')
  })

  it('carries the floor when it is not the default', () => {
    expect(encoded).toContain('floor=3')
  })

  it('lands the reader on the You tab', () => {
    expect(encoded).toContain('#/you')
  })

  it('is short enough for a person to read', () => {
    // The whole argument for a readable format over an encoded blob.
    expect(encoded.length).toBeLessThan(60)
  })
})

describe('the reading cannot come back IN through a URL either', () => {
  it('ignores a hand-crafted link that tries to supply one', async () => {
    const { decodeState } = await import('../src/core/urlState')
    // Someone editing a link by hand, or an older version of this site that
    // encoded more than it should have.
    const hostile = '#/you?season=deep-autumn&skin=a1673f&hair=1a1110&skinL=49.4&ita=-1'
    const decoded = decodeState(hostile)
    expect(decoded.you?.reading, 'a URL supplied a reading').toBeNull()
    // And the legitimate part still works, so the link is not simply rejected.
    expect(decoded.you?.season).toBe('deep-autumn')
  })
})
