const STORAGE_KEY = 'forcelab-stats'

const DEFAULT_STATS = {
  name: 'Player',
  bestScore: 0,
  gamesPlayed: 0,
  streak: 0,
  lastActive: null,
  perfectQuiz: false,
  quiz: {}
}

const getFormattedDate = (date = new Date()) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function getStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS }
  } catch (err) {
    console.warn('LocalStorage read blocked or unavailable:', err)
    return { ...DEFAULT_STATS }
  }
}

const persist = (statsData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statsData))
  } catch (err) {
    console.error('Failed to save to localStorage:', err)
  }
  return statsData
}

function updateActivityStreak(stats) {
  const today = getFormattedDate()
  if (stats.lastActive === today) return

  const yesterday = getFormattedDate(new Date(Date.now() - 86400000))
  
  if (stats.lastActive === yesterday) {
    stats.streak += 1
  } else {
    stats.streak = 1
  }
  
  stats.lastActive = today
}

export function recordScore(score) {
  const current = getStats()
  if (score > current.bestScore) {
    current.bestScore = score
    persist(current)
  }
}

export function recordGamePlayed() {
  const current = getStats()
  current.gamesPlayed += 1
  updateActivityStreak(current)
  persist(current)
}

export function recordQuiz(byTopic, perfect) {
  const current = getStats()
  
  for (const [topic, results] of Object.entries(byTopic)) {
    const previous = current.quiz[topic] || { correct: 0, total: 0 }
    
    current.quiz[topic] = {
      correct: previous.correct + results.correct,
      total: previous.total + results.total
    }
  }

  if (perfect) {
    current.perfectQuiz = true
  }

  updateActivityStreak(current)
  persist(current)
}

export function setName(newName) {
  const current = getStats()
  current.name = newName
  return persist(current)
}
