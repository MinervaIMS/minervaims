import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { heroMedia } from './media';

// =====================================================================
// Hero scene: the investment universe, ordered around Minerva.
//
// Layer 1 is a procedural particle field, several thousand points in very
// slow orbital drift around an off-centre focus. The points are laid out
// in bands so the motion reads as orbits rather than as noise.
//
// Layer 2 is the Society's own emblem at that focus, as a machined
// object, turning once a minute.
//
// The generator below is deterministic and shares its seed and constants
// with the script that produced join-hero-still.avif, so the static
// fallback is a true still of this scene rather than a different picture.
//
// Nothing here is allowed to cost first paint: the whole module is loaded
// lazily, the canvas is transparent over the static image, and the frame
// loop stops whenever the hero is off screen.
// =====================================================================

const SEED = 20190001;
const COUNT = 4200;
const BANDS = 7;
const TILT = 0.34;
const FIELD_RADIUS = 6.2;
const POINT_TONE = new THREE.Color('#AFA2D2');
const SPARK_TONE = new THREE.Color('#FFFFFF');

/** The same linear congruential generator used by the still capture. */
function makeRandom(seed: number) {
  let x = seed & 0x7fffffff;
  return () => {
    x = (Math.imul(1103515245, x) + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

function ParticleField({ still }: { still: boolean }) {
  const points = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const rand = makeRandom(SEED);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const band = Math.floor(rand() * BANDS);
      const radius = (0.1 + 0.9 * Math.sqrt((band + 0.18 * rand()) / BANDS)) * FIELD_RADIUS;
      const theta = rand() * Math.PI * 2;
      const spark = rand() > 0.988;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius * TILT + (rand() - 0.5) * radius * 0.055;
      positions[i * 3 + 2] = Math.sin(theta) * radius * 0.42;

      const depth = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(theta));
      const tone = spark ? SPARK_TONE : POINT_TONE;
      const level = (spark ? 1 : 0.34 + 0.42 * rand()) * depth;
      colors[i * 3] = tone.r * level;
      colors[i * 3 + 1] = tone.g * level;
      colors[i * 3 + 2] = tone.b * level;
      scales[i] = spark ? 2.6 : 1;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const m = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    return { geometry: g, material: m };
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (still || !points.current) return;
    // One revolution takes roughly four minutes: present, never busy.
    points.current.rotation.y += delta * 0.026;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

function MinervaMark({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(heroMedia.markUrl);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    // Normalise whatever scale the mesh arrived at, then sit it at the
    // orbital focus.
    const scale = 2.5 / Math.max(size.x, size.y, size.z || 1);
    clone.position.sub(centre);
    clone.scale.setScalar(scale);
    return clone;
  }, [scene]);

  useFrame((_, delta) => {
    if (still || !group.current) return;
    // Roughly one turn per sixty seconds.
    group.current.rotation.y += delta * ((Math.PI * 2) / 60);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

/** A few pixels of pointer parallax on desktop, and nothing more. */
function PointerParallax({ still }: { still: boolean }) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (still) return;
    if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 0.34;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 0.2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [still]);

  useFrame(() => {
    if (still) return;
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (-target.current.y - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/** Keeps a missing or malformed mesh from taking the whole hero down. */
class MeshBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Minerva mark could not be loaded:', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Props {
  still: boolean;
  /** 0 at the top of the hero, 1 once it has scrolled away. */
  scrollOut: number;
  onFailure: () => void;
}

export default function HeroScene({ still, scrollOut, onFailure }: Props) {
  const wrapper = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(true);

  // Suspend the loop entirely while the hero is off screen.
  useEffect(() => {
    const el = wrapper.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setActive(entries.some((e) => e.isIntersecting)), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The single cinematic transition of the page: as the hero leaves, the
  // field and the mark recede and fade rather than simply scrolling off.
  const style = still
    ? undefined
    : {
        transform: `scale(${1 - scrollOut * 0.12})`,
        opacity: 1 - scrollOut * 0.9,
        willChange: 'transform, opacity',
      };

  return (
    <div ref={wrapper} className="absolute inset-0" style={style} aria-hidden>
      <Canvas
        frameloop={active && !still ? 'always' : 'demand'}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 9.2], fov: 38 }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
        onError={onFailure}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 8]} intensity={1.35} color="#EDE8FF" />
        <directionalLight position={[-6, -2, -4]} intensity={0.4} color="#AFA2D2" />
        <ParticleField still={still} />
        {/* If the mesh is missing or fails to decode, the field carries
            the hero on its own. That is a complete scene, not a hole. */}
        <MeshBoundary>
          <Suspense fallback={null}>
            <MinervaMark still={still} />
          </Suspense>
        </MeshBoundary>
        <PointerParallax still={still} />
      </Canvas>
    </div>
  );
}

useGLTF.preload?.(heroMedia.markUrl);
