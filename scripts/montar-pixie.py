"""Monta a tira da pixie do tutorial a partir dos sprites soltos.

Roda com: python3 scripts/montar-pixie.py

Cada sprite foi exportado separado, numerado pela Chloë (src/assets/pixie/NN.png).
Aqui eles entram na ordem em que ela mandou e viram uma tira horizontal, que o
GuiaPixie anima trocando a posição do fundo (steps).

Duas tiras:

- corpo: as seis poses do bote das asas (11 a 16), que tocam sem parar.
- virar: as nove poses (11 a 19) em ordem, tocadas uma vez a cada oito
  segundos para ela virar de lado. Essa tira toca de traz para frente quando
  ela vai para a direita e de frente para traz quando ela vai para a esquerda.

As imagens são normalizadas para 104x96 (o mesmo quadro de 105x96 que ela
mandou, menos 1px de largura para o passo do CSS cair em número inteiro).
"""
from PIL import Image
import os

PASTA = "src/assets/pixie"
LARG, ALT = 104, 96

# bote das asas, tocado sem parar
CORPO = [11, 12, 13, 14, 15, 16]

# as nove poses, tocadas uma vez a cada virada
VIRAR = [11, 12, 13, 14, 15, 16, 17, 18, 19]


def montar(numeros, destino):
    tira = Image.new("RGBA", (LARG * len(numeros), ALT), (0, 0, 0, 0))
    for indice, numero in enumerate(numeros):
        caminho = os.path.join(PASTA, f"{numero}.png")
        quadro = Image.open(caminho).convert("RGBA").resize((LARG, ALT), Image.LANCZOS)
        tira.alpha_composite(quadro, (indice * LARG, 0))
    tira.save(destino, optimize=True)
    print(f"{destino}: {tira.width}x{tira.height}, {len(numeros)} quadros")


if __name__ == "__main__":
    montar(CORPO, "public/tutorial/pixie-corpo.png")
    montar(VIRAR, "public/tutorial/pixie-virar.png")
