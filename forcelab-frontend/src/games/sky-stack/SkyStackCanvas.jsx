import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import GameShell from '../../components/GameShell'

const WIDTH = 900
const HEIGHT = 500
const PLATFORM_Y = HEIGHT - 60
const PLATFORM_TOP = PLATFORM_Y - 10
const BLOCK_W = 100
const BLOCK_H = 26
const CRANE_Y = 50
const CRANE_RANGE = 300
const DROP_COOLDOWN = 600
const AUTO_GAP = 1100
const AUTO_OFFSETS = [0, 14, -12, 20, -16, 10, -8, 18, -14, 12] // experiment: same 10 drops every Run
const PX_PER_METER = 50
const COLORS = ['#5adfff', '#f5a623', '#7ee787', '#c58bff', '#ff7b9c']

const DEFAULT_SETTINGS = { gravity: 1, density: 0.004, friction: 0.5, bounce: 0.1 }

const CONTROLS = [
  { key: 'gravity', label: 'Gravity', min: 0.1, max: 2, step: 0.05 },
  { key: 'density', label: 'Block Mass', min: 0.001, max: 0.01, step: 0.001 },
  { key: 'friction', label: 'Friction', min: 0, max: 1, step: 0.05 },
  { key: 'bounce', label: 'Restitution', min: 0, max: 1, step: 0.05 },
]

