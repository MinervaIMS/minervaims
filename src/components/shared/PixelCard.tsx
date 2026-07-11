import { useEffect, useRef } from 'react';
import './PixelCard.css';

// =====================================================================
// PixelCard — adapted from @react-bits/PixelCard. Instead of reacting to
// hover/focus, it AUTO-PLAYS: on mount the pixels "appear" (the card fills
// up) for ~3 seconds, then the animation reverses ("disappear"). Used for
// the application-submitted success screen.
// =====================================================================

type AnimName = 'appear' | 'disappear';

class Pixel {
  width: number; height: number; ctx: CanvasRenderingContext2D;
  x: number; y: number; color: string; speed: number;
  size: number; sizeStep: number; minSize: number; maxSizeInteger: number; maxSize: number;
  delay: number; counter: number; counterStep: number;
  isIdle: boolean; isReverse: boolean; isShimmer: boolean;

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, x: number, y: number, color: string, speed: number, delay: number) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;
  const parsed = value;
  if (parsed <= min || reducedMotion) return min;
  if (parsed >= max) return max * throttle;
  return parsed * throttle;
}

interface VariantCfg { gap: number; speed: number; colors: string; }

const VARIANTS: Record<string, VariantCfg> = {
  default: { gap: 5, speed: 35, colors: '#f8fafc,#f1f5f9,#cbd5e1' },
  blue: { gap: 10, speed: 25, colors: '#e0f2fe,#7dd3fc,#0ea5e9' },
  yellow: { gap: 3, speed: 20, colors: '#fef08a,#fde047,#eab308' },
  pink: { gap: 6, speed: 80, colors: '#fecdd3,#fda4af,#e11d48' },
  // Minerva navy accent to match the brand.
  navy: { gap: 5, speed: 40, colors: '#e5e0f0,#b9addb,#28185a' },
};

interface PixelCardProps {
  variant?: keyof typeof VARIANTS;
  gap?: number;
  speed?: number;
  colors?: string;
  /** Auto-play the appear→disappear cycle on mount (default true). */
  autoPlay?: boolean;
  /** How long the card stays "active" before reversing (ms, default 3000). */
  activeDuration?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function PixelCard({
  variant = 'default', gap, speed, colors,
  autoPlay = true, activeDuration = 3000, className = '', children,
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const timePreviousRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  ).current;

  const variantCfg = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? variantCfg.gap;
  const finalSpeed = speed ?? variantCfg.speed;
  const finalColors = colors ?? variantCfg.colors;

  const initPixels = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    const colorsArray = finalColors.split(',');
    const pxs: Pixel[] = [];
    for (let x = 0; x < width; x += finalGap) {
      for (let y = 0; y < height; y += finalGap) {
        const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = reducedMotion ? 0 : distance;
        pxs.push(new Pixel(canvasRef.current, ctx, x, y, color, getEffectiveSpeed(finalSpeed, reducedMotion), delay));
      }
    }
    pixelsRef.current = pxs;
  };

  const doAnimate = (fnName: AnimName) => {
    animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - timePreviousRef.current;
    const timeInterval = 1000 / 60;
    if (timePassed < timeInterval) return;
    timePreviousRef.current = timeNow - (timePassed % timeInterval);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let allIdle = true;
    for (let i = 0; i < pixelsRef.current.length; i++) {
      const pixel = pixelsRef.current[i];
      pixel[fnName]();
      if (!pixel.isIdle) allIdle = false;
    }
    if (allIdle && animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleAnimation = (name: AnimName) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => doAnimate(name));
  };

  useEffect(() => {
    initPixels();
    const observer = new ResizeObserver(() => initPixels());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalGap, finalSpeed, finalColors]);

  // Auto-play: fill up on mount, hold ~activeDuration, then reverse.
  useEffect(() => {
    if (!autoPlay) return;
    const t1 = window.setTimeout(() => handleAnimation('appear'), 80);
    const t2 = window.setTimeout(() => handleAnimation('disappear'), 80 + activeDuration);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, activeDuration]);

  return (
    <div ref={containerRef} className={`pixel-card ${className}`}>
      <canvas className="pixel-canvas" ref={canvasRef} />
      {children}
    </div>
  );
}
