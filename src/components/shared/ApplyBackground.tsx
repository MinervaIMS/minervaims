import DotField from '@/components/shared/DotField';

/**
 * Full-bleed Minerva DotField background used across the whole application flow:
 * the Apply form, the post-application "confirm your email" page, and the
 * "application submitted" success card. Deep-indigo field with a lavender dot
 * gradient that gently reacts to the cursor.
 */
export function ApplyBackground() {
  return (
    <div className="absolute inset-0" style={{ background: '#120A26' }} aria-hidden="true">
      <DotField
        dotRadius={1}
        dotSpacing={17}
        bulgeStrength={10}
        glowRadius={50}
        sparkle={false}
        waveAmplitude={0}
        cursorRadius={500}
        cursorForce={0}
        bulgeOnly
        gradientFrom="#7E5BC2"
        gradientTo="#B0A2DA"
        glowColor="#2A1A5C"
      />
    </div>
  );
}

export default ApplyBackground;
