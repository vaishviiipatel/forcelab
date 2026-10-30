import React, { useState, useEffect, useRef } from 'react';

const generateSystemOrbits = () => {
  return [
    {
      horizontalRadius: 180,
      flatnessRatio: 0.45,
      rotationAngle: 0.2,
      rotationVelocity: 0.002,
      orbitalSpeed: 0.08,
      satellites: [
        { offsetAngle: 0, diameter: 2, hue: '14, 165, 233', opacity: 0.6, isMajorNode: false },
        { offsetAngle: 2.5, diameter: 4, hue: '14, 165, 233', opacity: 0.8, isMajorNode: true }
      ]
    },
    {
      horizontalRadius: 320,
      flatnessRatio: 0.4,
      rotationAngle: -0.4,
      rotationVelocity: -0.001,
      orbitalSpeed: 0.04,
      satellites: [
        { offsetAngle: 1.2, diameter: 3, hue: '99, 102, 241', opacity: 0.7, isMajorNode: false },
        { offsetAngle: 4.8, diameter: 2, hue: '99, 102, 241', opacity: 0.5, isMajorNode: false }
      ]
    },
    {
      horizontalRadius: 480,
      flatnessRatio: 0.35,
      rotationAngle: 0.6,
      rotationVelocity: 0.003,
      orbitalSpeed: 0.02,
      satellites: [
        { offsetAngle: 3.1, diameter: 5, hue: '236, 72, 153', opacity: 0.9, isMajorNode: true }
      ]
    }
  ];
};

function OrbitField() {
  const displayCanvasRef = useRef(null)

  useEffect(() => {
    const drawingCanvas = displayCanvasRef.current
    const renderingContext = drawingCanvas.getContext('2d')
    const activeTracks = generateSystemOrbits()
    const prefersLowMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let canvasWidth = 0
    let canvasHeight = 0
    let renderingScale = 1
    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0
    let animationFrameToken = 0

    const handleContainerResize = () => {
      const parentBounds = drawingCanvas.parentElement.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      
      canvasWidth = parentBounds.width
      canvasHeight = parentBounds.height
      drawingCanvas.width = canvasWidth * pixelRatio
      drawingCanvas.height = canvasHeight * pixelRatio
      
      renderingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderingScale = Math.max(0.6, Math.min(canvasWidth / 1000, 1.2))
      
      if (prefersLowMotion) renderFrame(0)
    }

    const renderFrame = (timestamp) => {
      renderingContext.clearRect(0, 0, canvasWidth, canvasHeight)
      
      currentX += (targetX - currentX) * 0.04
      currentY += (targetY - currentY) * 0.04
      
      const originX = canvasWidth / 2 + currentX
      const originY = canvasHeight * 0.5 + currentY

      activeTracks.forEach((track) => {
        const mappedRadiusX = track.horizontalRadius * renderingScale
        const mappedRadiusY = mappedRadiusX * track.flatnessRatio
        const totalTilt = track.rotationAngle + track.rotationVelocity * timestamp
        const cosineTilt = Math.cos(totalTilt)
        const sineTilt = Math.sin(totalTilt)

        renderingContext.beginPath()
        renderingContext.ellipse(originX, originY, mappedRadiusX, mappedRadiusY, totalTilt, 0, Math.PI * 2)
        renderingContext.strokeStyle = 'rgba(120,190,230,0.10)'
        renderingContext.lineWidth = 1
        renderingContext.stroke()

        track.satellites.forEach((node) => {
          const currentPhase = node.offsetAngle + track.orbitalSpeed * timestamp
          const localizedX = mappedRadiusX * Math.cos(currentPhase)
          const localizedY = mappedRadiusY * Math.sin(currentPhase)
          
          const dynamicX = originX + localizedX * cosineTilt - localizedY * sineTilt
          const dynamicY = originY + localizedX * sineTilt + localizedY * cosineTilt
          const depthMultiplier = 0.7 + 0.3 * ((Math.sin(currentPhase) + 1) / 2)
          
          renderingContext.save()
          if (node.isMajorNode) {
            renderingContext.shadowColor = `rgba(${node.hue},0.9)`
            renderingContext.shadowBlur = 14
          }
          
          renderingContext.beginPath()
          renderingContext.arc(dynamicX, dynamicY, node.diameter * depthMultiplier, 0, Math.PI * 2)
          renderingContext.fillStyle = `rgba(${node.hue},${node.opacity * depthMultiplier})`
          renderingContext.fill()
          renderingContext.restore()
        })
      })
    }

    const triggerAnimationLoop = (currentTime) => {
      animationFrameToken = requestAnimationFrame(triggerAnimationLoop)
      renderFrame(currentTime / 1000)
    }

    const trackMouseMovement = (mouseEvent) => {
      targetX = Math.max(-40, Math.min(40, (window.innerWidth / 2 - mouseEvent.clientX) * 0.03))
      targetY = Math.max(-25, Math.min(25, (window.innerHeight / 2 - mouseEvent.clientY) * 0.03))
    }

    const elementResizeObserver = new ResizeObserver(handleContainerResize)
    elementResizeObserver.observe(drawingCanvas.parentElement)
    handleContainerResize()

    if (!prefersLowMotion) {
      animationFrameToken = requestAnimationFrame(triggerAnimationLoop)
      window.addEventListener('mousemove', trackMouseMovement)
    }

    return () => {
      cancelAnimationFrame(animationFrameToken)
      elementResizeObserver.disconnect()
      window.removeEventListener('mousemove', trackMouseMovement)
    }
  }, [])

  return <canvas ref={displayCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />
}

export default OrbitField;
