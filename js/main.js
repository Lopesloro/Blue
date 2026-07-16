/* ============================================================
   BLUESHIELDPRO — Interações e animações
   ============================================================ */

// ------------- CONFIGURAÇÃO CENTRAL (edite aqui) -------------
const BSP = {
  // Número do WhatsApp (não é exibido no site — usado só para abrir a conversa)
  whatsapp: '5519998334896',
  whatsappMsg: 'Olá! Visitei o site da BlueShieldPro e quero falar com um atendente sobre um projeto.'
};

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Loader ----------
  const loader = document.querySelector('.loader');
  if (loader) {
    // Esconde assim que o HTML está pronto — não espera fontes/imagens/canvas.
    requestAnimationFrame(() => loader.classList.add('hidden'));
    // rede: garante que nunca fique preso mesmo se algo acima falhar
    setTimeout(() => loader.classList.add('hidden'), 800);
  }

  // ---------- Links WhatsApp (número oculto) ----------
  const waUrl = `https://wa.me/${BSP.whatsapp}?text=${encodeURIComponent(BSP.whatsappMsg)}`;
  document.querySelectorAll('[data-whats]').forEach(el => {
    el.setAttribute('href', waUrl);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  // ---------- Botão flutuante WhatsApp (CTA principal, número oculto) ----------
  if (!document.querySelector('.wa-float')) {
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = waUrl;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Falar no WhatsApp');
    wa.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.15-1.8-.9-2.08-1-.28-.1-.48-.15-.68.15-.2.3-.78 1-.96 1.2-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.13 4.54.72.3 1.28.49 1.71.63.72.23 1.37.2 1.88.12.57-.08 1.8-.73 2.05-1.44.25-.7.25-1.3.18-1.44-.07-.13-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.6 15.05L2 22l5.05-1.32A10 10 0 1 0 12 2z"/></svg><span class="wa-label">Falar no WhatsApp</span>';
    document.body.appendChild(wa);
  }

  // ---------- Item ativo do menu ----------
  const page = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav a, .mobile-nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  // ---------- Header scroll ----------
  const header = document.querySelector('.header');
  const progress = document.querySelector('.scroll-progress');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 30);
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
        const dur = 1800;
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
      // fecha os demais do mesmo grupo
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
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
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

  // ---------- Partículas (canvas leve) ----------
  // Só em telas grandes: em celular pesa e não some no fundo escuro.
  const canvas = document.querySelector('.bg-canvas');
  if (canvas && window.innerWidth >= 900 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let W, H, parts;
    const N = 60;
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    parts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4
    }));
    (function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46,143,255,0.55)';
        ctx.fill();
        for (let j = i + 1; j < N; j++) {
          const q = parts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16900) { // 130px
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(46,143,255,${0.12 * (1 - d2 / 16900)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    })();
  }

  // ---------- Parallax suave no hero ----------
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) heroVisual.style.translate = `0 ${y * 0.08}px`;
    }, { passive: true });
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
          // Conversão do Google Ads: lead enviado pelo formulário
          if (typeof gtag === 'function') {
            gtag('event', 'conversion', {
              send_to: 'AW-17972527330/YEcKCOn7r88cEOKB_PlC',
              value: 1.0,
              currency: 'BRL'
            });
          }
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
