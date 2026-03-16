// =============================================
//  inflacao.js — Calculadora de Inflação
//  5 modos: poder de compra, passado, futuro,
//           rendimento real, simulador de salário
// =============================================

const indices = [
  { nome: 'IPCA',  taxa: 4.62, descricao: 'Índice oficial de inflação' },
  { nome: 'IGP-M', taxa: 7.20, descricao: 'Usado em reajustes de aluguel' },
  { nome: 'INPC',  taxa: 4.10, descricao: 'Foco em famílias de baixa renda' }
];

let graficoPCInstance = null;
let graficoRRInstance = null;

// =============================================
//  HELPERS
// =============================================
function formatBRL(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}

function formatPct(v, casas = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
}

// Fórmula rendimento real de Fisher: ((1+nominal)/(1+inflacao)) - 1
function rendimentoReal(nominal, inflacao) {
  return ((1 + nominal / 100) / (1 + inflacao / 100) - 1) * 100;
}

// Inflação acumulada: (1+taxa)^anos - 1
function inflacaoAcumulada(taxa, anos) {
  return (Math.pow(1 + taxa / 100, anos) - 1) * 100;
}

// Valor corrigido pela inflação
function corrigir(valor, taxa, anos) {
  return valor * Math.pow(1 + taxa / 100, anos);
}

// =============================================
//  TROCA DE MODO
// =============================================
function trocarModo(num) {
  for (let i = 1; i <= 5; i++) {
    document.getElementById('modoBtn' + i).classList.toggle('active', i === num);
    document.getElementById('modo' + i).style.display = i === num ? 'block' : 'none';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function chartOptions(extra = {}) {
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
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 } },
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
    },
    ...extra
  };
}

