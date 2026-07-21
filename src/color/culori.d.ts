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
}
