import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BatteryFull, Laptop, Lock, Maximize2, RotateCcw, Signal, Smartphone, Tablet, Wifi } from 'lucide-react';
import laptopFrame from '@/assets/devices/laptop.webp';
import tabletLandscapeFrame from '@/assets/devices/tablet-landscape.webp';
import tabletPortraitFrame from '@/assets/devices/tablet-portrait.webp';
import phoneFrame from '@/assets/devices/phone.webp';
import { DEVICES, type DeviceFamily, type DeviceKey } from '@/lib/device-frames';
import { zoomMeasuresAsDrawn } from '@/lib/workspace-scale';

// =====================================================================
// A LIVE PAGE IN A DEVICE: THE DESIGN SYSTEM'S LAYOUT (Step 110).
// ---------------------------------------------------------------------
// One way, everywhere, to show a page as a computer, a tablet or a phone
// shows it, and let the reader use it there:
//
//   DeviceShowcase  the device lying on the page itself, with no box or
//                   panel around it: the supplied frame on top (its
//                   screen clear, never taking a click), the page behind
//                   it in a frame laid out at that device's own width and
//                   scaled to the screen, the device's strip above it (the
//                   browser's address bar, or the phone's clock), and a
//                   soft shadow under it.
//   DeviceSwitch    the one control: three marks, computer, tablet and
//                   phone, under the device, the tablet turning when its
//                   mark is pressed again; and, if wanted, Full size.
//
// The page inside is interactive, so nothing beside the device repeats
// its menu. When the device changes, the page stays loaded and is laid
// out again at the new size while the frame fades across.
//
// THE PAGE INSIDE FILLS THE SCREEN IN EVERY BROWSER. The frame is sized
// at the device's width and scaled to the screen (with zoom where the
// browser measures zoom the standard way, otherwise a transform); the
// page inside is also told that width, and checks it against what it is
// given, correcting itself where a browser carries the zoom around the
// frame into it (ApplicantFrame), which drew the page in a corner of the
// screen.
// =====================================================================

const FRAMES: Record<DeviceKey, string> = {
  laptop: laptopFrame,
  'tablet-landscape': tabletLandscapeFrame,
  'tablet-portrait': tabletPortraitFrame,
  phone: phoneFrame,
};

/** How wide each device is drawn at most on the page, in CSS pixels. */
const MAX_WIDTH: Record<DeviceKey, number> = {
  laptop: 1180,
  'tablet-landscape': 1000,
  'tablet-portrait': 640,
  phone: 360,
};

/** At full size: as large as the window allows, height included. */
const fullSize = (w: number, h: number) => `min(100%, calc((100dvh / var(--ws-scale, 1) - 9rem) * ${w} / ${h}))`;

function Clock() {
  return <span className="tabular-nums">9:41</span>;
}

