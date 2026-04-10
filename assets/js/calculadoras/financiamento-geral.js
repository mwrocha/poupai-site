// =============================================
//  financiamento-geral.js
//  Financiamento PRICE — carro, moto, etc.
// =============================================

// =============================================
//  FORMATAÇÃO DE INPUTS MONETÁRIOS
// =============================================
function extrairValor(id) {
  const raw = document.getElementById(id).value;
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function aoSairDoInput(id) {
  const input = document.getElementById(id);
  const valor = parseFloat(input.value.replace(/\./g, '').replace(',', '.'));
  if (!isNaN(valor) && valor > 0) {
    input.value = valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}

function aoEntrarNoInput(id) {
  const input = document.getElementById(id);
  const valor = parseFloat(input.value.replace(/\./g, '').replace(',', '.'));
  if (!isNaN(valor) && valor > 0) input.value = valor;
}

document.addEventListener('DOMContentLoaded', () => {
  ['valorBem', 'entradaGeral', 'rendaGeral', 'seguro'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur',  () => aoSairDoInput(id));
    input.addEventListener('focus', () => aoEntrarNoInput(id));
  });
});

let graficoGeralInstance = null;
let dadosGeral           = [];
let paramsGeral          = {};

function formatBRL(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}

// Tipo do bem selecionado
let tipoBem = 'carro';
function selecionarTipo(tipo, el) {
  tipoBem = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// Hint % de entrada
document.getElementById('entradaGeral').addEventListener('input', atualizarHints);
document.getElementById('valorBem').addEventListener('input', atualizarHints);
document.getElementById('taxaMensalGeral').addEventListener('input', atualizarTaxaAnual);

function atualizarHints() {
  const val  = extrairValor('valorBem');
  const ent  = extrairValor('entradaGeral');
  const hint = document.getElementById('pctEntradaGeral');
  if (val > 0 && ent > 0) {
    const pct = (ent / val * 100).toFixed(1);
    hint.textContent  = `${pct}% do valor do bem`;
    hint.style.color  = pct >= 20 ? 'var(--c5)' : 'var(--c3)';
  } else {
    hint.textContent = '';
  }
}

function atualizarTaxaAnual() {
  const taxa  = parseFloat(document.getElementById('taxaMensalGeral').value) || 0;
  const hint  = document.getElementById('taxaAnualEquiv');
  if (taxa > 0) {
    const anual = (Math.pow(1 + taxa / 100, 12) - 1) * 100;
    hint.textContent = `≈ ${anual.toFixed(2)}% ao ano`;
  } else {
    hint.textContent = '';
  }
}

// =============================================
//  CÁLCULO PRICE
// =============================================
function calcularPRICEGeral(financiado, n, taxaMensal, seguro) {
  const pmt  = financiado * taxaMensal / (1 - Math.pow(1 + taxaMensal, -n));
  let saldo  = financiado;
  const rows = [];

  for (let mes = 1; mes <= n; mes++) {
    const juros      = saldo * taxaMensal;
    const amortizacao= pmt - juros;
    saldo            = Math.max(saldo - amortizacao, 0);

    rows.push({
      mes,
      parcela:    parseFloat((pmt + seguro).toFixed(2)),
      pmtBase:    parseFloat(pmt.toFixed(2)),
      amortizacao:parseFloat(amortizacao.toFixed(2)),
      juros:      parseFloat(juros.toFixed(2)),
      seguro:     parseFloat(seguro.toFixed(2)),
      saldo:      parseFloat(saldo.toFixed(2))
    });
  }
  return rows;
}

// =============================================
//  CALCULAR PRINCIPAL
// =============================================
function calcularFinanciamentoGeral() {
  const valorBem   = extrairValor('valorBem');
  const entrada    = extrairValor('entradaGeral');
  const prazo      = parseInt(document.getElementById('prazoMeses').value)         || 0;
  const taxaMes    = parseFloat(document.getElementById('taxaMensalGeral').value)  || 0;
  const renda      = extrairValor('rendaGeral');
  const seguro     = extrairValor('seguro');

  if (valorBem <= 0 || prazo <= 0 || taxaMes <= 0) {
    alert('Preencha valor do bem, prazo e taxa de juros.');
    return;
  }

  const financiado = valorBem - entrada;
  if (financiado <= 0) {
    alert('A entrada não pode ser maior ou igual ao valor do bem.');
    return;
  }

  const taxaMensal = taxaMes / 100;

  // Guarda params para simulador de entrada
  paramsGeral = { valorBem, prazo, taxaMensal, seguro };

  dadosGeral = calcularPRICEGeral(financiado, prazo, taxaMensal, seguro);

  const totalJuros  = dadosGeral.reduce((s, r) => s + r.juros, 0);
  const totalSeguro = seguro * prazo;
  const totalPago   = dadosGeral.reduce((s, r) => s + r.parcela, 0);
  const custoTotal  = entrada + totalPago;
  const pctJuros    = (totalJuros / valorBem * 100).toFixed(1);

  // Cards
  document.getElementById('resParcela').textContent   = formatBRL(dadosGeral[0].parcela);
  document.getElementById('resFinanciado').textContent = formatBRL(financiado);
  document.getElementById('resJurosTotal').textContent = formatBRL(totalJuros);
  document.getElementById('resTotalBem').textContent   = formatBRL(custoTotal);

  // Barra custo real
  document.getElementById('custoRealPct').textContent = `+${pctJuros}% em juros`;
  const pctBem   = (valorBem  / custoTotal * 100).toFixed(1);
  const pctJSeg  = ((totalJuros + totalSeguro) / custoTotal * 100).toFixed(1);
  document.getElementById('segBem').style.width   = pctBem  + '%';
  document.getElementById('segJuros').style.width = pctJSeg + '%';

  // Alerta de renda
  if (renda > 0) {
    const comprometimento = (dadosGeral[0].parcela / renda * 100);
    const alerta = document.getElementById('alertaRendaGeralMsg');
    const secao  = document.getElementById('alertaRendaGeral');
    secao.style.display = 'block';

    if (comprometimento <= 30) {
      alerta.className = 'alerta ok';
      alerta.innerHTML = `✅ <strong>Comprometimento saudável.</strong> A parcela representa <strong>${comprometimento.toFixed(1)}%</strong> da sua renda — dentro do limite recomendado de 30%.`;
    } else if (comprometimento <= 40) {
      alerta.className = 'alerta atencao';
      alerta.innerHTML = `⚠️ <strong>Atenção!</strong> A parcela compromete <strong>${comprometimento.toFixed(1)}%</strong> da sua renda. Considere aumentar a entrada ou reduzir o prazo para diminuir a parcela.`;
    } else {
      alerta.className = 'alerta perigo';
      alerta.innerHTML = `🚨 <strong>Comprometimento alto!</strong> A parcela representa <strong>${comprometimento.toFixed(1)}%</strong> da sua renda — acima do recomendado. Revise o valor do bem, aumente a entrada ou estenda o prazo.`;
    }
  } else {
    document.getElementById('alertaRendaGeral').style.display = 'none';
  }

  // Simulador de entradas
  montarSimuladorEntrada(valorBem, entrada, prazo, taxaMensal, seguro);

  // Tabela mês a mês
  montarTabelaGeral();

  // Gráfico
  document.getElementById('btnEmpilhado').classList.add('active');
  document.getElementById('btnSaldo').classList.remove('active');
  renderizarGraficoGeral('empilhado');

  document.getElementById('resultadosGeral').style.display = 'block';
  document.getElementById('resultadosGeral').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  SIMULADOR DE ENTRADAS
// =============================================
function montarSimuladorEntrada(valorBem, entradaAtual, prazo, taxaMensal, seguro) {
  const tbody = document.getElementById('tabelaEntradas');
  tbody.innerHTML = '';

  // Gera faixas de entrada: 0%, 10%, 20%, 30%, 40%, 50% + entrada atual
  const percentuais = [0, 10, 20, 30, 40, 50];
  const entradas    = percentuais.map(p => Math.round(valorBem * p / 100));

  // Adiciona entrada atual se não estiver na lista
  const pctAtual = Math.round(entradaAtual / valorBem * 100);
  if (!percentuais.includes(pctAtual) && entradaAtual > 0) {
    entradas.push(entradaAtual);
    entradas.sort((a, b) => a - b);
  }

  entradas.forEach(ent => {
    const fin = valorBem - ent;
    if (fin <= 0) return;

    const rows      = calcularPRICEGeral(fin, prazo, taxaMensal, seguro);
    const totalJur  = rows.reduce((s, r) => s + r.juros, 0);
    const totalPago = rows.reduce((s, r) => s + r.parcela, 0);
    const custoTot  = ent + totalPago;
    const pct       = (ent / valorBem * 100).toFixed(0);
    const isAtual   = Math.abs(ent - entradaAtual) < 1;

    const tr = document.createElement('tr');
    if (isAtual) tr.classList.add('linha-atual');
    tr.innerHTML = `
      <td class="entrada-col">${formatBRL(ent)}${isAtual ? ' <span style="font-size:11px;color:var(--c2)">(atual)</span>' : ''}</td>
      <td>${pct}%</td>
      <td>${formatBRL(fin)}</td>
      <td class="${isAtual ? 'destaque' : ''}">${formatBRL(rows[0].parcela)}</td>
      <td class="juros-col">${formatBRL(totalJur)}</td>
      <td>${formatBRL(custoTot)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================
//  TABELA MÊS A MÊS
// =============================================
function montarTabelaGeral() {
  const tbody = document.getElementById('tabelaGeralBody');
  tbody.innerHTML = '';

  dadosGeral.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mes-col">${d.mes}</td>
      <td>${formatBRL(d.parcela)}</td>
      <td class="amort-col">${formatBRL(d.amortizacao)}</td>
      <td class="juros-col">${formatBRL(d.juros)}</td>
      <td>${formatBRL(d.seguro)}</td>
      <td class="saldo-col">${formatBRL(d.saldo)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================
//  GRÁFICO
// =============================================
function alternarGraficoGeral(tipo) {
  document.getElementById('btnEmpilhado').classList.toggle('active', tipo === 'empilhado');
  document.getElementById('btnSaldo').classList.toggle('active',     tipo === 'saldo');
  renderizarGraficoGeral(tipo);
}

function renderizarGraficoGeral(tipo) {
  if (graficoGeralInstance) { graficoGeralInstance.destroy(); graficoGeralInstance = null; }

  const legend = document.getElementById('chartLegendGeral');
  const ctx    = document.getElementById('graficoGeral').getContext('2d');

  // Amostra para não sobrecarregar
  const passo = dadosGeral.length > 60 ? Math.ceil(dadosGeral.length / 60) : 1;
  const am    = dadosGeral.filter((_, i) => i % passo === 0 || i === dadosGeral.length - 1);

  if (tipo === 'saldo') {
    legend.innerHTML = `<span class="legend-item"><span class="legend-dot" style="background:#6C3AFF"></span>Saldo devedor</span>`;

    graficoGeralInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: am.map(d => 'Mês ' + d.mes),
        datasets: [{
          label: 'Saldo devedor',
          data: am.map(d => parseFloat(d.saldo.toFixed(2))),
          borderColor: '#6C3AFF',
          backgroundColor: 'rgba(108,58,255,0.15)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: chartOptionsGeral()
    });

  } else {
    legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot" style="background:#00D2C8"></span>Amortização</span>
      <span class="legend-item"><span class="legend-dot" style="background:#FF5E8F"></span>Juros</span>
    `;

    graficoGeralInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: am.map(d => 'Mês ' + d.mes),
        datasets: [
          {
            label: 'Amortização',
            data: am.map(d => parseFloat(d.amortizacao.toFixed(2))),
            backgroundColor: 'rgba(0,210,200,0.85)',
            borderRadius: 3,
            borderSkipped: false
          },
          {
            label: 'Juros',
            data: am.map(d => parseFloat(d.juros.toFixed(2))),
            backgroundColor: 'rgba(255,94,143,0.85)',
            borderRadius: 3,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...chartOptionsGeral(),
        scales: {
          x: { ...chartOptionsGeral().scales.x, stacked: true },
          y: { ...chartOptionsGeral().scales.y, stacked: true }
        }
      }
    });
  }
}

function chartOptionsGeral() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,10,18,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        titleColor: 'rgba(255,255,255,0.6)',
        titleFont: { size: 12 },
        bodyColor: '#fff',
        bodyFont: { size: 13 },
        callbacks: { label: c => ` ${c.dataset.label}: ${formatBRL(c.raw)}` }
      }
    },
    scales: {
      x: {
        grid:  { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
        border:{ color: 'rgba(255,255,255,0.08)' }
      },
      y: {
        grid:  { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: 'rgba(255,255,255,0.35)', font: { size: 11 },
          callback: v => {
            if (v >= 1_000_000) return 'R$ ' + (v/1_000_000).toFixed(1) + 'M';
            if (v >= 1_000)     return 'R$ ' + (v/1_000).toFixed(0) + 'k';
            return 'R$ ' + v;
          }
        },
        border: { color: 'rgba(255,255,255,0.08)' }
      }
    }
  };
}

// =============================================
//  LIMPAR
// =============================================
function limparGeral() {
  ['valorBem','entradaGeral','prazoMeses','taxaMensalGeral','rendaGeral','seguro']
      .forEach(id => document.getElementById(id).value = '');

  document.getElementById('pctEntradaGeral').textContent = '';
  document.getElementById('taxaAnualEquiv').textContent  = '';
  document.getElementById('resultadosGeral').style.display = 'none';

  if (graficoGeralInstance) { graficoGeralInstance.destroy(); graficoGeralInstance = null; }
}