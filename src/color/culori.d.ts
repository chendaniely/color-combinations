declare module 'culori' {
  export interface CuloriColor {
    mode: string
    r?: number; g?: number; b?: number; alpha?: number
    [channel: string]: number | string | undefined
  }
  export function differenceEuclidean(mode?: string): (a: CuloriColor, b: CuloriColor) => number
  export function wcagContrast(a: string | CuloriColor, b: string | CuloriColor): number
  export function filterDeficiencyProt(severity?: number): (color: string | CuloriColor) => CuloriColor
  export function filterDeficiencyDeuter(severity?: number): (color: string | CuloriColor) => CuloriColor
  export function converter(mode: 'lab'): (color: string | CuloriColor) => { l: number; a: number; b: number }
  export function converter(mode: 'rgb'): (color: string | CuloriColor) => { mode: 'rgb'; r: number; g: number; b: number }
  export function inGamut(mode: 'rgb'): (color: CuloriColor) => boolean
  export function formatHex(color: string | CuloriColor): string
}
