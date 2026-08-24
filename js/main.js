/* ============================================================
   BLUESHIELDPRO — Interações + animação (design "mono")
   ============================================================ */

// ------------- CONFIGURAÇÃO CENTRAL (edite aqui) -------------
const BSP = {
  // Número do WhatsApp (não é exibido no site — usado só para abrir a conversa)
  whatsapp: '5519998334896',
  whatsappMsg: 'Olá! Visitei o site da BlueShieldPro e quero falar com um atendente sobre um projeto.',

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

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pagina de venda: sem cursor custom nem canvas de fundo. Sao enfeites que
  // custam quadro numa pagina cujo unico trabalho e mostrar preco e botao.
  const paginaDeVenda = document.body.dataset.pagina === 'venda';

  // ---------- Loader ----------
  const loader = document.querySelector('.loader');
  if (loader) {
    requestAnimationFrame(() => loader.classList.add('hidden'));
    setTimeout(() => loader.classList.add('hidden'), 800);
  }

  // ---------- Links WhatsApp (número oculto) ----------
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

  // ---------- Item ativo do menu ----------
  const page = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav a, .mobile-nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  // ---------- Header scroll + progress ----------
  const header = document.querySelector('.header');
  const progress = document.querySelector('.scroll-progress');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Menu mobile ----------
  const burger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      burger.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  // ---------- Scroll reveal ----------
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-zoom');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // ---------- Contadores animados ----------
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const dur = 1600;
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.firstChild.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(tick);
          else el.firstChild.textContent = target;
        };
        el.innerHTML = '0<span class="plus">' + suffix + '</span>';
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => cio.observe(el));
  }

  // ---------- FAQ accordion ----------
  document.querySelectorAll('.faq-item').forEach(item => {
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

  // ---------- Cursor personalizado ----------
  if (!paginaDeVenda && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .card, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });
  }

  // ---------- HERO — burst radial de nós conectados ----------
  // Constelação radial: pontos brancos de tamanhos variados ligados por raios
  // finos a um núcleo central + teias entre vizinhos. Reage sutilmente ao mouse.
  const heroCanvas = document.querySelector('.hero-nodes');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, cx = 0, cy = 0;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const N = isMobile ? 46 : 88;              // nós
    let mouseX = 0, mouseY = 0, tmx = 0, tmy = 0;

    // Modelo de cada nó: ângulo, distância base, raio, fase de "respiração"
    const nodes = Array.from({ length: N }, (_, i) => {
      const ang = Math.random() * Math.PI * 2;
      // distribuição de distância: mistura curto/longo (mais denso perto do centro)
      const t = Math.pow(Math.random(), 0.7);
      return {
        ang,
        dist: t,                                // 0..1 (multiplicado por raio depois)
        size: Math.random() * 2.6 + 0.6 + (t > 0.75 ? Math.random() * 2 : 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        sortA: ang
      };
    }).sort((a, b) => a.sortA - b.sortA);        // ordena por ângulo p/ teia entre vizinhos

    const resize = () => {
      const rect = heroCanvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      heroCanvas.width = W * dpr; heroCanvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * 0.52; cy = H * 0.5;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('load', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    // ResizeObserver: garante medir o container real mesmo quando o layout muda
    // (stack mobile -> desktop, orientação) sem depender só do evento window.resize.
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(heroCanvas);

    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('mousemove', e => {
        const rect = heroCanvas.getBoundingClientRect();
        tmx = ((e.clientX - rect.left) / rect.width - 0.5);
        tmy = ((e.clientY - rect.top) / rect.height - 0.5);
      }, { passive: true });
    }

    const maxR = () => Math.min(W, H) * 0.46;

    const positions = new Array(N);
    const render = (time) => {
      // O tamanho do buffer e sincronizado pelo ResizeObserver acima. Medir
      // getBoundingClientRect() aqui dentro forcaria um reflow sincrono a cada
      // quadro — era a maior tarefa longa da pagina no Lighthouse.
      const R = maxR();
      // parallax suave do mouse
      mouseX += (tmx - mouseX) * 0.06;
      mouseY += (tmy - mouseY) * 0.06;
      const ox = mouseX * 26, oy = mouseY * 26;
      const rot = reduceMotion ? 0 : time * 0.00002;   // rotação lenta global

      ctx.clearRect(0, 0, W, H);
      const ccx = cx + ox, ccy = cy + oy;

      // posições
      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        const breathe = reduceMotion ? 0 : Math.sin(time * 0.0006 * n.speed + n.phase) * 0.05;
        const d = (n.dist + breathe) * R;
        const a = n.ang + rot;
        positions[i] = { x: ccx + Math.cos(a) * d, y: ccy + Math.sin(a) * d, s: n.size, d: n.dist };
      }

      // raios centro -> nó
      for (let i = 0; i < N; i++) {
        const p = positions[i];
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(231,231,231,${0.05 + (1 - p.d) * 0.10})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // teia entre vizinhos (por ângulo) — apenas se próximos
      for (let i = 0; i < N; i++) {
        const p = positions[i], q = positions[(i + 1) % N];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (R * 0.5) * (R * 0.5)) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(199,199,199,${0.10 * (1 - d2 / ((R * 0.5) * (R * 0.5)))})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // núcleo
      ctx.beginPath();
      ctx.arc(ccx, ccy, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#F7F7FF';
      ctx.fill();

      // nós
      for (let i = 0; i < N; i++) {
        const p = positions[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = p.d > 0.75 ? '#F7F7FF' : 'rgba(231,231,231,0.85)';
        ctx.fill();
      }

      if (!reduceMotion) requestAnimationFrame(render);
    };

    if (reduceMotion) render(0);
    else requestAnimationFrame(render);
  }

  // ---------- Formulário de orçamento (Web3Forms) ----------
  const form = document.querySelector('#form-orcamento');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
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
          const ok = document.querySelector('.form-success');
          if (ok) ok.classList.add('show');
        } else {
          throw new Error(data.message || 'Falha no envio');
        }
      } catch (err) {
        alert('Não foi possível enviar agora. Tente novamente ou fale com um atendente pelo WhatsApp.');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });
  }

  // ---------- Ano no rodapé ----------
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
});
