/* ============================================================
   BlueShieldPro — Meta Pixel
   Um arquivo so, incluido no <head> de todas as paginas. Evita
   14 copias do mesmo bloco desatualizando em ritmos diferentes.

   O pixel do navegador nao consegue ver a compra: ela acontece
   no dominio da Stripe. Quem manda o Purchase e o servidor
   (blue-skills-api, via Conversions API). Este arquivo cuida da
   parte que so o navegador sabe — _fbp, _fbc e o clique — e
   entrega esses valores para o servidor pela URL do checkout.
   ============================================================ */
(function (w, d) {
  'use strict';

  var PIXEL_ID = '1651967803606672';

  /* ---------- Snippet oficial da Meta ------------------------ */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(w, d,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  /* ---------- Cookies de atribuicao --------------------------
     _fbp identifica o navegador; _fbc guarda o clique no anuncio
     (vem do fbclid na URL). Sao os dois sinais que mais melhoram
     o pareamento no Gerenciador de Anuncios, e nenhum dos dois
     existe do lado do servidor — por isso precisam viajar junto
     com o checkout.
     ---------------------------------------------------------- */
  function cookie(nome) {
    var m = d.cookie.match('(^|;)\\s*' + nome + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }

  /* A Meta so cria o _fbc quando o pixel ja esta carregado. Se a
     pessoa chegou com fbclid e saiu rapido para a Stripe, o cookie
     pode nao existir ainda; entao montamos o valor na mao, no
     formato que a Conversions API espera. */
  function fbc() {
    var doCookie = cookie('_fbc');
    if (doCookie) return doCookie;

    var fbclid = new URLSearchParams(w.location.search).get('fbclid');
    if (!fbclid) return '';
    return 'fb.1.' + Date.now() + '.' + fbclid;
  }

  /* base64url sem "=": o client_reference_id da Stripe aceita
     letras, numeros, "-" e "_", e nada mais. O _fbp tem pontos,
     entao mandar cru quebraria o link. */
  function empacotar() {
    var dados = [cookie('_fbp'), fbc()].join('|');
    if (dados === '|') return '';
    try {
      return btoa(dados).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      return '';
    }
  }

  w.bsp = w.bsp || {};

  /* Usado pela pagina de planos para carimbar o link de pagamento.
     Devolve string vazia quando nao ha nada util a mandar. */
  w.bsp.refAtribuicao = function () {
    var ref = empacotar();
    // Teto da Stripe: 200 caracteres. Melhor mandar nada do que
    // mandar cortado, que o servidor nao conseguiria decodificar.
    return ref.length > 200 ? '' : ref;
  };

  w.bsp.pixelId = PIXEL_ID;
})(window, document);
