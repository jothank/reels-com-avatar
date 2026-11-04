---
name: criar-reel
description: Cria reels/tutoriais curtos (9:16, 20–60s) com o avatar animado do autor explicando um tema, com motion graphics, voz e boca sincronizada. Use quando pedirem "cria um reel/vídeo/tutorial sobre X", "faz um vídeo curto explicando Y", ou para ajustar o avatar a partir de fotos.
---

# Criar reel com avatar

Projeto Remotion neste repositório. Você escreve um **roteiro JSON**; o script gera a voz,
sincroniza a boca do avatar e renderiza o MP4.

```
roteiros/<id>.json        ← você escreve
avatar/avatar.json        ← aparência do avatar (uma vez só)
scripts/build_reel.py     ← voz + boca + render
videos/<id>.mp4           ← resultado
```

## Fluxo

1. **Entenda o tema** e o público. Se o pedido for vago, escolha um ângulo prático e diga qual escolheu.
2. **Escreva o roteiro** em `roteiros/<id>.json` (id em kebab-case), seguindo as regras abaixo.
3. **Prévia rápida**: `python3 scripts/build_reel.py roteiros/<id>.json --frame N`, gerando um PNG em `out/`.
   Olhe 2–3 quadros (meio de cada cena) com a ferramenta Read e corrija texto estourando, sobreposição etc.
4. **Voz antes do vídeo**: com voz sintética, gere só a voz
   (`python3 scripts/build_reel.py roteiros/<id>.json --motor voicestudio --conferir 5 --so-voz`) e mande
   `out/<id>-voz.m4a` para o autor ouvir (SendUserFile), dizendo em que segundo está cada nome estrangeiro.
   Se ele apontar uma cena, refaça só ela: `--reusar-voz --refazer N --conferir 5 --so-voz`.
   **Render final**, depois do OK: `python3 scripts/build_reel.py roteiros/<id>.json --reusar-voz` gera
   `videos/<id>.mp4` com a voz aprovada, sem gerar de novo. Com a voz do autor gravada, pule direto para o render.
5. Envie o vídeo ao usuário (SendUserFile) e faça commit de `roteiros/<id>.json` + `videos/<id>.mp4`.

Primeira vez na máquina: `npm install` e `pip install -r requirements.txt`; precisa de Node 18+,
Python 3.10+ e `ffmpeg` no PATH. Para a voz offline (rascunho): `apt-get install -y espeak-ng mbrola mbrola-br3`.

**No Windows**: o `python` do PATH é o atalho da Microsoft Store, então use o
ambiente do repositório: `uv venv .venv --python 3.12` + `uv pip install --python .venv\Scripts\python.exe -r requirements.txt edge-tts`
e rode tudo com `.venv\Scripts\python` no lugar de `python3`. FFmpeg: `winget install Gyan.FFmpeg`
(os scripts acham o executável do winget mesmo fora do PATH). O Remotion baixa o próprio Chrome no primeiro render.

## Regras de roteiro (o que faz um reel bom)

- **Gancho nos 2 primeiros segundos**: cena 1 sempre `hook`, com pergunta ou promessa ("X em 30s").
- **4 a 6 cenas, 20 a 45 s no total.** Uma ideia por cena.
- **Fala curta e falada**: frases de até 15 palavras, tom de conversa, 2ª pessoa ("você").
- **Texto na tela ≠ fala**: a tela mostra palavras-chave; a fala explica.
- **Termine com CTA** (`cta`): salvar, seguir ou comentar.
- Destaques no texto: `*palavra*` fica roxa (ou em selo roxo nos cartões); `_palavra_` fica laranja cursiva. Use 1 destaque por título.
- Varie as poses: `acena` no gancho, `aponta` ao apresentar conteúdo, `explica` no meio, `joinha` no CTA.
- `bolha` (balão ao lado do avatar) é opcional: no máximo 3 palavras. Não use nas cenas com `pose: "aponta"` e `layout: "fluxo"` de 4 itens.

## Formato do roteiro

