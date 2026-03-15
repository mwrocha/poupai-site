// =============================================
//  juros-compostos.js
//  Lógica da calculadora de juros compostos
// =============================================

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

function calcular() {
  // Leitura dos inputs
  const capital        = parseFloat(document.getElementById('capital').value)   || 0;
  const aporte         = parseFloat(document.getElementById('aporte').value)    || 0;
  const taxaInput      = parseFloat(document.getElementById('taxa').value)      || 0;
  const periodoInput   = parseInt(document.getElementById('periodo').value)     || 0;
  const periodoTaxa    = document.getElementById('periodoTaxa').value;
  const unidadePeriodo = document.getElementById('unidadePeriodo').value;

  // Validação básica
  if (taxaInput <= 0 || periodoInput <= 0) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  // Converte taxa para mensal
  const taxaMensal = periodoTaxa === 'anual'
    ? taxaAnualParaMensal(taxaInput)
    : taxaInput / 100;

  // Converte período para meses
  const totalMeses = unidadePeriodo === 'anos'
    ? periodoInput * 12
    : periodoInput;

  // Cálculo mês a mês
  let montante      = capital;
  let totalInvestido = capital;
  const linhas      = [];

  for (let mes = 1; mes <= totalMeses; mes++) {
    const jurosMes = montante * taxaMensal;
    montante       = montante + jurosMes + aporte;
    totalInvestido += aporte;

    linhas.push({
      mes,
      aporte:         mes === 1 ? capital + aporte : aporte,
      jurosMes,
      totalInvestido,
      montante
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

  linhas.forEach(linha => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${linha.mes}</td>
      <td>${formatBRL(linha.aporte)}</td>
      <td class="juros-col">${formatBRL(linha.jurosMes)}</td>
      <td>${formatBRL(linha.totalInvestido)}</td>
      <td class="montante-col">${formatBRL(linha.montante)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Exibe resultados
  const results = document.getElementById('results');
  results.style.display = 'flex';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
