// =============================================
//  juros-compostos.js
//  Lógica da calculadora de juros compostos
// =============================================

let graficoInstance = null;  // instância do Chart.js
let dadosMensais    = [];     // cache dos dados mês a mês
let capitalInicial  = 0;      // cache do capital para o gráfico

// Formata número para moeda brasileira
function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Converte taxa anual para mensal: (1 + taxa)^(1/12) - 1
function taxaAnualParaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
}

// =============================================
//  FORMATAÇÃO DE INPUTS
// =============================================

// Extrai o valor numérico de um input formatado
function extrairValor(id) {
  const raw = document.getElementById(id).value;
  // Remove pontos de milhar e troca vírgula por ponto
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

// Formata número para exibição no input (ex: 100.000,50)
function formatarInput(valor) {
  if (!valor && valor !== 0) return '';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Aplica formatação ao sair do campo (blur)
function aoSairDoInput(id) {
  const input = document.getElementById(id);
  const valor = parseFloat(input.value.replace(/\./g, '').replace(',', '.'));
  if (!isNaN(valor) && valor > 0) {
    input.value = formatarInput(valor);
  }
}

// Limpa formatação ao entrar no campo (focus) — facilita edição
function aoEntrarNoInput(id) {
  const input = document.getElementById(id);
  const valor = parseFloat(input.value.replace(/\./g, '').replace(',', '.'));
  if (!isNaN(valor) && valor > 0) {
    input.value = valor;
  }
}

// Inicializa eventos de formatação nos inputs monetários
document.addEventListener('DOMContentLoaded', () => {
  const inputsMonetarios = ['capital', 'aporte'];

  inputsMonetarios.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('blur',  () => aoSairDoInput(id));
    input.addEventListener('focus', () => aoEntrarNoInput(id));
  });
});

// =============================================
//  CÁLCULO PRINCIPAL
// =============================================
function calcular() {
  const capital        = extrairValor('capital');
  const aporte         = extrairValor('aporte');
  const taxaInput      = parseFloat(document.getElementById('taxa').value.replace(',', '.'))  || 0;
  const periodoInput   = parseInt(document.getElementById('periodo').value)    || 0;
  const periodoTaxa    = document.getElementById('periodoTaxa').value;
  const unidadePeriodo = document.getElementById('unidadePeriodo').value;

  if (taxaInput <= 0 || periodoInput <= 0) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const taxaMensal = periodoTaxa === 'anual'
      ? taxaAnualParaMensal(taxaInput)
      : taxaInput / 100;

  const totalMeses = unidadePeriodo === 'anos'
      ? periodoInput * 12
      : periodoInput;

  // Cálculo mês a mês
  let montante       = capital;
  let totalInvestido = capital;
  capitalInicial     = capital;
  dadosMensais       = [];

  for (let mes = 1; mes <= totalMeses; mes++) {
    const jurosMes    = montante * taxaMensal;
    montante          = montante + jurosMes + aporte;
    totalInvestido   += aporte;

    dadosMensais.push({
      mes,
      aporteExibido: mes === 1 ? capital + aporte : aporte,
      jurosMes,
      totalInvestido,
      montante,
      // acumulados para o gráfico empilhado
      capitalAcum:  capital,
      aportesAcum:  totalInvestido - capital,
      jurosAcum:    montante - totalInvestido
    });
  }

  const totalJuros = montante - totalInvestido;

  // Atualiza cards de resumo
  document.getElementById('resTotal').textContent     = formatBRL(montante);
  document.getElementById('resJuros').textContent     = formatBRL(totalJuros);
  document.getElementById('resInvestido').textContent = formatBRL(totalInvestido);

  // Monta tabela
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';
  dadosMensais.forEach(linha => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${linha.mes}</td>
      <td>${formatBRL(linha.aporteExibido)}</td>
      <td class="juros-col">${formatBRL(linha.jurosMes)}</td>
      <td>${formatBRL(linha.totalInvestido)}</td>
      <td class="montante-col">${formatBRL(linha.montante)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Exibe resultados e renderiza gráfico mensal por padrão
  const results = document.getElementById('results');
  results.style.display = 'flex';

  // Reset botões para mensal
  document.getElementById('btnMensal').classList.add('active');
  document.getElementById('btnAnual').classList.remove('active');

  renderizarGrafico('mensal');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  let labels       = [];
  let capitalSerie = [];
  let aportesSerie = [];
  let jurosSerie   = [];

  if (modo === 'mensal') {
    // Limita a 60 pontos para não sobrecarregar o gráfico
    const passo = dadosMensais.length > 60
        ? Math.ceil(dadosMensais.length / 60)
        : 1;

    dadosMensais.forEach((d, i) => {
      if (i % passo === 0 || i === dadosMensais.length - 1) {
        labels.push('Mês ' + d.mes);
        capitalSerie.push(parseFloat(d.capitalAcum.toFixed(2)));
        aportesSerie.push(parseFloat(d.aportesAcum.toFixed(2)));
        jurosSerie.push(parseFloat(d.jurosAcum.toFixed(2)));
      }
    });
  } else {
    // Agrupa por ano — pega o último mês de cada ano
    const porAno = {};
    dadosMensais.forEach(d => {
      const ano = Math.ceil(d.mes / 12);
      porAno[ano] = d;
    });

    Object.entries(porAno).forEach(([ano, d]) => {
      labels.push('Ano ' + ano);
      capitalSerie.push(parseFloat(d.capitalAcum.toFixed(2)));
      aportesSerie.push(parseFloat(d.aportesAcum.toFixed(2)));
      jurosSerie.push(parseFloat(d.jurosAcum.toFixed(2)));
    });
  }

  // Destrói gráfico anterior se existir
  if (graficoInstance) {
    graficoInstance.destroy();
    graficoInstance = null;
  }

  const ctx = document.getElementById('graficoJuros').getContext('2d');

  graficoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Capital inicial',
          data: capitalSerie,
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
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 18, 0.95)',
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
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: 'rgba(255,255,255,0.35)',
            font: { size: 11 },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12
          },
          border: { color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
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