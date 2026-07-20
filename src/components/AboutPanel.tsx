import { Panel } from './Panel'
import type { Action } from '../core/state'

export function AboutPanel({ dispatch }: { dispatch: (a: Action) => void }) {
  return (
    <Panel title="About" onClose={() => dispatch({ type: 'toggleAbout' })}>
      <p>
        In the 1930s, Japanese artist and teacher <strong>Sanzo Wada</strong> published
        <em> A Dictionary of Color Combinations</em> — six volumes of color pairings,
        trios, and quartets that remain a designer's treasure. This site puts all
        348 combinations (157 colors) at your fingertips.
      </p>
      <h3>Dress yourself</h3>
      <p>
        Want a fresh palette? Hit <strong>Surprise me</strong>, or browse 2–3 color
        combinations in families you like wearing. Taller bars suggest the main
        garment; slivers are accents.
      </p>
      <h3>Build around what you own</h3>
      <p>
        Search for your item's color ("indigo"), open it, and see every combination
        the book endorses. Your shirt is never <em>exactly</em> Wada's blue — so
        zoom the wheel out a level and see what pairs with blues in general. If
        blues meet ochres twelve times, ochre belongs in your wardrobe.
      </p>
      <h3>Build an outfit of several colors</h3>
      <p>
        Open <strong>Match</strong>, start from a shade you own (say Olives), and
        add shades it goes with — Deep Teals, Tans, Russets — to build a palette
        of three or more. A <em>★ book-verified</em> suggestion means Sanzo Wada
        actually used all of them together; the rest still pair with each shade
        you've chosen, which is what makes it wardrobe-friendly.
      </p>
      <h3>Theme a website or deck</h3>
      <p>
        Find a combination you love, then copy its hex codes, CSS variables, or
        JSON straight into your project.
      </p>
      <h3>Learn from the master</h3>
      <p>
        Set the wheel to Families or Groups and read the ribbons: their thickness
        is how often Wada combined those families. The coarse wheel is a lesson
        in what harmonizes.
      </p>
      <p className="muted">
        Honesty notes: bar proportions are decorative (the source data has no
        plate ratios); ten one-color entries in the source are hidden as data
        errors; three five-color combinations appear under "4+".
      </p>
      <p className="muted">
        Data: <a href="https://sanzo-wada.dmbk.io" target="_blank" rel="noreferrer">sanzo-wada.dmbk.io</a>.
        Site by Daniel, vibe-coded with Claude.
      </p>
    </Panel>
  )
}
