import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/caveat/700.css';
import type {Tema} from './types';

export const W = 1080;
export const H = 1920;

export const temaPadrao: Tema = {
  fundo: '#EEF0F6',
  pontos: '#C9CEDB',
  tinta: '#121217',
  destaque: '#7C5CFF',
  acento: '#F5A05A',
  cartao: '#FFFFFF',
  bom: '#2BB673',
  ruim: '#F0566B',
};

export const fontes = {
  titulo: '"Poppins", sans-serif',
  mono: '"Space Mono", monospace',
  script: '"Caveat", cursive',
};

// Borda grossa + sombra deslocada (estilo "neo-brutalista" dos reels)
export const borda = (tema: Tema, sombra = 10) => ({
  border: `5px solid ${tema.tinta}`,
  boxShadow: `${sombra}px ${sombra}px 0 ${tema.tinta}`,
});
