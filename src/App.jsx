import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon';
import { PointerLockControls, Text, Sky } from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

function Plane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="lightgray" />
    </mesh>
  );
}

function Projectile({ position, direction }) {
  const speed = 200;
  const [ref, api] = useSphere(() => ({
    mass: 0.1,
    position,
    args: [0.1],
  }));

  useEffect(() => {
    api.velocity.set(
      direction[0] * speed, 
      direction[1] * speed, 
      direction[2] * speed
    );

    const timer = setTimeout(() => {
      api.position.set(1000, 1000, 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
  );
}

function Enemy({ position, speed, onHit }) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [1, 1, 1],
  }));

  const { camera } = useThree();

  useFrame(() => {
    const enemyPos = ref.current.position;
    const playerPos = camera.position;

    // Dirección hacia el jugador
    const direction = new THREE.Vector3(
      playerPos.x - enemyPos.x,
      0,
      playerPos.z - enemyPos.z
    ).normalize();

    // Mover hacia el jugador
    api.velocity.set(
      direction.x * speed, 
      0, 
      direction.z * speed
    );
  });

  return (
    <mesh ref={ref} onPointerDown={(e) => {
      e.stopPropagation();
      onHit();
    }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}

function Player() {
  const speed = 5;
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: [0, 1, 0],
    args: [1, 1, 1],
  }));

  const [projectiles, setProjectiles] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);

  const { camera } = useThree();
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Generar enemigos en oleadas
  useEffect(() => {
    // Limpiar enemigos anteriores
    setEnemies([]);

    // Generar nueva oleada
    const newEnemies = Array.from({ length: wave }, (_, index) => ({
      id: Date.now() + index,
      position: [
        Math.random() * 40 - 20, 
        1, 
        Math.random() * 40 - 20
      ],
      speed: 2 + (wave * 0.5) // Aumentar velocidad con cada oleada
    }));

    setEnemies(newEnemies);
  }, [wave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = true; break;
        case 'KeyS': keys.current.backward = true; break;
        case 'KeyA': keys.current.left = true; break;
        case 'KeyD': keys.current.right = true; break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = false; break;
        case 'KeyS': keys.current.backward = false; break;
        case 'KeyA': keys.current.left = false; break;
        case 'KeyD': keys.current.right = false; break;
      }
    };

    const handleClick = () => {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      setProjectiles(prev => [...prev, {
        id: Date.now(),
        position: [camera.position.x, camera.position.y, camera.position.z],
        direction: [direction.x, direction.y, direction.z]
      }]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
    };
  }, [camera]);

  useFrame(() => {
    const moveDirection = new THREE.Vector3();
    camera.getWorldDirection(moveDirection);
    moveDirection.y = 0;
    moveDirection.normalize();

    const rightVector = new THREE.Vector3().crossVectors(moveDirection, new THREE.Vector3(0, 1, 0));

    const velocity = [0, 0, 0];
    if (keys.current.forward) {
      velocity[0] += moveDirection.x * speed;
      velocity[2] += moveDirection.z * speed;
    }
    if (keys.current.backward) {
      velocity[0] -= moveDirection.x * speed;
      velocity[2] -= moveDirection.z * speed;
    }
    if (keys.current.left) {
      velocity[0] -= rightVector.x * speed;
      velocity[2] -= rightVector.z * speed;
    }
    if (keys.current.right) {
      velocity[0] += rightVector.x * speed;
      velocity[2] += rightVector.z * speed;
    }

    api.velocity.set(velocity[0], 0, velocity[2]);

    api.position.subscribe(([x, y, z]) => {
      camera.position.set(x, y + 1, z);
    });
  });

  // Lógica de eliminación de enemigos
  const handleEnemyHit = (enemyId) => {
    setEnemies(prev => prev.filter(enemy => enemy.id !== enemyId));
    setScore(prev => prev + 1);

    // Si se eliminan todos los enemigos, pasar a la siguiente oleada
    if (enemies.length === 1) {
      setWave(prev => prev + 1);
    }
  };

  return (
    <>
      <mesh ref={ref} rotation={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* HUD */}
      <Text
        position={[0, 3, -5]}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontSize={0.5}
      >
        Wave: {wave} | Score: {score}
      </Text>

      {projectiles.map(proj => (
        <Projectile 
          key={proj.id} 
          position={proj.position} 
          direction={proj.direction} 
        />
      ))}

      {enemies.map(enemy => (
        <Enemy 
          key={enemy.id} 
          position={enemy.position} 
          speed={enemy.speed}
          onHit={() => handleEnemyHit(enemy.id)}
        />
      ))}
    </>
  );
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      <PointerLockControls />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 15, 10]} angle={0.3} castShadow />
      <Sky sunPosition={[100, 10, 100]} />
      <Physics gravity={[0, 0, 0]}>
        <Plane />
        <Player />
      </Physics>
    </Canvas>
  );
}