/* ============================================================
   BLUESHIELDPRO — Interações (padrão "Autoridade", preto e branco)

   Saíram em 07/10/2026, porque o padrão de design proíbe: loader,
   cursor personalizado, barra de progresso de rolagem, contadores
   animados (data-count) e o "burst" de nós do hero em canvas. O
   número dos contadores já vem escrito no HTML, então nada some.
   ============================================================ */

// ------------- CONFIGURAÇÃO CENTRAL (edite aqui) -------------
const BSP = {
  // Número do WhatsApp (não é exibido no site — usado só para abrir a conversa)
  whatsapp: '5519998334896',
  whatsappMsg: 'Olá! Vim pelo site da BlueShieldPro e quero conversar sobre um projeto.',

  /* Ações de conversão do Google Ads (AW-17972527330).

     ATENÇÃO: as duas apontam para o MESMO rótulo hoje. No Google Ads isso faz
     lead de formulário e lead de WhatsApp virarem a mesma linha do relatório —
     não dá para saber qual origem traz cliente, e o lance é otimizado no
     escuro para as duas.

     Para separar: Google Ads → Metas → Conversões → Nova ação de conversão →
     Site → "Criar manualmente". Crie duas, uma por origem, e cole aqui o
     rótulo de cada uma (formato AW-17972527330/XXXXXXXXXXXXXXXXXXX). */
  conversaoFormulario: 'AW-17972527330/YEcKCOn7r88cEOKB_PlC',
  conversaoWhatsapp: 'AW-17972527330/YEcKCOn7r88cEOKB_PlC'
};

// Dispara a conversão no Google Ads e o evento de lead no Google Analytics 4.
// Silencioso se o gtag ainda não carregou — nunca quebra a página.
function bspConversao(sendTo, valor, origem) {
  /* Meta vem PRIMEIRO, de proposito.

     O `return` do gtag logo abaixo aborta a funcao inteira quando o Google
     esta bloqueado — e bloqueador de anuncio derruba o gtag com muito mais
     frequencia que o fbevents. Com a chamada do Meta depois do guard, todo
     lead de quem usa bloqueador sumiria dos dois lados em vez de um.

     Antes desta linha o site avisava o Google a cada lead e nunca o Meta:
     campanha de lead no Meta rodava cega, sem evento para otimizar e sem
     custo por lead no Gerenciador. */
  var idEvento = 'Lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  if (typeof fbq === 'function') {
    fbq('track', 'Lead', {
      value: valor,
      currency: 'BRL',
      content_name: origem || 'site'
    }, { eventID: idEvento });
  }

  /* O mesmo Lead tambem pelo servidor, com o MESMO event_id — a Meta funde os
     dois e conta uma vez. Isso atravessa bloqueador de anuncio e ITP, e cobre
     o caso ja medido em 09/09/2026 na Anchorline, onde o fbevents carregava,
     inicializava e nao mandava nada. */
  try {
    fetch('https://blue-skills-api.onrender.com/meta/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        evento: 'Lead',
        event_id: idEvento,
        url: location.href,
        valor: valor,
        moeda: 'BRL',
        conteudo: origem || 'site',
        fbp: (document.cookie.match(/(?:^|; )_fbp=([^;]+)/) || [])[1] || null,
        fbc: (document.cookie.match(/(?:^|; )_fbc=([^;]+)/) || [])[1] || null
      })
    }).catch(function () {});
  } catch (e) {}

  if (typeof gtag !== 'function') return;

  // Google Ads: conversão da campanha.
  gtag('event', 'conversion', { send_to: sendTo, value: valor, currency: 'BRL' });

  // Google Analytics 4: evento de lead. O ID vem de js/google.js.
  if (window.BSP_GA4_ID) {
    gtag('event', 'generate_lead', {
      send_to: window.BSP_GA4_ID,
      value: valor,
      currency: 'BRL',
      method: origem || 'site'
    });
  }
}

/* Autoriza o CSS a esconder os elementos de animacao.

   Enquanto esta classe nao existe, `.reveal` fica visivel: e o que
   garante que uma pagina sem JavaScript, ou com o script quebrado,
   nunca apareca vazia. Fica FORA do DOMContentLoaded de proposito,
   para valer no primeiro quadro em vez de depois do parse. */
document.documentElement.classList.add('js-anima');

/* Rede de seguranca da rede de seguranca.

   Se o bloco de reveal abaixo nunca chegar a rodar (um erro antes dele,
   o arquivo cortado no meio do download), a classe acima ficaria
   escondendo conteudo para sempre. Tres segundos depois, sem o sinal de
   que o reveal ligou, a autorizacao e retirada e tudo aparece. */
