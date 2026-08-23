/* ============================================================
   BlueShieldPro — Pagina de pos-compra
   Duas tarefas: dizer qual plano a pessoa comprou e disparar o
   Purchase do pixel com o mesmo identificador que o servidor usa.
   ============================================================ */
(function () {
  'use strict';

  var PLANOS = {
    basico:  { nome: 'Básico',  valor: 39.90 },
    medium:  { nome: 'Medium',  valor: 69.90 },
    premium: { nome: 'Premium', valor: 99.90 }
  };

  var params = new URLSearchParams(window.location.search);

  /* A Stripe substitui {CHECKOUT_SESSION_ID} na URL de retorno. E o mesmo id
     que chega no webhook, e que o blue-skills-api usa como event_id na
     Conversions API. Repetindo o valor aqui, a Meta entende que o Purchase do
     navegador e o do servidor sao o MESMO evento e conta uma venda, nao duas.
     Sem isso o Gerenciador dobra o resultado e o ROAS vira ficcao. */
  var sessionId = params.get('session_id') || '';
  var chave = params.get('plano') || '';
  var plano = PLANOS[chave];

  var nome = document.querySelector('[data-plano-nome]');
  if (nome && plano) nome.textContent = plano.nome;

  /* Identificador do pedido a vista: se a pessoa precisar acionar o suporte
     antes de o e-mail chegar, ela tem o que citar. */
  var ref = document.querySelector('[data-ref]');
  if (ref && sessionId) {
    ref.textContent = 'Referência do pedido: ' + sessionId;
    ref.hidden = false;
  }

  if (typeof window.fbq !== 'function') return;

  // Sem session_id nao ha como deduplicar. Nesse caso o servidor ja manda o
  // Purchase pela Conversions API e o navegador fica quieto, em vez de contar
  // a mesma venda duas vezes.
  if (!sessionId) return;

  var evento = {
    content_name: plano ? 'Skills de IA — ' + plano.nome : 'Skills de IA',
    content_type: 'product',
    currency: 'BRL'
  };
  if (chave) evento.content_ids = [chave];
  if (plano) evento.value = plano.valor;

  window.fbq('track', 'Purchase', evento, { eventID: sessionId });
})();
