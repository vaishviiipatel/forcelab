function ExperimentPanel({
  knobs,
  activeValues,
  onUpdate,
  onResetFields,
  onExecute,
  infoText = 'Launch a shot first. Run then replays it with your current settings.',
}) {
  return (
    <div className="w-[190px] shrink-0 flex flex-col gap-3">
      {knobs.map((knob) => (
        <div key={knob.key} className="border border-white/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-rajdhani font-semibold text-white text-sm">
              {knob.label}
            </span>
            <span className="font-jetbrains text-xs text-white border border-white/40 rounded-md px-2 py-0.5 min-w-[3.5rem] text-center">
              {activeValues[knob.key]}
            </span>
          </div>
          <input
            type="range"
            min={knob.min}
            max={knob.max}
            step={knob.step}
            value={activeValues[knob.key]}
            onChange={(evt) => onUpdate(knob.key, +evt.target.value)}
            className="w-full accent-[#5adfff] cursor-pointer"
          />
        </div>
      ))}

      <button
        onClick={onResetFields}
        className="font-rajdhani font-semibold text-gray-300 border border-white/30 rounded-lg py-2 hover:bg-white/10 transition cursor-pointer"
      >
        Reset
      </button>
      <button
        onClick={onExecute}
        className="font-rajdhani font-semibold text-white border border-white/50 bg-white/5 rounded-lg py-2 hover:bg-white/15 transition cursor-pointer"
      >
        Run
      </button>
      <p className="font-jetbrains text-[11px] text-gray-500 leading-snug">{infoText}</p>
    </div>
  )
}

export default ExperimentPanel
