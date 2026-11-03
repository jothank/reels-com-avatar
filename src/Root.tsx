import React from 'react';
import {Composition, Still} from 'remotion';
import {Perfil} from './Perfil';
import {Reel, duracoes} from './Reel';
import type {AvatarSvgConfig, ReelProps} from './types';
import roteiro from '../roteiros/o-que-e-api.json';
import avatar from '../avatar/avatar.json';

// Props padrão (sem áudio) só para pré-visualizar no Remotion Studio.
// O vídeo final é renderizado por scripts/build_reel.py, que gera as props completas.
const exemplo = {...roteiro, fps: 30, boca: [], avatar} as unknown as ReelProps;

export const Root: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={exemplo}
      calculateMetadata={({props}) => ({
        durationInFrames: duracoes(props).reduce((a, b) => a + b, 0),
        fps: props.fps,
      })}
    />
    <Still id="Perfil" component={Perfil} width={1080} height={1080} defaultProps={{avatar: avatar.svg as AvatarSvgConfig}} />
  </>
);
