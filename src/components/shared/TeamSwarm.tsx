import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TeamSwarm — an animated "swarm" of the team's member photos on a canvas.
// Slowly drifting circular photos connected by sparse lines form an oval
// cloud. The President sits at the centre; board members orbit close in,
// lower-hierarchy roles further out. Only members with an uploaded photo
// appear, and the outer members rotate over time so everyone is featured.
// Data comes from the public team_members projection (photos only).
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
  tier: 0 | 1 | 2;       // 0 = president (centre), 1 = board, 2 = others
  ringR: number;         // ring radius as a fraction of the field radius
  baseAngle: number;     // starting angle on the ring
  dir: number;           // rotation direction
  phase: number;         // drift phase
  size: number;          // draw radius in px
  member: TeamMember | null;
  img: HTMLImageElement | null;
  opacity: number;
  targetOpacity: number;
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

  const { president, photoPeople } = useMemo(() => {
    const all = [...members];
    const pres = all.find((m) => m.position?.toLowerCase() === 'president')
      ?? all.slice().sort((a, b) => a.display_order - b.display_order)[0] ?? null;
    const photos = all.filter((m) => !!m.photo_url && m !== pres);
    return { president: pres, photoPeople: photos };
  }, [members]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Split people into board and others.
    const board = photoPeople.filter((m) => m.is_board);
    const others = photoPeople.filter((m) => !m.is_board);
    const boardSlots = Math.min(board.length, 8);
    const otherSlots = Math.min(others.length, 20);

    // Build the nodes.
    const nodes: SwarmNode[] = [];
    // Centre (president): always present, photo or initials.
    nodes.push({
      tier: 0, ringR: 0, baseAngle: 0, dir: 1, phase: 0, size: 46,
      member: president, img: null, opacity: 1, targetOpacity: 1, x: 0, y: 0,
    });
    for (let i = 0; i < boardSlots; i++) {
      nodes.push({
        tier: 1, ringR: 0.30, baseAngle: (i / boardSlots) * Math.PI * 2, dir: 1,
        phase: Math.random() * Math.PI * 2, size: 30,
        member: board[i], img: null, opacity: 1, targetOpacity: 1, x: 0, y: 0,
      });
    }
    for (let i = 0; i < otherSlots; i++) {
      const outer = i % 2 === 0 ? 0.62 : 0.82;
      nodes.push({
        tier: 2, ringR: outer, baseAngle: (i / otherSlots) * Math.PI * 2 + 0.2, dir: -1,
        phase: Math.random() * Math.PI * 2, size: 22,
        member: others[i], img: null, opacity: 1, targetOpacity: 1, x: 0, y: 0,
      });
    }

    // The pool of not-currently-shown "other" members, for rotation.
    const shown = new Set(nodes.filter((n) => n.member).map((n) => n.member));
    const pool = others.filter((m) => !shown.has(m));

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
      ctx.globalAlpha = n.opacity;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.closePath();
      if (n.img) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(n.img, n.x - r, n.y - r, r * 2, r * 2);
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
      // Ring around the photo (accent for the president).
      ctx.lineWidth = n.tier === 0 ? 3 : 1.5;
      ctx.strokeStyle = n.tier === 0 ? `rgba(${NAVY}, 0.9)` : `rgba(${NAVY}, 0.35)`;
      ctx.stroke();
      ctx.restore();
    };

    let raf = 0;
    let t = 0;
    let lastSwap = 0;

    const frame = (now: number) => {
      t = now / 1000;
      const rot = reduced ? 0 : t * 0.05;         // slow global rotation
      const wob = reduced ? 0 : 1;

      // Positions.
      const pres = nodes[0];
      pres.x = cx; pres.y = cy;
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        const a = n.baseAngle + rot * n.dir;
        const drift = wob * Math.sin(t * 0.6 + n.phase) * 6;
        n.x = cx + Math.cos(a) * (rx * n.ringR + drift);
        n.y = cy + Math.sin(a) * (ry * n.ringR + drift);
        // Ease opacity toward target (for rotation fades).
        n.opacity += (n.targetOpacity - n.opacity) * 0.06;
      }

      // Rotate one outer member every ~5s (skip if nothing to swap).
      if (!reduced && pool.length > 0 && now - lastSwap > 5000) {
        lastSwap = now;
        const candidates = nodes.filter((n) => n.tier === 2 && n.targetOpacity > 0.5);
        if (candidates.length) {
          const n = candidates[Math.floor(Math.random() * candidates.length)];
          n.targetOpacity = 0;
          window.setTimeout(() => {
            if (cancelled || !n.member) return;
            const outgoing = n.member;
            const incoming = pool.shift();
            if (incoming) {
              pool.push(outgoing);
              n.member = incoming; n.img = null;
              loadImage(incoming.photo_url!).then((img) => { if (!cancelled) n.img = img; });
            }
            n.targetOpacity = 1;
          }, 700);
        }
      }

      // Draw.
      ctx.clearRect(0, 0, W, H);
      // Connections: president -> board, and each outer node to the nearest board node.
      const boardNodes = nodes.filter((n) => n.tier === 1);
      ctx.lineWidth = 1;
      for (const b of boardNodes) {
        ctx.strokeStyle = `rgba(${NAVY}, ${0.18 * Math.min(b.opacity, pres.opacity)})`;
        ctx.beginPath(); ctx.moveTo(pres.x, pres.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const n of nodes) {
        if (n.tier !== 2 || !boardNodes.length) continue;
        let nearest = boardNodes[0]; let best = Infinity;
        for (const b of boardNodes) {
          const d = (b.x - n.x) ** 2 + (b.y - n.y) ** 2;
          if (d < best) { best = d; nearest = b; }
        }
        ctx.strokeStyle = `rgba(${NAVY}, ${0.10 * n.opacity})`;
        ctx.beginPath(); ctx.moveTo(nearest.x, nearest.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      }
      // Nodes (president last so it sits on top).
      for (let i = nodes.length - 1; i >= 1; i--) drawNode(nodes[i]);
      drawNode(pres);

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
  }, [ready, president, photoPeople]);

  // Nothing to show yet (no photos): render nothing rather than an empty box.
  if (ready && !president && photoPeople.length === 0) return null;

  return (
    <section className="py-section-sm md:py-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">It's a People Business</h2>
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
