# Chord-wheel legibility & orientation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make highlighted links to rare partners visible on hover, and give the wheel a consistent, standard orientation (red at 12 o'clock, family order at every granularity).

**Architecture:** Ordering + rotation-anchor math live in the pure core (`src/core/chord.ts`, unit-tested against the mini fixture). The viz (`src/viz/chordRender.ts`) applies the rotation and renders the hover strokes; `ChordWheel` supplies the anchor via a closure so the viz never imports the dataset. CSS floors live in `src/styles/app.css`.

**Tech Stack:** Vite + React + TypeScript (strict) + D3 7 + Vitest.

## Global Constraints

- `src/core/` stays pure: only relative imports of other core files; no React/D3/browser globals. `tests/core-purity.test.ts` must stay green and must not be weakened.
- Every design token lives in `src/styles/tokens.css`; no hard-coded colors in components (Sanzo Wada data colors excepted — ribbon fills/strokes are data colors, allowed).
- Dependency budget unchanged (no new deps).
- `npx tsc --noEmit` and `make test` must pass at the end of every task.
- Do not change ribbon *resting* widths or the granularity crossfade.
- Hover-stroke widths and any exact px are presentation — tuned in the browser, asserted by the owner checklist, never in unit tests.

---

### Task 1: Core — Colors family-ordering + `redAnchorAngle`

**Files:**
- Modify: `src/core/chord.ts`
- Test: `tests/chord.test.ts`

**Interfaces:**
- Consumes: `Indexed`, `ancestorAtLevel`, `groupMembers` (already imported in chord.ts); `WheelNode`, `GranularityLevel`.
- Produces:
  - `wheelNodes(ix, 0)` now returns colors in **fine-family array order, then hue within family** (neutrals stay last because neutral fine families are last in the fine array).
  - `export interface AngleGroup { startAngle: number; endAngle: number; index: number }`
  - `export function redAnchorAngle(ix: Indexed, level: GranularityLevel, groups: readonly AngleGroup[], nodes: readonly WheelNode[]): number` — the arc-angle (radians) to bring to 12 o'clock. Levels 0–2: center of the Red broad-family block. Level 3: reddest member's slice within the Warm arc.

- [ ] **Step 1: Write the failing ordering test**

Add inside `describe('wheelNodes', …)` in `tests/chord.test.ts`:

```ts
  it('level 0 orders by fine-family then hue (browns/grays cluster, neutrals last)', () => {
    // fine order: dusty-pinks, true-reds, deep-blues, grays
    // within dusty-pinks by hue: c2 (316.6) before c1 (325.6); within deep-blues: c5 (200.5) before c4 (206.5)
    expect(wheelNodes(ix, 0).map((n) => n.key)).toEqual(['c2', 'c1', 'c3', 'c5', 'c4', 'c6'])
  })
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/chord.test.ts -t "orders by fine-family"`
Expected: FAIL (current order is by isNeutral then hue, so it will not equal that array).

- [ ] **Step 3: Implement the ordering change**

In `src/core/chord.ts`, replace the `level === 0` branch of `wheelNodes`:

```ts
  if (level === 0) {
    const order = new Map(ix.data.groups.fine.map((g, i) => [g.id, i]))
    return [...ix.data.colors]
      .sort((a, b) => (order.get(a.fineId)! - order.get(b.fineId)!) || (a.hue - b.hue))
      .map((c) => ({ key: `c${c.id}`, label: c.name, swatchHexes: [c.hex] }))
  }
```

Then remove the now-unused import `import { isNeutral } from './colorMath'` (verify `isNeutral` is used nowhere else in the file).

- [ ] **Step 4: Run ordering + existing wheelNodes tests**

Run: `npx vitest run tests/chord.test.ts -t "wheelNodes"`
Expected: PASS (new test passes; `level 0 lists colors, neutrals last` still passes because `c6`/grays is the last fine family; `levels use authored group order` unaffected).

- [ ] **Step 5: Write the failing `redAnchorAngle` tests**

