/* ============================================================
   BlueShieldPro — pagamento dentro da propria pagina

   Refeito depois de duas descobertas no celular:

   1. O `init_point` do Checkout Pro abre dentro do APLICATIVO do
      Mercado Livre. Quem veio de um anuncio do Instagram para comprar
      um PDF de R$ 39,90 nao instala aplicativo para pagar, e quem ja
      tem sai do nosso funil para dentro de um marketplace cheio de
      outras coisas para olhar.

   2. A tela "Revise o seu pagamento" deles mostra so titulo e total.
      A pessoa decide pagar sem nunca ler o que esta levando.

   As duas se resolvem no mesmo lugar. O Pix nasce aqui — QR e
   copia-e-cola desenhados nesta pagina, ninguem sai do site — e a
   descricao do pacote fica ao lado do valor, na hora da decisao.

   Cartao e boleto continuam no Checkout Pro: para cartao o
   redirecionamento e o caminho mais seguro, ninguem digita numero de
   cartao no nosso dominio, e aquele fluxo ja funciona.
   ============================================================ */
(function (w, d) {
  'use strict';

  var API = 'https://blue-skills-api.onrender.com';

  /* O que entra em cada pacote. Vive aqui e nao no HTML porque o
     mesmo texto precisa aparecer no painel de qualquer plano, e
     duplicar tres vezes no markup e como um deles envelhecer sozinho
     na proxima mudanca de oferta. */
  var PACOTES = {
    basico: {
      resumo: 'O essencial para tirar da equipe o trabalho que se repete toda semana.',
      itens: [
        '40 Skills prontas para instalar',
        'Relatório de cliente e de campanha',
        'Pesquisa de mercado e de concorrente',
        'Revisão de texto no padrão da sua agência',
        'Guia de instalação, passo a passo'
      ]
    },
    medium: {
      resumo: 'Tudo do Básico, mais os fluxos que atravessam várias etapas de um projeto.',
      itens: [
        'Tudo o que vem no Básico',
        'Skills encadeadas, de várias etapas',
        'Análise de dados e leitura de planilha',
        'Geração de proposta e de briefing',
        'Suporte por e-mail em até 24h',
        'Atualizações por 12 meses'
      ]
    },
    premium: {
      resumo: 'Tudo do Medium, mais Skills que constroem as próprias automações.',
      itens: [
        'Tudo o que vem no Medium',
        'Skills que criam outras Skills',
        'Rotinas agendadas e automações próprias',
        'Skills sob medida para o seu processo',
        'Prioridade no suporte',
        'Acompanhamento na implantação'
      ]
    }
  };

  var painel = d.querySelector('[data-checkout-panel]');
  if (!painel) return;

  var etapas = {
    resumo: painel.querySelector('[data-etapa="resumo"]'),
    dados: painel.querySelector('[data-etapa="dados"]'),
    pix: painel.querySelector('[data-etapa="pix"]')
  };

  var elDesc = painel.querySelector('[data-sum-desc]');
  var elItens = painel.querySelector('[data-sum-itens]');
  var elErro = painel.querySelector('[data-pg-erro]');
  var elQr = painel.querySelector('[data-pg-qr]');
  var elCodigo = painel.querySelector('[data-pg-codigo]');
  var elCopiar = painel.querySelector('[data-pg-copiar]');
  var elEspera = painel.querySelector('[data-pg-espera]');
  var elExpira = painel.querySelector('[data-pg-expira]');
  var btnGerar = painel.querySelector('[data-pg-gerar]');

  var planoAtual = null;
  var relogio = null;

  function medir(nome, params) {
    if (typeof w.gtag !== 'function' || !w.BSP_GA4_ID) return;
    params = params || {};
    params.send_to = w.BSP_GA4_ID;
    params.contexto_navegador = (w.bsp && w.bsp.contexto) ? w.bsp.contexto() : 'desconhecido';
    params.transport_type = 'beacon';
    w.gtag('event', nome, params);
  }

  function mostrar(qual) {
    Object.keys(etapas).forEach(function (k) {
      if (etapas[k]) etapas[k].hidden = (k !== qual);
    });
  }

  /* Preenche a descricao do pacote escolhido. Chamado pelo skills.js
     quando o painel abre — e a razao de este arquivo existir: sem
     isso a pessoa decide pagar olhando so um nome e um numero. */
  function descrever(chave) {
    planoAtual = chave;
    var pacote = PACOTES[chave];
    if (!pacote) return;
    if (elDesc) elDesc.textContent = pacote.resumo;
    if (elItens) {
      elItens.innerHTML = '';
      pacote.itens.forEach(function (texto) {
        var li = d.createElement('li');
        li.textContent = texto;
        elItens.appendChild(li);
      });
    }
    mostrar('resumo');
    if (elErro) elErro.hidden = true;
    pararRelogio();
  }

  // Mascara de CPF enquanto digita. Campo numerico com pontuacao
  // errada e recusado pela Mercado Pago sem dizer o porque.
  var campoCpf = painel.querySelector('input[name="cpf"]');
  if (campoCpf) {
    campoCpf.addEventListener('input', function () {
      var n = campoCpf.value.replace(/\D/g, '').slice(0, 11);
      campoCpf.value = n
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    });
  }

  var btnPix = painel.querySelector('[data-pagar-pix]');
  if (btnPix) btnPix.addEventListener('click', function () {
    medir('pagamento_escolheu_meio', { meio: 'pix', plano: planoAtual });
    mostrar('dados');
    var primeiro = painel.querySelector('input[name="nome"]');
    if (primeiro) primeiro.focus();
  });

  var btnVoltar = painel.querySelector('[data-pg-voltar]');
  if (btnVoltar) btnVoltar.addEventListener('click', function () { mostrar('resumo'); });

  /* Cartao e boleto continuam no Checkout Pro. No computador abre em
     aba nova; no celular o proprio sistema decide, e ai o aplicativo
     do Mercado Livre pode aparecer — por isso o Pix, que e o caminho
     mais usado, foi o que trouxemos para ca. */
  var btnCartao = painel.querySelector('[data-pagar-cartao]');
  if (btnCartao) btnCartao.addEventListener('click', function () {
    medir('pagamento_escolheu_meio', { meio: 'cartao', plano: planoAtual });
    if (w.bsp && typeof w.bsp.abrirCheckoutPro === 'function') w.bsp.abrirCheckoutPro(planoAtual);
  });

  function erro(msg) {
    if (!elErro) return;
    elErro.textContent = msg;
    elErro.hidden = false;
  }

  var form = etapas.dados;
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (elErro) elErro.hidden = true;

    var dados = {
      plano: planoAtual,
      nome: form.querySelector('[name="nome"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      cpf: form.querySelector('[name="cpf"]').value.replace(/\D/g, ''),
      ref: (w.bsp && w.bsp.refAtribuicao) ? w.bsp.refAtribuicao() : ''
    };

    if (dados.cpf.length !== 11) return erro('O CPF precisa ter 11 dígitos.');

    btnGerar.disabled = true;
    btnGerar.textContent = 'Gerando…';
    medir('pix_solicitado', { plano: planoAtual });

    fetch(API + '/mercadopago/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function (r) { return r.json().then(function (j) { return r.ok ? j : Promise.reject(j); }); })
      .then(mostrarPix)
      .catch(function (j) {
        erro((j && j.erro) ? j.erro : 'Não foi possível gerar o Pix. Tente de novo.');
        medir('pix_falhou', { plano: planoAtual });
      })
      .finally(function () {
        btnGerar.disabled = false;
        btnGerar.textContent = 'Gerar o código Pix';
      });
  });

  function mostrarPix(pix) {
    mostrar('pix');
    medir('pix_gerado', { plano: planoAtual });

    if (elQr && pix.qrBase64) {
      elQr.src = 'data:image/png;base64,' + pix.qrBase64;
      elQr.hidden = false;
    }
    if (elCodigo) elCodigo.textContent = pix.copiaECola || '';
    if (elExpira && pix.expiraEm) {
      var q = new Date(pix.expiraEm);
      elExpira.textContent = 'O código vale até ' + q.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      }) + '.';
    }
    acompanhar(pix.id);
  }

  if (elCopiar) elCopiar.addEventListener('click', function () {
    var texto = elCodigo ? elCodigo.textContent : '';
    if (!texto) return;
    var fim = function () {
      elCopiar.classList.add('copiado');
      medir('pix_codigo_copiado', { plano: planoAtual });
      w.setTimeout(function () { elCopiar.classList.remove('copiado'); }, 2200);
    };
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      w.navigator.clipboard.writeText(texto).then(fim).catch(selecionar);
    } else { selecionar(); }
  });

  // O webview do Instagram nem sempre expoe a area de transferencia.
  function selecionar() {
    if (!elCodigo || !w.getSelection || !d.createRange) return;
    var faixa = d.createRange();
    faixa.selectNodeContents(elCodigo);
    var sel = w.getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
  }

  function pararRelogio() {
    if (relogio) { w.clearInterval(relogio); relogio = null; }
  }

  /* Pergunta de tempos em tempos se caiu, so para trocar a tela. Quem
     entrega o produto e o webhook no servidor — se esta consulta
     falhar, o e-mail chega do mesmo jeito. */
  function acompanhar(id) {
    pararRelogio();
    var tentativas = 0;
    relogio = w.setInterval(function () {
      tentativas++;
      if (tentativas > 120) return pararRelogio();   // ~10 min
      fetch(API + '/mercadopago/pix/status?id=' + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (s) {
          if (s.status !== 'approved') return;
          pararRelogio();
          medir('pix_aprovado', { plano: planoAtual });
          if (elEspera) {
            elEspera.textContent = 'Pagamento confirmado. O acesso está indo para o seu e-mail.';
            elEspera.classList.add('ok');
          }
          w.setTimeout(function () {
            w.location.href = '/obrigado.html?plano=' + encodeURIComponent(planoAtual || '');
          }, 1600);
        })
        .catch(function () { /* rede oscilando nao muda nada */ });
    }, 5000);
  }

  w.bsp = w.bsp || {};
  w.bsp.descreverPlano = descrever;
})(window, document);
