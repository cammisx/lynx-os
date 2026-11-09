"""Extrai a pixie do tutorial a partir da folha de sprites (src/assets/pixie-fonte.png).

Roda com: python3 scripts/extrair-pixie.py

A folha tem, por cor, duas faixas de fadas pequenas (uma de frente e uma de
perfil) e uma faixa de brilhos. Cada quadro tem 26x24 pixels e a fada fica
inteira dentro do quadro, então o recorte é só uma grade — sem adivinhação.

A fada é desenhada sobre fundo preto. Para usar no desktop, o preto vira
transparência: o alfa sai da luminosidade do pixel, o que preserva o brilho
suave em volta dela (não fica com a caixa preta em volta).

Abaixo da faixa de frente existe uma segunda fileira com a fada em outras
poses: é a pirueta que ela dá de vez em quando.

Gera:
  public/tutorial/pixie-<cor>.png      tira com o bote das asas
  public/tutorial/pixie-giro-<cor>.png tira com as poses da pirueta
"""
from PIL import Image
import numpy as np
import sys
from scipy import ndimage

FONTE = "src/assets/pixie-fonte.png"
LARG, ALT = 26, 24
QUADROS = 3  # o bote das asas: 0, 1, 2 (o 3 é igual ao 0)

# y do topo da faixa de frente de cada cor na folha.
FAIXAS = {"dourada": 22, "verde": 119, "azul": 220}

# Abaixo disso é fundo; acima do teto é opaco. No meio, o alfa acompanha.
PISO, TETO = 8, 48

# A fileira da pirueta vem com uma névoa clara em volta, então o piso é mais
# alto para a névoa não virar bloco.
# ... e ficam 27px abaixo do topo da fileira de frente.
GIRO_Y0, GIRO_Y1 = 27, 55
GIRO_CELULAS = 5         # quantas células a fileira ocupa
GIRO_PISO, GIRO_TETO = 70, 140


def tira_da_cor(imagem, cor):
    y0 = FAIXAS[cor]
    tira = Image.new("RGBA", (LARG * QUADROS, ALT), (0, 0, 0, 0))
    origem = imagem.convert("RGB")
    for indice in range(QUADROS):
        quadro = origem.crop((indice * LARG, y0, (indice + 1) * LARG, y0 + ALT))
        for y in range(ALT):
            for x in range(LARG):
                r, g, b = quadro.getpixel((x, y))
                brilho = max(r, g, b)
                alfa = 0.0 if brilho <= PISO else min(1.0, (brilho - PISO) / (TETO - PISO))
                tira.putpixel((indice * LARG + x, y), (r, g, b, round(alfa * 255)))
    return tira


def tira_dos_giros(imagem, cor):
    """As poses da segunda fileira, na mesma grade de 26x24 da primeira.

    São as poses da fada virando (de frente, de lado, de costas): é a pirueta
    que ela dá de vez em quando. Célula vazia é descartada, para a tira ficar
    só com poses de verdade.
    """
    y0 = FAIXAS[cor] + GIRO_Y0
    origem = imagem.convert("RGB")
    quadros = []
    for indice in range(GIRO_CELULAS):
        celula = origem.crop((indice * LARG, y0, (indice + 1) * LARG, y0 + ALT))
        alpha = Image.new("L", (LARG, ALT), 0)
        tem_algo = False
        for y in range(ALT):
            for x in range(LARG):
                r, g, b = celula.getpixel((x, y))
                brilho = max(r, g, b)
                if brilho <= GIRO_PISO:
                    continue
                alfa = round(min(1.0, (brilho - GIRO_PISO) / (GIRO_TETO - GIRO_PISO)) * 255)
                alpha.putpixel((x, y), alfa)
                if alfa > 40:
                    tem_algo = True
        if tem_algo:
            quadro = celula.convert("RGBA")
            quadro.putalpha(alpha)
            quadros.append(quadro)

    if not quadros:
        print(f"nenhuma pose de giro em {cor}")
        return 0

    tira = Image.new("RGBA", (LARG * len(quadros), ALT), (0, 0, 0, 0))
    for indice, quadro in enumerate(quadros):
        tira.paste(quadro, (indice * LARG, 0))

    destino = f"public/tutorial/pixie-giro-{cor}.png"
    tira.save(destino)
    print(f"{destino}: {tira.width}x{tira.height}, {len(quadros)} poses")
    return len(quadros)


def main():
    imagem = Image.open(FONTE)
    cores = sys.argv[1:] or list(FAIXAS)
    for cor in cores:
        if cor not in FAIXAS:
            print(f"cor desconhecida: {cor} (use {', '.join(FAIXAS)})")
            continue
        tira = tira_da_cor(imagem, cor)
        destino = f"public/tutorial/pixie-{cor}.png"
        tira.save(destino)
        print(f"{destino}: {tira.width}x{tira.height}, {QUADROS} quadros")
        tira_dos_giros(imagem, cor)


if __name__ == "__main__":
    main()
