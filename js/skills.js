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
      // Reserva silenciosa. NAO e mais o caminho principal: o
      // Mercado Pago passou na frente porque a Stripe nao libera
      // Pix para esta conta. Estes links so entram se a criacao do
      // checkout falhar — servico dormindo, rede caindo. Ficam
      // porque "nao consegui pagar" custa uma venda, e manter uma
      // reserva que ja funciona custa tres linhas.
      paymentLinks: {
        basico:  'https://buy.stripe.com/aFa8wOfGGgcK2Dp6C46wE00',
        medium:  'https://buy.stripe.com/eVq6oGdyyaSq7XJbWo6wE01',
        premium: 'https://buy.stripe.com/cNi4gy8eed0y4Lxf8A6wE02'
      }
    },

    /* Caminho principal de pagamento. O backend monta o checkout e
       devolve a URL; o site nunca vê token nenhum. */
    mercadoPago: {
      criarURL: 'https://blue-skills-api.onrender.com/mercadopago/preferencia'
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

  /* ---------- Ida direta para o pagamento -------------------
     Enquanto o site roda por Payment Link, o painel nao tinha o
     que mostrar alem de um resumo e um SEGUNDO botao. Esse clique
     extra acontece dentro do navegador embutido do Instagram, que
     e onde mais se perde gente — e ninguem media quantos passavam
     dele: entre o begin_checkout e a compra nao havia evento
     nenhum. Em 6 dias, 10 pessoas clicaram num plano e zero
     compraram, sem nenhum dado para dizer onde o funil quebrava.

     Agora o clique no plano leva direto para a Stripe e dispara
     `ida_pagamento` antes de sair. O proximo numero responde a
     pergunta que a gente nao conseguia responder: das pessoas que
     escolhem um plano, quantas chegam a ver a tela de pagamento.

     O painel continua existindo para o caminho do Embedded
     Checkout, que precisa de um lugar para montar.
     ----------------------------------------------------------- */
  function medirIda(chave, provedor) {
    if (typeof window.gtag !== 'function' || !window.BSP_GA4_ID) return;
    window.gtag('event', 'ida_pagamento', {
      send_to: window.BSP_GA4_ID,
      plano: chave,
      provedor: provedor,
      contexto_navegador: (window.bsp && window.bsp.contexto) ? window.bsp.contexto() : 'desconhecido'
    });
  }

  /* ---------- Mercado Pago, numa aba nova -------------------
     A Stripe nao libera Pix para esta conta — `pix` e `boleto`
     voltam com "available": false na configuracao de meios de
     pagamento, que e elegibilidade negada e nao opcao desmarcada.
     E em 02/09 a medicao isolou a perda exatamente ali: o funil
     ate o checkout ficou 1:1, todo mundo que escolhia um plano
     chegava a tela de pagamento, e ninguem pagava. Cobrar so
     cartao de um publico brasileiro vindo do Instagram e escolher
     perder metade.

     ABA NOVA, e nao navegacao: a pagina de venda continua viva
     atras. Se a pessoa desistir do pagamento, ela fecha a aba e
     esta de volta onde parou, com o plano ainda escolhido — em
     vez de ter sido levada embora do site e precisar voltar.

     A armadilha aqui e o bloqueador de pop-up: `window.open`
     chamado depois de um `await` perde o vinculo com o clique e o
     navegador bloqueia. Por isso a aba e aberta VAZIA no mesmo
     instante do clique, ainda dentro do gesto do usuario, e so
     depois recebe o endereco. Se mesmo assim vier bloqueada, o
     caminho degrada para navegacao na propria aba — nunca para
     "nao aconteceu nada".
     ----------------------------------------------------------- */
  /* ---------- Checkout preparado antes do clique ------------
     O backend responde em 0,3 a 0,6 segundo. Nao e lento, mas e tempo
     morto que acontece DEPOIS do clique, com a aba ja aberta em
     branco — e meio segundo de tela vazia logo apos decidir comprar
     e onde a duvida volta.

     Entao a preferencia e criada quando a pessoa CHEGA nos precos,
     nao quando ela clica. Quando o clique vem, a URL ja esta pronta
     e a aba abre direto no destino, sem passar por branco.

     Uma preferencia por plano, criada uma vez por visita. Preferencia
     que ninguem usa simplesmente expira do lado da Mercado Pago —
     nao cobra nada e nao suja relatorio. */
  var checkoutPronto = {};
  var checkoutPedido = {};

  function prepararCheckout(chave) {
    var mp = CONFIG.mercadoPago;
    if (!mp || !mp.criarURL) return;
    if (checkoutPronto[chave] || checkoutPedido[chave]) return;
    checkoutPedido[chave] = true;

    var ref = (window.bsp && window.bsp.refAtribuicao) ? window.bsp.refAtribuicao() : '';
    fetch(mp.criarURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: chave, ref: ref })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
      .then(function (dados) { if (dados && dados.url) checkoutPronto[chave] = dados.url; })
      .catch(function () { checkoutPedido[chave] = false; });   // deixa tentar de novo no clique
  }

  /* Dispara quando os precos entram na tela: e o momento em que a
     pessoa passa a considerar comprar, e sobra tempo de rede ate ela
     escolher um plano. */
  (function observarPrecos() {
    var alvo = document.getElementById('precos');
    if (!alvo || !window.IntersectionObserver) return;
    var obs = new IntersectionObserver(function (entradas) {
      if (!entradas.some(function (e) { return e.isIntersecting; })) return;
      obs.disconnect();
      Object.keys(CONFIG.planos).forEach(prepararCheckout);
    }, { threshold: 0.2 });
    obs.observe(alvo);
  })();

  function pagarComMercadoPago(chave) {
    var mp = CONFIG.mercadoPago;
    if (!mp || !mp.criarURL) return false;

    rastrearInicio(chave);

    /* Caminho rapido: o checkout ja estava pronto, entao a aba abre
       direto no destino. Zero espera, zero tela em branco. */
    var jaPronto = checkoutPronto[chave];
    if (jaPronto) {
      medirIda(chave, 'mercadopago-pronto');
      var direta = window.open(jaPronto, '_blank');
      if (!direta) window.location.href = jaPronto;   // pop-up bloqueado
      return true;
    }

    medirIda(chave, 'mercadopago');

    // Precisa ser sincrono, dentro do gesto do clique.
    var aba = window.open('', '_blank');
    if (aba && aba.document) {
      aba.document.write('<!doctype html><meta charset="utf-8">'
        + '<title>Abrindo o pagamento…</title>'
        + '<body style="margin:0;display:grid;place-items:center;height:100vh;'
        + 'background:#0B0B0B;color:#C7C7C7;font:15px/1.5 system-ui,sans-serif">'
        + 'Abrindo o pagamento seguro…</body>');
    }

    var ref = (window.bsp && window.bsp.refAtribuicao) ? window.bsp.refAtribuicao() : '';

    fetch(mp.criarURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: chave, ref: ref })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); })
      .then(function (dados) {
        if (!dados || !dados.url) return Promise.reject(new Error('sem url'));
        if (aba) aba.location.href = dados.url;
        else window.location.href = dados.url;   // pop-up bloqueado
      })
      .catch(function () {
        if (aba) aba.close();
        // Rede caiu ou o servico esta dormindo. A venda nao pode
        // depender disso: cai para o caminho que ja funcionava.
        var reserva = CONFIG.stripe.paymentLinks[chave];
        if (reserva) {
          medirIda(chave, 'stripe-reserva');
          window.location.href = comAtribuicao(reserva);
        }
      });

    return true;
  }

  function irDiretoAoPagamento(chave) {
    if (pagarComMercadoPago(chave)) return true;

    var s = CONFIG.stripe;
    if (s.criarSessaoURL || !s.paymentLinks[chave]) return false;

    rastrearInicio(chave);
    medirIda(chave, 'stripe');

    var destino = comAtribuicao(s.paymentLinks[chave]);

    // Os eventos saem por beacon, mas o pixel nem sempre. Uma pausa
    // curta garante que a requisicao parta antes da navegacao matar
    // a pagina; 300ms nao e percebido como espera.
    setTimeout(function () { window.location.href = destino; }, 300);
    return true;
  }

  var w2 = window;

  /* O painel voltou, e a razao mudou. Antes ele era um resumo com um
     SEGUNDO botao para sair do site — clique extra sem funcao, e foi
     por isso que saiu. Agora ele e onde o pagamento acontece: mostra o
     que entra no pacote (a tela do Mercado Pago mostra so titulo e
     total) e gera o Pix aqui dentro, sem mandar ninguem para o
     aplicativo do Mercado Livre. */
  function abrir(chave, origem) {
    var plano = CONFIG.planos[chave];
    if (!plano || !painel) return;

    /* Clique no corpo do cartao nao vale como inicio de checkout.

       O cartao virou clicavel em 03/09 para recuperar clique morto — 30%
       dos visitantes clicavam nele e nada acontecia. So que `abrir()`
       dispara o InitiateCheckout, entao da noite para o dia o mesmo
       clique que era registrado como frustracao passou a ser registrado
       como intencao de compra, e a serie deixou de ser comparavel com o
       que veio antes.

       Ele continua abrindo o painel, mas com evento proprio. Quem
       declara intencao e quem aperta o botao. */
    if (origem === 'cartao') {
      if (typeof w2.gtag === 'function' && w2.BSP_GA4_ID) {
        w2.gtag('event', 'abriu_painel_cartao', {
          send_to: w2.BSP_GA4_ID,
          plano: chave,
          transport_type: 'beacon'
        });
      }
    } else {
      rastrearInicio(chave);
    }
    if (w2.bsp && typeof w2.bsp.descreverPlano === 'function') w2.bsp.descreverPlano(chave);

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
    /* Nada de iniciarStripe aqui. O Embedded Checkout da Stripe montava
       num #checkout-mount que deixou de existir quando o painel virou o
       lugar do pagamento — chamar isso agora so lanca excecao em cima do
       painel que acabou de abrir. Quem paga aqui e o pagamento.js. */
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

  /* Cartao e boleto continuam no Checkout Pro. O pagamento.js chama
     isto quando a pessoa escolhe esse caminho. */
  w2.bsp = w2.bsp || {};
  w2.bsp.abrirCheckoutPro = function (chave) {
    if (!chave) return;
    pagarComMercadoPago(chave);
  };

  document.querySelectorAll('[data-buy]').forEach(function (b) {
    b.addEventListener('click', function () { abrir(b.dataset.buy); });
  });

  /* O cartao inteiro do plano abre o painel, nao so o botao.

     Em 03/09 o `clique_morto` disparou 24 vezes em 52 visitas — quase um
     clique perdido a cada duas pessoas. Os maiores blocos nao clicaveis
     da pagina sao justamente as listas de itens dentro dos tres cartoes
     de plano, com 63 a 82 mil pixels cada. Cartao de preco tem forma de
     coisa clicavel: a pessoa clica no plano, nao no botao, nao acontece
     nada, e ela conclui que a pagina esta quebrada.

     Duas guardas: clique em link ou botao dentro do cartao segue o seu
     proprio caminho, e clique que termina com texto selecionado nao
     conta — quem estava lendo e marcou uma frase nao pediu para abrir
     pagamento nenhum. */
  document.querySelectorAll('.plan').forEach(function (cartao) {
    var botao = cartao.querySelector('[data-buy]');
    if (!botao) return;
    cartao.addEventListener('click', function (e) {
      if (e.target.closest('a,button,input,select,textarea,[role="button"],[data-buy]')) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length > 2) return;
      abrir(botao.dataset.buy, 'cartao');
    });
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

  /* Um InitiateCheckout por plano, por visita.

     A funcao e chamada de tres lugares — abrir o painel, sair para o
     Checkout Pro e o caminho antigo da Stripe — e o caminho do cartao
     passava por dois deles em sequencia, contando a mesma pessoa duas
     vezes. Deu para ver no GA4 de 03/09: 16 begin_checkout para 9
     pessoas, 1,8 evento por pessoa.

     Evento inflado nao e so relatorio errado. A Meta otimiza pelo
     InitiateCheckout: contar duas vezes ensina ela a perseguir quem
     abre painel, e o custo por evento aparece pela metade do que e. */
  var inicioContado = {};

  function rastrearInicio(chave) {
    var plano = CONFIG.planos[chave];
    if (!plano) return;
    if (inicioContado[chave]) return;
    inicioContado[chave] = true;
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
