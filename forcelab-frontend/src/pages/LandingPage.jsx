import { useNavigate } from 'react-router-dom'
import OrbitField from '../components/OrbitField'

const FEATURES = [
  { 
    n: 1, 
    title: 'Physics Engine', 
    speed: 'spin-slow',
    desc: 'Experience realistic gravity, force, friction, and collisions powered by Matter.js.'
  },
  { 
    n: 2, 
    title: 'Puzzle Challenges', 
    speed: 'spin-slower',
    desc: 'Complete unique levels that require logic, timing, and physics.'
  },
  { 
    n: 3, 
    title: 'XP & Achievements', 
    speed: 'spin-slow',
    desc: 'Earn stars, unlock badges, and level up your progress.'
  },
  { 
    n: 4, 
    title: 'Learn While Playing', 
    speed: 'spin-slower',
    desc: 'Every completed level is followed by a quick concept check to reinforce learning.'
  },
]

const STEPS = [
  { n: 1, title: 'Pick a game', text: 'Choose from six physics games. Each one teaches a different idea, like gravity, friction or momentum.' },
  { n: 2, title: 'Play it', text: 'Aim, launch, stack or place. Build a score and a streak as the challenges get harder.' },
  { n: 3, title: 'Experiment', text: 'Open Experiment Mode, change gravity, mass or friction, and save what you find in your Journal.' },
]

function GravityWell({ index }) {
  const rings = Array.from({ length: 9 }, (_, i) => 12 + i * 11)
  const spokes = Array.from({ length: 28 }, (_, i) => (i * 360) / 28)
  const holes = [{ x: 150, y: 100 }, { x: 52, y: 100 }, { x: 100, y: 50 }, { x: 100, y: 150 }]
  const h = holes[index % 4]
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <g fill="none" stroke="rgba(90,170,220,0.30)" strokeWidth="0.8">
        {rings.map((r) => <circle key={r} cx="100" cy="100" r={r} />)}
        {spokes.map((a) => (
          <line key={a} x1="100" y1="100" x2="100" y2="4" transform={`rotate(${a} 100 100)`} />
        ))}
      </g>
      <g fill="none" stroke="rgba(90,223,255,0.45)" strokeWidth="0.8">
        {[14, 21, 30, 41].map((r) => <circle key={r} cx={h.x} cy={h.y} r={r} />)}
      </g>
      <circle cx={h.x} cy={h.y} r="9" fill="#020b16" stroke="rgba(90,223,255,0.7)" strokeWidth="1" />
    </svg>
  )
}

