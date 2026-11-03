import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {Tema} from '../types';
import {borda, fontes} from '../theme';
import {pop} from './anim';
import {parse} from './RichText';

export const Badge: React.FC<{texto: string; tema: Tema; inicio?: number}> = ({
  texto,
  tema,
  inicio = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(frame, fps, inicio, 10);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 34px',
        borderRadius: 18,
        background: tema.acento,
        ...borda(tema, 8),
        fontFamily: fontes.mono,
        fontWeight: 700,
        fontSize: 46,
        letterSpacing: 4,
        color: tema.tinta,
        textTransform: 'uppercase',
        transform: `translateY(${(1 - p) * -80}px) rotate(${(1 - p) * -8}deg)`,
        opacity: p,
      }}
    >
      <span style={{width: 14, height: 14, borderRadius: 7, background: tema.tinta}} />
      {texto}
    </div>
  );
};

export const Cartao: React.FC<{
  tema: Tema;
  children: React.ReactNode;
  style?: React.CSSProperties;
  fundo?: string;
}> = ({tema, children, style, fundo}) => (
  <div
    style={{
      background: fundo ?? tema.cartao,
      borderRadius: 30,
      ...borda(tema),
      ...style,
    }}
  >
    {children}
  </div>
);

// Texto inline com *destaque* (sem animação por palavra)
export const Marcado: React.FC<{texto: string; tema: Tema}> = ({texto, tema}) => (
  <>
    {parse(texto).map((p, i) =>
      p.tipo === 'normal' ? (
        <span key={i}>{p.texto}</span>
      ) : p.tipo === 'destaque' ? (
        <span
          key={i}
          style={{
            background: tema.destaque,
            color: 'white',
            borderRadius: 12,
            padding: '0 14px',
            margin: '0 4px',
          }}
        >
          {p.texto}
        </span>
      ) : (
        <span key={i} style={{color: tema.acento, fontFamily: fontes.script, fontSize: '1.3em'}}>
          {p.texto}
        </span>
      ),
    )}
  </>
);

// Balão de fala ao lado do avatar
export const Bolha: React.FC<{texto: string; tema: Tema; inicio?: number}> = ({
  texto,
  tema,
  inicio = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(frame, fps, inicio, 9);
  const balanco = Math.sin((frame - inicio) / 9) * 1.5;
  return (
    <div
      style={{
        position: 'absolute',
        left: 610,
        top: 1250,
        maxWidth: 440,
        transformOrigin: '0% 50%',
        transform: `scale(${p}) rotate(${balanco}deg)`,
        opacity: p,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'white',
          borderRadius: 34,
          padding: '22px 34px',
          ...borda(tema, 9),
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 52,
          lineHeight: 1.25,
          color: tema.tinta,
        }}
      >
        <Marcado texto={texto} tema={tema} />
        {/* rabinho do balão */}
        <svg
          width={60}
          height={60}
          viewBox="0 0 60 60"
          style={{position: 'absolute', left: -46, top: '50%', marginTop: -30}}
        >
          <path d="M52 8 L6 32 L52 52 Z" fill="white" stroke={tema.tinta} strokeWidth={5} strokeLinejoin="round" />
          <rect x={50} y={4} width={12} height={52} fill="white" />
        </svg>
      </div>
    </div>
  );
};

export const Emoji: React.FC<{e: string; tamanho: number}> = ({e, tamanho}) => (
  <span style={{fontSize: tamanho, lineHeight: 1, fontFamily: '"Noto Color Emoji", sans-serif'}}>{e}</span>
);
