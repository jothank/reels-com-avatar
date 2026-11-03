import React from 'react';
import type {AvatarSvgConfig, Expressao} from '../types';
import type {Braco, Mao, PoseDef} from './poses';

// Personagem desenhado em SVG (estilo adesivo/cartoon), 100% animável por código.
// Sistema de coordenadas: viewBox 0 0 860 820, cabeça centrada em x=330 (+30 de margem).

const TINTA = '#1B1B22';
const T = 5; // espessura do contorno

const escurece = (hex: string, f = 0.82) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
};
const clareia = (hex: string, f = 0.25) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => Math.round(v + (255 - v) * f);
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

const contorno = {stroke: TINTA, strokeWidth: T, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

// ---------------------------------------------------------------- cabelo
const CabeloTras: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  const cor = c.cabelo.cor;
  switch (c.cabelo.estilo) {
    case 'cacheado': {
      const cachos = [];
      for (let a = 160; a <= 380; a += 17) {
        const r = (a * Math.PI) / 180;
        const x = 330 + 178 * Math.cos(r);
        const y = 285 + 188 * Math.sin(r) * (Math.sin(r) < 0 ? 1 : 0.35);
        cachos.push(<circle key={a} cx={x} cy={y} r={58} fill={cor} {...contorno} />);
      }
      return <g>{cachos}</g>;
    }
    case 'longo':
      return (
        <path
          d="M163 300 C148 150 250 92 330 92 C410 92 512 150 497 300 L508 600 C470 624 432 612 420 590 L240 590 C228 612 190 624 152 600 Z"
          fill={cor}
          {...contorno}
        />
      );
    case 'curto':
    case 'liso':
      return <ellipse cx={330} cy={238} rx={166} ry={130} fill={cor} {...contorno} />;
    default:
      return null;
  }
};

