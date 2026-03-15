const sections = document.querySelectorAll('section');
const dots = document.querySelectorAll('.dot');

// Navega até a seção pelo índice (usado nos dots)
function goTo(i) {
  sections[i].scrollIntoView({ behavior: 'smooth' });
}

// Observa qual seção está visível e atualiza o dot ativo
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const idx = Array.from(sections).indexOf(e.target);
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => observer.observe(s));

// Menu hamburguer (mobile)
const hamburger = document.getElementById('hamburger');
const navbarLinks = document.getElementById('navbarLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navbarLinks.classList.toggle('open');
});

// Fecha o menu ao clicar em um link
navbarLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navbarLinks.classList.remove('open');
  });
});
