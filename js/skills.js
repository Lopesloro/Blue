/* ============================================================
   BlueShieldPro — Skills / Planos
   Sem framework. Reproduz o bloco de pricing de referencia:
   entrada em cascata, preco animado, cartao do meio destacado
   e painel de checkout que abre pela direita.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Configuracao ----------------------------------
     Unico lugar para mexer em preco, texto e Stripe.
     ---------------------------------------------------------- */
  var CONFIG = {
    // Ligue quando a assinatura existir de verdade. Enquanto for
    // false, a linha do seletor some e a pagina fica so com o
    // pagamento unico.
    assinatura: false,

    planos: {
      basico:  { nome: 'Básico',  unico: 39.90, mensal: 19.90 },
      medium:  { nome: 'Medium',  unico: 69.90, mensal: 34.90 },
      premium: { nome: 'Premium', unico: 99.90, mensal: 49.90 }
    },

    stripe: {
      // Chave publicavel. Pode ficar no front — ela e publica.
      // Formato: 'pk_test_...' em teste, 'pk_live_...' em producao.
      publishableKey: '',

      // Endpoint do SEU backend que cria a Checkout Session e
      // devolve { clientSecret }. Um site estatico nao pode criar
      // sessao sozinho: a chave secreta nunca vai para o navegador.
      criarSessaoURL: '',

      // Alternativa sem backend: um Payment Link por plano.
      // Se preenchido e criarSessaoURL estiver vazio, o botao
      // redireciona para o link.
      paymentLinks: {
        basico:  'https://buy.stripe.com/aFa8wOfGGgcK2Dp6C46wE00',
        medium:  'https://buy.stripe.com/eVq6oGdyyaSq7XJbWo6wE01',
        premium: 'https://buy.stripe.com/cNi4gy8eed0y4Lxf8A6wE02'
      }
    }
  };

  var brl = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  /* ---------- Entrada em cascata ---------------------------- */
  var grade = document.querySelector('[data-plans]');
  if (!grade) return;
  var cartoes = Array.prototype.slice.call(grade.querySelectorAll('.plan'));

  // A ordem de entrada e do centro para fora: o cartao destacado
  // aparece primeiro e os laterais recuam depois dele.
  var ordem = [1, 0, 2];

  function entrar() {
    ordem.forEach(function (indice, posicao) {
      var cartao = cartoes[indice];
      if (cartao) setTimeout(function () { cartao.classList.add('in'); }, 120 + posicao * 130);
    });
    animarPrecos();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { entrar(); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(grade);
  } else {
    entrar();
  }

  /* ---------- Preco animado --------------------------------
     Substitui o NumberFlow: conta ate o valor com easing e
     mantem duas casas, entao a virgula nao "pula".
     --------------------------------------------------------- */
  function animarPreco(el, de, para) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = brl.format(para);
      return;
    }
    var inicio = null, duracao = 620;
    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min((agora - inicio) / duracao, 1);
      var e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = brl.format(de + (para - de) * e);
      if (t < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  function animarPrecos() {
    cartoes.forEach(function (cartao) {
      var el = cartao.querySelector('[data-price]');
      if (!el) return;
      animarPreco(el, 0, parseFloat(el.dataset.amount));
    });
  }

  /* ---------- Seletor unico / assinatura -------------------- */
  var linhaSeletor = document.querySelector('[data-switch-row]');
  var mensal = false;

  if (CONFIG.assinatura && linhaSeletor) {
    linhaSeletor.hidden = false;
    var botao = linhaSeletor.querySelector('.switch');

    botao.addEventListener('click', function () {
      mensal = !mensal;
      botao.setAttribute('aria-checked', String(mensal));

      cartoes.forEach(function (cartao) {
        var chave = cartao.dataset.plan;
        var plano = CONFIG.planos[chave];
        if (!plano) return;

        var el = cartao.querySelector('[data-price]');
        var atual = parseFloat(el.textContent.replace(/\./g, '').replace(',', '.')) || 0;
        var alvo = mensal ? plano.mensal : plano.unico;

        el.dataset.amount = String(alvo);
        animarPreco(el, atual, alvo);

        var nota = cartao.querySelector('[data-period]');
        if (nota) nota.textContent = mensal ? 'por mês, cancele quando quiser' : 'pagamento único';
      });
    });
  }

  /* ---------- Painel de checkout ---------------------------- */
  var painel   = document.querySelector('[data-checkout-panel]');
  var fundo    = document.querySelector('[data-checkout-backdrop]');
  var fechar   = document.querySelector('[data-checkout-close]');
  var sumPlano = document.querySelector('[data-sum-plan]');
  var sumTotal = document.querySelector('[data-sum-total]');
  var pendente = document.querySelector('[data-checkout-pending]');
  var montagem = document.getElementById('checkout-mount');

  var focoAnterior = null;
  var checkoutStripe = null;

  function abrir(chave) {
    var plano = CONFIG.planos[chave];
    if (!plano || !painel) return;

    var valor = mensal ? plano.mensal : plano.unico;

    sumPlano.textContent = plano.nome;
    sumTotal.textContent = 'R$ ' + brl.format(valor) + (mensal ? ' /mês' : '');

    focoAnterior = document.activeElement;

    fundo.hidden = false; painel.hidden = false;
    requestAnimationFrame(function () {
      fundo.classList.add('open');
      painel.classList.add('open');
      document.body.classList.add('checkout-open');
      document.body.style.overflow = 'hidden';
      fechar.focus();
    });

    iniciarStripe(chave);
  }

  function fecharPainel() {
    if (!painel || painel.hidden) return;
    fundo.classList.remove('open');
    painel.classList.remove('open');
    document.body.classList.remove('checkout-open');
    document.body.style.overflow = '';

    setTimeout(function () {
      fundo.hidden = true; painel.hidden = true;
      if (checkoutStripe) { checkoutStripe.destroy(); checkoutStripe = null; }
      if (focoAnterior) focoAnterior.focus();
    }, 420);
  }

  document.querySelectorAll('[data-buy]').forEach(function (b) {
    b.addEventListener('click', function () { abrir(b.dataset.buy); });
  });
  if (fechar) fechar.addEventListener('click', fecharPainel);
  if (fundo)  fundo.addEventListener('click', fecharPainel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharPainel();
  });

  /* ---------- Stripe ----------------------------------------
     Tres estados possiveis, nesta ordem de preferencia:
     1. Backend configurado  -> Embedded Checkout dentro do painel.
     2. So Payment Link      -> redireciona para o link do plano.
     3. Nada configurado     -> painel mostra o aviso pendente.
     --------------------------------------------------------- */
  /* ---------- Atribuicao da Meta ----------------------------
     O Purchase nao pode sair do navegador: a compra termina no
     dominio da Stripe, onde nosso pixel nao roda. Quem manda o
     Purchase e o blue-skills-api pela Conversions API. O que o
     navegador tem de exclusivo — os cookies _fbp e _fbc — segue
     junto no client_reference_id e chega ao servidor pelo webhook.
     Sem isso o evento chega sem pareamento de clique e o Gerenciador
     nao consegue creditar a venda ao anuncio certo.
     --------------------------------------------------------- */
  function comAtribuicao(url) {
    var ref = (window.bsp && window.bsp.refAtribuicao) ? window.bsp.refAtribuicao() : '';
    if (!ref) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'client_reference_id=' + ref;
  }

  function rastrearInicio(chave) {
    var plano = CONFIG.planos[chave];
    if (!plano) return;
    var valor = mensal ? plano.mensal : plano.unico;

    // Google Analytics 4: mesma intencao, vocabulario da casa.
    if (typeof window.gtag === 'function' && window.BSP_GA4_ID) {
      window.gtag('event', 'begin_checkout', {
        send_to: window.BSP_GA4_ID,
        value: valor,
        currency: 'BRL',
        items: [{ item_id: chave, item_name: 'Skills de IA — ' + plano.nome, price: valor, quantity: 1 }]
      });
    }

    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'InitiateCheckout', {
      content_name: 'Skills de IA — ' + plano.nome,
      content_ids: [chave],
      content_type: 'product',
      value: valor,
      currency: 'BRL'
    });
  }

  /* ---------- Barra fixa de compra ---------------------------
     Reusa o mesmo [data-buy] dos cartoes, entao o painel de
     checkout, o InitiateCheckout e a atribuicao saem iguais.

     A visibilidade NAO depende de evento de rolagem nem de o
     observador continuar disparando. Ja levamos esse prejuizo uma
     vez nesta pagina: dentro do navegador embutido do Instagram, o
     que dependia de rolagem para aparecer simplesmente nao
     apareceu. Aqui a barra nasce visivel e so some enquanto os
     cartoes de preco estao na tela — dois botoes de compra na
     mesma tela competem entre si. Se o observador nunca disparar,
     sobra um botao de compra. Se a regra fosse ao contrario,
     faltaria o unico.
     ----------------------------------------------------------- */
  var barra = document.querySelector('[data-compra-fixa]');
  if (barra) {
    barra.hidden = false;
    barra.setAttribute('data-visivel', '');

    var precos = document.getElementById('precos');
    if (precos && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        if (entradas[0].isIntersecting) barra.removeAttribute('data-visivel');
        else barra.setAttribute('data-visivel', '');
      }, { threshold: 0 }).observe(precos);
    }
  }

  /* ---------- De onde veio o clique de compra -----------------
     Sem isso nao da para saber se a barra fixa e o CTA do topo
     pagam o espaco que ocupam. O evento vai junto com o
     begin_checkout, no mesmo vocabulario da casa.
     ----------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest('[data-cta]');
    if (!alvo) return;
    if (typeof window.gtag !== 'function' || !window.BSP_GA4_ID) return;
    window.gtag('event', 'clique_cta', {
      send_to: window.BSP_GA4_ID,
      origem: alvo.getAttribute('data-cta')
    });
  });

  function iniciarStripe(chave) {
    var s = CONFIG.stripe;

    // Sem backend, mas com Payment Link: o painel continua sendo o
    // resumo do pedido e leva para o pagamento em um clique. Link da
    // Stripe nao pode ser embutido em iframe, entao a saida e navegar.
    if (!s.criarSessaoURL && s.paymentLinks[chave]) {
      pendente.hidden = true;
      montagem.innerHTML = '';

      var ir = document.createElement('a');
      ir.className = 'btn btn-primary btn-lg btn-arrow';
      ir.style.width = '100%';
      ir.style.justifyContent = 'center';
      ir.href = comAtribuicao(s.paymentLinks[chave]);
      ir.textContent = 'Ir para o pagamento seguro';

      // A pessoa esta saindo do site: o InitiateCheckout precisa
      // sair agora, nao no clique, porque a navegacao pode cortar
      // a requisicao do pixel pela metade.
      rastrearInicio(chave);

      var nota = document.createElement('p');
      nota.className = 'checkout-pending';
      nota.style.marginTop = '16px';
      nota.textContent = 'Você será levado ao ambiente da Stripe para concluir. '
        + 'O acesso chega no e-mail informado lá.';

      montagem.appendChild(ir);
      montagem.appendChild(nota);
      return;
    }

    if (!s.publishableKey || !s.criarSessaoURL) return; // segue no aviso

    pendente.hidden = true;

    function montar() {
      var stripe = window.Stripe(s.publishableKey);
      fetch(s.criarSessaoURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: chave, recorrente: mensal })
      })
        .then(function (r) { return r.json(); })
        .then(function (dados) {
          return stripe.initEmbeddedCheckout({ clientSecret: dados.clientSecret });
        })
        .then(function (c) { checkoutStripe = c; c.mount('#checkout-mount'); })
        .catch(function () {
          pendente.hidden = false;
          pendente.textContent = 'Não foi possível abrir o pagamento agora. Tente novamente em instantes.';
        });
    }

    if (window.Stripe) { montar(); return; }

    var tag = document.createElement('script');
    tag.src = 'https://js.stripe.com/v3/';
    tag.onload = montar;
    tag.onerror = function () { pendente.hidden = false; };
    document.head.appendChild(tag);
  }
})();
