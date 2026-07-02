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

    gsap.set(logo, {
      opacity: 0,
      scale: 0.94,
    });

    const tl = gsap.timeline({
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

    return () => {
      tl.kill();
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
