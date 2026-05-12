"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, PresentationControls } from "@react-three/drei";
import * as THREE from "three";

// Reusable hook for smooth hover scaling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useSmoothHover(ref: any, hovered: boolean, baseScale: number = 1, hoverScale: number = 1.15) {
  useFrame((state, delta) => {
    if (ref.current) {
      const targetScale = hovered ? hoverScale : baseScale;
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MinecraftBlock(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  useSmoothHover(meshRef, hovered);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5} {...props}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshPhysicalMaterial 
          color={hovered ? "#4ade80" : "#22c55e"} 
          roughness={0.1} 
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
        <mesh scale={1.02}>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshBasicMaterial color="#166534" wireframe transparent opacity={0.3} />
        </mesh>
      </mesh>
    </Float>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpotifySphere(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  useSmoothHover(meshRef, hovered);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.1;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.8} floatIntensity={2} {...props}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshPhysicalMaterial 
          color={hovered ? "#10b981" : "#059669"} 
          roughness={0.2} 
          metalness={0.9}
          clearcoat={0.5}
        />
      </mesh>
    </Float>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NetflixTorus(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  useSmoothHover(meshRef, hovered);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.z -= delta * 0.3;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={1.5} floatIntensity={1.5} {...props}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
      >
        <torusGeometry args={[0.7, 0.25, 32, 100]} />
        <meshPhysicalMaterial 
          color={hovered ? "#ef4444" : "#dc2626"} 
          roughness={0.1} 
          metalness={0.5}
          transmission={0.5} // Glass-like effect
          thickness={0.5}
        />
      </mesh>
    </Float>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TechPyramid(props: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  useSmoothHover(meshRef, hovered);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={2} {...props}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
      >
        <octahedronGeometry args={[0.8, 0]} />
        <meshPhysicalMaterial 
          color={hovered ? "#a855f7" : "#7e22ce"} 
          roughness={0.1} 
          metalness={0.7}
          clearcoat={1}
        />
        <mesh scale={1.05}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial color="#581c87" wireframe transparent opacity={0.4} />
        </mesh>
      </mesh>
    </Float>
  );
}

function FloatingParticles() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  const [particles, setParticles] = useState<{ speed: number; position: [number, number, number]; scale: number; color: string; opacity: number }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles(Array.from({ length: 25 }).map(() => ({
        speed: 0.5 + Math.random(),
        position: [
          (Math.random() - 0.5) * 16, 
          (Math.random() - 0.5) * 10, 
          -2 - Math.random() * 8
        ] as [number, number, number],
        scale: 0.05 + Math.random() * 0.1,
        color: Math.random() > 0.6 ? "#22c55e" : (Math.random() > 0.3 ? "#8b5cf6" : "#4ade80"),
        opacity: 0.3 + Math.random() * 0.3
      })));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <Float 
          key={i}
          speed={p.speed} 
          rotationIntensity={1} 
          floatIntensity={1.5} 
          position={p.position}
        >
          <mesh scale={p.scale}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial 
              color={p.color} 
              transparent 
              opacity={p.opacity} 
              wireframe 
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Dynamic gradient overlay to ensure text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,theme(colors.background)_100%)] z-10 pointer-events-none opacity-80" />
      
      <Canvas 
        camera={{ position: [0, 0, 9], fov: 40 }} 
        dpr={[1, 2]} // Optimizes performance on retina displays
        className="pointer-events-auto"
      >
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#4ade80" />
        <Environment preset="city" />
        
        <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={2} far={4.5} color="#000000" />

        <PresentationControls 
          global 
          snap={true} 
          rotation={[0, 0, 0]} 
          polar={[-0.1, 0.1]} // Restrict vertical rotation slightly
          azimuth={[-0.3, 0.3]} // Restrict horizontal rotation
        >
          {/* Group to center and position the interactive items elegantly framing the text */}
          <group position={[0, 0, 0]}>
            {/* Left side */}
            <MinecraftBlock position={[-4.5, 0.2, 1]} rotation={[0.4, 0.6, 0]} />
            <NetflixTorus position={[-3.8, 2.5, -2]} rotation={[-0.5, 0.2, 0.3]} />
            
            {/* Right side */}
            <SpotifySphere position={[4.2, 1.8, -1]} />
            <TechPyramid position={[4.5, -1.2, 1.5]} rotation={[0.2, -0.4, 0.5]} />
            
            <FloatingParticles />
          </group>
        </PresentationControls>
      </Canvas>
    </div>
  );
}
