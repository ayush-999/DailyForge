"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function BackgroundStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      radius: number

      constructor() {
        // @ts-ignore
        this.x = Math.random() * canvas.width
        // @ts-ignore
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.radius = Math.random() * 1.5 + 0.5
      }

      update() {
        // @ts-ignore
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx
        // @ts-ignore
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy

        this.x += this.vx
        this.y += this.vy
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        const isDark = resolvedTheme === "dark"
        ctx.fillStyle = isDark ? "rgba(99, 102, 241, 0.5)" : "rgba(79, 70, 229, 0.3)" // Indigo colored stars
        ctx.fill()
      }
    }

    const initParticles = () => {
      particles = []
      // Increase divisor for fewer particles, decrease for more
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 12000)
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle())
      }
    }

    const drawLines = () => {
      if (!ctx) return
      const isDark = resolvedTheme === "dark"
      // Use indigo colors for lines too
      const colorRGB = isDark ? "99, 102, 241" : "79, 70, 229"

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${colorRGB}, ${0.15 * (1 - distance / 150)})`
            ctx.lineWidth = 1
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((particle) => {
        particle.update()
        particle.draw()
      })
      
      drawLines()
      
      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()
    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"
    />
  )
}
