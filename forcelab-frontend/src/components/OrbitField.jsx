import { useEffect, useRef } from 'react'

const COLORS = ['255,255,255', '90,223,255', '130,170,255', '200,215,230']
const rand = (a, b) => a + Math.random() * (b - a)
const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)]

// seven tilted orbit rings, each with dust and a few glowing planets
function buildRings() {
  return Array.from({ length: 7 }, (_, i) => {
    const rx = 150 + i * 70 + rand(-10, 10) // design size, scaled to the screen later
    const bodies = []
    const dust = Math.floor(rand(8, 14))
    for (let k = 0; k < dust; k++) {
      bodies.push({ phase: rand(0, Math.PI * 2), size: rand(0.8, 2.2), color: pick(), alpha: rand(0.35, 0.85), planet: false })
    }
    const planets = Math.random() < 0.6 ? 2 : 1
    for (let k = 0; k < planets; k++) {
      bodies.push({ phase: rand(0, Math.PI * 2), size: rand(3, 5), color: k === 0 ? '90,223,255' : '255,255,255', alpha: 1, planet: true })
    }
    return {
      rx,
      ratio: rand(0.28, 0.55), // how flat the orbit looks
      tilt: rand(0, Math.PI),
      tiltSpeed: rand(-0.025, 0.025), // the orbit plane slowly turns (rad/s)
      speed: (14 / Math.pow(rx, 0.9)) * (Math.random() < 0.5 ? 1 : -1), // outer orbits are slower
      bodies,
    }
  })
}

function OrbitField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rings = buildRings()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let scale = 1
    let ox = 0
    let oy = 0
    let tx = 0
    let ty = 0
    let raf = 0

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      ox += (tx - ox) * 0.04
      oy += (ty - oy) * 0.04
      const cx = w / 2 + ox
      const cy = h * 0.5 + oy

      rings.forEach((r) => {
        const rx = r.rx * scale
        const ry = rx * r.ratio
        const tilt = r.tilt + r.tiltSpeed * t
        const cT = Math.cos(tilt)
        const sT = Math.sin(tilt)

        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, tilt, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(120,190,230,0.10)'
        ctx.lineWidth = 1
        ctx.stroke()

        r.bodies.forEach((b) => {
          const a = b.phase + r.speed * t
          const lx = rx * Math.cos(a)
          const ly = ry * Math.sin(a)
          const x = cx + lx * cT - ly * sT
          const y = cy + lx * sT + ly * cT
          const depth = 0.7 + 0.3 * ((Math.sin(a) + 1) / 2) // the far side is smaller and dimmer
          ctx.save()
          if (b.planet) {
            ctx.shadowColor = `rgba(${b.color},0.9)`
            ctx.shadowBlur = 14
          }
          ctx.beginPath()
          ctx.arc(x, y, b.size * depth, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${b.color},${b.alpha * depth})`
          ctx.fill()
          ctx.restore()
        })
      })
    }

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scale = Math.max(0.6, Math.min(w / 1000, 1.2))
      if (reduce) draw(0)
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      draw(now / 1000)
    }

    const onMove = (e) => {
      tx = Math.max(-40, Math.min(40, (window.innerWidth / 2 - e.clientX) * 0.03))
      ty = Math.max(-25, Math.min(25, (window.innerHeight / 2 - e.clientY) * 0.03))
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas.parentElement)
    resize()

    if (!reduce) {
      raf = requestAnimationFrame(loop)
      window.addEventListener('mousemove', onMove)
    }

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />
}

export default OrbitField