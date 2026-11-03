import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {
  Cena,
  CenaCodigo,
  CenaComparacao,
  CenaCta,
  CenaFluxo,
  CenaHook,
  CenaLista,
  Tema,
} from '../types';
import {borda, fontes} from '../theme';
import {pop, saida} from '../components/anim';
import {RichText} from '../components/RichText';
import {Badge, Cartao, Emoji, Marcado} from '../components/Pecas';

type P<T> = {cena: T; tema: Tema; duracao: number};

// Área de conteúdo: metade de cima da tela (o avatar fica embaixo)
const Area: React.FC<{duracao: number; children: React.ReactNode; topo?: number}> = ({
  duracao,
  children,
  topo = 170,
}) => {
  const frame = useCurrentFrame();
  const s = saida(frame, duracao);
  return (
    <AbsoluteFill
      style={{
        top: topo,
        height: 1080 - topo,
        padding: '0 70px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 50,
        opacity: s,
        transform: `translateY(${(1 - s) * -60}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Momento (frame) em que o i-ésimo de n itens aparece
const tempoItem = (i: number, n: number, duracao: number, primeiro = 14) => {
  const ultimo = Math.max(primeiro + 1, duracao * 0.55);
  return n <= 1 ? primeiro : primeiro + ((ultimo - primeiro) * i) / (n - 1);
};

const Brilhos: React.FC<{tema: Tema}> = ({tema}) => {
  const frame = useCurrentFrame();
  const estrelas = [
    {x: 120, y: 330, s: 46, c: tema.acento, d: 0},
    {x: 930, y: 260, s: 34, c: tema.destaque, d: 6},
    {x: 960, y: 900, s: 40, c: tema.acento, d: 12},
    {x: 90, y: 980, s: 30, c: tema.destaque, d: 18},
  ];
  return (
    <AbsoluteFill>
      {estrelas.map((e, i) => {
        const p = interpolate(frame - e.d, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const r = frame * 2 + i * 40;
        const pulso = 1 + Math.sin((frame + i * 10) / 8) * 0.15;
        return (
          <svg
            key={i}
            width={e.s * 2}
            height={e.s * 2}
            viewBox="-50 -50 100 100"
            style={{position: 'absolute', left: e.x - e.s, top: e.y - e.s, transform: `rotate(${r}deg) scale(${p * pulso})`}}
          >
            <path d="M0 -46 C6 -8 8 -6 46 0 C8 6 6 8 0 46 C-6 8 -8 6 -46 0 C-8 -6 -6 -8 0 -46 Z" fill={e.c} stroke={tema.tinta} strokeWidth={5} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

const Titulo: React.FC<{texto?: string; tema: Tema; tamanho?: number}> = ({texto, tema, tamanho = 92}) =>
  texto ? <RichText texto={texto} tema={tema} tamanho={tamanho} inicio={2} intervalo={2} /> : null;

// ---------------------------------------------------------------- hook
const Hook: React.FC<P<CenaHook>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sub = pop(frame, fps, 22);
  return (
    <>
      <Brilhos tema={tema} />
      <Area duracao={duracao}>
        {cena.badge ? <Badge texto={cena.badge} tema={tema} /> : null}
        <RichText texto={cena.titulo} tema={tema} tamanho={124} inicio={6} intervalo={4} />
        {cena.subtitulo ? (
          <div
            style={{
              fontFamily: fontes.mono,
              fontWeight: 700,
              fontSize: 44,
              color: tema.tinta,
              background: 'white',
              padding: '12px 30px',
              borderRadius: 16,
              ...borda(tema, 6),
              opacity: sub,
              transform: `scale(${0.7 + 0.3 * sub})`,
            }}
          >
            <Marcado texto={cena.subtitulo} tema={tema} />
          </div>
        ) : null}
      </Area>
    </>
  );
};

// ---------------------------------------------------------------- fluxo
const Fluxo: React.FC<P<CenaFluxo>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = cena.itens.length;
  const largura = n >= 4 ? 205 : n === 3 ? 276 : 360;
  const gap = n >= 4 ? 36 : 56;
  const tempos = cena.itens.map((_, i) => tempoItem(i, n, duracao, 16));
  const ativo = tempos.filter((t) => frame >= t).length - 1;
  return (
    <Area duracao={duracao}>
      <Titulo texto={cena.titulo} tema={tema} />
      <div style={{display: 'flex', alignItems: 'center', gap}}>
        {cena.itens.map((it, i) => {
          const p = pop(frame, fps, tempos[i]);
          const destaque = i === ativo ? 1 : 0;
          const conector =
            i < n - 1
              ? (() => {
                  const pc = interpolate(frame, [tempos[i + 1] - 8, tempos[i + 1]], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });
                  return (
                    <svg
                      width={gap + 20}
                      height={40}
                      style={{position: 'absolute', right: -(gap + 10), top: '50%', marginTop: -20, overflow: 'visible'}}
                    >
                      <line
                        x1={6}
                        y1={20}
                        x2={6 + (gap - 6) * pc}
                        y2={20}
                        stroke={tema.tinta}
                        strokeWidth={6}
                        strokeDasharray="10 9"
                        strokeDashoffset={-frame * 1.5}
                        strokeLinecap="round"
                      />
                      {pc > 0.95 ? (
                        <path d={`M${gap - 10} 9 L${gap + 6} 20 L${gap - 10} 31`} fill="none" stroke={tema.tinta} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                      ) : null}
                    </svg>
                  );
                })()
              : null;
          return (
            <div key={i} style={{position: 'relative'}}>
              <Cartao
                tema={tema}
                fundo={destaque ? '#FFF4E8' : undefined}
                style={{
                  width: largura,
                  padding: '40px 12px 34px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 80}px) scale(${(0.7 + 0.3 * p) * (1 + destaque * 0.06)}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                  borderColor: destaque ? tema.acento : tema.tinta,
                }}
              >
                <Emoji e={it.emoji ?? '⭐'} tamanho={n >= 4 ? 96 : 130} />
                <div style={{fontFamily: fontes.titulo, fontWeight: 800, fontSize: n >= 4 ? 36 : 46, color: tema.tinta, textAlign: 'center', lineHeight: 1.1}}>
                  <Marcado texto={it.texto} tema={tema} />
                </div>
                {it.detalhe ? (
                  <div style={{fontFamily: fontes.mono, fontWeight: 700, fontSize: n >= 4 ? 22 : 26, color: '#555', textAlign: 'center'}}>
                    {it.detalhe}
                  </div>
                ) : null}
              </Cartao>
              {conector}
            </div>
          );
        })}
      </div>
      {cena.legenda ? (
        <div
          style={{
            fontFamily: fontes.titulo,
            fontWeight: 700,
            fontSize: 46,
            color: tema.tinta,
            textAlign: 'center',
            opacity: pop(frame, fps, tempos[n - 1] + 10),
          }}
        >
          <Marcado texto={cena.legenda} tema={tema} />
        </div>
      ) : null}
    </Area>
  );
};

// ---------------------------------------------------------------- lista
const Lista: React.FC<P<CenaLista>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = cena.itens.length;
  return (
    <Area duracao={duracao}>
      <Titulo texto={cena.titulo} tema={tema} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 28, width: '100%'}}>
        {cena.itens.map((it, i) => {
          const p = pop(frame, fps, tempoItem(i, n, duracao, 14));
          return (
            <Cartao
              key={i}
              tema={tema}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '22px 30px',
                opacity: p,
                transform: `translateX(${(1 - p) * (i % 2 ? 300 : -300)}px) rotate(${(1 - p) * 6}deg)`,
              }}
            >
              <div
                style={{
                  flex: '0 0 96px',
                  height: 96,
                  borderRadius: 24,
                  background: i % 2 ? tema.destaque : tema.acento,
                  border: `4px solid ${tema.tinta}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: fontes.mono,
                  fontWeight: 700,
                  fontSize: 52,
                  color: 'white',
                }}
              >
                {cena.numerada ? i + 1 : <Emoji e={it.emoji ?? '✅'} tamanho={58} />}
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <div style={{fontFamily: fontes.titulo, fontWeight: 800, fontSize: 48, color: tema.tinta, lineHeight: 1.1}}>
                  <Marcado texto={it.texto} tema={tema} />
                </div>
                {it.detalhe ? (
                  <div style={{fontFamily: fontes.titulo, fontWeight: 600, fontSize: 32, color: '#555'}}>{it.detalhe}</div>
                ) : null}
              </div>
            </Cartao>
          );
        })}
      </div>
    </Area>
  );
};

