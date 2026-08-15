import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl';

// =====================================================================
// SpecularFx — the animated specular BORDER effect for main action
// buttons (adapted from react-bits' SpecularButton to the MIMS design
// system: sharp corners, navy base, white shine; ONLY the border effect
// is used, the button itself keeps its own design-system styling).
//
// Drop <SpecularFx /> inside any <button>: it attaches to the parent
// element, draws a WebGL canvas that extends slightly past the edges,
// and animates a light streak along the border. The light follows the
// pointer when it is nearby and sweeps slowly on its own otherwise, so
// the effect is alive on touch devices too. If WebGL is unavailable the
// component renders nothing and the button is unaffected.
// =====================================================================

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

export interface SpecularFxOptions {
  /** Colour of the moving light streak on the border. */
  lineColor?: string;
  /** Colour of the faint constant stroke that hugs the border. */
  baseColor?: string;
  intensity?: number;
  /** Angular size of the shine, degrees. */
  shineSize?: number;
  /** Angular fade of the shine, degrees. */
  shineFade?: number;
  thickness?: number;
  /** Idle sweep speed, radians per second. */
  speed?: number;
  followMouse?: boolean;
  /** Distance (px) at which the shine reacts to the pointer. */
  proximity?: number;
  /** Keep the shine alive even without a pointer nearby (touch devices). */
  autoAnimate?: boolean;
}