function SkyStackCanvas({ experiment = false, initialSettings, autoRun }) {
  const containerRef = useRef(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [blocks, setBlocks] = useState(0)
  const [goal, setGoal] = useState(0)
  const [height, setHeight] = useState(0)
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)

  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings })
  const settingsRef = useRef(settings)
  const worldRef = useRef({ engine: null, platform: null, dropped: [] })
  const pendingRunRef = useRef(false)
  const launchSettingsRef = useRef(null)
  const streakRef = useRef(0)

  // slider changes update the running physics (declared BEFORE the world effect)
  useEffect(() => {
    settingsRef.current = settings
    const { engine, platform, dropped } = worldRef.current
    if (!engine) return
    engine.gravity.y = settings.gravity
    platform.friction = settings.friction
    platform.frictionStatic = settings.friction
    dropped.forEach((b) => {
      Matter.Body.setDensity(b, settings.density)
      b.friction = settings.friction
      b.frictionStatic = settings.friction
      b.restitution = settings.bounce
    })
  }, [settings])

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Events } = Matter

    // Play: more blocks, a smaller platform and a faster swing as your streak grows
    const level = experiment ? 0 : streakRef.current
    const goalN = experiment ? AUTO_OFFSETS.length : Math.min(10, 4 + level)
    const platW = experiment ? 240 : Math.max(150, 240 - level * 15)
    const swing = experiment ? 700 : Math.max(380, 700 - level * 40)

    setBlocks(0)
    setHeight(0)
    setResult(null)
    setMessage(null)
    setGoal(goalN)

    const s0 = settingsRef.current
    const engine = Engine.create()
    engine.gravity.y = s0.gravity
    engine.positionIterations = 10
    engine.velocityIterations = 8

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#0b0f19' },
    })
    render.canvas.style.width = '100%'
    render.canvas.style.height = 'auto'
    render.canvas.style.display = 'block'
    render.canvas.style.cursor = 'pointer'

    const platform = Bodies.rectangle(WIDTH / 2, PLATFORM_Y, platW, 20, {
      isStatic: true,
      friction: s0.friction,
      frictionStatic: s0.friction,
      render: { fillStyle: '#7d8489' },
    })
    Composite.add(engine.world, platform)

    const dropped = []
    const landed = new Set()
    worldRef.current = { engine, platform, dropped }

    let phase = experiment ? 'ready' : 'running' // ready -> running -> done
    let craneX = WIDTH / 2
    let lastDrop = -5000
    let drops = 0
    let maxHeight = 0
    let settle = 0
    let auto = false
    let nextTimer = null

    const ready = () => engine.timing.timestamp - lastDrop > DROP_COOLDOWN

    const dropAt = (x) => {
      const s = settingsRef.current
      const block = Bodies.rectangle(x, CRANE_Y, BLOCK_W, BLOCK_H, {
        density: s.density,
        friction: s.friction,
        frictionStatic: s.friction,
        restitution: s.bounce,
        render: { fillStyle: COLORS[drops % COLORS.length], strokeStyle: '#0b0f19', lineWidth: 2 },
      })
      dropped.push(block)
      Composite.add(engine.world, block)
      drops++
      lastDrop = engine.timing.timestamp
    }

    const startRun = () => {
      if (phase !== 'ready') return
      phase = 'running'
      auto = true
      launchSettingsRef.current = { ...settingsRef.current }
      lastDrop = engine.timing.timestamp - AUTO_GAP + 300
      setMessage(null)
    }

    const endPlay = (ok) => {
      if (phase === 'done') return
      phase = 'done'
      if (ok) {
        streakRef.current += 1
        setScore((s) => s + 200)
        setMessage('Tower stands! +200')
      } else {
        streakRef.current = 0
        setMessage('Tower fell! Starting over')
      }
      setStreak(streakRef.current)
      nextTimer = setTimeout(() => setRound((r) => r + 1), 1800)
    }

    const endExperiment = (fell) => {
      if (phase === 'done') return
      phase = 'done'
      const standing = landed.size
      setScore(standing * 100)
      setResult({ blocks: standing, height: maxHeight })
      setMessage(fell ? `A block fell. ${standing} standing` : `${standing} blocks · ${maxHeight} m`)
    }

    Events.on(engine, 'beforeUpdate', () => {
      if (phase === 'done') return
      const t = engine.timing.timestamp
      craneX = WIDTH / 2 + Math.sin(t / swing) * CRANE_RANGE
      if (auto && drops < AUTO_OFFSETS.length && t - lastDrop > AUTO_GAP) {
        dropAt(WIDTH / 2 + AUTO_OFFSETS[drops])
      }
    })

    // a block "lands" the first time it touches the platform or a landed block
    Events.on(engine, 'collisionStart', (e) => {
      if (phase !== 'running') return
      e.pairs.forEach(({ bodyA, bodyB }) => {
        ;[[bodyA, bodyB], [bodyB, bodyA]].forEach(([b, other]) => {
          if (!dropped.includes(b) || landed.has(b)) return
          if (other === platform || landed.has(other)) {
            landed.add(b)
            setBlocks(landed.size)
            setScore((s) => s + 100)
          }
        })
      })
    })

    Events.on(engine, 'afterUpdate', () => {
      if (phase !== 'running') return

      let fell = false
      for (let i = dropped.length - 1; i >= 0; i--) {
        const b = dropped[i]
        if (b.position.y > HEIGHT + 60) {
          Composite.remove(engine.world, b)
          dropped.splice(i, 1)
          landed.delete(b)
          fell = true
        }
      }

      landed.forEach((b) => {
        const moved = Math.hypot(b.position.x - b.positionPrev.x, b.position.y - b.positionPrev.y)
        if (moved > 0.3) return
        const h = Math.round(((PLATFORM_TOP - b.bounds.min.y) / PX_PER_METER) * 10) / 10
        if (h > maxHeight) {
          maxHeight = h
          setHeight(h)
        }
      })

      if (fell) {
        if (experiment) endExperiment(true)
        else endPlay(false)
        return
      }

      // done once every block is dropped, landed, and still
      if (drops < goalN || landed.size < dropped.length) {
        settle = 0
        return
      }
      const fastest = Math.max(...dropped.map((b) => Math.hypot(b.velocity.x, b.velocity.y)))
      settle = fastest < 0.15 ? settle + 1 : 0
      if (settle > 50) {
        if (experiment) endExperiment(false)
        else endPlay(true)
      }
    })

    const onClick = () => {
      if (phase === 'ready') {
        startRun()
        return
      }
      if (experiment || phase !== 'running' || drops >= goalN || !ready()) return
      dropAt(craneX)
    }
    render.canvas.addEventListener('mousedown', onClick)

    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.save()
      if (!experiment && phase === 'running' && drops < goalN && ready()) {
        ctx.setLineDash([6, 6])
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.strokeRect(craneX - BLOCK_W / 2, CRANE_Y - BLOCK_H / 2, BLOCK_W, BLOCK_H)
        ctx.beginPath()
        ctx.moveTo(craneX, CRANE_Y + BLOCK_H / 2)
        ctx.lineTo(craneX, PLATFORM_TOP)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.stroke()
      }
      if (experiment && phase === 'ready') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = '14px monospace'
        ctx.fillText('Press Run', WIDTH / 2 - 36, 60)
      }
      ctx.restore()
    })

    if (experiment && ((autoRun && round === 0) || pendingRunRef.current)) {
      pendingRunRef.current = false
      startRun()
    }

    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      worldRef.current = { engine: null, platform: null, dropped: [] }
      clearTimeout(nextTimer)
      render.canvas.removeEventListener('mousedown', onClick)
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
    setSettings(DEFAULT_SETTINGS)
    handleTryAgain()
  }

  const handleRun = () => {
    pendingRunRef.current = true
    handleTryAgain()
  }

  return (
    <GameShell
      gameId="sky-stack"
      experiment={experiment}
      stats={[
        { label: 'Blocks', value: `${blocks}/${goal}` },
        { label: 'Height', value: `${height} m` },
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
      hint="Run drops 10 blocks automatically in the same pattern, so you can compare settings fairly. Change one setting at a time."
      canSave={result !== null}
      getSaveData={() => ({ settings: { ...launchSettingsRef.current }, result })}
      overlay={
        message && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-5 py-2 font-rajdhani text-xl text-white">
            {message}
          </div>
        )
      }
      playHint="Click to drop the swinging block. Place every block without a fall to clear the round."
    />
  )
}

export default SkyStackCanvas