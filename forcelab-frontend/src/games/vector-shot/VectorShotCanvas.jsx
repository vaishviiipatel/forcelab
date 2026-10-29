import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const ANCHOR = { x: 150, y: 380 }
const MAX_DRAG = 90
const BOX = 40
const MOVE_THRESHOLD = 30
const BALL_BOUNCE = 0.6

const DEFAULT_SETTINGS = { gravity: 1, density: 0.005, friction: 0.5, power: 0.18 }

const CONTROLS = [
  { key: 'gravity', label: 'Gravity', min: 0, max: 2, step: 0.05 },
  { key: 'density', label: 'Mass', min: 0.002, max: 0.015, step: 0.001 },
  { key: 'friction', label: 'Friction', min: 0, max: 1, step: 0.05 },
  { key: 'power', label: 'Launch Force', min: 0.08, max: 0.3, step: 0.01 },
]

// pull position -> angle + force
const describePull = (pos) => {
  const x = ANCHOR.x - pos.x
  const up = pos.y - ANCHOR.y
  return {
    angle: Math.round((Math.atan2(up, x) * 180) / Math.PI),
    force: Math.round((Math.hypot(x, up) / MAX_DRAG) * 100),
  }
}

// angle + force -> pull position (the reverse)
const pullFromShot = ({ angle, force }) => {
  const d = (force / 100) * MAX_DRAG
  const rad = (angle * Math.PI) / 180
  return { x: ANCHOR.x - d * Math.cos(rad), y: ANCHOR.y + d * Math.sin(rad) }
}

