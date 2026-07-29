import { useEffect, useState } from 'react'
import { loadSeasonData, type SeasonData } from '../../data'

/**
 * The colour-analysis datasets, fetched on first use. Null until they arrive.
 *
 * They are ~98 kB and only this tab needs them, so they are code-split — see
 * `loadSeasonData`. The promise is cached there, so several components calling
 * this hook share one fetch.
 */
export function useSeasonData(): SeasonData | null {
  const [data, setData] = useState<SeasonData | null>(null)

  useEffect(() => {
    let alive = true
    loadSeasonData().then((d) => {
      if (alive) setData(d)
    })
    // The guard matters: the visitor can leave the You tab while the fetch is
    // in flight, and setting state on an unmounted component is a warning at
    // best and a leak at worst.
    return () => {
      alive = false
    }
  }, [])

  return data
}