// =============================================
//  MODO 1 — PODER DE COMPRA
// =============================================
function calcularPoderCompra() {
  const valor    = parseFloat(document.getElementById('pc-valor').value)    || 0;
  const anos     = parseInt(document.getElementById('pc-anos').value)       || 0;
  const selectVal= document.getElementById('pc-indice').value;
  let inflacao   = parseFloat(document.getElementById('pc-inflacao').value) || 0;

  if (selectVal !== 'custom') inflacao = parseFloat(selectVal);

  if (valor <= 0 || anos <= 0 || inflacao <= 0) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const acumulada    = inflacaoAcumulada(inflacao, anos);
  const valorCorr    = corrigir(valor, inflacao, anos);
  const poderHoje    = valor / Math.pow(1 + inflacao / 100, anos);
  const perda        = valor - poderHoje;
  const perdaPct     = (perda / valor * 100);

  document.getElementById('pc-hoje').textContent     = formatBRL(poderHoje);
  document.getElementById('pc-perda').textContent    = formatBRL(perda);
  document.getElementById('pc-acumulada').textContent= formatPct(acumulada);

  const diag = document.getElementById('pc-diag');
  if (perdaPct < 20) {
    diag.className = 'diagnostico atencao';
    diag.innerHTML = `⚠️ Em ${anos} anos, <strong>${formatBRL(valor)}</strong> perdeu <strong>${formatPct(perdaPct)}</strong> do poder de compra. Isso significa que com esse dinheiro você comprará apenas <strong>${formatBRL(poderHoje)}</strong> em valores de hoje.`;
  } else {
    diag.className = 'diagnostico negativo';
    diag.innerHTML = `🚨 Em ${anos} anos, a inflação de ${formatPct(inflacao)} a.a. destruiu <strong>${formatPct(perdaPct)}</strong> do poder de compra. <strong>${formatBRL(valor)}</strong> hoje equivale apenas a <strong>${formatBRL(poderHoje)}</strong>. Por isso investir é essencial.`;
  }

  // Tabela e gráfico ano a ano
  const tbody  = document.getElementById('pc-tabela');
  tbody.innerHTML = '';
  const labels = [], nominalSerie = [], realSerie = [];

  for (let a = 1; a <= anos; a++) {
    const acumA  = inflacaoAcumulada(inflacao, a);
    const realA  = valor / Math.pow(1 + inflacao / 100, a);
    const perdaA = valor - realA;

    labels.push('Ano ' + a);
    nominalSerie.push(parseFloat(valor.toFixed(2)));
    realSerie.push(parseFloat(realA.toFixed(2)));

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a}</td>
      <td class="acum-col">${formatPct(inflacao)}</td>
      <td class="acum-col">${formatPct(acumA)}</td>
      <td class="valor-col">${formatBRL(realA)}</td>
      <td class="perda-col">-${formatBRL(perdaA)}</td>
    `;
    tbody.appendChild(tr);
  }

  // Gráfico
  if (graficoPCInstance) { graficoPCInstance.destroy(); graficoPCInstance = null; }
  const ctx = document.getElementById('graficoPC').getContext('2d');
  graficoPCInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Valor nominal', data: nominalSerie, borderColor: '#6C3AFF', backgroundColor: 'rgba(108,58,255,0.08)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0, borderDash: [6,3] },
        { label: 'Poder de compra real', data: realSerie, borderColor: '#FF5E8F', backgroundColor: 'rgba(255,94,143,0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 }
      ]
    },
    options: chartOptions()
  });

  // Comparativo índices
  const grid = document.getElementById('pc-indices');
  grid.innerHTML = '';
  indices.forEach(ind => {
    const acumInd  = inflacaoAcumulada(ind.taxa, anos);
    const realInd  = valor / Math.pow(1 + ind.taxa / 100, anos);
    const perdaInd = valor - realInd;
    const div = document.createElement('div');
    div.className = 'indice-item';
    div.innerHTML = `
      <div class="indice-nome">${ind.nome}</div>
      <div class="indice-taxa">${ind.descricao} · ${ind.taxa}% a.a.</div>
      <div class="indice-valor">${formatBRL(realInd)}</div>
      <div class="indice-perda">Perda: ${formatBRL(perdaInd)} (${formatPct(perdaInd/valor*100)})</div>
    `;
    grid.appendChild(div);
  });

  document.getElementById('pc-results').style.display = 'flex';
  document.getElementById('pc-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  MODO 2 — VALOR NO PASSADO
// =============================================
function calcularPassado() {
  const valor    = parseFloat(document.getElementById('past-valor').value)    || 0;
  const anos     = parseInt(document.getElementById('past-anos').value)       || 0;
  const inflacao = parseFloat(document.getElementById('past-inflacao').value) || 0;

  if (valor <= 0 || anos <= 0 || inflacao <= 0) { alert('Preencha todos os campos.'); return; }

  const acumulada = inflacaoAcumulada(inflacao, anos);
  const hoje      = corrigir(valor, inflacao, anos);
  const diff      = hoje - valor;

  document.getElementById('past-hoje').textContent = formatBRL(hoje);
  document.getElementById('past-acum').textContent = formatPct(acumulada);
  document.getElementById('past-diff').textContent = formatBRL(diff);

  const diag = document.getElementById('past-diag');
  diag.className = 'diagnostico atencao';
  diag.innerHTML = `💡 <strong>${formatBRL(valor)}</strong> de ${anos} ${anos === 1 ? 'ano' : 'anos'} atrás equivale a <strong>${formatBRL(hoje)}</strong> hoje. A inflação acumulada de <strong>${formatPct(acumulada)}</strong> no período corrói o poder de compra — por isso guardar dinheiro parado sem rendimento é perder dinheiro.`;

  document.getElementById('past-results').style.display = 'flex';
  document.getElementById('past-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  MODO 3 — VALOR NO FUTURO
// =============================================
function calcularFuturo() {
  const valor    = parseFloat(document.getElementById('fut-valor').value)    || 0;
  const anos     = parseInt(document.getElementById('fut-anos').value)       || 0;
  const inflacao = parseFloat(document.getElementById('fut-inflacao').value) || 0;

  if (valor <= 0 || anos <= 0 || inflacao <= 0) { alert('Preencha todos os campos.'); return; }

  const acumulada = inflacaoAcumulada(inflacao, anos);
  const futuro    = corrigir(valor, inflacao, anos);
  const diff      = futuro - valor;

  document.getElementById('fut-valor-res').textContent = formatBRL(futuro);
  document.getElementById('fut-acum').textContent      = formatPct(acumulada);
  document.getElementById('fut-diff').textContent      = formatBRL(diff);

  const diag = document.getElementById('fut-diag');
  diag.className = 'diagnostico atencao';
  diag.innerHTML = `📌 Para manter o mesmo poder de compra de <strong>${formatBRL(valor)}</strong> daqui a ${anos} ${anos === 1 ? 'ano' : 'anos'}, você precisará ter <strong>${formatBRL(futuro)}</strong>. Isso significa que seu dinheiro precisa render pelo menos <strong>${formatPct(inflacao)} ao ano</strong> só para não perder valor.`;

  document.getElementById('fut-results').style.display = 'flex';
  document.getElementById('fut-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  MODO 4 — RENDIMENTO REAL
// =============================================
function calcularRendimentoReal() {
  const valor      = parseFloat(document.getElementById('rr-valor').value)      || 0;
  const anos       = parseInt(document.getElementById('rr-anos').value)         || 0;
  const rendimento = parseFloat(document.getElementById('rr-rendimento').value) || 0;
  const inflacao   = parseFloat(document.getElementById('rr-inflacao').value)   || 0;

  if (valor <= 0 || anos <= 0 || rendimento <= 0 || inflacao <= 0) {
    alert('Preencha todos os campos.');
    return;
  }

  const taxaReal    = rendimentoReal(rendimento, inflacao);
  const montanteBruto = corrigir(valor, rendimento, anos);
  const inflAcum    = corrigir(valor, inflacao, anos);
  const montanteReal= valor * Math.pow(1 + taxaReal / 100, anos);
  const ganhoReal   = montanteReal - valor;

  document.getElementById('rr-real').textContent      = formatPct(taxaReal);
  document.getElementById('rr-bruto').textContent     = formatBRL(montanteBruto);
  document.getElementById('rr-corrigido').textContent = formatBRL(montanteReal);
  document.getElementById('rr-ganho').textContent     = formatBRL(ganhoReal);

  const diag = document.getElementById('rr-diag');
  if (taxaReal > 3) {
    diag.className = 'diagnostico positivo';
    diag.innerHTML = `✅ <strong>Excelente rendimento real de ${formatPct(taxaReal)}!</strong> Seu investimento cresceu bem acima da inflação. Em termos reais, você ganhou <strong>${formatBRL(ganhoReal)}</strong> em poder de compra.`;
  } else if (taxaReal > 0) {
    diag.className = 'diagnostico atencao';
    diag.innerHTML = `⚠️ Rendimento real positivo, mas modesto: <strong>${formatPct(taxaReal)} a.a.</strong> Seu dinheiro cresceu acima da inflação, mas considere investimentos com maior rendimento real para construir patrimônio mais rápido.`;
  } else {
    diag.className = 'diagnostico negativo';
    diag.innerHTML = `🚨 <strong>Rendimento real negativo!</strong> Seu investimento de ${formatPct(rendimento)} a.a. não acompanhou a inflação de ${formatPct(inflacao)} a.a. Você perdeu ${formatPct(Math.abs(taxaReal))} de poder de compra por ano.`;
  }

  // Gráfico
  if (graficoRRInstance) { graficoRRInstance.destroy(); graficoRRInstance = null; }
  const labels = [], nominalSerie = [], realSerie = [], inflSerie = [];
  for (let a = 1; a <= anos; a++) {
    labels.push('Ano ' + a);
    nominalSerie.push(parseFloat(corrigir(valor, rendimento, a).toFixed(2)));
    realSerie.push(parseFloat((valor * Math.pow(1 + taxaReal / 100, a)).toFixed(2)));
    inflSerie.push(parseFloat(corrigir(valor, inflacao, a).toFixed(2)));
  }

  const ctx = document.getElementById('graficoRR').getContext('2d');
  graficoRRInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Rendimento nominal', data: nominalSerie, borderColor: '#6C3AFF', backgroundColor: 'rgba(108,58,255,0.08)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 },
        { label: 'Rendimento real',    data: realSerie,    borderColor: '#3AFFA3', backgroundColor: 'rgba(58,255,163,0.08)',  borderWidth: 2, pointRadius: 0, fill: true,  tension: 0.3 },
        { label: 'Inflação acumulada', data: inflSerie,    borderColor: '#FF5E8F', backgroundColor: 'rgba(255,94,143,0.05)',  borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3, borderDash: [5,4] }
      ]
    },
    options: chartOptions()
  });

  document.getElementById('rr-results').style.display = 'flex';
  document.getElementById('rr-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  MODO 5 — SIMULADOR DE SALÁRIO
// =============================================
function calcularSalario() {
  const salAntes   = parseFloat(document.getElementById('sal-antes').value)    || 0;
  const salDepois  = parseFloat(document.getElementById('sal-depois').value)   || 0;
  const anos       = parseInt(document.getElementById('sal-anos').value)       || 0;
  const inflacao   = parseFloat(document.getElementById('sal-inflacao').value) || 0;

  if (salAntes <= 0 || salDepois <= 0 || anos <= 0 || inflacao <= 0) {
    alert('Preencha todos os campos.');
    return;
  }

  const salNecessario = corrigir(salAntes, inflacao, anos);
  const acumulada     = inflacaoAcumulada(inflacao, anos);
  const variacaoSal   = ((salDepois - salAntes) / salAntes * 100);
  const diff          = salDepois - salNecessario;

  document.getElementById('sal-necessario').textContent   = formatBRL(salNecessario);
  document.getElementById('sal-atual').textContent        = formatBRL(salDepois);
  document.getElementById('sal-variacao').textContent     = (variacaoSal >= 0 ? '+' : '') + formatPct(variacaoSal);
  document.getElementById('sal-inflacaoAcum').textContent = formatPct(acumulada);

  const diag = document.getElementById('sal-diag');
  if (diff >= 0) {
    diag.className = 'diagnostico positivo';
    diag.innerHTML = `✅ <strong>Parabéns! Seu salário superou a inflação.</strong> Para manter o poder de compra você precisaria ganhar <strong>${formatBRL(salNecessario)}</strong>, mas você ganha <strong>${formatBRL(salDepois)}</strong> — um ganho real de <strong>${formatBRL(diff)}</strong> por mês.`;
  } else {
    diag.className = 'diagnostico negativo';
    diag.innerHTML = `🚨 <strong>Seu salário não acompanhou a inflação.</strong> Para manter o mesmo poder de compra você precisaria ganhar <strong>${formatBRL(salNecessario)}</strong>, mas ganha <strong>${formatBRL(salDepois)}</strong>. Você perdeu <strong>${formatBRL(Math.abs(diff))}/mês</strong> em poder de compra real.`;
  }

  document.getElementById('sal-results').style.display = 'flex';
  document.getElementById('sal-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Sincroniza select de índice com o campo de inflação no modo 1
document.getElementById('pc-indice').addEventListener('change', function() {
  const input = document.getElementById('pc-inflacao');
  if (this.value !== 'custom') {
    input.value    = this.value;
    input.disabled = true;
  } else {
    input.value    = '';
    input.disabled = false;
    input.focus();
  }
});

// Pré-preenche campo na carga
document.getElementById('pc-inflacao').value    = '4.62';
document.getElementById('pc-inflacao').disabled = true;
