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
        <span className="sample-src-ic" aria-hidden="true">🔍</span>
        <span className="sample-src-tx"><b>Search by name</b><small>If you know what it is called</small></span>
      </button>

      {cameraAvailable && (
        <button type="button" className="sample-src" onClick={() => onPick('camera')}>
          <span className="sample-src-ic" aria-hidden="true">📷</span>
          <span className="sample-src-tx"><b>Camera</b><small>Point at something real</small></span>
        </button>
      )}

      <button type="button" className="sample-src" onClick={() => onPick('upload')}>
        <span className="sample-src-ic" aria-hidden="true">🖼</span>
        <span className="sample-src-tx"><b>Upload a photo</b><small>Tap a color in the picture</small></span>
      </button>

      <button type="button" className="sample-src" onClick={() => onPick('pick')}>
        <span className="sample-src-ic" aria-hidden="true">🎨</span>
        <span className="sample-src-tx"><b>Pick a color</b><small>Wheel, or a hex / RGB / CMYK value</small></span>
      </button>
    </div>
  )
}