const CabeloFrente: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  const cor = c.cabelo.cor;
  const brilho = clareia(cor, 0.22);
  switch (c.cabelo.estilo) {
    case 'cacheado': {
      const franja = [
        [222, 196, 44],
        [270, 172, 46],
        [322, 162, 48],
        [376, 170, 46],
        [428, 192, 44],
        [196, 236, 34],
        [462, 234, 34],
        [300, 132, 44],
        [360, 128, 44],
      ];
      return (
        <g>
          {franja.map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={cor} {...contorno} />
              <path d={`M${x - r * 0.45} ${y - r * 0.2} q ${r * 0.3} ${-r * 0.4} ${r * 0.7} ${-r * 0.15}`} fill="none" stroke={brilho} strokeWidth={5} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    }
    case 'curto':
      return (
        <path
          d="M180 292 C172 168 258 116 340 120 C422 116 490 172 480 292 C468 244 444 218 404 206 C372 228 300 228 262 202 C224 216 194 246 180 292 Z"
          fill={cor}
          {...contorno}
        />
      );
    case 'liso':
      return (
        <path
          d="M180 300 C168 162 258 110 340 114 C432 114 496 180 482 300 C470 250 456 226 432 210 C380 244 290 252 214 232 C198 252 188 276 180 300 Z"
          fill={cor}
          {...contorno}
        />
      );
    case 'longo':
      return (
        <path
          d="M180 300 C174 170 260 114 330 118 C400 114 486 170 480 300 C470 230 420 192 330 202 C240 192 190 230 180 300 Z"
          fill={cor}
          {...contorno}
        />
      );
    case 'entradas':
      // curto no topo, com entradas fundas nas têmporas
      return (
        <g>
          <path
            d="M180 304 C174 196 232 112 330 110 C428 112 486 196 480 304 C476 270 470 236 462 214 C454 186 438 160 416 150 C396 160 364 168 330 168 C296 168 264 160 244 150 C222 160 206 186 198 214 C190 236 184 270 180 304 Z"
            fill={cor}
            {...contorno}
          />
          <path d="M262 142 q 50 -22 110 -6" fill="none" stroke={brilho} strokeWidth={7} strokeLinecap="round" />
        </g>
      );
    case 'raspado':
      return (
        <path
          d="M186 262 C190 176 252 132 330 132 C408 132 470 176 474 262 C440 214 390 196 330 196 C270 196 220 214 186 262 Z"
          fill={cor}
          opacity={0.9}
          {...contorno}
          strokeWidth={3}
        />
      );
    default:
      return <path d="M250 180 q 30 -22 70 -24" fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={10} strokeLinecap="round" />;
  }
};

// ---------------------------------------------------------------- rosto
const Olho: React.FC<{
  cx: number;
  cy: number;
  piscar: number;
  olhar: [number, number];
  cor: string;
  arregalado: number;
  pele: string;
  palpebra: boolean;
}> = ({cx, cy, piscar, olhar, cor, arregalado, pele, palpebra}) => {
  const s = Math.max(0.08, 1 - piscar);
  const rx = (palpebra ? 27 : 30) + arregalado * 3;
  const ry = (palpebra ? 30 : 34) + arregalado * 5;
  // quanto a pálpebra cobre (menos quando surpreso)
  const lado = cy - ry * (palpebra ? 0.32 - arregalado * 0.35 : 2);
  const meio = cy - ry * (palpebra ? 0.62 - arregalado * 0.35 : 2);
  const dy = palpebra ? 5 : 4;
  const id = `olho-${cx}`;
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${s}) translate(${-cx} ${-cy})`}>
      <defs>
        <clipPath id={id}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="white" />
      <circle cx={cx + olhar[0]} cy={cy + dy + olhar[1]} r={18} fill={cor} />
      <circle cx={cx + olhar[0]} cy={cy + dy + olhar[1]} r={9} fill={TINTA} />
      <circle cx={cx + olhar[0] + 7} cy={cy + dy - 8 + olhar[1]} r={5.5} fill="white" />
      {palpebra ? (
        <g clipPath={`url(#${id})`}>
          <path d={`M${cx - rx - 4} ${cy - ry - 4} H${cx + rx + 4} V${lado} Q${cx} ${meio} ${cx - rx - 4} ${lado} Z`} fill={pele} />
          <path d={`M${cx - rx - 4} ${lado} Q${cx} ${meio} ${cx + rx + 4} ${lado}`} fill="none" stroke={TINTA} strokeWidth={5} />
        </g>
      ) : null}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" {...contorno} />
    </g>
  );
};

const Boca: React.FC<{abre: number; labio?: string}> = ({abre, labio}) => {
  const cx = 330;
  const y0 = 428;
  const w = 66 + 18 * abre;
  const h = 6 + 36 * abre;
  const L = cx - w / 2;
  const R = cx + w / 2;
  const d = `M${L} ${y0} Q${cx} ${y0 + 8} ${R} ${y0} Q${cx} ${y0 + 8 + 2 * h} ${L} ${y0} Z`;
  return (
    <g>
      <defs>
        <clipPath id="boca-clip">
          <path d={d} />
        </clipPath>
      </defs>
      {labio ? <path d={d} fill={labio} stroke={labio} strokeWidth={18} strokeLinejoin="round" /> : null}
      <path d={d} fill="#6E1A22" />
      <g clipPath="url(#boca-clip)">
        <rect x={L} y={y0 - 4} width={w} height={14} fill="white" />
        <ellipse cx={cx} cy={y0 + 4 + h * 1.05} rx={w * 0.32} ry={h * 0.42} fill="#FF7E8B" />
      </g>
      <path d={d} fill="none" {...contorno} />
    </g>
  );
};

const Sobrancelhas: React.FC<{cor: string; sobe: number; expressao: Expressao}> = ({cor, sobe, expressao}) => {
  const base = expressao === 'surpreso' ? 14 : 0;
  const e = -(sobe + base);
  const d = expressao === 'pensativo' ? 10 : 0; // uma mais alta que a outra
  const tilt = expressao === 'serio' ? 8 : 0; // franzida
  return (
    <g fill="none" stroke={cor} strokeWidth={13} strokeLinecap="round">
      <path d={`M240 ${276 + e - tilt} Q272 ${260 + e} 304 ${272 + e + tilt}`} />
      <path d={`M356 ${272 + e - d + tilt} Q388 ${260 + e - d} 420 ${276 + e - d - tilt}`} />
    </g>
  );
};

