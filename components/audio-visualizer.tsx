"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  isActive: boolean
}

export default function AudioVisualizer({ isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const draw = () => {
      if (!isActive) {
        // Draw flat line when inactive
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.strokeStyle = "#d1d5db"
        ctx.lineWidth = 2
        ctx.stroke()
        return
      }

      // Draw active visualization
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = 3
      const barGap = 2
      const barCount = Math.floor(canvas.width / (barWidth + barGap))

      for (let i = 0; i < barCount; i++) {
        // Generate random height for each bar
        const height = Math.random() * canvas.height * 0.8

        ctx.fillStyle = "#2563eb"
        ctx.fillRect(i * (barWidth + barGap), (canvas.height - height) / 2, barWidth, height)
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isActive])

  return <canvas ref={canvasRef} width={100} height={40} className="w-full h-full" />
}
