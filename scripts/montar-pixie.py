"""Monta as duas tiras da pixie do tutorial, quadro a quadro.

Roda com: python3 scripts/montar-pixie.py

Os quadros ficam soltos em src/assets/pixie/quadros, no tamanho alto (4x da
folha), e daqui saem as tiras que o GuiaPixie anima trocando a posicao do
fundo (steps):

  voo-01..26   o bote das asas: 26 quadros que fecham o ciclo (o 26 emenda
               no 1 sem pulo). E a fileira do perfil da folha, do quadro 1
               ao 26: dali para a frente a folha muda de animacao e a tinta
               do desenho salta, por isso para no 26.
  giro-01..04  as quatro poses da pirueta.

Toda tira sai com 104x96 por quadro, que o tutorial exibe a 0,75 (78x72).
"""
from PIL import Image
import glob
import os

PASTA = "src/assets/pixie/quadros"
SAIDA = "public/tutorial"
LARG, ALT = 104, 96


def montar(arquivos, destino, encaixar=False):
    """Junta os quadros lado a lado. Com encaixar, a pose nao e esticada:
    fica centralizada embaixo, que e o certo para as poses do giro."""
    tira = Image.new("RGBA", (LARG * len(arquivos), ALT), (0, 0, 0, 0))
    for indice, caminho in enumerate(arquivos):
        quadro = Image.open(caminho).convert("RGBA")
        if encaixar:
            escala = min(LARG / quadro.width, ALT / quadro.height)
            desenho = quadro.resize(
                (max(1, round(quadro.width * escala)), max(1, round(quadro.height * escala))),
                Image.LANCZOS,
            )
            quadro = Image.new("RGBA", (LARG, ALT), (0, 0, 0, 0))
            quadro.alpha_composite(desenho, ((LARG - desenho.width) // 2, ALT - desenho.height))
        else:
            quadro = quadro.resize((LARG, ALT), Image.LANCZOS)
        tira.alpha_composite(quadro, (indice * LARG, 0))
    tira.save(destino, optimize=True)
    print(f"{destino}: {tira.width}x{tira.height}, {len(arquivos)} quadros")


if __name__ == "__main__":
    voo = sorted(glob.glob(os.path.join(PASTA, "voo-*.png")))
    giro = sorted(glob.glob(os.path.join(PASTA, "giro-*.png")))
    montar(voo, os.path.join(SAIDA, "pixie-corpo.png"))
    montar(giro, os.path.join(SAIDA, "pixie-giro.png"), encaixar=True)
