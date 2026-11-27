import { useState } from 'react'
import { Link } from 'react-router'
import { MapPin, Plus, Search } from 'lucide-react'

const caches = [
  {
    name: 'Krentzman Quad',
    difficulty: 2,
    description:
      'Beginner spot location, simple cache, not directly in plain sight- but worth the search!',
    distance: '0.2 mi',
    image: '/assets/krentzman-quad.jpeg',
    alt: 'Krentzman Quadrangle on Northeastern campus',
  },
  {
    name: 'Library Quad',
    difficulty: 3,
    description:
      'A medium challenge for a new cache finder, search library quad for a prize!',
    distance: '0.4 mi',
    image: '/assets/snell-library.jpeg',
    alt: 'Students walking toward Snell Library',
  },
  {
    name: 'West Village Quad',
    difficulty: 4,
    description:
      'A quick stop from your location, nearby with a lot of space for hiding a difficult cache.',
    distance: '0.8 mi',
    image: '/assets/west-village-residence.jpeg',
    alt: 'West Village buildings and lawn',
  },
]

const stats = [
  { value: '10', label: 'nearby caches' },
  { value: '0', label: 'logged finds' },
  { value: '3', label: 'active spots' },
]

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Nearby search', to: '/map' },
      { label: 'Cache detail', to: '/map' },
      { label: 'My journal', to: '/journal' },
    ],
  },
  {
    title: 'Create',
    links: [
      { label: 'Create a cache', to: '/caches/new' },
      { label: 'Difficulty guide', to: '/caches/new' },
      { label: 'Hints', to: '/caches/new' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My finds', to: '/journal' },
      { label: 'My hides', to: '/my-caches' },
      { label: 'Settings', to: '/login' },
    ],
  },
]

