// =============================================
//  financiamento-imobiliario.js
//  Cálculo SAC, PRICE e correção TR/IPCA
// =============================================

let graficoInstance = null;
let dadosSAC        = [];
let dadosPRICE      = [];

function formatBRL(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}

function formatPct(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%';
}

// Atualiza hint de percentual de entrada
document.getElementById('entrada').addEventListener('input', () => {
  const val   = parseFloat(document.getElementById('valorImovel').value) || 0;
  const ent   = parseFloat(document.getElementById('entrada').value)     || 0;
  const hint  = document.getElementById('pctEntrada');
  if (val > 0 && ent > 0) {
    const pct = (ent / val * 100).toFixed(1);
    hint.textContent = `${pct}% do valor do imóvel`;
    hint.style.color = pct >= 20 ? 'var(--c5)' : 'var(--c3)';
  } else {
    hint.textContent = '';
  }
});

document.getElementById('valorImovel').addEventListener('input', () => {
  document.getElementById('entrada').dispatchEvent(new Event('input'));
});

// =============================================
//  CÁLCULO PRINCIPAL
// =============================================
function calcularFinanciamento() {
  const valorImovel  = parseFloat(document.getElementById('valorImovel').value) || 0;
  const entrada      = parseFloat(document.getElementById('entrada').value)     || 0;
  const prazoAnos    = parseInt(document.getElementById('prazoAnos').value)     || 0;
  const taxaAnual    = parseFloat(document.getElementById('taxaAnual').value)   || 0;
  const correcaoMes  = parseFloat(document.getElementById('correcao').value)    || 0;
  const renda        = parseFloat(document.getElementById('renda').value)       || 0;

  if (valorImovel <= 0 || prazoAnos <= 0 || taxaAnual <= 0) {
    alert('Preencha valor do imóvel, prazo e taxa de juros.');
    return;
  }

  const financiado  = valorImovel - entrada;
  if (financiado <= 0) {
    alert('A entrada não pode ser maior ou igual ao valor do imóvel.');
    return;
  }

  const totalMeses  = prazoAnos * 12;
  // Taxa mensal equivalente: (1 + taxa_anual)^(1/12) - 1
  const taxaMensal  = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;

  // Calcula SAC e PRICE
  dadosSAC   = calcularSAC(financiado, totalMeses, taxaMensal, correcaoMes);
  dadosPRICE = calcularPRICE(financiado, totalMeses, taxaMensal, correcaoMes);

  // Totais SAC
  const sacTotalPago  = dadosSAC.reduce((s, r) => s + r.parcela, 0);
  const sacTotalJuros = dadosSAC.reduce((s, r) => s + r.juros, 0);

  // Totais PRICE
  const priceTotalPago  = dadosPRICE.reduce((s, r) => s + r.parcela, 0);
  const priceTotalJuros = dadosPRICE.reduce((s, r) => s + r.juros, 0);

  // Preenche cards SAC
  document.getElementById('sac-p1').textContent    = formatBRL(dadosSAC[0].parcela);
  document.getElementById('sac-pn').textContent    = formatBRL(dadosSAC[dadosSAC.length - 1].parcela);
  document.getElementById('sac-juros').textContent = formatBRL(sacTotalJuros);
  document.getElementById('sac-total').textContent = formatBRL(sacTotalPago + entrada);
  document.getElementById('sac-mais').textContent  = formatBRL(sacTotalJuros);

  // Preenche cards PRICE
  document.getElementById('price-p1').textContent    = formatBRL(dadosPRICE[0].parcela);
  document.getElementById('price-pn').textContent    = formatBRL(dadosPRICE[dadosPRICE.length - 1].parcela);
  document.getElementById('price-juros').textContent = formatBRL(priceTotalJuros);
  document.getElementById('price-total').textContent = formatBRL(priceTotalPago + entrada);
  document.getElementById('price-mais').textContent  = formatBRL(priceTotalJuros);

  // Destaque no melhor
  const cardSAC   = document.getElementById('cardSAC');
  const cardPRICE = document.getElementById('cardPRICE');
  cardSAC.classList.remove('melhor');
  cardPRICE.classList.remove('melhor');

  if (sacTotalPago <= priceTotalPago) {
    cardSAC.classList.add('melhor');
  } else {
    cardPRICE.classList.add('melhor');
  }

  // Recomendação
  const economiaSAC = priceTotalPago - sacTotalPago;
  const rec = document.getElementById('recomendacao');
  if (economiaSAC > 0) {
    rec.innerHTML = `💡 <strong>SAC é mais vantajoso no longo prazo:</strong> você economiza <strong>${formatBRL(economiaSAC)}</strong> em juros comparado à PRICE. A desvantagem é a parcela inicial mais alta (${formatBRL(dadosSAC[0].parcela)} vs ${formatBRL(dadosPRICE[0].parcela)}). Se sua renda permite pagar a primeira parcela do SAC, ele é a melhor escolha.`;
  } else {
    rec.innerHTML = `💡 <strong>PRICE pode ser mais adequada</strong> para quem precisa de parcelas menores no início. A parcela fixa facilita o planejamento financeiro, mas o custo total de juros é maior.`;
  }

  // Alerta de renda
  if (renda > 0) {
    const comprometimentoSAC   = (dadosSAC[0].parcela / renda) * 100;
    const comprometimentoPRICE = (dadosPRICE[0].parcela / renda) * 100;
    const alerta = document.getElementById('alertaRendaMsg');
    const secao  = document.getElementById('alertaRenda');

    secao.style.display = 'block';

    if (comprometimentoSAC <= 30) {
      alerta.className = 'alerta ok';
      alerta.innerHTML = `✅ <strong>Comprometimento de renda adequado.</strong> A primeira parcela do SAC representa <strong>${comprometimentoSAC.toFixed(1)}%</strong> da sua renda. O recomendado pelo Banco Central é no máximo 30%.`;
    } else if (comprometimentoSAC <= 35) {
      alerta.className = 'alerta atencao';
      alerta.innerHTML = `⚠️ <strong>Atenção ao comprometimento de renda.</strong> A primeira parcela do SAC representa <strong>${comprometimentoSAC.toFixed(1)}%</strong> da sua renda. Bancos geralmente limitam a 30-35%. Considere aumentar a entrada ou reduzir o prazo.`;
    } else {
      alerta.className = 'alerta perigo';
      alerta.innerHTML = `🚨 <strong>Comprometimento de renda alto!</strong> A primeira parcela representa <strong>${comprometimentoSAC.toFixed(1)}%</strong> da sua renda — acima do limite recomendado de 30%. A maioria dos bancos não aprovaria este financiamento. Aumente a entrada ou revise o valor do imóvel.`;
    }
  } else {
    document.getElementById('alertaRenda').style.display = 'none';
  }

  // Monta tabelas
  montarTabela('SAC',   dadosSAC,   'tabelaSACBody');
  montarTabela('PRICE', dadosPRICE, 'tabelaPRICEBody');

  // Gráfico
  document.getElementById('btnSAC').classList.add('active');
  document.getElementById('btnPRICE').classList.remove('active');
  document.getElementById('btnAMBOS').classList.remove('active');
  renderizarGrafico('sac');

  document.getElementById('resultados').style.display = 'block';
  document.getElementById('resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  TABELA SAC
// =============================================
function calcularSAC(financiado, n, taxaMensal, correcaoMes) {
  const amortizacaoFixa = financiado / n;
  let saldo             = financiado;
  const linhas          = [];

  for (let mes = 1; mes <= n; mes++) {
    const juros     = saldo * taxaMensal;
    const correcao  = saldo * correcaoMes;
    const parcela   = amortizacaoFixa + juros + correcao;
    saldo           = saldo - amortizacaoFixa + correcao;

    linhas.push({
      mes,
      parcela:    parseFloat(parcela.toFixed(2)),
      amortizacao:parseFloat(amortizacaoFixa.toFixed(2)),
      juros:      parseFloat(juros.toFixed(2)),
      correcao:   parseFloat(correcao.toFixed(2)),
      saldo:      parseFloat(Math.max(saldo, 0).toFixed(2))
    });
  }
  return linhas;
}

// =============================================
//  TABELA PRICE
// =============================================
function calcularPRICE(financiado, n, taxaMensal, correcaoMes) {
  // PMT base sem correção
  const pmtBase = financiado * taxaMensal / (1 - Math.pow(1 + taxaMensal, -n));
  let saldo     = financiado;
  const linhas  = [];

  for (let mes = 1; mes <= n; mes++) {
    const juros      = saldo * taxaMensal;
    const correcao   = saldo * correcaoMes;
    const amortizacao= pmtBase - juros;
    const parcela    = pmtBase + correcao;
    saldo            = saldo - amortizacao + correcao;

    linhas.push({
      mes,
      parcela:    parseFloat(parcela.toFixed(2)),
      amortizacao:parseFloat(Math.max(amortizacao, 0).toFixed(2)),
      juros:      parseFloat(juros.toFixed(2)),
      correcao:   parseFloat(correcao.toFixed(2)),
      saldo:      parseFloat(Math.max(saldo, 0).toFixed(2))
    });
  }
  return linhas;
}

// =============================================
//  MONTA TABELA HTML
// =============================================
function montarTabela(tipo, dados, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';

  dados.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.mes}</td>
      <td>${formatBRL(d.parcela)}</td>
      <td class="amort-col">${formatBRL(d.amortizacao)}</td>
      <td class="juros-col">${formatBRL(d.juros)}</td>
      <td class="correcao-col">${formatBRL(d.correcao)}</td>
      <td class="saldo-col">${formatBRL(d.saldo)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================
//  ALTERNAR TABELA
// =============================================
function alternarTabela(tipo) {
  document.getElementById('btnTabelaSAC').classList.toggle('active',   tipo === 'sac');
  document.getElementById('btnTabelaPRICE').classList.toggle('active', tipo === 'price');
  document.getElementById('tabelaSACWrap').style.display   = tipo === 'sac'   ? 'block' : 'none';
  document.getElementById('tabelaPRICEWrap').style.display = tipo === 'price' ? 'block' : 'none';
}

// =============================================
//  GRÁFICO
// =============================================
function alternarGrafico(tipo) {
  document.getElementById('btnSAC').classList.toggle('active',   tipo === 'sac');
  document.getElementById('btnPRICE').classList.toggle('active', tipo === 'price');
  document.getElementById('btnAMBOS').classList.toggle('active', tipo === 'ambos');
  renderizarGrafico(tipo);
}

function renderizarGrafico(tipo) {
  if (graficoInstance) { graficoInstance.destroy(); graficoInstance = null; }

  const legend = document.getElementById('chartLegend');
  const ctx    = document.getElementById('graficoFinanciamento').getContext('2d');

  // Limita pontos para performance
  function amostrar(dados, max) {
    if (dados.length <= max) return dados;
    const passo = Math.ceil(dados.length / max);
    return dados.filter((_, i) => i % passo === 0 || i === dados.length - 1);
  }

  if (tipo === 'ambos') {
    // Linha comparativa: parcela SAC vs PRICE
    const sacAm   = amostrar(dadosSAC,   60);
    const priceAm = amostrar(dadosPRICE, 60);

    legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot" style="background:#6C3AFF"></span>Parcela SAC</span>
      <span class="legend-item"><span class="legend-dot" style="background:#00D2C8"></span>Parcela PRICE</span>
    `;

    graficoInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sacAm.map(d => 'Mês ' + d.mes),
        datasets: [
          {
            label: 'SAC',
            data: sacAm.map(d => parseFloat(d.parcela.toFixed(2))),
            borderColor: '#6C3AFF',
            backgroundColor: 'rgba(108,58,255,0.1)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.3
          },
          {
            label: 'PRICE',
            data: priceAm.map(d => parseFloat(d.parcela.toFixed(2))),
            borderColor: '#00D2C8',
            backgroundColor: 'rgba(0,210,200,0.08)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: chartOptions()
    });

  } else {
    // Barras empilhadas: amortização + juros
    const dados = tipo === 'sac' ? dadosSAC : dadosPRICE;
    const am    = amostrar(dados, 60);

    legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot" style="background:#00D2C8"></span>Amortização</span>
      <span class="legend-item"><span class="legend-dot" style="background:#FF5E8F"></span>Juros</span>
      ${am[0]?.correcao > 0 ? '<span class="legend-item"><span class="legend-dot" style="background:#FFB347"></span>Correção</span>' : ''}
    `;

    const datasets = [
      {
        label: 'Amortização',
        data: am.map(d => parseFloat(d.amortizacao.toFixed(2))),
        backgroundColor: 'rgba(0,210,200,0.85)',
        borderRadius: 2,
        borderSkipped: false
      },
      {
        label: 'Juros',
        data: am.map(d => parseFloat(d.juros.toFixed(2))),
        backgroundColor: 'rgba(255,94,143,0.85)',
        borderRadius: 2,
        borderSkipped: false
      }
    ];

    if (am[0]?.correcao > 0) {
      datasets.push({
        label: 'Correção',
        data: am.map(d => parseFloat(d.correcao.toFixed(2))),
        backgroundColor: 'rgba(255,179,71,0.85)',
        borderRadius: 2,
        borderSkipped: false
      });
    }

    graficoInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: am.map(d => 'Mês ' + d.mes), datasets },
      options: { ...chartOptions(), scales: { ...chartOptions().scales, x: { ...chartOptions().scales.x, stacked: true }, y: { ...chartOptions().scales.y, stacked: true } } }
    });
  }
}

function chartOptions() {
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
function limpar() {
  ['valorImovel','entrada','prazoAnos','taxaAnual','renda'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('correcao').value        = '0';
  document.getElementById('pctEntrada').textContent = '';
  document.getElementById('resultados').style.display = 'none';
  if (graficoInstance) { graficoInstance.destroy(); graficoInstance = null; }
}
