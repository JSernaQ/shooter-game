import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import { Text, PointerLockControls, Sky, Stars } from '@react-three/drei';
import useSound from 'use-sound';
import * as THREE from 'three';
import './styles.css';

function Plane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="darkgreen" />
    </mesh>
  );
}

function Projectile({ position, direction, onHitEnemy }) {
  const speed = 340;
  const [projectile, setProjectile] = useState(new THREE.Vector3(...position));
  const [active, setActive] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [particlePositions, setParticlePositions] = useState([]);

  useEffect(() => {
    if (!active) return;

    const moveProjectile = () => {
      const moveVector = new THREE.Vector3(
        direction[0] * speed * 0.016,
        direction[1] * speed * 0.016,
        direction[2] * speed * 0.016
      );

      const newPosition = projectile.clone().add(moveVector);
      setProjectile(newPosition);

      window.enemies.forEach((enemy, index) => {
        const distance = newPosition.distanceTo(enemy.position);
        if (distance < 2) {
          setActive(false);
          setExploded(true);

          const initialParticles = Array.from({ length: 50 }, () => ({
            id: Math.random().toString(),
            position: new THREE.Vector3(
              newPosition.x + (Math.random() - 0.5) * 2,
              newPosition.y + (Math.random() - 0.5) * 2,
              newPosition.z + (Math.random() - 0.5) * 2
            ),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 5,
              Math.random() * 10,
              (Math.random() - 0.5) * 5
            ),
            createdAt: Date.now() 
          }));

          setParticlePositions(initialParticles);
          onHitEnemy(index);
        }
      });
    };

    const intervalId = setInterval(moveProjectile, 16);
    const timeoutId = setTimeout(() => setActive(false), 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [active, projectile]);

  useFrame((state, delta) => {
    if (exploded) {
      const currentTime = Date.now();
      const updatedParticles = particlePositions
        .filter(particle => currentTime - particle.createdAt < 1000) 
        .map(particle => {
          particle.velocity.y -= 9.8 * delta;
          particle.position.add(particle.velocity.clone().multiplyScalar(delta));
          return particle;
        });

      setParticlePositions(updatedParticles);

      if (updatedParticles.length === 0) {
        setExploded(false);
      }
    }
  });

  if (!active && !exploded) return null;

  if (exploded) {
    return (
      <points>
        {particlePositions.map((particle) => (
          <points
            key={particle.id}
            position={[particle.position.x, particle.position.y, particle.position.z]}
          >
            <pointsMaterial attach="material" color="red" size={0.2} sizeAttenuation />
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={1}
                array={new Float32Array([0, 0, 0])}
                itemSize={3}
              />
            </bufferGeometry>
          </points>
        ))}
      </points>
    );
  }

  return (
    <mesh position={[projectile.x, projectile.y, projectile.z]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
  );
}

function Enemy({ enemy, onPlayerHit }) {
  const meshRef = useRef();
  const { camera } = useThree();
  const [hasHit, setHasHit] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const directionToPlayer = new THREE.Vector3()
      .subVectors(camera.position, enemy.position)
      .normalize();

    const newPosition = enemy.position.clone();
    newPosition.y = 1;

    newPosition.add(
      directionToPlayer.multiplyScalar(enemy.speed * delta)
    );

    enemy.position.copy(newPosition);

    meshRef.current.position.copy(newPosition);

    const distanceToPlayer = enemy.position.distanceTo(camera.position);
    if (distanceToPlayer < 5 && !hasHit) {
      setHasHit(true); 
      onPlayerHit();  
    } else if (distanceToPlayer >= 5 && hasHit) {
      setHasHit(false);
    }
  });

  return (
    <mesh ref={meshRef} position={[enemy.position.x, 1, enemy.position.z]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}


function GameManager() {
  const [playShootSound] = useSound('/sounds/shoot.mp3', { volume: 0.5 });
  const [playEnemyHitSound] = useSound('/sounds/enemy-hit.mp3', { volume: 0.5 });
  const [playPlayerHitSound] = useSound('/sounds/player-hit.mp3', { volume: 0.5 });
  const [playBackgroundSound] = useSound('/sounds/background.mp3', { volume: 0.1, loop: true });
  const [playWaveCompleteSound] = useSound('/sounds/wave-complete.mp3', { volume: 0.5 });
  const [playGameOverSound] = useSound('/sounds/game-over.mp3', { volume: 0.5 });

  const [gameState, setGameState] = useState({
    Oleada: 1,
    score: 0,
    health: 3,
    gameOver: false
  });

  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const { camera } = useThree();

  const keysPressed = useRef({
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false
  });

  useEffect(() => {
    playBackgroundSound();

  }, []);

  useEffect(() => {
    if (enemies.length === 0 && !gameState.gameOver) {
      const newEnemies = Array.from({ length: gameState.Oleada * 3 }, () => ({
        id: Math.random().toString(),
        position: new THREE.Vector3(
          Math.random() * 80 - 40,
          1,
          Math.random() * 80 - 40
        ),
        speed: 2 + gameState.Oleada * 0.5,
      }));

      setEnemies(newEnemies);
      window.enemies = newEnemies;
    }
  }, [gameState.Oleada, enemies.length, gameState.gameOver]);

  useFrame((state, delta) => {
    if (gameState.gameOver) return;

    const moveSpeed = 10;
    const moveDirection = new THREE.Vector3();
    camera.getWorldDirection(moveDirection);
    moveDirection.y = 0;
    moveDirection.normalize();

    const rightVector = new THREE.Vector3()
      .crossVectors(moveDirection, new THREE.Vector3(0, 1, 0));

    if (keysPressed.current.KeyW) {
      camera.position.add(moveDirection.clone().multiplyScalar(moveSpeed * delta));
    }
    if (keysPressed.current.KeyS) {
      camera.position.sub(moveDirection.clone().multiplyScalar(moveSpeed * delta));
    }
    if (keysPressed.current.KeyA) {
      camera.position.sub(rightVector.clone().multiplyScalar(moveSpeed * delta));
    }
    if (keysPressed.current.KeyD) {
      camera.position.add(rightVector.clone().multiplyScalar(moveSpeed * delta));
    }
  });

  const fireProjectile = () => {
    if (gameState.gameOver) return;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    setProjectiles(prev => [...prev, {
      id: Date.now(),
      position: [camera.position.x, camera.position.y, camera.position.z],
      direction: [direction.x, direction.y, direction.z]
    }]);

    playShootSound();
  };

  const handleEnemyHit = (index) => {
    playEnemyHitSound();

    const newEnemies = enemies.filter((_, i) => i !== index);
    setEnemies(newEnemies);
    window.enemies = newEnemies;

    setGameState(prev => ({
      ...prev,
      score: prev.score + 1
    }));

    if (newEnemies.length === 0) {
      playWaveCompleteSound();
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          Oleada: prev.Oleada + 1,
        }));
      }, 500);
    }
  };

  const handlePlayerHit = () => {
    playPlayerHitSound();
    setGameState(prev => {
      const newHealth = prev.health - 1;

      return {
        ...prev,
        health: newHealth,
        gameOver: newHealth <= 0
      };
    });
  };


  const restartGame = () => {
    playGameOverSound();

    setGameState({
      Oleada: 1,
      score: 0,
      health: 3,
      gameOver: false
    });
    setEnemies([]);
    setProjectiles([]);
    window.enemies = [];
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState.gameOver) return;
      if (e.code in keysPressed.current) {
        keysPressed.current[e.code] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (gameState.gameOver) return;
      if (e.code in keysPressed.current) {
        keysPressed.current[e.code] = false;
      }
    };

    const handleClick = fireProjectile;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
    };
  }, [camera, gameState.gameOver]);

  return (
    <>
      {projectiles.map(proj => (
        <Projectile
          key={proj.id}
          position={proj.position}
          direction={proj.direction}
          onHitEnemy={handleEnemyHit}
        />
      ))}

      {enemies.map((enemy, index) => (
        <Enemy
          key={enemy.id}
          enemy={enemy}
          onPlayerHit={handlePlayerHit}
        />
      ))}

      <GameHUD
        Oleada={gameState.Oleada}
        score={gameState.score}
        health={gameState.health}
        gameOver={gameState.gameOver}
        restartGame={restartGame}
      />
    </>
  );
}

