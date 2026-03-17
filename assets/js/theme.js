// =============================================
//  theme.js — Sistema de temas Poupaí
//  Detecta preferência do SO, persiste no
//  localStorage e alterna dark/light
// =============================================

(function () {

  const STORAGE_KEY = 'poupai-theme';
  const ROOT        = document.documentElement;

  // ===== DETECTA TEMA INICIAL =====
  function temaInicial() {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) return salvo;

    // Segue preferência do sistema operacional
    const prefereLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefereLight ? 'light' : 'dark';
  }

  // ===== APLICA TEMA =====
  function aplicarTema(tema) {
    ROOT.setAttribute('data-theme', tema);
    localStorage.setItem(STORAGE_KEY, tema);
    atualizarBotao(tema);
    atualizarGraficos(tema);
  }

  // ===== ATUALIZA ÍCONE DO BOTÃO =====
  function atualizarBotao(tema) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    btn.setAttribute('title', tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro');
    btn.innerHTML = tema === 'dark' ? iconSol() : iconLua();
  }

  // ===== ALTERNA TEMA =====
  function alternarTema() {
    const atual = ROOT.getAttribute('data-theme') || 'dark';
    aplicarTema(atual === 'dark' ? 'light' : 'dark');
  }

  // ===== ÍCONES SVG =====
  function iconSol() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
  }

  function iconLua() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;
  }

  // ===== ATUALIZA GRÁFICOS CHART.JS =====
  // Reaplica cores dos eixos quando o tema muda
  function atualizarGraficos(tema) {
    if (typeof Chart === 'undefined') return;

    const tickColor  = tema === 'dark' ? 'rgba(255,255,255,0.35)' : '#7B6FA0';
    const gridColor  = tema === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(108,58,255,0.06)';
    const borderColor= tema === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(108,58,255,0.1)';
    const tooltipBg  = tema === 'dark' ? 'rgba(10,10,18,0.95)'    : 'rgba(26,16,53,0.95)';

    Chart.helpers.each(Chart.instances, (chart) => {
      // Atualiza escalas
      Object.values(chart.options.scales || {}).forEach(scale => {
        if (scale.ticks)  scale.ticks.color   = tickColor;
        if (scale.grid)   scale.grid.color    = gridColor;
        if (scale.border) scale.border.color  = borderColor;
      });

      // Atualiza tooltip
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = tooltipBg;
      }

      chart.update('none'); // atualiza sem animação
    });
  }

  // ===== INIT =====
  function init() {
    // Aplica tema antes do render para evitar flash
    const tema = temaInicial();
    ROOT.setAttribute('data-theme', tema);

    // Aguarda DOM para atualizar o botão
    document.addEventListener('DOMContentLoaded', () => {
      atualizarBotao(tema);

      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.addEventListener('click', alternarTema);

      // Escuta mudança de preferência do SO em tempo real
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        // Só muda automaticamente se o usuário não tiver salvo preferência
        if (!localStorage.getItem(STORAGE_KEY)) {
          aplicarTema(e.matches ? 'light' : 'dark');
        }
      });
    });
  }

  // Expõe função de toggle globalmente
  window.alternarTema = alternarTema;

  init();

})();
