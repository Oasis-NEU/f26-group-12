import { Link } from 'react-router'
import SiteHeader from '../components/SiteHeader.jsx'

// Shown for any URL that doesn't match a route in App.jsx.
// Phone layout: full-width button. Desktop (md and up): bigger text, narrower message.
function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <SiteHeader />

      <section className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center md:px-[10%] md:py-8">
        <h1 className="w-full text-[24px] font-extrabold leading-8 tracking-[-0.25px] md:text-[36px] md:leading-[49px] md:tracking-normal">
          Page not found
        </h1>
        <p className="w-full text-[15px] font-medium leading-[21px] text-[#444] md:max-w-[520px] md:text-[17px] md:leading-6">
          The link might be old, or the page moved. Even our best hint can’t find this one.
        </p>
        <Link
          to="/map"
          className="flex h-12 w-full items-center justify-center bg-black px-5 text-[15px] font-bold leading-[21px] text-white transition-colors hover:bg-[#292929] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e] md:w-auto"
        >
          Back to the map
        </Link>
      </section>
    </div>
  )
}

export default NotFoundPage
