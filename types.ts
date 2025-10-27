
export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
}

export interface Player extends GameObject {
  health: number;
  maxHealth: number;
  rotation: number;
}

export enum EnemyType {
  Meteor,
  Saucer,
  BlackHole,
  Mothership,
}

export interface Enemy extends GameObject {
  type: EnemyType;
  health: number;
  maxHealth: number;
  rotation?: number;
}

export interface Laser extends GameObject {
  isPlayerLaser: boolean;
}

export interface Particle extends GameObject {
  life: number;
  maxLife: number;
  color: string;
  startSize: number;
}

export interface Star {
    id: string;
    position: Vector2D;
    size: number;
    opacity: number;
    parallaxFactor: number;
}

export interface Nebula {
    id: string;
    position: Vector2D;
    size: number;
    color: string;
    opacity: number;
}

export enum GameStatus {
  StartScreen,
  Playing,
  GameOver,
}
