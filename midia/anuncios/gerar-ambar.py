# -*- coding: utf-8 -*-
"""Gera as pecas de anuncio em HTML, no formato 4:5 e 9:16.

Direcao visual pedida pelo Gabriel: fundo quase preto, manchete condensada
branca em caixa alta, apoio cinza e um botao ambar. E a mesma linguagem das
referencias que ele mandou. O texto sai renderizado, nao gerado por modelo,
entao acento e pontuacao chegam exatos ao arquivo final.
"""
import os, pathlib

SAIDA = pathlib.Path(__file__).parent / 'pecas'
SAIDA.mkdir(exist_ok=True)

FORMATOS = {'4x5': (1080, 1350), '9x16': (1080, 1920)}

BASE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  html, body {{ width:{w}px; height:{h}px; overflow:hidden; }}
  body {{
    background:
      radial-gradient(120% 80% at 50% 118%, rgba(232,150,44,.20) 0%, rgba(232,150,44,0) 62%),
      linear-gradient(178deg, #0E0E0E 0%, #090909 100%);
    color:#F7F7FF;
    font-family:'Inter', system-ui, sans-serif;
    display:flex; flex-direction:column;
    padding:{pad}px {padx}px;
  }}
  .grade {{
    position:absolute; inset:0; pointer-events:none; opacity:.5;
    background-image:
      linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
    background-size:{grade}px {grade}px;
    -webkit-mask-image: radial-gradient(80% 70% at 50% 45%, #000 0%, transparent 100%);
  }}
  .topo {{ position:relative; z-index:2; }}
  h1 {{
    font-family:'Archivo', 'Inter', sans-serif; font-weight:800;
    font-size:{fs}px; line-height:.93; letter-spacing:-.018em;
    text-transform:uppercase; font-stretch:condensed;
    text-wrap:balance;
    text-shadow:0 2px 40px rgba(0,0,0,.7);
  }}
  .apoio {{
    margin-top:{gap}px; max-width:{sw}px;
    font-size:{ss}px; line-height:1.45; font-weight:400; color:#B9B9B9;
  }}
  .botao {{
    display:inline-flex; align-items:center; margin-top:{gapb}px;
    background:#E8962C; color:#141005;
    font-weight:700; font-size:{bs}px; letter-spacing:.055em; text-transform:uppercase;
    padding:{bpv}px {bph}px; border-radius:999px;
    box-shadow:0 10px 44px rgba(232,150,44,.30);
  }}
  .arte {{ position:relative; z-index:2; flex:1; display:flex; align-items:flex-end; }}
  .assinatura {{
    position:relative; z-index:2; display:flex; align-items:center; gap:12px;
    margin-top:{gapb}px; color:#6F6F6F;
    font-size:{as_}px; font-weight:600; letter-spacing:.26em; text-transform:uppercase;
  }}
  .escudo {{ width:{esc}px; height:{esc}px; fill:#6F6F6F; }}
  {extra}
</style></head>
<body>
  <div class="grade"></div>
  <div class="topo">
    <h1>{titulo}</h1>
    <p class="apoio">{apoio}</p>
    <span class="botao">{botao}</span>
  </div>
  <div class="arte">{arte}</div>
  <div class="assinatura">
    <svg class="escudo" viewBox="0 0 24 24"><path d="M12 1.5 3.5 5v6.4c0 5.3 3.6 10.2 8.5 11.6 4.9-1.4 8.5-6.3 8.5-11.6V5L12 1.5Zm-1 15-4-4 1.6-1.6 2.4 2.4 5.4-5.4L18 9.5l-7 7Z"/></svg>
    BLUESHIELDPRO
  </div>
</body></html>
"""

# ---- arte de cada angulo -------------------------------------------------
# Cada bloco e so CSS e divs: nada de imagem externa, entao a peca renderiza
# igual em qualquer maquina e nao depende de rede alem das fontes.

ARTE_BARRAS = """
    <div class="barras">
      <figure><div class="barra barra--longa"></div><figcaption>Júnior — 3 meses</figcaption></figure>
      <figure><div class="barra barra--curta"></div><figcaption class="cap-destaque">Skill — uma tarde</figcaption></figure>
    </div>"""

CSS_BARRAS = """
  .barras {{ display:flex; align-items:flex-end; gap:{bg}px; width:100%; padding-bottom:{bpad}px; }}
  .barras figure {{ display:flex; flex-direction:column; align-items:center; gap:{bcap}px; }}
  .barra {{ width:{bw}px; border-radius:999px; }}
  .barra--longa {{ height:{bl}px; background:linear-gradient(#2B2B2B,#1B1B1B); border:1px solid rgba(255,255,255,.16); }}
  .barra--curta {{ height:{bc}px; background:linear-gradient(#F6B558,#E8962C); box-shadow:0 0 60px rgba(232,150,44,.55); }}
  figcaption {{ font-size:{fc}px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#7C7C7C; white-space:nowrap; }}
  .cap-destaque {{ color:#E8962C; }}
"""

ARTE_RELOGIO = """
    <div class="cena">
      <div class="janela">
        <span class="hora">23:00</span>
        <span class="dia">Sexta-feira</span>
      </div>
      <div class="fila">
        <span class="tarefa">Relatório do cliente</span>
        <span class="tarefa">Proposta para segunda</span>
        <span class="tarefa tarefa--viva">A Skill está fazendo</span>
      </div>
    </div>"""

CSS_RELOGIO = """
  .cena {{ width:100%; display:flex; flex-direction:column; gap:{cg}px; padding-bottom:{bpad}px; }}
  .janela {{ display:flex; align-items:baseline; gap:{cg}px; }}
  .hora {{ font-family:'Archivo',sans-serif; font-weight:800; font-size:{hs}px; line-height:1; color:#1F1F1F; -webkit-text-stroke:2px #3A3A3A; }}
  .dia {{ font-size:{fc}px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:#6F6F6F; }}
  .fila {{ display:flex; flex-direction:column; gap:{fg}px; }}
  .tarefa {{
    padding:{tp}px {tph}px; border-radius:{tr}px; font-size:{ts}px; font-weight:500;
    background:#141414; border:1px solid rgba(255,255,255,.10); color:#6F6F6F;
  }}
  .tarefa--viva {{
    background:linear-gradient(90deg, rgba(232,150,44,.20), rgba(232,150,44,.05));
    border-color:rgba(232,150,44,.55); color:#F6B558;
    box-shadow:0 0 50px rgba(232,150,44,.20);
  }}
"""

ARTE_HORAS = """
    <div class="semana">
      <div class="quadro">
        <span class="rot">Hoje</span>
        <div class="celas celas--cheias">""" + ''.join('<i></i>' for _ in range(35)) + """</div>
      </div>
      <div class="quadro quadro--limpo">
        <span class="rot rot--destaque">Com Skills</span>
        <div class="celas">""" + ''.join(
    '<i class="on"></i>' if i in (8, 12, 17, 22, 26) else '<i></i>' for i in range(35)
) + """</div>
      </div>
    </div>"""

CSS_HORAS = """
  .semana {{ display:flex; gap:{sg}px; width:100%; padding-bottom:{bpad}px; }}
  .quadro {{ flex:1; display:flex; flex-direction:column; gap:{qg}px; }}
  .rot {{ font-size:{fc}px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:#6F6F6F; }}
  .rot--destaque {{ color:#E8962C; }}
  .celas {{ display:grid; grid-template-columns:repeat(7,1fr); gap:{cg2}px; }}
  .celas i {{ aspect-ratio:1; border-radius:{cr}px; background:#141414; border:1px solid rgba(255,255,255,.07); }}
  .celas--cheias i {{ background:#2C2C2C; border-color:rgba(255,255,255,.13); }}
  .celas i.on {{ background:linear-gradient(#F6B558,#E8962C); border-color:transparent; box-shadow:0 0 22px rgba(232,150,44,.5); }}
  .quadro--limpo {{ position:relative; }}
"""

PECAS = {
    'conceito-treinar': dict(
        titulo='Treinar gente demora.<br>Treinar IA, não.',
        apoio='Você escreve o processo da sua agência uma única vez. '
              'A IA nunca mais esquece e nunca mais pede pra repetir.',
        botao='Quero treinar a minha',
        arte=ARTE_BARRAS,
        css=CSS_BARRAS,
        vars={'4x5': dict(bg=150, bpad=30, bcap=26, bw=54, bl=430, bc=190, fc=19),
              '9x16': dict(bg=170, bpad=90, bcap=30, bw=62, bl=560, bc=250, fc=21)},
    ),
    'dor-sexta': dict(
        titulo='Sexta, 23h.<br>O cliente quer amanhã.',
        apoio='Skill é um manual que você instala na IA. Ela executa o seu processo '
              'sozinha — enquanto a equipe descansa.',
        botao='Ver como funciona',
        arte=ARTE_RELOGIO,
        css=CSS_RELOGIO,
        vars={'4x5': dict(cg=22, bpad=20, hs=132, fc=19, fg=13, tp=19, tph=26, tr=13, ts=25),
              '9x16': dict(cg=28, bpad=80, hs=168, fc=21, fg=16, tp=23, tph=30, tr=15, ts=28)},
    ),
    'escopo-40h': dict(
        titulo='Tire 40 horas<br>da sua semana.',
        apoio='Relatório, pesquisa e revisão viram tarefa da IA. Você fica com '
              'estratégia, cliente e preço.',
        botao='Começar agora',
        arte=ARTE_HORAS,
        css=CSS_HORAS,
        vars={'4x5': dict(sg=40, bpad=30, qg=20, cg2=8, cr=5, fc=18),
              '9x16': dict(sg=48, bpad=90, qg=24, cg2=10, cr=6, fc=20)},
    ),
}

GEOM = {
    '4x5':  dict(pad=86,  padx=80, grade=54, fs=104, gap=34, sw=880, ss=30,
                 gapb=38, bs=22, bpv=24, bph=44, as_=15, esc=26),
    '9x16': dict(pad=190, padx=90, grade=60, fs=124, gap=42, sw=880, ss=34,
                 gapb=46, bs=25, bpv=28, bph=52, as_=17, esc=30),
}

for nome, peca in PECAS.items():
    for fmt, (w, h) in FORMATOS.items():
        css = peca['css'].format(**peca['vars'][fmt])
        html = BASE.format(w=w, h=h, titulo=peca['titulo'], apoio=peca['apoio'],
                           botao=peca['botao'], arte=peca['arte'], extra=css,
                           **GEOM[fmt])
        alvo = SAIDA / f'{nome}-{fmt}.html'
        alvo.write_text(html, encoding='utf-8')
        print(alvo.name)
