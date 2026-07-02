import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import logoWhite from "@/assets/logo-white.svg";

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep the latest onComplete without retriggering the animation effect.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const overlay = overlayRef.current;
    const logo = logoRef.current;
    if (!overlay || !logo) return;

    // Start with the panel closed (scaleX 0) so we get an opening vertical wipe.
    gsap.set(overlay, { scaleX: 0, transformOrigin: "center center" });
    gsap.set(logo, { opacity: 0, scale: 0.94 });

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        onCompleteRef.current();
      },
    });

    tl
      // Panel expands from centre to full width
      .to(overlay, {
        scaleX: 1,
        duration: 0.75,
        ease: "power2.inOut",
      })
      // Logo settles in
      .to(logo, {
        opacity: 0.9,
        scale: 1,
        duration: 0.55,
        ease: "power2.out",
      })
      // Hold
      .to({}, { duration: 0.9 })
      // Logo fades out
      .to(logo, {
        opacity: 0,
        duration: 0.45,
        ease: "power2.in",
      })
      // Panel contracts back to nothing, revealing the page
      .to(overlay, {
        scaleX: 0,
        duration: 0.75,
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
