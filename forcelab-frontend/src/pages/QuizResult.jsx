import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'

function QuizResult() {
  const navigate = useNavigate()
  const state = useLocation().state

  // a refresh loses the result, so send the user back to the quiz
  if (!state) return <Navigate to="/quiz" replace />

  const { score, total, byTopic } = state
  const strongest = Object.entries(byTopic).sort(
    (a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total
  )[0]

  const lines =
    score === total
      ? ['Perfect score, Explorer.', 'You really understand the physics.']
      : score >= 3
      ? ['Great work, Explorer.', `You have a good understanding of ${strongest[0].toLowerCase()}.`]
      : ['Keep exploring, Explorer.', 'Play and experiment more, then try again.']

  return (
    <PageShell>
      <Header /> {/* Fixed: Closed the Header tag */}

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        {/* Fixed: Moved navigate into onClick */}
        <button onClick={() => navigate('/games')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <button onClick={() => navigate('/quiz')} className="hover:text-white transition cursor-pointer">Quiz</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">Results</span>
      </p>

      <div className="mt-16 text-center">
        <h2 className="font-rajdhani font-bold text-3xl text-white">Quiz Complete!</h2>
        <p className="font-rajdhani text-3xl text-white mt-10">You scored</p>
        <p className="font-rajdhani font-bold text-3xl text-white mt-6">{score}/{total}!</p>
        <p className="font-rajdhani text-xl text-gray-200 mt-6">{lines[0]}</p>
        <p className="font-rajdhani text-xl text-gray-200">{lines[1]}</p>

        <div className="mt-10 flex justify-center gap-10">
          <button
            onClick={() => navigate('/quiz')}
            className="font-rajdhani font-bold text-white text-base bg-[#d9d9d9] !text-black rounded-md px-10 py-2 hover:bg-white transition cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/games')} 
            className="font-rajdhani font-bold text-white text-base bg-[#212d39] border border-white/60 rounded-md px-8 py-2 hover:bg-[#2d3b4a] transition cursor-pointer"
          >
            Back to Games
          </button>
        </div>
      </div>
    </PageShell>
  )
}

export default QuizResult
