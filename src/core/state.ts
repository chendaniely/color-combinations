// The single serializable app-state object and its reducer.
// Core kernel: no imports outside src/core.
import type { AccessLensId, GranularityLevel, SizeBucket } from './types'

export type Selection =
  | { kind: 'color'; id: number }
  | { kind: 'combination'; id: number }
  | { kind: 'group'; id: string }
  | { kind: 'ribbon'; level: GranularityLevel; keyA: string; keyB: string; sizes?: SizeBucket[] }

export type MatchLevel = 0 | 1 | 2

export interface AppState {
  view: 'wheel' | 'browse' | 'match'
  granularity: GranularityLevel
  sizes: SizeBucket[]
  selection: Selection | null
  aboutOpen: boolean
  palette: { level: MatchLevel; keys: string[] }
  browse: { family: string; shade: string; colorId: string }
  access: AccessLensId[]
}

export type Action =
  | { type: 'setView'; view: AppState['view'] }
  | { type: 'setGranularity'; level: GranularityLevel }
  | { type: 'toggleSize'; size: SizeBucket }
  | { type: 'select'; selection: Selection }
  | { type: 'closePanel' }
  | { type: 'toggleAbout' }
  | { type: 'seedPalette'; key: string; level: MatchLevel }
  | { type: 'addToPalette'; key: string }
  | { type: 'removeFromPalette'; key: string }
  | { type: 'setMatchLevel'; level: MatchLevel; keys: string[] }
  | { type: 'clearPalette' }
  | { type: 'setBrowseFilter'; browse: { family: string; shade: string; colorId: string } }
  | { type: 'toggleAccess'; id: AccessLensId }

export const initialState: AppState = {
  view: 'wheel',
  granularity: 0,
  sizes: [2, 3, 4],
  selection: null,
  aboutOpen: false,
  palette: { level: 1, keys: [] },
  browse: { family: '', shade: '', colorId: '' },
  access: [],
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view }
    case 'setGranularity':
      return { ...state, granularity: action.level }
    case 'toggleSize': {
      const has = state.sizes.includes(action.size)
      if (has && state.sizes.length === 1) return state
      const sizes = has
        ? state.sizes.filter((s) => s !== action.size)
        : [...state.sizes, action.size].sort((a, b) => a - b)
      return { ...state, sizes }
    }
    case 'select':
      return { ...state, selection: action.selection, aboutOpen: false }
    case 'closePanel':
      return { ...state, selection: null }
    case 'toggleAbout':
      return { ...state, aboutOpen: !state.aboutOpen, selection: null }
    case 'seedPalette':
      return {
        ...state, view: 'match', selection: null, aboutOpen: false,
        palette: { level: action.level, keys: [action.key] },
      }
    case 'addToPalette': {
      if (state.palette.keys.includes(action.key)) return state
      return { ...state, palette: { ...state.palette, keys: [...state.palette.keys, action.key] } }
    }
    case 'removeFromPalette':
      return {
        ...state,
        palette: { ...state.palette, keys: state.palette.keys.filter((k) => k !== action.key) },
      }
    case 'setMatchLevel':
      return { ...state, palette: { level: action.level, keys: action.keys } }
    case 'clearPalette':
      return { ...state, palette: { ...state.palette, keys: [] } }
    case 'setBrowseFilter':
      return { ...state, browse: action.browse }
    case 'toggleAccess': {
      const has = state.access.includes(action.id)
      const access = has
        ? state.access.filter((a) => a !== action.id)
        : [...state.access, action.id]
      return { ...state, access }
    }
  }
}
