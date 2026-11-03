import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {AvatarConfig, Cena, Pose} from '../types';
import {misturaPose, POSES} from './poses';
import {SvgAvatar} from './SvgAvatar';

// Posição/tamanho do avatar na tela (canto inferior esquerdo, como nos reels)
const ESCALA = 1.15;
const LARGURA = 860 * ESCALA;
const ALTURA = 820 * ESCALA;
const ESQUERDA = -40;

export const poseDaCena = (cena: Cena | undefined, i: number): Pose =>
  cena?.pose ?? (i === 0 ? 'acena' : 'explica');

export const Avatar: React.FC<{
  config: AvatarConfig;
  cenas: Cena[];
  inicios: number[];
  boca: number[];
}> = ({config, cenas, inicios, boca}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  let i = 0;
  while (i + 1 < inicios.length && frame >= inicios[i + 1]) i++;
  const atual = POSES[poseDaCena(cenas[i], i)];
  const anterior = i > 0 ? POSES[poseDaCena(cenas[i - 1], i - 1)] : POSES.idle;
  const t = spring({frame: frame - inicios[i], fps, config: {damping: 14, stiffness: 140}});
  const pose = misturaPose(anterior, atual, Math.min(1, t));
  const abre = Math.min(1, Math.max(0, boca[frame] ?? 0));
  const expressao = cenas[i]?.expressao ?? 'feliz';

  // entrada: sobe do rodapé
  const entra = spring({frame, fps, config: {damping: 13, stiffness: 110}});
  const y = interpolate(entra, [0, 1], [500, 0]);

  const estilo: React.CSSProperties = {
    position: 'absolute',
    left: ESQUERDA,
    top: 1920 - ALTURA + y,
    width: LARGURA,
    height: ALTURA,
  };

  if (config.modo === 'png' && config.png) {
    const nome = poseDaCena(cenas[i], i);
    const base = config.png.poses[nome] ?? config.png.poses.idle;
    const aberta = config.png.posesBocaAberta?.[nome];
    const src = aberta && abre > 0.35 ? aberta : base;
    const pulo = abre * 10 + Math.sin(frame / 18) * 4;
    const giro = Math.sin(frame / 23) * 1.5 + abre * 1.5 * Math.sin(frame / 4);
    const escala = interpolate(t, [0, 0.5, 1], [0.94, 1.03, 1], {extrapolateRight: 'clamp'});
    return (
      <div style={estilo}>
        {src ? (
          <Img
            src={staticFile(src)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 40,
              height: '100%',
              objectFit: 'contain',
              transformOrigin: '50% 100%',
              transform: `translateY(${-pulo}px) rotate(${giro}deg) scale(${escala})`,
              filter: 'drop-shadow(0 0 0 white) drop-shadow(8px 8px 0 rgba(0,0,0,0.12))',
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div style={estilo}>
      <SvgAvatar c={config.svg} pose={pose} boca={abre} frame={frame} expressao={expressao} />
    </div>
  );
};
