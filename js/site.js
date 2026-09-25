/* ACE Electronics — comportamiento común a todas las páginas:
   menú, borde del header, globo de WhatsApp y envío de formularios. */

// ---------- Envío de formularios ----------
// Servicio de envío (FormSubmit): cada dirección de destino se activa con un clic en el
// correo que le llega la primera vez que alguien envía un formulario desde un dominio.
// Registra en Analytics los momentos que importan (solicitudes, WhatsApp, llamadas).
// Si la persona no aceptó las cookies, gtag no existe y la llamada no hace nada.
const medir = (evento, datos) => { if (typeof window.gtag === 'function') gtag('event', evento, datos || {}); };

const CORREO_VENTAS = 'ventas@aceelectronicsperu.com';                 // cotizaciones
const CORREO_RECLAMOS = 'libro.reclamaciones@aceelectronicsperu.com';  // Libro de Reclamaciones
const CORREO_COPIA_RECLAMOS = 'admin@aceelectronicsperu.com';          // recibe copia de cada hoja


// Frases que FormSubmit descarta como spam (evita que el formulario sirva para enviar enlaces a terceros)
const LISTA_NEGRA = 'http://, https://, www., bit.ly, tinyurl, t.me/, wa.me/, .onion';
const TIENE_ENLACE = /https?:\/\/|www\.|bit\.ly|tinyurl|t\.me\/|wa\.me\//i;
// Campos de texto libre no deben contener enlaces web
function sinEnlaces(form, err) {
  const campo = [...form.querySelectorAll('textarea, input[type="text"]')].find(el => !el.disabled && TIENE_ENLACE.test(el.value));
  if (!campo) return true;
  err.textContent = 'Por seguridad no se aceptan enlaces web en el formulario. Describe el equipo, número de cotización o factura con texto.';
  err.hidden = false; campo.focus(); return false;
}
const addHidden = (form, name, value) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = name; i.value = value; form.append(i); };
// Envío "clásico" a FormSubmit: reCAPTCHA de FormSubmit, copias (_cc) y acuse (_autoresponse) funcionan solo en este modo
function enviarClasico(form, destino, pares, extra) {
  [...form.elements].forEach(el => { if (el.name && el.name !== '_honey' && el.type !== 'file') el.disabled = true; });
  pares.forEach(([k, v]) => addHidden(form, k, v));
  Object.entries(extra).forEach(([k, v]) => addHidden(form, k, v));
  addHidden(form, '_template', 'table');
  addHidden(form, '_blacklist', LISTA_NEGRA);
  form.action = `https://formsubmit.co/${destino}`;
  form.method = 'post';
  form.submit();
}

