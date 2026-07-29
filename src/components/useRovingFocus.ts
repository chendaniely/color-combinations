import { useRef, type KeyboardEvent } from 'react'

// Arrow-key navigation for a composite widget — a radiogroup or a single-select
// listbox. Three of these existed with none of it: every option was its own tab
// stop, so tabbing through the sampler meant pressing Tab twelve times to walk
// past the nearest-colours grid, and arrow keys did nothing at all. ARIA
// expects the opposite: one tab stop for the whole group, arrows to move within
// it.
//
// Selection follows focus, which is correct for both roles here — a radiogroup
// checks the radio the arrows land on, and these listboxes are single-select
// with no separate commit step. It is delivered by clicking the element so each
// component keeps one onClick as the single definition of what choosing means.
const NAV = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']

export function useRovingFocus<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  function onKeyDown(e: KeyboardEvent) {
    if (!NAV.includes(e.key)) return
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(
      '[role="option"], [role="radio"]') ?? [])]
    if (items.length === 0) return
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at === -1) return

    let next = at
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (at + 1) % items.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else next = items.length - 1

    e.preventDefault()
    items[next].focus()
    items[next].click()
  }

  // Spread onto each option. Only the chosen one is tabbable, so the group is a
  // single stop in the page's tab order.
  function itemProps(selected: boolean) {
    return { tabIndex: selected ? 0 : -1 }
  }

  return { ref, onKeyDown, itemProps }
}
