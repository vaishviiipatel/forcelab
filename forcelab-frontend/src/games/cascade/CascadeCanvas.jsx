import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const FLOOR_TOP = 440
const DOM_W = 12
const DOM_H = 70
const TARGET_H = 100
const EXP_COUNT = 8
const EXP_FIRST_X = 110
const MAX_PLAY = 8 // dominoes you can place in play mode
const MIN_X = 70
const MIN_GAP = 22 // closest two placed dominoes can be (centre to centre, px)
const FALLEN_ANGLE = 1.2 // rad: a domino tilted past this counts as fallen
const TIP_SPIN = 0.03 // the first domino's starting spin (rad per step)

const DEFAULT_SETTINGS = { gravity: 1, mass: 1, friction: 0.5, spacing: 50 }

const CONTROLS = [
  { key: 'gravity', label: 'Gravity', min: 0.2, max: 2, step: 0.05 },
  { key: 'mass', label: 'Domino Mass', min: 0.2, max: 3, step: 0.1 },
  { key: 'friction', label: 'Friction', min: 0.05, max: 1, step: 0.05 },
  { key: 'spacing', label: 'Domino Spacing', min: 25, max: 90, step: 1 },
]

function CascadeCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [goals, setGoals] = useState(0)
  const [fell, setFell] = useState(0)
  const [placedCount, setPlacedCount] = useState(0)
  const [phaseUi, setPhaseUi] = useState(experiment ? 'ready' : 'build')
  const [result, setResult] = useState(null) // experiment: filled when the chain has stopped
  const [message, setMessage] = useState(null)

  // saved settings (if any) overwrite the defaults
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const spacingRef = useRef(settings.spacing)
  const worldRef = useRef({ engine: null, floor: null, dominoes: [] })
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const goalsRef = useRef(0)
  const pushRef = useRef(() => {})
  const undoRef = useRef(() => {})

  // Slider changes update the running physics without rebuilding the world.
  // (Declared BEFORE the world effect so a new round always sees the latest values.)
  useEffect(() => {
    settingsRef.current = settings
    const { engine, floor, dominoes } = worldRef.current
    if (engine) {
      engine.gravity.y = settings.gravity
      floor.friction = settings.friction
      floor.frictionStatic = settings.friction
      dominoes.forEach((d) => {
        d.friction = settings.friction
        d.frictionStatic = settings.friction
        Matter.Body.setMass(d, settings.mass)
      })
    }
    // a new spacing needs the dominoes laid out again
    if (experiment && spacingRef.current !== settings.spacing) {
      spacingRef.current = settings.spacing
      setRound((r) => r + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  // Build the physics world (re-runs whenever `round` changes)
  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter

    setMessage(null)
    setResult(null)
    setFell(0)
    setPlacedCount(0)
    setPhaseUi(experiment ? 'ready' : 'build')

    const s0 = settingsRef.current
    const engine = Engine.create()
    engine.gravity.y = s0.gravity
    engine.positionIterations = 10 // steadier standing dominoes
    engine.velocityIterations = 8

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#0b0f19' },
    })
    render.canvas.style.width = '100%'
    render.canvas.style.height = 'auto'
    render.canvas.style.display = 'block'
    render.canvas.style.cursor = experiment ? 'pointer' : 'crosshair'

    const floor = Bodies.rectangle(WIDTH / 2, FLOOR_TOP + 30, WIDTH, 60, {
      isStatic: true,
      friction: s0.friction,
      frictionStatic: s0.friction,
      render: { fillStyle: '#7d8489' },
    })
    const wall = { isStatic: true, render: { fillStyle: '#7d8489' } }
    const leftWall = Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, wall)
    const rightWall = Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, wall)
    const ceiling = Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, wall)
    Composite.add(engine.world, [floor, leftWall, rightWall, ceiling])

    const dominoes = [] // every domino body (used by the sliders)
    const chain = [] // the dominoes that start the chain, left to right
    worldRef.current = { engine, floor, dominoes }

    const makeDomino = (x, h, color) => {
      const s = settingsRef.current
      const body = Bodies.rectangle(x, FLOOR_TOP - h / 2 - 0.5, DOM_W, h, {
        friction: s.friction,
        frictionStatic: s.friction,
        restitution: 0.05,
        render: { fillStyle: color, strokeStyle: '#0b0f19', lineWidth: 2 },
      })
      Body.setMass(body, s.mass)
      Composite.add(engine.world, body)
      dominoes.push(body)
      return body
    }

    // Play: the orange target gets farther away after every goal.
    const targetX = experiment ? WIDTH : Math.min(640, 440 + goalsRef.current * 50)
    const target = experiment ? null : makeDomino(targetX, TARGET_H, '#f5a623')

    // Experiment: a fixed row of dominoes at the chosen spacing
    if (experiment) {
      for (let i = 0; i < EXP_COUNT; i++) {
        chain.push(makeDomino(EXP_FIRST_X + i * s0.spacing, DOM_H, '#5adfff'))
      }
    }

    let phase = experiment ? 'ready' : 'build' // build/ready -> running -> done
    const placed = [] // play mode: x positions the player has chosen
    let ghostX = null
    let runStart = 0
    let settleSteps = 0
    let lastFall = 0
    let nextTimer = null
    const fallen = new Set()

    const tipFirst = () => {
      const first = chain[0]
      Body.setAngularVelocity(first, TIP_SPIN) // the same small push every time
      Body.setVelocity(first, { x: 0.4, y: 0 })
    }

    // Experiment: start the run
    const startRun = () => {
      if (phase !== 'ready') return
      phase = 'running'
      runStart = engine.timing.timestamp
      launchSettingsRef.current = { ...settingsRef.current } // what this run really used
      setPhaseUi('running')
      setMessage(null)
      tipFirst()
    }

    // Play: turn the placed dominoes into real bodies, then tip the first one
    pushRef.current = () => {
      if (phase !== 'build' || placed.length === 0) return
      phase = 'running'
      runStart = engine.timing.timestamp
      setPhaseUi('running')
      ;[...placed].sort((a, b) => a - b).forEach((x) => chain.push(makeDomino(x, DOM_H, '#5adfff')))
      tipFirst()
    }
    undoRef.current = () => {
      if (phase !== 'build') return
      placed.pop()
      setPlacedCount(placed.length)
    }

    const finishExperiment = () => {
      if (phase === 'done') return
      phase = 'done'
      setPhaseUi('done')
      const n = fallen.size
      const chainTime = lastFall > 0 ? Math.round((lastFall / 1000) * 10) / 10 : 0
      setResult({ dominoesFallen: n, chainTime })
      setScore(n * 100 + (n === chain.length ? 200 : 0))
      setMessage(n === chain.length ? 'Full chain!' : `${n} of ${chain.length} fell`)
    }

    const finishPlay = (success) => {
      if (phase === 'done') return
      phase = 'done'
      setPhaseUi('done')
      if (success) {
        goalsRef.current += 1
        setGoals(goalsRef.current)
        const pts = 300 + (MAX_PLAY - placed.length) * 50 // fewer dominoes = more points
        setScore((s) => s + pts)
        setMessage(`Target down! +${pts}`)
      } else {
        setMessage(`The chain stopped after ${fallen.size} domino${fallen.size === 1 ? '' : 'es'}. Try again.`)
      }
      nextTimer = setTimeout(() => setRound((r) => r + 1), 1800)
    }

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'running') return
      const t = engine.timing.timestamp - runStart

      // which dominoes have fallen?
      chain.forEach((d, i) => {
        if (!fallen.has(i) && Math.abs(d.angle) > FALLEN_ANGLE) {
          fallen.add(i)
          lastFall = t
          setFell(fallen.size)
        }
      })

      if (!experiment && Math.abs(target.angle) > FALLEN_ANGLE) {
        finishPlay(true)
        return
      }

      // has everything stopped moving?
      let moving = 0
      dominoes.forEach((d) => {
        moving = Math.max(moving, Math.hypot(d.velocity.x, d.velocity.y), Math.abs(d.angularVelocity) * 30)
      })
      settleSteps = moving < 0.03 ? settleSteps + 1 : 0

      if ((settleSteps > 50 && t > 800) || t > 10000) {
        if (experiment) finishExperiment()
        else finishPlay(false)
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
    const valid = (x) =>
      x >= MIN_X && x <= targetX - 26 && placed.every((p) => Math.abs(p - x) >= MIN_GAP)

    const onMove = (e) => {
      ghostX = toGame(e).x
    }
    const onLeave = () => {
      ghostX = null
    }
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
    render.canvas.addEventListener('mousemove', onMove)
    render.canvas.addEventListener('mouseleave', onLeave)
    render.canvas.addEventListener('mousedown', onDown)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.save()
      ctx.font = '12px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'

      if (!experiment) ctx.fillText('TARGET', targetX - 24, FLOOR_TOP - TARGET_H - 10)

      if (phase === 'build') {
        // the dominoes placed so far
        ctx.fillStyle = '#5adfff'
        ctx.strokeStyle = '#0b0f19'
        ctx.lineWidth = 2
        placed.forEach((x) => {
          ctx.fillRect(x - DOM_W / 2, FLOOR_TOP - DOM_H, DOM_W, DOM_H)
          ctx.strokeRect(x - DOM_W / 2, FLOOR_TOP - DOM_H, DOM_W, DOM_H)
        })
        // the gap between neighbours, so spacing is easy to see
        const sorted = [...placed].sort((a, b) => a - b)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1] - DOM_W
          ctx.fillText(`${gap}`, (sorted[i] + sorted[i - 1]) / 2 - 8, FLOOR_TOP - DOM_H - 8)
        }
        // preview under the mouse
        if (ghostX !== null && placed.length < MAX_PLAY) {
          ctx.setLineDash([5, 5])
          ctx.lineWidth = 2
          ctx.strokeStyle = valid(ghostX) ? 'rgba(126,231,135,0.9)' : 'rgba(255,92,92,0.9)'
          ctx.strokeRect(ghostX - DOM_W / 2, FLOOR_TOP - DOM_H, DOM_W, DOM_H)
          ctx.setLineDash([])
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = '14px monospace'
        ctx.fillText('Click the floor to place dominoes, then press Push', 24, 30)
      }
      if (phase === 'ready') {
        ctx.font = '14px monospace'
        ctx.fillText('Press Run', EXP_FIRST_X - 30, FLOOR_TOP - DOM_H - 14)
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
      worldRef.current = { engine: null, floor: null, dominoes: [] }
      pushRef.current = () => {}
      undoRef.current = () => {}
      clearTimeout(nextTimer)
      render.canvas.removeEventListener('mousemove', onMove)
      render.canvas.removeEventListener('mouseleave', onLeave)
      render.canvas.removeEventListener('mousedown', onDown)
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
    setFell(0)
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
      hint="Press Run. The first domino gets the same small push every time. Spacing is the distance between domino centres, in px."
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
      playHint="Click the floor to place up to 8 dominoes between the left edge and the orange target, then press Push. Each domino must be able to reach the next."
    />
  )
}

export default CascadeCanvas