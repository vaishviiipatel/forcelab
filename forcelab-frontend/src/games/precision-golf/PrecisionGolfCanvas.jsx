import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const PX_PER_METER = 100
const STEP_MS = 1000 / 60 // Matter's base time step
const BALL_R = 8
const HOLE_R = 18
const MAX_SPEED = 14 // ball speed at 100% strength (px per step)
const CAPTURE_SPEED = 5.5 // faster than this and the ball rolls over the hole
const FRICTION_K = 0.2 // Surface Friction 1.0 slows the ball by this much each step (px/step²)
const G_STEP = 0.2778 // gravity as px per step²
const CHARGE_MS = 1500 // time to charge from 0% to 100%
const MARGIN = 70 // new holes stay this far from the edges
const MAX_PLAY_SLOPE = 8
const EXP_TEE = { x: 110, y: 250 }
const EXP_HOLE = { x: 720, y: 250 }
const EXP_HOLED_POINTS = 500

const DEFAULT_SETTINGS = { strength: 70, direction: 0, friction: 0.5, slope: 0 }

const CONTROLS = [
  { key: 'strength', label: 'Shot Strength', min: 10, max: 100, step: 1 },
  { key: 'direction', label: 'Shot Direction', min: 0, max: 359, step: 1 },
  { key: 'friction', label: 'Surface Friction', min: 0.1, max: 1, step: 0.05 },
  { key: 'slope', label: 'Ground Slope', min: 0, max: 10, step: 0.5 },
]

// a random spot for the next hole, 220-650 px from where the ball is
function pickHole(from) {
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 220 + Math.random() * 430
    const x = from.x + Math.cos(angle) * dist
    const y = from.y + Math.sin(angle) * dist
    if (x > MARGIN && x < WIDTH - MARGIN && y > MARGIN && y < HEIGHT - MARGIN) return { x, y }
  }
  return { x: WIDTH - 150, y: HEIGHT / 2 }
}

function PrecisionGolfCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [strokes, setStrokes] = useState(0)
  const [holesDone, setHolesDone] = useState(0)
  const [toHole, setToHole] = useState(null)
  const [slopeShown, setSlopeShown] = useState(0)
  const [shotInfo, setShotInfo] = useState(null)
  const [result, setResult] = useState(null) // experiment: filled when the shot has finished
  const [message, setMessage] = useState(null)

  // saved settings (if any) overwrite the defaults
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)

  // friction and slope are read from this ref every step, so sliders work instantly
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Build the world (re-runs whenever `round` changes)
  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter

    const engine = Engine.create()
    engine.gravity.x = 0
    engine.gravity.y = 0 // top-down view: nothing pulls the ball "down"

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#14472b' },
    })
    render.canvas.style.width = '100%'
    render.canvas.style.height = 'auto'
    render.canvas.style.display = 'block'
    render.canvas.style.cursor = 'crosshair'

    // four walls just outside the canvas edge
    const wallStyle = { isStatic: true, restitution: 0.6, render: { fillStyle: '#7d8489' } }
    const T = 20
    const IN = 6
    const walls = [
      Bodies.rectangle(WIDTH / 2, IN - T / 2, WIDTH, T, wallStyle),
      Bodies.rectangle(WIDTH / 2, HEIGHT - IN + T / 2, WIDTH, T, wallStyle),
      Bodies.rectangle(IN - T / 2, HEIGHT / 2, T, HEIGHT, wallStyle),
      Bodies.rectangle(WIDTH - IN + T / 2, HEIGHT / 2, T, HEIGHT, wallStyle),
    ]

    const startBall = { ...EXP_TEE }
    let hole = experiment ? { ...EXP_HOLE } : pickHole(startBall)

    // the hole is a sensor (nothing collides with it); it is added before the ball so the ball draws on top
    const holeBody = Bodies.circle(hole.x, hole.y, HOLE_R, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: '#050a07', strokeStyle: '#ffffff', lineWidth: 2 },
    })
    const ball = Bodies.circle(startBall.x, startBall.y, BALL_R, {
      restitution: 0.6,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      density: 0.004,
      render: { fillStyle: '#ffffff' },
    })
    Composite.add(engine.world, [...walls, holeBody, ball])

    let phase = 'aim' // aim -> rolling -> (holed | done)
    let holdPos = { ...startBall } // where the ball sits while it is not rolling
    let strokesThisHole = 0
    let holesDoneLocal = 0
    let playSlope = 0
    let restSteps = 0
    let strokeStart = 0
    let aimDir = 0 // play mode: direction toward the mouse (degrees)
    let charging = false
    let chargeStart = 0
    let nextTimer = null

    const scale = () => (engine.timing.lastDelta || STEP_MS) / STEP_MS
    const slopeNow = () => (experiment ? settingsRef.current.slope : playSlope)
    const chargePct = () => Math.min(100, ((performance.now() - chargeStart) / CHARGE_MS) * 100)
    const metersToHole = () =>
      Math.round(
        (Math.hypot(ball.position.x - hole.x, ball.position.y - hole.y) / PX_PER_METER) * 10
      ) / 10

    setToHole(metersToHole())

    const strike = (dirDeg, strengthPct) => {
      if (phase !== 'aim') return
      phase = 'rolling'
      restSteps = 0
      strokeStart = engine.timing.timestamp
      launchSettingsRef.current = { ...settingsRef.current } // what this shot really used
      strokesThisHole++
      setStrokes(strokesThisHole)
      setMessage(null)
      const v = (MAX_SPEED * strengthPct) / 100
      const rad = (dirDeg * Math.PI) / 180
      Body.setVelocity(ball, { x: v * Math.cos(rad), y: -v * Math.sin(rad) })
      setShotInfo({ direction: Math.round(dirDeg), strength: Math.round(strengthPct) })
    }

    const holed = () => {
      phase = 'holed'
      Body.setVelocity(ball, { x: 0, y: 0 })
      Body.setPosition(ball, hole)
      holdPos = { ...hole }
      setToHole(0)

      if (experiment) {
        setScore(EXP_HOLED_POINTS)
        setResult({ distanceToHole: 0, holed: 'Yes' })
        setMessage('Holed!')
        return
      }

      const pts = Math.max(50, 500 - 150 * (strokesThisHole - 1)) // fewer strokes, more points
      holesDoneLocal++
      setScore((s) => s + pts)
      setHolesDone(holesDoneLocal)
      setMessage(`Holed in ${strokesThisHole}! +${pts}`)

      // next hole: a new spot, and the slope grows
      nextTimer = setTimeout(() => {
        hole = pickHole(holdPos)
        Body.setPosition(holeBody, hole)
        strokesThisHole = 0
        playSlope = Math.min(MAX_PLAY_SLOPE, holesDoneLocal * 2)
        setStrokes(0)
        setSlopeShown(playSlope)
        setToHole(metersToHole())
        setMessage(null)
        phase = 'aim'
      }, 1500)
    }

    const stopped = () => {
      const dist = metersToHole()
      setToHole(dist)
      holdPos = { x: ball.position.x, y: ball.position.y }
      if (experiment) {
        phase = 'done'
        setScore(Math.max(0, Math.round(300 - (dist * PX_PER_METER) / 2)))
        setResult({ distanceToHole: dist, holed: 'No' })
        setMessage(`Missed by ${dist} m`)
      } else {
        phase = 'aim' // play on from where the ball stopped
      }
    }

    Events.on(engine, 'beforeUpdate', () => {
      if (phase !== 'rolling') {
        Body.setVelocity(ball, { x: 0, y: 0 })
        Body.setPosition(ball, holdPos)
        return
      }
      const k = scale()
      const s = (slopeNow() * Math.PI) / 180
      // the slope pulls the ball downhill (down the screen)
      const vx = ball.velocity.x
      const vy = ball.velocity.y + G_STEP * Math.sin(s) * k
      // rolling friction slows the ball (Matter has none of its own)
      const speed = Math.hypot(vx, vy)
      const decel = settingsRef.current.friction * FRICTION_K * Math.cos(s) * k
      const f = speed > 0 ? Math.max(0, speed - decel) / speed : 0
      Body.setVelocity(ball, { x: vx * f, y: vy * f })
    })

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'rolling') return
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y)
      const d = Math.hypot(ball.position.x - hole.x, ball.position.y - hole.y)
      if (d < HOLE_R - 3 && speed < CAPTURE_SPEED) {
        holed()
        return
      }
      restSteps = speed < 0.2 ? restSteps + 1 : 0
      if (restSteps > 30 || engine.timing.timestamp - strokeStart > 15000) stopped()
    })

    // screen pixels -> game coordinates (works at any canvas size, including fullscreen)
    const toGame = (e) => {
      const rect = render.canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (WIDTH / rect.width),
        y: (e.clientY - rect.top) * (HEIGHT / rect.height),
      }
    }
    const onMove = (e) => {
      if (experiment) return
      const m = toGame(e)
      const a = (Math.atan2(ball.position.y - m.y, m.x - ball.position.x) * 180) / Math.PI
      aimDir = (a + 360) % 360
    }
    const onDown = () => {
      if (phase !== 'aim') return
      if (experiment) {
        strike(settingsRef.current.direction, settingsRef.current.strength)
      } else {
        charging = true
        chargeStart = performance.now()
      }
    }
    const onUp = () => {
      if (!charging) return
      charging = false
      strike(aimDir, Math.max(10, chargePct()))
    }
    render.canvas.addEventListener('mousemove', onMove)
    render.canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.save()

      // faint arrows show which way is downhill
      const sl = slopeNow()
      if (sl > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + sl * 0.012})`
        ctx.lineWidth = 2
        for (let x = 90; x < WIDTH; x += 120) {
          for (let y = 70; y < HEIGHT - 40; y += 110) {
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x, y + 26)
            ctx.moveTo(x - 6, y + 19)
            ctx.lineTo(x, y + 26)
            ctx.lineTo(x + 6, y + 19)
            ctx.stroke()
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '13px monospace'
        ctx.fillText(`Slope ${sl}° (downhill = down)`, 16, 26)
      }

      // flag
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hole.x, hole.y)
      ctx.lineTo(hole.x, hole.y - 55)
      ctx.stroke()
      ctx.fillStyle = '#ff5c5c'
      ctx.beginPath()
      ctx.moveTo(hole.x, hole.y - 55)
      ctx.lineTo(hole.x + 24, hole.y - 46)
      ctx.lineTo(hole.x, hole.y - 37)
      ctx.closePath()
      ctx.fill()

      // aim line (and charge bar in play mode)
      if (phase === 'aim') {
        const dir = experiment ? settingsRef.current.direction : aimDir
        const pct = experiment ? settingsRef.current.strength : charging ? chargePct() : 0
        const rad = (dir * Math.PI) / 180
        const len = 28 + (pct / 100) * 110
        ctx.setLineDash([6, 6])
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.beginPath()
        ctx.moveTo(ball.position.x, ball.position.y)
        ctx.lineTo(ball.position.x + len * Math.cos(rad), ball.position.y - len * Math.sin(rad))
        ctx.stroke()
        ctx.setLineDash([])
        if (!experiment) {
          ctx.fillStyle = 'rgba(255,255,255,0.2)'
          ctx.fillRect(ball.position.x - 30, ball.position.y + 18, 60, 6)
          ctx.fillStyle = '#5adfff'
          ctx.fillRect(ball.position.x - 30, ball.position.y + 18, (pct / 100) * 60, 6)
        }
      }
      ctx.restore()
    })

    // "Run" (or "Run Again" from the Journal): hit straight away with the slider values
    if ((autoRun && round === 0) || pendingRunRef.current) {
      pendingRunRef.current = false
      strike(settingsRef.current.direction, settingsRef.current.strength)
    }

    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      clearTimeout(nextTimer)
      render.canvas.removeEventListener('mousemove', onMove)
      render.canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      Render.stop(render)
      Runner.stop(runner)
      Composite.clear(engine.world)
      Engine.clear(engine)
      render.canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, experiment])

  const handleTryAgain = () => {
    setResult(null)
    setShotInfo(null)
    setMessage(null)
    setScore(0)
    setStrokes(0)
    setHolesDone(0)
    setSlopeShown(0)
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

  // before a shot, experiment mode shows what the sliders are set to
  const shown =
    shotInfo || { direction: settings.direction, strength: settings.strength }
  const toHoleText = toHole !== null ? `${toHole} m` : '-'

  return (
    <GameShell
      gameId="precision-golf"
      experiment={experiment}
      stats={
        experiment
          ? [
              { label: 'Direction', value: `${shown.direction}°` },
              { label: 'Strength', value: `${shown.strength}%` },
              { label: 'To hole', value: toHoleText },
            ]
          : [
              { label: 'Hole', value: holesDone + 1 },
              { label: 'Strokes', value: strokes },
              { label: 'To hole', value: toHoleText },
              { label: 'Slope', value: `${slopeShown}°` },
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
      hint="Direction: 0° is right, 90° is up. The tee and hole stay in the same place, so change one setting at a time and press Run."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        message && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
            {message}
          </div>
        )
      }
      playHint="Move the mouse to aim, hold to charge, release to hit. Sink the ball and a new hole appears."
    />
  )
}

export default PrecisionGolfCanvas