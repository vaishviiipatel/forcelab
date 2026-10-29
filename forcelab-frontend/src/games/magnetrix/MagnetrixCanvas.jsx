import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const FLOOR_TOP = 440
const PX_PER_METER = 100 // so gravity 1.0 works out to about 10 m/s²
const STEP_MS = 1000 / 60 // Matter's base time step
const G_STEP = 0.2778 // gravity 1.0 as px per step²
const BALL_R = 14
const BALL_X = 110
const BARRIER_X = 430
const BARRIER_W = 24
const MAG_K = 0.012 // Magnetic Strength -> pull (px per step²)
const MAG_RANGE = 100 // px: the pull is half strength at this distance
const MAG_SOFT = 12 // px: the pull fades to zero at the magnet's centre, so the ball doesn't jitter
const MAG_DAMP = 0.25 // how strongly the field calms the ball down relative to the magnet

// Experiment mode: the magnet always follows this same path, so only the sliders change the result
const EXP = {
  zoneX: 760,
  zoneHalf: 120,
  barrierH: 140,
  startY: FLOOR_TOP - BALL_R - 66, // starts 66 px above the ball
  liftY: 180, // height the magnet carries the ball at
  hold: 800, // ms: magnet waits above the ball
  lift: 1600, // ms: magnet rises
  settle: 500, // ms: magnet waits at the top
  push: 1400, // ms: magnet speeds up to the right
  endSpeed: 0.36, // px per ms at the moment of release
}
const EXP_RELEASE = EXP.hold + EXP.lift + EXP.settle + EXP.push

const DEFAULT_SETTINGS = { gravity: 1, mass: 1, magnet: 60, friction: 0.5 }

const CONTROLS = [
  { key: 'gravity', label: 'Gravity', min: 0.2, max: 2, step: 0.05 },
  { key: 'mass', label: 'Ball Mass', min: 0.5, max: 3, step: 0.1 },
  { key: 'magnet', label: 'Magnetic Strength', min: 10, max: 100, step: 1 },
  { key: 'friction', label: 'Friction', min: 0.05, max: 1, step: 0.05 },
]

const meters = (px) => Math.round((px / PX_PER_METER) * 10) / 10

// floor friction: slows a body along x, never reverses it
const slow = (body, decel) => {
  const vx = body.velocity.x
  const next = Math.sign(vx) * Math.max(0, Math.abs(vx) - decel)
  Matter.Body.setVelocity(body, { x: next, y: body.velocity.y })
}

// where the scripted magnet is, t ms after pressing Run
function scriptedMagnet(t) {
  const { hold, lift, settle, liftY, startY, push, endSpeed } = EXP
  if (t < hold) return { x: BALL_X, y: startY }
  if (t < hold + lift) {
    const u = (t - hold) / lift
    const eased = u * u * (3 - 2 * u) // smooth start and stop
    return { x: BALL_X, y: startY + (liftY - startY) * eased }
  }
  if (t < hold + lift + settle) return { x: BALL_X, y: liftY }
  const tt = t - (hold + lift + settle)
  const a = endSpeed / push // constant acceleration to the right
  return { x: BALL_X + 0.5 * a * tt * tt, y: liftY }
}

