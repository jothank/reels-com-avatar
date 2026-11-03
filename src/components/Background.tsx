import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {Tema} from '../types';

export const Background: React.FC<{tema: Tema}> = ({tema}) => {
  const frame = useCurrentFrame();
  // Grade de pontos deslizando bem devagar, dá vida ao fundo
  const desloca = (frame * 0.4) % 44;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: tema.fundo,
        backgroundImage: `radial-gradient(${tema.pontos} 2.6px, transparent 2.8px)`,
        backgroundSize: '44px 44px',
        backgroundPosition: `${desloca}px ${desloca}px`,
      }}
    />
  );
};
