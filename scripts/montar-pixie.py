"""Monta a tira da pixie do tutorial a partir dos sprites soltos.

Roda com: python3 scripts/montar-pixie.py

Cada sprite foi exportado separado, numerado pela Chloë (src/assets/pixie/NN.png).
Aqui eles entram na ordem em que ela mandou e viram uma tira horizontal, que o
GuiaPixie anima trocando a posição do fundo (steps).

Só o bote das asas, e só as poses em que ela está DE FRENTE: das nove que ela
mandou, as outras seis mostram a pixie de costas e davam a impressão de ela
ficar virando. A pixie do tutorial não gira: só bate as asas e sobe e desce.

As imagens são normalizadas para 104x96 (o mesmo quadro de 105x96 que ela
mandou, menos 1px de largura para o passo do CSS cair em número inteiro).
"""
from PIL import Image
import os

PASTA = "src/assets/pixie"
LARG, ALT = 104, 96

# só as poses de frente: 17, 18 e 19 são as únicas com a luz na cara dela
CORPO = [17, 18, 19]


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
