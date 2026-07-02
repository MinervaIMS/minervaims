import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import logoWhite from "@/assets/logo-white.svg";

interface PreloaderProps {
  onComplete: () => void;
}

// Mobile viewport threshold — matches the inline #initial-loader gate in index.html
// (max-width: 767px). Below this, the HTML splash already covers the screen, so we
// skip the opening wipe and continue seamlessly from full cover.
const MOBILE_MAX = 767;

export function Preloader({ onComplete }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // useLayoutEffect: run gsap.set() BEFORE the browser paints, so there's no
  // first-frame flash of the page underneath.
  useLayoutEffect(() => {
    document.body.style.overflow = "hidden";

    const overlay = overlayRef.current;
    const logo = logoRef.current;
    if (!overlay || !logo) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth <= MOBILE_MAX;

    if (isMobile) {
      // Continue seamlessly from the HTML #initial-loader — no opening wipe.
      // Logo starts already visible so there's no gap after the pulsing HTML logo.
      gsap.set(overlay, { scaleX: 1, transformOrigin: "center center" });
      gsap.set(logo, { opacity: 0.9, scale: 1 });
    } else {
      // Tablet: play the full two-wipe intro.
      gsap.set(overlay, { scaleX: 0, transformOrigin: "center center" });
      gsap.set(logo, { opacity: 0, scale: 0.94 });
    }

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        onCompleteRef.current();
      },
    });

    if (!isMobile) {
      // Opening vertical wipe (tablet only)
      tl.to(overlay, {
        scaleX: 1,
        duration: 0.75,
        ease: "power2.inOut",
      }).to(logo, {
        opacity: 0.9,
        scale: 1,
        duration: 0.55,
        ease: "power2.out",
      });
    }

    tl
      // Hold
      .to({}, { duration: isMobile ? 1.2 : 0.9 })
      // Logo fades out
      .to(logo, {
        opacity: 0,
        duration: 0.65,
        ease: "power2.in",
      })
      // Panel contracts back to nothing, revealing the page
      .to(overlay, {
        scaleX: 0,
        duration: 0.95,
        ease: "power2.inOut",
      });

    return () => {
      tl.kill();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "#1F0F4D",
        willChange: "transform",
        // Initial cover so the first paint (before useLayoutEffect runs) never
        // reveals the page underneath.
        transform: "scaleX(1)",
        transformOrigin: "center center",
      }}
    >
      <img
        ref={logoRef}
        src={logoWhite}
        alt="Minerva IMS"
        draggable={false}
        style={{
          width: "clamp(140px, 16vw, 240px)",
          height: "auto",
          userSelect: "none",
          pointerEvents: "none",
          willChange: "opacity, transform",
          opacity: 0.9,
        }}
      />
    </div>
  );
}
