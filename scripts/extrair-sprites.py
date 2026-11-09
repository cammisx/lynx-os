"""Extrai TODOS os sprites da folha da pixie, um arquivo por quadro.

Roda com: python3 scripts/extrair-sprites.py

A folha (src/assets/pixie-folha.png, 1024x381) vem dividida em quatro faixas:

  dourada  y   0- 78     verde  y  97-175     azul  y 198-276     brilhos y 295-377

Cada faixa de cor tem tres fileiras:

  frente  base+ 0 a base+21   26x22 por quadro, na grade de 26 em 26
  perfil  base+23 a base+45   26x23 por quadro, mesma grade
  giro    base+47 a base+78   as poses da pirueta, separadas pelo vazio entre elas

As fileiras de frente e de perfil tem 39 quadros cada uma (alguns vazios no fim).
O recorte usa a grade fixa, sem apertar no desenho: assim o quadro nao pula
quando vira animacao. As poses do giro e os brilhos sao recortados no desenho,
porque nao formam grade.

Cada sprite sai em dois formatos:

  src/assets/pixie/svg/<nome>.svg   o quadro dentro de um SVG, no mesmo esquema
                                    dos que a Chloë exportou (imagem embutida em
                                    base64, viewBox do tamanho do quadro)
  src/assets/pixie/png/<nome>.png   o mesmo quadro em PNG, que e o que a
                                    animacao consome

O indice de tudo fica em src/assets/pixie/sprites.json.
"""
from PIL import Image
import numpy as np
import base64
import io
import json
import os

FOLHA = "src/assets/pixie-folha.png"
PASTA_SVG = "src/assets/pixie/svg"
PASTA_PNG = "src/assets/pixie/png"

CORES = {"dourada": 0, "verde": 97, "azul": 198}
FRENTE = (0, 21, 26)   # topo, base e largura do quadro
PERFIL = (23, 45, 26)
GIRO = (47, 78)
BRILHOS = (295, 377)

LARGURA_CELULA = 26
TINTA_MINIMA = 20


def celulas(mascara, y0, y1):
    """Os quadros da grade de 26, da esquerda para a direita."""
    saida = []
    for x in range(0, mascara.shape[1], LARGURA_CELULA):
        pedaco = mascara[y0:y1 + 1, x:x + LARGURA_CELULA]
        # o ultimo pedaco da direita vem cortado pela borda: fica de fora
        if pedaco.shape[1] < LARGURA_CELULA - 6:
            continue
        if pedaco.sum() >= TINTA_MINIMA:
            saida.append((x, y0, min(x + LARGURA_CELULA, mascara.shape[1]), y1 + 1))
    return saida


def blocos(mascara, y0, y1, vao=2, largura_minima=6, dividir_largos=True):
    """Os recortes soltos (giro e brilhos): separa pelo vazio entre eles."""
    colunas = mascara[y0:y1 + 1].sum(axis=0)
    faixas, inicio, vazios = [], None, 0
    for i, quantidade in enumerate(colunas):
        if quantidade < 1:
            if inicio is not None:
                vazios += 1
                if vazios >= vao:
                    faixas.append((inicio, i - vazios))
                    inicio = None
                    vazios = 0
        else:
            if inicio is None:
                inicio = i
            vazios = 0
    if inicio is not None:
        faixas.append((inicio, len(colunas) - 1))

    saida = []
    for x0, x1 in faixas:
        if x1 - x0 + 1 < largura_minima:
            continue
        # pose larga demais e duas encostadas: parte no meio
        pedacos = max(1, round((x1 - x0 + 1) / 19)) if dividir_largos else 1
        passo = (x1 - x0 + 1) / pedacos
        for i in range(pedacos):
            inicio_x = int(round(x0 + i * passo))
            fim_x = int(round(x0 + (i + 1) * passo))
            recorte = mascara[y0:y1 + 1, inicio_x:fim_x]
            if recorte.sum() < TINTA_MINIMA:
                continue
            linhas = recorte.any(axis=1)
            ys = [j for j, tem in enumerate(linhas) if tem]
            saida.append((inicio_x, y0 + ys[0], fim_x, y0 + ys[-1] + 1))
    return saida


def salvar(folha, caixa, pasta_svg, pasta_png, nome):
    quadro = folha.crop(caixa)
    largura, altura = quadro.size

    destino_png = os.path.join(pasta_png, f"{nome}.png")
    quadro.save(destino_png, optimize=True)

    buffer = io.BytesIO()
    quadro.save(buffer, format="PNG", optimize=True)
    dados = base64.b64encode(buffer.getvalue()).decode("ascii")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{largura}" height="{altura}" viewBox="0 0 {largura} {altura}" fill="none">\n'
        f'<image id="quadro" width="{largura}" height="{altura}" preserveAspectRatio="none" '
        f'xlink:href="data:image/png;base64,{dados}" />\n'
        f"</svg>\n"
    )
    with open(os.path.join(pasta_svg, f"{nome}.svg"), "w", encoding="utf-8") as arquivo:
        arquivo.write(svg)
    return {"nome": nome, "largura": largura, "altura": altura, "caixa": list(caixa)}


def main():
    folha = Image.open(FOLHA).convert("RGBA")
    desenho = np.array(folha.getchannel("A")) > 20

    for pasta in (PASTA_SVG, PASTA_PNG):
        os.makedirs(pasta, exist_ok=True)

    indice = []
    for cor, base in CORES.items():
        for linha, (topo, fundo, _larg) in (("frente", FRENTE), ("perfil", PERFIL)):
            caixas = celulas(desenho, base + topo, base + fundo)
            for numero, (x0, y0, x1, y1) in enumerate(caixas, start=1):
                indice.append(salvar(folha, (x0, y0, x1, y1), PASTA_SVG, PASTA_PNG,
                                     f"{cor}-{linha}-{numero:02d}"))
            print(f"{cor} {linha}: {len(caixas)} quadros")

        topo, fundo = GIRO
        caixas = blocos(desenho, base + topo, base + fundo)
        for numero, caixa in enumerate(caixas, start=1):
            indice.append(salvar(folha, caixa, PASTA_SVG, PASTA_PNG, f"{cor}-giro-{numero:02d}"))
        print(f"{cor} giro: {len(caixas)} poses")

    caixas = blocos(desenho, BRILHOS[0], BRILHOS[1], vao=2, largura_minima=4, dividir_largos=False)
    for numero, caixa in enumerate(caixas, start=1):
        indice.append(salvar(folha, caixa, PASTA_SVG, PASTA_PNG, f"brilho-{numero:02d}"))
    print(f"brilhos: {len(caixas)}")

    with open("src/assets/pixie/sprites.json", "w", encoding="utf-8") as arquivo:
        json.dump(indice, arquivo, indent=1, ensure_ascii=False)
    print(f"total: {len(indice)} sprites em {PASTA_SVG} e {PASTA_PNG}")


if __name__ == "__main__":
    main()
