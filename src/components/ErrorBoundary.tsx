import { Component, type ErrorInfo, type ReactNode } from 'react'

// The last line of defence. Without one of these, any throw during render
// unmounts the whole tree and leaves a blank white page — the error visible
// only in a devtools console. This project's owner does not read JavaScript, so
// "blank page, no explanation" is the single worst failure mode it has.
//
// The realistic triggers are not the bundled data (validated at build AND at
// load, from bytes that cannot change between the two) but the browser-facing
// edges: a canvas context that fails to allocate, a camera API behaving
// unusually, the lazily-loaded face detector failing to initialise.
//
// It deliberately does NOT try to recover by re-rendering the same tree that
// just threw. It offers a reload, and it shows the message, because a message
// the owner can paste into a session is worth more than a prettier apology.
interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Still logged, so the console trace survives for anyone who does look.
    console.error('Unhandled error in render:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong.</h1>
        <p>
          This is a bug in the site, not something you did. Reloading usually
          clears it — nothing you have done is stored, so nothing is lost.
        </p>
        <button className="cam-btn primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
        <p className="crash-detail">
          If it keeps happening, this is the detail worth reporting:
          <code>{error.message}</code>
        </p>
      </div>
    )
  }
}
