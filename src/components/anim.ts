import {interpolate, spring} from 'remotion';

// Pop com mola: 0 -> 1 a partir de `inicio` (em frames)
export const pop = (frame: number, fps: number, inicio = 0, damping = 12) =>
  spring({frame: frame - inicio, fps, config: {damping, stiffness: 160, mass: 0.7}});

// Saída suave no fim da cena
export const saida = (frame: number, duracao: number, frames = 8) =>
  interpolate(frame, [duracao - frames, duracao], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
