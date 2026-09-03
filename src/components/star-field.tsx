'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Individual star particle ---
function Stars({ count = 500 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [size] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(Math.floor((window.innerWidth * window.innerHeight) / 4000), 600);
  });

  const { positions, sizes, opacities, speeds } = useMemo(() => {
    const n = Math.min(count, size);
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const opacities = new Float32Array(n);
    const speeds = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
      sizes[i] = Math.random() * 2.5 + 0.5;
      opacities[i] = Math.random() * 0.7 + 0.3;
      speeds[i] = Math.random() * 0.3 + 0.05;
    }
    return { positions, sizes, opacities, speeds };
  }, [count, size]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: Math.min(window?.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const time = state.clock.getElapsedTime();

    uniforms.uTime.value = time;
    uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

    // Gentle drift + mouse parallax
    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3;
      const speed = speeds[i];
      // Drift upward
      posAttr.array[ix + 1] += speed * 0.002;
      // Wrap
      if (posAttr.array[ix + 1] > 15) posAttr.array[ix + 1] = -15;

      // Mouse parallax
      const depthFactor = (posAttr.array[ix + 2] + 12) / 20; // 0-1 based on depth
      posAttr.array[ix] += (mouseRef.current.x * 0.3 * depthFactor - posAttr.array[ix]) * 0.001;
    }
    posAttr.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.01;
  });

  const vertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    uniform float uTime;
    uniform float uPixelRatio;
    varying float vOpacity;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPixelRatio * (80.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
      gl_Position = projectionMatrix * mvPosition;

      // Twinkle
      float twinkle = sin(uTime * 1.5 + position.x * 10.0) * 0.2 + 0.8;
      vOpacity = aOpacity * twinkle;
    }
  `;

  const fragmentShader = `
    varying float vOpacity;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float alpha = smoothstep(0.5, 0.0, dist) * vOpacity;
      vec3 color = vec3(0.85, 0.85, 0.85);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          args={[opacities, 1]}
          count={opacities.length}
          array={opacities}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// --- Nebula glow sphere ---
function NebulaGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.position.x = Math.sin(t * 0.1) * 2;
    meshRef.current.position.y = Math.cos(t * 0.08) * 1.5;
    meshRef.current.rotation.z = t * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -8]}>
      <sphereGeometry args={[6, 32, 32]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.01}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// --- Mouse-following glow orb ---
function MouseOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x += (mouseRef.current.x * 5 - meshRef.current.position.x) * 0.02;
    meshRef.current.position.y += (mouseRef.current.y * 3 - meshRef.current.position.y) * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -6]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.015} />
    </mesh>
  );
}

// --- Camera that subtly follows mouse ---
function CameraRig() {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    camera.position.x += (mouseRef.current.x * 0.5 - camera.position.x) * 0.01;
    camera.position.y += (mouseRef.current.y * 0.3 - camera.position.y) * 0.01;
    camera.lookAt(0, 0, -5);
  });

  return null;
}

// --- Main exported component ---
export default function StarField() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <CameraRig />
        <Stars count={600} />
        <NebulaGlow />
        <MouseOrb />
      </Canvas>
    </div>
  );
}
