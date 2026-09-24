/* ACE Electronics — solo página de inicio: carrusel de marcas, cifras y revelado. */

// Carrusel de marcas: bucle continuo (clones), flechas, avance cada 4 s con pausa
const car = document.getElementById('brandCarousel');
const track = car.querySelector('.carousel__track');
const originals = [...track.children];
originals.forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
const loopWidth = () => track.children[originals.length].offsetLeft - track.children[0].offsetLeft;
const step = () => track.children[1].offsetLeft - track.children[0].offsetLeft;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let anim = null;
const normalize = () => {
  const w = loopWidth();
  if (track.scrollLeft >= w) track.scrollLeft -= w;
  else if (track.scrollLeft < 0) track.scrollLeft += w;
};
const animateTo = (target) => {
  cancelAnimationFrame(anim);
  if (reduced.matches) { track.scrollLeft = target; normalize(); return; }
  const from = track.scrollLeft, dist = target - from, t0 = performance.now(), dur = 450;
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    track.scrollLeft = from + dist * e;
    if (p < 1) anim = requestAnimationFrame(tick); else { anim = null; normalize(); }
  };
  anim = requestAnimationFrame(tick);
};
const move = (dir) => {
  if (dir < 0 && track.scrollLeft < step()) track.scrollLeft += loopWidth();
  animateTo(Math.round(track.scrollLeft + dir * step()));
};
car.querySelectorAll('.carousel__btn').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.dir))));
track.addEventListener('scroll', () => { if (!anim) normalize(); }, { passive: true });
let timer = null, inView = false;
const play = () => { if (inView && !reduced.matches && !timer) timer = setInterval(() => move(1), 4000); };
const pause = () => { clearInterval(timer); timer = null; };
['mouseenter','focusin'].forEach(e => car.addEventListener(e, pause));
['mouseleave','focusout'].forEach(e => car.addEventListener(e, play));
// Táctil: pausa mientras se toca y reanuda 3 s después de soltar
let resume = null;
car.addEventListener('touchstart', () => { pause(); clearTimeout(resume); }, { passive: true });
['touchend','touchcancel'].forEach(e => car.addEventListener(e, () => { clearTimeout(resume); resume = setTimeout(play, 3000); }, { passive: true }));
document.addEventListener('visibilitychange', () => document.hidden ? pause() : play());
// Solo avanza cuando la sección está en pantalla
new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? play() : pause(); }, { threshold: .4 }).observe(car);

// Cifras: cuentan desde 0 al entrar en pantalla (una sola vez)
const stats = document.getElementById('cifras');
const fmt = (n) => Math.round(n).toLocaleString('es-PE').replace(/[.,]/g, ' ');
const countUp = (el) => {
  const target = Number(el.dataset.count), dur = 1800, t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * e);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
if (reduced.matches) {
  stats.classList.add('is-visible');
} else {
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    stats.classList.add('is-visible');
    stats.querySelectorAll('.num').forEach(countUp);
    obs.disconnect();
  }, { threshold: .5 }).observe(stats);
}

// Secciones: aparecen al entrar en pantalla (una sola vez)
const revealTargets = document.querySelectorAll('.section__head, .solution, .brands__inner, .split__media, .split__body, .gallery__item, .table-wrap, .note, .faq__intro, .faq__list, .contact__intro, .contact__form');
revealTargets.forEach(el => el.classList.add('reveal'));
document.querySelectorAll('.solutions, .gallery').forEach(g => [...g.children].forEach((el, i) => el.style.setProperty('--d', (i * 0.12) + 's')));
if (reduced.matches) {
  revealTargets.forEach(el => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach(el => io.observe(el));
}

// Llegada directa a una sección (p. ej. /#equipos desde Google o desde una
// dirección antigua redirigida): el navegador salta al ancla antes de que la
// página termine de componerse, así que se muestra todo el contenido sin
// animación y se vuelve a encuadrar la sección cuando la carga finaliza.
let destinoInicial = null;
try {
  if (location.hash && location.hash.length > 1 && location.hash !== '#enviado') destinoInicial = document.querySelector(location.hash);
} catch (e) {}
if (destinoInicial) {
  revealTargets.forEach(el => el.classList.add('is-in'));
  // Si la persona ya empezó a desplazarse por su cuenta, no se le mueve la página
  let tocado = false;
  const marcar = () => { tocado = true; };
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, marcar, { once: true, passive: true }));
  const encuadrar = () => { if (!tocado) destinoInicial.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  encuadrar();
  addEventListener('load', () => { encuadrar(); setTimeout(encuadrar, 250); });
}
