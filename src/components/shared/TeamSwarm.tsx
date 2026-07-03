import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TeamSwarm — an animated "swarm" of the team's member photos on a canvas.
// Board members drift near the centre, analysts and others further out.
// The roster is picked once per page load (shuffled, then frozen for the
// session) — reloading picks a new random cast. Only members with an
// uploaded photo appear.
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
  tier: 1 | 2;           // 1 = board (inner ring), 2 = others (outer rings)
  ringR: number;         // ring radius as a fraction of the field radius
  baseAngle: number;     // starting angle on the ring
  dir: number;           // rotation direction
  phase: number;         // drift phase
  size: number;          // draw radius in px
  member: TeamMember;
  img: HTMLImageElement | null;
  x: number;
  y: number;
}

const NAVY = '40, 24, 90'; // brand navy for the connecting lines

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

    // Shuffle once per mount (per page load) — the cast then stays put.
    const board = shuffle(photoPeople.filter((m) => m.is_board));
    const others = shuffle(photoPeople.filter((m) => !m.is_board));
    const boardSlots = Math.min(board.length, 8);
    const otherSlots = Math.min(others.length, 20);

    if (boardSlots === 0 && otherSlots === 0) return;

    // Build the nodes with jittered angles/radii for organic placement.
    const nodes: SwarmNode[] = [];

    for (let i = 0; i < boardSlots; i++) {
      const step = (Math.PI * 2) / boardSlots;
      const angleJitter = (Math.random() - 0.5) * step * 0.55;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.3; // ±15%
      nodes.push({
        tier: 1,
        ringR: 0.30 * radiusJitter,
        baseAngle: i * step + angleJitter,
        dir: 1,
        phase: Math.random() * Math.PI * 2,
        size: 30,
        member: board[i],
        img: null,
        x: 0, y: 0,
      });
    }

    for (let i = 0; i < otherSlots; i++) {
      const step = (Math.PI * 2) / otherSlots;
      const angleJitter = (Math.random() - 0.5) * step * 0.9;
      const baseRing = i % 2 === 0 ? 0.62 : 0.82;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.22; // ±11%
      nodes.push({
        tier: 2,
        ringR: baseRing * radiusJitter,
        baseAngle: i * step + angleJitter,
        dir: -1,
        phase: Math.random() * Math.PI * 2,
        size: 22,
        member: others[i],
        img: null,
        x: 0, y: 0,
      });
    }

    // Load images.
    let cancelled = false;
    for (const n of nodes) {
      if (n.member?.photo_url) loadImage(n.member.photo_url).then((img) => { if (!cancelled) n.img = img; });
    }

    // Size the canvas to the container.
    let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth;
      H = container.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      rx = Math.min(W * 0.46, 520); ry = Math.min(H * 0.44, 300);
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
        // Cover-fit: crop the largest centered square from the source so
        // the photo isn't stretched into the circular slot.
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
    let t = 0;

    const frame = (now: number) => {
      t = now / 1000;
      const rot = reduced ? 0 : t * 0.05;         // slow global rotation
      const wob = reduced ? 0 : 1;

      // Positions.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const a = n.baseAngle + rot * n.dir;
        const drift = wob * Math.sin(t * 0.6 + n.phase) * 6;
        n.x = cx + Math.cos(a) * (rx * n.ringR + drift);
        n.y = cy + Math.sin(a) * (ry * n.ringR + drift);
      }

      // Draw.
      ctx.clearRect(0, 0, W, H);

      const boardNodes = nodes.filter((n) => n.tier === 1);
      const outerNodes = nodes.filter((n) => n.tier === 2);
      ctx.lineWidth = 1;

      // Inner mesh: each board node to its 2 nearest board neighbours.
      for (const b of boardNodes) {
        const sorted = boardNodes
          .filter((o) => o !== b)
          .map((o) => ({ o, d: (o.x - b.x) ** 2 + (o.y - b.y) ** 2 }))
          .sort((a, z) => a.d - z.d)
          .slice(0, 2);
        for (const { o } of sorted) {
          ctx.strokeStyle = `rgba(${NAVY}, 0.16)`;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        }
      }

      // Each outer node: nearest board + nearest outer neighbour.
      for (const n of outerNodes) {
        if (boardNodes.length) {
          let nearest = boardNodes[0]; let best = Infinity;
          for (const b of boardNodes) {
            const d = (b.x - n.x) ** 2 + (b.y - n.y) ** 2;
            if (d < best) { best = d; nearest = b; }
          }
          ctx.strokeStyle = `rgba(${NAVY}, 0.12)`;
          ctx.beginPath(); ctx.moveTo(nearest.x, nearest.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        }
        // Nearest other outer node — analyst↔analyst links.
        let nearestO: SwarmNode | null = null; let bestO = Infinity;
        for (const o of outerNodes) {
          if (o === n) continue;
          const d = (o.x - n.x) ** 2 + (o.y - n.y) ** 2;
          if (d < bestO) { bestO = d; nearestO = o; }
        }
        if (nearestO) {
          ctx.strokeStyle = `rgba(${NAVY}, 0.10)`;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(nearestO.x, nearestO.y); ctx.stroke();
        }
      }

      // Nodes.
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

  // Nothing to show yet (no photos): render nothing rather than an empty box.
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
