#!/usr/bin/env python3
"""Cria no VoiceStudio um perfil com a voz clonada do autor, a partir de áudios dele.

Escolhe automaticamente o trecho mais limpo de ~12 s (muita fala, poucas pausas), cortado entre
pausas e com silêncio nas pontas, salva em out/voz-referencia.wav e cria o perfil via API local
do VoiceStudio (POST /profiles), que transcreve o trecho; se já existe um perfil com esse nome,
troca só o áudio dele (PUT /profiles/{id}/audio). O VoiceStudio precisa estar aberto no mesmo
computador (http://localhost:3900).

Uso:
  python scripts/clonar_voz_voicestudio.py C:/Users/eu/Downloads/PTT-*.opus --nome SeuNome --idioma pt
  python scripts/clonar_voz_voicestudio.py audio.opus --nome SeuNome --inicio 30 --fim 42 \
      --texto-ref "o que você fala nesse trecho" --idioma pt

Depois, no roteiro: "voz": {"voz_voicestudio": "Jonathan", ...} e rode build_reel.py.
Use só áudios em que É VOCÊ falando, sem música nem outras vozes.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_reel import RAIZ, grava_wav, le_wav, log  # noqa: E402

TAXA = 24000


def decodifica(audio: Path) -> list[int]:
    tmp = RAIZ / "out" / f"_ref_{audio.stem}.wav"
    tmp.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(audio), "-ac", "1", "-ar", str(TAXA),
                    "-sample_fmt", "s16", str(tmp)], check=True)
    amostras, _ = le_wav(tmp)
    tmp.unlink(missing_ok=True)
    return amostras


def energia(amostras: list[int]) -> list[float]:
    """dB em janelas de 10 ms."""
    jan = TAXA // 100
    return [max(-90.0, 20 * math.log10(math.sqrt(sum(x * x for x in amostras[k:k + jan]) / jan) / 32768 + 1e-9))
            for k in range(0, len(amostras) - jan, jan)]


def pausas(db: list[float], minimo: int = 15) -> list[tuple[int, int]]:
    """Trechos de pelo menos `minimo` janelas (150 ms) sem fala.

    Uma janela baixa sozinha pode ser o meio de uma palavra (o "p" de "pra"); se a referência
    acabar ali, o VoxCPM2 termina a palavra no começo de cada fala gerada e sai um ruído.
    """
    fala = sorted(db)[int(len(db) * 0.9)]
    voz = [v > fala - 25 for v in db] + [True]
    achadas, ini = [], None
    for k, v in enumerate(voz):
        if not v and ini is None:
            ini = k
        elif v and ini is not None:
            if k - ini >= minimo:
                achadas.append((ini, k))
            ini = None
    return achadas


def melhor_trecho(amostras: list[int], alvo: float) -> tuple[float, int, int]:
    """(nota, início, fim) em janelas de 10 ms; começa logo depois de uma pausa e termina numa pausa."""
    db = energia(amostras)
    if len(db) < 300:
        return (0.0, 0, len(db))
    fala = sorted(db)[int(len(db) * 0.9)]
    voz = [v > fala - 25 for v in db]
    satura = [v > -1.0 for v in db]  # clipping
    p = pausas(db)
    melhor = (0.0, 0, 0)
    for a in p:
        for b in p:
            i, j = a[1], b[0]
            if not alvo * 70 <= j - i <= alvo * 130:
                continue
            nota = sum(voz[i:j]) / (j - i) - 3 * sum(satura[i:j]) / (j - i)
            if nota > melhor[0]:
                melhor = (nota, i, j)
    return melhor


def na_pausa(amostras: list[int], inicio: float, fim: float) -> tuple[int, int]:
    """Leva --inicio/--fim (s) para a pausa mais próxima: (início, fim) em janelas de 10 ms."""
    p = pausas(energia(amostras))
    if not p:
        raise SystemExit("Não achei pausas nesse áudio; escolha outro trecho.")
    i = min((b for _, b in p), key=lambda b: abs(b - inicio * 100))
    j = min((a for a, _ in p if a > i), key=lambda a: abs(a - fim * 100), default=None)
    if j is None:
        raise SystemExit("Não achei uma pausa depois do início escolhido; aumente --fim.")
    return i, j


def multipart(campos: dict[str, str], arquivo: tuple[str, str, bytes]) -> tuple[bytes, str]:
    b = uuid.uuid4().hex
    partes = []
    for k, v in campos.items():
        partes.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    nome_campo, nome_arq, dados = arquivo
    partes.append(
        f'--{b}\r\nContent-Disposition: form-data; name="{nome_campo}"; filename="{nome_arq}"\r\n'
        f"Content-Type: audio/wav\r\n\r\n".encode() + dados + b"\r\n"
    )
    partes.append(f"--{b}--\r\n".encode())
    return b"".join(partes), f"multipart/form-data; boundary={b}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audios", nargs="+")
    ap.add_argument("--nome", required=True, help='nome do perfil; no roteiro: "voz_voicestudio": "<nome>"')
    ap.add_argument("--segundos", type=float, default=12.0, help="duração do trecho de referência (5–15 s)")
    ap.add_argument("--inicio", type=float, help="força o início do trecho (s), no primeiro áudio")
    ap.add_argument("--fim", type=float, help="força o fim do trecho (s), no primeiro áudio")
    ap.add_argument("--texto-ref", default="", help="o que é dito no trecho (sem isso, o VoiceStudio transcreve)")
    ap.add_argument("--idioma", default="Auto", help="idioma do perfil (ex.: pt)")
    ap.add_argument("--url", default=os.environ.get("VOICESTUDIO_URL", "http://localhost:3900"))
    ap.add_argument("--so-recortar", action="store_true", help="só salva out/voz-referencia.wav")
    args = ap.parse_args()

    jan = TAXA // 100
    if args.inicio is not None and args.fim is not None:
        amostras = decodifica(Path(args.audios[0]))
        i, j = na_pausa(amostras, args.inicio, args.fim)
        nome = Path(args.audios[0]).name
        origem = f"{nome} {i / 100:.1f}–{j / 100:.1f}s"
    else:
        melhor = None
        for a in args.audios:
            amostras = decodifica(Path(a))
            nota, i, j = melhor_trecho(amostras, args.segundos)
            if melhor is None or nota > melhor[0]:
                melhor = (nota, amostras, i, j, Path(a).name)
        nota, amostras, i, j, nome = melhor
        if j <= i:
            raise SystemExit("Não achei um trecho entre pausas; mande áudios mais longos ou use --inicio/--fim.")
        origem = f"{nome} {i / 100:.1f}–{j / 100:.1f}s (fala em {nota:.0%} do trecho)"
    trecho = amostras[max(0, (i - 5) * jan):(j + 5) * jan]  # 50 ms da pausa de cada lado

    pico = max(1, max(abs(x) for x in trecho))
    if pico > 29000:  # deixa ~1 dB de folga: áudio do WhatsApp costuma vir no talo
        trecho = [int(x * 29000 / pico) for x in trecho]
    rampa = TAXA // 100
    for k in range(rampa):  # 10 ms de fade nas pontas, sem estalo
        trecho[k] = trecho[k] * k // rampa
        trecho[-1 - k] = trecho[-1 - k] * k // rampa
    trecho = [0] * (TAXA * 15 // 100) + trecho + [0] * (TAXA * 35 // 100)  # silêncio antes e depois
    ref = RAIZ / "out" / "voz-referencia.wav"
    grava_wav(ref, trecho, TAXA)
    log(f"trecho de referência: {origem} → {ref} ({len(trecho) / TAXA:.1f}s)")
    if args.so_recortar:
        return

    # Sem --texto-ref, o próprio VoiceStudio transcreve o trecho. Nos testes isso saiu melhor que mandar
    # a transcrição do faster-whisper: com o small o VoxCPM2 pulava a 1ª palavra, com o turbo inventava lixo.
    base = args.url.rstrip("/")
    campos = {"ref_text": args.texto_ref, "language": args.idioma}
    try:
        with urllib.request.urlopen(f"{base}/profiles", timeout=10) as r:
            existente = next((p for p in json.loads(r.read()) if p.get("name") == args.nome), None)
        if existente:  # troca só o áudio: o roteiro continua usando o mesmo nome
            corpo, tipo = multipart(campos, ("ref_audio", "voz-referencia.wav", ref.read_bytes()))
            req = urllib.request.Request(f"{base}/profiles/{existente['id']}/audio", data=corpo,
                                         headers={"Content-Type": tipo}, method="PUT")
        else:
            corpo, tipo = multipart({"name": args.nome, "kind": "clone", **campos},
                                    ("ref_audio", "voz-referencia.wav", ref.read_bytes()))
            req = urllib.request.Request(f"{base}/profiles", data=corpo, headers={"Content-Type": tipo})
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.loads(r.read() or b"{}")
    except Exception as e:  # noqa: BLE001
        raise SystemExit(f"Não consegui falar com o VoiceStudio em {args.url} ({e}). Ele está aberto?") from None
    acao = "atualizado" if existente else "criado"
    log(f"perfil {acao}: {resp.get('name', args.nome)} (id {resp.get('id', existente['id'] if existente else '?')})")
    log(f'no roteiro use: "voz": {{"voz_voicestudio": "{args.nome}"}}')


if __name__ == "__main__":
    main()
