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

    let audioCtx: AudioContext
    let analyser: AnalyserNode
    let dataArray: Uint8Array
    let source: MediaStreamAudioSourceNode
    let animationId: number

    const drawFlat = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.strokeStyle = "#d1d5db"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const drawBars = (freqData: Uint8Array) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barWidth = 3
      const barGap = 2
      const barCount = Math.floor(canvas.width / (barWidth + barGap))
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i * freqData.length) / barCount)
        const v = freqData[idx] / 255
        const barHeight = v * canvas.height * 0.8
        ctx.fillStyle = "#2563eb"
        ctx.fillRect(i * (barWidth + barGap), (canvas.height - barHeight) / 2, barWidth, barHeight)
      }
    }

    if (!isActive) {
      drawFlat()
      return
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        audioCtx = new AudioContext()
        source = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        dataArray = new Uint8Array(analyser.frequencyBinCount)
        const loop = () => {
          analyser.getByteFrequencyData(dataArray)
          drawBars(dataArray)
          animationId = requestAnimationFrame(loop)
        }
        loop()
      })
      .catch((err) => {
        console.error("Microphone access error", err)
        drawFlat()
      })

    return () => {
      cancelAnimationFrame(animationId)
      if (audioCtx) audioCtx.close()
    }
  }, [isActive])

  return <canvas ref={canvasRef} width={100} height={40} className="w-full h-full" />
}
