import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import GameCard from '../components/GameCard'
import { GAMES } from '../data/games'

function GameSelection() {
  const navigate = useNavigate()

  return (
    <PageShell>
      <Header streak={12} points={8940} />

      <p className="font-jetbrains text-sm text-gray-400 mt-10 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <button
          onClick={() => window.location.reload()}
          className="text-white font-semibold hover:text-gray-300 transition cursor-pointer"
        >
          Games
        </button>
      </p>

      <h2 className="font-rajdhani font-bold text-4xl sm:text-5xl text-white mt-6 tracking-wide leading-none">
        Welcome Back, Explorer
      </h2>
      <p className="font-jetbrains text-sm text-gray-400 mt-3 max-w-2xl leading-relaxed">
        Choose a game, challenge your best score, or experiment with physics to discover what changes.
      </p>

      <div className="flex gap-4 mt-8">
        <div className="animated-border rounded-full">
          <button className="font-rajdhani font-semibold text-white rounded-full px-6 py-3 bg-[#0b0f19] hover:bg-white/10 transition cursor-pointer">
            Continue Last Game
          </button>
        </div>
        <button
          onClick={() => navigate('/journal')}
          className="font-rajdhani font-semibold text-white border border-white/20 rounded-full px-6 py-3 hover:bg-white/10 transition cursor-pointer"
        >
          View Journal
        </button>
      </div>

      <h2 className="font-rajdhani font-bold text-3xl text-white mt-20 tracking-wide">
        Choose Your Challenge
      </h2>
      <p className="font-jetbrains text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
        Every game uses real physics. Play normally, or enter Experiment Mode to customize physics settings and explore different outcomes.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            title={game.title}
            image={game.image}
            onOpen={() => navigate(`/game/${game.id}`)}
          />
        ))}
      </div>

      <div className="mt-24 space-y-8">
        <div className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
          <h3 className="font-rajdhani font-bold text-2xl text-white tracking-wide">Did You Know?</h3>
          <p className="font-jetbrains text-sm text-gray-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            On the Moon, gravity is about one-sixth of Earth's. Try lowering gravity in Experiment Mode and see how it changes your gameplay.
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
          <h3 className="font-rajdhani font-bold text-2xl text-white tracking-wide">
            Curiosity Changes Everything.
          </h3>
          <p className="font-jetbrains text-sm text-gray-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            Experiment with gravity, friction, mass, and more to discover how physics transforms every game.
          </p>
          <div className="animated-border rounded-full mt-6">
            <button
              onClick={() => navigate('/journal')}
              className="font-rajdhani font-semibold text-white rounded-full px-6 py-3 bg-[#0b0f19] hover:bg-white/10 transition cursor-pointer"
            >
              Open Experiment Journal
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export default GameSelection