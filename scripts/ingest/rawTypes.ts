// The ONLY file that knows the shape of the vendored Sanzo Wada source data.
export interface RawColor {
  index: number
  name: string
  slug: string
  hex: string
  rgb_array: number[]
  cmyk_array: number[]
  combinations: number[]
  use_count: number
}

export interface RawFile {
  colors: RawColor[]
}