```json
{
  "id": "o-que-e-api",
  "titulo": "O que é uma API?",
  "assinatura": "@seuperfil",
  "voz": {"motor": "auto", "voz_espeak": "mb-br3", "voz_edge": "pt-BR-AntonioNeural",
          "voz_elevenlabs": "<id da voz clonada>", "pronuncia": {"SQL": "esse quê éle"}},
  "musica": "musicas/lofi.mp3",
  "cenas": [ { "layout": "hook", "...": "..." } ]
}
```

Campos comuns a toda cena: `fala` (obrigatório), `pose`, `expressao`, `bolha`, `audio_arquivo`.

| layout | campos | quando usar |
|---|---|---|
| `hook` | `titulo`, `badge?`, `subtitulo?` | abertura / pergunta |
| `fluxo` | `titulo?`, `itens[2-4]{emoji,texto,detalhe?}`, `legenda?` | processo, analogia A → B → C |
| `lista` | `titulo?`, `itens[2-5]{emoji?,texto,detalhe?}`, `numerada?` | passos, dicas, exemplos |
| `codigo` | `titulo?`, `pedido`, `resposta`, `rotuloPedido?`, `rotuloResposta?` | comando/código e resultado |
| `comparacao` | `titulo?`, `esquerda{titulo,itens,tom}`, `direita{...}` (tom: `ruim`/`bom`/`neutro`) | antes × depois, certo × errado |
| `cta` | `titulo`, `botoes?` | fechamento |

- `pose`: `idle`, `acena`, `aponta`, `explica`, `duvida`, `joinha`
- `expressao`: `feliz` (padrão), `surpreso`, `pensativo`, `serio`
- Limites de texto: título ≤ 5 palavras; item de lista ≤ 4 palavras; `pedido`/`resposta` ≤ 30 caracteres por linha.

## Voz

**Padrão: a voz do próprio autor.** Depois de escrever o roteiro:

1. Gere o texto para ele gravar e mande no chat:
   `python3 scripts/build_reel.py roteiros/<id>.json --texto-gravacao`
2. Ele grava **tudo num áudio só** (gravador do celular, qualquer formato), com uma **pausa de ~2 s
   entre as cenas**, e envia o arquivo, seja pelo chat ou subindo em `gravacoes/` pelo GitHub.
3. Salve como `gravacoes/<id>.m4a` (ou a extensão que vier) e coloque no roteiro
   `"audio_unico": "gravacoes/<id>.m4a"`. O script corta nas pausas, normaliza o volume e sincroniza
   a boca. Se ele disser que faltam pausas, peça uma nova gravação com pausas maiores.
   A fala gravada pode diferir um pouco do texto; isso não é problema.

**Várias tentativas / áudios do WhatsApp** (o caso mais comum): salve os arquivos em
`gravacoes/<id>/` com nomes que ordenem certo e rode
`python3 scripts/montar_gravacao.py roteiros/<id>.json gravacoes/<id>/*.opus`. Ele transcreve
(faster-whisper; o primeiro uso baixa o modelo do huggingface.co), acha a última tentativa boa de
cada cena, corta e põe `audio_arquivo` no roteiro. Mostre ao autor o texto escolhido de cada cena.
Se faltar alguma cena, peça para ele regravar só ela.
Se o huggingface.co estiver bloqueado (sessão na nuvem), rode `python3 scripts/baixar_whisper_npm.py`
e passe `--modelo modelos/whisper-small`. **Antes de montar, leia a transcrição**
(`--so-transcrever`): se os áudios não forem do roteiro (ex.: mensagens pessoais encaminhadas por
engano), não use, não faça commit deles e avise o autor sem repetir o conteúdo.
Não faça commit das gravações brutas: elas ficam só na máquina (a pasta `gravacoes/` só guarda o LEIA-ME).