Add a new `describe` block in `tests/chord.test.ts` (import `redAnchorAngle` and `AngleGroup` from `../src/core/chord`):

```ts
import { chordMatrix, combosForPair, redAnchorAngle, wheelNodes } from '../src/core/chord'
// ...
describe('redAnchorAngle', () => {
  const TAU = 2 * Math.PI
  const equalGroups = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ index: i, startAngle: (i / n) * TAU, endAngle: ((i + 1) / n) * TAU }))

  it('level 2 centers the Red broad block', () => {
    const nodes = wheelNodes(ix, 2) // [pink, red, blue]; red is index 1 of 3
    const a = redAnchorAngle(ix, 2, equalGroups(nodes.length), nodes)
    expect(a).toBeCloseTo(Math.PI) // center of the middle third
  })

  it('level 0 centers the red color block', () => {
    const nodes = wheelNodes(ix, 0) // [c2,c1,c3,c5,c4,c6]; c3 (the red) is index 2 of 6
    const a = redAnchorAngle(ix, 0, equalGroups(nodes.length), nodes)
    expect(a).toBeCloseTo((5 * Math.PI) / 6) // center of slice index 2
  })

  it('level 3 lands on the reddest slice inside Warm (near its start)', () => {
    const nodes = wheelNodes(ix, 3) // [warm, cool]; warm index 0 spans [0, PI]
    const a = redAnchorAngle(ix, 3, equalGroups(nodes.length), nodes)
    // warm members hue-sorted: [c3 6.8, c2 316.6, c1 325.6]; reddest = c3 at idx 0 → f=0.5/3
    expect(a).toBeCloseTo((0.5 / 3) * Math.PI)
    expect(a).toBeLessThan(Math.PI * 0.25)
  })
})
```

- [ ] **Step 6: Run them, verify they fail**

Run: `npx vitest run tests/chord.test.ts -t "redAnchorAngle"`
Expected: FAIL with "redAnchorAngle is not a function" / import error.

- [ ] **Step 7: Implement `redAnchorAngle`**

Append to `src/core/chord.ts`:

```ts
export interface AngleGroup { startAngle: number; endAngle: number; index: number }

function broadKeyOf(ix: Indexed, level: GranularityLevel, nodeKey: string): string | null {
  if (level === 0) return ancestorAtLevel(ix, Number(nodeKey.slice(1)), 2)
  if (level === 1) return ix.broadOfFine.get(nodeKey) ?? null
  if (level === 2) return nodeKey
  return null
}

// Arc-angle (radians) to rotate to 12 o'clock so "red" leads. Levels 0-2:
// center of the Red broad-family block (contiguous in family order). Level 3:
// the reddest member's slice within the Warm arc (members are drawn hue-sorted).
export function redAnchorAngle(
  ix: Indexed,
  level: GranularityLevel,
  groups: readonly AngleGroup[],
  nodes: readonly WheelNode[],
): number {
  const redBroad = ix.data.groups.broad.find((g) => g.name === 'Red')
  if (!redBroad) return 0
  if (level === 3) {
    const warmId = ix.superOfBroad.get(redBroad.id)
    const g = groups.find((gr) => nodes[gr.index]?.key === warmId)
    if (!g) return 0
    const members = groupMembers(ix, nodes[g.index].key) // hue-sorted, matches swatchHexes
    if (!members.length) return (g.startAngle + g.endAngle) / 2
    let bestIdx = 0
    let bestD = Infinity
    members.forEach((c, i) => {
      const d = Math.min(c.hue, 360 - c.hue)
      if (d < bestD) { bestD = d; bestIdx = i }
    })
    const f = (bestIdx + 0.5) / members.length
    return g.startAngle + f * (g.endAngle - g.startAngle)
  }
  const reds = groups.filter((g) => broadKeyOf(ix, level, nodes[g.index].key) === redBroad.id)
  if (!reds.length) return 0
  const start = Math.min(...reds.map((g) => g.startAngle))
  const end = Math.max(...reds.map((g) => g.endAngle))
  return (start + end) / 2
}
```

