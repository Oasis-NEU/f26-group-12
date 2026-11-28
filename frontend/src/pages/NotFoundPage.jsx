import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'

// Page not found: any URL that doesn't match a route in App.jsx. From the
// Figma section "Not found · any unknown URL".
//
// Three things, centred in the space under the header: what happened, a
// friendly line about why, and the way back to hunting (the page's one
// Primary button). Nothing moves: nobody pressed anything to get here.
//
// It sits outside Layout (App.jsx), so it draws its own skip link, header
// and <main>.
//
// Phones (the base styles): Title heading and a full-width button.
// Desktop (lg:): Display heading, the line kept to a readable width, and
// the button hugging its label.
function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      {/* React 19 moves this into the page's <head>. */}
      <title>Page not found · HuskyCache</title>
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* tabIndex={-1} lets the skip link move focus here. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center lg:px-[10%]">
          <h1 className="text-title text-text-primary lg:text-display">Page not found</h1>
          <p className="max-w-[32.5rem] text-balance text-body text-text-secondary">
            The link might be old, or the page moved. Even our best hint can’t find this one.
          </p>
          <Button to="/map" fullWidth className="lg:w-auto">
            Back to the map
          </Button>
        </div>
      </main>
    </div>
  )
}

export default NotFoundPage
