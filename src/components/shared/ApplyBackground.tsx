import Beams from '@/components/shared/Beams';

/**
 * Full-bleed Minerva beams background used across the whole application flow:
 * the Apply form, the post-application "confirm your email" page, and the
 * "application submitted" success card. Mirrors the background used on the
 * Workspace auth pages (/auth, /check-email, etc.).
 */
export function ApplyBackground() {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: '#05030F' }} aria-hidden="true">
      <Beams
        beamWidth={8.4}
        beamHeight={30}
        beamNumber={38}
        lightColor="#afa2d2"
        speed={2}
        noiseIntensity={0.6}
        scale={0.2}
        rotation={30}
      />
    </div>
  );
}

export default ApplyBackground;
