"""Monta as tiras da pixie do tutorial a partir dos quadros soltos.

Roda com: python3 scripts/montar-pixie.py

Os quadros em src/assets/pixie/quadros (1.png a 9.png) vieram dos nove SVGs que
a Chloë mandou, recortados da fileira de frente da folha em 4x e alinhados por
correlação com o quadro anterior, cada um centralizado num quadro de 120x96.
Como o quadro já vem igual e alinhado, aqui só empilhamos lado a lado.

Duas tiras:

- corpo: as seis poses do bote das asas (1 a 6), que tocam sem parar.
- virar: as nove poses (1 a 9) em ordem, tocadas uma vez a cada oito
  segundos para ela virar de lado. Essa tira toca de trás para frente quando
  ela vai para a direita e de frente para trás quando ela vai para a esquerda.

As tiras saem em src/assets/pixie/tiras, e não em public: o Vite renomeia o
arquivo com o hash do conteúdo, então o navegador nunca fica com uma tira velha
em cache e um quadro a mais ou a menos no CSS.
"""
from PIL import Image
import os

PASTA = "src/assets/pixie/quadros"
SAIDA = "src/assets/pixie/tiras"

# bote das asas, tocado sem parar
CORPO = [1, 2, 3, 4, 5, 6]

# as nove poses, tocadas uma vez a cada virada
VIRAR = [1, 2, 3, 4, 5, 6, 7, 8, 9]


def montar(numeros, destino):
    quadros = [Image.open(os.path.join(PASTA, f"{n}.png")).convert("RGBA") for n in numeros]
    larg, alt = quadros[0].size
    tira = Image.new("RGBA", (larg * len(quadros), alt), (0, 0, 0, 0))
    for indice, quadro in enumerate(quadros):
        if quadro.size != (larg, alt):
            quadro = quadro.resize((larg, alt), Image.LANCZOS)
        tira.alpha_composite(quadro, (indice * larg, 0))
    tira.save(destino, optimize=True)
    print(f"{destino}: {tira.width}x{tira.height}, {len(quadros)} quadros de {larg}x{alt}")


if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    montar(CORPO, f"{SAIDA}/pixie-corpo.png")
    montar(VIRAR, f"{SAIDA}/pixie-virar.png")