const Barba: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  if (!c.barba || c.barba === 'nenhuma') return null;
  const cor = c.corBarba ?? (c.cabelo.estilo === 'careca' ? '#3A2A22' : c.cabelo.cor);
  if (c.barba === 'longa') {
    const fio = clareia(cor, 0.22);
    // afina abaixo das bochechas e termina reta, como a barba de verdade (a redonda engordava o rosto)
    const d =
      'M182 286 C182 372 194 440 226 496 C246 534 272 556 300 566 Q330 574 360 566 C388 556 414 534 434 496 C466 440 478 372 478 286 C470 346 454 384 426 400 C396 388 264 388 234 400 C206 384 190 346 182 286 Z';
    return (
      <g>
        <defs>
          <clipPath id="barba-clip">
            <path d={d} />
          </clipPath>
        </defs>
        <path d={d} fill={cor} {...contorno} />
        {/* textura de fios (com alguns brancos) */}
        <g fill="none" strokeLinecap="round" strokeWidth={4} clipPath="url(#barba-clip)">
          <path d="M232 450 q 8 20 4 40 M266 486 q 8 24 0 46 M302 512 q 6 22 -2 40 M358 512 q -6 22 2 40 M394 486 q -8 24 0 46 M428 450 q -8 20 -4 40" stroke={fio} />
          <path d="M206 404 q 6 16 4 30 M454 404 q -6 16 -4 30 M330 532 q 4 16 -2 28" stroke={fio} />
          <path d="M284 530 q 6 14 0 26 M390 446 q 8 14 4 28" stroke="#A9A39C" strokeWidth={3} />
        </g>
      </g>
    );
  }
  const cheia = c.barba === 'cheia';
  const d = cheia
    ? 'M186 300 C186 450 250 512 330 512 C410 512 474 450 474 300 C462 360 436 402 400 410 C372 392 288 392 260 410 C224 402 198 360 186 300 Z'
    : 'M190 360 C196 448 252 500 330 500 C408 500 464 448 470 360 C452 420 412 452 330 456 C248 452 208 420 190 360 Z';
  return <path d={d} fill={cor} opacity={c.barba === 'rala' ? 0.35 : 1} {...contorno} strokeWidth={c.barba === 'rala' ? 0 : 4} />;
};

const Bigode: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  const cor = c.corBarba ?? c.cabelo.cor;
  if (c.barba === 'longa') {
    return (
      <path
        d="M274 426 C286 398 316 394 330 406 C344 394 374 398 386 426 C390 440 382 452 374 456 C368 436 350 424 330 426 C310 424 292 436 286 456 C278 452 270 440 274 426 Z"
        fill={cor}
        {...contorno}
        strokeWidth={4}
      />
    );
  }
  return c.bigode || c.barba === 'cheia' ? (
    <path d="M286 420 C300 400 322 402 330 412 C338 402 360 400 374 420 C356 416 342 420 330 424 C318 420 304 416 286 420 Z" fill={cor} {...contorno} strokeWidth={3} />
  ) : null;
};

const Oculos: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  if (!c.oculos) return null;
  const cor = c.oculos.cor ?? TINTA;
  const lente = (cx: number) =>
    c.oculos && c.oculos.formato === 'retangular' ? (
      <rect x={cx - 54} y={288} width={108} height={76} rx={14} fill="white" fillOpacity={0.14} stroke={cor} strokeWidth={10} />
    ) : c.oculos && c.oculos.formato === 'quadrado' ? (
      <rect x={cx - 50} y={282} width={100} height={84} rx={20} fill="white" fillOpacity={0.12} stroke={cor} strokeWidth={8} />
    ) : (
      <circle cx={cx} cy={325} r={50} fill="white" fillOpacity={0.12} stroke={cor} strokeWidth={8} />
    );
  return (
    <g>
      {lente(272)}
      {lente(388)}
      <path d="M322 312 Q330 304 338 312" fill="none" stroke={cor} strokeWidth={8} />
      <path d="M220 304 L180 298 M440 304 L480 298" stroke={cor} strokeWidth={9} strokeLinecap="round" />
    </g>
  );
};

