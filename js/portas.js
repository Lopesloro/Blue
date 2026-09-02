/* ============================================================
   BlueShieldPro — as tres portas da oferta de lancamento

   Por que isto existe: em 3 dias de anuncio, 89 cliques trouxeram
   73 visitas e 10 idas ao pagamento. A medicao mostrava 27% das
   sessoes rolando a pagina — a maioria de quem pagamos para trazer
   ia embora sem nunca ver o preco.

   O jogo resolve dois problemas de uma vez. Ele da a primeira
   micro-decisao da visita (escolher uma porta custa nada e ja
   engaja), e termina levando a pessoa exatamente para os planos,
   que e para onde ela precisa ir.

   HONESTIDADE, que aqui e regra e nao preferencia: a oferta de 35%
   e real, publica na propria pagina e vale ate 30/09 para todo
   mundo. Por isso nada neste arquivo fala em sorte, chance, "voce
   ganhou" ou "so uma porta tem". Nao ha aposta: ha uma escolha de
   por onde entrar. Prometer probabilidade que nao existe seria
   propaganda enganosa, e nao e o que estamos fazendo.

   Aparece uma vez por navegador. Quem ja escolheu nao ve de novo.
   ============================================================ */
(function (w, d) {
  'use strict';

  var CHAVE = 'bsp_portas_2026_09';
  var ATRASO = 700;      // deixa a pagina pintar antes de interromper
  var VALIDADE = 7 * 24 * 60 * 60 * 1000;   // 7 dias

  /* `?portas=1` na URL forca a exibicao, ignorando a marca. Existe
     porque quem construiu a pagina precisa ver de novo sem limpar
     dados do navegador, e porque "sumiu" e indistinguivel de
     "quebrou" quando nao ha como forcar. */
  var FORCAR = /[?&]portas=1\b/.test(location.search);

  var caixa = d.querySelector('[data-portas]');
  var precos = d.getElementById('precos');
  if (!caixa || !precos) return;

  /* localStorage lanca excecao em janela anonima de alguns
     navegadores. Falhar aqui nao pode derrubar a pagina de venda:
     no pior caso a pessoa ve o jogo de novo, o que e inofensivo. */
  /* Antes a marca era permanente: quem escolhesse uma porta nunca mais
     via o jogo. Isso deixa de fora justamente quem volta — a pessoa que
     viu, nao comprou e voltou dias depois e a que mais precisa ser
     lembrada da oferta. Sete dias e curto o bastante para nao irritar
     quem volta na mesma semana e longo o bastante para nao repetir na
     mesma visita. */
  function jaViu() {
    if (FORCAR) return false;
    try {
      var marca = w.localStorage.getItem(CHAVE);
      if (!marca) return false;
      var quando = parseInt(marca, 10);
      if (!quando) return true;                    // marca antiga, formato '1'
      return (Date.now() - quando) < VALIDADE;
    } catch (e) { return false; }
  }
  function marcarVisto() {
    try { w.localStorage.setItem(CHAVE, String(Date.now())); } catch (e) {}
  }

  function medir(nome, params) {
    if (typeof w.gtag !== 'function' || !w.BSP_GA4_ID) return;
    params = params || {};
    params.send_to = w.BSP_GA4_ID;
    params.contexto_navegador = (w.bsp && w.bsp.contexto) ? w.bsp.contexto() : 'desconhecido';
    params.transport_type = 'beacon';
    w.gtag('event', nome, params);
  }

  var focoAnterior = null;
  var aberto = false;
  var escolhida = false;

  function abrir() {
    if (aberto || jaViu()) return;
    aberto = true;
    focoAnterior = d.activeElement;
    caixa.hidden = false;
    d.body.classList.add('portas-abertas');
    w.requestAnimationFrame(function () { caixa.classList.add('em'); });
    var primeira = caixa.querySelector('.porta');
    if (primeira) primeira.focus();
    medir('portas_abriu');
  }

  function fechar(motivo) {
    if (!aberto) return;
    aberto = false;
    caixa.classList.remove('em');
    d.body.classList.remove('portas-abertas');
    marcarVisto();
    w.setTimeout(function () { caixa.hidden = true; }, 340);
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
    medir('portas_fechou', { motivo: motivo, escolheu: escolhida ? 'sim' : 'nao' });
  }

  function irParaPrecos() {
    fechar('seguiu');
    w.setTimeout(function () {
      precos.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
  }

  function escolher(porta) {
    if (escolhida) return;
    escolhida = true;

    var numero = porta.getAttribute('data-porta');
    caixa.classList.add('revelado');
    porta.classList.add('aberta');

    // As outras recuam para a atencao ficar no que foi revelado.
    Array.prototype.forEach.call(caixa.querySelectorAll('.porta'), function (p) {
      p.setAttribute('aria-disabled', 'true');
      if (p !== porta) p.classList.add('recuada');
    });

    medir('portas_escolheu', { porta: numero });
  }

  Array.prototype.forEach.call(caixa.querySelectorAll('.porta'), function (porta) {
    porta.addEventListener('click', function () { escolher(porta); });
    porta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(porta); }
    });
  });

  var seguir = caixa.querySelector('[data-portas-seguir]');
  if (seguir) seguir.addEventListener('click', irParaPrecos);

  var fecha = caixa.querySelector('[data-portas-fechar]');
  if (fecha) fecha.addEventListener('click', function () { fechar('fechou'); });

  var fundo = caixa.querySelector('[data-portas-fundo]');
  if (fundo) fundo.addEventListener('click', function () { fechar('fundo'); });

  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && aberto) fechar('escape');
  });

  if (jaViu()) return;
  w.setTimeout(abrir, ATRASO);
})(window, document);
