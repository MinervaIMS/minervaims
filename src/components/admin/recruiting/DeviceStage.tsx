import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BatteryFull, Lock, Signal, Wifi } from 'lucide-react';
import laptopFrame from '@/assets/devices/laptop.webp';
import tabletLandscapeFrame from '@/assets/devices/tablet-landscape.webp';
import tabletPortraitFrame from '@/assets/devices/tablet-portrait.webp';
import phoneFrame from '@/assets/devices/phone.webp';
import { DEVICES, PREVIEW_FRAME_PATH, applicantPagePath, type DeviceKey } from '@/lib/applicant-frame';
import { zoomMeasuresAsDrawn } from '@/lib/workspace-scale';

// =====================================================================
// A DEVICE ON A DESK (Step 108).
// ---------------------------------------------------------------------
// The applicant's workspace, live, inside the supplied frame of a
// computer, a tablet or a phone: the frame on top (its screen is clear),
// the page behind it at the size that device shows, scaled to the
// screen, with the device's own strip above it (the browser's address
// bar, or the phone's clock and signal) and, on the phone, the address
// bar and home indicator below. A soft shadow under the device and a
// floor shadow beneath it set it on the page like a product shot.
//
// The page stays loaded when the device changes: it is laid out again at
// the new size, while the frame fades across. The applicant can be
// clicked through inside the device exactly as on their own.
// =====================================================================

const FRAMES: Record<DeviceKey, string> = {
  laptop: laptopFrame,
  'tablet-landscape': tabletLandscapeFrame,
  'tablet-portrait': tabletPortraitFrame,
  phone: phoneFrame,
};

/** How wide each device is drawn at most on the page, in CSS pixels. */
const MAX_WIDTH: Record<DeviceKey, number> = {
  laptop: 1120,
  'tablet-landscape': 980,
  'tablet-portrait': 620,
  phone: 350,
};

/** At full size: as large as the window allows, height included. */
const fullSize = (w: number, h: number) => `min(100%, calc((100dvh / var(--ws-scale, 1) - 9rem) * ${w} / ${h}))`;

function Clock() {
  return <span className="tabular-nums">9:41</span>;
}

export function DeviceStage({ device, page, start, frameRef, onFrameLoad, large = false, children }: {
  device: DeviceKey;
  /** Where the device's page starts: the stage and page shown when it is drawn. */
  start: { stage: string; page: string };
  /** Drawn as large as the window allows (the Full size view). */
  large?: boolean;
  /** The applicant's page shown, for the address bar. */
  page: string;
  frameRef: React.RefObject<HTMLIFrameElement>;
  onFrameLoad: () => void;
  /** Laid over the device (the "new in their menu" note). */
  children?: React.ReactNode;
}) {
  const spec = DEVICES[device];
  // The address is fixed when the device is drawn, so the page inside is
  // never reloaded by a change of stage (those arrive as messages).
  const [src] = useState(() => `${PREVIEW_FRAME_PATH}?${new URLSearchParams(start).toString()}`);
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
  const address = applicantPagePath(page);
  const phone = device === 'phone';
  const laptop = device === 'laptop';

  return (
    <div className={`ap-desk relative flex justify-center ${large ? 'px-3 pb-8 pt-4' : 'px-2 pb-10 pt-6 sm:px-6'}`}>
      <figure
        className={`ap-device relative w-full transition-[opacity,transform] duration-200 ease-out ${fading ? 'scale-[0.97] opacity-0' : 'scale-100 opacity-100'}`}
        style={large ? { width: fullSize(spec.image.width, spec.image.height) } : { maxWidth: MAX_WIDTH[device] }}
        data-device={shown}
      >
        {/* The floor shadow, under the device. */}
        <div aria-hidden="true" className="ap-floor pointer-events-none absolute inset-x-[8%] -bottom-6 h-10" />
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
                title="The applicant's workspace"
                src={src}
                onLoad={() => { onFrameLoad(); const el = screenRef.current; if (el && el.clientWidth > 0) setScale(Math.min(1, el.clientWidth / spec.viewport.width)); }}
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
