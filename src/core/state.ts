// The single serializable app-state object and its reducer.
// Core kernel: no imports outside src/core.
import type { GranularityLevel, SizeBucket } from './types'

export type Selection =
  | { kind: 'color'; id: number }
  | { kind: 'combination'; id: number }
  | { kind: 'group'; id: string }
  | { kind: 'ribbon'; level: GranularityLevel; keyA: string; keyB: string }

export interface AppState {
  view: 'wheel' | 'browse'
  granularity: GranularityLevel
  sizes: SizeBucket[]
  selection: Selection | null
  aboutOpen: boolean
}

export type Action =
  | { type: 'setView'; view: AppState['view'] }
  | { type: 'setGranularity'; level: GranularityLevel }
  | { type: 'toggleSize'; size: SizeBucket }
  | { type: 'select'; selection: Selection }
  | { type: 'closePanel' }
  | { type: 'toggleAbout' }

export const initialState: AppState = {
  view: 'wheel',
  granularity: 0,
  sizes: [2, 3, 4],
  selection: null,
  aboutOpen: false,
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
  }
}
