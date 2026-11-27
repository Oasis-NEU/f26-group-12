import { useState } from 'react'
import Button from '../components/Button.jsx'
import CacheCard from '../components/CacheCard.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import HintRow from '../components/HintRow.jsx'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import StarRating from '../components/StarRating.jsx'
import TextField from '../components/TextField.jsx'

// TEMPORARY: every component in every state, to compare with Figma.
// Only reachable at /dev/components while running `npm run dev` (see App.jsx).
// Delete this file and its route once the components are checked.
//
// Hover and Focus are live browser states, so they can't be shown frozen.
// Hover over the examples marked "hover me", or press Tab to reach the ones
// marked "Tab here". (Chrome/Firefox DevTools can also force :hover and
// :focus-visible on an element.)

function Section({ title, note, children }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-subtle pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-title">{title}</h2>
        {note && <p className="max-w-[70ch] text-small text-text-secondary">{note}</p>}
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">{children}</div>
    </section>
  )
}

// One example with its state name above it.
// wide = a 360px column (fields, cards); full = the whole row (nav bars).
function State({ name, wide = false, full = false, children }) {
  const width = full ? 'w-full' : wide ? 'w-full max-w-[360px]' : ''
  return (
    <div className={`flex flex-col gap-2 ${width}`}>
      <p className="text-small text-text-secondary">{name}</p>
      {children}
    </div>
  )
}

