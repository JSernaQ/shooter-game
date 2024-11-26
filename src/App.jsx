import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon';
import { PointerLockControls, Text, Sky } from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

function Particles({ position }) {
  const [particles, setParticles] = useState(
    Array.from({ length: 10 }, () => ({
      id: Math.random(),
      position: [
        position[0] + (Math.random() - 0.5),
        position[1] + (Math.random() - 0.5),
        position[2] + (Math.random() - 0.5)
      ],
      velocity: [
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ],
      lifetime: 1
    }))
  );

  useFrame(() => {
    setParticles(currentParticles =>
      currentParticles
        .map(particle => ({
          ...particle,
          position: [
            particle.position[0] + particle.velocity[0] * 0.1,
            particle.position[1] + particle.velocity[1] * 0.1,
            particle.position[2] + particle.velocity[2] * 0.1
          ],
          lifetime: particle.lifetime - 0.05
        }))
        .filter(particle => particle.lifetime > 0)
    );
  });

  return (
    <>
      {particles.map(particle => (
        <mesh
          key={particle.id}
          position={particle.position}
          scale={[0.1, 0.1, 0.1]}
        >
          <boxGeometry />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}
    </>
  );
}

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

function Projectile({ position, direction, onProjectileHit }) {
  const speed = 100;
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
  }, [direction, api]);

  useFrame(() => {
    // Chequeamos la distancia con los enemigos directamente
    enemies.forEach(enemy => {
      const projPos = new THREE.Vector3(position[0], position[1], position[2]);
      const enemyPos = new THREE.Vector3(enemy.position[0], enemy.position[1], enemy.position[2]);
      const distance = projPos.distanceTo(enemyPos);
      if (distance < 1) {
        onProjectileHit(enemy.id);
      }
    });
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="red" />
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

    const direction = new THREE.Vector3(
      playerPos.x - enemyPos.x,
      0,
      playerPos.z - enemyPos.z
    ).normalize();

    api.velocity.set(
      direction.x * speed,
      0,
      direction.z * speed
    );

    // Chequeamos la distancia con el jugador
    const distance = new THREE.Vector3().subVectors(camera.position, ref.current.position).length();
    if (distance < 1) {
      onHit();
    }
  });

  return (
    <mesh ref={ref}>
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
  const [score, setScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [wave, setWave] = useState(1);

  const { camera } = useThree();
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    setEnemies([]);

    const newEnemies = Array.from({ length: wave }, (_, index) => ({
      id: Date.now() + index,
      position: [
        Math.random() * 40 - 20,
        1,
        Math.random() * 40 - 20
      ],
      speed: 1 + (wave * 0.1)
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

  const handleProjectileHit = (enemyId) => {
    setProjectiles(prev => prev.filter(p => p.id !== enemyId));
    setEnemies(prev => prev.filter(enemy => enemy.id !== enemyId));
    setScore(prev => prev + 1);
  };

  const handleEnemyHit = () => {
    setPlayerHealth(prev => Math.max(prev - 10, 0));
    if (playerHealth <= 0) {
      alert('Game Over');
    }
  };

  return (
    <>
      <PointerLockControls />
      <Text
        position={[-5, 5, 0]}
        fontSize={1}
        color="white"
      >
        Score: {score}
      </Text>
      <Text
        position={[-5, 4, 0]}
        fontSize={1}
        color="white"
      >
        Health: {playerHealth}
      </Text>

      <Particles position={[0, 2, 0]} />

      {projectiles.map((proj) => (
        <Projectile
          key={proj.id}
          position={proj.position}
          direction={proj.direction}
          onProjectileHit={handleProjectileHit}
        />
      ))}

      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          position={enemy.position}
          speed={enemy.speed}
          onHit={handleEnemyHit}
        />
      ))}
    </>
  );
}

function Game() {
  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      <Sky sunPosition={[100, 100, 100]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} castShadow />
      <Physics>
        <Plane />
        <Player />
      </Physics>
    </Canvas>
  );
}

export default Game;
