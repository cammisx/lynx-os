"""Extrai a pixie do tutorial a partir da folha de sprites (src/assets/pixie-fonte.png).

Roda com: python3 scripts/extrair-pixie.py

A folha tem, por cor, duas faixas de fadas pequenas (uma de frente e uma de
perfil) e uma faixa de brilhos. Cada quadro tem 26x24 pixels e a fada fica
inteira dentro do quadro, então o recorte é só uma grade — sem adivinhação.

A fada é desenhada sobre fundo preto. Para usar no desktop, o preto vira
transparência: o alfa sai da luminosidade do pixel, o que preserva o brilho
suave em volta dela (não fica com a caixa preta em volta).

Gera public/tutorial/pixie-<cor>.png, uma tira horizontal com os quadros.
"""
from PIL import Image
import sys

FONTE = "src/assets/pixie-fonte.png"
LARG, ALT = 26, 24
QUADROS = 3  # o bote das asas: 0, 1, 2 (o 3 é igual ao 0)

# y do topo da faixa de frente de cada cor na folha.
FAIXAS = {"dourada": 22, "verde": 119, "azul": 220}

# Abaixo disso é fundo; acima do teto é opaco. No meio, o alfa acompanha.
PISO, TETO = 8, 48


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


if __name__ == "__main__":
    main()
