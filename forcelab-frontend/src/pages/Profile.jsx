import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import { getStats, setName } from '../services/stats'
import { getExperiments } from '../services/experiments'
import flameIcon from '../assets/icons/flame.svg'
import crownIcon from '../assets/icons/crown.svg'

const SUBJECT_TOPICS = ['Projectile Motion', 'Gravity', 'Forces', 'Momentum']

const StatCard = ({ icon, label, value }) => (
  <div className="flex items-center justify-center gap-3 border border-white/25 bg-white/[0.06] rounded-xl px-4 py-3">
    {icon && <img src={icon} alt="" className="w-7 h-7" />}
    <div className="text-center">
      <p className="font-jetbrains text-xs text-gray-300">{label}</p>
      <p className="font-rajdhani font-bold text-xl text-white">{value}</p>
    </div>
  </div>
)

export default function Profile() {
  const navigate = useNavigate()
  
  const [userStats, setUserStats] = useState(() => getStats())
  const [totalExperiments, setTotalExperiments] = useState(0)

  useEffect(() => {
    getExperiments()
      .then((list) => {
        if (list) {
          setTotalExperiments(list.length)
        }
      })
      .catch((err) => {
        console.error(err)
      })
  }, [])

  const handleUpdateName = () => {
    const updatedName = window.prompt('Your name', userStats.name)
    if (!updatedName || !updatedName.trim()) return

    const sanitized = updatedName.trim().slice(0, 20)
    const saved = setName(sanitized)
    setUserStats(saved)
  }

  const milestones = [
    { icon: '🏆', label: 'First High Score', unlocked: userStats.bestScore > 0 },
    { icon: '🧪', label: 'First Experiment', unlocked: totalExperiments > 0 },
    { icon: '🔥', label: '7 Day Streak', unlocked: userStats.streak >= 7 },
    { icon: '🎯', label: 'Perfect Quiz', unlocked: userStats.perfectQuiz },
  ]

  const firstInitial = (userStats.name || 'E')[0].toUpperCase()

  return (
    <PageShell>
      <Header />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">Profile</span>
      </p>

      <div className="mt-6 border border-white/25 bg-white/[0.05] backdrop-blur-md rounded-2xl overflow-hidden">
        <div
          className="h-28"
          style={{
            backgroundColor: '#161f27',
            backgroundImage:
              'repeating-radial-gradient(circle at 50% 160%, transparent 0 22px, rgba(90,223,255,0.22) 23px 24px), repeating-linear-gradient(90deg, transparent 0 46px, rgba(90,223,255,0.14) 47px 48px)',
          }}
        />

        <div className="px-8 pb-10">
          <div className="flex items-end gap-4 -mt-12">
            <div className="w-24 h-24 shrink-0 rounded-full bg-white border-4 border-[#212d39] flex items-center justify-center font-rajdhani font-bold text-4xl text-[#212d39]">
              {firstInitial}
            </div>
            <div className="pb-1">
              <h2 className="font-rajdhani font-bold text-3xl text-white">{userStats.name}</h2>
              <p className="font-jetbrains text-sm text-gray-300">
                Explorer
                <button onClick={handleUpdateName} className="ml-3 text-xs text-[#5adfff] hover:underline cursor-pointer">
                  Edit name
                </button>
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-10">
            <div>
              <h3 className="font-jetbrains text-sm text-gray-300">Stats</h3>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <StatCard icon={crownIcon} label="Best Score" value={userStats.bestScore.toLocaleString()} />
                <StatCard icon={flameIcon} label="Streak" value={`${userStats.streak} ${userStats.streak === 1 ? 'day' : 'days'}`} />
                <StatCard label="Games Played" value={userStats.gamesPlayed} />
                <StatCard label="Experiments" value={totalExperiments} />
              </div>

              <h3 className="font-jetbrains text-sm text-gray-300 mt-8">Achievements</h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {milestones.map((item) => (
                  <div
                    key={item.label}
                    title={item.unlocked ? 'Unlocked' : 'Locked'}
                    className={`border border-white/25 bg-white/[0.06] rounded-xl py-3 text-center ${
                      item.unlocked ? '' : 'opacity-40 grayscale'
                    }`}
                  >
                    <div className="text-3xl">{item.icon}</div>
                    <p className="font-jetbrains text-[11px] text-white mt-1 px-1 leading-tight">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-jetbrains text-sm text-gray-300">Progress</h3>
              <div className="mt-3 space-y-5">
                {SUBJECT_TOPICS.map((topic) => {
                  const scoreInfo = userStats.quiz?.[topic]
                  const percentage = scoreInfo && scoreInfo.total 
                    ? Math.round((scoreInfo.correct / scoreInfo.total) * 100) 
                    : 0

                  return (
                    <div key={topic}>
                      <div className="flex justify-between font-jetbrains text-white">
                        <span>{topic}</span>
                        <span className="text-xs text-gray-300">
                          {scoreInfo ? `${percentage}%` : 'Not tried'}
                        </span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-[#bdbdbd] overflow-hidden">
                        <div className="h-full bg-[#212d39]" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate('/quiz')}
                className="mt-6 w-full font-rajdhani font-bold text-lg text-white border border-[#5adfff]/70 bg-[#5adfff]/15 rounded-xl py-2 hover:bg-[#5adfff]/25 transition cursor-pointer"
              >
                Take a Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
