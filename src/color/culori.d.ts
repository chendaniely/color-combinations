declare module 'culori' {
  export interface CuloriColor {
    mode: string
    r?: number; g?: number; b?: number; alpha?: number
    [channel: string]: number | string | undefined
  }
  export function differenceEuclidean(mode?: string): (a: CuloriColor, b: CuloriColor) => number
}