// ---------------------------------------------------------------- corpo
// tronco, sombra dos ombros, x dos ombros (onde os braços giram), pescoço [x, largura], espessura dos braços
const CORPOS = {
  magro: {tronco: 'M150 900 C148 740 160 628 214 588 L446 588 C500 628 512 740 510 900 Z', ombros: 112, braco: 216, pescoco: [298, 64], g: 0.9},
  normal: {tronco: 'M36 900 C36 690 110 604 236 578 L424 578 C550 604 624 690 624 900 Z', ombros: 130, braco: 196, pescoco: [292, 76], g: 1},
  cheinho: {tronco: 'M-30 900 C-40 712 56 590 220 566 L440 566 C604 590 700 712 690 900 Z', ombros: 150, braco: 168, pescoco: [278, 104], g: 1.18},
};
const corpoDe = (c: AvatarSvgConfig) => CORPOS[c.corpo ?? 'normal'];

const Corpo: React.FC<{c: AvatarSvgConfig}> = ({c}) => {
  const cor = c.roupa.cor;
  const sombra = escurece(cor, 0.78);
  const {tronco, ombros} = corpoDe(c);
  if (c.roupa.tipo === 'moletom') {
    return (
      <g>
        <ellipse cx={330} cy={584} rx={ombros} ry={46} fill={sombra} {...contorno} />
        <path d={tronco} fill={cor} {...contorno} />
        {/* capuz / gola */}
        <path d="M222 586 C240 640 290 664 330 664 C370 664 420 640 438 586" fill="none" stroke={sombra} strokeWidth={22} strokeLinecap="round" />
        <path d="M212 584 C232 650 286 680 330 680 C374 680 428 650 448 584" fill="none" {...contorno} />
        {/* cordões */}
        <path d="M302 676 L296 760 M358 676 L364 760" stroke={c.roupa.cordao ?? 'white'} strokeWidth={9} strokeLinecap="round" />
        <rect x={288} y={756} width={16} height={26} rx={6} fill={c.roupa.detalhe ?? '#F5A05A'} {...contorno} strokeWidth={3} />
        <rect x={356} y={756} width={16} height={26} rx={6} fill={c.roupa.detalhe ?? '#F5A05A'} {...contorno} strokeWidth={3} />
      </g>
    );
  }
  if (c.roupa.tipo === 'camisa') {
    return (
      <g>
        <path d={tronco} fill={cor} {...contorno} />
        <path d="M330 600 L330 900" stroke={sombra} strokeWidth={6} />
        <path d="M268 574 L330 640 L300 676 L250 600 Z M392 574 L330 640 L360 676 L410 600 Z" fill="white" {...contorno} />
        {[700, 760].map((y) => (
          <circle key={y} cx={330} cy={y} r={7} fill="white" {...contorno} strokeWidth={3} />
        ))}
      </g>
    );
  }
  return (
    <g>
      <path d={tronco} fill={cor} {...contorno} />
      <path d="M262 580 C280 626 380 626 398 580" fill="none" stroke={sombra} strokeWidth={14} />
      <path d="M254 578 C272 638 388 638 406 578" fill="none" {...contorno} />
    </g>
  );
};

