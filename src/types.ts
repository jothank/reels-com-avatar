// Formato do roteiro (roteiros/*.json) depois de processado por scripts/build_reel.py.

export type Pose = 'idle' | 'aponta' | 'acena' | 'explica' | 'joinha' | 'duvida';
export type Expressao = 'feliz' | 'surpreso' | 'pensativo' | 'serio';

export type Item = {
  emoji?: string;
  texto: string;
  detalhe?: string;
};

type CenaBase = {
  fala: string; // texto narrado
  pose?: Pose;
  expressao?: Expressao;
  bolha?: string; // frase curta no balão ao lado do avatar (aceita *destaque*)
  // Preenchidos pelo build:
  audio?: string; // caminho relativo a public/
  duracao?: number; // em frames
  inicioAudio?: number; // frame (relativo à cena) em que a fala começa
};

export type CenaHook = CenaBase & {
  layout: 'hook';
  badge?: string;
  titulo: string; // *roxo*  _laranja cursivo_
  subtitulo?: string;
};

export type CenaFluxo = CenaBase & {
  layout: 'fluxo';
  titulo?: string;
  itens: Item[]; // 2 a 4 blocos ligados por setas tracejadas
  legenda?: string;
};

export type CenaLista = CenaBase & {
  layout: 'lista';
  titulo?: string;
  itens: Item[];
  numerada?: boolean;
};

export type CenaCodigo = CenaBase & {
  layout: 'codigo';
  titulo?: string;
  pedido: string; // ex.: "GET /clima?cidade=SP"
  resposta: string; // ex.: '{ "temp": "27°C" }'
  rotuloPedido?: string;
  rotuloResposta?: string;
};

export type CenaComparacao = CenaBase & {
  layout: 'comparacao';
  titulo?: string;
  esquerda: {titulo: string; itens: string[]; tom?: 'ruim' | 'bom' | 'neutro'};
  direita: {titulo: string; itens: string[]; tom?: 'ruim' | 'bom' | 'neutro'};
};

export type CenaCta = CenaBase & {
  layout: 'cta';
  titulo: string;
  botoes?: string[];
};

export type Cena = CenaHook | CenaFluxo | CenaLista | CenaCodigo | CenaComparacao | CenaCta;

export type AvatarSvgConfig = {
  pele: string;
  peleSombra?: string;
  cabelo: {
    estilo: 'cacheado' | 'curto' | 'liso' | 'longo' | 'careca' | 'raspado' | 'entradas';
    cor: string;
  };
  olhos?: string;
  sobrancelhas?: string;
  oculos?: false | {cor?: string; formato?: 'redondo' | 'quadrado' | 'retangular'};
  barba?: 'nenhuma' | 'rala' | 'curta' | 'cheia' | 'longa';
  corBarba?: string;
  rosto?: 'oval' | 'redondo';
  corpo?: 'magro' | 'normal' | 'cheinho';
  palpebras?: boolean; // pálpebras um pouco caídas (olhar mais natural)
  bigode?: boolean;
  roupa: {tipo: 'moletom' | 'camiseta' | 'camisa'; cor: string; detalhe?: string; cordao?: string};
  brinco?: boolean;
};

export type AvatarPngConfig = {
  // Imagens com fundo transparente, uma por pose. "idle" é obrigatória.
  poses: Partial<Record<Pose, string>>;
  // Opcional: mesma pose com a boca aberta (para dar efeito de fala).
  posesBocaAberta?: Partial<Record<Pose, string>>;
};

export type AvatarConfig = {
  modo: 'svg' | 'png';
  nome?: string;
  svg: AvatarSvgConfig;
  png?: AvatarPngConfig;
};

export type ReelProps = {
  id: string;
  titulo: string;
  assinatura?: string; // ex.: "@seuperfil"
  musica?: string; // trilha de fundo (caminho relativo a public/)
  volumeMusica?: number;
  fps: number;
  cenas: Cena[];
  boca: number[]; // abertura da boca (0..1) para cada frame do vídeo
  avatar: AvatarConfig;
  tema?: Partial<Tema>;
};

export type Tema = {
  fundo: string;
  pontos: string;
  tinta: string;
  destaque: string; // roxo
  acento: string; // laranja
  cartao: string;
  bom: string;
  ruim: string;
};