- [ ] **Step 8: Run the full core suite + typecheck**

Run: `npx vitest run tests/chord.test.ts && npx tsc --noEmit`
Expected: PASS, clean typecheck. (Confirms core purity untouched and nothing else broke.)

- [ ] **Step 9: Commit**

```bash
git add src/core/chord.ts tests/chord.test.ts
git commit -m "feat(core): family-order Colors level + redAnchorAngle for red-at-top"
```

---

### Task 2: Viz — apply red-at-top rotation

**Files:**
- Modify: `src/viz/chordRender.ts`
- Modify: `src/components/ChordWheel.tsx`

**Interfaces:**
- Consumes: `redAnchorAngle`, `AngleGroup` from `../core/chord` (Task 1).
- Produces: `renderChord(svgEl, nodes, matrix, cb, anchorAngleFor?)` where `anchorAngleFor?: (groups: readonly AngleGroup[]) => number` returns the arc-angle to bring to top.

**Verification:** owner browser checklist (no viz unit test); `npx tsc --noEmit` + `make test` stay green.

- [ ] **Step 1: Thread the anchor into `renderChord`**

In `src/viz/chordRender.ts`, import the type and extend the signature:

```ts
import type { AngleGroup, WheelNode } from '../core/chord'
```

```ts
export function renderChord(
  svgEl: SVGSVGElement, nodes: WheelNode[], matrix: number[][], cb: ChordCallbacks,
  anchorAngleFor?: (groups: readonly AngleGroup[]) => number,
): void {
```

- [ ] **Step 2: Compute the anchor and rotate the group**

After `const layout = d3.chord()…(matrix)` is created, add:

```ts
  const anchorRad = anchorAngleFor ? anchorAngleFor(layout.groups) : 0
  const anchorDeg = (anchorRad * 180) / Math.PI
```

Change the wheel group transform from `rotate(${TILT_DEG})` to include the anchor:

```ts
    .attr('transform', `rotate(${TILT_DEG - anchorDeg})`)
```

And update the center label's counter-rotation so the hover text stays upright (it must cancel the *full* group rotation now):

```ts
    .attr('transform', `rotate(${anchorDeg - TILT_DEG})`)
```

(The Delaunay/arc angle math is unchanged: it works in the group's local, pre-transform frame, and `d3.pointer(event, gNode)` already accounts for the group's CTM — the same property the tilt relies on.)

- [ ] **Step 3: Pass the closure from `ChordWheel`**

In `src/components/ChordWheel.tsx`, import `redAnchorAngle` and pass the closure as the 5th argument:

```ts
import { chordMatrix, redAnchorAngle } from '../core/chord'
```

```ts
    renderChord(svgRef.current, nodes, matrix, {
      onArcClick: (key) => /* unchanged */,
      onRibbonClick: (keyA, keyB) => /* unchanged */,
    }, (groups) => redAnchorAngle(dataset, granularity, groups, nodes))
```

- [ ] **Step 4: Typecheck + full suite**

