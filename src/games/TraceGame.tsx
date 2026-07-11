import { useEffect, useRef, useState } from 'react'

const H = 380
const PATH_WIDTH = 46
const TOLERANCE = PATH_WIDTH / 2
const POINTS = 150

function buildPath(W: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < POINTS; i++) {
    const t = i / (POINTS - 1)
    const x = W / 2 + (W / 2 - 44) * Math.sin(t * Math.PI * 3)
    const y = 34 + t * (H - 68)
    pts.push({ x, y })
  }
  return pts
}

/** Drag a finger along the curve; value = accuracy% × coverage (0–100, higher = better). */
export function TraceGame({ onFinish }: { onFinish: (value: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [W] = useState(() => Math.min(340, Math.max(280, window.innerWidth - 40)))
  const ptsRef = useRef(buildPath(W))
  const run = useRef({ tracking: false, started: false, progress: 0, good: 0, bad: 0, finished: false })
  const [hint, setHint] = useState('Przyłóż palec do zielonego punktu i jedź po ścieżce')

  useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    drawBase(ctx)
  }, [])

  function drawBase(ctx: CanvasRenderingContext2D) {
    const pts = ptsRef.current
    ctx.clearRect(0, 0, W, H)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.lineWidth = PATH_WIDTH
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 8])
    ctx.stroke()
    ctx.setLineDash([])
    dot(ctx, pts[0], '#34D399', 12)
    dot(ctx, pts[pts.length - 1], '#F5A524', 12)
  }

  function dot(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, color: string, r: number) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  function localPoint(e: React.PointerEvent): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
  }

  function finish() {
    const r = run.current
    if (r.finished) return
    r.finished = true
    const pts = ptsRef.current
    const coverage = r.progress / (pts.length - 1)
    const total = r.good + r.bad
    const accuracy = total > 0 ? r.good / total : 0
    onFinish(Math.round(accuracy * coverage * 100))
  }

  function onDown(e: React.PointerEvent) {
    const p = localPoint(e)
    const start = ptsRef.current[0]
    if (Math.hypot(p.x - start.x, p.y - start.y) < 30) {
      run.current.tracking = true
      run.current.started = true
      try {
        canvasRef.current!.setPointerCapture(e.pointerId)
      } catch {
        // pointer capture unavailable (e.g. synthetic events) — tracking still works
      }
      setHint('Jedź do pomarańczowego punktu — nie zjeżdżaj ze ścieżki')
    }
  }

  function onMove(e: React.PointerEvent) {
    const r = run.current
    if (!r.tracking || r.finished) return
    const p = localPoint(e)
    const pts = ptsRef.current
    const ctx = canvasRef.current!.getContext('2d')!
    // search a forward window from current progress
    let best = r.progress
    let bestD = Infinity
    const end = Math.min(pts.length - 1, r.progress + 14)
    for (let i = Math.max(0, r.progress - 3); i <= end; i++) {
      const d = Math.hypot(p.x - pts[i].x, p.y - pts[i].y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (bestD <= TOLERANCE) {
      r.good++
      r.progress = Math.max(r.progress, best)
      dot(ctx, p, 'rgba(52,211,153,0.85)', 5)
    } else {
      r.bad++
      dot(ctx, p, 'rgba(248,113,113,0.85)', 5)
    }
    if (r.progress >= pts.length - 3) finish()
  }

  function onUp() {
    if (run.current.started && !run.current.finished) finish()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted text-center">{hint}</p>
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H, touchAction: 'none' }}
        className="rounded-2xl bg-card2 border border-line"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  )
}