export function SpecularFx({
  lineColor = '#FFFFFF',
  baseColor = '#1F0F4D',
  intensity = 1.7,
  shineSize = 16,
  shineFade = 45,
  thickness = 1,
  speed = 0.5,
  followMouse = true,
  proximity = 170,
  autoAnimate = true,
}: SpecularFxOptions = {}) {
  const fxRef = useRef<HTMLSpanElement>(null);
  const propsRef = useRef({ lineColor, baseColor, intensity, shineSize, shineFade, thickness, speed, followMouse, proximity, autoAnimate });
  propsRef.current = { lineColor, baseColor, intensity, shineSize, shineFade, thickness, speed, followMouse, proximity, autoAnimate };

  useEffect(() => {
    const fx = fxRef.current;
    const btn = fx?.parentElement as HTMLElement | null;
    if (!fx || !btn) return;

    // The host button must be a positioned box for the overlay to align.
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';

    let renderer: InstanceType<typeof Renderer>;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr: window.devicePixelRatio || 1 });
    } catch {
      return; // No WebGL: the button simply has no border animation.
    }
    const dpr = window.devicePixelRatio || 1;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [0, 0] },
        uHalfSize: { value: [1, 1] },
        uRadius: { value: 0 },
        uAngle: { value: 2.4 },
        uPx: { value: dpr },
        uLineColor: { value: [1, 1, 1] },
        uBaseColor: { value: [0.12, 0.06, 0.3] },
        uIntensity: { value: 1 },
        uShineSize: { value: 0.17 },
        uShineFade: { value: 0.7 },
        uThickness: { value: 1 },
        uBaseWidth: { value: dpr },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    fx.appendChild(gl.canvas);

    // The button's box in viewport coordinates, refreshed by `resize` and by
    // scrolling rather than read on every pointer move. See `onPointerMove`.
    const box = { left: 0, top: 0, right: 0, bottom: 0, cx: 0, cy: 0, w: 1, h: 1 };

    const resize = () => {
      // THE CANVAS IS MEASURED AGAINST THE BOX IT ACTUALLY LIVES IN.
      //
      // `.specular-fx` is `position: absolute; inset: -20px`, and `inset` on an
      // absolutely positioned child resolves against its container's PADDING
      // box. The geometry used to be derived from the button's BORDER box
      // instead, via offsetWidth/offsetHeight. These buttons carry a 1px
      // border, so the canvas was sized 2px wider and 2px taller than the
      // element holding it: measured on the event form, a 558x58 button gave
      // a 596x96 overlay box holding a 598x98 canvas.
      //
      // A canvas 2px too large, pinned to its box's top left, puts the drawn
      // rectangle half a border off centre, so the specular edge fell OUTSIDE
      // the button on two sides and INSIDE it on the other two. That is the
      // displaced, doubled border on the Register button: the light ring and
      // the navy fill were never concentric.
      //
      // Measuring the overlay's own rect and locating the button inside it
      // makes the two agree exactly, whatever the border, the padding or the
      // sub-pixel layout happen to be.
      const rect = btn.getBoundingClientRect();
      const overlay = fx.getBoundingClientRect();
      // getBoundingClientRect reports the VISUAL box, so inside anything that
      // scales - a dialog animating open - it returns the mid-animation size.
      // offsetWidth is the LAYOUT size and ignores transforms, so their ratio
      // recovers the ancestor scale and the geometry stays right throughout.
      const raw = btn.offsetWidth > 0 ? rect.width / btn.offsetWidth : 1;
      const scale = raw > 0.01 ? raw : 1;
      const boxW = overlay.width / scale;
      const boxH = overlay.height / scale;
      const w = rect.width / scale;
      const h = rect.height / scale;
      if (w < 1 || h < 1 || boxW < 1 || boxH < 1) return; // Not laid out yet.

      box.left = rect.left; box.top = rect.top;
      box.right = rect.right; box.bottom = rect.bottom;
      box.cx = rect.left + rect.width / 2;
      box.cy = rect.top + rect.height / 2;
      box.w = rect.width; box.h = rect.height;

      // gl_FragCoord's origin is the BOTTOM left, so the vertical offset is
      // measured from the bottom of the overlay up to the bottom of the button.
      const offX = (rect.left - overlay.left) / scale;
      const offY = (overlay.bottom - rect.bottom) / scale;
      renderer.setSize(boxW, boxH);
      program.uniforms.uCenter.value = [(offX + w / 2) * dpr, (offY + h / 2) * dpr];
      program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
    };
    const ro = new ResizeObserver(resize);
    ro.observe(btn);
    resize();

    // Re-measure once the entrance animation of any container has finished,
    // and on the next two frames, so a button revealed inside a dialog,
    // popover or accordion is always drawn against its final box.
    const settle = () => resize();
    const frame1 = requestAnimationFrame(() => { settle(); requestAnimationFrame(settle); });
    const host = btn.closest('[role="alertdialog"], [role="dialog"], [data-state]') ?? btn;
    host.addEventListener('animationend', settle);
    host.addEventListener('transitionend', settle);

    // Light angle steers toward the pointer (anywhere on the page) and falls
    // back to a slow sweep when the pointer hasn't moved yet.
    //
    // THE POINTER HANDLER READS NO LAYOUT. It used to call
    // getBoundingClientRect on every pointermove, page-wide, which forces the
    // browser to flush layout on each event: on a long form with two of these
    // buttons that is a synchronous reflow tens of times a second for the
    // whole time the cursor is moving, and it is a real part of why the forms
    // felt heavy. The box is cached by `resize` and refreshed on scroll, and
    // the handler now does arithmetic only.
    let pointerAngle: number | null = null;
    let proximityT = 0;
    const onPointerMove = (e: PointerEvent) => {
      const dx = Math.max(box.left - e.clientX, 0, e.clientX - box.right);
      const dy = Math.max(box.top - e.clientY, 0, e.clientY - box.bottom);
      const dist = Math.hypot(dx, dy);
      // Over the button itself the light settles on the diagonal (framing the
      // corners) and gently sways with the cursor position within the button.
      if (dist === 0) {
        const nx = (e.clientX - box.cx) / (box.w / 2);
        const ny = (box.cy - e.clientY) / (box.h / 2);
        pointerAngle = Math.atan2(2 / box.h, -2 / box.w) + nx * 0.3 + ny * 0.15;
      } else {
        pointerAngle = Math.atan2(box.cy - e.clientY, e.clientX - box.cx);
      }
      const t = Math.max(0, 1 - dist / Math.max(propsRef.current.proximity, 1));
      proximityT = t * t * (3 - 2 * t);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    // Scrolling moves the button under a stationary cursor, so the cached box
    // has to follow it. This is the only layout read tied to scrolling and it
    // is passive, so it never blocks the scroll itself.
    window.addEventListener('scroll', resize, { passive: true, capture: true });

    let angle = 2.4;
    let idleAngle = 2.4;
    let bright = 0;
    let last = performance.now();
    let raf = 0;

    const lineC = new Color();
    const baseC = new Color();

    const update = (now: number) => {
      raf = requestAnimationFrame(update);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = propsRef.current;

      idleAngle += p.speed * dt;
      const steer = p.followMouse && pointerAngle != null && (!p.autoAnimate || proximityT > 0);
      const target = steer ? pointerAngle! : idleAngle;
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));

      // Shine fades in with pointer proximity unless autoAnimate keeps it on
      const brightTarget = p.autoAnimate ? 1 : proximityT;
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

      lineC.set(p.lineColor);
      baseC.set(p.baseColor);
      program.uniforms.uAngle.value = angle;
      // The design system uses sharp corners: radius stays 0.
      program.uniforms.uRadius.value = 0;
      program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
      program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
      program.uniforms.uIntensity.value = p.intensity * bright;
      program.uniforms.uShineSize.value = (p.shineSize * Math.PI) / 180;
      program.uniforms.uShineFade.value = (p.shineFade * Math.PI) / 180;
      program.uniforms.uThickness.value = p.thickness * dpr;
      renderer.render({ scene: mesh });
    };

    // IT ONLY RENDERS WHILE IT IS ON SCREEN. The loop used to run for the
    // life of the page: on the application form the submit button is a
    // thousand pixels below the fold, so a WebGL context drew sixty frames a
    // second of something nobody could see for the whole time the form was
    // being filled in - on the event page, alongside a second WebGL context
    // for the beams. An IntersectionObserver starts and stops it, and the
    // clock is reset on resume so the first frame back is not a long step.
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(update);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) start(); else stop();
      }, { rootMargin: '120px' })
      : null;
    if (io) io.observe(btn); else start();

    return () => {
      stop();
      cancelAnimationFrame(frame1);
      io?.disconnect();
      ro.disconnect();
      host.removeEventListener('animationend', settle);
      host.removeEventListener('transitionend', settle);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', resize, { capture: true } as EventListenerOptions);
      if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // The effect binds once; live option changes flow through propsRef.
  }, []);

  return <span ref={fxRef} className="specular-fx" aria-hidden="true" />;
}

export default SpecularFx;