// Texto plano con los pares etiqueta: valor (para el cuerpo del correo de respaldo)
const aTexto = (pares) => pares.map(([k, v]) => `${k}: ${v || '-'}`).join('\n');
const mailto = (destino, asunto, cuerpo, copia) => `mailto:${destino}?${copia ? 'cc=' + copia + '&' : ''}subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
const fechaLarga = (d) => d.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });

// Validación: muestra un mensaje concreto y enfoca el primer campo con error
function validar(form, err) {
  const campos = [...form.elements].filter(el => el.name && !el.disabled && el.willValidate && !el.validity.valid);
  if (!campos.length) { err.hidden = true; return true; }
  const primero = campos[0];
  if (primero.type === 'checkbox') err.textContent = 'Marca la casilla de la política de privacidad para enviar.';
  else if (primero.type === 'email' && primero.value) err.textContent = 'Revisa el correo electrónico: parece incompleto.';
  else if (primero.type === 'radio') err.textContent = 'Elige una opción en cada pregunta marcada con asterisco.';
  else err.textContent = 'Completa los campos marcados con asterisco para enviar.';
  err.hidden = false;
  primero.focus();
  return false;
}

function estadoEnvio(btn, enviando) {
  btn.disabled = enviando;
  if (enviando) { btn.dataset.label = btn.textContent; btn.textContent = 'Enviando…'; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
}

// ---------- Formulario de cotización (inicio) ----------
// Se envía en modo clásico: FormSubmit muestra su reCAPTCHA y vuelve a la página con #enviado.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const err = document.getElementById('formError');
  const done = document.getElementById('formDone');
  const btn = document.getElementById('formSubmit');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validar(contactForm, err) || !sinEnlaces(contactForm, err)) return;
    const d = Object.fromEntries(new FormData(contactForm).entries());
    const t = (v) => (v || '').trim();
    const email = t(d.email);
    const pares = [
      ['Necesidad', d.necesidad || '-'],
      ['Nombre', t(d.nombre)],
      ['Empresa', t(d.empresa)],
      ['Correo', email],
      ['Teléfono', t(d.telefono)],
      ['Ciudad', d.ciudad || '-'],
      ['Potencia aproximada', d.potencia || 'No indicada'],
      ['Mensaje', t(d.mensaje)],
      ['Consentimiento de datos', 'Sí, aceptó la política de privacidad'],
      ['Fecha', fechaLarga(new Date())]
    ];
    try { sessionStorage.setItem('cot-ultima', JSON.stringify({ email, necesidad: d.necesidad || '', ciudad: d.ciudad || '', t: Date.now() })); } catch (e) {}
    estadoEnvio(btn, true);
    enviarClasico(contactForm, CORREO_VENTAS, pares, {
      _subject: `${(d.necesidad || '').startsWith('Emergencia') ? '🔴 EMERGENCIA' : 'Solicitud de cotización'} — ${t(d.nombre)}${t(d.empresa) ? ' (' + t(d.empresa) + ')' : ''}${d.ciudad ? ' · ' + d.ciudad : ''}`,
      email, _replyto: email,
      _autoresponse: 'Gracias por escribir a ACE Electronics. Recibimos tu solicitud de cotización y un ingeniero te responderá en un día hábil. Si es urgente, escríbenos por WhatsApp al +51 950 091 893. Este es un mensaje automático; no incluye datos de tu solicitud.',
      _next: location.href.split('#')[0].split('?')[0] + '#enviado'
    });
  });

  // Al volver del servicio de envío
  if ((location.hash || '').split(/[?&]/)[0] === '#enviado') {
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem('cot-ultima') || 'null'); sessionStorage.removeItem('cot-ultima'); } catch (e) {}
    document.getElementById('doneEmail').textContent = (data && data.email) || 'tu correo';
    medir('generate_lead', { tipo: (data && data.necesidad) || 'cotización', ciudad: (data && data.ciudad) || '' });
    contactForm.hidden = true;
    done.hidden = false;
    document.getElementById('contacto').scrollIntoView();
    done.focus();
  }
  document.getElementById('formAgain').addEventListener('click', () => { location.href = location.pathname + '#contacto'; location.reload(); });
}

// ---------- Libro de Reclamaciones ----------
// Se envía en modo "clásico" (sin AJAX): es el único modo en que FormSubmit manda
// copias (_cc) al consumidor y a administración. Antes de enviar se guarda la hoja
// en sessionStorage y, al volver con #registrada, se muestra la constancia.
const lrForm = document.getElementById('lrForm');
if (lrForm) {
  const err = document.getElementById('lrError');
  const sheet = document.getElementById('lrDone');
  const btn = document.getElementById('lrSubmit');
  const menor = document.getElementById('lr-menor');
  const apoderado = document.getElementById('lrApoderado');

  // Datos del padre, madre o apoderado solo si el consumidor es menor de edad
  const toggleMenor = () => {
    apoderado.hidden = !menor.checked;
    apoderado.querySelectorAll('input').forEach(i => { i.required = menor.checked; i.disabled = !menor.checked; });
  };
  menor.addEventListener('change', toggleMenor);
  toggleMenor();

  const pad = (n) => String(n).padStart(2, '0');
  const numeroHoja = (d) => `LR-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const mostrarConstancia = ({ num, fecha, email, pares }) => {
    document.getElementById('lrNum').textContent = num;
    document.getElementById('lrFecha').textContent = fecha;
    document.getElementById('lrEmail').textContent = email;
    const resumen = document.getElementById('lrResumen');
    resumen.innerHTML = '';
    pares.slice(2).forEach(([k, v]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v || '-';
      div.append(dt, dd); resumen.append(div);
    });
    medir('libro_reclamaciones', { hoja: num });
    document.title = `Hoja de Reclamación ${num} — ACE Electronics`;
    lrForm.hidden = true;
    sheet.hidden = false;
    sheet.focus();
  };

  lrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validar(lrForm, err) || !sinEnlaces(lrForm, err)) return;
    const d = Object.fromEntries(new FormData(lrForm).entries());
    const ahora = new Date();
    const num = numeroHoja(ahora);
    const fecha = fechaLarga(ahora);
    const t = (v) => (v || '').trim();
    const email = t(d.email);

    const pares = [
      ['Hoja de Reclamación N.º', num],
      ['Fecha y hora', fecha],
      ['Nombre completo', t(d.nombre)],
      ['Documento', `${d.tipo_documento} ${t(d.numero_documento)}`],
      ['Domicilio', t(d.domicilio)],
      ['Teléfono', t(d.telefono)],
      ['Correo electrónico', email],
      ...(menor.checked ? [
        ['Padre, madre o apoderado', t(d.apoderado_nombre)],
        ['Domicilio del apoderado', t(d.apoderado_domicilio)]
      ] : []),
      ['Bien contratado', d.tipo_bien],
      ['Monto reclamado', t(d.monto) ? `S/ ${t(d.monto)}` : 'No indicado'],
      ['Descripción del bien', t(d.descripcion_bien)],
      ['Tipo', d.tipo_reclamo],
      ['Detalle', t(d.detalle)],
      ['Pedido del consumidor', t(d.pedido)],
      ['Consentimiento de datos', 'Sí, aceptó la política de privacidad'],
      ['Observaciones y acciones adoptadas por el proveedor', 'Pendiente: se completa en la respuesta de ACE Electronics S.A.C. (plazo máximo 15 días hábiles)']
    ];
    const asunto = `Libro de Reclamaciones — Hoja ${num} — ${d.tipo_reclamo}`;

    try { sessionStorage.setItem('lr-ultima', JSON.stringify({ num, fecha, email, pares })); } catch (e) {}

    estadoEnvio(btn, true);
    enviarClasico(lrForm, CORREO_RECLAMOS, pares, {
      _subject: asunto,
      email, _replyto: email,
      _cc: `${email},${CORREO_COPIA_RECLAMOS}`,
      _autoresponse: `ACE Electronics S.A.C. (RUC 20501940195) registró su Hoja de Reclamación N.º ${num} el ${fecha}. Recibirá la copia completa de la hoja en un correo aparte y nuestra respuesta en un plazo máximo de quince (15) días hábiles. La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI. Mensaje automático: no responda a este correo.`,
      _next: location.href.split('#')[0].split('?')[0] + '#registrada'
    });
  });

  // Al volver del servicio de envío
  if ((location.hash || '').split(/[?&]/)[0] === '#registrada') {
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem('lr-ultima') || 'null'); } catch (e) {}
    if (data && data.pares) mostrarConstancia(data);
    else mostrarConstancia({ num: '(ver correo)', fecha: fechaLarga(new Date()), email: 'tu correo', pares: [] });
  }

  document.getElementById('lrPrint').addEventListener('click', () => window.print());
  document.getElementById('lrBack').addEventListener('click', () => {
    try { sessionStorage.removeItem('lr-ultima'); } catch (e) {}
    location.href = location.pathname;
  });
}

