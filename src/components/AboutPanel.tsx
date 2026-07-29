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
        combinations in families you like wearing. The bar heights on each plate
        are decorative — the book says which colors belong together, not how much
        of each to use.
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
      <h3>Find colors that suit you</h3>
      <p>
        The <strong>You</strong> tab takes a photograph of your face and measures
        three things: whether your colouring leans warm or cool, how deep it is,
        and how much contrast there is between your skin and hair. It then shows
        you two palettes — and they are <em>not</em> built the same way, which
        matters.
      </p>
      <p>
        <strong>Measured for you</strong> is worked out from your face by four
        stated rules: colours that agree with your undertone, are far enough from
        your skin in lightness that your face stays distinct, are as vivid as
        your contrast can carry, and avoid a narrow band that makes almost any
        skin look tired. Every colour will tell you why it's there.
      </p>
      <p>
        <strong>The season palette</strong> is computed from <strong>PCCS</strong>,
        the colour system the Japan Color Research Institute published in 1964 —
        the institute <em>Sanzo Wada founded in 1927</em>, six years before this
        book. It's what Korean personal colour analysis is built on, which makes
        it the right system for this book rather than merely an available one.
      </p>
      <p>
        Two levels, and the difference is deliberate. The four seasons — Spring,
        Summer, Autumn, Winter — follow a <strong>published rule</strong>: a warm
        or cool half of the PCCS hue circle plus a set of its tones. The twelve
        sub-seasons are <strong>ours</strong>; no published source defines them
        consistently, and the site marks them so. Nothing is hand-picked either
        way — which colours belong to a season falls out of the rules, and you
        can read the rules in <code>data/curated/season-rules.json</code>.
      </p>
      <p>
        What you see are the <strong>closest matches in Wada's book</strong>, not
        exact season colours, and each one shows how close it actually is. The
        book was printed in 1933 for pigments: only eleven of its 157 colours are
        genuinely muted, so the soft seasons in particular are served by
        approximations. Showing the gap seemed better than hiding it.
      </p>
      <p>
        Your photograph <strong>never leaves your device</strong>. It isn't
        uploaded and isn't saved — it's measured and thrown away, and only the
        few numbers above it survive. The face detection runs on your own
        machine, from files served by this site.
      </p>
      <p className="muted">
        Honesty notes: bar proportions are decorative (the source data has no
        plate ratios); ten one-color entries in the source are hidden as data
        errors; three five-color combinations appear under "4+". Wada's palette
        leans warm — 109 of its 157 colors read warm against 48 cool — so
        cool-toned visitors get a shorter personal palette here than warm-toned
        ones. That's the book, not you.
      </p>
      <p className="muted">
        Data: <a href="https://sanzo-wada.dmbk.io" target="_blank" rel="noreferrer">sanzo-wada.dmbk.io</a>.
        {' '}Where the season colours come from, with sources:{' '}
        <a href="https://github.com/chendaniely/color-combinations/blob/main/docs/color-analysis-sources.md"
          target="_blank" rel="noreferrer">color-analysis-sources.md</a>.
        {' '}Site by Daniel, vibe-coded with Claude.
      </p>
    </Panel>
  )
}
