import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AuthPage() {
  const routerNav = useNavigate()

  const [isLoginScreen, setIsLoginScreen] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  const [clearanceData, setClearanceData] = useState({
    username: '',
    email: '',
    password: '',
  })

  const handleFieldChange = (e) => {
    setClearanceData({
      ...clearanceData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setAlertMsg('')

    // Automatically hooks into Vercel settings or falls back to your active Render instance
    const backendUrl = import.meta.env.VITE_API_URL || 'https://forcelab-79sc.onrender.com/'
    const endpoint = isLoginScreen ? `${backendUrl}/api/login` : `${backendUrl}/api/signup`

    const formData = isLoginScreen 
      ? { email: clearanceData.email, password: clearanceData.password }
      : { username: clearanceData.username, email: clearanceData.email, password: clearanceData.password }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication process failed.')
      }

      if (isLoginScreen) {
        // Secure access keys in browser session store
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setAlertMsg('Access granted! Redirecting...')
        setTimeout(() => routerNav('/'), 1200)
      } else {
        setAlertMsg('Profile initialized successfully! Switching to access terminal...')
        setTimeout(() => {
          setIsLoginScreen(true)
          setAlertMsg('')
        }, 1800)
      }
    } catch (error) {
      setAlertMsg(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#020b16] text-white flex items-center justify-center p-6 overflow-hidden font-rajdhani">
      <div 
        className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #5adfff 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
        }}
      />

      <div className="relative w-full max-w-md bg-[#04101d] border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => routerNav('/')} 
          className="absolute top-4 left-6 text-xs font-jetbrains text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
        >
          ‹ Back to Lab
        </button>

        <h2 className="text-3xl font-bold text-center mt-4 tracking-wide text-white">
          {isLoginScreen ? 'ACCESS PLATFORM' : 'INITIALIZE PROFILE'}
        </h2>
        <p className="text-center text-xs font-jetbrains text-gray-400 mt-2">
          {isLoginScreen ? 'Enter active clearance parameters' : 'Register parameters to build account'}
        </p>

        {alertMsg && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-center text-sm text-red-400 font-jetbrains animate-pulse">
            {alertMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="mt-6 space-y-5">
          {!isLoginScreen && (
            <div>
              <label className="block text-xs font-jetbrains text-gray-400 mb-2 uppercase tracking-wider">Explorer Handle</label>
              <input 
                type="text" name="username" required value={clearanceData.username} onChange={handleFieldChange}
                className="w-full bg-[#020b16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5adfff]/50 font-jetbrains transition"
                placeholder="Explorer name"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-jetbrains text-gray-400 mb-2 uppercase tracking-wider">Email Route</label>
            <input 
              type="email" name="email" required value={clearanceData.email} onChange={handleFieldChange}
              className="w-full bg-[#020b16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5adfff]/50 font-jetbrains transition"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs font-jetbrains text-gray-400 mb-2 uppercase tracking-wider">Clearance Code</label>
            <input 
              type="password" name="password" required value={clearanceData.password} onChange={handleFieldChange}
              className="w-full bg-[#020b16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5adfff]/50 font-jetbrains transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full font-jetbrains font-bold text-sm bg-[#d9d9d9] hover:bg-white text-[#0b0f19] rounded-xl py-3.5 flex items-center justify-center gap-2 tracking-wide disabled:bg-gray-600 transition shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            {isSubmitting ? 'PROCESSING...' : isLoginScreen ? 'LOG IN' : 'REGISTER'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-jetbrains text-gray-400">
          {isLoginScreen ? "First time at the lab? " : "Already verified? "}
          <button 
            onClick={() => { setIsLoginScreen(!isLoginScreen); setAlertMsg(''); }}
            className="text-[#5adfff] hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
          >
            {isLoginScreen ? 'Create Profile' : 'Access Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
