#!/usr/bin/env python3
"""Baixa o Whisper small (CTranslate2 int8) pelo npm, para quando o huggingface.co está bloqueado.

Os pesos estão publicados em 4 pacotes (@skillninja/shortmovie-telop-model-p0..p3, licença MIT
da OpenAI). O script baixa os .tgz com `npm pack --ignore-scripts` (nada do pacote é executado),
junta model.bin e confere o SHA-256 publicado. Resultado em modelos/whisper-small/.

Uso:
  python3 scripts/baixar_whisper_npm.py
  python3 scripts/montar_gravacao.py roteiros/x.json gravacoes/x/*.opus --modelo modelos/whisper-small
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "modelos" / "whisper-small"
PACOTE = "@skillninja/shortmovie-telop-model-p{}@1.0.0"
EXTRAS = ["config.json", "preprocessor_config.json", "tokenizer.json", "vocabulary.json"]


def main() -> None:
    if (DESTINO / "model.bin").exists():
        print(f"já existe: {DESTINO}")
        return
    npm = shutil.which("npm") or "npm"
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        partes = []
        for i in range(4):
            subprocess.run([npm, "pack", "--silent", "--ignore-scripts", PACOTE.format(i)], cwd=t, check=True)
            tgz = next(t.glob(f"*-p{i}-*.tgz"))
            pasta = t / f"p{i}"
            with tarfile.open(tgz) as tf:
                tf.extractall(pasta, filter="data")
            partes.append(pasta / "package" / f"model.bin.part{i}")
            if i == 0:
                base = pasta / "package"
        DESTINO.mkdir(parents=True, exist_ok=True)
        h = hashlib.sha256()
        with open(DESTINO / "model.bin", "wb") as out:
            for p in partes:
                dados = p.read_bytes()
                h.update(dados)
                out.write(dados)
        esperado = (base / "model.sha256").read_text().split()[0]
        if h.hexdigest() != esperado:
            shutil.rmtree(DESTINO)
            raise SystemExit("SHA-256 não confere; modelo descartado.")
        for f in EXTRAS:
            shutil.copy(base / f, DESTINO / f)
    print(f"ok: {DESTINO}")


if __name__ == "__main__":
    main()