// ---------------------------------------------------------------- código
const Digitado: React.FC<{texto: string; inicio: number; cps?: number}> = ({texto, inicio, cps = 1.4}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor((frame - inicio) * cps));
  const cursor = frame >= inicio && n < texto.length + 6 && Math.floor(frame / 8) % 2 === 0;
  return (
    <span>
      {texto.slice(0, n)}
      <span style={{opacity: cursor ? 1 : 0}}>▌</span>
    </span>
  );
};

const Codigo: React.FC<P<CenaCodigo>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t1 = 14;
  const t2 = Math.max(t1 + cena.pedido.length / 1.4 + 12, duracao * 0.45);
  const p1 = pop(frame, fps, t1);
  const p2 = pop(frame, fps, t2);
  const seta = interpolate(frame, [t2 - 12, t2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rotulo = (texto: string, cor: string) => (
    <div
      style={{
        position: 'absolute',
        top: -30,
        left: 30,
        background: cor,
        border: `4px solid ${tema.tinta}`,
        borderRadius: 12,
        padding: '4px 18px',
        fontFamily: fontes.mono,
        fontWeight: 700,
        fontSize: 30,
        color: tema.tinta,
        letterSpacing: 2,
      }}
    >
      {texto}
    </div>
  );
  return (
    <Area duracao={duracao}>
      <Titulo texto={cena.titulo} tema={tema} />
      <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        <Cartao
          tema={tema}
          style={{position: 'relative', width: '100%', padding: '60px 40px 44px', opacity: p1, transform: `scale(${0.8 + 0.2 * p1})`}}
        >
          {rotulo(cena.rotuloPedido ?? 'PEDIDO', tema.acento)}
          <div style={{fontFamily: fontes.mono, fontWeight: 700, fontSize: 50, color: tema.tinta, overflowWrap: 'anywhere'}}>
            <Digitado texto={cena.pedido} inicio={t1 + 4} />
          </div>
        </Cartao>
        <svg width={60} height={90} style={{opacity: seta}}>
          <line x1={30} y1={6} x2={30} y2={6 + 66 * seta} stroke={tema.tinta} strokeWidth={7} strokeDasharray="10 9" strokeDashoffset={-frame * 1.5} strokeLinecap="round" />
          <path d="M12 62 L30 84 L48 62" fill="none" stroke={tema.tinta} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Cartao
          tema={tema}
          fundo="#1B1B24"
          style={{position: 'relative', width: '100%', padding: '60px 40px 44px', opacity: p2, transform: `scale(${0.8 + 0.2 * p2})`}}
        >
          {rotulo(cena.rotuloResposta ?? 'RESPOSTA', tema.bom)}
          <div style={{fontFamily: fontes.mono, fontWeight: 700, fontSize: 50, color: '#7CF2B0', whiteSpace: 'pre-wrap'}}>
            <Digitado texto={cena.resposta} inicio={t2 + 4} />
          </div>
        </Cartao>
      </div>
    </Area>
  );
};

// ---------------------------------------------------------------- comparação
const Comparacao: React.FC<P<CenaComparacao>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const coluna = (lado: CenaComparacao['esquerda'], inicio: number, dir: 1 | -1) => {
    const p = pop(frame, fps, inicio);
    const cor = lado.tom === 'bom' ? tema.bom : lado.tom === 'ruim' ? tema.ruim : tema.destaque;
    const icone = lado.tom === 'bom' ? '✅' : lado.tom === 'ruim' ? '❌' : '👉';
    return (
      <Cartao
        tema={tema}
        style={{
          flex: 1,
          overflow: 'hidden',
          opacity: p,
          transform: `translateY(${(1 - p) * 120}px) rotate(${dir * 1.5}deg)`,
        }}
      >
        <div style={{background: cor, borderBottom: `5px solid ${tema.tinta}`, padding: '20px 24px', fontFamily: fontes.titulo, fontWeight: 800, fontSize: 46, color: 'white', textAlign: 'center'}}>
          {lado.titulo}
        </div>
        <div style={{padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 22}}>
          {lado.itens.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                fontFamily: fontes.titulo,
                fontWeight: 700,
                fontSize: 36,
                lineHeight: 1.2,
                color: tema.tinta,
                opacity: pop(frame, fps, inicio + 8 + i * 6),
              }}
            >
              <Emoji e={icone} tamanho={34} />
              <span>
                <Marcado texto={t} tema={tema} />
              </span>
            </div>
          ))}
        </div>
      </Cartao>
    );
  };
  return (
    <Area duracao={duracao}>
      <Titulo texto={cena.titulo} tema={tema} />
      <div style={{display: 'flex', gap: 34, width: '100%', alignItems: 'stretch'}}>
        {coluna(cena.esquerda, 12, -1)}
        {coluna(cena.direita, Math.max(30, duracao * 0.4), 1)}
      </div>
    </Area>
  );
};