**Voz clonada grátis (VoiceStudio):** se o autor rodar este repositório no PC dele com o
[VoiceStudio](https://github.com/debpalash/VoiceStudio) aberto e um perfil com a voz dele clonada,
ponha `"voz_voicestudio": "<nome do perfil>"` em `voz`. Para criar o perfil a partir de áudios do autor:
`python scripts/clonar_voz_voicestudio.py <áudios> --nome <nome do perfil> --idioma pt`
(sem `--inicio/--fim`, escolhe sozinho um trecho limpo de ~12 s; sem `--texto-ref`, o VoiceStudio transcreve o
trecho, o que saiu melhor nos testes que a transcrição do faster-whisper; se o perfil já existe, troca só o áudio dele).
**A referência precisa começar e terminar numa pausa de verdade, com silêncio depois**: o VoxCPM2 continua o áudio de
referência, e se ela acabar no meio de uma palavra, toda fala gerada começa terminando essa palavra (um "iru" no
começo). O script já corta entre pausas de 150 ms e põe silêncio nas pontas; o `build_reel.py` ainda detecta esse
estalo e gera a fala de novo. Evite começar uma fala com "E" sozinho: o VoxCPM2 costuma engolir ou embolar.
No Windows, rode os scripts com `PYTHONUTF8=1` quando a saída for para um pipe (senão o log quebra nos acentos).
No modo `auto`, o script detecta o VoiceStudio em `http://localhost:3900` (ou `VOICESTUDIO_URL`) e gera as falas sem gravação.
**Motor recomendado: VoxCPM2** (`"modelo_voicestudio": "voxcpm2"`): Apache-2.0 (pode usar comercialmente),
fala português, roda na GPU. Testado com o VoiceStudio 0.5.7.
O OmniVoice (padrão do app) é **não comercial** (CC-BY-NC) e pede aceite de licença no app.
Gere a voz com `--motor voicestudio --conferir 5`: no `auto`, se o VoiceStudio falhar, o script cai calado
para o edge-tts; e o VoxCPM2 às vezes engole ou troca palavras, então o `--conferir` transcreve cada fala e
gera de novo (até 5 vezes) quando não bate com o roteiro. Com o VoiceStudio aberto, a conferência usa o Whisper dele
(large-v3-turbo, na placa de vídeo, ~1 s por fala); sem ele, o small no processador, que ouve bem pior.
O log mostra o que foi ouvido em cada cena: leia antes de entregar. Mas o Whisper escreve o nome certo mesmo quando a
pronúncia está errada: **nome estrangeiro só se confirma ouvindo**.
**Ritmo da fala:** sem instrução, o clone fala a 200–250 palavras por minuto, rápido e embolado; com a instrução calma,
130–175, lento demais. O que ficou bom: gerar calmo e acelerar cada cena para 175 palavras/min. Use sempre em `voz`:
`"estilo_voicestudio": "Speak slowly and calmly, in a warm and friendly tone, with natural pauses between sentences."`
(vai como `instruct` para o VoxCPM2; em inglês funcionou melhor que em português), `"ritmo": [145, 190]` (faixa da
tentativa escolhida, antes de acelerar) e `"ritmo_alvo": 175`. O build acelera ou freia cada cena até o alvo
(de 0,9× a 1,2×, filtro `atempo`, sem mudar o tom), deixa as pausas internas com no máximo 0,3 s e põe 0,47 s
de respiro no fim de cada cena. O `speed` e o `duration` da API quase não mudam nada no VoxCPM2.
**Grafias** em `voz.pronuncia`:
- Nomes em inglês muito conhecidos saem melhor **escritos em inglês, sem grafia**: `GitHub` (com "Guíti Râbi" saía
  "gitirabi") e `hallmark` (com "rólmark" saía "Roma"/"Rumark").
- Funcionaram: `"Postman": "Pôustmen"`, `"IA": "i-á"` (em maiúsculas some; "ia" sai "ía"), `"Claude Code": "Clóud Côud"`,
  `"CLAUDE.md": "Clóud ponto eme dê"`, `"skill": "isquíl"`, `"Remotion": "Rimóshon"`, `"VoiceStudio": "Vóice Stúdio"`.
- Nome que já está na tela não precisa ser falado; nome difícil, fale uma vez só.
Não comece a fala com um nome em inglês ("Skill é…" saiu "SQL é…") nem com "A IA" (sai "Aí a"): ponha outra palavra
antes ("Uma skill é…", "O agente faz…"). Evite "reel" na fala (sai "rei"). A chave do `pronuncia`
diferencia maiúsculas: "Skill" e "skill" são entradas diferentes.

**VoiceStudio no Windows pelo Claude Desktop:**
- Se `http://localhost:3900/health` não responder, abra o app **fora do sandbox** (`dangerouslyDisableSandbox`):
  `Start-Process "$env:LOCALAPPDATA\Programs\VoiceStudio\VoiceStudio.exe"`. Dentro do sandbox o preparo do ambiente
  falha com "Missing expected target directory for Python minor version link".
- O Claude Desktop é um app MSIX: o que um programa aberto por ele grava no AppData vai para a pasta privada do Claude
  (`%LOCALAPPDATA%\Packages\Claude_*\LocalCache\...`). Se o VoiceStudio foi instalado assim, aberto pelo menu Iniciar
  ele não vê os motores nem o perfil e pede "Instalar ambiente local" de novo. Uma cópia aberta pelo menu Iniciar
  também ocupa a porta 3900 sem o perfil: feche-a antes.
- Aberto, ele segura ~7 GB da placa de vídeo. Feche quando terminar.

Alternativas: um áudio por cena (`"audio_arquivo"` em cada cena); voz clonada no ElevenLabs
(`ELEVENLABS_API_KEY` + `voz.voz_elevenlabs`, exige liberar `api.elevenlabs.io` na rede);
edge-tts; espeak-ng. `voz.motor` = `auto` tenta, em ordem: gravação, ElevenLabs, edge-tts, espeak.
O espeak é robótico: serve só de rascunho, e o script avisa quando é usado.

## Avatar a partir de fotos

Modo `svg` (padrão): personagem desenhado em código, com boca, piscadas e braços animados.
Ao receber fotos do autor, olhe-as e preencha `avatar/avatar.json`:

- `pele`: hex do tom de pele (meio-tom da bochecha, sem sombra/brilho) · `rosto`: `oval` | `redondo`
- `corpo`: `magro` | `normal` | `cheinho` · `palpebras`: bool (olhar mais relaxado e natural)
- `cabelo.estilo`: `cacheado` | `curto` | `liso` | `longo` | `raspado` | `entradas` | `careca`; `cabelo.cor`: hex
- `olhos`, `sobrancelhas`: hex · `oculos`: `false` ou `{"formato":"redondo"|"quadrado"|"retangular","cor":"#hex"}`
- `barba`: `nenhuma` | `rala` | `curta` | `cheia` | `longa` · `corBarba`: hex · `bigode`: bool · `brinco`: bool
- `roupa`: `{"tipo":"moletom"|"camiseta"|"camisa","cor":"#hex","detalhe":"#hex","cordao":"#hex"}` (a roupa que a pessoa mais usa)

O `avatar/avatar.json` que vem no repositório é o do criador do projeto (Jonathan, @jothankdev). Se o usuário
ainda não tem o avatar dele, peça 3 ou 4 fotos e troque. Use o perfil do usuário nas redes como `assinatura` e no CTA.
A foto de perfil sai do mesmo avatar (composição `Perfil`, em `src/Perfil.tsx`):
`npx remotion still src/index.ts Perfil perfil/foto.png`. Gere de novo quando o avatar mudar.

Depois renderize um quadro (`--frame 60`), compare com a foto e ajuste. Se nenhum estilo de cabelo
servir, crie um novo em `src/avatar/SvgAvatar.tsx` (`CabeloTras`/`CabeloFrente`), no mesmo estilo
de contorno grosso.

Modo `png` (visual mais rico, feito em IA de imagem): o autor gera ilustrações dele no estilo cartoon
(fundo transparente, enquadramento busto, mesma escala) para cada pose e salva em
`public/avatar/poses/<pose>.png`; opcionalmente `<pose>-boca.png` com a boca aberta, configurado em
`png.posesBocaAberta`. Troque `"modo": "png"`. O avatar balança e "fala" alternando as imagens.

## Problemas comuns

- Render falha ao baixar o Chrome: o script já usa `/opt/pw-browsers/...`; em outra máquina passe `REMOTION_CHROMIUM=/caminho/do/chrome`.
- Emoji aparece como quadrado: instale `fonts-noto-color-emoji`.
- Texto estourando: encurte o texto (não diminua a fonte abaixo do padrão; o reel é visto no celular).
