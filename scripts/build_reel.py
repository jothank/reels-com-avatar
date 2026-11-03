#!/usr/bin/env python3
"""Gera um reel a partir de um roteiro JSON.

Etapas: voz (TTS ou gravação) -> sincronia da boca -> props -> render (Remotion).

Uso:
  python3 scripts/build_reel.py roteiros/o-que-e-api.json
  python3 scripts/build_reel.py roteiros/x.json --motor espeak --sem-render
  python3 scripts/build_reel.py roteiros/x.json --frame 120   # só um quadro PNG (prévia)
  python3 scripts/build_reel.py roteiros/x.json --motor voicestudio --conferir 3   # voz clonada, conferida

Sua voz: grave o roteiro inteiro num áudio só, com ~2 s de pausa entre as cenas, e
coloque "audio_unico": "gravacoes/<id>.m4a" no roteiro. O script corta nas pausas.
Ou grave um áudio por cena e use "audio_arquivo" em cada cena.

Motores de voz (campo "voz.motor" no roteiro ou --motor):
  auto        gravação > VoiceStudio > ElevenLabs > edge-tts > espeak-ng
  voicestudio sua voz clonada no VoiceStudio rodando no mesmo PC (voz.voz_voicestudio = nome do perfil)
  arquivo     usa "audio_arquivo" de cada cena (sua voz gravada)
  elevenlabs  precisa de ELEVENLABS_API_KEY e voz.voz_elevenlabs (id da voz, pode ser um clone da sua)
  edge        edge-tts (vozes neurais gratuitas da Microsoft; precisa de internet liberada)
  espeak      espeak-ng + mbrola (offline, voz robótica — só para rascunho)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FPS = 30
TAXA = 48000
INICIO_FALA = 6  # frames de respiro antes da fala em cada cena
FIM_FALA = 14  # frames depois da fala


def log(msg: str) -> None:
    print(f"[reel] {msg}", flush=True)


def _acha_ffmpeg() -> None:
    """No Windows, o FFmpeg do winget fica fora do PATH até reabrir o terminal (ou para sempre, sem os links)."""
    if os.name != "nt" or shutil.which("ffmpeg"):
        return
    pacotes = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    for exe in sorted(pacotes.glob("Gyan.FFmpeg*/*/bin/ffmpeg.exe"), reverse=True):
        os.environ["PATH"] = f"{exe.parent}{os.pathsep}{os.environ.get('PATH', '')}"
        return


_acha_ffmpeg()


def limpa_texto(texto: str, pronuncia: dict[str, str]) -> str:
    t = re.sub(r"[*_]", "", texto)
    for de, para in pronuncia.items():
        t = re.sub(rf"\b{re.escape(de)}\b", para, t)
    return t


def para_wav(origem: Path, destino: Path, normaliza: bool = True) -> None:
    filtro = ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"] if normaliza else []
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(origem), "-ac", "1", "-ar", str(TAXA),
         *filtro, "-sample_fmt", "s16", str(destino)],
        check=True,
    )


# ------------------------------------------------------------------ motores de voz
PRONUNCIA_ESPEAK = {"API": "A P I", "APIs": "A P Is"}


def tts_espeak(texto: str, destino: Path, voz: dict) -> None:
    texto = limpa_texto(texto, PRONUNCIA_ESPEAK)  # o espeak lê siglas como palavra
    tmp = destino.with_suffix(".raw.wav")
    nome = voz.get("voz_espeak", "mb-br3")
    vel = str(voz.get("velocidade_espeak", 160))
    r = subprocess.run(["espeak-ng", "-v", nome, "-s", vel, "-w", str(tmp), texto], capture_output=True)
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 1000:
        subprocess.run(["espeak-ng", "-v", "pt-br", "-s", vel, "-w", str(tmp), texto], check=True)
    para_wav(tmp, destino)
    tmp.unlink(missing_ok=True)


def tts_edge(texto: str, destino: Path, voz: dict) -> None:
    tmp = destino.with_suffix(".mp3")
    cmd = shutil.which("edge-tts")
    base = [cmd] if cmd else [sys.executable, "-m", "edge_tts"]
    subprocess.run(
        base + ["--voice", voz.get("voz_edge", "pt-BR-AntonioNeural"), "--rate", voz.get("velocidade_edge", "+8%"),
                "--text", texto, "--write-media", str(tmp)],
        check=True, capture_output=True, timeout=60,
    )
    para_wav(tmp, destino)
    tmp.unlink(missing_ok=True)


def tts_elevenlabs(texto: str, destino: Path, voz: dict) -> None:
    chave = os.environ["ELEVENLABS_API_KEY"]
    voz_id = voz["voz_elevenlabs"]
    corpo = json.dumps({
        "text": texto,
        "model_id": voz.get("modelo_elevenlabs", "eleven_multilingual_v2"),
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voz_id}",
        data=corpo,
        headers={"xi-api-key": chave, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    tmp = destino.with_suffix(".mp3")
    with urllib.request.urlopen(req, timeout=90) as r:
        tmp.write_bytes(r.read())
    para_wav(tmp, destino)
    tmp.unlink(missing_ok=True)


def tts_voicestudio(texto: str, destino: Path, voz: dict) -> None:
    """VoiceStudio (github.com/debpalash/VoiceStudio) rodando no mesmo computador.

    API compatível com OpenAI em http://localhost:3900/v1/audio/speech; "voice" é o nome ou id
    do perfil com a voz clonada do autor.
    """
    base = os.environ.get("VOICESTUDIO_URL", voz.get("url_voicestudio", "http://localhost:3900")).rstrip("/")
    corpo = {
        "model": voz.get("modelo_voicestudio", "tts-1"),
        "input": texto,
        "voice": voz["voz_voicestudio"],
        "response_format": "wav",
        "language": "pt",
        "speed": voz.get("velocidade_voicestudio", 1.0),
    }
    headers = {"Content-Type": "application/json"}
    if os.environ.get("VOICESTUDIO_API_KEY"):
        headers["Authorization"] = f"Bearer {os.environ['VOICESTUDIO_API_KEY']}"
    req = urllib.request.Request(f"{base}/v1/audio/speech", data=json.dumps(corpo).encode(), headers=headers)
    tmp = destino.with_suffix(".vs.wav")
    for n in range(3):
        with urllib.request.urlopen(req, timeout=600) as r:
            tmp.write_bytes(r.read())
        if not ruido_no_inicio(tmp):
            break
        log("  ruído no começo da fala; gerando de novo" if n < 2 else "  AVISO: ruído no começo da fala; ouça antes de publicar")
    para_wav(tmp, destino)
    tmp.unlink(missing_ok=True)
    apara_inicio(destino)


def apara_inicio(wav: Path) -> None:
    """Corta o que vem antes da fala (respiração, chiado baixinho), deixando 40 ms.

    Só sai o que está 30 dB abaixo da fala: nem um "e" fraquinho chega tão baixo.
    """
    import numpy as np

    x = _pcm16k(wav)
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[k:k + 320] ** 2)) + 1e-6) for k in range(0, len(x) - 320, 320)])
    acima = np.flatnonzero(db > np.percentile(db, 90) - 30) if len(db) else []
    if not len(acima) or acima[0] < 3:
        return
    amostras, taxa = le_wav(wav)
    resto = amostras[int((acima[0] - 2) * 0.02 * taxa):]
    rampa = taxa // 100
    for k in range(min(rampa, len(resto))):
        resto[k] = resto[k] * k // rampa
    grava_wav(wav, resto, taxa)


def ruido_no_inicio(wav: Path) -> bool:
    """Estalo curto, pausa e só depois a fala.

    É o VoxCPM2 terminando a palavra cortada no fim da referência do clone (por isso o
    clonar_voz_voicestudio.py corta a referência numa pausa); aqui fica só a rede de segurança.
    """
    import numpy as np

    x = _pcm16k(wav)
    jan = 320  # 20 ms
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[k:k + jan] ** 2)) + 1e-6) for k in range(0, len(x) - jan, jan)])
    if len(db) < 60:
        return False
    nivel = np.percentile(db, 90)
    som, silencio = db > nivel - 20, db < nivel - 40
    if not som[:5].any():
        return False  # começa em silêncio: sem estalo
    seguidos = 0
    for k in range(60):  # a pausa depois do estalo começa no primeiro 1,2 s
        seguidos = seguidos + 1 if silencio[k] else 0
        if seguidos == 6:  # 120 ms de silêncio
            return som[:k].sum() <= 13 and som[k:].any()  # até ~260 ms de som antes, fala depois
    return False


def voicestudio_no_ar(voz: dict) -> bool:
    if not voz.get("voz_voicestudio"):
        return False
    base = os.environ.get("VOICESTUDIO_URL", voz.get("url_voicestudio", "http://localhost:3900")).rstrip("/")
    try:
        with urllib.request.urlopen(f"{base}/v1/models", timeout=3):
            return True
    except Exception:  # noqa: BLE001
        return False


def gera_voz(cena: dict, destino: Path, voz: dict, motor: str, pronuncia: dict) -> str:
    arquivo = cena.get("audio_arquivo")
    if arquivo and motor in ("auto", "arquivo"):
        caminho = (RAIZ / arquivo) if not Path(arquivo).is_absolute() else Path(arquivo)
        para_wav(caminho, destino)
        return "arquivo"
    if motor == "arquivo":
        raise SystemExit(f"Cena sem 'audio_arquivo': {cena.get('fala', '')[:40]}…")

    texto = limpa_texto(cena["fala"], pronuncia)
    tentativas = [motor] if motor != "auto" else ["voicestudio", "elevenlabs", "edge", "espeak"]
    for m in tentativas:
        if m == "voicestudio" and motor == "auto" and not voicestudio_no_ar(voz):
            continue
        if m == "elevenlabs" and not (os.environ.get("ELEVENLABS_API_KEY") and voz.get("voz_elevenlabs")):
            continue
        if m == "edge" and not (shutil.which("edge-tts") or _tem_modulo("edge_tts")):
            continue
        try:
            {"espeak": tts_espeak, "edge": tts_edge, "elevenlabs": tts_elevenlabs, "voicestudio": tts_voicestudio}[m](texto, destino, voz)
            return m
        except Exception as e:  # noqa: BLE001 — cai para o próximo motor
            log(f"motor '{m}' falhou ({type(e).__name__}: {str(e)[:120]}); tentando o próximo")
    raise SystemExit("Nenhum motor de voz funcionou.")


def _tem_modulo(nome: str) -> bool:
    try:
        __import__(nome)
        return True
    except ImportError:
        return False


# ------------------------------------------------------------------ conferência da fala
_whisper = None


def _pcm16k(wav: Path):
    import numpy as np

    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768


def transcreve(wav: Path) -> str:
    """O que o faster-whisper (modelo small, no processador) ouve no áudio."""
    global _whisper
    from faster_whisper import WhisperModel

    if _whisper is None:
        _whisper = WhisperModel("small", device="cpu", compute_type="int8")
    segmentos, _ = _whisper.transcribe(_pcm16k(wav), language="pt")
    return " ".join(s.text.strip() for s in segmentos)


def confere_fala(wav: Path, texto: str) -> tuple[float, str]:
    """Transcreve a fala gerada (faster-whisper) e compara com o roteiro: (semelhança 0–1, o que foi ouvido).

    Vozes clonadas (VoxCPM2 etc.) às vezes engolem ou trocam palavras; isso pega o problema sem ouvir.
    """
    from difflib import SequenceMatcher

    from montar_gravacao import palavras_do_texto

    ouvido = transcreve(wav)
    iguais = {"para": "pra", "pro": "pra"}  # o Whisper escreve "para" quando se fala "pra"
    esperado = [iguais.get(p, p) for p in palavras_do_texto(texto)]
    ouvidas = [iguais.get(p, p) for p in palavras_do_texto(ouvido)]
    juntas: list[str] = []  # "Voice Studio" ouvido conta como "VoiceStudio" do roteiro
    for p in ouvidas:
        if juntas and juntas[-1] not in esperado and juntas[-1] + p in esperado:
            juntas[-1] += p
        else:
            juntas.append(p)
    nota = SequenceMatcher(None, esperado, juntas).ratio()
    if esperado and esperado[0] not in juntas[:2]:
        nota -= 0.1  # o VoxCPM2 às vezes pula a primeira palavra, e isso quase não mexe na semelhança
    return nota, ouvido


def gera_voz_conferida(cena: dict, destino: Path, voz: dict, motor: str, pronuncia: dict, tentativas: int) -> str:
    """Gera a fala até `tentativas` vezes e fica com a que o Whisper ouve mais parecida com o roteiro."""
    usado = gera_voz(cena, destino, voz, motor, pronuncia)
    if tentativas <= 1 or usado == "arquivo":
        return usado
    nota, ouvido = confere_fala(destino, cena["fala"])
    for n in range(2, tentativas + 1):
        if nota >= 0.95:
            break
        log(f"  tentativa {n - 1} ouviu {nota:.0%}: “{ouvido}”; gerando de novo")
        outra = destino.with_suffix(".outra.wav")
        gera_voz(cena, outra, voz, usado, pronuncia)
        nota2, ouvido2 = confere_fala(outra, cena["fala"])
        if nota2 > nota:
            outra.replace(destino)
            nota, ouvido = nota2, ouvido2
        else:
            outra.unlink()
    log(f"  conferida: {nota:.0%} “{ouvido}”")
    return usado


# ------------------------------------------------------------------ sincronia da boca
def envelope_boca(wav_path: Path, fps: int) -> tuple[list[float], float]:
    with wave.open(str(wav_path), "rb") as w:
        n = w.getnframes()
        taxa = w.getframerate()
        dados = w.readframes(n)
    amostras = struct.unpack(f"<{n}h", dados)
    por_frame = taxa / fps
    total = math.ceil(n / por_frame)
    rms = []
    for f in range(total):
        a = int(f * por_frame)
        b = min(n, int((f + 1) * por_frame))
        bloco = amostras[a:b]
        if not bloco:
            rms.append(0.0)
            continue
        rms.append(math.sqrt(sum(x * x for x in bloco) / len(bloco)) / 32768)
    ordenado = sorted(rms)
    ref = ordenado[int(len(ordenado) * 0.95)] if ordenado else 1
    ref = ref or 1
    boca = []
    anterior = 0.0
    for v in rms:
        x = min(1.0, v / ref)
        # expande a faixa para a boca abrir e fechar entre sílabas
        x = max(0.0, (x - 0.3) / 0.7) ** 0.9
        # suaviza: abre rápido, fecha um pouco mais devagar
        x = x if x > anterior else anterior * 0.55 + x * 0.45
        boca.append(round(x, 3))
        anterior = x
    return boca, n / taxa


# ------------------------------------------------------------------ gravação única
def le_wav(caminho: Path) -> tuple[list[int], int]:
    with wave.open(str(caminho), "rb") as w:
        n = w.getnframes()
        return list(struct.unpack(f"<{n}h", w.readframes(n))), w.getframerate()


def grava_wav(caminho: Path, amostras: list[int], taxa: int) -> None:
    with wave.open(str(caminho), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(struct.pack(f"<{len(amostras)}h", *amostras))


def divide_gravacao(arquivo: Path, n: int, pasta: Path, pausa_min: float = 0.6) -> list[Path]:
    """Corta uma gravação única em n pedaços, nas n-1 pausas mais longas.

    O autor grava o roteiro inteiro de uma vez, fazendo uma pausa de ~2 s entre as cenas.
    """
    if not arquivo.exists():
        raise SystemExit(f"Gravação não encontrada: {arquivo}")
    completo = pasta / "gravacao.wav"
    para_wav(arquivo, completo, normaliza=False)  # normalizar antes "apaga" as pausas
    amostras, taxa = le_wav(completo)
    jan = taxa // 100  # janelas de 10 ms
    db = []
    for k in range(0, len(amostras) - jan, jan):
        bloco = amostras[k : k + jan]
        rms = math.sqrt(sum(x * x for x in bloco) / jan) / 32768
        db.append(max(-90.0, 20 * math.log10(rms + 1e-9)))
    ordenado = sorted(db)
    piso = ordenado[int(len(db) * 0.10)]
    fala = ordenado[int(len(db) * 0.90)]
    # silêncio = bem abaixo do volume típico da fala (robusto a ruído de fundo)
    limiar = max(piso + 0.35 * (fala - piso), fala - 30)
    voz = [v > limiar for v in db]
    if not any(voz):
        raise SystemExit("Gravação sem voz detectável.")
    ini = voz.index(True)
    fim = len(voz) - voz[::-1].index(True)

    silencios = []  # (duração, início, fim) em janelas, só no miolo da gravação
    k = ini
    while k < fim:
        if not voz[k]:
            j = k
            while j < fim and not voz[j]:
                j += 1
            silencios.append((j - k, k, j))
            k = j
        else:
            k += 1
    longos = sorted((s for s in silencios if s[0] * 0.01 >= pausa_min), reverse=True)[: n - 1]
    if len(longos) < n - 1:
        raise SystemExit(
            f"Achei {len(longos)} pausa(s) entre cenas na gravação, mas o roteiro tem {n} cenas. "
            "Grave de novo fazendo uma pausa de uns 2 segundos entre cada cena."
        )
    cortes = sorted(s[1] + s[0] // 2 for s in longos)
    limites = [ini] + cortes + [fim]
    pedacos = []
    for i in range(n):
        a, b = limites[i], limites[i + 1]
        while a < b and not voz[a]:
            a += 1
        while b > a and not voz[b - 1]:
            b -= 1
        a = max(0, a - 8)  # 80 ms de folga
        b = min(len(voz), b + 12)
        bruto = pasta / f"gravacao-{i + 1}.bruto.wav"
        destino = pasta / f"gravacao-{i + 1}.wav"
        grava_wav(bruto, amostras[a * jan : b * jan], taxa)
        para_wav(bruto, destino)
        bruto.unlink(missing_ok=True)
        pedacos.append(destino)
        log(f"gravação: cena {i + 1} = {a / 100:.1f}s a {b / 100:.1f}s")
    completo.unlink(missing_ok=True)
    return pedacos


# ------------------------------------------------------------------ principal
def chromium() -> str | None:
    for padrao in ("/opt/pw-browsers/chromium_headless_shell-*/*/chrome-headless-shell", "/opt/pw-browsers/chromium"):
        achados = sorted(Path("/").glob(padrao.lstrip("/")))
        if achados:
            return str(achados[-1])
    return os.environ.get("REMOTION_CHROMIUM")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro")
    ap.add_argument("--avatar", default="avatar/avatar.json")
    ap.add_argument("--saida", help="arquivo .mp4 (padrão: videos/<id>.mp4)")
    ap.add_argument("--motor", help="auto | arquivo | voicestudio | elevenlabs | edge | espeak")
    ap.add_argument("--sem-render", action="store_true", help="só gera áudio e props")
    ap.add_argument("--frame", type=int, help="renderiza só este quadro como PNG (prévia)")
    ap.add_argument("--texto-gravacao", action="store_true", help="mostra o texto para o autor gravar e sai")
    ap.add_argument("--conferir", type=int, default=1, metavar="N",
                    help="voz sintética: transcreve cada fala e gera de novo (até N vezes) se não bater com o roteiro")
    args = ap.parse_args()

    roteiro = json.loads((RAIZ / args.roteiro).read_text(encoding="utf-8"))
    if args.texto_gravacao:
        print(f"Gravação: {roteiro.get('titulo', roteiro['id'])}\n(pausa de ~2 segundos entre as cenas)\n")
        for i, cena in enumerate(roteiro["cenas"], 1):
            print(f"[Cena {i}] {re.sub(r'[*_]', '', cena['fala'])}\n")
        return
    avatar = json.loads((RAIZ / args.avatar).read_text(encoding="utf-8"))
    rid = roteiro["id"]
    voz = roteiro.get("voz", {})
    motor = args.motor or voz.get("motor", "auto")
    pronuncia = voz.get("pronuncia", {})

    pasta = RAIZ / "public" / "reels" / rid
    shutil.rmtree(pasta, ignore_errors=True)
    pasta.mkdir(parents=True)

    pedacos: list[Path] = []
    if roteiro.get("audio_unico") and motor in ("auto", "arquivo"):
        pedacos = divide_gravacao(RAIZ / roteiro["audio_unico"], len(roteiro["cenas"]), pasta)

    cenas = []
    boca: list[float] = []
    usados = set()
    for i, cena in enumerate(roteiro["cenas"], 1):
        wav = pasta / f"cena-{i}.wav"
        if pedacos:
            pedacos[i - 1].rename(wav)
            usado = "gravação"
        else:
            usado = gera_voz_conferida(cena, wav, voz, motor, pronuncia, args.conferir)
        usados.add(usado)
        env, segundos = envelope_boca(wav, FPS)
        duracao = max(75, INICIO_FALA + len(env) + FIM_FALA)
        trilha = [0.0] * duracao
        for k, v in enumerate(env):
            trilha[INICIO_FALA + k] = v
        boca.extend(trilha)
        c = {k: v for k, v in cena.items() if k != "audio_arquivo"}
        c.update({"audio": f"reels/{rid}/cena-{i}.wav", "duracao": duracao, "inicioAudio": INICIO_FALA})
        cenas.append(c)
        log(f"cena {i}: {segundos:.1f}s de fala ({usado})")

    props = {
        "id": rid,
        "titulo": roteiro.get("titulo", rid),
        "assinatura": roteiro.get("assinatura"),
        "musica": roteiro.get("musica"),
        "volumeMusica": roteiro.get("volumeMusica"),
        "fps": FPS,
        "cenas": cenas,
        "boca": boca,
        "avatar": avatar,
        "tema": roteiro.get("tema", {}),
    }
    props = {k: v for k, v in props.items() if v is not None}
    (RAIZ / "out").mkdir(exist_ok=True)
    props_path = RAIZ / "out" / f"{rid}.props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    log(f"duração total: {len(boca) / FPS:.1f}s | voz: {', '.join(sorted(usados))}")
    if "espeak" in usados:
        log("AVISO: voz espeak é robótica (rascunho). Use sua gravação, ElevenLabs ou edge-tts para a versão final.")

    if args.sem_render:
        log(f"props em {props_path}")
        return

    npx = shutil.which("npx") or "npx"  # no Windows é npx.cmd
    navegador = chromium()
    extra = [f"--browser-executable={navegador}"] if navegador else []
    if args.frame is not None:
        destino = RAIZ / "out" / f"{rid}-frame{args.frame}.png"
        cmd = [npx, "remotion", "still", "src/index.ts", "Reel", str(destino), f"--props={props_path}", f"--frame={args.frame}", "--log=error", *extra]
    else:
        destino = Path(args.saida) if args.saida else RAIZ / "videos" / f"{rid}.mp4"
        destino.parent.mkdir(parents=True, exist_ok=True)
        cmd = [npx, "remotion", "render", "src/index.ts", "Reel", str(destino), f"--props={props_path}",
               "--codec=h264", "--crf=20", "--audio-bitrate=192k", "--log=error", *extra]
    log("renderizando…")
    subprocess.run(cmd, cwd=RAIZ, check=True)
    log(f"pronto: {destino}")


if __name__ == "__main__":
    main()