// ---------------------------------------------------------------- CTA
const Cta: React.FC<P<CenaCta>> = ({cena, tema, duracao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const botoes = cena.botoes ?? ['📌 Salva', '➕ Segue'];
  return (
    <>
      <Brilhos tema={tema} />
      <Area duracao={duracao + 1000}>
        <RichText texto={cena.titulo} tema={tema} tamanho={104} inicio={4} intervalo={3} />
        <div style={{display: 'flex', gap: 30, flexWrap: 'wrap', justifyContent: 'center'}}>
          {botoes.map((b, i) => {
            const p = pop(frame, fps, 18 + i * 8);
            const pulso = 1 + Math.max(0, Math.sin((frame - 30 - i * 10) / 6)) * 0.06;
            return (
              <div
                key={i}
                style={{
                  background: i % 2 ? tema.destaque : tema.acento,
                  color: i % 2 ? 'white' : tema.tinta,
                  borderRadius: 999,
                  padding: '20px 44px',
                  ...borda(tema, 8),
                  fontFamily: fontes.titulo,
                  fontWeight: 800,
                  fontSize: 52,
                  opacity: p,
                  transform: `scale(${p * pulso})`,
                }}
              >
                {b}
              </div>
            );
          })}
        </div>
      </Area>
    </>
  );
};

export const CenaView: React.FC<{cena: Cena; tema: Tema; duracao: number}> = ({cena, tema, duracao}) => {
  switch (cena.layout) {
    case 'hook':
      return <Hook cena={cena} tema={tema} duracao={duracao} />;
    case 'fluxo':
      return <Fluxo cena={cena} tema={tema} duracao={duracao} />;
    case 'lista':
      return <Lista cena={cena} tema={tema} duracao={duracao} />;
    case 'codigo':
      return <Codigo cena={cena} tema={tema} duracao={duracao} />;
    case 'comparacao':
      return <Comparacao cena={cena} tema={tema} duracao={duracao} />;
    case 'cta':
      return <Cta cena={cena} tema={tema} duracao={duracao} />;
  }
};
