"""Gera os sprites em pixel art dos pets do desktop (16x16) e grava src/lib/pets.js.

Roda com: python3 scripts/gerar-pets.py

Cada pet tem 4 quadros: dois parados (o segundo piscando) e dois andando
(com as patas trocadas e o corpo um pixel mais alto).
"""
from PIL import Image, ImageDraw

TAM = 16

PALETAS = {
    "gato": {
        "o": (40, 32, 46),
        "b": (219, 140, 76),
        "s": (176, 106, 50),
        "l": (243, 214, 178),
        "k": (231, 122, 132),
    },
    "cachorro": {
        "o": (48, 34, 25),
        "b": (198, 140, 92),
        "s": (156, 108, 66),
        "l": (244, 227, 202),
        "k": (231, 122, 132),
    },
    "morcego": {
        "o": (30, 24, 42),
        "b": (124, 107, 170),
        "s": (86, 73, 121),
        "l": (176, 163, 214),
        "w": (70, 60, 98),
        "k": (231, 122, 132),
    },
}


def criar():
    img = Image.new("RGBA", (TAM, TAM), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def corpo_e_patas(d, pal, bob, pata_esq, pata_dir):
    """Tronco redondo com peito claro e duas patas na frente."""
    d.ellipse((4, 10 - bob, 11, 15 - bob), fill=pal["b"], outline=pal["o"])
    d.ellipse((7, 11 - bob, 9, 15 - bob), fill=pal["l"])
    for x, y in ((pata_esq, 14), (pata_dir, 14)):
        d.ellipse((x, y - bob, x + 2, y + 1 - bob), fill=pal["l"], outline=pal["o"])


def olhos(d, pal, y, abertos=True):
    if abertos:
        for x in (5, 9):
            d.rectangle((x, y, x + 1, y + 1), fill=pal["o"])
    else:
        for x in (5, 9):
            d.rectangle((x, y + 1, x + 1, y + 1), fill=pal["o"])


def gato(quadro):
    pal = PALETAS["gato"]
    img, d = criar()
    andando = quadro.startswith("andando")
    bob = 1 if quadro == "andando1" else 0
    pata_esq, pata_dir = (4, 10) if quadro != "andando2" else (3, 9)

    # cauda enrolada a direita
    for x, y in [(11, 15), (12, 14), (13, 14), (14, 13), (14, 12)]:
        d.point((x, y - bob), fill=pal["s"])
    # corpo pequeno e patas
    d.ellipse((5, 11 - bob, 10, 15 - bob), fill=pal["b"], outline=pal["o"])
    d.ellipse((7, 12 - bob, 8, 15 - bob), fill=pal["l"])
    for x, y in ((pata_esq, 14), (pata_dir, 14)):
        d.ellipse((x, y - bob, x + 2, y + 1 - bob), fill=pal["l"], outline=pal["o"])
    # cabeca grande
    d.ellipse((2, 3 - bob, 13, 11 - bob), fill=pal["b"], outline=pal["o"])
    # orelhas por cima da cabeca
    d.polygon([(3, 5 - bob), (4, 0 - bob), (7, 4 - bob)], fill=pal["b"])
    d.polygon([(4, 4 - bob), (4, 1 - bob), (6, 4 - bob)], fill=pal["k"])
    d.polygon([(12, 5 - bob), (11, 0 - bob), (8, 4 - bob)], fill=pal["b"])
    d.polygon([(11, 4 - bob), (11, 1 - bob), (9, 4 - bob)], fill=pal["k"])
    # focinho, olhos e bochechas
    d.ellipse((6, 7 - bob, 9, 10 - bob), fill=pal["l"])
    olhos(d, pal, 6 - bob, abertos=quadro != "parado2")
    d.point((7, 8 - bob), fill=pal["k"])
    d.point((8, 8 - bob), fill=pal["k"])
    d.point((3, 8 - bob), fill=pal["k"])
    d.point((12, 8 - bob), fill=pal["k"])
    return img


def cachorro(quadro):
    pal = PALETAS["cachorro"]
    img, d = criar()
    bob = 1 if quadro == "andando1" else 0
    pata_esq, pata_dir = (4, 10) if quadro != "andando2" else (3, 9)

    for x, y in [(12, 15), (13, 14), (14, 13), (14, 12)]:
        d.point((x, y - bob), fill=pal["s"])
    # corpo pequeno e patas
    d.ellipse((5, 11 - bob, 10, 15 - bob), fill=pal["b"], outline=pal["o"])
    d.ellipse((7, 12 - bob, 8, 15 - bob), fill=pal["l"])
    for x, y in ((pata_esq, 14), (pata_dir, 14)):
        d.ellipse((x, y - bob, x + 2, y + 1 - bob), fill=pal["l"], outline=pal["o"])
    # orelhas caidas atras da cabeca
    d.ellipse((1, 5 - bob, 4, 12 - bob), fill=pal["s"], outline=pal["o"])
    d.ellipse((11, 5 - bob, 14, 12 - bob), fill=pal["s"], outline=pal["o"])
    # cabeca
    d.ellipse((3, 3 - bob, 12, 11 - bob), fill=pal["b"], outline=pal["o"])
    # focinho
    d.ellipse((5, 6 - bob, 10, 10 - bob), fill=pal["l"])
    olhos(d, pal, 5 - bob, abertos=quadro != "parado2")
    d.rectangle((7, 7 - bob, 8, 8 - bob), fill=pal["o"])
    d.point((3, 8 - bob), fill=pal["k"])
    d.point((12, 8 - bob), fill=pal["k"])
    return img


def morcego(quadro):
    pal = PALETAS["morcego"]
    img, d = criar()
    bob = 1 if quadro == "andando1" else 0
    asa = 1 if quadro == "andando2" else 0

    # asas abertas
    d.polygon([(5, 8 - bob), (0, 5 + asa - bob), (0, 11 + asa - bob), (4, 12 - bob)], fill=pal["w"], outline=pal["o"])
    d.polygon([(10, 8 - bob), (15, 5 + asa - bob), (15, 11 + asa - bob), (11, 12 - bob)], fill=pal["w"], outline=pal["o"])
    # corpo
    d.ellipse((5, 9 - bob, 10, 15 - bob), fill=pal["b"], outline=pal["o"])
    d.ellipse((7, 11 - bob, 9, 15 - bob), fill=pal["l"])
    # orelhas por cima
    d.polygon([(4, 6 - bob), (4, 0 - bob), (8, 4 - bob)], fill=pal["b"], outline=pal["o"])
    d.polygon([(11, 6 - bob), (11, 0 - bob), (7, 4 - bob)], fill=pal["b"], outline=pal["o"])
    # cabeca
    d.ellipse((4, 4 - bob, 11, 11 - bob), fill=pal["b"], outline=pal["o"])
    d.polygon([(4, 6 - bob), (4, 1 - bob), (8, 5 - bob)], fill=pal["b"], outline=pal["o"])
    if quadro == "parado2":
        for x in (5, 9):
            d.point((x, 7 - bob), fill=pal["o"])
    else:
        for x in (5, 9):
            d.rectangle((x, 6 - bob, x, 7 - bob), fill=pal["o"])
    # presas
    d.point((7, 9 - bob), fill=pal["l"])
    d.point((8, 9 - bob), fill=pal["l"])
    return img


DESENHOS = {"gato": gato, "cachorro": cachorro, "morcego": morcego}
QUADROS = {"parado": ["parado1", "parado2"], "andando": ["andando1", "andando2"]}


def para_texto(img, paleta):
    linhas = []
    for y in range(TAM):
        linha = ""
        for x in range(TAM):
            r, g, b, a = img.getpixel((x, y))
            if a < 40:
                linha += "."
                continue
            melhor, dist = ".", None
            for chave, cor in paleta.items():
                dd = (r - cor[0]) ** 2 + (g - cor[1]) ** 2 + (b - cor[2]) ** 2
                if dist is None or dd < dist:
                    melhor, dist = chave, dd
            linha += melhor
        linhas.append(linha)
    return linhas


def hexa(cor):
    return "#%02x%02x%02x" % cor


def escrever_modulo(destino):
    partes = []
    partes.append("/**")
    partes.append(" * Sprites dos pets do desktop, em pixel art 16x16.")
    partes.append(" *")
    partes.append(" * Arquivo gerado: rode `python3 scripts/gerar-pets.py` para refazer.")
    partes.append(" * Cada quadro e uma lista de 16 linhas de 16 caracteres; o ponto e")
    partes.append(" * vazio e as letras sao as cores da paleta do pet.")
    partes.append(" */")
    partes.append("")
    partes.append("export const TAMANHO = 16;")
    partes.append("")
    partes.append("export const SPRITES = {")
    for nome, desenhar in DESENHOS.items():
        pal = PALETAS[nome]
        partes.append(f"  {nome}: {{")
        partes.append("    paleta: {")
        for chave, cor in pal.items():
            partes.append(f"      {chave}: '{hexa(cor)}',")
        partes.append("    },")
        partes.append("    quadros: {")
        for acao, quadros in QUADROS.items():
            partes.append(f"      {acao}: [")
            for quadro in quadros:
                partes.append("        [")
                for linha in para_texto(desenhar(quadro), pal):
                    partes.append(f"          '{linha}',")
                partes.append("        ],")
            partes.append("      ],")
        partes.append("    },")
        partes.append("  },")
    partes.append("};")
    partes.append("")
    with open(destino, "w", encoding="utf-8") as arquivo:
        arquivo.write("\n".join(partes))
    return destino


def desenhar_previa(destino):
    """Cartela dos 12 quadros, ampliada, para conferir o desenho."""
    escala, folga, rotulo = 8, 10, 24
    largura = 4 * TAM * escala + 5 * folga
    altura = 3 * (TAM * escala + rotulo) + 4 * folga
    cartela = Image.new("RGB", (largura, altura), (34, 30, 42))
    d = ImageDraw.Draw(cartela)
    for linha, (nome, desenhar) in enumerate(DESENHOS.items()):
        y = folga + linha * (TAM * escala + rotulo + folga)
        d.text((folga, y - 14), nome.upper(), fill=(240, 200, 120))
        indice = 0
        for acao, quadros in QUADROS.items():
            for quadro in quadros:
                sprite = desenhar(quadro).resize((TAM * escala, TAM * escala), Image.NEAREST)
                x = folga + indice * (TAM * escala + folga)
                cartela.paste(sprite, (x, y), sprite)
                d.text((x, y + TAM * escala + 4), f"{acao} {indice % 2 + 1}", fill=(200, 190, 210))
                indice += 1
    cartela.save(destino)
    return destino


if __name__ == "__main__":
    print(escrever_modulo("../src/lib/petsSprites.js"))
    print(desenhar_previa("../pets-previa.png"))
