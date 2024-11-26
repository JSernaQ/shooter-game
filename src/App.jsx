import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import { Text, PointerLockControls, Sky, Stars } from '@react-three/drei';
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
  const speed = 200;
  const [projectile, setProjectile] = useState(new THREE.Vector3(...position));
  const [active, setActive] = useState(true);

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

      // Verificar colisión con enemigos
      window.enemies.forEach((enemy, index) => {
        const distance = newPosition.distanceTo(enemy.position);
        if (distance < 2) {  // Aumenté el radio de colisión
          setActive(false);
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

  if (!active) return null;

  return (
    <mesh position={[projectile.x, projectile.y, projectile.z]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
  );
}

function Enemy({ enemy, onPlayerHit }) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    const directionToPlayer = new THREE.Vector3()
      .subVectors(camera.position, enemy.position)
      .normalize();

    enemy.position.add(
      directionToPlayer.multiplyScalar(enemy.speed * delta)
    );

    const distanceToPlayer = enemy.position.distanceTo(camera.position);
    if (distanceToPlayer < 2) {
      onPlayerHit();
    }
  });

  return (
    <mesh position={[enemy.position.x, enemy.position.y, enemy.position.z]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

function GameManager() {
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
    if (enemies.length === 0 && !gameState.gameOver) {
      const newEnemies = Array.from({ length: gameState.Oleada * 3 }, () => ({
        id: Math.random().toString(),
        position: new THREE.Vector3(
          Math.random() * 80 - 40,
          1,  // Se mantiene a nivel del suelo
          Math.random() * 80 - 40
        ),
        speed: 2 + gameState.Oleada * 0.5,
      }));

      setEnemies(newEnemies);
      window.enemies = newEnemies;  // Mantener referencia global
    }
  }, [gameState.Oleada, enemies.length, gameState.gameOver]);

  // Control de movimiento del jugador
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
  };

  const handleEnemyHit = (index) => {
    const newEnemies = enemies.filter((_, i) => i !== index);
    setEnemies(newEnemies);
    window.enemies = newEnemies;

    setGameState(prev => ({
      ...prev,
      score: prev.score + 1
    }));

    if (newEnemies.length === 0) {
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          Oleada: prev.Oleada + 1,
        }));
      }, 500);
    }
  };

  const handlePlayerHit = () => {
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
        position={[-5, 3, -10]}
        color="white"
        anchorX="left"
        anchorY="middle"
        fontSize={0.5}
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