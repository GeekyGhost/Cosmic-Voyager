
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import {
  Player, Enemy, Laser, Particle, Star, Nebula, GameStatus,
  Vector2D, EnemyType, GameObject
} from './types';
import { checkCollision, randomBetween } from './utils/geometry';
import SFX from './components/SoundManager';

const PLAYER_SIZE = 20;
const PLAYER_THRUST = 0.1;
const PLAYER_TURN_SPEED = 0.1;
const PLAYER_MAX_SPEED = 5;
const PLAYER_FRICTION = 0.99;
const PLAYER_LASER_SPEED = 7;
const PLAYER_SHOOT_COOLDOWN = 200; // ms
const PLAYER_MAX_HEALTH = 100;
const ENEMY_LASER_SPEED = 5;

const audioCache: { [key: string]: HTMLAudioElement } = {};
const playSound = (sound: keyof typeof SFX, volume = 0.2) => {
    try {
        if (!audioCache[sound]) {
            audioCache[sound] = new Audio(SFX[sound]);
        }
        const audio = audioCache[sound];
        audio.currentTime = 0;
        audio.volume = volume;
        audio.play().catch(() => {});
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.StartScreen);
  const [score, setScore] = useState(0);

  const playerRef = useRef<Player | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const nebulasRef = useRef<Nebula[]>([]);

  const lastShotTimeRef = useRef(0);
  const keysPressed = useKeyboardInput();
  
  const dimensions = useRef({ width: window.innerWidth, height: window.innerHeight });

  const createExplosion = useCallback((position: Vector2D, count: number, color: string, size: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: `p_${Date.now()}_${Math.random()}`,
        position: { x: position.x, y: position.y },
        velocity: {
          x: randomBetween(-3, 3),
          y: randomBetween(-3, 3),
        },
        radius: Math.random() * size,
        color: color,
        life: 1,
        maxLife: 1,
        startSize: Math.random() * size + 1,
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    const { width, height } = dimensions.current;
    playerRef.current = {
      id: 'player',
      position: { x: width / 2, y: height / 2 },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_SIZE / 2,
      rotation: -Math.PI / 2,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
    };
    enemiesRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];
    setScore(0);
  }, []);

  const startGame = () => {
    resetGame();
    setGameStatus(GameStatus.Playing);
  };
  
  const handlePlayerControls = useCallback((deltaTime: number) => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    if (keysPressed.has('ArrowUp') || keysPressed.has('KeyW')) {
      player.velocity.x += Math.cos(player.rotation) * PLAYER_THRUST;
      player.velocity.y += Math.sin(player.rotation) * PLAYER_THRUST;
      playSound('thrust', 0.1);
      
      // Thruster particles
      const particleCount = 2;
      for (let i = 0; i < particleCount; i++) {
        const angle = player.rotation + Math.PI + randomBetween(-0.3, 0.3);
        particlesRef.current.push({
            id: `pt_${Date.now()}_${Math.random()}`,
            position: { ...player.position },
            velocity: {
                x: player.velocity.x + Math.cos(angle) * 2,
                y: player.velocity.y + Math.sin(angle) * 2,
            },
            radius: randomBetween(1, 3),
            color: ['#ffc83d', '#ff7800', '#ffffff'][Math.floor(Math.random() * 3)],
            life: 0.5,
            maxLife: 0.5,
            startSize: randomBetween(2, 4),
        });
      }
    }

    if (keysPressed.has('ArrowLeft') || keysPressed.has('KeyA')) {
      player.rotation -= PLAYER_TURN_SPEED;
    }
    if (keysPressed.has('ArrowRight') || keysPressed.has('KeyD')) {
      player.rotation += PLAYER_TURN_SPEED;
    }

    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
    if (speed > PLAYER_MAX_SPEED) {
      player.velocity.x = (player.velocity.x / speed) * PLAYER_MAX_SPEED;
      player.velocity.y = (player.velocity.y / speed) * PLAYER_MAX_SPEED;
    }

    player.velocity.x *= PLAYER_FRICTION;
    player.velocity.y *= PLAYER_FRICTION;

    if (keysPressed.has('Space')) {
      const now = performance.now();
      if (now - lastShotTimeRef.current > PLAYER_SHOOT_COOLDOWN) {
        playSound('laser');
        lastShotTimeRef.current = now;
        lasersRef.current.push({
          id: `l_${now}`,
          position: { ...player.position },
          velocity: {
            x: Math.cos(player.rotation) * PLAYER_LASER_SPEED,
            y: Math.sin(player.rotation) * PLAYER_LASER_SPEED,
          },
          radius: 2,
          isPlayerLaser: true,
        });
      }
    }
  }, [keysPressed]);

  const updateAndDraw = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions.current;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw background
    [...starsRef.current, ...nebulasRef.current].forEach(bgObject => {
        if ('parallaxFactor' in bgObject) { // Star
            ctx.fillStyle = `rgba(255, 255, 255, ${bgObject.opacity})`;
            ctx.beginPath();
            ctx.arc(bgObject.position.x, bgObject.position.y, bgObject.size, 0, Math.PI * 2);
            ctx.fill();
        } else { // Nebula
            const gradient = ctx.createRadialGradient(bgObject.position.x, bgObject.position.y, 0, bgObject.position.x, bgObject.position.y, bgObject.size);
            gradient.addColorStop(0, `${bgObject.color}${Math.round(bgObject.opacity * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${bgObject.color}00`);
            ctx.fillStyle = gradient;
            ctx.fillRect(bgObject.position.x - bgObject.size, bgObject.position.y - bgObject.size, bgObject.size * 2, bgObject.size * 2);
        }
    });

    const updatePosition = (obj: GameObject) => {
      obj.position.x += obj.velocity.x;
      obj.position.y += obj.velocity.y;

      if (obj.position.x < -obj.radius) obj.position.x = width + obj.radius;
      if (obj.position.x > width + obj.radius) obj.position.x = -obj.radius;
      if (obj.position.y < -obj.radius) obj.position.y = height + obj.radius;
      if (obj.position.y > height + obj.radius) obj.position.y = -obj.radius;
    };
    
    // Update & Draw Player
    if (playerRef.current) {
        handlePlayerControls(deltaTime);
        updatePosition(playerRef.current);
        const p = playerRef.current;
        ctx.save();
        ctx.translate(p.position.x, p.position.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(p.radius, 0);
        ctx.lineTo(-p.radius / 2, -p.radius / 2);
        ctx.lineTo(-p.radius / 2, p.radius / 2);
        ctx.closePath();
        ctx.strokeStyle = '#00f2ff';
        ctx.fillStyle = '#0d2b2c';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    
    // Update & Draw Lasers
    lasersRef.current = lasersRef.current.filter(l => l.position.x > 0 && l.position.x < width && l.position.y > 0 && l.position.y < height);
    lasersRef.current.forEach(l => {
      updatePosition(l);
      ctx.fillStyle = l.isPlayerLaser ? '#00f2ff' : '#ff4136';
      ctx.beginPath();
      ctx.arc(l.position.x, l.position.y, l.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Update & Draw Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.life -= deltaTime / 1000;
      updatePosition(p);
      p.radius = p.startSize * (p.life / p.maxLife);

      if (p.radius > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // Update & Draw Enemies
    enemiesRef.current.forEach(e => {
      updatePosition(e);
      ctx.save();
      ctx.translate(e.position.x, e.position.y);

      switch(e.type) {
        case EnemyType.Meteor:
            ctx.rotate(e.rotation || 0);
            e.rotation = (e.rotation || 0) + 0.01;
            ctx.beginPath();
            ctx.moveTo(0, -e.radius);
            for(let i=1; i < 7; i++){
                const angle = i * Math.PI / 3.5;
                const dist = e.radius * (0.8 + Math.random() * 0.4);
                ctx.lineTo(Math.sin(angle) * dist, -Math.cos(angle) * dist);
            }
            ctx.closePath();
            ctx.strokeStyle = '#a9a9a9';
            ctx.fillStyle = '#696969';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            break;
        case EnemyType.Saucer:
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI, true);
            ctx.moveTo(-e.radius * 1.5, 0);
            ctx.lineTo(e.radius * 1.5, 0);
            ctx.closePath();
            ctx.fillStyle = '#8338ec';
            ctx.strokeStyle = '#3a86ff';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            break;
        case EnemyType.Mothership:
            ctx.fillStyle = '#ff006e';
            ctx.strokeStyle = '#ffbe0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-e.radius, 0);
            ctx.lineTo(-e.radius/2, -e.radius/2);
            ctx.lineTo(e.radius/2, -e.radius/2);
            ctx.lineTo(e.radius, 0);
            ctx.lineTo(e.radius/2, e.radius/2);
            ctx.lineTo(-e.radius/2, e.radius/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
      }
      ctx.restore();
    });

    // Spawn new enemies
    if (enemiesRef.current.length < 5 + Math.floor(score / 500)) {
        const typeRoll = Math.random();
        let type = EnemyType.Meteor;
        let radius = randomBetween(15, 40);
        let health = radius / 2;
        if (score > 1000 && typeRoll > 0.95) {
            type = EnemyType.Mothership;
            radius = 60;
            health = 50;
        } else if (score > 200 && typeRoll > 0.7) {
            type = EnemyType.Saucer;
            radius = 20;
            health = 10;
        }
        
        const side = Math.floor(Math.random() * 4);
        let position: Vector2D;
        switch(side) {
            case 0: position = { x: randomBetween(0, width), y: -radius }; break;
            case 1: position = { x: width + radius, y: randomBetween(0, height) }; break;
            case 2: position = { x: randomBetween(0, width), y: height + radius }; break;
            default: position = { x: -radius, y: randomBetween(0, height) }; break;
        }

        enemiesRef.current.push({
            id: `e_${Date.now()}_${Math.random()}`,
            type,
            position,
            velocity: { x: randomBetween(-1, 1), y: randomBetween(-1, 1) },
            radius,
            health,
            maxHealth: health
        });
    }

    // Enemy AI (shooting)
    enemiesRef.current.forEach(e => {
        if(e.type === EnemyType.Saucer || e.type === EnemyType.Mothership) {
            if(Math.random() < 0.01 && playerRef.current) {
                playSound('enemyLaser');
                const angle = Math.atan2(playerRef.current.position.y - e.position.y, playerRef.current.position.x - e.position.x);
                lasersRef.current.push({
                    id: `el_${Date.now()}_${Math.random()}`,
                    position: {...e.position},
                    velocity: {
                        x: Math.cos(angle) * ENEMY_LASER_SPEED,
                        y: Math.sin(angle) * ENEMY_LASER_SPEED
                    },
                    radius: 3,
                    isPlayerLaser: false,
                });
            }
        }
    });

    // Handle Collisions
    const newEnemies = [];
    for (const enemy of enemiesRef.current) {
        let enemyDestroyed = false;

        // Player lasers vs enemies
        const newLasers = [];
        for (const laser of lasersRef.current) {
            if (laser.isPlayerLaser && checkCollision(laser, enemy)) {
                enemy.health -= 5;
                createExplosion(laser.position, 5, '#00f2ff', 2);
                if (enemy.health <= 0) {
                    enemyDestroyed = true;
                }
            } else {
                newLasers.push(laser);
            }
        }
        lasersRef.current = newLasers;

        if (enemyDestroyed) {
            playSound('explosion');
            createExplosion(enemy.position, enemy.radius, enemy.type === EnemyType.Saucer ? '#8338ec' : '#a9a9a9', enemy.radius / 2);
            setScore(s => s + Math.floor(enemy.maxHealth * 5));
        } else {
            newEnemies.push(enemy);
        }
    }
    enemiesRef.current = newEnemies;

    // Player vs enemies & enemy lasers
    if (playerRef.current) {
        for(const enemy of enemiesRef.current) {
            if (checkCollision(playerRef.current, enemy)) {
                playerRef.current.health -= 20;
                createExplosion(enemy.position, enemy.radius, '#ffbe0b', enemy.radius / 2);
                enemiesRef.current = enemiesRef.current.filter(e => e.id !== enemy.id);
                break;
            }
        }

        const playerLasers = [];
        for (const laser of lasersRef.current) {
            if (!laser.isPlayerLaser && checkCollision(laser, playerRef.current)) {
                playerRef.current.health -= 10;
                createExplosion(laser.position, 10, '#ff4136', 3);
            } else {
                playerLasers.push(laser);
            }
        }
        lasersRef.current = playerLasers;

        if (playerRef.current.health <= 0) {
            playSound('explosion');
            createExplosion(playerRef.current.position, 40, '#00f2ff', 20);
            playerRef.current = null;
            setTimeout(() => setGameStatus(GameStatus.GameOver), 1000);
        }
    }


    // Draw UI
    if (playerRef.current) {
        const p = playerRef.current;
        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(20, height - 30, 200, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(20, height - 30, 200 * (p.health / p.maxHealth), 10);
    }
    ctx.fillStyle = 'white';
    ctx.font = '24px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);

  }, [handlePlayerControls, createExplosion, score]);

  useGameLoop(updateAndDraw, gameStatus === GameStatus.Playing);
  
  const setupBackground = useCallback(() => {
        const { width, height } = dimensions.current;
        starsRef.current = Array.from({ length: 200 }, (_, i) => ({
            id: `s_${i}`,
            position: { x: Math.random() * width, y: Math.random() * height },
            size: Math.random() * 1.5,
            opacity: Math.random(),
            parallaxFactor: Math.random() * 0.5 + 0.1,
        }));
        nebulasRef.current = Array.from({ length: 5 }, (_, i) => ({
            id: `n_${i}`,
            position: { x: Math.random() * width, y: Math.random() * height },
            size: randomBetween(100, 300),
            color: ['#ff006e', '#8338ec', '#3a86ff'][i % 3],
            opacity: randomBetween(0.1, 0.3),
        }));
    }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dimensions.current = { width: window.innerWidth, height: window.innerHeight };

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        dimensions.current = { width: window.innerWidth, height: window.innerHeight };
        setupBackground();
      };
      
      window.addEventListener('resize', handleResize);
      setupBackground();
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [setupBackground]);
  
  return (
    <div className="relative w-screen h-screen bg-black">
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
      {gameStatus === GameStatus.StartScreen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-cyan-300 tracking-widest animate-pulse">
            COSMIC VOYAGER
          </h1>
          <button
            onClick={startGame}
            className="mt-8 px-8 py-4 text-2xl bg-cyan-400 text-black rounded-lg shadow-lg shadow-cyan-400/50 hover:bg-cyan-300 hover:shadow-cyan-300/50 transition-all transform hover:scale-105"
          >
            START GAME
          </button>
        </div>
      )}
      {gameStatus === GameStatus.GameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-black/50">
          <h1 className="text-7xl font-bold text-red-500">GAME OVER</h1>
          <p className="text-4xl mt-4">Final Score: {score}</p>
          <button
            onClick={startGame}
            className="mt-8 px-8 py-4 text-2xl bg-cyan-400 text-black rounded-lg shadow-lg shadow-cyan-400/50 hover:bg-cyan-300 hover:shadow-cyan-300/50 transition-all transform hover:scale-105"
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
