// =============================================
//  reserva-emergencia.js
//  Lógica da calculadora de reserva de emergência
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
  ['rendaMensal', 'gastosMensais', 'valorGuardado', 'aporteReserva'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur',  () => aoSairDoInput(id));
    input.addEventListener('focus', () => aoEntrarNoInput(id));
  });
});

// Estado do quiz
const perfil = {
  vinculo:     null,
  dependentes: null,
  outraRenda:  null
};

// Taxas mensais por tipo de investimento
const taxas = {
  poupanca: 0.005,
  cdb:      0.0079,
  tesouro:  0.0087
};

const nomesInvestimento = {
  poupanca: 'Poupança',
  cdb:      'CDB 100% CDI',
  tesouro:  'Tesouro Selic'
};

// Formata para moeda brasileira
function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// =============================================
//  QUIZ
// =============================================
function selecionarOpcao(campo, valor, el) {
  // Remove seleção anterior no mesmo step
  el.closest('.quiz-options').querySelectorAll('.quiz-option')
      .forEach(o => o.classList.remove('selected'));

  el.classList.add('selected');
  perfil[campo] = valor;

  // Habilita botão próximo do step atual
  const stepAtivo = document.querySelector('.quiz-step.active');
  const btn = stepAtivo.querySelector('.btn-proximo');
  if (btn) btn.disabled = false;
}

function proximoPasso(proximo) {
  const atual = proximo - 1;
  document.getElementById('step' + atual).classList.remove('active');
  document.getElementById('step' + proximo).classList.add('active');

  const pct = proximo === 2 ? 66 : 100;
  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressLabel').textContent = `Pergunta ${proximo} de 3`;
}

function voltarPasso(anterior) {
  const atual = anterior + 1;
  document.getElementById('step' + atual).classList.remove('active');
  document.getElementById('step' + anterior).classList.add('active');

  const pct = anterior === 1 ? 33 : 66;
  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressLabel').textContent = `Pergunta ${anterior} de 3`;
}

