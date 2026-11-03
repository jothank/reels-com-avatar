import React from 'react';
import {AbsoluteFill} from 'remotion';
import {POSES} from './avatar/poses';
import {SvgAvatar} from './avatar/SvgAvatar';
import {borda, fontes, temaPadrao as tema} from './theme';
import type {AvatarSvgConfig} from './types';

// Foto de perfil (Instagram, YouTube, TikTok): quadrada, com o que importa dentro do círculo
// que as redes recortam. Renderize com: npx remotion still src/index.ts Perfil perfil/jothankdev.png
export const Perfil: React.FC<{avatar: AvatarSvgConfig}> = ({avatar}) => {
  const escala = 1.32;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: tema.destaque,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 3px, transparent 3.4px)',
        backgroundSize: '48px 48px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 170,
          width: 780,
          height: 780,
          borderRadius: '50%',
          backgroundColor: tema.fundo,
          ...borda(tema, 14),
        }}
      />
      <Brilho x={205} y={250} tamanho={58} cor={tema.acento} giro={12} />
      <Brilho x={905} y={640} tamanho={40} cor="#FFFFFF" giro={-10} />
      <div style={{position: 'absolute', left: 64, top: 70, width: 860 * escala, height: 820 * escala}}>
        <SvgAvatar c={avatar} pose={POSES.acena} boca={0.28} frame={10} expressao="feliz" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 175,
          padding: '10px 26px',
          borderRadius: 26,
          backgroundColor: tema.acento,
          fontFamily: fontes.mono,
          fontWeight: 700,
          fontSize: 76,
          color: tema.tinta,
          transform: 'rotate(8deg)',
          ...borda(tema, 10),
        }}
      >
        {'</>'}
      </div>
    </AbsoluteFill>
  );
};

const Brilho: React.FC<{x: number; y: number; tamanho: number; cor: string; giro: number}> = ({x, y, tamanho, cor, giro}) => (
  <svg
    width={tamanho * 2}
    height={tamanho * 2}
    viewBox="-50 -50 100 100"
    style={{position: 'absolute', left: x - tamanho, top: y - tamanho, transform: `rotate(${giro}deg)`}}
  >
    <path d="M0 -46 C6 -8 8 -6 46 0 C8 6 6 8 0 46 C-6 8 -8 6 -46 0 C-8 -6 -6 -8 0 -46 Z" fill={cor} stroke={tema.tinta} strokeWidth={5} />
  </svg>
);