window.setTimeout(function () {
  if (!window.__bspRevealLigado) document.documentElement.classList.remove('js-anima');
}, 3000);

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cada bloco roda isolado: um erro em um nao derruba os outros.
  const bloco = (nome, fn) => {
    try { fn(); } catch (err) { if (window.console) console.error('[main.js] ' + nome, err); }
  };

  // ---------- Scroll reveal (primeiro, de proposito) ----------
  bloco('reveal', () => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-zoom, .reveal-grupo, .regua');
    const pendentes = new Set(els);
    window.__bspRevealLigado = true;

    /* `direto` usa `.revelado`, que corta a transicao e escreve o valor
       final. Medido em 08/09 na servicos.html: com a aba em segundo plano,
       `.in` sozinho deixava a opacidade computada em 0, porque transicao
       precisa de quadro e o navegador suspende quadro. */
    const revelar = (el, direto) => {
      if (!pendentes.has(el)) return;
      pendentes.delete(el);
      el.classList.add('in');
      if (direto) el.classList.add('revelado');
    };

    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => revelar(el, true));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { revelar(e.target, false); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });

    /* A régua acende quando a SEÇÃO entra, não quando o filete de 6px
       aparece: o observador vigia o pai dela (o cabeçalho da seção) e
       dispara quando ele passa da linha de 88% da tela. Assim a régua
       cresce logo depois do título, nunca junto com ele. */
    const reguasPorPai = new Map();
    const ioRegua = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        (reguasPorPai.get(e.target) || []).forEach(r => revelar(r, false));
        ioRegua.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

    els.forEach(el => {
      if (!el.classList.contains('regua')) { io.observe(el); return; }
      const pai = el.parentElement || el;
      if (!reguasPorPai.has(pai)) { reguasPorPai.set(pai, []); ioRegua.observe(pai); }
      reguasPorPai.get(pai).push(el);
    });

    /* Piso de tempo, independente do observador.

       O caso real nao e navegador SEM IntersectionObserver: e o que TEM e
       nao dispara (navegador embutido do Instagram, aba em segundo plano).
       setTimeout continua contando nessas situacoes. A partir de 2s, a
       cada segundo, tudo o que ja esta na tela (ou acima dela, pulado por
       um link de ancora) aparece direto. O que esta abaixo continua
       esperando a rolagem, entao a animacao de entrada segue valendo para
       quem rola normalmente. */
    let relogio = null;
    const varrer = () => {
      if (!pendentes.size) { if (relogio) clearInterval(relogio); return; }
      const alt = window.innerHeight || document.documentElement.clientHeight;
      pendentes.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || (r.top < alt * 0.85 && r.bottom > 0)) {
          io.unobserve(el);
          revelar(el, true);
        }
      });
    };
    setTimeout(() => { varrer(); relogio = setInterval(varrer, 1000); }, 2000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) varrer(); });
  });

  // ---------- Links WhatsApp (número oculto) ----------
  bloco('whatsapp', () => {
    const waUrl = `https://wa.me/${BSP.whatsapp}?text=${encodeURIComponent(BSP.whatsappMsg)}`;
    document.querySelectorAll('[data-whats]').forEach(el => {
      el.setAttribute('href', waUrl);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });

    // ---------- Conversão: clique em qualquer CTA de WhatsApp ----------
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href*="wa.me"], [data-whats]');
      if (link) bspConversao(BSP.conversaoWhatsapp, 1.0, 'whatsapp');
    });
  });

  // ---------- Item ativo do menu ----------
  bloco('menu-ativo', () => {
    // Compara pelo nome da página, com ou sem ".html" e com "/" = início,
    // para funcionar tanto com links relativos quanto com URL limpa.
    const nome = caminho => {
      const arq = (caminho || '').split('#')[0].split('?')[0].split('/').pop() || 'index.html';
      return arq.replace(/\.html?$/, '') || 'index';
    };
    const atual = nome(location.pathname);
    document.querySelectorAll('.nav a, .mobile-nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('#') > -1 || /^[a-z]+:/i.test(href)) return;
      if (a.classList.contains('btn')) return;
      if (nome(href) === atual) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  });

  // ---------- Header: recolhe a faixa utilitária depois de 80px ----------
  bloco('header', () => {
    const header = document.querySelector('.header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  // ---------- Menu mobile ----------
  bloco('menu-mobile', () => {
    const burger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    if (!burger || !mobileNav) return;
    const definir = open => {
      mobileNav.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => definir(!mobileNav.classList.contains('open')));
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => definir(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) { definir(false); burger.focus(); }
    });
    // Girou o celular ou abriu a janela com o menu aberto: destrava a rolagem.
    const largo = window.matchMedia('(min-width: 1181px)');
    const aoMudar = ev => { if (ev.matches && mobileNav.classList.contains('open')) definir(false); };
    if (largo.addEventListener) largo.addEventListener('change', aoMudar);
  });

  // ---------- FAQ accordion ----------
  bloco('faq', () => {
    document.querySelectorAll('.faq-item').forEach(item => {
      // <details> abre e fecha sozinho; o acordeão daqui só inverteria o estado.
      if (item.tagName === 'DETAILS') return;
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        item.parentElement.querySelectorAll('.faq-item.open').forEach(o => {
          o.classList.remove('open');
          o.querySelector('.faq-a').style.maxHeight = null;
          o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 'px';
          q.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  // ---------- Formulário de orçamento (Web3Forms) ----------
  bloco('formulario', () => {
    const form = document.querySelector('#form-orcamento');
    if (!form) return;

    /* Formulário em etapas (opcional: <form data-etapas>).
       Sem este script, todas as etapas ficam visíveis e o formulário
       envia direto para o Web3Forms. Com ele, uma etapa por vez, com
       validação antes de avançar. */
    const etapas = form.hasAttribute('data-etapas')
      ? Array.prototype.slice.call(form.querySelectorAll('.form-etapa'))
      : [];
    let atual = 0;
    const barra = form.querySelectorAll('.form-etapas-barra span');

    const erroDe = campo => {
      const caixa = campo.closest('.campo') || campo.parentElement;
      let msg = caixa.querySelector('.campo-erro');
      if (!msg) {
        msg = document.createElement('p');
        msg.className = 'campo-erro';
        msg.id = (campo.id || campo.name || 'campo').replace(/[^a-z0-9_-]/gi, '') + '-erro';
        msg.hidden = true;
        caixa.appendChild(msg);
      }
      return msg;
    };
    const marcar = (campo, invalido) => {
      const msg = erroDe(campo);
      const grupo = campo.closest('.opcoes');
      const alvo = grupo || campo;
      if (invalido) {
        msg.textContent = campo.dataset.erro || (grupo && grupo.dataset.erro) || campo.validationMessage;
        msg.hidden = false;
        alvo.setAttribute('aria-invalid', 'true');
        const desc = (campo.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (desc.indexOf(msg.id) < 0) { desc.push(msg.id); campo.setAttribute('aria-describedby', desc.join(' ')); }
      } else {
        msg.hidden = true;
        alvo.removeAttribute('aria-invalid');
      }
    };
    const validar = escopo => {
      let primeiro = null;
      escopo.querySelectorAll('input, select, textarea').forEach(c => {
        if (c.type === 'hidden' || c.name === 'botcheck' || c.disabled) return;
        const ok = c.checkValidity();
        marcar(c, !ok);
        if (!ok && !primeiro) primeiro = c;
      });
      if (primeiro) primeiro.focus();
      return !primeiro;
    };
    form.addEventListener('input', e => {
      const c = e.target;
      if (c.matches && c.matches('[aria-invalid="true"], .opcoes[aria-invalid="true"] input') && c.checkValidity()) marcar(c, false);
    });
    form.addEventListener('change', e => {
      const c = e.target;
      if (c.type === 'radio' && c.checkValidity()) marcar(c, false);
    });

    const mostrar = (i, focar) => {
      atual = Math.max(0, Math.min(i, etapas.length - 1));
      etapas.forEach((f, n) => f.classList.toggle('is-ativa', n === atual));
      barra.forEach((b, n) => b.classList.toggle('feita', n <= atual));
      if (focar) {
        const alvo = etapas[atual].querySelector('input:not([type="hidden"]), select, textarea');
        if (alvo) alvo.focus();
        else etapas[atual].scrollIntoView({ block: 'start' });
      }
    };

    if (etapas.length) {
      form.setAttribute('novalidate', '');   // a validação passa a ser nossa, por etapa
      form.classList.add('etapas-ligadas');
      mostrar(0, false);
      form.addEventListener('click', e => {
        const seguir = e.target.closest('[data-etapa-seguir]');
        const voltar = e.target.closest('[data-etapa-voltar]');
        if (seguir) { e.preventDefault(); if (validar(etapas[atual])) mostrar(atual + 1, true); }
        if (voltar) { e.preventDefault(); mostrar(atual - 1, true); }
      });
    }

    const moldura = form.closest('[data-form]') || document;
    const sucesso = moldura.querySelector('[data-form-sucesso]');
    const falha = moldura.querySelector('[data-form-erro]');
    const tentar = moldura.querySelector('[data-form-tentar]');
    if (tentar && falha) {
      tentar.addEventListener('click', () => {
        falha.hidden = true;
        form.hidden = false;
        form.style.display = '';
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.focus();
      });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      // Enter numa etapa intermediária avança em vez de enviar.
      if (etapas.length && atual < etapas.length - 1) {
        if (validar(etapas[atual])) mostrar(atual + 1, true);
        return;
      }
      if (etapas.length && !validar(etapas[atual])) return;

      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
          bspConversao(BSP.conversaoFormulario, 1.0, 'formulario_orcamento');
          form.style.display = 'none';
          if (sucesso) {
            sucesso.hidden = false;
            sucesso.focus();
          } else {
            const ok = document.querySelector('.form-success');
            if (ok) ok.classList.add('show');
          }
        } else {
          throw new Error(data.message || 'Falha no envio');
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        if (falha) {
          form.style.display = 'none';
          falha.hidden = false;
          falha.focus();
        } else {
          alert('Não foi possível enviar agora. Tente novamente ou fale com um atendente pelo WhatsApp.');
        }
      }
    });
  });

  // ---------- Ano no rodapé ----------
  bloco('ano', () => {
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });
});
