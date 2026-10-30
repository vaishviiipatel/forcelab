import { useEffect, useRef, useState } from 'react'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const FLOOR_TOP = 440
const T = 14 // domino thickness (px)
const H = 80 // domino height (px)
const TARGET_H = 110
const G_BASE = 1000 // px/s² when Gravity = 1.0 (100 px = 1 m, so about 10 m/s²)
const DT = 1 / 240 // physics step (seconds)
const PUSH = 1.0 // starting spin of the first domino (rad/s)
const FALLEN = 1.0 // rad: past this angle a domino counts as fallen
const HALF_PI = Math.PI / 2
const EXP_COUNT = 8
const EXP_FIRST_X = 110
const MAX_PLAY = 8
const MIN_X = 70
const MIN_GAP = 24

const DEFAULT_SETTINGS = { gravity: 1, mass: 1, friction: 0.6, spacing: 60 }

const CONTROLS = [
  { key: 'gravity', label: 'Gravity', min: 0.2, max: 2, step: 0.05 },
  { key: 'mass', label: 'Domino Mass', min: 0.2, max: 3, step: 0.1 },
  { key: 'friction', label: 'Friction', min: 0.05, max: 1, step: 0.05 },
  { key: 'spacing', label: 'Domino Spacing', min: 30, max: 100, step: 1 },
]

// moment of inertia of a domino about its front-bottom corner
const inertia = (d) => (d.m * (d.h * d.h + T * T)) / 3

// low friction = the base slides instead of tipping, so energy is wasted at the hit
const slipFactor = (mu) => 0.2 + 0.8 * Math.min(1, mu / 0.5)

// the largest angle domino `a` can lean to before its top corner meets domino `b`
function contactLimit(a, b) {
  const gap = b.x - a.x - T
  const f = ((gap + T) * Math.cos(b.theta) - T) / a.h
  if (f >= 1) return Infinity // too far apart to ever touch
  return b.theta + Math.asin(Math.max(-1, f))
}

function advance(dominoes, g, mu, dt) {
  // 1. every domino tips under gravity (an inverted pendulum about its front corner)
  for (const d of dominoes) {
    const alpha = (3 * g * (d.h * Math.sin(d.theta) - T * Math.cos(d.theta))) / (2 * (d.h * d.h + T * T))
    d.omega += alpha * dt
    d.theta += d.omega * dt
    if (d.theta <= 0) {
      d.theta = 0
      if (d.omega < 0) d.omega = 0
    }
    if (d.theta >= HALF_PI) {
      d.theta = HALF_PI
      d.omega = 0
    }
  }
  // 2. a domino cannot lean through the next one; when it hits, the pair share their spin
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < dominoes.length - 1; i++) {
      const a = dominoes[i]
      const b = dominoes[i + 1]
      const lim = contactLimit(a, b)
      if (a.theta <= lim) continue
      a.theta = Math.max(0, lim)
      if (b.theta >= HALF_PI - 1e-4) {
        if (a.omega > 0) a.omega = 0 // b is lying flat, a rests on it
        continue
      }
      if (a.omega > b.omega) {
        const ia = inertia(a)
        const ib = inertia(b)
        let w = (ia * a.omega + ib * b.omega) / (ia + ib)
        if (!b.hit) {
          b.hit = true
          w = Math.max(b.omega, w * slipFactor(mu))
        }
        a.omega = w
        b.omega = w
      }
    }
  }
}

function CascadeCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [goals, setGoals] = useState(0)
  const [fell, setFell] = useState(0)
  const [placedCount, setPlacedCount] = useState(0)
  const [phaseUi, setPhaseUi] = useState(experiment ? 'ready' : 'build')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)

  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const spacingRef = useRef(settings.spacing)
  const dominoesRef = useRef([])
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const goalsRef = useRef(0)
  const pushRef = useRef(() => {})
  const undoRef = useRef(() => {})

  // slider changes apply instantly (declared BEFORE the world effect)
  useEffect(() => {
    settingsRef.current = settings
    dominoesRef.current.forEach((d) => {
      d.m = settings.mass * (d.h / H)
    })
    // a new spacing needs the dominoes laid out again
    if (experiment && spacingRef.current !== settings.spacing) {
      spacingRef.current = settings.spacing
      setRound((r) => r + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  useEffect(() => {
    setMessage(null)
    setResult(null)
    setFell(0)
    setPlacedCount(0)
    setPhaseUi(experiment ? 'ready' : 'build')

    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.display = 'block'
    canvas.style.cursor = experiment ? 'pointer' : 'crosshair'
    containerRef.current.appendChild(canvas)
    const ctx = canvas.getContext('2d')

    const mk = (x, h, color) => ({
      x, // centre of the domino when upright
      h,
      color,
      theta: 0, // lean angle (rad), clockwise = falling right
      omega: 0, // spin (rad/s)
      hit: false,
      fallenAt: null,
      m: settingsRef.current.mass * (h / H),
    })

    const s0 = settingsRef.current
    const targetX = experiment ? WIDTH : Math.min(640, 440 + goalsRef.current * 50)
    const target = experiment ? null : mk(targetX, TARGET_H, '#f5a623')
    const dominoes = []
    dominoesRef.current = dominoes
    let chain = [] // the dominoes that carry the chain (everything but the target)

    if (experiment) {
      for (let i = 0; i < EXP_COUNT; i++) {
        dominoes.push(mk(EXP_FIRST_X + i * s0.spacing, H, '#5adfff'))
      }
      chain = [...dominoes]
    } else {
      dominoes.push(target)
    }

    let phase = experiment ? 'ready' : 'build' // build/ready -> running -> done
    const placed = []
    let ghostX = null
    let simTime = 0
    let settle = 0
    let acc = 0
    let lastCount = 0
    let nextTimer = null
    let raf = 0

    const startRun = () => {
      if (phase !== 'ready') return
      phase = 'running'
      launchSettingsRef.current = { ...settingsRef.current } // what this run really used
      dominoes[0].omega = PUSH
      dominoes[0].hit = true
      setPhaseUi('running')
      setMessage(null)
    }

    pushRef.current = () => {
      if (phase !== 'build' || placed.length === 0) return
      phase = 'running'
      chain = [...placed].sort((a, b) => a - b).map((x) => mk(x, H, '#5adfff'))
      dominoes.unshift(...chain)
      dominoes[0].omega = PUSH
      dominoes[0].hit = true
      setPhaseUi('running')
    }
    undoRef.current = () => {
      if (phase !== 'build') return
      placed.pop()
      setPlacedCount(placed.length)
    }

    const fallenCount = () => chain.filter((d) => d.fallenAt !== null).length

    const finishExperiment = () => {
      phase = 'done'
      setPhaseUi('done')
      const n = fallenCount()
      const last = Math.max(0, ...chain.map((d) => d.fallenAt ?? 0))
      const chainTime = Math.round(last * 10) / 10
      setResult({ dominoesFallen: n, chainTime })
      setScore(n * 100 + (n === chain.length ? 200 : 0))
      setMessage(n === chain.length ? 'Full chain!' : `${n} of ${chain.length} fell`)
    }

    const finishPlay = (success) => {
      phase = 'done'
      setPhaseUi('done')
      if (success) {
        goalsRef.current += 1
        setGoals(goalsRef.current)
        const pts = 300 + (MAX_PLAY - placed.length) * 50 // fewer dominoes = more points
        setScore((s) => s + pts)
        setMessage(`Target down! +${pts}`)
      } else {
        const n = fallenCount()
        setMessage(`The chain stopped after ${n} domino${n === 1 ? '' : 'es'}. Try again.`)
      }
      nextTimer = setTimeout(() => setRound((r) => r + 1), 1800)
    }

    // screen pixels -> game coordinates (works at any canvas size, including fullscreen)
    const toGame = (e) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (WIDTH / rect.width),
        y: (e.clientY - rect.top) * (HEIGHT / rect.height),
      }
    }
    const valid = (x) =>
      x >= MIN_X && x <= targetX - 26 && placed.every((p) => Math.abs(p - x) >= MIN_GAP)

    const onMove = (e) => { ghostX = toGame(e).x }
    const onLeave = () => { ghostX = null }
    const onDown = () => {
      if (experiment) {
        startRun()
        return
      }
      if (phase !== 'build' || ghostX === null) return
      if (placed.length >= MAX_PLAY || !valid(ghostX)) return
      placed.push(Math.round(ghostX))
      setPlacedCount(placed.length)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('mousedown', onDown)

    const drawDomino = (d, color) => {
      ctx.save()
      ctx.translate(d.x + T / 2, FLOOR_TOP) // rotate about the front-bottom corner
      ctx.rotate(d.theta)
      ctx.fillStyle = color
      ctx.strokeStyle = '#0b0f19'
      ctx.lineWidth = 2
      ctx.fillRect(-T, -d.h, T, d.h)
      ctx.strokeRect(-T, -d.h, T, d.h)
      ctx.restore()
    }

    const draw = () => {
      ctx.fillStyle = '#0b0f19'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = '#7d8489'
      ctx.fillRect(0, FLOOR_TOP, WIDTH, HEIGHT - FLOOR_TOP)

      dominoes.forEach((d) => drawDomino(d, d.fallenAt !== null && d !== target ? '#7ee787' : d.color))

      ctx.save()
      ctx.font = '12px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      if (!experiment) ctx.fillText('TARGET', targetX - 24, FLOOR_TOP - TARGET_H - 10)

      if (phase === 'build') {
        ctx.fillStyle = '#5adfff'
        ctx.strokeStyle = '#0b0f19'
        ctx.lineWidth = 2
        placed.forEach((x) => {
          ctx.fillRect(x - T / 2, FLOOR_TOP - H, T, H)
          ctx.strokeRect(x - T / 2, FLOOR_TOP - H, T, H)
        })
        const sorted = [...placed].sort((a, b) => a - b)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1] - T
          ctx.fillText(`${gap}`, (sorted[i] + sorted[i - 1]) / 2 - 8, FLOOR_TOP - H - 8)
        }
        if (ghostX !== null && placed.length < MAX_PLAY) {
          ctx.setLineDash([5, 5])
          ctx.lineWidth = 2
          ctx.strokeStyle = valid(ghostX) ? 'rgba(126,231,135,0.9)' : 'rgba(255,92,92,0.9)'
          ctx.strokeRect(ghostX - T / 2, FLOOR_TOP - H, T, H)
          ctx.setLineDash([])
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = '14px monospace'
        ctx.fillText('Click the floor to place dominoes, then press Push', 24, 30)
      }
      if (phase === 'ready') {
        ctx.font = '14px monospace'
        ctx.fillText('Press Run', EXP_FIRST_X - 30, FLOOR_TOP - H - 14)
      }
      ctx.restore()
    }

    let last = performance.now()
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const frame = Math.min(0.05, (now - last) / 1000)
      last = now

      if (phase === 'running') {
        const s = settingsRef.current
        const g = G_BASE * s.gravity
        acc += frame
        let steps = 0
        while (acc >= DT && steps < 40) {
          advance(dominoes, g, s.friction, DT)
          simTime += DT
          acc -= DT
          steps++
          for (const d of dominoes) {
            if (d.fallenAt === null && d.theta > FALLEN) d.fallenAt = simTime
          }
          const maxW = Math.max(...dominoes.map((d) => Math.abs(d.omega)))
          settle = maxW < 0.05 ? settle + DT : 0
        }
        if (steps === 40) acc = 0

        const n = fallenCount()
        if (n !== lastCount) {
          lastCount = n
          setFell(n)
        }

        if (!experiment && target.theta > FALLEN) finishPlay(true)
        else if ((settle > 0.6 && simTime > 1) || simTime > 15) {
          if (experiment) finishExperiment()
          else finishPlay(false)
        }
      }
      draw()
    }
    raf = requestAnimationFrame(loop)

    // "Run" (or "Run Again" from the Journal): start straight away
    if (experiment && ((autoRun && round === 0) || pendingRunRef.current)) {
      pendingRunRef.current = false
      startRun()
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(nextTimer)
      dominoesRef.current = []
      pushRef.current = () => {}
      undoRef.current = () => {}
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('mousedown', onDown)
      canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, experiment])

  const handleTryAgain = () => {
    goalsRef.current = 0
    setGoals(0)
    setScore(0)
    setRound((r) => r + 1)
  }

  const handleResetAll = () => {
    setSettings(DEFAULT_SETTINGS)
    handleTryAgain()
  }

  const handleRun = () => {
    pendingRunRef.current = true
    handleTryAgain()
  }

  const targetDistance = Math.min(640, 440 + goals * 50) / 100

  return (
    <GameShell
      gameId="cascade"
      experiment={experiment}
      stats={
        experiment
          ? [
              { label: 'Fallen', value: `${fell}/${EXP_COUNT}` },
              { label: 'Chain time', value: result ? `${result.chainTime} s` : '-' },
            ]
          : [
              { label: 'Goals', value: goals },
              { label: 'Placed', value: `${placedCount}/${MAX_PLAY}` },
              { label: 'Target', value: `${targetDistance} m` },
            ]
      }
      score={score}
      roundKey={round}
      containerRef={containerRef}
      onTryAgain={handleTryAgain}
      controls={CONTROLS}
      settings={settings}
      onSettingChange={(key, value) => setSettings((s) => ({ ...s, [key]: value }))}
      onResetSettings={handleResetAll}
      onRun={handleRun}
      hint="Press Run. The first domino gets the same push every time. Spacing is centre to centre in px. Dominoes are 80 px tall, so spacing above about 94 can't be reached."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        <>
          {message && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
              {message}
            </div>
          )}
          {!experiment && phaseUi === 'build' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <span className="rounded-lg bg-black/50 px-3 py-1 font-jetbrains text-xs text-white/80">
                Placed {placedCount}/{MAX_PLAY}
              </span>
              <button
                onClick={() => undoRef.current()}
                disabled={placedCount === 0}
                className="font-rajdhani font-semibold text-white border border-white/40 rounded-lg px-4 py-1 bg-black/40 hover:bg-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Undo
              </button>
              <button
                onClick={() => pushRef.current()}
                disabled={placedCount === 0}
                className="font-rajdhani font-bold text-white border border-[#5adfff]/70 rounded-lg px-5 py-1 bg-[#5adfff]/20 hover:bg-[#5adfff]/30 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Push
              </button>
            </div>
          )}
        </>
      }
      playHint="Click the floor to place up to 8 dominoes before the orange target, then press Push. Keep the gaps under about 70 px so each domino can reach the next."
    />
  )
}

export default CascadeCanvas