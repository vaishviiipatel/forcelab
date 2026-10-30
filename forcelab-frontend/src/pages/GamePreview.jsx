import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import { getGame } from '../data/games'

function GamePreview() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = getGame(gameId)
  const [slide, setSlide] = useState(0)

  if (!game) {
    return (
      <PageShell>
        <Header streak={12} points={8940} />
        <p className="font-jetbrains text-gray-400 mt-10">Game not found.</p>
      </PageShell>
    )
  }

  const slides = game.previews || [game.image]
  const next = () => setSlide((s) => (s + 1) % slides.length)
  const prev = () => setSlide((s) => (s - 1 + slides.length) % slides.length)

  return (
    <PageShell>
      <Header streak={12} points={8940} />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Games</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">{game.title}</span>
      </p>

      <h2 className="font-rajdhani font-bold text-3xl text-white text-center mt-8">
        {game.tagline}
      </h2>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 border border-white/30 bg-white/[0.04] backdrop-blur-md rounded-3xl p-6">
        {/* Left: preview image + Play */}
        <div className="flex flex-col items-center">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/20">
            <img src={slides[slide]} alt={game.title} className="w-full h-full object-cover" />
            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-3xl cursor-pointer"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-3xl cursor-pointer"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => navigate(`/play/${game.id}`)}
            className="mt-5 w-full max-w-[260px] font-rajdhani font-bold text-xl text-white bg-white/15 border border-white/40 rounded-xl py-3 hover:bg-white/25 transition cursor-pointer"
          >
            Play
          </button>
        </div>

        {/* Right: info on top, important buttons at the bottom */}
        <div className="flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="border border-white/20 rounded-2xl p-4">
              <h3 className="font-rajdhani font-semibold text-lg text-white text-center">
                Physics Concepts
              </h3>
              <ul className="mt-3 space-y-2">
                {game.concepts.map((c) => (
                  <li
                    key={c}
                    className="font-rajdhani text-white text-center border border-white/20 rounded-lg py-1"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/20 rounded-2xl p-3">
              <h3 className="font-rajdhani font-semibold text-base text-white text-center">
                Controls
              </h3>
              <ul className="mt-2 space-y-1.5">
                {game.controls.map((c) => (
                  <li
                    key={c}
                    className="font-rajdhani text-sm text-gray-200 text-center border border-white/15 rounded-lg py-1"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/experiment/${game.id}`)}
              className="w-full font-rajdhani font-bold text-xl text-white rounded-xl py-3 border border-[#5adfff]/70 bg-[#5adfff]/15 shadow-[0_0_24px_rgba(90,223,255,0.25)] hover:bg-[#5adfff]/25 transition cursor-pointer"
            >
              Experiment Mode
            </button>
            <button
              onClick={() => navigate('/journal')}
              className="w-full font-rajdhani font-bold text-xl text-white rounded-xl py-3 border border-white/60 bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              Journal
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <h3 className="font-rajdhani font-bold text-3xl text-white text-center mt-12">About</h3>
      <p className="font-jetbrains text-sm text-gray-300 text-center max-w-2xl mx-auto mt-3 leading-relaxed">
        {game.about}
      </p>

      {/* Did you know */}
      <div className="mt-12 max-w-3xl mx-auto border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
        <h3 className="font-rajdhani font-bold text-2xl text-white tracking-wide">Did You Know?</h3>
        <p className="font-jetbrains text-sm text-gray-400 mt-3 max-w-2xl mx-auto leading-relaxed">
          {game.didYouKnow}
        </p>
      </div>
    </PageShell>
  )
}

export default GamePreview