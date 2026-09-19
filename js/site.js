/* ACE Electronics — comportamiento común a todas las páginas:
   menú, borde del header, globo de WhatsApp y envío de formularios. */

// ---------- Envío de formularios ----------
// Servicio de envío (FormSubmit): cada dirección de destino se activa con un clic
// en el correo que le llega la primera vez que alguien envía un formulario. Si el
// servicio no responde, cada formulario ofrece enviar por correo (mailto) o WhatsApp.
const CORREO_VENTAS = 'ventas@aceelectronicsperu.com';                 // cotizaciones
const CORREO_RECLAMOS = 'libro.reclamaciones@aceelectronicsperu.com';  // Libro de Reclamaciones
const CORREO_COPIA_RECLAMOS = 'admin@aceelectronicsperu.com';          // recibe copia de cada hoja

async function enviarFormulario(destino, payload) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${destino}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && (data.success === true || data.success === 'true');
  } catch (e) {
    return false;
  }
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
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const err = document.getElementById('formError');
  const done = document.getElementById('formDone');
  const fail = document.getElementById('formFail');
  const btn = document.getElementById('formSubmit');

  const mostrar = (panel) => {
    contactForm.hidden = panel !== contactForm;
    done.hidden = panel !== done;
    fail.hidden = panel !== fail;
    if (panel !== contactForm) panel.focus();
  };

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validar(contactForm, err)) return;
    const d = Object.fromEntries(new FormData(contactForm).entries());
    const t = (v) => (v || '').trim();
    const pares = [
      ['Nombre', t(d.nombre)],
      ['Empresa', t(d.empresa)],
      ['Correo', t(d.email)],
      ['Teléfono', t(d.telefono)],
      ['Mensaje', t(d.mensaje)],
      ['Consentimiento de datos', 'Sí, aceptó la política de privacidad'],
      ['Fecha', fechaLarga(new Date())]
    ];
    const asunto = `Solicitud de cotización — ${t(d.nombre)}${t(d.empresa) ? ' (' + t(d.empresa) + ')' : ''}`;

    estadoEnvio(btn, true);
    const ok = await enviarFormulario(CORREO_VENTAS, {
      _subject: asunto,
      _template: 'table',
      _captcha: 'false',
      _honey: d._honey || '',
      email: t(d.email),
      _replyto: t(d.email),
      ...Object.fromEntries(pares)
    });
    estadoEnvio(btn, false);

    if (ok) {
      document.getElementById('doneEmail').textContent = t(d.email);
      mostrar(done);
    } else {
      document.getElementById('failMail').href = mailto(CORREO_VENTAS, asunto, aTexto(pares));
      mostrar(fail);
    }
  });

  document.getElementById('formAgain').addEventListener('click', () => { contactForm.reset(); mostrar(contactForm); contactForm.querySelector('input').focus(); });
  fail.querySelector('[data-retry]').addEventListener('click', () => { mostrar(contactForm); btn.focus(); });
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
  const addHidden = (name, value) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = name; i.value = value; lrForm.append(i); };

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
    document.title = `Hoja de Reclamación ${num} — ACE Electronics`;
    lrForm.hidden = true;
    sheet.hidden = false;
    sheet.focus();
  };

  lrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validar(lrForm, err)) return;
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

    // Los campos originales se desactivan y se envían las etiquetas legibles (así llega la hoja ordenada)
    [...lrForm.elements].forEach(el => { if (el.name && el.name !== '_honey') el.disabled = true; });
    pares.forEach(([k, v]) => addHidden(k, v));
    addHidden('_subject', asunto);
    addHidden('_template', 'table');
    addHidden('_captcha', 'false');
    addHidden('email', email);
    addHidden('_replyto', email);
    addHidden('_cc', `${email},${CORREO_COPIA_RECLAMOS}`);
    addHidden('_next', location.href.split('#')[0].split('?')[0] + '#registrada');
    lrForm.action = `https://formsubmit.co/${CORREO_RECLAMOS}`;
    lrForm.method = 'post';
    estadoEnvio(btn, true);
    lrForm.submit();
  });

  // Al volver del servicio de envío
  if (location.hash === '#registrada') {
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

// ---------- Menú móvil ----------
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
  menu.classList.toggle('is-open', !open);
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
}));

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
const GA_ID = '';
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
