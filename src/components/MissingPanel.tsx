import type { Action } from '../core/state'
import { Panel } from './Panel'

// Shown when app state names something the book does not contain.
//
// Every detail panel used to resolve its id with a non-null assertion —
// `dataset.colorById.get(colorId)!` — which threw `Cannot read properties of
// undefined` on an id that was not there. The ErrorBoundary is at the root, so
// that did not blank one panel: it took down the whole site, wheel and Browse
// and all, leaving the visitor to reload.
//
// Unreachable while every id comes from clicking something real. It stops being
// unreachable the moment app state can arrive from a URL — the top item in
// TODO.md — where a stale or hand-edited link is ordinary, not exotic. Wrong
// answers should be explainable; a shared link that no longer resolves should
// say so and let you carry on.
//
// The same class of bug was fixed in Browse in v1.7.1 via `keyLabel`. This is
// the rest of it.
export function MissingPanel({ what, id, dispatch }: {
  /** The kind of thing, for the message: "colour", "combination", "group". */
  what: string
  /** Echoed back so a broken link is diagnosable rather than merely broken. */
  id: string | number
  dispatch: (a: Action) => void
}) {
  return (
    <Panel title="Not in this book" onClose={() => dispatch({ type: 'closePanel' })}>
      <p>
        This link points at a {what} that isn't in <em>A Dictionary of Color
        Combinations</em> — it may be from an older version of the site, or the
        address may have been altered.
      </p>
      <p className="muted">Requested {what}: <code>{String(id)}</code></p>
    </Panel>
  )
}
