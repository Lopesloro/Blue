/* ============================================================
   BlueShieldPro — medicao de atencao real na pagina de venda

   Por que este arquivo existe.

   O anuncio no Instagram e no Facebook abre a pagina dentro do
   navegador embutido do proprio aplicativo, e nao ha configuracao
   do lado do anunciante que mude isso. Esse navegador descarta a
   aba assim que a pessoa volta para o feed — e o evento
   user_engagement do Analytics, que e enviado justamente quando a
   pagina perde o foco, muitas vezes nao chega a sair.

   O efeito medido em 31/08/2026: 19 sessoes vindas do anuncio,
   apenas 1 evento de user_engagement, e um tempo medio de
   engajamento de 0,58 segundo — um numero que descreve a falha de
   medicao, nao o comportamento das pessoas.

   A correcao e parar de esperar o fim da visita para medir. Aqui
   os eventos sao disparados durante a visita, em marcos de tempo e
   de rolagem, e cada um deles ja chega sozinho ao servidor. Se a
   aba for descartada no segundo seguinte, o que ja foi enviado
   permanece.
   ============================================================ */
(function (w, d) {
  'use strict';

  // Marcos de tempo visivel, em segundos.
  var MARCOS_TEMPO = [3, 10, 30, 60, 120];

  // Marcos de profundidade de rolagem, em porcentagem.
  var MARCOS_ROLAGEM = [25, 50, 75, 90];

  // A partir de quantos segundos de atencao real a visita vira um
  // ViewContent para a Meta. Ver a nota no fim do arquivo.
  var SEGUNDOS_VIEW_CONTENT = 10;

  var segundosVisiveis = 0;
  var profundidadeMaxima = 0;
  var tempoJaDisparado = {};
  var rolagemJaDisparada = {};
  var viewContentEnviado = false;
  var relogio = null;

  // O navegador embutido de cada aplicativo se identifica de um jeito
  // diferente. Guardar isso como parametro permite separar depois o
  // trafego do anuncio do trafego de navegador normal, que e o unico
  // jeito de comparar os dois sem misturar defeito de medicao com
  // comportamento.
  function contexto() {
    var ua = navigator.userAgent || '';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'webview_facebook';
    if (/Instagram/i.test(ua))        return 'webview_instagram';
    if (/Line\/|MicroMessenger/i.test(ua)) return 'webview_outro';
    return 'navegador';
  }
  var CONTEXTO = contexto();

  // Envia para o Analytics. Silencioso se a tag ainda nao carregou —
  // medicao nunca pode quebrar a pagina que ela mede.
  function enviar(nome, parametros) {
    if (typeof w.gtag !== 'function') return;
    parametros = parametros || {};
    parametros.contexto_navegador = CONTEXTO;
    parametros.pagina = d.body.getAttribute('data-pagina') || 'site';
    if (w.BSP_GA4_ID) parametros.send_to = w.BSP_GA4_ID;
    // O beacon continua valendo mesmo se a aba for descartada logo apos.
    parametros.transport_type = 'beacon';
    w.gtag('event', nome, parametros);
  }

  function marcarTempo() {
    for (var i = 0; i < MARCOS_TEMPO.length; i++) {
      var s = MARCOS_TEMPO[i];
      if (segundosVisiveis >= s && !tempoJaDisparado[s]) {
        tempoJaDisparado[s] = true;
        enviar('tempo_na_pagina', {
          segundos: s,
          profundidade_ate_aqui: profundidadeMaxima
        });
      }
    }

    if (!viewContentEnviado && segundosVisiveis >= SEGUNDOS_VIEW_CONTENT) {
      viewContentEnviado = true;
      if (typeof w.fbq === 'function') {
        w.fbq('track', 'ViewContent', {
          content_name: d.title,
          content_category: 'skills'
        });
      }
    }
  }

  // Conta apenas o tempo com a pagina de fato visivel. Aba em segundo
  // plano e telefone bloqueado nao contam como atencao.
  function tique() {
    if (d.visibilityState !== 'visible') return;
    segundosVisiveis += 1;
    marcarTempo();
  }

  function medirRolagem() {
    var alturaDoc = Math.max(
      d.body.scrollHeight, d.documentElement.scrollHeight,
      d.body.offsetHeight, d.documentElement.offsetHeight
    );
    var visivel = w.innerHeight || d.documentElement.clientHeight;
    var rolavel = alturaDoc - visivel;

    // Pagina que cabe inteira na tela nao tem rolagem para medir.
    // Registrar 100% aqui seria inventar um dado.
    if (rolavel <= 0) return;

    var topo = w.pageYOffset || d.documentElement.scrollTop || 0;
    var pct = Math.round((topo / rolavel) * 100);
    if (pct > 100) pct = 100;
    if (pct <= profundidadeMaxima) return;

    profundidadeMaxima = pct;

    for (var i = 0; i < MARCOS_ROLAGEM.length; i++) {
      var m = MARCOS_ROLAGEM[i];
      if (profundidadeMaxima >= m && !rolagemJaDisparada[m]) {
        rolagemJaDisparada[m] = true;
        enviar('rolagem', {
          profundidade: m,
          segundos_ate_aqui: segundosVisiveis
        });
      }
    }
  }

  var aguardandoQuadro = false;
  function aoRolar() {
    if (aguardandoQuadro) return;
    aguardandoQuadro = true;
    w.requestAnimationFrame(function () {
      aguardandoQuadro = false;
      medirRolagem();
    });
  }

  // Resumo da visita. Sai quando a pagina e escondida, que e o unico
  // sinal confiavel no celular — o evento unload nao dispara. Como os
  // marcos acima ja foram enviados durante a visita, perder este
  // resumo custa detalhe, nunca a leitura inteira.
  var resumoEnviado = false;
  function resumo() {
    if (resumoEnviado) return;
    resumoEnviado = true;
    enviar('resumo_visita', {
      segundos_visiveis: segundosVisiveis,
      profundidade_maxima: profundidadeMaxima
    });
  }

  function aoMudarVisibilidade() {
    if (d.visibilityState === 'hidden') resumo();
  }

  function iniciar() {
    medirRolagem();
    relogio = w.setInterval(tique, 1000);
    w.addEventListener('scroll', aoRolar, { passive: true });
    w.addEventListener('resize', aoRolar, { passive: true });
    d.addEventListener('visibilitychange', aoMudarVisibilidade);
    w.addEventListener('pagehide', resumo);
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  /* ------------------------------------------------------------
     Nota sobre o ViewContent

     A campanha otimiza hoje por InitiateCheckout, e a conta nao gera
     nem perto dos 50 eventos por semana que tiram um conjunto de
     anuncios da fase de aprendizado. Descer para visualizacao de
     pagina resolveria o volume e pioraria a qualidade, porque aquele
     evento dispara no carregamento e conta tambem quem saiu no mesmo
     segundo.

     O ViewContent disparado aos 10 segundos de atencao real fica no
     meio: tem volume varias vezes maior que o checkout e exclui quem
     nem olhou. Ele so passa a existir a partir da publicacao deste
     arquivo, entao a troca do evento de otimizacao da campanha so faz
     sentido depois de alguns dias acumulando historico.
     ------------------------------------------------------------ */
})(window, document);
