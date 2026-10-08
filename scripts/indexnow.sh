#!/usr/bin/env bash
# =====================================================================
#  BlueShieldPro: avisa o Bing (e Yandex, Naver, Seznam, Yep) pelo
#  IndexNow que as páginas do site mudaram.
#
#  O Google NÃO participa do IndexNow. Para o Google, use o Search
#  Console (Inspecionar URL e reenviar o sitemap). Ver LEIA-ME.txt.
#
#  QUANDO RODAR
#    Só DEPOIS que o deploy no Render terminar e o site novo estiver
#    no ar. Antes disso o IndexNow lê a versão antiga, e o arquivo da
#    chave (9cm3vmldp53zebubgoh78msf51rgv5wm.txt) ainda não existe no
#    servidor, o que dá erro 403.
#
#  COMO USAR (no terminal, na pasta do site)
#    bash scripts/indexnow.sh                 envia TODAS as URLs do sitemap.xml
#    bash scripts/indexnow.sh --teste         só mostra o que seria enviado (não envia)
#    bash scripts/indexnow.sh URL [URL ...]   envia só as URLs informadas
#        exemplo: bash scripts/indexnow.sh https://blueshieldpro.com.br/faq.html
#
#    No dia a dia, envie só as páginas que mudaram de verdade. Mandar o
#    site inteiro a cada deploy não ajuda e pode gerar erro 429.
#
#  REQUISITOS
#    bash, curl, grep e sed (no Windows, use o Git Bash).
#
#  RESPOSTAS DO INDEXNOW
#    200 ou 202  recebido (202 = a chave ainda está sendo validada)
#    400         pedido mal formado
#    403         chave não encontrada no site (o deploy terminou?)
#    422         alguma URL não é de blueshieldpro.com.br
#    429         envios demais em pouco tempo; espere e tente depois
# =====================================================================
set -euo pipefail

HOST="blueshieldpro.com.br"
KEY="9cm3vmldp53zebubgoh78msf51rgv5wm"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
ENDPOINT="https://api.indexnow.org/indexnow"

# O sitemap fica na raiz do repositório, uma pasta acima deste script.
PASTA_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITEMAP="${SITEMAP:-${PASTA_SCRIPT}/../sitemap.xml}"

TESTE=0
URLS=()
for arg in "$@"; do
  case "$arg" in
    --teste|--dry-run) TESTE=1 ;;
    -h|--help) sed -n '2,33p' "${BASH_SOURCE[0]}"; exit 0 ;;
    http*://*) URLS+=("$arg") ;;
    *) echo "Argumento desconhecido: $arg (use --help)" >&2; exit 2 ;;
  esac
done

# Sem URLs na linha de comando: lê todas as <loc> do sitemap.
if [ "${#URLS[@]}" -eq 0 ]; then
  if [ ! -f "$SITEMAP" ]; then
    echo "Não achei o sitemap em: $SITEMAP" >&2
    exit 1
  fi
  while IFS= read -r url; do
    [ -n "$url" ] && URLS+=("$url")
  done < <(grep -o '<loc>[^<]*</loc>' "$SITEMAP" | sed -e 's#<loc>##' -e 's#</loc>##' -e 's/[[:space:]]//g')
fi

if [ "${#URLS[@]}" -eq 0 ]; then
  echo "Nenhuma URL para enviar." >&2
  exit 1
fi

# Toda URL precisa ser do próprio domínio (senão o IndexNow devolve 422).
for url in "${URLS[@]}"; do
  case "$url" in
    "https://${HOST}/"*) ;;
    *) echo "URL fora de https://${HOST}/: $url" >&2; exit 1 ;;
  esac
  case "$url" in
    *'"'*|*'\'*) echo "URL com caractere inválido: $url" >&2; exit 1 ;;
  esac
done

# Monta o JSON: {"host","key","keyLocation","urlList":[...]}
LISTA=""
for url in "${URLS[@]}"; do
  [ -n "$LISTA" ] && LISTA="${LISTA},"
  LISTA="${LISTA}\"${url}\""
done
JSON="{\"host\":\"${HOST}\",\"key\":\"${KEY}\",\"keyLocation\":\"${KEY_LOCATION}\",\"urlList\":[${LISTA}]}"

echo "URLs (${#URLS[@]}):"
printf '  %s\n' "${URLS[@]}"

if [ "$TESTE" -eq 1 ]; then
  echo
  echo "Modo teste: nada foi enviado. Corpo que seria enviado para ${ENDPOINT}:"
  echo "$JSON"
  exit 0
fi

# Confere se o arquivo da chave já está no ar antes de enviar.
NO_AR="$(curl -sS --max-time 20 "$KEY_LOCATION" || true)"
if [ "$(printf '%s' "$NO_AR" | tr -d '[:space:]')" != "$KEY" ]; then
  echo
  echo "O arquivo da chave ainda não está no ar em ${KEY_LOCATION}." >&2
  echo "Espere o deploy do Render terminar e rode de novo." >&2
  exit 1
fi

echo
echo "Enviando para ${ENDPOINT} ..."
CODIGO="$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' \
  -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data "$JSON")"

case "$CODIGO" in
  200|202) echo "OK (HTTP $CODIGO): o IndexNow recebeu a lista." ;;
  400) echo "HTTP 400: pedido mal formado." >&2; exit 1 ;;
  403) echo "HTTP 403: a chave não foi aceita. Confira ${KEY_LOCATION}." >&2; exit 1 ;;
  422) echo "HTTP 422: alguma URL não pertence a ${HOST}." >&2; exit 1 ;;
  429) echo "HTTP 429: envios demais. Tente mais tarde." >&2; exit 1 ;;
  *)   echo "Resposta inesperada: HTTP $CODIGO" >&2; exit 1 ;;
esac
