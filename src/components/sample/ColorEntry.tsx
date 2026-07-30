import { Camera, Image, MagnifyingGlass, Palette } from '@phosphor-icons/react'

export type EntrySource = 'search' | 'camera' | 'upload' | 'pick'

// Every way into a colour, in one place.
//
// This card list lived inside ColorSampler, reachable only through an overlay
// behind a pencil icon — which is why the owner reported that "the options under
// the pencil aren't that visable to the user". Extracted so the overlay and
// Match > Colors can show the SAME cards in the same order rather than growing
// two lists that drift apart.
//
// Presentational on purpose: it reports which card was chosen and knows nothing
// about overlays, capture screens or dispatch. That is what lets it sit inline
// on a page as easily as inside a dialog.
//
// ICONS, NOT EMOJI, since 2026-07-30. Emoji are rendered by the operating
// system, so the four cards looked like four different illustration styles and
// changed shape between macOS, Windows and Android; they also cannot take a
// stroke weight, so nothing tied them to a japandi line aesthetic. Phosphor at
// weight "light" matches the hairlines the rest of the site is drawn with.
// Owner's call, 2026-07-30: "i'm okay with an icon library instead of emojis.
// gives us more flexibility." Import each glyph by name — the barrel is ~9000
// icons and only named imports tree-shake.
//
// SEARCH IS THE ODD ONE OUT, deliberately. The other three open a capture
// screen; search focuses the header box that is always there. A second search
// input would be two things to keep in step, and pointing at the permanent one
// teaches where it lives.
export function ColorEntry({ onPick, cameraAvailable, className }: {
  onPick: (source: EntrySource) => void
  /** Omit the camera card rather than offering a button that cannot work. */
  cameraAvailable: boolean
  className?: string
}) {
  return (
    <div className={className ? `color-entry ${className}` : 'color-entry'}>
      <button type="button" className="sample-src" onClick={() => onPick('search')}>
        <span className="sample-src-ic"><MagnifyingGlass weight="light" aria-hidden /></span>
        <span className="sample-src-tx"><b>Search by name</b><small>If you know what it is called</small></span>
      </button>

      {cameraAvailable && (
        <button type="button" className="sample-src" onClick={() => onPick('camera')}>
          <span className="sample-src-ic"><Camera weight="light" aria-hidden /></span>
          <span className="sample-src-tx"><b>Camera</b><small>Point at something real</small></span>
        </button>
      )}

      <button type="button" className="sample-src" onClick={() => onPick('upload')}>
        <span className="sample-src-ic"><Image weight="light" aria-hidden /></span>
        <span className="sample-src-tx"><b>Upload a photo</b><small>Tap a color in the picture</small></span>
      </button>

      <button type="button" className="sample-src" onClick={() => onPick('pick')}>
        <span className="sample-src-ic"><Palette weight="light" aria-hidden /></span>
        <span className="sample-src-tx"><b>Pick a color</b><small>Wheel, or a hex / RGB / CMYK value</small></span>
      </button>
    </div>
  )
}
