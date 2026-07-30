// The hanko in the corner, and what version you are looking at.
//
// FIXED, not in the document flow. It used to live in a plain <footer>, which
// on the wheel lands at the bottom of the viewport and LOOKS pinned — so the
// first long page (You, with fifty swatches) was where it visibly scrolled
// away. Reported by the owner as "it's not locked to the bottom right corner".
//
// The version is injected from package.json at build time rather than typed
// here. During the v1.8.1 audit a hand-written number turned out to be wrong in
// three places at once, and this one would be seen by every visitor on every
// screen. It links to its own CHANGELOG entry, so the badge answers "what
// changed?" and not merely "what version?".
export function SiteMark() {
  const version = __APP_VERSION__
  return (
    <div className="site-mark">
      <a
        className="site-version"
        href={`https://github.com/chendaniely/color-combinations/blob/main/CHANGELOG.md#v${version.replace(/\./g, '')}`}
        target="_blank"
        rel="noreferrer"
        title={`Version ${version} — read what changed`}
      >
        v{version}
      </a>
      <span className="hanko" title="iro — color" aria-hidden="true">色</span>
    </div>
  )
}