function drawMagnet(ctx, p, on) {
  ctx.save()
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(p.x, p.y, 20, Math.PI, 0)
  ctx.strokeStyle = on ? '#ff5c5c' : 'rgba(255,92,92,0.35)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(p.x, p.y, 20, 0, Math.PI)
  ctx.strokeStyle = on ? '#5a9bff' : 'rgba(90,155,255,0.35)'
  ctx.stroke()
  if (on) {
    ctx.setLineDash([5, 7])
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(p.x, p.y, MAG_RANGE, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function MagnetrixCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [goals, setGoals] = useState(0)
  const [result, setResult] = useState(null) // experiment: filled when the ball has stopped
  const [releaseSpeed, setReleaseSpeed] = useState(null)
  const [message, setMessage] = useState(null)

  // saved settings (if any) overwrite the defaults
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const worldRef = useRef({ engine: null, ball: null })
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const goalsRef = useRef(0)

  // Slider changes update the running physics without rebuilding the world.
  // (Declared BEFORE the world effect so a new round always sees the latest values.)
  useEffect(() => {
    settingsRef.current = settings
    const { engine, ball } = worldRef.current
    if (!engine) return
    engine.gravity.y = settings.gravity
    Matter.Body.setMass(ball, settings.mass)
  }, [settings])

  // Build the physics world (re-runs whenever `round` changes)
  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter

    setMessage(null)
    setResult(null)
    setReleaseSpeed(null)

    const engine = Engine.create()
    engine.gravity.y = settingsRef.current.gravity

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#0b0f19' },
    })
    render.canvas.style.width = '100%'
    render.canvas.style.height = 'auto'
    render.canvas.style.display = 'block'
    render.canvas.style.cursor = experiment ? 'pointer' : 'none' // the magnet ring is the cursor

    // Play: a taller barrier and a new target spot after every goal. Experiment: fixed.
    const barrierH = experiment ? EXP.barrierH : Math.min(240, 100 + goalsRef.current * 30)
    const zoneX = experiment ? EXP.zoneX : 640 + Math.floor(Math.random() * 160)
    const zoneHalf = experiment ? EXP.zoneHalf : 80

    // Matter has no rolling friction, so floor friction is applied by us each step
    const solid = { isStatic: true, friction: 0, frictionStatic: 0, render: { fillStyle: '#7d8489' } }
    const floor = Bodies.rectangle(WIDTH / 2, FLOOR_TOP + 30, WIDTH, 60, solid)
    const leftWall = Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, solid)
    const rightWall = Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, solid)
    const ceiling = Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, solid)
    const barrier = Bodies.rectangle(BARRIER_X, FLOOR_TOP - barrierH / 2, BARRIER_W, barrierH, solid)

    const ball = Bodies.circle(BALL_X, FLOOR_TOP - BALL_R - 0.5, BALL_R, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0.1,
      render: { fillStyle: '#5adfff' },
    })
    Body.setMass(ball, settingsRef.current.mass)

    Composite.add(engine.world, [floor, leftWall, rightWall, ceiling, barrier, ball])
    worldRef.current = { engine, ball }

    let phase = experiment ? 'ready' : 'running' // ready -> running -> done
    let runStart = 0
    let released = false
    let relSpeed = 0
    let restSteps = 0
    let nextTimer = null

    // mouse / magnet
    let mouse = { x: WIDTH / 2, y: 150 }
    let inside = false
    let pulling = false
    let everPulled = false
    let wasActive = false
    let prevPos = { x: 0, y: 0 }
    let magVel = { x: 0, y: 0 }
    let magShow = false
    let magOn = false
    let magPos = { x: 0, y: 0 }

    const scale = () => (engine.timing.lastDelta || STEP_MS) / STEP_MS

    const startRun = () => {
      if (phase !== 'ready') return
      phase = 'running'
      runStart = engine.timing.timestamp
      launchSettingsRef.current = { ...settingsRef.current } // what this run really used
      setMessage(null)
    }

    const finishExperiment = () => {
      if (phase === 'done') return
      phase = 'done'
      const off = Math.abs(ball.position.x - zoneX)
      const onTarget = off <= zoneHalf
      const dist = meters(off)
      setResult({
        releaseSpeed: relSpeed,
        distanceToTarget: dist,
        onTarget: onTarget ? 'Yes' : 'No',
      })
      setScore(onTarget ? 500 : Math.max(0, Math.round(250 - dist * 50)))
      setMessage(onTarget ? 'On target!' : `Off by ${dist} m`)
    }

    const finishPlay = () => {
      if (phase === 'done') return
      phase = 'done'
      goalsRef.current += 1
      setGoals(goalsRef.current)
      const secs = engine.timing.timestamp / 1000
      const pts = 300 + Math.max(0, 200 - Math.round(secs * 8)) // faster = more points
      setScore((s) => s + pts)
      setMessage(`Goal! +${pts}`)
      // next round: taller barrier, new target spot
      nextTimer = setTimeout(() => setRound((r) => r + 1), 1700)
    }

    Events.on(engine, 'beforeUpdate', () => {
      if (phase === 'done') return
      const s = settingsRef.current
      const k = scale()
      const t = engine.timing.timestamp - runStart

      // 1. where is the magnet, and is it on?
      let active = false
      let pos = mouse
      if (experiment) {
        if (phase === 'running') {
          if (!released && t >= EXP_RELEASE) {
            released = true
            relSpeed = meters(Math.hypot(ball.velocity.x, ball.velocity.y) * 60)
            setReleaseSpeed(relSpeed)
          }
          if (!released) {
            active = true
            pos = scriptedMagnet(t)
          }
        }
      } else {
        active = pulling && inside
      }
      magShow = experiment ? phase === 'running' && !released : inside
      magOn = active
      magPos = pos

      // 2. the magnetic pull
      if (active) {
        magVel = wasActive
          ? { x: pos.x - prevPos.x, y: pos.y - prevPos.y }
          : { x: 0, y: 0 }
        prevPos = { x: pos.x, y: pos.y }

        const dx = pos.x - ball.position.x
        const dy = pos.y - ball.position.y
        const dist = Math.hypot(dx, dy)
        const fall = (MAG_RANGE * MAG_RANGE) / (dist * dist + MAG_RANGE * MAG_RANGE)
        const ramp = dist / Math.sqrt(dist * dist + MAG_SOFT * MAG_SOFT)
        const a = (((s.magnet * MAG_K) / s.mass) * fall * ramp) * k // a = F / m
        const ux = dist > 0 ? dx / dist : 0
        const uy = dist > 0 ? dy / dist : 0

        let vx = ball.velocity.x + a * ux
        let vy = ball.velocity.y + a * uy
        // calm the ball relative to the magnet, so it follows smoothly instead of swinging
        const c = MAG_DAMP * fall
        vx -= c * (vx - magVel.x)
        vy -= c * (vy - magVel.y)
        Body.setVelocity(ball, { x: vx, y: vy })
      }
      wasActive = active

      // 3. rolling friction while the ball touches the floor
      if (ball.position.y >= FLOOR_TOP - BALL_R - 1) {
        slow(ball, s.friction * G_STEP * engine.gravity.y * k)
        Body.setAngularVelocity(ball, ball.velocity.x / BALL_R) // spin (just for looks)
      }
    })

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'running') return
      const t = engine.timing.timestamp - runStart
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y)
      const free = experiment ? released : !(pulling && inside)
      restSteps = free && speed < 0.1 ? restSteps + 1 : 0

      if (experiment) {
        if (released && (restSteps > 40 || t > EXP_RELEASE + 9000)) finishExperiment()
      } else if (restSteps > 40) {
        const onFloor = ball.position.y > FLOOR_TOP - BALL_R - 3
        if (onFloor && Math.abs(ball.position.x - zoneX) <= zoneHalf) finishPlay()
      }
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
      mouse = toGame(e)
      inside = true
    }
    const onLeave = () => {
      inside = false
    }
    const onDown = () => {
      if (experiment) {
        startRun()
      } else {
        pulling = true
        everPulled = true
      }
    }
    const onUp = () => {
      pulling = false
    }
    render.canvas.addEventListener('mousemove', onMove)
    render.canvas.addEventListener('mouseleave', onLeave)
    render.canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context

      // target strip
      ctx.save()
      ctx.fillStyle = 'rgba(126,231,135,0.9)'
      ctx.fillRect(zoneX - zoneHalf, FLOOR_TOP, zoneHalf * 2, 10)
      ctx.font = '12px monospace'
      ctx.fillText('TARGET', zoneX - 24, FLOOR_TOP + 28)
      ctx.restore()

      if (magShow) drawMagnet(ctx, magPos, magOn)

      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '14px monospace'
      if (experiment && phase === 'ready') ctx.fillText('Press Run', BALL_X - 40, FLOOR_TOP - 60)
      if (!experiment && !everPulled) {
        ctx.fillText('Hold the mouse to switch the magnet on', WIDTH / 2 - 150, 40)
      }
      ctx.restore()
    })

    // "Run" (or "Run Again" from the Journal): start straight away
    if (experiment && ((autoRun && round === 0) || pendingRunRef.current)) {
      pendingRunRef.current = false
      startRun()
    }

    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      worldRef.current = { engine: null, ball: null }
      clearTimeout(nextTimer)
      render.canvas.removeEventListener('mousemove', onMove)
      render.canvas.removeEventListener('mouseleave', onLeave)
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
    goalsRef.current = 0
    setGoals(0)
    setScore(0)
    setResult(null)
    setMessage(null)
    setReleaseSpeed(null)
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

  const barrierShown = Math.min(240, 100 + goals * 30) / 100

  return (
    <GameShell
      gameId="magnetrix"
      experiment={experiment}
      stats={
        experiment
          ? [
              { label: 'Release speed', value: releaseSpeed !== null ? `${releaseSpeed} m/s` : '-' },
              { label: 'To target', value: result ? `${result.distanceToTarget} m` : '-' },
            ]
          : [
              { label: 'Goals', value: goals },
              { label: 'Barrier', value: `${barrierShown} m` },
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
      hint="Press Run. The magnet follows the same path every time: it lifts the ball, carries it right, then lets go. Change one setting at a time."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        message && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
            {message}
          </div>
        )
      }
      playHint="Hold the mouse to switch the magnet on. Carry the ball over the barrier, then let go so it rolls onto the green strip."
    />
  )
}

export default MagnetrixCanvas