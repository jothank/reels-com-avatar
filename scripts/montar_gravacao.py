#!/usr/bin/env python3
"""Monta a narração de um reel a partir das gravações do autor (com várias tentativas).

1. Transcreve os áudios (faster-whisper, offline depois de baixar o modelo).
2. Para cada cena do roteiro, acha o trecho falado mais parecido com a "fala".
   Se houver várias tentativas boas, usa a ÚLTIMA (normalmente a que deu certo).
3. Corta os trechos, normaliza o volume e grava gravacoes/<id>/cena-N.wav.
4. Atualiza o roteiro com "audio_arquivo" em cada cena.

Uso:
  python3 scripts/montar_gravacao.py roteiros/o-que-e-api.json gravacoes/o-que-e-api/*.opus
  python3 scripts/montar_gravacao.py roteiros/x.json a.opus b.opus --modelo medium
  python3 scripts/montar_gravacao.py roteiros/x.json a.opus --so-transcrever

Os áudios são lidos na ordem dada (use nomes que ordenem certo, ex.: WA0006, WA0007…).
O primeiro uso baixa o modelo do Hugging Face (precisa de acesso a huggingface.co).
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_reel import RAIZ, grava_wav, le_wav, log, para_wav  # noqa: E402

Palavra = dict  # {"w": str, "n": str (normalizada), "ini": float, "fim": float, "arq": int}


# ------------------------------------------------------------------ texto
def normaliza(p: str) -> str:
    p = unicodedata.normalize("NFKD", p.lower())
    p = "".join(c for c in p if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", p)


def palavras_do_texto(t: str) -> list[str]:
    t = re.sub(r"[*_]", "", t)
    return [n for n in (normaliza(x) for x in t.split()) if n]


# ------------------------------------------------------------------ transcrição
def transcreve(audio: Path, modelo: str, dica: str) -> list[dict]:
    # modelo pode ser um nome (small, medium…) ou uma pasta com um modelo CTranslate2
    cache = RAIZ / "out" / "transcricoes" / f"{audio.stem}.{Path(modelo).name}.json"
    if cache.exists() and cache.stat().st_mtime >= audio.stat().st_mtime:
        return json.loads(cache.read_text(encoding="utf-8"))
    from faster_whisper import WhisperModel  # import tardio: só quando precisa

    log(f"transcrevendo {audio.name} (modelo {modelo})…")
    try:
        m = WhisperModel(modelo, device="cpu", compute_type="int8")
    except Exception as e:  # noqa: BLE001
        raise SystemExit(
            f"Não consegui baixar o modelo '{modelo}' do Hugging Face ({type(e).__name__}). "
            "Libere huggingface.co, hf.co e *.hf.co no acesso de rede do ambiente, ou rode "
            "scripts/baixar_whisper_npm.py e use --modelo modelos/whisper-small."
        ) from None
    # decodifica com o ffmpeg (16 kHz mono) em vez do PyAV, que varia de versão para versão
    import numpy as np

    pcm = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", str(audio), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    amostras = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    segs, _ = m.transcribe(
        amostras, language="pt", word_timestamps=True, vad_filter=True,
        initial_prompt=dica[:800], condition_on_previous_text=False,
    )
    out = []
    for s in segs:
        for w in s.words or []:
            out.append({"w": w.word.strip(), "ini": round(w.start, 3), "fim": round(w.end, 3)})
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


# ------------------------------------------------------------------ busca das tentativas
def candidatos(alvo: list[str], fluxo: list[Palavra], limiar: float) -> list[tuple[float, int, int]]:
    """Janelas (score, i, j) do fluxo parecidas com o alvo, sem sobreposição."""
    m = len(alvo)
    if not m:
        return []
    conj = set(alvo)
    achados = []
    for i in range(len(fluxo)):
        melhor = None
        for tam in range(max(1, int(m * 0.6)), int(m * 1.4) + 2):
            j = i + tam
            if j > len(fluxo) or fluxo[j - 1]["arq"] != fluxo[i]["arq"]:
                break
            janela = [p["n"] for p in fluxo[i:j]]
            if len(conj & set(janela)) < 0.5 * len(conj):
                continue
            s = SequenceMatcher(None, alvo, janela, autojunk=False).ratio()
            if melhor is None or s > melhor[0]:
                melhor = (s, i, j)
        if melhor and melhor[0] >= limiar:
            achados.append(melhor)
    # supressão de não-máximos: fica com a melhor janela de cada região
    achados.sort(reverse=True)
    escolhidos: list[tuple[float, int, int]] = []
    for s, i, j in achados:
        if all(j <= a or i >= b for _, a, b in escolhidos):
            escolhidos.append((s, i, j))
    return sorted(escolhidos, key=lambda x: x[1])


def escolhe(cands: list[tuple[float, int, int]], tolerancia: float) -> tuple[float, int, int] | None:
    if not cands:
        return None
    topo = max(c[0] for c in cands)
    bons = [c for c in cands if c[0] >= topo - tolerancia]
    return bons[-1]  # a última tentativa boa


# ------------------------------------------------------------------ corte
def apara(amostras: list[int], taxa: int) -> list[int]:
    """Tira silêncio do começo e do fim (deixa ~80 ms de folga)."""
    jan = taxa // 100
    db = []
    for k in range(0, max(0, len(amostras) - jan), jan):
        b = amostras[k : k + jan]
        db.append(20 * math.log10(math.sqrt(sum(x * x for x in b) / jan) / 32768 + 1e-9))
    if not db:
        return amostras
    fala = sorted(db)[int(len(db) * 0.9)]
    voz = [v > fala - 28 for v in db]
    if not any(voz):
        return amostras
    a = max(0, voz.index(True) - 8)
    b = min(len(voz), len(voz) - voz[::-1].index(True) + 12)
    return amostras[a * jan : b * jan]


def corta(origem: Path, ini: float, fim: float, destino: Path) -> float:
    bruto = destino.with_suffix(".bruto.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ini:.3f}", "-to", f"{fim:.3f}", "-i", str(origem),
         "-ac", "1", "-ar", "48000", "-sample_fmt", "s16", str(bruto)],
        check=True,
    )
    amostras, taxa = le_wav(bruto)
    grava_wav(bruto, apara(amostras, taxa), taxa)
    para_wav(bruto, destino)
    bruto.unlink(missing_ok=True)
    return len(le_wav(destino)[0]) / 48000


# ------------------------------------------------------------------ principal
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro")
    ap.add_argument("audios", nargs="+")
    ap.add_argument("--modelo", default="small", help="tiny | base | small | medium, ou pasta de um modelo CTranslate2 (padrão: small)")
    ap.add_argument("--limiar", type=float, default=0.6, help="semelhança mínima com a fala (0–1)")
    ap.add_argument("--tolerancia", type=float, default=0.08, help="quão pior que a melhor uma tentativa mais recente pode ser")
    ap.add_argument("--so-transcrever", action="store_true")
    args = ap.parse_args()

    caminho_roteiro = RAIZ / args.roteiro
    roteiro = json.loads(caminho_roteiro.read_text(encoding="utf-8"))
    rid = roteiro["id"]
    audios = [Path(a) if Path(a).is_absolute() else RAIZ / a for a in args.audios]
    dica = " ".join(re.sub(r"[*_]", "", c["fala"]) for c in roteiro["cenas"])

    fluxo: list[Palavra] = []
    for k, audio in enumerate(audios):
        ws = transcreve(audio, args.modelo, dica)
        print(f"\n--- {audio.name} ---\n" + " ".join(w["w"] for w in ws))
        for w in ws:
            n = normaliza(w["w"])
            if n:
                fluxo.append({**w, "n": n, "arq": k})
    if args.so_transcrever:
        return

    pasta = RAIZ / "gravacoes" / rid
    pasta.mkdir(parents=True, exist_ok=True)
    faltando = []
    print()
    for idx, cena in enumerate(roteiro["cenas"], 1):
        alvo = palavras_do_texto(cena["fala"])
        cands = candidatos(alvo, fluxo, args.limiar)
        esc = escolhe(cands, args.tolerancia)
        if not esc:
            faltando.append(idx)
            log(f"cena {idx}: NÃO encontrei uma tentativa parecida com: {cena['fala'][:60]}…")
            continue
        s, i, j = esc
        arq = fluxo[i]["arq"]
        ini = fluxo[i]["ini"] - 0.15
        fim = fluxo[j - 1]["fim"] + 0.3
        if i > 0 and fluxo[i - 1]["arq"] == arq:
            ini = max(ini, fluxo[i - 1]["fim"])
        if j < len(fluxo) and fluxo[j]["arq"] == arq:
            fim = min(fim, fluxo[j]["ini"])
        destino = pasta / f"cena-{idx}.wav"
        dur = corta(audios[arq], max(0.0, ini), fim, destino)
        cena["audio_arquivo"] = str(destino.relative_to(RAIZ))
        texto = " ".join(p["w"] for p in fluxo[i:j])
        log(
            f"cena {idx}: {audios[arq].name} {ini:.1f}–{fim:.1f}s ({dur:.1f}s), semelhança {s:.0%}, "
            f"{len(cands)} tentativa(s) achada(s)\n        \"{texto}\""
        )

    if faltando:
        raise SystemExit(f"Faltou achar a(s) cena(s) {faltando}. Regrave só essas ou baixe --limiar.")
    roteiro.pop("audio_unico", None)
    caminho_roteiro.write_text(json.dumps(roteiro, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"roteiro atualizado: {args.roteiro} (agora rode build_reel.py)")


if __name__ == "__main__":
    main()
