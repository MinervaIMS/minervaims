import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TeamSwarm — a calm, animated "swarm" of the team's member photos on a
// canvas. Circular photos of equal size float gently inside an oval field,
// connected by a soft web of lines. Nobody sits fixed at the centre: board
// members are biased toward the middle and the rest toward the outside, but
// the arrangement is randomised on each page load. Circles never overlap —
// they are packed with guaranteed white space and only drift within that
// margin, so the motion stays smooth and nothing ever collides, flickers or
// disappears while the page is open. Which people appear is chosen once per
// load. Data comes from the public team_members projection.
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
  member: TeamMember;
  central: boolean;        // board members bias toward the centre
  img: HTMLImageElement | null;
  imgAlpha: number;        // eases 0 -> 1 as the photo loads (cross-fades initials)
  r: number;               // draw radius in px
  hx: number; hy: number;  // home position (px)
  x: number; y: number;    // current position (px)
  ampX: number; ampY: number;
  freqX: number; freqY: number;
  phaseX: number; phaseY: number;
}

const NAVY = '40, 24, 90'; // brand navy for the connecting lines

function initials(m: TeamMember): string {
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

// Fisher–Yates-ish shuffle producing a new array.
function shuffled<T>(arr: T[]): T[] {
  return arr
    .map((v) => [Math.random(), v] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

export function TeamSwarm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  // Load the public team projection.
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

  // Choose the people once per load. Board first (photos first), then the rest
  // (photos first), each group shuffled so the layout differs on every reload.
  const selection = useMemo<TeamMember[]>(() => {
    const byPhoto = (a: TeamMember, b: TeamMember) =>
      (b.photo_url ? 1 : 0) - (a.photo_url ? 1 : 0);
    const board = shuffled(members.filter((m) => m.is_board)).sort(byPhoto);
    const others = shuffled(members.filter((m) => !m.is_board)).sort(byPhoto);
    return [...board, ...others];
  }, [members]);

  useEffect(() => {
    if (!ready || selection.length === 0) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // ----- geometry, recomputed on resize -----
    let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, dpr = 1;
    let R = 33, GAP = 16, AMP = 5, isMobile = false;

    const measure = () => {
      W = container.clientWidth;
      H = container.clientHeight;
      isMobile = W < 700;
      R = isMobile ? 25 : 33;          // desktop circles are noticeably bigger
      GAP = isMobile ? 13 : 16;        // guaranteed white space between circles
      AMP = isMobile ? 4 : 5;          // drift amplitude (< GAP/2 => never overlaps)
      cx = W / 2; cy = H / 2;
      rx = Math.min(W * 0.47, 560);
      ry = H * 0.46;
    };

    // Build the fixed set of nodes (people never change until reload). The
    // count is capped so the field always has generous white space.
    measure();
    const foot = Math.PI * (R + GAP / 2) ** 2;
    const areaCap = Math.floor((Math.PI * rx * ry) / (foot * 1.95));
    const hardCap = isMobile ? 16 : 26;
    const N = Math.max(1, Math.min(selection.length, hardCap, areaCap));

    const nodes: SwarmNode[] = selection.slice(0, N).map((m) => ({
      member: m,
      central: m.is_board,
      img: null,
      imgAlpha: 0,
      r: R,
      hx: 0, hy: 0, x: 0, y: 0,
      ampX: AMP * (0.6 + Math.random() * 0.4),
      ampY: AMP * (0.6 + Math.random() * 0.4),
      freqX: 0.12 + Math.random() * 0.16,
      freqY: 0.12 + Math.random() * 0.16,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
    }));

    // Relaxation packing: seed by tier bias, then push overlapping pairs apart
    // and keep everyone inside the ellipse. Result: no overlaps, natural spread.
    let hasHomes = false;
    const computeHomes = () => {
      for (const n of nodes) {
        n.r = R;
        if (!hasHomes) {
          const ang = Math.random() * Math.PI * 2;
          const base = n.central ? Math.random() * 0.5 : 0.4 + Math.random() * 0.6;
          n.hx = cx + Math.cos(ang) * rx * base;
          n.hy = cy + Math.sin(ang) * ry * base;
        }
      }
      const iters = 260;
      for (let it = 0; it < iters; it++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = b.hx - a.hx, dy = b.hy - a.hy;
            const d = Math.hypot(dx, dy) || 0.0001;
            const min = a.r + b.r + GAP;
            if (d < min) {
              const push = (min - d) / 2;
              dx /= d; dy /= d;
              a.hx -= dx * push; a.hy -= dy * push;
              b.hx += dx * push; b.hy += dy * push;
            }
          }
        }
        // Gentle radial bias toward each node's preferred band + ellipse clamp.
        const marginRx = Math.max(rx - R - 6, 10);
        const marginRy = Math.max(ry - R - 6, 10);
        for (const n of nodes) {
          const dx = n.hx - cx, dy = n.hy - cy;
          const er = Math.hypot(dx / rx, dy / ry) || 0.0001;
          const target = n.central ? 0.30 : 0.74;
          const f = (target - er) * 0.02;
          n.hx += dx * f; n.hy += dy * f;
          const ndx = n.hx - cx, ndy = n.hy - cy;
          const e2 = Math.hypot(ndx / marginRx, ndy / marginRy);
          if (e2 > 1) { n.hx = cx + ndx / e2; n.hy = cy + ndy / e2; }
        }
      }
      hasHomes = true;
    };

    // Connection web: each node links to its k nearest neighbours. Endpoints
    // animate with the nodes; the topology is fixed for the load.
    let edges: { a: number; b: number; strength: number }[] = [];
    const buildEdges = () => {
      const K = isMobile ? 3 : 4;
      const seen = new Set<string>();
      const list: { a: number; b: number; strength: number }[] = [];
      const maxLink = (R * 2 + GAP) * 3.4; // ignore very long links
      for (let i = 0; i < nodes.length; i++) {
        const dists = nodes
          .map((n, j) => ({ j, d: Math.hypot(n.hx - nodes[i].hx, n.hy - nodes[i].hy) }))
          .filter((o) => o.j !== i)
          .sort((p, q) => p.d - q.d)
          .slice(0, K);
        for (const { j, d } of dists) {
          if (d > maxLink) continue;
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({ a: i, b: j, strength: Math.max(0, 1 - d / maxLink) });
        }
      }
      edges = list;
    };

    // Size the canvas to the container.
    const resize = () => {
      measure();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeHomes();
      buildEdges();
    };
    resize();

    // Load images.
    let cancelled = false;
    for (const n of nodes) {
      if (n.member.photo_url) loadImage(n.member.photo_url).then((img) => { if (!cancelled) n.img = img; });
    }

    let pendingResize = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(pendingResize);
      pendingResize = window.setTimeout(resize, 120);
    });
    ro.observe(container);

    const drawNode = (n: SwarmNode) => {
      const r = n.r;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      // Initials placeholder (fades out as the photo fades in).
      if (n.imgAlpha < 1) {
        ctx.globalAlpha = 1 - n.imgAlpha;
        ctx.fillStyle = `rgba(${NAVY}, 0.12)`;
        ctx.fill();
        ctx.fillStyle = `rgba(${NAVY}, 0.8)`;
        ctx.font = `${Math.round(r * 0.8)}px Georgia, "Times New Roman", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials(n.member), n.x, n.y + 1);
        ctx.globalAlpha = 1;
      }
      // Photo — cover-cropped from the centre so proportions are never stretched.
      if (n.img) {
        const iw = n.img.naturalWidth || n.img.width;
        const ih = n.img.naturalHeight || n.img.height;
        const s = Math.min(iw, ih);
        const sx = (iw - s) / 2, sy = (ih - s) / 2;
        ctx.globalAlpha = n.imgAlpha;
        ctx.drawImage(n.img, sx, sy, s, s, n.x - r, n.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // Uniform ring around every circle.
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${NAVY}, 0.35)`;
      ctx.stroke();
      ctx.restore();
    };

    let raf = 0;
    const frame = (now: number) => {
      const t = reduced ? 0 : now / 1000;

      // Positions: home + a small bounded drift (Lissajous). Because every
      // amplitude is below GAP/2, no two circles can ever touch.
      for (const n of nodes) {
        n.x = n.hx + Math.sin(t * n.freqX * Math.PI * 2 + n.phaseX) * n.ampX;
        n.y = n.hy + Math.sin(t * n.freqY * Math.PI * 2 + n.phaseY) * n.ampY;
        if (n.img && n.imgAlpha < 1) n.imgAlpha = Math.min(1, n.imgAlpha + 0.05);
      }

      ctx.clearRect(0, 0, W, H);

      // Connection web (drawn under the circles).
      ctx.lineWidth = 1;
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b];
        ctx.strokeStyle = `rgba(${NAVY}, ${0.06 + e.strength * 0.14})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const n of nodes) drawNode(n);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Fade the whole canvas in once, gently, on first paint.
    const revealTimer = window.setTimeout(() => setVisible(true), 60);

    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(revealTimer);
      window.clearTimeout(pendingResize);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, selection]);

  // Nothing to show yet (no people): render nothing rather than an empty box.
  if (ready && selection.length === 0) return null;

  return (
    <section className="py-section-sm md:py-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Our Team</h2>
        <p className="font-body text-body-lg text-muted-foreground max-w-3xl mb-8">
          A community of students working across research divisions and portfolio management. The people below are drawn from our current members.
        </p>
        <div ref={containerRef} className="relative w-full h-[420px] md:h-[560px]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: visible ? 1 : 0 }}
          />
        </div>
      </div>
    </section>
  );
}

export default TeamSwarm;
