// Five little bars plus "Difficulty N". Used on the map and cache detail pages.
function DifficultyMeter({ difficulty }) {
  // Keep it between 1 and 5 even if the data is missing or out of range.
  const level = Math.min(5, Math.max(1, Number(difficulty) || 1))

  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-[14px] w-[7px] ${index < level ? 'bg-black' : 'bg-[#f5f5f5]'}`}
          />
        ))}
      </span>
      <span className="text-[13px] font-bold leading-[18px] text-black">Difficulty {level}</span>
    </span>
  )
}

export default DifficultyMeter
