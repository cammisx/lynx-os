"""Monta as tiras da pixie do tutorial a partir dos sprites soltos.

Roda com: python3 scripts/montar-pixie.py

Cada sprite foi exportado separado, numerado pela Chloë (src/assets/pixie/NN.png).
Aqui eles entram na ordem em que ela mandou e viram uma tira horizontal, que o
GuiaPixie anima trocando a posição do fundo (steps).

- corpo: os quadros do bote das asas, um atrás do outro.
- giro: as poses da pirueta (por enquanto a mesma tira do corpo).

Todas as imagens são normalizadas para 104x96 (o mesmo quadro de 105x96 que
ela mandou, menos 1px de largura para o passo do CSS cair em número inteiro).
"""
from PIL import Image
import os

PASTA = "src/assets/pixie"
LARG, ALT = 104, 96

# ordem dos quadros do bote das asas
CORPO = [11, 12, 13, 14, 15, 16, 17, 18, 19]
# ordem das poses da pirueta (ainda não chegaram: usa o corpo)
GIRO = [11, 12, 13, 14, 15, 16, 17, 18, 19]


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
    montar(GIRO, "public/tutorial/pixie-giro.png")
