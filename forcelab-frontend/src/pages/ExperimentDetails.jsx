import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import { getExperiments } from '../services/experiments'
import { GAME_VARIABLES, toLabel } from '../utils/gameVariables'
import { gameTitle } from '../data/games'

function Row({ label, value }) {
  return (
    <div className="flex justify-between font-rajdhani text-lg text-white">
      <span>{label}</span>
      <span>{value ?? '-'}</span>
    </div>
  )
}

function ExperimentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exp, setExp] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'missing'

  useEffect(() => {
    getExperiments().then((list) => {
      const found = list.find((e) => String(e.id) === id)
      setExp(found || null)
      setStatus(found ? 'ready' : 'missing')
    })
  }, [id])

  const openGame = (autoRun) =>
    navigate(`/experiment/${exp.gameId}`, {
      state: { settings: exp.settings, shot: exp.result, autoRun },
    })

  return (
    <PageShell>
      <Header streak={12} points={8940} />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <button onClick={() => navigate('/journal')} className="hover:text-white transition cursor-pointer">Experiment Journal</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">{exp ? exp.name : '...'}</span>
      </p>

      {status === 'loading' && (
        <p className="font-jetbrains text-sm text-gray-400 mt-8">Loading...</p>
      )}
      {status === 'missing' && (
        <p className="font-jetbrains text-sm text-gray-400 mt-8">Experiment not found.</p>
      )}

      {status === 'ready' && (
        <>
          <span className="inline-block mt-6 font-jetbrains text-xs text-white border border-white/30 rounded-md px-4 py-1">
            {gameTitle(exp.gameId)}
          </span>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_320px] border border-white/30 bg-white/[0.04] backdrop-blur-md rounded-3xl overflow-hidden">
            {/* Left: summary + actions */}
            <div className="p-6 flex flex-col">
              <h2 className="font-rajdhani font-semibold text-2xl text-white text-center">
                {exp.name}
              </h2>
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 font-rajdhani text-white">
                <span className="text-4xl font-bold">{exp.score} pts</span>
                <span className="text-gray-300">
                  {Object.entries(exp.result).map(([k, v]) => `${toLabel(k)} ${v}`).join(' · ')}
                </span>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => openGame(true)}
                  className="font-rajdhani font-semibold text-lg text-white bg-[#212d39] border border-white/30 rounded-lg px-8 py-2 hover:bg-[#2d3b4a] transition cursor-pointer"
                >
                  Run Again
                </button>
                <button
                  onClick={() => openGame(false)}
                  className="font-rajdhani font-semibold text-lg text-white border border-white/30 rounded-lg px-8 py-2 hover:bg-white/10 transition cursor-pointer"
                >
                  Edit Experiment
                </button>
              </div>
            </div>

            {/* Right: settings + results */}
            <div className="p-6 border-t md:border-t-0 md:border-l border-white/20">
              <h3 className="font-rajdhani font-bold text-xl text-white mb-4">Physics Settings</h3>
              <div className="space-y-1">
                {(GAME_VARIABLES[exp.gameId] || []).map((v) => (
                  <Row key={v.key} label={v.label} value={exp.settings[v.key]} />
                ))}
              </div>

              <div className="mt-6 border border-white/20 rounded-2xl p-4">
                <h3 className="font-rajdhani font-bold text-xl text-white text-center mb-2">Results</h3>
                <div className="space-y-1">
                  <Row label="Score" value={exp.score} />
                  {Object.entries(exp.result).map(([key, value]) => (
                    <Row key={key} label={toLabel(key)} value={value} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-lg border border-white/20 bg-white/[0.04] rounded-2xl p-5 font-rajdhani text-white">
            <h3 className="text-xl">My Notes</h3>
            <p className="text-gray-300 mt-1">{exp.note || 'No notes for this experiment.'}</p>
          </div>
        </>
      )}
    </PageShell>
  )
}

export default ExperimentDetails