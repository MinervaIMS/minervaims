import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TeamSwarm — an animated "swarm" of team member photos on a canvas.
// Board members drift near the centre (and through it), analysts and
// others further out. A dense low-opacity mesh connects the group. The
// roster is picked once per page load (shuffled, then frozen) — a reload
// picks a new random cast. Only members with a photo appear.
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
  tier: 1 | 2;           // 1 = board, 2 = others
  ringR: number;         // ring radius as a fraction of the field radius
  baseAngle: number;     // starting angle on the ring
  dir: number;           // rotation direction
  phase: number;         // drift phase
  driftAmp: number;      // per-node drift amplitude
  size: number;          // draw radius in px
  member: TeamMember;
  img: HTMLImageElement | null;
  // Long-range random links (indices into nodes[]), seeded once at mount.
  extraLinks: number[];
  x: number;
  y: number;
}

const NAVY = '40, 24, 90';
const NODE_PADDING = 8; // white space between any two circles

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

    const board = shuffle(photoPeople.filter((m) => m.is_board));
    const others = shuffle(photoPeople.filter((m) => !m.is_board));
    const boardSlots = Math.min(board.length, 8);
    const otherSlots = Math.min(others.length, 20);
    if (boardSlots === 0 && otherSlots === 0) return;

    // Placeholder sizes; recomputed on resize().
    const nodes: SwarmNode[] = [];

    for (let i = 0; i < boardSlots; i++) {
      const step = (Math.PI * 2) / boardSlots;
      const angleJitter = (Math.random() - 0.5) * step * 0.6;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.8; // ±40%
      nodes.push({
        tier: 1,
        ringR: 0.14 * radiusJitter,
        baseAngle: i * step + angleJitter,
        dir: Math.random() < 0.5 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        driftAmp: 12,
        size: 42,
        member: board[i],
        img: null,
        extraLinks: [],
        x: 0, y: 0,
      });
    }

    for (let i = 0; i < otherSlots; i++) {
      const step = (Math.PI * 2) / otherSlots;
      const angleJitter = (Math.random() - 0.5) * step * 0.9;
      const baseRing = i % 2 === 0 ? 0.62 : 0.82;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.22;
      nodes.push({
        tier: 2,
        ringR: baseRing * radiusJitter,
        baseAngle: i * step + angleJitter,
        dir: -1,
        phase: Math.random() * Math.PI * 2,
        driftAmp: 6,
        size: 32,
        member: others[i],
        img: null,
        extraLinks: [],
        x: 0, y: 0,
      });
    }

    // Seed a couple of long-range random links per board node (stable).
    const boardIdx = nodes.map((n, i) => n.tier === 1 ? i : -1).filter((i) => i >= 0);
    for (const bi of boardIdx) {
      const candidates = boardIdx.filter((j) => j !== bi);
      shuffle(candidates).slice(0, 1).forEach((j) => nodes[bi].extraLinks.push(j));
    }

    // Load images.
    let cancelled = false;
    for (const n of nodes) {
      if (n.member?.photo_url) loadImage(n.member.photo_url).then((img) => { if (!cancelled) n.img = img; });
    }

    let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth;
      H = container.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      rx = Math.min(W * 0.46, 560); ry = Math.min(H * 0.44, 320);
      // Responsive sizing.
      const desktop = W >= 768;
      for (const n of nodes) {
        if (n.tier === 1) n.size = desktop ? 46 : 34;
        else n.size = desktop ? 34 : 26;
      }
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
      const rot = reduced ? 0 : t * 0.05;
      const wob = reduced ? 0 : 1;

      // Target positions from parametric drift.
      for (const n of nodes) {
        const a = n.baseAngle + rot * n.dir;
        const drift = wob * Math.sin(t * 0.6 + n.phase) * n.driftAmp;
        n.x = cx + Math.cos(a) * (rx * n.ringR + drift);
        n.y = cy + Math.sin(a) * (ry * n.ringR + drift);
      }

      // Collision relaxation: keep NODE_PADDING between any two circles.
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = b.x - a.x, dy = b.y - a.y;
            let d = Math.hypot(dx, dy);
            const min = a.size + b.size + NODE_PADDING;
            if (d < min) {
              if (d < 0.0001) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy) || 1; }
              const push = (min - d) / 2;
              const ux = dx / d, uy = dy / d;
              a.x -= ux * push; a.y -= uy * push;
              b.x += ux * push; b.y += uy * push;
            }
          }
        }
      }

      // Clamp inside the drawing ellipse (with node radius margin).
      for (const n of nodes) {
        const ex = (n.x - cx) / Math.max(rx - n.size, 1);
        const ey = (n.y - cy) / Math.max(ry - n.size, 1);
        const m = ex * ex + ey * ey;
        if (m > 1) {
          const s = 1 / Math.sqrt(m);
          n.x = cx + (n.x - cx) * s;
          n.y = cy + (n.y - cy) * s;
        }
      }

      ctx.clearRect(0, 0, W, H);

      const boardNodes = nodes.filter((n) => n.tier === 1);
      const outerNodes = nodes.filter((n) => n.tier === 2);
      ctx.lineWidth = 1;

      // Board↔board: 3 nearest.
      for (const b of boardNodes) {
        const sorted = boardNodes
          .filter((o) => o !== b)
          .map((o) => ({ o, d: (o.x - b.x) ** 2 + (o.y - b.y) ** 2 }))
          .sort((a, z) => a.d - z.d)
          .slice(0, 3);
        for (const { o } of sorted) {
          ctx.strokeStyle = `rgba(${NAVY}, 0.18)`;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        }
      }

      // Board long-range random links.
      for (const b of boardNodes) {
        for (const j of b.extraLinks) {
          const o = nodes[j];
          ctx.strokeStyle = `rgba(${NAVY}, 0.10)`;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        }
      }

      // Outer nodes: 2 nearest board + 2 nearest outer.
      for (const n of outerNodes) {
        if (boardNodes.length) {
          const nearestB = boardNodes
            .map((b) => ({ b, d: (b.x - n.x) ** 2 + (b.y - n.y) ** 2 }))
            .sort((a, z) => a.d - z.d)
            .slice(0, 2);
          for (const { b } of nearestB) {
            ctx.strokeStyle = `rgba(${NAVY}, 0.13)`;
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        }
        const nearestO = outerNodes
          .filter((o) => o !== n)
          .map((o) => ({ o, d: (o.x - n.x) ** 2 + (o.y - n.y) ** 2 }))
          .sort((a, z) => a.d - z.d)
          .slice(0, 2);
        for (const { o } of nearestO) {
          ctx.strokeStyle = `rgba(${NAVY}, 0.10)`;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        }
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
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Our Team</h2>
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
