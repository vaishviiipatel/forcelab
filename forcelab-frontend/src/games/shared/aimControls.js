// Shared aiming for launch-style games.
// Play mode: move the mouse to aim, hold to charge, release to fire.
// Experiment mode: the sliders set angle + force exactly, a click on the canvas fires.

const MIN_ANGLE = 5
const MAX_ANGLE = 85
const MIN_FORCE = 10
const CHARGE_MS = 1500 // time to charge from 0% to 100%

export function createAimControls({
  canvas,
  origin,
  width,
  height,
  experiment,
  getSettings,
  canAim,
  onFire,
}) {
  let aimAngle = 40
  let charging = false
  let chargeStart = 0

  const chargeNow = () =>
    Math.min(1, (performance.now() - chargeStart) / CHARGE_MS) * 100

  // screen pixels -> game coordinates (works at any canvas size, including fullscreen)
  const toGame = (e) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    }
  }

  const onMove = (e) => {
    if (experiment || !canAim()) return
    const p = toGame(e)
    const angle = (Math.atan2(origin.y - p.y, p.x - origin.x) * 180) / Math.PI
    aimAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle))
  }

  const onDown = () => {
    if (!canAim()) return
    if (experiment) {
      const s = getSettings()
      onFire(s.launchAngle, s.power)
    } else {
      charging = true
      chargeStart = performance.now()
    }
  }

  const onUp = () => {
    if (!charging) return
    const force = Math.max(MIN_FORCE, chargeNow())
    charging = false
    onFire(aimAngle, force)
  }

  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)

  return {
    // what the aim line should show right now
    current() {
      if (experiment) {
        const s = getSettings()
        return { angle: s.launchAngle, force: s.power }
      }
      return { angle: aimAngle, force: charging ? chargeNow() : 0 }
    },
    destroy() {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    },
  }
}

// Draws the dashed aim line, the angle/force text and (play mode) the charge bar
export function drawAim(ctx, origin, aim, showChargeBar) {
  const rad = (aim.angle * Math.PI) / 180
  const len = 30 + (aim.force / 100) * 90

  ctx.save()
  ctx.setLineDash([6, 6])
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(origin.x + len * Math.cos(rad), origin.y - len * Math.sin(rad))
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '14px monospace'
  ctx.fillText(`${Math.round(aim.angle)}°  ${Math.round(aim.force)}%`, origin.x - 20, origin.y - 120)

  if (showChargeBar) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(origin.x - 40, origin.y + 30, 80, 8)
    ctx.fillStyle = '#5adfff'
    ctx.fillRect(origin.x - 40, origin.y + 30, (aim.force / 100) * 80, 8)
  }
  ctx.restore()
}