// ---------- Menú principal ----------
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');
const anchoEscritorio = window.matchMedia('(min-width: 64.0625rem)');

toggle.addEventListener('click', () => {
  const abierto = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!abierto));
  toggle.setAttribute('aria-label', abierto ? 'Abrir menú' : 'Cerrar menú');
  menu.classList.toggle('is-open', !abierto);
  if (abierto) cerrarPaneles();
});

// Paneles desplegables: clic (y hover en escritorio), accesibles con teclado
const items = [...document.querySelectorAll('.nav__item--menu')];
const cerrarPaneles = (excepto) => items.forEach(item => {
  if (item === excepto) return;
  item.classList.remove('nav__item--abierto');
  item.querySelector('.nav__link--btn').setAttribute('aria-expanded', 'false');
  item.querySelector('.panel').hidden = true;
});
const abrirPanel = (item) => {
  cerrarPaneles(item);
  item.classList.add('nav__item--abierto');
  item.querySelector('.nav__link--btn').setAttribute('aria-expanded', 'true');
  item.querySelector('.panel').hidden = false;
};

items.forEach(item => {
  const boton = item.querySelector('.nav__link--btn');
  const panel = item.querySelector('.panel');
  boton.addEventListener('click', () => {
    panel.hidden ? abrirPanel(item) : cerrarPaneles();
  });
  let salir = null;
  item.addEventListener('mouseenter', () => { if (anchoEscritorio.matches) { clearTimeout(salir); abrirPanel(item); } });
  item.addEventListener('mouseleave', () => { if (anchoEscritorio.matches) salir = setTimeout(cerrarPaneles, 180); });
  item.addEventListener('focusout', (e) => { if (anchoEscritorio.matches && !item.contains(e.relatedTarget)) cerrarPaneles(); });
});

