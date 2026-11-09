"""Extrai a pixie do tutorial a partir da folha de sprites (src/assets/pixie-fonte.png).

Roda com: python3 scripts/extrair-pixie.py [cor...]

A folha tem, por cor, duas faixas de fadas pequenas e uma faixa de brilhos no
fim. As fadas ficam numa grade de 26x24 e cabem inteiras no quadro, então o
recorte delas é só uma grade. Os brilhos não: cada estrela tem um tamanho e
uma altura diferentes, então eles são achados um a um e centrados no quadro.

A arte é desenhada sobre fundo preto. Para usar no desktop, o preto vira
transparência: o alfa sai da luminosidade do pixel, o que preserva o brilho
suave em volta (não sobra caixa preta).

Gera:
  public/tutorial/pixie-<cor>.png   tira horizontal com o bote das asas
  public/tutorial/pixie-brilhos.png tira horizontal com as estrelinhas
"""
from PIL import Image
import numpy as np
import sys
from scipy import ndimage

FONTE = "src/assets/pixie-fonte.png"

# Fadas: grade de 26x24, três quadros do bote (o quarto é igual ao primeiro).
LARG, ALT = 26, 24
QUADROS = 3
FAIXAS = {"dourada": 22, "verde": 119, "azul": 220}

# Brilhos: a última faixa da folha.
BRILHOS_Y0, BRILHOS_Y1 = 290, 381
# As estrelas da última faixa se encostam e têm tamanhos diferentes: não dá
# para separar em quadros sem cortar umas nas outras. Então a faixa inteira
# vira um rastro só, que pisca atrás da pixie.
BRILHOS_LIMIAR = 40
BRILHO_PISO, BRILHO_TETO = 55, 132
BRILHO_JANELA = 300       # quantos px da faixa viram o rastro

# Abaixo disso é fundo; acima do teto é opaco. No meio, o alfa acompanha.
# A faixa das fadas tem fundo preto; a dos brilhos vem com uma névoa clara em
# volta, então lá o piso é mais alto para a névoa não virar bloco.
PISO, TETO = 8, 48
BRILHO_PISO, BRILHO_TETO = 88, 150


def alfa_do_brilho(r, g, b, piso=PISO, teto=TETO):
    brilho = max(r, g, b)
    if brilho <= piso:
        return 0
    return round(min(1.0, (brilho - piso) / (teto - piso)) * 255)


def tira_da_cor(imagem, cor):
    y0 = FAIXAS[cor]
    tira = Image.new("RGBA", (LARG * QUADROS, ALT), (0, 0, 0, 0))
    origem = imagem.convert("RGB")
    for indice in range(QUADROS):
        quadro = origem.crop((indice * LARG, y0, (indice + 1) * LARG, y0 + ALT))
        for y in range(ALT):
            for x in range(LARG):
                r, g, b = quadro.getpixel((x, y))
                tira.putpixel((indice * LARG + x, y), (r, g, b, alfa_do_brilho(r, g, b)))
    return tira


def tira_dos_brilhos(imagem):
    """A faixa dos brilhos inteira, com o fundo virando transparência."""
    cinza = np.asarray(imagem.convert("L"), dtype=np.float32)
    faixa = cinza[BRILHOS_Y0:BRILHOS_Y1]
    colunas = np.where((faixa > BRILHOS_LIMIAR).sum(axis=0) > 0)[0]
    if len(colunas) == 0:
        print("faixa dos brilhos vazia")
        return None

    # uma janela com estrelas graúdas, não a faixa inteira (senão vira borrão)
    x0 = int(colunas.min()) + 40
    x1 = min(int(colunas.max()) + 1, x0 + BRILHO_JANELA)
    recorte = imagem.convert("RGB").crop((x0, BRILHOS_Y0, x1, BRILHOS_Y1))
    largura, altura = recorte.size
    tira = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
    for y in range(altura):
        for x in range(largura):
            r, g, b = recorte.getpixel((x, y))
            tira.putpixel(
                (x, y),
                (r, g, b, alfa_do_brilho(r, g, b, BRILHO_PISO, BRILHO_TETO)),
            )

    tira.save("public/tutorial/pixie-brilhos.png")
    print(f"public/tutorial/pixie-brilhos.png: {tira.width}x{tira.height}")
    return tira.size


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
    tira_dos_brilhos(imagem)


if __name__ == "__main__":
    main()
