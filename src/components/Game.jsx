// App.jsx
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { PointerLockControls } from '@react-three/drei';
import './styles.css'; // Asegúrate de incluir estilos

function Plane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0], // Plano horizontal
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="lightgray" />
    </mesh>
  );
}

function Player() {
  const speed = 5;
  const jumpStrength = 5;
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: [0, 1, 0],
    args: [1, 1, 1], // Tamaño del jugador
  }));

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
          keys.current.forward = true;
          break;
        case 'KeyS':
          keys.current.backward = true;
          break;
        case 'KeyA':
          keys.current.left = true;
          break;
        case 'KeyD':
          keys.current.right = true;
          break;
        case 'Space':
          api.velocity.set(0, jumpStrength, 0);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
          keys.current.forward = false;
          break;
        case 'KeyS':
          keys.current.backward = false;
          break;
        case 'KeyA':
          keys.current.left = false;
          break;
        case 'KeyD':
          keys.current.right = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [api]);

  useFrame(() => {
    const velocity = [0, 0, 0];
    if (keys.current.forward) velocity[2] = -speed;
    if (keys.current.backward) velocity[2] = speed;
    if (keys.current.left) velocity[0] = -speed;
    if (keys.current.right) velocity[0] = speed;

    api.velocity.set(velocity[0], 0, velocity[2]);
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      <PointerLockControls />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 15, 10]} angle={0.3} castShadow />
      <Physics gravity={[0, -9.8, 0]}>
        <Plane />
        <Player />
      </Physics>
    </Canvas>
  );
}
