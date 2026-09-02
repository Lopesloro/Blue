/* ============================================================
   BlueShieldPro — barra da oferta de lancamento

   Substitui as tres portas. As portas funcionavam como ideia, mas
   como execucao custavam caro no lugar errado: eram um modal que
   tomava a tela inteira 700ms depois da chegada. A pagina pinta em
   728ms e carrega em 1.062ms, entao o modal aparecia exatamente
   junto com o conteudo — a primeira impressao de quem veio do
   anuncio era uma janela cobrindo a oferta, no navegador embutido
   do Instagram, que e onde a paciencia e menor.

   A barra faz o mesmo trabalho sem nada disso: mostra o desconto,
   fica visivel o tempo todo em vez de aparecer uma vez, e nao
   bloqueia, nao anima na entrada e nao espera nada para renderizar.

   Honestidade, mesma regra de antes: os 35% ja estao no preco
   anunciado. O codigo da NOME a oferta, nao condiciona nada — e por
   isso o texto diz "35% ja aplicado" em vez de sugerir que e preciso
   digitar algo para conseguir.
   ============================================================ */
(function (w, d) {
  'use strict';

  var barra = d.querySelector('[data-cupom]');
  if (!barra) return;

  var botao = barra.querySelector('[data-cupom-copiar]');
  var rotulo = barra.querySelector('[data-cupom-rotulo]');
  var CODIGO = rotulo ? rotulo.textContent.trim() : 'LANCAMENTO35';

  // Aparece no primeiro quadro, sem transicao e sem atraso.
  barra.hidden = false;

  function medir(nome, params) {
    if (typeof w.gtag !== 'function' || !w.BSP_GA4_ID) return;
    params = params || {};
    params.send_to = w.BSP_GA4_ID;
    params.contexto_navegador = (w.bsp && w.bsp.contexto) ? w.bsp.contexto() : 'desconhecido';
    params.transport_type = 'beacon';
    w.gtag('event', nome, params);
  }

  /* O navegador embutido do Instagram nem sempre expoe a area de
     transferencia, e navigator.clipboard exige contexto seguro. A
     selecao do texto e o caminho que funciona em todo lugar, entao
     ela e o fallback — nunca deixar a pessoa sem conseguir copiar. */
  function copiar(texto) {
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(texto);
    }
    return new Promise(function (resolve, reject) {
      try {
        var campo = d.createElement('textarea');
        campo.value = texto;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        d.body.appendChild(campo);
        campo.select();
        campo.setSelectionRange(0, texto.length);
        var ok = d.execCommand && d.execCommand('copy');
        d.body.removeChild(campo);
        ok ? resolve() : reject(new Error('execCommand recusou'));
      } catch (e) { reject(e); }
    });
  }

  if (botao) {
    botao.addEventListener('click', function () {
      copiar(CODIGO)
        .then(function () {
          botao.classList.add('copiado');
          medir('cupom_copiado', { codigo: CODIGO });
          w.setTimeout(function () { botao.classList.remove('copiado'); }, 2200);
        })
        .catch(function () {
          // Nao deu para copiar: pelo menos deixa selecionado.
          if (rotulo && w.getSelection && d.createRange) {
            var faixa = d.createRange();
            faixa.selectNodeContents(rotulo);
            var sel = w.getSelection();
            sel.removeAllRanges();
            sel.addRange(faixa);
          }
          medir('cupom_copia_falhou', { codigo: CODIGO });
        });
    });
  }

  medir('cupom_visto', { codigo: CODIGO });
})(window, document);