function LandingPage() {
  const [difficulty, setDifficulty] = useState('all')
  const visibleCaches =
    difficulty === 'all'
      ? caches
      : caches.filter((cache) => cache.difficulty === Number(difficulty))

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="px-4 pb-6 pt-6 sm:px-8 lg:px-20">
        <nav className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5">
          <Link to="/" className="flex items-center gap-3 text-black no-underline">
            <span className="flex h-10 w-10 items-center justify-center bg-[#c8102e] text-xl font-extrabold text-white">
              N
            </span>
            <span>
              <span className="block text-2xl font-extrabold leading-none">HuskyCache</span>
              <span className="mt-1 block text-sm text-[#828282]">Geocaching in Boston</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/map"
              className="inline-flex min-h-11 items-center gap-2 border-2 border-black px-4 py-2 text-base font-bold text-black no-underline transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
            >
              <Search aria-hidden="true" size={18} />
              Search nearby
            </Link>
            <Link
              to="/caches/new"
              className="inline-flex min-h-11 items-center gap-2 bg-[#c8102e] px-4 py-2 text-base font-bold text-white no-underline transition-colors hover:bg-[#a80d26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Plus aria-hidden="true" size={18} />
              Create cache
            </Link>
          </div>
        </nav>
      </header>

      <section className="px-4 pb-14 sm:px-8 lg:px-20" aria-labelledby="welcome-heading">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:flex-row">
          <div className="flex w-full flex-col items-start gap-6 lg:w-[560px] lg:shrink-0">
            <p className="bg-[#c8102e] px-3 py-2 text-sm font-bold text-white">
              At Northeastern University
            </p>

            <h1
              id="welcome-heading"
              className="text-[clamp(2.75rem,5vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.02em]"
            >
              <span className="font-bold italic underline decoration-2 underline-offset-4">
                Cache in
              </span>{' '}
              <span className="font-normal">
                and stay connected to the NU community!
              </span>
            </h1>

            <p className="max-w-[560px] text-xl leading-[1.5] text-black/75">
              HuskyCache is a student led website that allows new Boston admits to
              explore the campus, find secret hidden treasures along the way, and
              leave their mark for other students to find.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/map"
                className="inline-flex min-h-[54px] items-center bg-black px-6 py-4 text-lg font-bold text-white no-underline transition-colors hover:bg-[#292929] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
              >
                Search nearby caches
              </Link>
              <Link
                to="/caches/new"
                className="inline-flex min-h-[54px] items-center border-2 border-black px-6 py-[14px] text-lg font-bold text-black no-underline transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
              >
                Create a cache
              </Link>
            </div>

            <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="border-2 border-black p-3 sm:p-4">
                  <p className="text-2xl font-extrabold sm:text-[28px]">{stat.value}</p>
                  <p className="mt-1 text-xs text-[#828282] sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="relative h-[260px] overflow-hidden sm:h-[360px] lg:h-[420px]">
              <img
                src="/assets/krentzman-quad.jpeg"
                alt="Krentzman Quadrangle and Northeastern University buildings"
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 flex items-center gap-2 bg-black px-3 py-2 text-sm font-bold text-white">
                <MapPin aria-hidden="true" size={16} />
                Krentzman Quad
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-2 border-black p-4">
                <h2 className="text-lg font-bold">What to expect</h2>
                <p className="mt-2 text-base leading-6 text-black/75">
                  Search by location, filter by difficulty, and open a cache page
                  with hints and recent logs.
                </p>
              </div>
              <div className="border-2 border-black p-4">
                <h2 className="text-lg font-bold">Create a cache</h2>
                <p className="mt-2 text-base leading-6 text-black/75">
                  Add a new hide with photos, difficulty, size, and a hint that
                  helps people find it without giving it away.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-2 border-black px-4 py-10 sm:px-8 lg:px-16 lg:py-12" aria-labelledby="nearby-heading">
        <div className="mx-auto flex max-w-[1312px] flex-col gap-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-[720px]">
              <h2 id="nearby-heading" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Nearby caches
              </h2>
              <p className="mt-2 text-lg leading-[1.5] text-black/75">
                From locations around Northeastern campus, to local off campus must
                hit spots, find caches and explore Boston along the way.
              </p>
            </div>
            <label className="inline-flex min-h-11 items-center border-2 border-black px-4 text-sm font-bold">
              <span className="sr-only">Filter caches by difficulty</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="min-h-10 cursor-pointer bg-white text-black outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8102e]"
              >
                <option value="all">Filter by difficulty</option>
                <option value="2">Difficulty 2</option>
                <option value="3">Difficulty 3</option>
                <option value="4">Difficulty 4</option>
              </select>
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCaches.map((cache) => (
              <article key={cache.name} className="border-2 border-black p-4">
                <img
                  src={cache.image}
                  alt={cache.alt}
                  className="h-[220px] w-full object-cover"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-extrabold">{cache.name}</h3>
                  <span className="shrink-0 border-2 border-black bg-[#c8102e] px-2.5 py-1 text-sm font-bold text-white">
                    {cache.difficulty}/5
                  </span>
                </div>
                <p className="mt-2 text-base leading-6 text-black/75">
                  {cache.description}
                </p>
                <p className="mt-2 text-sm text-[#828282]">
                  {cache.distance} <span aria-hidden="true">•</span> Recommended
                </p>
              </article>
            ))}
            {visibleCaches.length === 0 && (
              <p className="text-base text-black/75">
                No nearby caches match this difficulty yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 lg:px-20 lg:py-14" aria-labelledby="create-heading">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:flex-row">
          <div className="flex w-full flex-col items-start gap-6 lg:w-[560px] lg:shrink-0">
            <h2 id="create-heading" className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Build a new hide with clear details.
            </h2>
            <p className="text-lg leading-[1.5] text-black/75">
              Add a map pin, a photo, a general location, and a hint that helps
              people find the cache without spoiling the spot.
            </p>
            <div className="flex w-full justify-center">
              <Link
                to="/caches/new"
                className="inline-flex min-h-[54px] w-full max-w-[310px] items-center justify-center bg-black px-6 py-4 text-lg font-bold text-white no-underline transition-colors hover:bg-[#292929] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
              >
                Create a cache
              </Link>
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2">
              <div className="border-2 border-black p-4">
                <h3 className="text-lg font-bold">Difficulty</h3>
                <p className="mt-2 text-base leading-6 text-black/75">
                  Rate the hide from easy plain sight caches to solving riddles
                  and puzzles for location finds.
                </p>
              </div>
              <div className="border-2 border-black p-4">
                <h3 className="text-lg font-bold">Hints</h3>
                <p className="mt-2 text-base leading-6 text-black/75">
                  Add a short nudge that helps people close in without revealing
                  the exact spot.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 border-2 border-black p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-extrabold">Cache details</h3>
              <span className="bg-[#c8102e] px-3 py-2 text-sm font-bold text-white">Draft</span>
            </div>
            <div className="mt-4 space-y-4">
              <PreviewField label="Cache name" text="e.g. Krentzman Quadrangle" />
              <PreviewField label="Difficulty" text="e.g. 2 / 5" />
              <PreviewField label="Hint" text="e.g. In the greenery where the sign lies." />
              <div>
                <p className="mb-2 text-base font-bold">Description</p>
                <div className="min-h-[120px] border-2 border-black px-4 py-3 text-base leading-6 text-[#828282]">
                  Add notes about possible items the cache may contain, any
                  general location types, etc.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 lg:px-20 lg:py-14" aria-labelledby="journal-heading">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6">
          <div className="max-w-[854px] text-center">
            <h2 id="journal-heading" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              My Journal
            </h2>
            <p className="mt-2 text-lg leading-[1.5] text-black/75">
              Keep track of the caches you have found at Northeastern, rate them,
              view all the log of all the caches you have found, and any notes you
              want to leave about them!
            </p>
          </div>

          <Link
            to="/journal"
            className="w-full max-w-[479px] border-2 border-black p-4 text-black no-underline transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
          >
            <img
              src="/assets/cache-journal.png"
              alt="A geocache logbook open on a wooden table"
              className="h-[220px] w-full object-cover"
            />
            <h3 className="mt-3 text-2xl font-extrabold">View Cache History</h3>
            <p className="mt-2 text-base leading-6 text-black/75">
              View caches you have found, write any notes you had about the cache
              and its contents!
            </p>
            <p className="mt-2 text-sm text-[#828282]">Image made with Figma AI.</p>
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-black px-4 py-10 sm:px-8 lg:px-20">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <Link to="/" className="inline-flex items-center gap-3 text-black no-underline">
              <span className="flex h-10 w-10 items-center justify-center bg-[#c8102e] text-xl font-extrabold text-white">
                G
              </span>
              <span className="text-2xl font-extrabold">HuskyCache</span>
            </Link>
            <p className="mt-3 text-base leading-6 text-black/75">
              Made by Northeastern freshmen for Northeastern freshman.
            </p>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-3 md:max-w-[576px]">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="font-bold">{group.title}</h2>
                <ul className="mt-3 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-black/75 underline-offset-4 hover:text-[#c8102e] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8102e]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

function PreviewField({ label, text }) {
  return (
    <div>
      <p className="mb-2 text-base font-bold">{label}</p>
      <div className="flex min-h-[47px] items-center border-2 border-black px-3 py-2 text-base text-[#828282]">
        {text}
      </div>
    </div>
  )
}

export default LandingPage