function DevComponentsPage() {
  const [rating, setRating] = useState(3)
  const [openHints, setOpenHints] = useState(1)
  const [selectedCard, setSelectedCard] = useState(null)
  const [selectedPin, setSelectedPin] = useState(false)
  const [name, setName] = useState('')

  const hints = ['Look up near the old library.', 'Something on a building tells the time.', 'Check the base of the clock tower.']

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 md:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-display">Components</h1>
          <p className="max-w-[70ch] text-body text-text-secondary">
            Every component in every state, for checking against the Figma file. Temporary: this page only
            exists in development.
          </p>
        </header>

        <Section title="Button" note="Primary and Secondary, each Default and Disabled. Hover and Tab to see the other states.">
          <State name="Primary · Default (hover me, Tab here)">
            <Button>Button</Button>
          </State>
          <State name="Primary · Disabled">
            <Button disabled>Button</Button>
          </State>
          <State name="Secondary · Default (hover me, Tab here)">
            <Button variant="secondary">Button</Button>
          </State>
          <State name="Secondary · Disabled">
            <Button variant="secondary" disabled>
              Button
            </Button>
          </State>
          <State name="As a link (to=)">
            <Button variant="secondary" to="/dev/components">
              Go somewhere
            </Button>
          </State>
          <State name="Full width" wide>
            <Button fullWidth>Create cache</Button>
          </State>
          <State name="Small (40px, the header's Log in)">
            <Button variant="secondary" size="small">
              Log in
            </Button>
          </State>
        </Section>

        <Section title="TextField" note="Click or Tab into a field to see Focus.">
          <State name="Default" wide>
            <TextField label="Label" placeholder="Placeholder" help="Help text" />
          </State>
          <State name="Default, no help text" wide>
            <TextField label="Cache name" placeholder="e.g. Quad riddle" />
          </State>
          <State name="Error" wide>
            <TextField label="Label" placeholder="Placeholder" error="Help text" />
          </State>
          <State name="Typing (try it)" wide>
            <TextField
              label="Cache name"
              placeholder="e.g. Quad riddle"
              help={`${name.length} of 60 characters`}
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
            />
          </State>
        </Section>

        <Section title="DifficultyMeter">
          {[1, 2, 3, 4, 5].map((level) => (
            <State key={level} name={`Level ${level}`}>
              <DifficultyMeter level={level} />
            </State>
          ))}
          <State name="Level 3, label hidden">
            <DifficultyMeter level={3} showLabel={false} />
          </State>
        </Section>

        <Section title="StarRating" note="The last one is clickable: hover a star to preview, click to pick.">
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <State key={value} name={`Value ${value}`}>
              <StarRating value={value} />
            </State>
          ))}
          <State name={`Pick a rating (now ${rating}) · Tab here`}>
            <StarRating value={rating} onChange={setRating} label="Your rating" />
          </State>
        </Section>

        <Section title="HintRow" note="The last group unlocks in order: reveal hint 1, then 2, then 3.">
          <State name="Locked (hover me)" wide>
            <HintRow number={2} text={hints[1]} onReveal={() => {}} />
          </State>
          <State name="Locked, earlier hint still locked" wide>
            <HintRow number={3} text={hints[2]} canReveal={false} />
          </State>
          <State name="Revealed" wide>
            <HintRow number={1} text={hints[1]} revealed />
          </State>
          <State name="Try it (Tab here)" wide>
            <div className="flex w-full flex-col gap-2">
              {hints.map((hint, index) => (
                <HintRow
                  key={hint}
                  number={index + 1}
                  text={hint}
                  revealed={index < openHints}
                  canReveal={index === openHints}
                  onReveal={() => setOpenHints(index + 1)}
                />
              ))}
            </div>
          </State>
        </Section>

        <Section title="CacheCard" note="Cards with to= or onClick are hoverable. No photo shows the empty dashed box; no rating prop hides the rating. The last two are clickable: click one to select it.">
          <State name="Default (hover me)" wide>
            <CacheCard title="Quad riddle" location="Krentzman Quad" difficulty={4} to="/dev/components" />
          </State>
          <State name="Photo and rating" wide>
            <CacheCard
              title="Krentzman Corner"
              location="Krentzman Quad"
              difficulty={3}
              image="/assets/krentzman-quad.jpeg"
              rating={{ average: 4.6, count: 12 }}
              to="/dev/components"
            />
          </State>
          <State name="No ratings yet" wide>
            <CacheCard
              title="Common Ground"
              location="Centennial Common"
              difficulty={2}
              rating={{ average: null, count: 0 }}
              to="/dev/components"
            />
          </State>
          <State name="Selected" wide>
            <CacheCard title="Quad riddle" location="Krentzman Quad" difficulty={4} selected />
          </State>
          <State name="Found · Default (hover me)" wide>
            <CacheCard title="Quad riddle" location="Krentzman Quad" difficulty={4} found to="/dev/components" />
          </State>
          <State name="Found · Selected" wide>
            <CacheCard title="Quad riddle" location="Krentzman Quad" difficulty={4} found selected />
          </State>
          <State name="Long title" wide>
            <CacheCard
              title="The bench where three paths meet behind the library"
              location="Snell Library"
              difficulty={2}
              found
            />
          </State>
          {['Clock tower', 'Fenway fox'].map((title) => (
            <State key={title} name="Click to select (Tab here)" wide>
              <CacheCard
                title={title}
                location="Back Bay Fens"
                difficulty={title === 'Clock tower' ? 1 : 5}
                selected={selectedCard === title}
                onClick={() => setSelectedCard(title)}
              />
            </State>
          ))}
        </Section>

        <Section
          title="MapPin"
          note="Only clickable pins grow on hover; the first four are decorative and stay still. The last pin is a button: click it to toggle Selected."
        >
          <State name="Not found">
            <MapPin />
          </State>
          <State name="Not found · Selected">
            <MapPin selected />
          </State>
          <State name="Found">
            <MapPin found />
          </State>
          <State name="Found · Selected">
            <MapPin found selected />
          </State>
          <State name="Clickable (Tab here)">
            <MapPin
              found
              selected={selectedPin}
              label="Quad riddle"
              onClick={() => setSelectedPin((current) => !current)}
            />
          </State>
        </Section>

        <Section
          title="SiteHeader"
          note="The real header, as on every page. The current page is a soft pill (none matches here). Type in the search for suggestions. Make the window narrower than 1024px for the phone layout and its menu."
        >
          <State name="Responsive" full>
            <div className="w-full border border-dashed border-border-subtle">
              <SiteHeader />
            </div>
          </State>
        </Section>
      </div>
    </div>
  )
}

export default DevComponentsPage
