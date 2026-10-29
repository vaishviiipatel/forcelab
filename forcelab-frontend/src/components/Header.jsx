import { useNavigate } from 'react-router-dom'
import flameIcon from '../assets/icons/flame.svg'
import crownIcon from '../assets/icons/crown.svg'
import profileIcon from '../assets/icons/profile.svg'
import { getStats } from '../services/stats'

function AtomLogoIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <g transform="rotate(0 50 50)"><ellipse cx="50" cy="50" rx="44" ry="15" stroke="#5adfff" strokeWidth="3" opacity="0.8" /></g>
      <g transform="rotate(60 50 50)"><ellipse cx="50" cy="50" rx="44" ry="15" stroke="#5adfff" strokeWidth="3" opacity="0.8" /></g>
      <g transform="rotate(120 50 50)"><ellipse cx="50" cy="50" rx="44" ry="15" stroke="#5adfff" strokeWidth="3" opacity="0.8" /></g>
      <circle cx="50" cy="50" r="7" fill="#5adfff" />
    </svg>
  )
}

function Header() {
  const routerNav = useNavigate()
  const { streak: dailyStreak, bestScore: topRecord } = getStats()

  return (
    <header className="flex items-center justify-between px-1 pt-6 pb-8 border-b border-white/5">
      <button 
        onClick={() => routerNav('/')} 
        className="flex items-center justify-center font-rajdhani font-bold text-2xl text-white cursor-pointer select-none" 
        aria-label="ForceLab home"
      >
        <span>F</span>
        <span className="flex items-center justify-center w-7 h-7 mx-1 relative top-[1px] shrink-0">
          <AtomLogoIcon className="w-full h-full drop-shadow-[0_0_8px_rgba(90,223,255,0.6)]" />
        </span>
        <span className="tracking-[0.2em] -ml-0.5">RCELAB</span>
      </button>

      <div className="flex items-center gap-4">
        <div title="Day streak" className="flex items-center gap-2 border border-white/20 bg-white/[0.02] rounded-full px-4 py-2">
          <img src={flameIcon} alt="streak" className="w-5 h-5" />
          <span className="font-rajdhani font-semibold text-white">{dailyStreak}</span>
        </div>

        <div title="Best score" className="flex items-center gap-2 border border-white/20 bg-white/[0.02] rounded-full px-4 py-2">
          <img src={crownIcon} alt="best score" className="w-5 h-5" />
          <span className="font-rajdhani font-semibold text-white">{topRecord.toLocaleString()}</span>
        </div>

        <button
          onClick={() => routerNav('/profile')}
          title="Profile"
          className="w-9 h-9 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
        >
          <img src={profileIcon} alt="profile" className="w-6 h-6" />
        </button>
      </div>
    </header>
  )
}

export default Header
