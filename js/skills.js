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
      ir.href = s.paymentLinks[chave];
      ir.textContent = 'Ir para o pagamento seguro';

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
