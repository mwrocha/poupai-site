// =============================================
//  aposentadoria.js
//  Lógica da calculadora de aposentadoria
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
  ['rendaMensal', 'patrimonioAtual', 'metaPatrimonio', 'gastoAposentado'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur',  () => aoSairDoInput(id));
    input.addEventListener('focus', () => aoEntrarNoInput(id));
  });
});

let graficoInstance = null;
let dadosAnuais     = [];

// Formata número para moeda brasileira
function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Converte taxa anual para mensal
function taxaAnualParaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
}

// =============================================
//  CÁLCULO PRINCIPAL
// =============================================
function calcularAposentadoria() {
  const rendaMensal       = extrairValor('rendaMensal');
  const patrimonioAtual   = extrairValor('patrimonioAtual');
  const metaPatrimonio    = extrairValor('metaPatrimonio');
  const percentual        = parseFloat(document.getElementById('percentualInvestido').value)|| 0;
  const idadeAtual        = parseInt(document.getElementById('idadeAtual').value)           || 0;
  const idadeAposentadoria= parseInt(document.getElementById('idadeAposentadoria').value)   || 0;
  const rentabilidade     = parseFloat(document.getElementById('rentabilidade').value)      || 0;
  const gastoAposentado   = extrairValor('gastoAposentado');

  // Validações
  if (idadeAtual <= 0 || idadeAposentadoria <= idadeAtual) {
    alert('A idade de aposentadoria deve ser maior que a idade atual.');
    return;
  }
  if (rentabilidade <= 0) {
    alert('Informe uma rentabilidade anual válida.');
    return;
  }
  if (metaPatrimonio <= 0) {
    alert('Informe a meta de patrimônio.');
    return;
  }

  const anosAteAposentadoria = idadeAposentadoria - idadeAtual;
  const totalMeses           = anosAteAposentadoria * 12;
  const taxaMensal           = taxaAnualParaMensal(rentabilidade);
  const aporteAtual          = rendaMensal * (percentual / 100);

  // Cálculo do aporte necessário para atingir a meta
  // Fórmula: PMT = (FV - PV*(1+i)^n) * i / ((1+i)^n - 1)
  const fator = Math.pow(1 + taxaMensal, totalMeses);
  const patrimonioFuturoSemAporte = patrimonioAtual * fator;
  let aporteNecessario = 0;

  if (patrimonioFuturoSemAporte < metaPatrimonio) {
    aporteNecessario = (metaPatrimonio - patrimonioFuturoSemAporte) * taxaMensal / (fator - 1);
  }

  // Renda mensal gerada pelo patrimônio (regra dos 4% ao ano = ~0.33% ao mês)
  const rendaGerada = metaPatrimonio * (taxaMensal * 0.5);

  // Simulação ano a ano
  let patrimonio     = patrimonioAtual;
  let totalInvestido = patrimonioAtual;
  dadosAnuais        = [];

  for (let ano = 1; ano <= anosAteAposentadoria; ano++) {
    let aporteAnual = 0;
    for (let m = 0; m < 12; m++) {
      const juros = patrimonio * taxaMensal;
      patrimonio  = patrimonio + juros + aporteNecessario;
      aporteAnual += aporteNecessario;
    }
    totalInvestido += aporteAnual;

    dadosAnuais.push({
      ano,
      idade:         idadeAtual + ano,
      aporteAnual,
      jurosAno:      patrimonio - totalInvestido - (patrimonioAtual - patrimonioAtual),
      totalInvestido,
      patrimonio,
      // para gráfico empilhado
      patrimonioInicialAcum: patrimonioAtual,
      aportesAcum:           totalInvestido - patrimonioAtual,
      jurosAcum:             patrimonio - totalInvestido
    });
  }

  // Atualiza cards
  document.getElementById('resAporte').textContent    = formatBRL(aporteNecessario);
  document.getElementById('resPatrimonio').textContent = formatBRL(patrimonio);
  document.getElementById('resAnos').textContent       = anosAteAposentadoria + ' anos';
  document.getElementById('resRenda').textContent      = formatBRL(rendaGerada);

  // Diagnóstico
  const diag = document.getElementById('diagnostico');
  const diff  = aporteNecessario - aporteAtual;

  if (aporteNecessario <= 0) {
    diag.className = 'diagnostico positivo';
    diag.innerHTML = `🎉 <strong>Parabéns!</strong> Seu patrimônio atual já é suficiente para atingir a meta com a rentabilidade projetada, sem precisar de aportes adicionais.`;
  } else if (diff <= 0) {
    diag.className = 'diagnostico positivo';
    diag.innerHTML = `✅ <strong>Você está no caminho certo!</strong> Seu aporte atual de <strong>${formatBRL(aporteAtual)}</strong> já é suficiente. Você ainda tem uma folga de <strong>${formatBRL(Math.abs(diff))}/mês</strong>.`;
  } else if (diff / aporteNecessario < 0.3) {
    diag.className = 'diagnostico atencao';
    diag.innerHTML = `⚠️ <strong>Quase lá!</strong> Você precisa aumentar seu aporte em apenas <strong>${formatBRL(diff)}/mês</strong> em relação ao que investe hoje (${formatBRL(aporteAtual)}).`;
  } else {
    diag.className = 'diagnostico negativo';
    diag.innerHTML = `📊 Para atingir sua meta, você precisará aportar <strong>${formatBRL(aporteNecessario)}/mês</strong>. Considere aumentar sua renda, reduzir gastos ou ajustar a meta de patrimônio.`;
  }

  // Exibe resultados
  const results = document.getElementById('results');
  results.style.display = 'flex';

  // Monta tabela
  montarTabela();

  // Renderiza gráfico
  document.getElementById('btnMensal').classList.add('active');
  document.getElementById('btnAnual').classList.remove('active');
  renderizarGrafico('mensal');

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  TABELA
// =============================================
function montarTabela() {
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';

  dadosAnuais.forEach((d, i) => {
    const jurosAno = i === 0
        ? d.patrimonio - d.totalInvestido
        : d.patrimonio - dadosAnuais[i - 1].patrimonio - d.aporteAnual;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.ano}</td>
      <td>${d.idade}</td>
      <td>${formatBRL(d.aporteAnual)}</td>
      <td class="juros-col">${formatBRL(Math.max(0, jurosAno))}</td>
      <td>${formatBRL(d.totalInvestido)}</td>
      <td class="montante-col">${formatBRL(d.patrimonio)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================
//  GRÁFICO
// =============================================
function alternarGrafico(modo) {
  document.getElementById('btnMensal').classList.toggle('active', modo === 'mensal');
  document.getElementById('btnAnual').classList.toggle('active', modo === 'anual');
  renderizarGrafico(modo);
}

function renderizarGrafico(modo) {
  const labels            = [];
  const patrimonioSerie   = [];
  const aportesSerie      = [];
  const jurosSerie        = [];

  if (modo === 'anual') {
    dadosAnuais.forEach(d => {
      labels.push('Ano ' + d.ano);
      patrimonioSerie.push(parseFloat(d.patrimonioInicialAcum.toFixed(2)));
      aportesSerie.push(parseFloat(d.aportesAcum.toFixed(2)));
      jurosSerie.push(parseFloat(Math.max(0, d.jurosAcum).toFixed(2)));
    });
  } else {
    // Modo mensal: reconstrói mês a mês a partir dos dados anuais
    // Usa pontos a cada 3 meses para não sobrecarregar
    const patrimonioBase = dadosAnuais[0]?.patrimonioInicialAcum || 0;
    dadosAnuais.forEach(d => {
      // Representa cada ano como um ponto mensal (mês final do ano)
      labels.push('Mês ' + (d.ano * 12));
      patrimonioSerie.push(parseFloat(d.patrimonioInicialAcum.toFixed(2)));
      aportesSerie.push(parseFloat(d.aportesAcum.toFixed(2)));
      jurosSerie.push(parseFloat(Math.max(0, d.jurosAcum).toFixed(2)));
    });
  }

  if (graficoInstance) {
    graficoInstance.destroy();
    graficoInstance = null;
  }

  const ctx = document.getElementById('graficoAposentadoria').getContext('2d');

  graficoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Patrimônio inicial',
          data: patrimonioSerie,
          backgroundColor: 'rgba(108, 58, 255, 0.85)',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Aportes',
          data: aportesSerie,
          backgroundColor: 'rgba(0, 210, 200, 0.85)',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Juros',
          data: jurosSerie,
          backgroundColor: 'rgba(58, 255, 163, 0.85)',
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
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
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatBRL(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
          border:{ color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          stacked: true,
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: 'rgba(255,255,255,0.35)',
            font: { size: 11 },
            callback: val => {
              if (val >= 1_000_000) return 'R$ ' + (val / 1_000_000).toFixed(1) + 'M';
              if (val >= 1_000)     return 'R$ ' + (val / 1_000).toFixed(0) + 'k';
              return 'R$ ' + val;
            }
          },
          border: { color: 'rgba(255,255,255,0.08)' }
        }
      }
    }
  });
}

// =============================================
//  LIMPAR
// =============================================
function limpar() {
  ['rendaMensal','patrimonioAtual','metaPatrimonio','percentualInvestido',
    'idadeAtual','idadeAposentadoria','rentabilidade','gastoAposentado']
      .forEach(id => document.getElementById(id).value = '');

  document.getElementById('results').style.display = 'none';

  if (graficoInstance) {
    graficoInstance.destroy();
    graficoInstance = null;
  }
}