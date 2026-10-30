import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExperimentPanel from './ExperimentPanel'
import SaveExperimentModal from './SaveExperimentModal'
import { saveExperiment } from '../services/experiments'
import { recordScore, recordGamePlayed } from '../services/stats'

function GameShell({
  gameId,
  experiment,
  stats, // [{ label, value }] shown in the top bar
  score,
  roundKey,
  containerRef,
  onTryAgain,
  controls,
  settings,
  onSettingChange,
  onResetSettings,
  onRun,
  hint,
  canSave,
  getSaveData, // () => ({ settings, result })
  overlay,
  playHint,
}) {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const counted = useRef(false)
  const [best, setBest] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setBest((b) => Math.max(b, score))
    if (score > 0) {
      recordScore(score)
      if (!counted.current) {
        counted.current = true
        recordGamePlayed()
      }
    }
  }, [score])

  useEffect(() => {
    setJustSaved(false)
  }, [roundKey])

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === panelRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // returns null when saved, or an error message for the popup to show
  const handleSave = async (name, note) => {
    const data = getSaveData()
    const saved = await saveExperiment({
      gameId,
      name,
      note,
      settings: data.settings,
      result: data.result,
      score,
    })
    if (saved && saved.duplicate) return 'You already have an experiment with that name. Pick a different one.'
    if (!saved) return "Couldn't save. Is the server running?"
    setJustSaved(true)
    setSavedMsg('Saved!')
    setShowSave(false)
    setTimeout(() => setSavedMsg(''), 2500)
    return null
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      panelRef.current.requestFullscreen()
    }
  }

  return (
    <div
      ref={panelRef}
      className={`relative border border-white/30 bg-white/[0.03] backdrop-blur-md rounded-3xl p-6 w-full flex flex-col ${
        isFullscreen ? 'h-screen justify-center rounded-none border-0 bg-[#0b0f19]' : ''
      }`}
    >
      {experiment && (
        <h3 className="font-rajdhani font-semibold text-2xl text-white text-center mb-4">
          Experiment Mode
        </h3>
      )}

      <div className="flex gap-6 items-start justify-center">
        <div
          className="flex-1 min-w-0"
          style={isFullscreen ? { maxWidth: 'calc((100vh - 220px) * 1.8)' } : undefined}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 font-rajdhani font-semibold text-xl text-white">
            <button
              onClick={onTryAgain}
              className="border border-white/30 rounded-full px-5 py-1 hover:bg-white/10 transition cursor-pointer"
            >
              Try Again
            </button>
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-lg">
              {stats.map((s) => (
                <span key={s.label} className="text-[#5adfff]">
                  {s.label}: {s.value}
                </span>
              ))}
              <span className="text-gray-400">Best: {best}</span>
              <span className="text-xl">Score: {score}</span>
            </div>
          </div>

          <div className="relative">
            <div ref={containerRef} className="rounded-xl overflow-hidden" />
            {overlay}
          </div>
        </div>

        {experiment && (
          <ExperimentPanel
            controls={controls}
            values={settings}
            onChange={onSettingChange}
            onReset={onResetSettings}
            onRun={onRun}
            hint={hint}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        {experiment ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSave(true)}
              disabled={!canSave}
              title={canSave ? '' : 'Finish a run first'}
              className="font-rajdhani font-semibold text-lg text-white border border-white/40 rounded-xl px-6 py-2 hover:bg-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Save Experiment
            </button>
            {savedMsg && (
              <span className="font-jetbrains text-sm text-[#5adfff]">{savedMsg}</span>
            )}
            {justSaved && (
              <button
                onClick={() => navigate('/journal')}
                className="font-rajdhani font-semibold text-lg text-[#5adfff] border border-[#5adfff]/60 rounded-xl px-5 py-2 hover:bg-[#5adfff]/10 transition cursor-pointer"
              >
                View in Journal
              </button>
            )}
          </div>
        ) : (
          <p className="font-jetbrains text-sm text-gray-400">{playHint}</p>
        )}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="text-white hover:text-[#5adfff] transition cursor-pointer"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </svg>
        </button>
      </div>

      {showSave && (
        <SaveExperimentModal onSave={handleSave} onCancel={() => setShowSave(false)} />
      )}
    </div>
  )
}

export default GameShell