import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {Tema} from '../types';
import {fontes} from '../theme';
import {pop} from './anim';

type Pedaco = {texto: string; tipo: 'normal' | 'destaque' | 'script'};

// *palavra* -> roxo   _palavra_ -> laranja cursivo
export const parse = (s: string): Pedaco[] => {
  const out: Pedaco[] = [];
  const re = /(\*[^*]+\*|_[^_]+_)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > ultimo) out.push({texto: s.slice(ultimo, m.index), tipo: 'normal'});
    const bruto = m[0];
    out.push({texto: bruto.slice(1, -1), tipo: bruto[0] === '*' ? 'destaque' : 'script'});
    ultimo = m.index + bruto.length;
  }
  if (ultimo < s.length) out.push({texto: s.slice(ultimo), tipo: 'normal'});
  return out;
};

export const textoPuro = (s: string) => parse(s).map((p) => p.texto).join('');

// Título que entra palavra por palavra
export const RichText: React.FC<{
  texto: string;
  tema: Tema;
  tamanho: number;
  inicio?: number;
  intervalo?: number;
  alinhamento?: 'center' | 'left';
  cor?: string;
}> = ({texto, tema, tamanho, inicio = 0, intervalo = 3, alinhamento = 'center', cor}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Agrupa em "palavras" visuais; pedaços colados (ex.: "*API*?") ficam juntos
  const palavras: Pedaco[][] = [];
  let novaPalavra = true;
  for (const p of parse(texto)) {
    for (const w of p.texto.split(/(\s+)/)) {
      if (!w) continue;
      if (!w.trim()) {
        novaPalavra = true;
        continue;
      }
      if (novaPalavra || palavras.length === 0) palavras.push([]);
      palavras[palavras.length - 1].push({texto: w, tipo: p.tipo});
      novaPalavra = false;
    }
  }
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alinhamento === 'center' ? 'center' : 'flex-start',
        alignItems: 'baseline',
        columnGap: tamanho * 0.26,
        rowGap: tamanho * 0.02,
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.12,
        color: cor ?? tema.tinta,
        letterSpacing: -tamanho * 0.02,
      }}
    >
      {palavras.map((grupo, i) => {
        const p = pop(frame, fps, inicio + i * intervalo, 11);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * 40}px) scale(${0.6 + 0.4 * p})`,
            }}
          >
            {grupo.map((w, j) => {
              const estilo: React.CSSProperties =
                w.tipo === 'destaque'
                  ? {color: tema.destaque}
                  : w.tipo === 'script'
                    ? {
                        color: tema.acento,
                        fontFamily: fontes.script,
                        fontWeight: 700,
                        fontSize: tamanho * 1.35,
                        letterSpacing: 0,
                        transform: 'rotate(-3deg)',
                      }
                    : {};
              return (
                <span key={j} style={{display: 'inline-block', ...estilo}}>
                  {w.texto}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};
