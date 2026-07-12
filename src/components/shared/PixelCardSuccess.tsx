import { useEffect, useRef } from "react";
import "./PixelCardSuccess.css";

type Phase = "appear" | "fade";

const CONFIG = {
  gap: 3,
  speed: 110,
  intensity: 0.95,
  delaySpread: 0.2,
  fpsCap: 120,
  minPixelSize: 0.5,
  maxPixelSize: 1.6,
  growthRandomness: 0.35,
  shrinkSpeed: 0.65,
  canvasOpacity: 1,
  activeDuration: 200,
  fadeMs: 1300,
  colors: ["#e5e0f0", "#b9addb", "#28185a"],
};

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

class Pixel {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  size = 0;
  minSize = CONFIG.minPixelSize;
  maxSize = CONFIG.maxPixelSize;
  sizeStep: number;
  shimmerSpeed: number;
  delay: number;
  counter = 0;
  counterStep: number;
  isReverse = false;
  isIdle = false;
  hasAppeared = false;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    delay: number
  ) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.color = color;
    this.delay = delay;
    this.sizeStep =
      (0.05 + Math.random() * CONFIG.growthRandomness) * CONFIG.intensity;
    this.shimmerSpeed =
      (0.001 * CONFIG.speed) *
      (0.1 + Math.random() * 0.8) *
      CONFIG.intensity;
    this.counterStep =
      Math.random() * 4 + (canvas.width + canvas.height) * 0.01;
  }

  draw(alpha: number) {
    if (this.size <= 0 || alpha <= 0) return;
    const offset = CONFIG.maxPixelSize * 0.5 - this.size * 0.5;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + offset, this.y + offset, this.size, this.size);
  }

  appear(alpha: number) {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size < this.maxSize) {
      this.size += this.sizeStep;
      if (this.size >= this.maxSize) {
        this.size = this.maxSize;
        this.hasAppeared = true;
      }
    } else {
      this.shimmer();
    }
    this.draw(alpha);
  }

  fade(alpha: number, fadeProgress: number) {
    this.isIdle = false;
    if (!this.hasAppeared && this.size < this.maxSize) {
      this.size += this.sizeStep * 0.5;
    } else {
      this.shimmer();
    }
    const lateFade = smoothstep((fadeProgress - 0.45) / 0.55);
    const shrinkAmount = CONFIG.shrinkSpeed * 0.012 * lateFade;
    this.size -= shrinkAmount;
    if (this.size <= 0 || alpha <= 0.001) {
      this.size = 0;
      this.isIdle = true;
      return;
    }
    this.draw(alpha);
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.shimmerSpeed;
    } else {
      this.size += this.shimmerSpeed;
    }
    this.size = Math.max(this.minSize, Math.min(this.maxSize, this.size));
  }
}

export default function PixelCardSuccess() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("appear");
  const startTimeRef = useRef(0);
  const previousTimeRef = useRef(0);

  function initPixels() {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pixels: Pixel[] = [];
    for (let x = 0; x < width; x += CONFIG.gap) {
      for (let y = 0; y < height; y += CONFIG.gap) {
        const color =
          CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = distance * CONFIG.delaySpread;
        pixels.push(new Pixel(canvas, ctx, x, y, color, delay));
      }
    }
    pixelsRef.current = pixels;
  }

  function animate(time: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const frameInterval = 1000 / CONFIG.fpsCap;
    const timePassed = time - previousTimeRef.current;
    if (timePassed < frameInterval) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    previousTimeRef.current = time - (timePassed % frameInterval);
    const cssWidth = canvas.width / Math.min(window.devicePixelRatio || 1, 2);
    const cssHeight = canvas.height / Math.min(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    const elapsed = time - startTimeRef.current;
    if (phaseRef.current === "appear" && elapsed >= CONFIG.activeDuration) {
      phaseRef.current = "fade";
      startTimeRef.current = time;
    }
    let alpha = CONFIG.canvasOpacity;
    let fadeProgress = 0;
    if (phaseRef.current === "fade") {
      fadeProgress = Math.min((time - startTimeRef.current) / CONFIG.fadeMs, 1);
      const eased = smoothstep(fadeProgress);
      alpha = CONFIG.canvasOpacity * (1 - eased);
    }
    let allIdle = true;
    for (const pixel of pixelsRef.current) {
      if (phaseRef.current === "appear") {
        pixel.appear(alpha);
      } else {
        pixel.fade(alpha, fadeProgress);
      }
      if (!pixel.isIdle) allIdle = false;
    }
    ctx.globalAlpha = 1;
    if (phaseRef.current === "fade" && allIdle) {
      return;
    }
    animationRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    initPixels();
    const observer = new ResizeObserver(() => {
      initPixels();
      phaseRef.current = "appear";
      startTimeRef.current = performance.now();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    startTimeRef.current = performance.now();
    previousTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="pixel-card-success">
      <canvas ref={canvasRef} className="pixel-canvas-success" />
    </div>
  );
}
