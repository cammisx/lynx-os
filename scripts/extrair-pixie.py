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
# A fada é desenhada com halo: piso baixo mantém o brilho em volta dela.
PISO, TETO = 8, 48

# A fileira da pirueta vem com uma névoa clara em volta, então o piso é mais
# alto para a névoa não virar bloco.
# ... e ficam 27px abaixo do topo da fileira de frente.
GIRO_Y0, GIRO_Y1 = 27, 55
GIRO_QUANTOS = 4         # poses que entram na pirueta
GIRO_LIMIAR = 100        # onde a pose começa, para achá-la na fileira
GIRO_MIN_AREA = 40
GIRO_LADO = 34           # quadro com folga, para a pose não bater na borda
GIRO_ALT = 28
GIRO_PISO, GIRO_TETO = 8, 48
GIRO_BORDA = 4            # px em que a borda do quadro se apaga (mata a caixa)


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


def esmaecer(x, y):
    """Apaga o que encosta na borda do quadro, para o halo não virar caixa."""
    distancia = min(x, y, GIRO_LADO - 1 - x, GIRO_ALT - 1 - y)
    if distancia >= GIRO_BORDA:
        return 1.0
    return distancia / GIRO_BORDA


def tira_dos_giros(imagem, cor):
    """As poses da segunda fileira, uma a uma.

    Elas NÃO estão na grade de 26px da primeira fileira: ficam a cada ~19px e
    cada uma tem um tamanho. Cortar na grade fatiava as poses no meio, então
    aqui elas são separadas pelo perfil de colunas (onde tem desenho e onde
    tem vão) e cada uma é recortada em volta de si, centrada num quadro
    quadrado — é a pirueta que ela dá de vez em quando.
    """
    y0 = FAIXAS[cor] + GIRO_Y0
    origem = imagem.convert("RGB")
    cinza = np.asarray(imagem.convert("L"), dtype=np.float32)[y0:y0 + ALT]
    forte = cinza > GIRO_LIMIAR

    perfil = forte.sum(axis=0)
    blocos = []
    inicio = None
    for x, quantidade in enumerate(perfil):
        if quantidade > 0:
            if inicio is None:
                inicio = x
            fim_bloco = x
        elif inicio is not None:
            blocos.append((inicio, fim_bloco))
            inicio = None
    if inicio is not None:
        blocos.append((inicio, fim_bloco))

    # poeira solta ao lado de uma pose entra na pose vizinha
    juntos = []
    for bloco in blocos:
        if juntos and bloco[0] - juntos[-1][1] <= 1:
            juntos[-1] = (juntos[-1][0], bloco[1])
        else:
            juntos.append(bloco)

    # pose larga demais é duas poses encostadas: parte no meio
    poses = []
    for x0, x1 in juntos:
        largura = x1 - x0 + 1
        pedacos = max(1, round(largura / 19))
        passo = largura / pedacos
        for i in range(pedacos):
            poses.append((int(round(x0 + i * passo)), int(round(x0 + (i + 1) * passo)) - 1))

    medidas = []
    for x0, x1 in poses:
        pedaco = forte[:, x0:x1 + 1]
        linhas = np.where(pedaco.any(axis=1))[0]
        if len(linhas) == 0 or int(pedaco.sum()) < GIRO_MIN_AREA:
            continue
        medidas.append((x0, x1, int(linhas.min()), int(linhas.max()), int(pedaco.sum())))

    if not medidas:
        print(f"nenhuma pose de giro em {cor}")
        return 0

    # as quatro poses com mais desenho, na ordem em que aparecem na folha
    medidas.sort(key=lambda c: -c[4])
    medidas = sorted(medidas[:GIRO_QUANTOS], key=lambda c: c[0])

    tira = Image.new("RGBA", (GIRO_LADO * len(medidas), GIRO_ALT), (0, 0, 0, 0))
    for indice, (x0, x1, yi0, yi1, _area) in enumerate(medidas):
        recorte = origem.crop((x0 - 1, y0 + yi0 - 1, x1 + 2, y0 + yi1 + 2))
        largura, altura = recorte.size
        inicio_x = GIRO_LADO // 2 - largura // 2
        inicio_y = GIRO_ALT // 2 - altura // 2
        for y in range(altura):
            for x in range(largura):
                r, g, b = recorte.getpixel((x, y))
                brilho = max(r, g, b)
                if brilho <= GIRO_PISO:
                    alfa = 0
                else:
                    alfa = round(min(1.0, (brilho - GIRO_PISO) / (GIRO_TETO - GIRO_PISO)) * 255)
                alvo_x, alvo_y = inicio_x + x, inicio_y + y
                if 0 <= alvo_x < GIRO_LADO and 0 <= alvo_y < GIRO_ALT:
                    tira.putpixel(
                        (indice * GIRO_LADO + alvo_x, alvo_y),
                        (r, g, b, round(alfa * esmaecer(alvo_x, alvo_y))),
                    )

    destino = f"public/tutorial/pixie-giro-{cor}.png"
    tira.save(destino)
    print(f"{destino}: {tira.width}x{tira.height}, {len(medidas)} poses")
    return len(medidas)


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