function GameHUD({ Oleada, score, health, gameOver, restartGame }) {
  const safeHealth = Math.max(0, health);

  return (
    <group>
      <Text
        position={[-5, 3.5, -10]}
        color="white"
        anchorX="left"
        anchorY="middle"
        fontSize={1}
      >
        {`Oleada: ${Oleada}`}
      </Text>
      <Text
        position={[-5, 2.5, -10]}
        color="white"
        anchorX="left"
        anchorY="middle"
        fontSize={0.5}
      >
        {`Score: ${score}`}
      </Text>
      <Text
        position={[-5, 2, -10]}
        color="white"
        anchorX="left"
        anchorY="middle"
        fontSize={0.5}
      >
        {`Health: ${'❤️'.repeat(safeHealth)}`}
      </Text>

      {gameOver && (
        <group position={[0, 2, -10]}>
          <Text
            color="red"
            anchorX="center"
            anchorY="middle"
            fontSize={1}
          >
            Game Over
          </Text>
          <Text
            position={[0, -1, 0]}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontSize={0.5}
            onClick={restartGame}
          >
            Restart
          </Text>
        </group>
      )}
    </group>
  );
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      <PointerLockControls />
      <ambientLight intensity={0.5} />
      <Sky />
      <spotLight position={[10, 15, 10]} angle={0.3} castShadow />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
      />
      <Physics gravity={[0, 0, 0]}>
        <Plane />
        <GameManager />
      </Physics>
    </Canvas>
  );
}