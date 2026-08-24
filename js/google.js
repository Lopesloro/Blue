/* ============================================================
   BlueShieldPro — Google tag (Ads + Analytics 4)
   Um arquivo so, incluido no <head> de todas as paginas.

   Antes este bloco era copiado inline em 13 paginas — e faltava
   justamente nas duas que vendem, skills.html e obrigado.html.
   O funil de venda inteiro ficava invisivel para o Google.
   ============================================================ */
(function (w, d) {
  'use strict';

  var ADS = 'AW-17972527330';
  var GA4 = 'G-RH3Y7G97J5';

  var tag = d.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ADS;
  d.head.appendChild(tag);

  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  w.gtag = gtag;

  gtag('js', new Date());
  gtag('config', ADS);
  if (GA4) gtag('config', GA4);

  // Lidos por main.js e obrigado.js.
  w.BSP_ADS_ID = ADS;
  w.BSP_GA4_ID = GA4;
})(window, document);
