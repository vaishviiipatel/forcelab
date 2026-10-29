export const QUESTIONS = [
  { topic: 'Projectile Motion', question: 'What happens to a projectile when gravity is reduced?', options: ['It falls faster', 'It stays in the air longer', 'It becomes heavier', 'It stops moving'], answer: 1 },
  { topic: 'Projectile Motion', question: 'Ignoring air resistance, which launch angle gives the longest range on level ground?', options: ['15°', '30°', '45°', '75°'], answer: 2 },
  { topic: 'Projectile Motion', question: 'What shape is the path of a projectile (ignoring air resistance)?', options: ['A straight line', 'A parabola', 'A circle', 'A zigzag'], answer: 1 },
  { topic: 'Gravity', question: 'On the Moon, gravity is about...', options: ["One-sixth of Earth's", "Twice Earth's", "The same as Earth's", 'Zero'], answer: 0 },
  { topic: 'Gravity', question: 'Ignoring air resistance, a heavy ball and a light ball are dropped together. Which lands first?', options: ['The heavy ball', 'The light ball', 'They land together', 'Neither'], answer: 2 },
  { topic: 'Gravity', question: 'What does gravity do to a ball moving upward?', options: ['Speeds it up', 'Slows it down', 'Has no effect', 'Makes it heavier'], answer: 1 },
  { topic: 'Forces', question: 'What does friction do to a sliding object?', options: ['Speeds it up', 'Resists its motion', 'Makes it heavier', 'Pulls it upward'], answer: 1 },
  { topic: 'Forces', question: "Newton's second law says acceleration equals...", options: ['Force × mass', 'Force ÷ mass', 'Mass ÷ force', 'Mass + force'], answer: 1 },
  { topic: 'Forces', question: 'Two magnets with the same poles facing each other will...', options: ['Attract', 'Repel', 'Do nothing', 'Fall'], answer: 1 },
  { topic: 'Momentum', question: 'Momentum equals...', options: ['Mass × velocity', 'Mass ÷ velocity', 'Force × distance', 'Mass + velocity'], answer: 0 },
  { topic: 'Momentum', question: 'Impulse equals...', options: ['Force × time', 'Force ÷ time', 'Mass × speed', 'Energy ÷ time'], answer: 0 },
  { topic: 'Momentum', question: 'In a collision with no outside forces, the total momentum...', options: ['Is lost', 'Stays the same', 'Doubles', 'Becomes zero'], answer: 1 },
]

export function pickQuestions(n = 5) {
  const copy = [...QUESTIONS]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy.slice(0, n)
}