Run: `npx tsc --noEmit && make test`
Expected: clean typecheck; all tests pass (SSR smoke tests don't exercise renderChord, so they're unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/viz/chordRender.ts src/components/ChordWheel.tsx
git commit -m "feat(viz): rotate the wheel so red sits at 12 o'clock at every level"
```

**Owner browser check (record in report, owner verifies live):** at Colors/Shades/Families/Groups the reds sit at 12 o'clock; the center hover label reads upright; hovering still snaps without flicker.

---

### Task 3: Viz + CSS — hover legibility (stroke floor + partner arcs)

**Files:**
- Modify: `src/viz/chordRender.ts`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: existing `resolveAt`/`process`/`clearHover` hover machinery.
- Produces: ribbons carry a `stroke` = source color; on color-hover the partner arcs join the hot set and the wheel gets a `hover-arc` class; on link-hover it gets `hover-ribbon`. CSS gives `.ribbon.hot` a stroke-width floor (bolder under `hover-arc`).

**Verification:** owner browser checklist; `npx tsc --noEmit` + `make test` stay green.

- [ ] **Step 1: Give ribbons a stroke equal to their fill**

In `src/viz/chordRender.ts`, in the ribbons `.join('path')` chain, add after the `fill` attr:

```ts
    .attr('fill', (d) => nodeColor(d.source.index))
    .attr('stroke', (d) => nodeColor(d.source.index))
```

- [ ] **Step 2: Add `kind` to the resolved hover + brighten partner arcs**

Extend the `Resolved` interface with a discriminator:

```ts
  interface Resolved { key: string; kind: 'arc' | 'ribbon'; hot: Element[]; label: string; onClick: () => void }
```

In `resolveAt`, the **arc** branch: also push the partner arc for each connected ribbon, and tag `kind: 'arc'`:

```ts
      const hot: Element[] = [arcNodes[i]]
      layout.forEach((d, k) => {
        if (d.source.index === i || d.target.index === i) {
          hot.push(ribbonNodes[k])
          const partner = d.source.index === i ? d.target.index : d.source.index
          if (partner !== i) hot.push(arcNodes[partner])
        }
      })
      return { key: `a${i}`, kind: 'arc', hot, label: nodes[i].label, onClick: () => cb.onArcClick(nodes[i].key) }
```

The **ribbon** branch: tag `kind: 'ribbon'` on its returned object (hot set unchanged).

- [ ] **Step 3: Toggle the container weight class in `process` and clear it**

In `process()`, after `gNode.classList.add('dimming')`:

```ts
      gNode.classList.add('dimming')
      gNode.classList.toggle('hover-arc', res.kind === 'arc')
      gNode.classList.toggle('hover-ribbon', res.kind === 'ribbon')
```

In `clearHover()`, remove all three:

```ts
      gNode.classList.remove('dimming', 'hover-arc', 'hover-ribbon')
```

- [ ] **Step 4: Add the CSS stroke floors**

In `src/styles/app.css`, add `stroke-width: 0` and a round join to the existing `.chord-wheel .ribbon` rule, and add the two hover-weight rules near the other `.hot` rules:

```css
.chord-wheel .ribbon { opacity: 0.55; transition: opacity var(--dur-hover) var(--ease); pointer-events: none; stroke-width: 0; stroke-linejoin: round; }
.chord-wheel g.wheel.hover-ribbon .ribbon.hot { stroke-width: 2.5; }
.chord-wheel g.wheel.hover-arc .ribbon.hot { stroke-width: 5; }
```

(Partner-arc brightening needs no new rule: the enlarged hot set means those arcs are no longer matched by `g.wheel.dimming .arc:not(.hot)`.)

- [ ] **Step 5: Typecheck + full suite**

Run: `npx tsc --noEmit && make test`
Expected: clean typecheck; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/viz/chordRender.ts src/styles/app.css
git commit -m "feat(viz): stroke-floor highlighted links + brighten partner arcs on hover"
```

**Owner browser check (record in report, owner verifies live):** hovering a color makes even rare-partner links visible and brightens the partner arcs; color-hover links are clearly bolder than single-link hover; the resting wheel is unchanged; no hover flicker.

---

## Docs (coordinator, before merge — keeps the docs contract)

Handled by the coordinator, not a task subagent (PROMPTS needs the verbatim prompts):
- `PROMPTS.md`: append the Session 5 entry (owner prompts verbatim + decisions: hover legibility, standard orientation over black-at-top, family-consistent ordering, super red-anchor fix).
- `TODO.md`: add the deferred items from the spec (revisit orientation/RYB wheel; gradient source→target highlight strokes).
- `TODO-completed.md`: add this work with the merge/commit hashes.
- Commit `docs/superpowers/specs/2026-07-20-wheel-legibility-and-orientation.md` and this plan.
- README: verified no change needed (it describes wheel *usage*, not hover mechanics or orientation).
