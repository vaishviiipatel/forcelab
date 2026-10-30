import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import VectorShotCanvas from '../games/vector-shot/VectorShotCanvas'
import SkyStackCanvas from '../games/sky-stack/SkyStackCanvas'
import MagnetrixCanvas from '../games/magnetrix/MagnetrixCanvas'
import CascadeCanvas from '../games/cascade/CascadeCanvas'
import ImpulseCanvas from '../games/impulse/ImpulseCanvas'
import PrecisionGolfCanvas from '../games/precision-golf/PrecisionGolfCanvas'
import { gameTitle } from '../data/games'

const gameComponents = {
  'vector-shot': VectorShotCanvas,
  'sky-stack': SkyStackCanvas,
  magnetrix: MagnetrixCanvas,
  cascade: CascadeCanvas,
  impulse: ImpulseCanvas,
  'precision-golf': PrecisionGolfCanvas,
}

function GameScreen({ mode = 'play' }) {
  const isExperiment = mode === 'experiment'
  const { gameId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const replay = location.state || {}
  const GameComponent = gameId ? gameComponents[gameId] : null

  return (
    <PageShell>
      <Header streak={12} points={8940} />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <button onClick={() => navigate('/games')} className="hover:text-white transition cursor-pointer">Games</button>
        <span className="mx-2 text-gray-600">›</span>
        <button onClick={() => navigate(`/game/${gameId || ''}`)} className="hover:text-white transition cursor-pointer">
          {gameTitle(gameId)}
        </button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">{isExperiment ? 'Experiment' : 'Play'}</span>
      </p>

      <div className="mt-6 max-w-5xl mx-auto">
        {GameComponent ? (
          <GameComponent
            experiment={isExperiment}
            initialSettings={replay.settings || null}
            initialShot={replay.shot || null}
            autoRun={!!replay.autoRun}
          />
        ) : (
          <p className="font-jetbrains text-gray-400">Coming soon.</p>
        )}
      </div>
    </PageShell>
  )
}

export default GameScreen
