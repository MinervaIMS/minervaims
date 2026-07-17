import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import logoWhite from "@/assets/logo-white.svg";

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const overlay = overlayRef.current;
    const logo = logoRef.current;

    if (!overlay || !logo) {
      document.body.style.overflow = "";
      onComplete();
      return;
    }

    gsap.set(overlay, {
      scaleX: 1,
      transformOrigin: "center center",
    });

    // The logo stays invisible until the browser has FULLY decoded it.
    // Without this gate, slow devices paint the image progressively while
    // the fade-in runs (top quarter first, the rest a moment later).
    gsap.set(logo, {
      opacity: 0,
      scale: 0.94,
      visibility: "hidden",
    });

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;

    const start = () => {
      if (cancelled) return;
      gsap.set(logo, { visibility: "visible" });
      tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = "";
          onComplete();
        },
      });
      tl
        // Logo settles in
        .to(logo, {
          opacity: 0.9,
          scale: 1,
          duration: 0.48,
          ease: "power1.out",
        })
        // Hold
        .to({}, { duration: 0.88 })
        // Logo fades out
        .to(logo, {
          opacity: 0,
          duration: 0.38,
          ease: "power1.in",
        })
        // Full screen contracts back to nothing
        .to(overlay, {
          scaleX: 0,
          duration: 0.72,
          ease: "power2.inOut",
        });
    };

    // Wait for a complete, atomic decode of the logo before animating it in;
    // if decoding stalls (unsupported browser, network hiccup), a timeout
    // starts the sequence anyway so the preloader can never hang.
    const decoded: Promise<unknown> =
      typeof logo.decode === "function"
        ? logo.decode().catch(() => undefined)
        : logo.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              logo.onload = resolve;
              logo.onerror = resolve;
            });
    const timeout = new Promise((resolve) => setTimeout(resolve, 1400));
    Promise.race([decoded, timeout]).then(start);

    return () => {
      cancelled = true;
      tl?.kill();
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "#1F0F4D",
        willChange: "transform",
      }}
    >
      <img
        ref={logoRef}
        src={logoWhite}
        alt="Minerva IMS"
        draggable={false}
        decoding="async"
        style={{
          width: "clamp(140px, 16vw, 240px)",
          height: "auto",
          userSelect: "none",
          pointerEvents: "none",
          willChange: "opacity, transform",
        }}
      />
    </div>
  );
}
