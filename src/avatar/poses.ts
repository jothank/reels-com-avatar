import type {Pose} from '../types';

export type Mao = 'punho' | 'aberta' | 'aponta' | 'joinha';

// Ângulos em graus. 0 = braço caído para baixo; negativo gira para a direita
// da tela, positivo para a esquerda. "cotovelo" é relativo ao ombro.
export type Braco = {ombro: number; cotovelo: number; mao: Mao};

export type PoseDef = {
  esq: Braco; // braço do lado esquerdo da tela
  dir: Braco; // braço do lado direito da tela
  cabeca: number; // inclinação da cabeça
  olhar: [number, number]; // deslocamento das pupilas
  ombros: number; // levanta os ombros (px)
  balanco?: 'aceno' | 'gesticula'; // movimento contínuo
};

const caido = (lado: 1 | -1): Braco => ({ombro: 12 * lado, cotovelo: 0, mao: 'punho'});

export const POSES: Record<Pose, PoseDef> = {
  idle: {esq: caido(1), dir: caido(-1), cabeca: 0, olhar: [0, 0], ombros: 0},
  aponta: {
    esq: caido(1),
    dir: {ombro: -70, cotovelo: -50, mao: 'aponta'},
    cabeca: 4,
    olhar: [8, -2],
    ombros: 0,
  },
  acena: {
    esq: {ombro: 65, cotovelo: 115, mao: 'aberta'},
    dir: caido(-1),
    cabeca: -4,
    olhar: [-2, -2],
    ombros: 0,
    balanco: 'aceno',
  },
  explica: {
    esq: {ombro: 20, cotovelo: 95, mao: 'aberta'},
    dir: {ombro: -20, cotovelo: -95, mao: 'aberta'},
    cabeca: 0,
    olhar: [0, 0],
    ombros: 0,
    balanco: 'gesticula',
  },
  duvida: {
    esq: {ombro: 35, cotovelo: 85, mao: 'aberta'},
    dir: {ombro: -35, cotovelo: -85, mao: 'aberta'},
    cabeca: 7,
    olhar: [0, -6],
    ombros: 14,
  },
  joinha: {
    esq: caido(1),
    dir: {ombro: -30, cotovelo: -130, mao: 'joinha'},
    cabeca: -3,
    olhar: [3, -1],
    ombros: 0,
  },
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const misturaPose = (a: PoseDef, b: PoseDef, t: number): PoseDef => {
  const braco = (x: Braco, y: Braco): Braco => ({
    ombro: mix(x.ombro, y.ombro, t),
    cotovelo: mix(x.cotovelo, y.cotovelo, t),
    mao: t < 0.5 ? x.mao : y.mao,
  });
  return {
    esq: braco(a.esq, b.esq),
    dir: braco(a.dir, b.dir),
    cabeca: mix(a.cabeca, b.cabeca, t),
    olhar: [mix(a.olhar[0], b.olhar[0], t), mix(a.olhar[1], b.olhar[1], t)],
    ombros: mix(a.ombros, b.ombros, t),
    balanco: t < 0.5 ? a.balanco : b.balanco,
  };
};
