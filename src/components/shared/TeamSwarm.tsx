import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TeamSwarm — a stable, connected constellation of team member photos.
// All visible members are equal in size. Positions are packed once per
// layout pass with a guaranteed gap; only a very slow, reserved drift is
// added so the drawing never collapses into overlaps or glitchy motion.
// The visible roster is selected once per page load; reloads reshuffle it.
// =====================================================================

interface TeamMember {
  name: string;
  surname: string;
  position: string;
  photo_url: string | null;
  is_board: boolean;
  display_order: number;
}

interface SwarmNode {
  anchorX: number;
  anchorY: number;
  phase: number;
  driftAngle: number;
  size: number;
  member: TeamMember;
  img: HTMLImageElement | null;
  x: number;
  y: number;
}

interface Slot {
  x: number;
  y: number;
  score: number;
}

interface Link {
  from: number;
  to: number;
  opacity: number;
}

const NAVY = '40, 24, 90';
const DESKTOP_COUNT = 28;
const TABLET_COUNT = 22;
const MOBILE_COUNT = 18;
const SMALL_MOBILE_COUNT = 15;

function initials(m: TeamMember | null): string {
  if (!m) return '';
  return `${(m.name || '')[0] ?? ''}${(m.surname || '')[0] ?? ''}`.toUpperCase();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getDisplayCount(width: number): number {
  if (width < 480) return SMALL_MOBILE_COUNT;
  if (width < 768) return MOBILE_COUNT;
  if (width < 1024) return TABLET_COUNT;
  return DESKTOP_COUNT;
}

function getNodeRadius(width: number): number {
  if (width < 480) return 18;
  if (width < 768) return 21;
  if (width < 1024) return 28;
  return 38;
}

function buildPackedSlots(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  radius: number,
  minDistance: number,
): Slot[] {
  const safeRx = Math.max(rx - radius, radius * 2);
  const safeRy = Math.max(ry - radius, radius * 2);
  const stepX = minDistance;
  const stepY = minDistance * Math.sqrt(3) / 2;
  const slots: Slot[] = [];
  let row = 0;

  for (let y = -safeRy; y <= safeRy; y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    let col = 0;
    for (let x = -safeRx; x <= safeRx; x += stepX) {
      const px = x + offset;
      const ellipse = (px / safeRx) ** 2 + (y / safeRy) ** 2;
      if (ellipse <= 1) {
        const radial = Math.sqrt(Math.max(ellipse, 0));
        const noise = seededNoise(row * 97 + col * 31);
        slots.push({
          x: cx + px,
          y: cy + y,
          score: radial + noise * 0.24,
        });
      }
      col++;
    }
    row++;
  }

  return slots.sort((a, b) => a.score - b.score);
}

function buildLinks(nodes: SwarmNode[]): Link[] {
  const pairMap = new Map<string, Link>();
  const addPair = (from: number, to: number, opacity: number) => {
    if (from === to) return;
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const key = `${a}:${b}`;
    const existing = pairMap.get(key);
    if (!existing || opacity > existing.opacity) {
      pairMap.set(key, { from: a, to: b, opacity });
    }
  };

  const nearestCount = nodes.length < 18 ? 5 : 6;
  for (let i = 0; i < nodes.length; i++) {
    const nearest = nodes
      .map((node, index) => ({
        index,
        d: index === i
          ? Number.POSITIVE_INFINITY
          : (node.anchorX - nodes[i].anchorX) ** 2 + (node.anchorY - nodes[i].anchorY) ** 2,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, nearestCount);

    nearest.forEach(({ index }, rank) => {
      addPair(i, index, rank < 3 ? 0.22 : 0.16);
    });
  }

  const extraLinks = nodes.length < 18 ? 2 : 3;
  for (let i = 0; i < nodes.length; i++) {
    const byDistance = nodes
      .map((node, index) => ({
        index,
        d: index === i
          ? -1
          : (node.anchorX - nodes[i].anchorX) ** 2 + (node.anchorY - nodes[i].anchorY) ** 2,
      }))
      .filter(({ d }) => d > 0)
      .sort((a, b) => a.d - b.d);
    const longRange = byDistance.slice(Math.max(0, Math.floor(byDistance.length * 0.45)));
    for (let n = 0; n < extraLinks && longRange.length > 0; n++) {
      const pick = Math.floor(seededNoise((i + 1) * 43 + n * 19) * longRange.length);
      addPair(i, longRange[pick].index, 0.10);
    }
  }

  return Array.from(pairMap.values());
}

export function TeamSwarm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('team_members')
        .select('name, surname, position, photo_url, is_board, display_order')
        .order('display_order', { ascending: true });
      if (active) { setMembers((data as TeamMember[]) || []); setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  const photoPeople = useMemo(
    () => members.filter((m) => !!m.photo_url),
    [members],
  );

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const roster = shuffle(photoPeople).slice(0, Math.min(photoPeople.length, DESKTOP_COUNT));
    if (roster.length === 0) return;

    let nodes: SwarmNode[] = [];
    let links: Link[] = [];
    const imageByUrl = new Map<string, HTMLImageElement | null>();

    // Load images.
    let cancelled = false;
    for (const member of roster) {
      if (member.photo_url) {
        loadImage(member.photo_url).then((img) => {
          if (cancelled) return;
          imageByUrl.set(member.photo_url as string, img);
          for (const n of nodes) {
            if (n.member.photo_url === member.photo_url) n.img = img;
          }
        });
      }
    }

    let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, dpr = 1, driftAmp = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth;
      H = container.clientHeight;
      if (W <= 0 || H <= 0) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      cx = W / 2; cy = H / 2;
      const radius = getNodeRadius(W);
      const gap = W < 768 ? 9 : 11;
      driftAmp = reduced ? 0 : W < 768 ? 0.8 : 1.4;
      rx = Math.min(W * 0.47, 590);
      ry = Math.min(H * 0.45, 330);
      const minDistance = radius * 2 + gap + driftAmp * 4;
      const slots = buildPackedSlots(cx, cy, rx, ry, radius + driftAmp * 2, minDistance);
      const count = Math.min(roster.length, getDisplayCount(W), slots.length);

      nodes = roster.slice(0, count).map((member, index) => {
        const slot = slots[index];
        const phase = seededNoise((index + 1) * 17) * Math.PI * 2;
        return {
          anchorX: slot.x,
          anchorY: slot.y,
          phase,
          driftAngle: seededNoise((index + 1) * 29) * Math.PI * 2,
          size: radius,
          member,
          img: member.photo_url ? imageByUrl.get(member.photo_url) ?? null : null,
          x: slot.x,
          y: slot.y,
        };
      });
      links = buildLinks(nodes);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const drawNode = (n: SwarmNode) => {
      const r = n.size;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.closePath();
      if (n.img) {
        ctx.save();
        ctx.clip();
        const iw = n.img.naturalWidth || n.img.width;
        const ih = n.img.naturalHeight || n.img.height;
        const side = Math.min(iw, ih);
        const sx = (iw - side) / 2;
        const sy = (ih - side) / 2;
        ctx.drawImage(n.img, sx, sy, side, side, n.x - r, n.y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(${NAVY}, 0.12)`;
        ctx.fill();
        ctx.fillStyle = `rgba(${NAVY}, 0.8)`;
        ctx.font = `${Math.round(r * 0.8)}px Georgia, "Times New Roman", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials(n.member), n.x, n.y + 1);
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${NAVY}, 0.35)`;
      ctx.stroke();
      ctx.restore();
    };

    let raf = 0;

    const frame = (now: number) => {
      const t = now / 1000;

      // Stable positions with a very slow reserved drift.
      for (const n of nodes) {
        const drift = driftAmp * Math.sin(t * 0.12 + n.phase);
        const crossDrift = driftAmp * 0.45 * Math.cos(t * 0.09 + n.phase * 1.7);
        n.x = n.anchorX + Math.cos(n.driftAngle) * drift + Math.cos(n.driftAngle + Math.PI / 2) * crossDrift;
        n.y = n.anchorY + Math.sin(n.driftAngle) * drift + Math.sin(n.driftAngle + Math.PI / 2) * crossDrift;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;

      for (const link of links) {
        const a = nodes[link.from];
        const b = nodes[link.to];
        if (!a || !b) continue;
        ctx.strokeStyle = `rgba(${NAVY}, ${link.opacity})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      for (const n of nodes) drawNode(n);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, photoPeople]);

  if (ready && photoPeople.length === 0) return null;

  return (
    <section className="py-section-sm md:py-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">It's a People's Business</h2>
        <p className="font-body text-body-lg text-muted-foreground max-w-3xl mb-8">
          A community of students working across research divisions and portfolio management. The people below are drawn from our current members.
        </p>
        <div ref={containerRef} className="relative w-full h-[420px] md:h-[560px]">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
      </div>
    </section>
  );
}

export default TeamSwarm;
