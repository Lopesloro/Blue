/* ============================================================
   BlueShieldPro — Pagina de pos-compra
   Duas tarefas: dizer qual plano a pessoa comprou e disparar o
   Purchase do pixel com o mesmo identificador que o servidor usa.
   ============================================================ */
(function () {
  'use strict';

  var PLANOS = {
    basico:  { nome: 'Analista',   valor: 69.90 },
    medium:  { nome: 'Gestor',     valor: 149.90 },
    premium: { nome: 'Empresário', valor: 299.90 }
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

  /* ---------- Google ----------------------------------------
     O GA4 aceita o evento de compra sem configuracao nenhuma, entao ele
     dispara ja. O Google Ads exige um rotulo de acao de conversao, que so
     existe depois de criada no painel: enquanto BSP_ADS_COMPRA estiver
     vazio, nada e enviado e nenhum erro aparece.

     transaction_id e o mesmo id de sessao usado no Purchase da Meta. E o que
     impede a mesma venda de ser contada duas vezes se a pessoa recarregar
     esta pagina. */
  var BSP_ADS_COMPRA = ''; // ex.: 'AW-17972527330/AbCdEfGhIj_kLmNoPqR'

  if (typeof window.gtag === 'function' && sessionId) {
    var itens = [{
      item_id: chave || 'skills',
      item_name: plano ? 'Skills de IA — ' + plano.nome : 'Skills de IA',
      price: plano ? plano.valor : undefined,
      quantity: 1
    }];

    if (window.BSP_GA4_ID) {
      window.gtag('event', 'purchase', {
        send_to: window.BSP_GA4_ID,
        transaction_id: sessionId,
        value: plano ? plano.valor : undefined,
        currency: 'BRL',
        items: itens
      });
    }

    if (BSP_ADS_COMPRA) {
      window.gtag('event', 'conversion', {
        send_to: BSP_ADS_COMPRA,
        transaction_id: sessionId,
        value: plano ? plano.valor : undefined,
        currency: 'BRL'
      });
    }
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

/* ---------- Pago x pendente ------------------------------
   O Pix manda a pessoa para esta pagina duas vezes: uma quando ela
   GERA o codigo (estado=pendente, nada pago ainda) e outra quando o
   pagamento cai. O texto padrao da pagina confirma a compra, e
   confirmar compra que nao aconteceu e o tipo de erro que a pessoa
   nao esquece — ela espera o e-mail, nao recebe, e conclui que foi
   enganada.

   Os passos de instalacao so aparecem no estado pago: instrucao de
   uso antes de existir acesso e ruido.
   --------------------------------------------------------- */
(function (w, d) {
  'use strict';
  var params = new URLSearchParams(w.location.search);
  var pendente = params.get('estado') === 'pendente'
    || params.get('status') === 'pending'
    || params.get('collection_status') === 'pending';

  var instalar = d.querySelector('[data-instalar]');
  var rotulo = d.querySelector('[data-estado-rotulo]');
  var titulo = d.querySelector('[data-estado-titulo]');
  var texto  = d.querySelector('[data-estado-texto]');

  if (!pendente) {
    if (instalar) instalar.hidden = false;
    return;
  }

  // O titulo da aba tambem confirmava a compra. E a unica coisa que
  // sobra visivel quando a pessoa troca de aba para abrir o banco.
  d.title = 'Aguardando o pagamento · BlueShieldPro';
  if (rotulo) rotulo.textContent = 'Aguardando o pagamento';
  if (titulo) titulo.textContent = 'Falta só o pagamento cair.';
  if (texto) {
    texto.innerHTML = 'Assim que o Pix for confirmado — normalmente em segundos — '
      + 'enviamos o acesso para o e-mail informado no pagamento. '
      + '<b style="color:var(--text-1);">Não é preciso fazer mais nada nesta página.</b> '
      + 'Se você fechou o código antes de pagar, é só voltar aos planos e gerar outro.';
  }
})(window, document);
