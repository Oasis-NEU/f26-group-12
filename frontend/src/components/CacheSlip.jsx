// The printed slip that goes inside a cache: its name, its secret code and
// one line telling whoever opens the container what to do, inside a dashed
// cut line, black on white. Used by "Cache hidden!" (Hide a cache) and
// "Print slip" (My caches and Edit cache), so every slip looks the same.
//
// It's hidden on screen and is the only thing on the page when printing:
// the page around it puts print:hidden on everything else. No link or QR
// code until the site is deployed.
//
// cache: { title, secretCode }. Only the person who hid the cache ever has
// its code, so only their pages draw this.
function CacheSlip({ cache }) {
  return (
    <div className="hidden print:flex print:justify-center print:pt-8">
      <div className="flex w-[3.5in] flex-col items-center gap-2 border-2 border-dashed border-black p-6 text-center text-black">
        <p className="wrap-break-word font-display text-[16pt] font-bold leading-tight">{cache.title}</p>
        <p className="font-sans text-[9pt] font-bold uppercase tracking-[2px]">Secret code</p>
        <p className="font-mono text-[28pt] font-bold tracking-[6px]">{cache.secretCode}</p>
        <p className="font-sans text-[9pt] leading-snug">
          This is a HuskyCache geocache. Log your find on HuskyCache with this code, then put the cache back where you
          found it.
        </p>
      </div>
    </div>
  )
}

export default CacheSlip
