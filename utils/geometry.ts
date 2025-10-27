
import type { GameObject, Vector2D } from '../types';

export const distance = (p1: Vector2D, p2: Vector2D): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
  return distance(obj1.position, obj2.position) < obj1.radius + obj2.radius;
};

export const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