function Atom({ className = '' }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const orbits = [
    { angle: 0, dur: '26s', electron: '7s', dir: 'normal' },
    { angle: 60, dur: '34s', electron: '9s', dir: 'reverse' },
    { angle: 120, dur: '42s', electron: '11s', dir: 'normal' },
  ]
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {orbits.map((o) => (
        <g key={o.angle} className="atom-spin" style={{ animationDuration: o.dur, animationDirection: o.dir }}>
          <g transform={`rotate(${o.angle} 50 50)`}>
            <ellipse cx="50" cy="50" rx="44" ry="16" stroke="#5adfff" strokeWidth="2.2" opacity="0.9" />
            {!reduce && (
              <circle r="3.2" fill="#ffffff">
                <animateMotion dur={o.electron} repeatCount="indefinite" path="M94,50 A44,16 0 1,1 6,50 A44,16 0 1,1 94,50 Z" />
              </circle>
            )}
          </g>
        </g>
      ))}
      <circle cx="50" cy="50" r="6" fill="#5adfff" />
    </svg>
  )
}

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-[#020b16] text-white overflow-x-hidden">

      <header className="relative z-20 max-w-6xl mx-auto px-8 pt-8 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center justify-center font-rajdhani font-bold text-2xl text-white cursor-pointer select-none" 
          aria-label="ForceLab home"
        >
          <span>F</span>
          <span className="flex items-center justify-center w-7 h-7 mx-1 relative top-[1px] shrink-0">
            <Atom className="w-full h-full drop-shadow-[0_0_8px_rgba(90,223,255,0.6)]" />
          </span>
          <span className="tracking-[0.2em] -ml-0.5">RCELAB</span>
        </button>
        
        <div className="flex gap-4">
          <button onClick={() => navigate('/games')} className="font-jetbrains font-bold text-xs text-white border border-white/70 rounded-lg px-5 py-2 hover:bg-white/10 transition cursor-pointer">
            Login
          </button>
          <button onClick={() => navigate('/games')} className="font-jetbrains font-bold text-xs text-[#0b0f19] bg-[#d9d9d9] rounded-lg px-5 py-2 hover:bg-white transition cursor-pointer">
            Sign up
          </button>
        </div>
      </header>

      <section className="relative -mt-16 h-[640px] flex items-center justify-center" style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 48%, rgba(170,178,188,0.20) 0%, rgba(60,75,92,0.10) 38%, rgba(2,11,22,0) 72%)' }}>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
          <OrbitField />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-2xl mt-12">
          <h1 className="font-rajdhani font-semibold text-4xl sm:text-5xl text-white tracking-wide">Master Physics Through Play.</h1>
          <p className="font-jetbrains text-xs sm:text-sm text-gray-300 mt-6 leading-relaxed max-w-xl mx-auto">
            Solve interactive physics puzzles using force, gravity, momentum, and motion. Every challenge tests your thinking, and every solution teaches a real concept.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            <button onClick={() => navigate('/games')} className="font-jetbrains font-bold text-xs text-white bg-white/10 border border-white/30 rounded-xl px-10 py-3.5 backdrop-blur-md hover:bg-white/20 transition cursor-pointer">Play Now</button>
            <button onClick={() => navigate('/games')} className="font-jetbrains font-bold text-xs text-white border border-white/40 rounded-xl px-10 py-3.5 backdrop-blur-md hover:bg-white/10 transition cursor-pointer">Explore Games</button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 mt-4">
        <h2 className="font-rajdhani font-semibold text-3xl tracking-wide">
          Features
        </h2>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.n}
              className="group h-[380px] w-full cursor-pointer [perspective:1000px]"
            >
              <div className="relative h-full w-full rounded-2xl [transform-style:preserve-3d] transition-transform duration-700 ease-in-out group-hover:[transform:rotateY(180deg)]">


                <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/20 bg-[#04101d] [backface-visibility:hidden]">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                    <div className={`w-[170%] aspect-square shrink-0 ${f.speed}`}>
                      <GravityWell index={i} />
                    </div>
                  </div>

                  <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-6 text-center select-none">
                    <span className="font-rajdhani text-7xl font-bold text-white/90">
                      {f.n}
                    </span>

                    <span className="mt-4 font-rajdhani text-xl font-semibold tracking-wide text-white">
                      {f.title}
                    </span>

                    <span className="mt-5 font-jetbrains text-xs text-gray-400">
                      HOVER TO EXPLORE ↻
                    </span>
                  </div>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#5adfff]/50 bg-[#121f2d] p-6 text-center shadow-[0_0_30px_rgba(90,223,255,0.15)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="mb-4 font-rajdhani text-2xl font-bold text-[#5adfff]">
                    {f.title}
                  </span>

                  <p className="font-jetbrains text-sm leading-relaxed text-gray-200">
                    {f.desc}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 mt-28">
        <h2 className="font-rajdhani font-semibold text-3xl tracking-wide">How to Play</h2>
        <div className="mt-10 bg-[#212d39]/40 border border-white/5 rounded-2xl px-8 py-14 grid grid-cols-1 md:grid-cols-3 gap-12 items-center backdrop-blur-sm">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center group">
              <div className="mx-auto w-14 h-14 rounded-full border-2 border-[#5adfff]/70 bg-[#020b16] flex items-center justify-center font-rajdhani font-bold text-2xl text-[#5adfff] shadow-[0_0_15px_rgba(90,223,255,0.2)] group-hover:scale-105 transition-transform">
                {s.n}
              </div>
              <h3 className="font-rajdhani font-semibold text-2xl mt-5 tracking-wide text-white">{s.title}</h3>
              <p className="font-jetbrains text-xs text-gray-400 mt-4 leading-relaxed px-2">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* why */}
      <section className="max-w-6xl mx-auto px-8 mt-24">
        <h2 className="font-rajdhani font-semibold text-3xl">Why ForceLab?</h2>
        <h3 className="font-rajdhani text-xl text-gray-200 mt-4">Built for Curious Minds</h3>
        <p className="font-rajdhani text-xl text-gray-300 mt-4 max-w-xl leading-snug">
          ForceLab transforms physics concepts into interactive puzzles, helping players learn through experimentation instead of memorization.
        </p>
      </section>


      <section className="relative mt-24 py-24 text-center" style={{ background: 'radial-gradient(ellipse 40% 60% at 50% 55%, rgba(150,158,168,0.15) 0%, rgba(2,11,22,0) 70%)' }}>
        <h2 className="font-rajdhani font-semibold text-3xl sm:text-4xl">Ready for Your First Mission?</h2>
        <p className="font-rajdhani text-xl text-gray-200 mt-8 max-w-sm mx-auto leading-snug">
          Enter the lab, solve physics puzzles, and discover how science works through play.
        </p>
        <button onClick={() => navigate('/games')} className="mt-10 font-jetbrains font-bold text-sm text-[#0b0f19] bg-white/80 border border-white/40 rounded-2xl px-14 py-5 hover:bg-white transition cursor-pointer">
          Start Learning
        </button>
      </section>


      <footer className="max-w-6xl mx-auto px-8 pt-6 pb-12">
        <p className="font-rajdhani text-xl">ForceLab</p>
        <p className="font-rajdhani text-xl mt-6">Play. Experiment. Learn.</p>

        <div className="mt-16 flex items-center justify-center font-rajdhani font-bold leading-none select-none" style={{ fontSize: 'clamp(56px, 14vw, 190px)', color: 'transparent', WebkitTextStroke: '3px rgba(70,120,150,0.35)' }} aria-label="ForceLab">
          <span>F</span>
          <span style={{ width: '1.05em', height: '1.05em', margin: '0 0.03em' }} className="inline-block relative">
            <Atom className="w-full h-full drop-shadow-[0_0_14px_rgba(90,223,255,0.4)]" />
          </span>
          <span>RCELAB</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage;
