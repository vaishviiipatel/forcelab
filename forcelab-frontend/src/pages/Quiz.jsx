import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Header from '../components/Header'
import { pickQuestions } from '../data/quizzes'
import { recordQuiz } from '../services/stats'

const Chevron = ({ dir }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
)

export default function Quiz() {
  const navigate = useNavigate()
  
  const [quizQuestions] = useState(() => pickQuestions(5))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState(() => Array(5).fill(null))

  const activeQuestion = quizQuestions[currentIdx]
  const isFinalQuestion = currentIdx === quizQuestions.length - 1
  const unansweredCount = selectedAnswers.filter((ans) => ans === null).length

  const handleSelectOption = (optionIndex) => {
    setSelectedAnswers((prev) => 
      prev.map((ans, idx) => (idx === currentIdx ? optionIndex : ans))
    )
  }

  const handleSubmitQuiz = () => {
    const topicBreakdown = {}
    let correctCount = 0

    quizQuestions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.answer
      if (isCorrect) correctCount++

      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { correct: 0, total: 0 }
      }
      
      topicBreakdown[q.topic].total++
      if (isCorrect) {
        topicBreakdown[q.topic].correct++
      }
    })

    const isPerfectScore = correctCount === quizQuestions.length
    recordQuiz(topicBreakdown, isPerfectScore)
    
    navigate('/quiz/result', { 
      state: { 
        score: correctCount, 
        total: quizQuestions.length, 
        byTopic: topicBreakdown 
      } 
    })
  }

  return (
    <PageShell>
      <Header />

      <p className="font-jetbrains text-sm text-gray-400 mt-8 tracking-wide">
        <button onClick={() => navigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
        <span className="mx-2 text-gray-600">›</span>
        <span className="text-white font-semibold">Quiz</span>
      </p>
      
      <p className="font-rajdhani text-lg text-gray-200 mt-4">See what you learned while playing.</p>

      <div className="text-center mt-10">
        <p className="font-rajdhani text-xl text-gray-200">Progress</p>
        <p className="font-jetbrains text-xs font-bold text-white mt-1">
          Question {currentIdx + 1} of {quizQuestions.length}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4 sm:gap-10">
        <button
          onClick={() => setCurrentIdx((prev) => prev - 1)}
          disabled={currentIdx === 0}
          aria-label="Previous question"
          className="text-white cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <Chevron dir="left" />
        </button>

        <div className="w-full max-w-xl border border-white/30 bg-white/[0.05] backdrop-blur-md rounded-3xl p-8">
          <h2 className="font-rajdhani text-2xl text-white">{activeQuestion.question}</h2>
          <div className="mt-6 space-y-2">
            {activeQuestion.options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => handleSelectOption(i)}
                className="w-full flex items-center justify-between text-left font-rajdhani text-xl text-white py-1 cursor-pointer"
              >
                <span>{'ABCD'[i]} {opt}</span>
                <span className="w-7 h-7 shrink-0 rounded-full border-2 border-white flex items-center justify-center">
                  {selectedAnswers[currentIdx] === i && <span className="w-3.5 h-3.5 rounded-full bg-[#5adfff]" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setCurrentIdx((prev) => prev + 1)}
          disabled={isFinalQuestion}
          aria-label="Next question"
          className="text-white cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <Chevron dir="right" />
        </button>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        {quizQuestions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIdx(idx)}
            aria-label={`Go to question ${idx + 1}`}
            className={`w-3 h-3 rounded-full border border-white cursor-pointer ${
              idx === currentIdx 
                ? 'bg-white' 
                : selectedAnswers[idx] !== null 
                  ? 'bg-white/50' 
                  : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {isFinalQuestion && (
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmitQuiz}
            disabled={unansweredCount > 0}
            className="font-rajdhani font-bold text-lg text-white bg-[#212d39] border border-white/60 rounded-xl px-8 py-2 hover:bg-[#2d3b4a] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finish
          </button>
          
          {unansweredCount > 0 && (
            <p className="font-jetbrains text-xs text-gray-400 mt-2">
              {unansweredCount} question{unansweredCount === 1 ? '' : 's'} left to answer
            </p>
          )}
        </div>
      )}
    </PageShell>
  )
}
