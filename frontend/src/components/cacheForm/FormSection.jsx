import { useId } from 'react'

// A part of the cache form ("Where is it?", "What is it?"...), labelled by
// its heading.
function FormSection({ title, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-heading text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default FormSection
