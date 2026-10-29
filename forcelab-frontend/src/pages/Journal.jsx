import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import { getExperiments } from '../services/experiments'
import { toLabel } from '../utils/gameVariables'
import { GAMES, gameTitle } from '../data/games'

const filterTabs = [{ id: 'all', title: 'All Experiments' }, ...GAMES]

export default function Journal() {
  const navigate = useNavigate()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    getExperiments()
      .then((list) => {
        setItems(list || [])
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter((item) => item.gameId === activeTab)

  return (
    <PageShell>
      <Header streak={12} points={8940} />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">Experiment Journal</span>
      </p>

      <div className="flex gap-4 mt-6 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-rajdhani text-lg whitespace-nowrap rounded-xl border px-6 py-2 transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white/15 border-white text-white'
                : 'border-white/30 text-gray-300 hover:bg-white/10'
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <h2 className="font-rajdhani font-bold text-3xl text-white mt-10">Saved Experiments</h2>

      {!loading && filteredItems.length === 0 && (
        <p className="font-jetbrains text-sm text-gray-400 mt-6">
          No experiments yet. Run one in Experiment Mode and press Save.
        </p>
      )}

      <div className="flex gap-6 overflow-x-auto pb-4 mt-6">
        {filteredItems.map((item) => {
          const stats = Object.entries(item.result || {})
          
          return (
            <div
              key={item.id}
              className="w-[250px] shrink-0 border border-white/20 bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 flex flex-col items-center"
            >
              <h3 className="font-rajdhani font-semibold text-xl text-white text-center truncate w-full">
                {item.name}
              </h3>
              
              <span className="mt-3 font-jetbrains text-xs text-white border border-white/30 rounded-md px-4 py-1">
                {gameTitle(item.gameId)}
              </span>
              
              <div className="mt-4 w-full px-3 font-rajdhani text-white space-y-0.5">
                <div className="flex justify-between">
                  <span>Score</span>
                  <span>{item.score}</span>
                </div>
                {stats.map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{toLabel(key)}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => navigate(`/journal/${item.id}`)}
                className="mt-4 w-full font-jetbrains text-xs text-white border border-white/30 rounded-md py-2 hover:bg-white/10 transition cursor-pointer"
              >
                View Experiment
              </button>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
