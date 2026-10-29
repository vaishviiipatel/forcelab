import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExperimentPanel from './ExperimentPanel'
import SaveExperimentModal from './SaveExperimentModal'
import { saveExperiment } from '../services/experiments'
import { recordScore, recordGamePlayed } from '../services/stats'

function GameShell({
  gameId,
  experiment,
  metrics,
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
  getSaveData,
  overlay,
  playHint,
}) {
  const routerNav = useNavigate()
  const displayWindowRef = useRef(null)
  const isLogged = useRef(false)
  const [highScore, setHighScore] = useState(0)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showStoreDialog, setShowStoreDialog] = useState(false)
  const [toastAlert, setToastAlert] = useState('')
  const [isDataSaved, setIsDataSaved] = useState(false)

  useEffect(() => {
    setHighScore((prev) => Math.max(prev, score))
    if (score > 0) {
      recordScore(score)
      if (!isLogged.current) {
        isLogged.current = true
        recordGamePlayed()
      }
    }
  }, [score])

  useEffect(() => {
    setIsDataSaved(false)
  }, [roundKey])

  useEffect(() => {
    const handleScreenResize = () =>
      setIsMaximized(document.fullscreenElement === displayWindowRef.current)
    document.addEventListener('fullscreenchange', handleScreenResize)
    return () => document.removeEventListener('fullscreenchange', handleScreenResize)
  }, [])

  const commitExperimentData = async (title, logMessage) => {
    const backupData = getSaveData()
    const operationResult = await saveExperiment({
      gameId,
      name: title,
      note: logMessage,
      settings: backupData.settings,
      result: backupData.result,
      score,
    })
    
    if (operationResult && operationResult.duplicate) {
      return 'That name is already in use. Please select a unique identifier.'
    }
    if (!operationResult) {
      return 'Server unreachable. Double check your backend status.'
    }
    
    setIsDataSaved(true)
    setToastAlert('Saved successfully!')
    setShowStoreDialog(false)
    setTimeout(() => setToastAlert(''), 2500)
    return null
  }

  const handleWindowScaleToggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      displayWindowRef.current.requestFullscreen()
    }
  }

  return (
    <div
      ref={displayWindowRef}
      className={`relative border border-white/30 bg-white/[0.03] backdrop-blur-md rounded-3xl p-6 w-full flex flex-col ${
        isMaximized ? 'h-screen justify-center rounded-none border-0 bg-[#0b0f19]' : ''
      }`}
    >
      {experiment && (
        <h3 className="font-rajdhani font-semibold text-2xl text-white text-center mb-4">
          Lab Mode
        </h3>
      )}

      <div className="flex gap-6 items-start justify-center">
        <div
          className="flex-1 min-w-0"
          style={isMaximized ? { maxWidth: 'calc((100vh - 220px) * 1.8)' } : undefined}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 font-rajdhani font-semibold text-xl text-white">
            <button
              onClick={onTryAgain}
              className="border border-white/30 rounded-full px-5 py-1 hover:bg-white/10 transition cursor-pointer"
            >
              Try Again
            </button>
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-lg">
              {metrics.map((metric) => (
                <span key={metric.label} className="text-[#5adfff]">
                  {metric.label}: {metric.value}
                </span>
              ))}
              <span className="text-gray-400">Best: {highScore}</span>
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
            knobs={controls}
            activeValues={settings}
            onUpdate={onSettingChange}
            onResetFields={onResetSettings}
            onExecute={onRun}
            infoText={hint}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        {experiment ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowStoreDialog(true)}
              disabled={!canSave}
              title={canSave ? '' : 'Finish a run first'}
              className="font-rajdhani font-semibold text-lg text-white border border-white/40 rounded-xl px-6 py-2 hover:bg-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Save Experiment
            </button>
            {toastAlert && (
              <span className="font-jetbrains text-sm text-[#5adfff]">{toastAlert}</span>
            )}
            {isDataSaved && (
              <button
                onClick={() => routerNav('/journal')}
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
          onClick={handleWindowScaleToggle}
          title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}
          className="text-white hover:text-[#5adfff] transition cursor-pointer"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isMaximized ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </svg>
        </button>
      </div>

      {showStoreDialog && (
        <SaveExperimentModal onSave={commitExperimentData} onCancel={() => setShowStoreDialog(false)} />
      )}
    </div>
  )
}

export default GameShell
