# Mídia para redes sociais

As APIs de publicação da Meta **não aceitam upload de arquivo** — elas
recebem uma URL pública. Este site estático é a hospedagem: o arquivo entra
aqui, sobe no deploy, e a URL vai no `image_url` da chamada.

Convenção de nome: `aaaa-mm-dd-<assunto>-<formato>.<ext>`

Formatos e limites do Instagram:

| Uso | Proporção | Pixels | Observação |
|---|---|---|---|
| Feed | 4:5 | 1080×1350 | proporção precisa ficar entre 4:5 e 1.91:1 |
| Story e Reels | 9:16 | 1080×1920 | não aceita legenda — texto vai dentro da peça |

JPEG, no máximo 8 MB. Todas as peças aqui ficam abaixo de 210 KB.

## Séries

**`avatar-perfil`** — 1080×1080, escudo prata sobre obsidian, o mesmo SVG do
cabeçalho do site. Foto de perfil.

**Linhas de serviço** (`capa-sob-medida`, `site-trabalha`,
`planilha-compartilhada`, `numero-de-hoje`, `toda-segunda`,
`lgpd-configuracao`) — uma peça por linha, tiradas do que a `servicos.html`
realmente lista.

**`caixinha-*`** — pilar Caixinha de dúvidas. Uma pergunta real de cliente
no balão, a resposta honesta embaixo. As respostas vêm da `faq.html`, não de
copy inventada.

**`pergunta-*`** — Story de pergunta aberta. Os dois terços de baixo estão
vazios de propósito: é onde a figurinha nativa de perguntas do Instagram
entra, na publicação manual pelo aplicativo. A API não publica figurinha
interativa.

**`seg-*`** — segmento (clínicas, indústria, agro, advocacia). O mesmo
problema visto dentro de um ramo. Qualifica por mensagem, que custa zero,
em vez de por segmentação, que custa CPM.

**`teste-cor-*`** — mesma peça em âmbar `#C77D2E` e petróleo `#2A8F91`, para
decidir se a marca passa a aceitar um acento quente. Enquanto não houver
decisão, o padrão continua monocromático.

## Como as peças são produzidas

HTML renderizado pelo Chrome headless, não modelo de imagem. O texto sai
exato, a paleta é o hex da marca e Fraunces e Inter são as fontes reais.
O passo a passo está em `bsp-growth/references/criativos.md`.

Duas armadilhas que custaram tempo: `timeout` não existe no macOS (usar
`gtimeout` ou nada), e o `--virtual-time-budget` precisa ser generoso se as
fontes vierem do Google — ou então baixar os `.woff2` uma vez e apontar o
CSS para o arquivo local, que é mais rápido e não depende de rede.
