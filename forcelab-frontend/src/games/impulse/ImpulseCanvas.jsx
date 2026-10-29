import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const FLOOR_TOP = 440
const PX_PER_METER = 100 // so gravity 1.0 works out to about 10 m/s²
const STEP_MS = 1000 / 60 // Matter's base time step
const G_STEP = 0.2778 // gravity 1.0 as px per step²
const FLOOR_MU = 0.35 // friction coefficient between the floor and the objects
const BALL_R = 16
const BALL_X = 90
const CRATE = { x: 400, w: 70, h: 60, mass: 3 }
const ZONE_W = 110
const CONTACT_MAX = 500 // longest push you can hold (ms)
const ON_TARGET_POINTS = 500

const DEFAULT_SETTINGS = { mass: 2, force: 50, contactTime: 300, gravity: 1 }

const CONTROLS = [
  { key: 'mass', label: 'Ball Mass', min: 0.5, max: 5, step: 0.1 },
  { key: 'force', label: 'Applied Force', min: 10, max: 100, step: 1 },
  { key: 'contactTime', label: 'Contact Time', min: 50, max: 500, step: 10 },
  { key: 'gravity', label: 'Gravity', min: 0.2, max: 2, step: 0.05 },
]

// floor friction: slows a body along x, never reverses it
const slow = (body, decel) => {
  const vx = body.velocity.x
  const next = Math.sign(vx) * Math.max(0, Math.abs(vx) - decel)
  Matter.Body.setVelocity(body, { x: next, y: body.velocity.y })
}

function ImpulseCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [result, setResult] = useState(null) // experiment: filled when the crate has stopped
  const [live, setLive] = useState({ impulse: null, speed: null })
  const [message, setMessage] = useState(null)

  // saved settings (if any) overwrite the defaults
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const worldRef = useRef({ engine: null, ball: null })
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const streakRef = useRef(0)

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
    render.canvas.style.cursor = 'pointer'

    // Play: the target is somewhere new each round. Experiment: fixed, so results can be compared.
    const zoneX = experiment ? 640 : 520 + Math.floor(Math.random() * 280)

    const floor = Bodies.rectangle(WIDTH / 2, FLOOR_TOP + 30, WIDTH, 60, {
      isStatic: true,
      friction: 0,
      frictionStatic: 0,
      render: { fillStyle: '#7d8489' },
    })
    const wall = { isStatic: true, render: { fillStyle: '#7d8489' } }
    const leftWall = Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, wall)
    const rightWall = Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, wall)
    const ceiling = Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, wall)

    // Matter has no rolling friction, so floor friction is applied by us each step
    const crate = Bodies.rectangle(CRATE.x, FLOOR_TOP - CRATE.h / 2, CRATE.w, CRATE.h, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0.1,
      render: { fillStyle: '#f5a623' },
    })
    Body.setMass(crate, CRATE.mass)

    const ball = Bodies.circle(BALL_X, FLOOR_TOP - BALL_R, BALL_R, {
      friction: 0.05,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0.4,
      render: { fillStyle: '#5adfff' },
    })
    Body.setMass(ball, settingsRef.current.mass)

    Composite.add(engine.world, [floor, leftWall, rightWall, ceiling, crate, ball])
    worldRef.current = { engine, ball }

    let phase = 'ready' // ready -> pushing -> rolling -> done
    let pushStart = 0
    let pushForce = 0
    let impulse = 0
    let releaseSpeed = 0
    let restSteps = 0
    let nextTimer = null

    const scale = () => (engine.timing.lastDelta || STEP_MS) / STEP_MS
    const meters = (px) => Math.round((px / PX_PER_METER) * 10) / 10

    const startPush = () => {
      if (phase !== 'ready') return
      phase = 'pushing'
      pushStart = engine.timing.timestamp
      pushForce = settingsRef.current.force
      launchSettingsRef.current = { ...settingsRef.current } // what this push really used
      setMessage(null)
    }

    const endPush = (ms) => {
      if (phase !== 'pushing') return
      phase = 'rolling'
      impulse = Math.round(pushForce * (ms / 1000) * 10) / 10 // impulse = force × time (N·s)
      releaseSpeed = meters(Math.hypot(ball.velocity.x, ball.velocity.y) * 60)
      setLive({ impulse, speed: releaseSpeed })
    }

    const finish = () => {
      if (phase === 'done') return
      phase = 'done'
      const off = Math.abs(crate.position.x - zoneX)
      const onTarget = off <= ZONE_W / 2
      const offM = meters(off)
      const moved = meters(crate.position.x - CRATE.x)
      const base = onTarget ? ON_TARGET_POINTS : Math.max(0, Math.round(250 - offM * 100))

      if (experiment) {
        setScore(base)
        setResult({ impulse, speed: releaseSpeed, crateMoved: moved, offTarget: offM })
        setMessage(onTarget ? 'On target!' : `Off target by ${offM} m`)
        return
      }

      const bonus = onTarget ? Math.min(streakRef.current, 5) * 50 : 0
      streakRef.current = onTarget ? streakRef.current + 1 : 0
      setStreak(streakRef.current)
      setScore((s) => s + base + bonus)
      setMessage(onTarget ? `On target! +${base + bonus}` : `Off by ${offM} m. +${base}`)
      // next target, new distance
      nextTimer = setTimeout(() => {
        setMessage(null)
        setLive({ impulse: null, speed: null })
        setRound((r) => r + 1)
      }, 1700)
    }

    Events.on(engine, 'beforeUpdate', () => {
      if (phase === 'ready') {
        Body.setVelocity(ball, { x: 0, y: 0 })
        Body.setAngularVelocity(ball, 0)
        Body.setPosition(ball, { x: BALL_X, y: FLOOR_TOP - BALL_R })
        return
      }
      if (phase === 'done') return

      const k = scale()
      const fric = FLOOR_MU * G_STEP * engine.gravity.y * k // px per step²

      if (phase === 'pushing') {
        const elapsed = engine.timing.timestamp - pushStart
        const limit = experiment ? launchSettingsRef.current.contactTime : CONTACT_MAX
        if (elapsed >= limit) {
          endPush(limit)
        } else {
          // a = F / m  (m/s²)  ->  px per step²
          const push = (((pushForce / settingsRef.current.mass) * PX_PER_METER) / 3600) * k
          Body.setVelocity(ball, { x: ball.velocity.x + push, y: ball.velocity.y })
        }
      }

      slow(ball, fric)
      slow(crate, fric)
      Body.setAngularVelocity(ball, ball.velocity.x / BALL_R) // rolling spin (just for looks)
    })

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'rolling') return
      const still =
        Math.hypot(ball.velocity.x, ball.velocity.y) < 0.1 &&
        Math.hypot(crate.velocity.x, crate.velocity.y) < 0.1
      restSteps = still ? restSteps + 1 : 0
      if (restSteps > 40 || engine.timing.timestamp - pushStart > 15000) finish()
    })

    const onDown = () => startPush()
    const onUp = () => {
      if (experiment || phase !== 'pushing') return
      endPush(Math.min(CONTACT_MAX, engine.timing.timestamp - pushStart))
    }
    render.canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.save()

      // target zone on the floor
      ctx.fillStyle = 'rgba(126,231,135,0.9)'
      ctx.fillRect(zoneX - ZONE_W / 2, FLOOR_TOP, ZONE_W, 10)
      ctx.font = '12px monospace'
      ctx.fillText('TARGET', zoneX - 24, FLOOR_TOP + 28)

      // metre scale
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 7; i++) {
        const x = BALL_X + i * PX_PER_METER
        ctx.beginPath()
        ctx.moveTo(x, FLOOR_TOP + 36)
        ctx.lineTo(x, FLOOR_TOP + 44)
        ctx.stroke()
        ctx.fillText(`${i}m`, x - 8, FLOOR_TOP + 58)
      }

      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '14px monospace'
      if (phase === 'ready') {
        ctx.fillText(experiment ? 'Press Run' : 'Hold to push', BALL_X - 40, FLOOR_TOP - 60)
      }
      if (phase === 'pushing') {
        const bx = ball.position.x - BALL_R - 16
        const y = ball.position.y
        // the pusher and the force arrow
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(bx, y - 16, 10, 32)
        const len = 10 + (pushForce / 100) * 40
        ctx.strokeStyle = '#5adfff'
        ctx.fillStyle = '#5adfff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(bx - len, y)
        ctx.lineTo(bx - 6, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(bx, y)
        ctx.lineTo(bx - 10, y - 6)
        ctx.lineTo(bx - 10, y + 6)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(
          `Contact ${Math.round(engine.timing.timestamp - pushStart)} ms`,
          ball.position.x - 44,
          y - 36
        )
      }

      // a dot on the ball so you can see it spin
      ctx.fillStyle = '#0b0f19'
      ctx.beginPath()
      ctx.arc(
        ball.position.x + Math.cos(ball.angle) * BALL_R * 0.55,
        ball.position.y + Math.sin(ball.angle) * BALL_R * 0.55,
        3,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()
    })

    // "Run" (or "Run Again" from the Journal): push straight away with the slider values
    if ((autoRun && round === 0) || pendingRunRef.current) {
      pendingRunRef.current = false
      startPush()
    }

    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      worldRef.current = { engine: null, ball: null }
      clearTimeout(nextTimer)
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
    streakRef.current = 0
    setStreak(0)
    setScore(0)
    setResult(null)
    setMessage(null)
    setLive({ impulse: null, speed: null })
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

  return (
    <GameShell
      gameId="impulse"
      experiment={experiment}
      stats={[
        { label: 'Impulse', value: live.impulse !== null ? `${live.impulse} N·s` : '-' },
        { label: 'Speed', value: live.speed !== null ? `${live.speed} m/s` : '-' },
        experiment
          ? { label: 'Moved', value: result ? `${result.crateMoved} m` : '-' }
          : { label: 'Streak', value: streak },
      ]}
      score={score}
      roundKey={round}
      containerRef={containerRef}
      onTryAgain={handleTryAgain}
      controls={CONTROLS}
      settings={settings}
      onSettingChange={(key, value) => setSettings((s) => ({ ...s, [key]: value }))}
      onResetSettings={handleResetAll}
      onRun={handleRun}
      hint="Units: kg, N, ms. Impulse = Force × Contact Time. The target stays in the same place, so change one setting at a time and press Run."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        message && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
            {message}
          </div>
        )
      }
      playHint="Hold the mouse to push the ball. The longer you hold, the bigger the impulse. Land the crate on the green target."
    />
  )
}

export default ImpulseCanvas