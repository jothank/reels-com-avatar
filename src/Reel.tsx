import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import type {ReelProps} from './types';
import {fontes, temaPadrao} from './theme';
import {Background} from './components/Background';
import {Bolha} from './components/Pecas';
import {CenaView} from './scenes/Cenas';
import {Avatar} from './avatar/Avatar';

export const DURACAO_MINIMA = 75;

export const duracoes = (props: ReelProps) =>
  props.cenas.map((c) => Math.max(DURACAO_MINIMA, Math.round(c.duracao ?? 4 * props.fps)));

export const Reel: React.FC<ReelProps> = (props) => {
  const tema = {...temaPadrao, ...props.tema};
  const ds = duracoes(props);
  const inicios = ds.map((_, i) => ds.slice(0, i).reduce((a, b) => a + b, 0));
  const total = ds.reduce((a, b) => a + b, 0);

  return (
    <AbsoluteFill style={{background: tema.fundo}}>
      <Background tema={tema} />
      {props.musica ? <Audio src={staticFile(props.musica)} volume={props.volumeMusica ?? 0.12} loop /> : null}
      {props.cenas.map((cena, i) => (
        <Sequence key={i} from={inicios[i]} durationInFrames={ds[i]} name={`${i + 1}. ${cena.layout}`}>
          <CenaView cena={cena} tema={tema} duracao={i === props.cenas.length - 1 ? ds[i] + 999 : ds[i]} />
          {cena.audio ? (
            <Sequence from={cena.inicioAudio ?? 6}>
              <Audio src={staticFile(cena.audio)} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
      <Avatar config={props.avatar} cenas={props.cenas} inicios={inicios} boca={props.boca} />
      {props.cenas.map((cena, i) =>
        cena.bolha ? (
          <Sequence key={`b${i}`} from={inicios[i]} durationInFrames={ds[i]}>
            <Bolha texto={cena.bolha} tema={tema} inicio={12} />
          </Sequence>
        ) : null,
      )}
      {props.assinatura ? <Assinatura texto={props.assinatura} cor={tema.tinta} /> : null}
      <BarraProgresso total={total} cor={tema.destaque} />
    </AbsoluteFill>
  );
};

const Assinatura: React.FC<{texto: string; cor: string}> = ({texto, cor}) => (
  <div
    style={{
      position: 'absolute',
      top: 70,
      width: '100%',
      textAlign: 'center',
      fontFamily: fontes.mono,
      fontWeight: 700,
      fontSize: 32,
      color: cor,
      opacity: 0.55,
    }}
  >
    {texto}
  </div>
);

const BarraProgresso: React.FC<{total: number; cor: string}> = ({total, cor}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', top: 0, left: 0, height: 12, width: `${(frame / total) * 100}%`, background: cor}} />
  );
};