function irParaCalculo() {
  // Calcula meses recomendados com base no perfil
  const meses = calcularMesesRecomendados();

  // Monta badge de perfil
  const badge = document.getElementById('perfilBadge');
  badge.innerHTML = `🛡️ Perfil detectado: <strong>${meses} meses</strong> de reserva recomendados para você`;

  // Esconde quiz, exibe form
  document.getElementById('secaoQuiz').style.display = 'none';
  document.getElementById('secaoForm').style.display = 'block';
  document.getElementById('secaoForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function calcularMesesRecomendados() {
  let base = 3;

  // Vínculo
  if (perfil.vinculo === 'clt')        base = 3;
  if (perfil.vinculo === 'servidor')   base = 3;
  if (perfil.vinculo === 'pj')         base = 6;
  if (perfil.vinculo === 'empresario') base = 12;

  // Dependentes
  if (perfil.dependentes === '1')  base = Math.min(base + 1, 12);
  if (perfil.dependentes === '3')  base = Math.min(base + 2, 12);

  // Outra renda reduz 1 mês (mínimo 3)
  if (perfil.outraRenda === 'sim') base = Math.max(base - 1, 3);

  return base;
}

// =============================================
//  CÁLCULO PRINCIPAL
// =============================================
function calcularReserva() {
  const rendaMensal   = extrairValor('rendaMensal');
  const gastosMensais = extrairValor('gastosMensais');
  const valorGuardado = extrairValor('valorGuardado');
  const aporte        = extrairValor('aporteReserva');
  const investimento  = document.getElementById('investimento').value;

  if (gastosMensais <= 0) {
    alert('Informe seus gastos mensais essenciais.');
    return;
  }
  if (aporte <= 0) {
    alert('Informe quanto consegue guardar por mês.');
    return;
  }

  const mesesRecomendados = calcularMesesRecomendados();
  const meta              = gastosMensais * mesesRecomendados;
  const falta             = Math.max(meta - valorGuardado, 0);
  const taxaMensal        = taxas[investimento];

  // Prazo para completar com o aporte informado
  const prazoMeses = calcularPrazo(falta, aporte, taxaMensal);

  // Atualiza cards
  document.getElementById('resMeta').textContent     = formatBRL(meta);
  document.getElementById('resMeses').textContent    = mesesRecomendados + ' meses';
  document.getElementById('resGuardado').textContent = formatBRL(valorGuardado);
  document.getElementById('resPrazo').textContent    = prazoMeses <= 0
      ? '✅ Completa!'
      : formatarPrazo(prazoMeses);

  // Diagnóstico
  const pct  = (valorGuardado / meta) * 100;
  const diag = document.getElementById('diagnostico');

  if (valorGuardado >= meta) {
    diag.className = 'diagnostico positivo';
    diag.innerHTML = `🎉 <strong>Parabéns! Sua reserva já está completa.</strong> Você tem ${formatBRL(valorGuardado)} guardados, o que supera a meta de ${formatBRL(meta)}. Agora pode focar em investimentos de maior rentabilidade!`;
  } else if (pct >= 50) {
    diag.className = 'diagnostico atencao';
    diag.innerHTML = `⚠️ Você já tem <strong>${pct.toFixed(0)}%</strong> da reserva (${formatBRL(valorGuardado)}). Faltam <strong>${formatBRL(falta)}</strong> para completar os ${mesesRecomendados} meses recomendados. Continue! Você está no caminho certo.`;
  } else {
    diag.className = 'diagnostico negativo';
    diag.innerHTML = `📊 Sua reserva atual cobre apenas <strong>${pct.toFixed(0)}%</strong> do necessário. Priorize completar os <strong>${formatBRL(falta)}</strong> que faltam antes de pensar em outros investimentos.`;
  }

  // Comparativo de rendimento
  montarComparativo(falta, prazoMeses, meta);

  // Tabela de sugestões
  montarTabelaSugestao(falta, taxaMensal, aporte);

  // Exibe resultados
  document.getElementById('secaoResultados').style.display = 'block';
  document.getElementById('secaoResultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Calcula prazo em meses para atingir a meta com juros compostos
function calcularPrazo(falta, aporte, taxa) {
  if (falta <= 0) return 0;
  if (aporte <= 0) return Infinity;

  // Simula mês a mês
  let acumulado = 0;
  for (let mes = 1; mes <= 600; mes++) {
    acumulado = acumulado * (1 + taxa) + aporte;
    if (acumulado >= falta) return mes;
  }
  return 600;
}

function formatarPrazo(meses) {
  if (meses >= 600) return '+ 50 anos';
  const anos  = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  if (resto === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return `${anos}a ${resto}m`;
}

// =============================================
//  COMPARATIVO
// =============================================
function montarComparativo(falta, prazoBase, meta) {
  const grid = document.getElementById('comparativoGrid');
  grid.innerHTML = '';

  const investimentos = [
    { key: 'poupanca', nome: 'Poupança',      taxa: taxas.poupanca, tag: false },
    { key: 'cdb',      nome: 'CDB 100% CDI',  taxa: taxas.cdb,      tag: false },
    { key: 'tesouro',  nome: 'Tesouro Selic', taxa: taxas.tesouro,  tag: true  }
  ];

  const aporteAtual = extrairValor('aporteReserva');

  investimentos.forEach(inv => {
    const prazo    = calcularPrazo(falta, aporteAtual, inv.taxa);
    let montante   = 0;
    let jurosTotal = 0;

    for (let m = 0; m < prazo && m < 600; m++) {
      const juros = montante * inv.taxa;
      montante   += juros + aporteAtual;
      jurosTotal += juros;
    }

    const div = document.createElement('div');
    div.className = 'comparativo-item' + (inv.tag ? ' destaque' : '');
    div.innerHTML = `
      <span class="comp-nome">${inv.nome}</span>
      <span class="comp-taxa">${(inv.taxa * 100).toFixed(2)}% a.m.</span>
      <span class="comp-valor">${formatBRL(jurosTotal)} em juros</span>
      <span class="comp-prazo">Prazo: ${formatarPrazo(prazo)}</span>
      ${inv.tag ? '<span class="comp-tag">Melhor opção</span>' : ''}
    `;
    grid.appendChild(div);
  });
}

// =============================================
//  TABELA DE SUGESTÕES
// =============================================
function montarTabelaSugestao(falta, taxaMensal, aporteAtual) {
  const tbody = document.getElementById('tabelaSugestao');
  tbody.innerHTML = '';

  // Gera aportes variados: 50%, atual, 2x, 3x
  const aportes = [
    Math.round(aporteAtual * 0.5 / 50) * 50,
    aporteAtual,
    Math.round(aporteAtual * 1.5 / 50) * 50,
    Math.round(aporteAtual * 2 / 50) * 50,
    Math.round(aporteAtual * 3 / 50) * 50
  ].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

  aportes.forEach(ap => {
    const prazo = calcularPrazo(falta, ap, taxaMensal);
    let montante   = 0;
    let jurosTotal = 0;

    for (let m = 0; m < prazo && m < 600; m++) {
      const juros = montante * taxaMensal;
      montante   += juros + ap;
      jurosTotal += juros;
    }

    const isAtual = ap === aporteAtual;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatBRL(ap)}${isAtual ? ' <span style="font-size:11px;color:var(--c2)">(atual)</span>' : ''}</td>
      <td class="${isAtual ? 'destaque-row' : ''}">${formatarPrazo(prazo)}</td>
      <td class="juros-col">${formatBRL(jurosTotal)}</td>
      <td>${formatBRL(montante)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================
//  REINICIAR
// =============================================
function reiniciar() {
  // Reset perfil
  perfil.vinculo     = null;
  perfil.dependentes = null;
  perfil.outraRenda  = null;

  // Reset quiz
  document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('.btn-proximo').forEach(b => b.disabled = true);
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');
  document.getElementById('progressFill').style.width  = '33%';
  document.getElementById('progressLabel').textContent = 'Pergunta 1 de 3';

  // Reset inputs
  ['rendaMensal','gastosMensais','valorGuardado','aporteReserva'].forEach(id => {
    document.getElementById(id).value = '';
  });

  // Esconde form e resultados, mostra quiz
  document.getElementById('secaoForm').style.display      = 'none';
  document.getElementById('secaoResultados').style.display = 'none';
  document.getElementById('secaoQuiz').style.display      = 'block';
  document.getElementById('secaoQuiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
}