// Cerrar con Escape o al pulsar fuera; al elegir un enlace se cierra todo el menú
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const abierto = items.find(i => i.classList.contains('nav__item--abierto'));
  if (abierto) { abierto.querySelector('.nav__link--btn').focus(); cerrarPaneles(); }
});
document.addEventListener('click', (e) => { if (!e.target.closest('.nav__menu')) cerrarPaneles(); });
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
  cerrarPaneles();
}));
anchoEscritorio.addEventListener('change', () => { cerrarPaneles(); menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });

// ---------- Borde del header al hacer scroll ----------
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ---------- Globo de WhatsApp ----------
const waToggle = document.getElementById('waToggle'), waPanel = document.getElementById('waPanel'), waClose = document.getElementById('waClose');
if (waToggle) {
  const setWa = (open) => { waPanel.hidden = !open; waToggle.setAttribute('aria-expanded', String(open)); if (open) waPanel.querySelector('.wa__start').focus(); else waToggle.focus(); };
  waToggle.addEventListener('click', () => setWa(waPanel.hidden));
  waClose.addEventListener('click', () => setWa(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !waPanel.hidden) setWa(false); });
  document.addEventListener('click', (e) => { if (!waPanel.hidden && !document.getElementById('waWidget').contains(e.target)) setWa(false); });
}

// ---------- Analítica (Google Analytics 4) con aviso de cookies ----------
// La medición solo se carga si el visitante acepta. GA_ID vacío = analítica apagada
// (no se muestra el aviso ni el enlace "Cookies" del pie).
const GA_ID = 'G-5BCTF81TRZ';
const CONSENT_KEY = 'ace-cookies';
const banner = document.getElementById('cookiesAviso');
if (GA_ID && banner) {
  const leer = () => { try { const c = JSON.parse(localStorage.getItem(CONSENT_KEY)); if (c && Date.now() - c.t < 365 * 864e5) return c.v; } catch (e) {} return null; };
  const guardar = (v) => { try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) {} };
  let cargado = false;
  const cargarGA = () => {
    if (cargado) return; cargado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true, allow_google_signals: false });
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.append(s);
  };
  const apagarGA = () => {
    if (!cargado) return;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    // borra las cookies _ga* que ya existieran
    document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); if (n.startsWith('_ga')) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${location.hostname}`; });
  };
  const decidir = (v) => { guardar(v); banner.hidden = true; v === 'si' ? cargarGA() : apagarGA(); };
  banner.querySelector('[data-cookies="si"]').addEventListener('click', () => decidir('si'));
  banner.querySelector('[data-cookies="no"]').addEventListener('click', () => decidir('no'));
  document.querySelectorAll('[data-cookies="abrir"]').forEach(a => { a.hidden = false; a.addEventListener('click', (e) => { e.preventDefault(); banner.hidden = false; banner.querySelector('button').focus(); }); });

  const eleccion = leer();
  if (eleccion === 'si') cargarGA();
  else if (eleccion === null && !navigator.globalPrivacyControl) banner.hidden = false;   // GPC activo = rechazo silencioso
}

// ---------- Medición de conversiones (solo si hay consentimiento) ----------
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="https://wa.me/"], a[href^="tel:"]');
  if (!a) return;
  const esWhatsApp = a.href.startsWith('https://wa.me/');
  medir(esWhatsApp ? 'contacto_whatsapp' : 'contacto_telefono', { origen: a.dataset.evento || a.closest('section')?.id || 'pie' });
});

// ---------- Volver arriba ----------
const arriba = document.getElementById('volverArriba');
if (arriba) {
  const verArriba = () => { arriba.hidden = false; arriba.classList.toggle('is-visible', window.scrollY > 900); };
  verArriba();
  addEventListener('scroll', verArriba, { passive: true });
  arriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: document.documentElement.classList.contains('scroll-suave') ? 'smooth' : 'auto' }));
}