// Desenhada para o braço da esquerda da tela; o da direita espelha (lado = -1), e o polegar
// fica sempre virado para o corpo.
const MaoSvg: React.FC<{tipo: Mao; pele: string; lado: 1 | -1}> = ({tipo, pele, lado}) => {
  const p = {fill: pele, ...contorno};
  const dobra = {fill: 'none', stroke: TINTA, strokeWidth: 3.5, strokeLinecap: 'round' as const};
  switch (tipo) {
    case 'aberta':
      // palma de frente, dedos em leque e polegar para o lado
      return (
        <g transform={`scale(${lado} 1)`}>
          {[[-24, 10, 44], [-8, 3, 52], [8, -3, 50], [24, -10, 40]].map(([x, giro, comp]) => (
            <rect key={x} x={-8} y={0} width={16} height={comp} rx={8} transform={`translate(${x} 16) rotate(${giro})`} {...p} />
          ))}
          <rect x={-9} y={0} width={18} height={42} rx={9} transform="translate(-26 -10) rotate(58)" {...p} />
          <rect x={-33} y={-30} width={66} height={58} rx={24} {...p} />
          <path d="M-12 -2 q 10 9 24 5" {...dobra} />
        </g>
      );
    case 'aponta':
      // indicador esticado no lado de cima; os outros dedos dobrados no punho (como no joinha)
      return (
        <g transform={`scale(${lado} 1)`}>
          <rect x={-29} y={-4} width={18} height={92} rx={9} {...p} />
          <rect x={-34} y={-34} width={68} height={62} rx={24} {...p} />
          <path d="M2 -20 v34 M18 -20 v34" {...dobra} />
        </g>
      );
    case 'joinha':
      return (
        <g>
          <rect x={-16} y={10} width={30} height={58} rx={15} {...p} />
          <rect x={-38} y={-34} width={76} height={66} rx={26} {...p} />
          <path d="M-26 -12 h44 M-26 6 h44" stroke={TINTA} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    default:
      return <circle cx={0} cy={0} r={36} {...p} />;
  }
};

const BracoSvg: React.FC<{b: Braco; x: number; y: number; c: AvatarSvgConfig; pele: string}> = ({b, x, y, c, pele}) => {
  const cor = c.roupa.tipo === 'camiseta' ? pele : c.roupa.cor;
  const punho = escurece(c.roupa.cor, 0.78);
  const L1 = 130;
  const L2 = 112;
  const {g} = corpoDe(c); // espessura
  return (
    <g transform={`translate(${x} ${y}) rotate(${b.ombro})`}>
      {/* manga / braço */}
      <rect x={-44 * g} y={-30} width={88 * g} height={L1 + 60} rx={44 * g} fill={c.roupa.cor} {...contorno} />
      <g transform={`translate(0 ${L1}) rotate(${b.cotovelo})`}>
        <rect x={-39 * g} y={-26} width={78 * g} height={L2 + 30} rx={39 * g} fill={cor} {...contorno} />
        {c.roupa.tipo !== 'camiseta' ? (
          <rect x={-39 * g} y={L2 - 16} width={78 * g} height={24} rx={10} fill={punho} {...contorno} />
        ) : null}
        <g transform={`translate(0 ${L2 + 30})`}>
          <g transform={`scale(${g > 1 ? 1.1 : 1})`}>
            <MaoSvg tipo={b.mao} pele={pele} lado={x < 330 ? 1 : -1} />
          </g>
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- avatar
export const SvgAvatar: React.FC<{
  c: AvatarSvgConfig;
  pose: PoseDef;
  boca: number; // 0..1
  frame: number;
  expressao: Expressao;
}> = ({c, pose, boca, frame, expressao}) => {
  const pele = c.pele;
  const peleSombra = c.peleSombra ?? escurece(pele, 0.84);
  const redondo = c.rosto === 'redondo';
  const corpo = corpoDe(c);
  const barbudo = c.barba === 'cheia' || c.barba === 'longa';

  // piscadas em intervalos irregulares
  const ciclo = frame % 97;
  const ciclo2 = (frame + 40) % 151;
  const tri = (k: number) => (k < 6 ? 1 - Math.abs(k - 3) / 3 : 0);
  const piscar = Math.max(tri(ciclo), tri(ciclo2));

  // balanço de cabeça enquanto fala + respiração
  const respira = Math.sin(frame / 18) * 3;
  const cabeca = pose.cabeca + Math.sin(frame / 23) * 2 + boca * 3 * Math.sin(frame / 4);
  const aceno = pose.balanco === 'aceno' ? Math.sin(frame / 3) * 16 : 0;
  const gesto = pose.balanco === 'gesticula' ? Math.sin(frame / 7) * 8 * (0.4 + boca) : 0;

  const esq: Braco = {...pose.esq, cotovelo: pose.esq.cotovelo + aceno + gesto};
  const dir: Braco = {...pose.dir, cotovelo: pose.dir.cotovelo - gesto};

  return (
    <svg viewBox="0 0 860 820" width="100%" height="100%" style={{overflow: 'visible'}}>
      <defs>
        <filter id="adesivo" x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius={9} result="dil" />
          <feFlood floodColor="white" />
          <feComposite in2="dil" operator="in" result="borda" />
          <feMerge>
            <feMergeNode in="borda" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#adesivo)" transform={`translate(30 ${respira})`}>
        <g transform="translate(0 -35)">
          <Corpo c={c} />
        </g>
        {/* pescoço */}
        <rect x={corpo.pescoco[0]} y={450} width={corpo.pescoco[1]} height={105} rx={30} fill={peleSombra} {...contorno} />
        {/* cabeça */}
        <g transform={`translate(0 ${-pose.ombros * 0.3 - boca * 4}) rotate(${cabeca} 330 500)`}>
          <g transform={redondo ? 'translate(330 0) scale(1.07 1) translate(-330 0)' : undefined}>
            <CabeloTras c={c} />
            <ellipse cx={184} cy={334} rx={26} ry={36} fill={pele} {...contorno} />
            <ellipse cx={476} cy={334} rx={26} ry={36} fill={pele} {...contorno} />
            {c.brinco ? <circle cx={180} cy={376} r={8} fill="#F5C542" {...contorno} strokeWidth={3} /> : null}
            <path
              d={
                redondo
                  ? 'M180 300 C180 185 250 128 330 128 C410 128 480 185 480 300 C480 430 420 500 330 500 C240 500 180 430 180 300 Z'
                  : 'M180 300 C180 185 250 130 330 130 C410 130 480 185 480 300 C480 420 415 492 330 492 C245 492 180 420 180 300 Z'
              }
              fill={pele}
              {...contorno}
            />
            <Barba c={c} />
          </g>
          <ellipse cx={244} cy={barbudo ? 374 : 398} rx={barbudo ? 20 : 26} ry={barbudo ? 10 : 14} fill="#FF7A70" opacity={0.3} />
          <ellipse cx={416} cy={barbudo ? 374 : 398} rx={barbudo ? 20 : 26} ry={barbudo ? 10 : 14} fill="#FF7A70" opacity={0.3} />
          {[272, 388].map((x) => (
            <Olho
              key={x}
              cx={x}
              cy={325}
              piscar={piscar}
              olhar={pose.olhar}
              cor={c.olhos ?? '#3B2418'}
              arregalado={expressao === 'surpreso' ? 1 : 0}
              pele={pele}
              palpebra={!!c.palpebras}
            />
          ))}
          <Sobrancelhas cor={c.sobrancelhas ?? c.cabelo.cor} sobe={boca * 7} expressao={expressao} />
          <path d="M320 350 Q306 392 330 394 Q350 394 352 382" fill="none" stroke={peleSombra} strokeWidth={6} strokeLinecap="round" />
          <Bigode c={c} />
          <Boca abre={boca} labio={barbudo ? escurece(pele, 0.9) : undefined} />
          <CabeloFrente c={c} />
          <Oculos c={c} />
        </g>
        <g transform={`translate(0 ${-pose.ombros - 35})`}>
          <BracoSvg b={esq} x={corpo.braco} y={640} c={c} pele={pele} />
          <BracoSvg b={dir} x={660 - corpo.braco} y={640} c={c} pele={pele} />
        </g>
      </g>
    </svg>
  );
};
