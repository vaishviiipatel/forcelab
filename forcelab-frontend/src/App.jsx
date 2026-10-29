import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import GameSelection from './pages/GameSelection'
import GamePreview from './pages/GamePreview'
import GameScreen from './pages/GameScreen'
import Journal from './pages/Journal'
import ExperimentDetails from './pages/ExperimentDetails'
import Quiz from './pages/Quiz'
import QuizResult from './pages/QuizResult'
import Profile from './pages/Profile'
import AuthPage from './pages/AuthPage'

// Hand-written route guard structure
const Gatekeeper = ({ children }) => {
  const activeSession = localStorage.getItem('sessionKey')
  
  if (!activeSession) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage initialViewMode={true} />} />
      <Route path="/signup" element={<AuthPage initialViewMode={false} />} />

      <Route path="/games" element={
        <Gatekeeper>
          <GameSelection />
        </Gatekeeper>
      } />
      
      <Route path="/game/:gameId" element={
        <Gatekeeper>
          <GamePreview />
        </Gatekeeper>
      } />
      
      <Route path="/play/:gameId" element={
        <Gatekeeper>
          <GameScreen mode="play" />
        </Gatekeeper>
      } />
      
      <Route path="/experiment/:gameId" element={
        <Gatekeeper>
          <GameScreen mode="experiment" />
        </Gatekeeper>
      } />
      
      <Route path="/journal" element={
        <Gatekeeper>
          <Journal />
        </Gatekeeper>
      } />
      
      <Route path="/journal/:id" element={
        <Gatekeeper>
          <ExperimentDetails />
        </Gatekeeper>
      } />
      
      <Route path="/quiz" element={
        <Gatekeeper>
          <Quiz />
        </Gatekeeper>
      } />
      
      <Route path="/quiz/result" element={
        <Gatekeeper>
          <QuizResult />
        </Gatekeeper>
      } />
      
      <Route path="/profile" element={
        <Gatekeeper>
          <Profile />
        </Gatekeeper>
      } />
    </Routes>
  )
}

export default App