function VectorShotCanvas({ experiment = false, initialSettings, initialShot, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [shot, setShot] = useState({ angle: 0, force: 0 })
  const [knocked, setKnocked] = useState(0)
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)

  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const worldRef = useRef({ engine: null, ball: null, grip: [] })
  const lastShotRef = useRef(
    initialShot && initialShot.angle !== undefined
      ? { angle: initialShot.angle, force: initialShot.force }
      : null
  )
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const streakRef = useRef(0)

  // slider changes update the running physics (declared BEFORE the world effect)
  useEffect(() => {
    settingsRef.current = settings
    const { engine, ball, grip } = worldRef.current
    if (!engine) return
    engine.gravity.y = settings.gravity
    Matter.Body.setDensity(ball, settings.density)
    grip.forEach((b) => {
      b.friction = settings.friction
      b.frictionStatic = settings.friction
    })
  }, [settings])

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter

    setKnocked(0)
    setResult(null)
    setMessage(null)
    setShot({ angle: 0, force: 0 })

    const s0 = settingsRef.current
    const engine = Engine.create()
    engine.gravity.y = s0.gravity

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#0b0f19' },
    })
    render.canvas.style.width = '100%'
    render.canvas.style.height = 'auto'
    render.canvas.style.display = 'block'

    const wall = { isStatic: true, render: { fillStyle: '#7d8489' } }
    const ground = Bodies.rectangle(WIDTH / 2, HEIGHT - 10, WIDTH, 20, {
      ...wall,
      friction: s0.friction,
      frictionStatic: s0.friction,
    })
    const leftWall = Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, wall)
    const rightWall = Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, wall)
    const ceiling = Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, wall)

    const ball = Bodies.circle(ANCHOR.x, ANCHOR.y, 20, {
      restitution: BALL_BOUNCE,
      density: s0.density,
      friction: s0.friction,
      frictionStatic: s0.friction,
      render: { fillStyle: '#5adfff' },
    })

    // Play: taller tower + new position as your streak grows. Experiment: fixed tower.
    const rows = experiment ? 3 : Math.min(5, 3 + Math.floor(streakRef.current / 2))
    const x0 = experiment ? 650 : 540 + Math.floor(Math.random() * 230)
    const groundTop = HEIGHT - 20
    const targets = []
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < rows; row++) {
        const x = x0 + col * BOX
        const y = groundTop - BOX / 2 - row * BOX
        const body = Bodies.rectangle(x, y, BOX, BOX, {
          friction: s0.friction,
          frictionStatic: s0.friction,
          render: { fillStyle: '#f5a623' },
        })
        targets.push({ body, start: { x, y }, counted: false })
      }
    }
    setTotal(targets.length)

    Composite.add(engine.world, [
      ground, leftWall, rightWall, ceiling, ball,
      ...targets.map((t) => t.body),
    ])
    worldRef.current = { engine, ball, grip: [ground, ball, ...targets.map((t) => t.body)] }

    let phase = 'aim' // aim -> flying -> done
    let dragging = false
    let holdPos = { ...ANCHOR }
    let launchTime = 0
    let restSteps = 0
    let lastCount = 0
    let nextTimer = null

    const fire = (angle, force) => {
      if (phase !== 'aim') return
      phase = 'flying'
      dragging = false
      launchTime = engine.timing.timestamp
      launchSettingsRef.current = { ...settingsRef.current }
      lastShotRef.current = { angle, force }
      const d = (force / 100) * MAX_DRAG
      const rad = (angle * Math.PI) / 180
      const p = settingsRef.current.power
      Body.setPosition(ball, pullFromShot({ angle, force }))
      Body.setVelocity(ball, { x: d * p * Math.cos(rad), y: -d * p * Math.sin(rad) })
      setShot({ angle, force })
    }

    const finish = (count) => {
      if (phase === 'done') return
      phase = 'done'
      const all = count === targets.length
      if (experiment) {
        const { angle, force } = lastShotRef.current
        setScore(count * 100)
        setResult({ angle, force, boxesKnocked: count })
        setMessage(`${count} of ${targets.length} knocked`)
        return
      }
      streakRef.current = all ? streakRef.current + 1 : 0
      setStreak(streakRef.current)
      const pts = count * 100 + (all ? 200 : 0)
      setScore((s) => s + pts)
      setMessage(all ? `Cleared! +${pts}` : `${count} of ${targets.length} knocked. +${pts}`)
      nextTimer = setTimeout(() => setRound((r) => r + 1), 1800)
    }

    Events.on(engine, 'beforeUpdate', () => {
      if (phase !== 'aim') return
      Body.setVelocity(ball, { x: 0, y: 0 })
      Body.setAngularVelocity(ball, 0)
      Body.setPosition(ball, holdPos)
    })

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'flying') return
      let count = 0
      targets.forEach((t) => {
        if (!t.counted) {
          const moved = Math.hypot(t.body.position.x - t.start.x, t.body.position.y - t.start.y)
          if (moved > MOVE_THRESHOLD) {
            t.counted = true
            t.body.render.fillStyle = '#5adfff'
          }
        }
        if (t.counted) count++
      })
      if (count !== lastCount) {
        lastCount = count
        setKnocked(count)
      }
      const fastest = Math.max(
        Math.hypot(ball.velocity.x, ball.velocity.y),
        ...targets.map((t) => Math.hypot(t.body.velocity.x, t.body.velocity.y))
      )
      restSteps = fastest < 0.15 ? restSteps + 1 : 0
      if (restSteps > 45 || engine.timing.timestamp - launchTime > 9000) finish(count)
    })

    const getPos = (e) => {
      const rect = render.canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (WIDTH / rect.width),
        y: (e.clientY - rect.top) * (HEIGHT / rect.height),
      }
    }

    const onMouseDown = (e) => {
      if (phase !== 'aim') return
      const p = getPos(e)
      if (Math.hypot(p.x - ball.position.x, p.y - ball.position.y) <= 30) dragging = true
    }

    const onMouseMove = (e) => {
      if (!dragging) return
      const p = getPos(e)
      let dx = p.x - ANCHOR.x
      let dy = p.y - ANCHOR.y
      const dist = Math.hypot(dx, dy)
      if (dist > MAX_DRAG) {
        dx = (dx / dist) * MAX_DRAG
        dy = (dy / dist) * MAX_DRAG
      }
      holdPos = { x: ANCHOR.x + dx, y: ANCHOR.y + dy }
      setShot(describePull(holdPos))
    }

    const onMouseUp = () => {
      if (!dragging) return
      dragging = false
      const { angle, force } = describePull(holdPos)
      if (force < 5) {
        holdPos = { ...ANCHOR }
        setShot({ angle: 0, force: 0 })
        return
      }
      fire(angle, force)
    }

    render.canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.beginPath()
      ctx.arc(ANCHOR.x, ANCHOR.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fill()
      if (dragging) {
        ctx.beginPath()
        ctx.moveTo(ANCHOR.x, ANCHOR.y)
        ctx.lineTo(ball.position.x, ball.position.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 3
        ctx.stroke()
      }
    })

    // Run / Run Again: replay the last shot with the current sliders
    if (((autoRun && round === 0) || pendingRunRef.current) && lastShotRef.current) {
      pendingRunRef.current = false
      fire(lastShotRef.current.angle, lastShotRef.current.force)
    }

    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      worldRef.current = { engine: null, ball: null, grip: [] }
      clearTimeout(nextTimer)
      render.canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
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
    setRound((r) => r + 1)
  }

  const handleResetAll = () => {
    lastShotRef.current = null
    setSettings(DEFAULT_SETTINGS)
    handleTryAgain()
  }

  const handleRun = () => {
    if (!lastShotRef.current) return
    pendingRunRef.current = true
    handleTryAgain()
  }

  return (
    <GameShell
      gameId="vector-shot"
      experiment={experiment}
      stats={[
        { label: 'Angle', value: `${shot.angle}°` },
        { label: 'Force', value: `${shot.force}%` },
        { label: 'Knocked', value: `${knocked}/${total}` },
        ...(experiment ? [] : [{ label: 'Streak', value: streak }]),
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
      hint="Drag the ball back and release to take a shot. Then change one setting and press Run to replay the same shot."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        message && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
            {message}
          </div>
        )
      }
      playHint="Drag the ball back, then release. Knock over every box to clear the round."
    />
  )
}

export default VectorShotCanvas