export function DeviceShowcase({ device, src: initialSrc, title, address, frameRef, onFrameLoad, large = false, children }: {
  device: DeviceKey;
  /** The page shown in the device. Read once: the page is never reloaded by a change of device. */
  src: string;
  /** What the frame is, for assistive technology. */
  title: string;
  /** The address shown in the device's address bar. */
  address: string;
  frameRef: RefObject<HTMLIFrameElement>;
  onFrameLoad?: () => void;
  /** Drawn as large as the window allows (a Full size view). */
  large?: boolean;
  /** Laid over the device (a note, a badge). */
  children?: ReactNode;
}) {
  const spec = DEVICES[device];
  const [src] = useState(initialSrc);
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [useZoom] = useState(() => zoomMeasuresAsDrawn());

  // The page's scale: the screen's drawn width over the device's page width.
  // Measured again whenever the screen, the window or the device changes,
  // and never above the device's own size: a page drawn larger than the
  // screen would be cut off at its edges.
  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / spec.viewport.width));
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', measure); ro?.disconnect(); };
  }, [spec, large]);

  // The frame fades across when the device changes; the page stays.
  const [shown, setShown] = useState(device);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (device === shown) return;
    setFading(true);
    const t = window.setTimeout(() => { setShown(device); setFading(false); }, 170);
    return () => window.clearTimeout(t);
  }, [device, shown]);

  const s = spec.screen;
  const pct = (v: number, of: number) => `${(100 * v) / of}%`;
  const pageHeight = spec.viewport.height - spec.chromeTop - spec.chromeBottom;
  const phone = device === 'phone';
  const laptop = device === 'laptop';

  return (
    <div className={`ds-showcase relative flex justify-center ${large ? 'px-3 pb-8 pt-4' : 'px-1 pb-8 pt-2 sm:px-4'}`} data-device-showcase>
      <figure
        className={`ds-device relative w-full transition-[opacity,transform] duration-200 ease-out ${fading ? 'scale-[0.97] opacity-0' : 'scale-100 opacity-100'}`}
        style={large ? { width: fullSize(spec.image.width, spec.image.height) } : { maxWidth: MAX_WIDTH[device] }}
        data-device={shown}
      >
        {/* The shadow on the page, under the device. */}
        <div aria-hidden="true" className="ds-floor pointer-events-none absolute inset-x-[10%] -bottom-5 h-9" />
        <div className="relative" style={{ aspectRatio: `${spec.image.width} / ${spec.image.height}` }}>
          {/* The screen: the device's strips and the page, scaled. */}
          <div
            ref={screenRef}
            className="absolute overflow-hidden bg-background"
            style={{
              left: pct(s.left, spec.image.width), top: pct(s.top, spec.image.height),
              width: pct(s.width, spec.image.width), height: pct(s.height, spec.image.height),
              borderRadius: `${(s.radius / spec.image.width) * 100}% / ${(s.radius / spec.image.height) * 100}%`,
            }}
          >
            {/* SCALED WITH ZOOM, NOT A TRANSFORM, where the browser measures
                zoom the standard way: inside the workspace's own 90% zoom a
                transformed frame is painted unscaled once the page has been
                scrolled, which drew the page far too large and cut it off. */}
            <div
              className={useZoom ? undefined : 'origin-top-left'}
              style={useZoom
                ? { width: spec.viewport.width, height: spec.viewport.height, zoom: scale }
                : { width: spec.viewport.width, height: spec.viewport.height, transform: `scale(${scale})` }}
            >
              {/* Above the page: the phone's status bar, or the browser's address bar. */}
              {phone ? (
                <div className="flex items-center justify-between bg-background px-7 font-body text-[15px] font-semibold text-foreground" style={{ height: spec.chromeTop }} aria-hidden="true">
                  <Clock />
                  <span className="flex items-center gap-1.5"><Signal className="h-4 w-4" /><Wifi className="h-4 w-4" /><BatteryFull className="h-5 w-5" /></span>
                </div>
              ) : (
                <div className="flex items-center gap-3 border-b border-separator bg-muted/70 px-4 font-body text-[13px] text-muted-foreground" style={{ height: spec.chromeTop }} aria-hidden="true">
                  {laptop ? (
                    <span className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
                    </span>
                  ) : <Clock />}
                  <span className={`flex min-w-0 items-center gap-1.5 rounded-md bg-background px-3 py-1 ${laptop ? 'w-[38%]' : 'mx-auto w-[46%] justify-center'}`}>
                    <Lock className="h-3 w-3 shrink-0" /><span className="truncate">{address}</span>
                  </span>
                  {!laptop && <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /><BatteryFull className="h-4 w-4" /></span>}
                </div>
              )}
              <iframe
                ref={frameRef}
                title={title}
                src={src}
                onLoad={() => { onFrameLoad?.(); const el = screenRef.current; if (el && el.clientWidth > 0) setScale(Math.min(1, el.clientWidth / spec.viewport.width)); }}
                className="block border-0 bg-background"
                style={{ width: spec.viewport.width, height: pageHeight }}
              />
              {phone && (
                <div className="flex flex-col items-center justify-center gap-2 bg-muted/80 font-body text-[13px] text-foreground" style={{ height: spec.chromeBottom }} aria-hidden="true">
                  <span className="flex items-center gap-1.5 rounded-full bg-background px-4 py-1"><Lock className="h-3 w-3" />minervaims.org</span>
                  <span className="h-[5px] w-32 rounded-full bg-foreground/80" />
                </div>
              )}
            </div>
          </div>
          {/* The frame, on top: its screen is clear. */}
          <img
            src={FRAMES[shown]}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="ap-frame pointer-events-none absolute inset-0 h-full w-full select-none"
          />
        </div>
        {children}
      </figure>
    </div>
  );
}

const FAMILIES: { id: DeviceFamily; label: string; Icon: typeof Laptop }[] = [
  { id: 'laptop', label: 'Computer', Icon: Laptop },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'phone', label: 'Phone', Icon: Smartphone },
];

/**
 * The device switch: three marks in a row, the one shown filled. Pressing
 * the tablet's mark again turns the tablet. Full size, when given, is the
 * fourth mark, set apart.
 */
export function DeviceSwitch({ family, upright, onChange, onRotate, onFullSize, className = '' }: {
  family: DeviceFamily;
  upright: boolean;
  onChange: (family: DeviceFamily) => void;
  onRotate: () => void;
  onFullSize?: () => void;
  className?: string;
}) {
  const name = family === 'tablet' ? (upright ? 'Tablet, upright' : 'Tablet, on its side') : FAMILIES.find((f) => f.id === family)?.label;
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`} data-ro>
      <div className="flex items-center gap-1 rounded-full border border-separator bg-background p-1 shadow-sm" role="radiogroup" aria-label="Device">
        {FAMILIES.map(({ id, label, Icon }) => {
          const on = family === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={id === 'tablet' && on ? (upright ? 'Tablet, upright: press to turn it on its side' : 'Tablet, on its side: press to hold it upright') : label}
              title={id === 'tablet' && on ? 'Press again to turn the tablet' : label}
              onClick={() => (on && id === 'tablet' ? onRotate() : onChange(id))}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors lg:h-9 lg:w-9 ${on ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Icon className={`h-4 w-4 transition-transform duration-200 ${id === 'tablet' && !(on && upright) ? 'rotate-90' : ''}`} aria-hidden="true" />
              {id === 'tablet' && on && <RotateCcw className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-background p-[1px] text-accent" aria-hidden="true" />}
            </button>
          );
        })}
        {onFullSize && (
          <>
            <span className="mx-1 h-5 w-px bg-separator" aria-hidden="true" />
            <button type="button" onClick={onFullSize} aria-label="Full size" title="Full size"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:h-9 lg:w-9">
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <span className="text-xs text-muted-foreground" aria-live="polite">{name}</span>
    </div>
  );
}
