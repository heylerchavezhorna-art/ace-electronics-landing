/* ACE Electronics — comportamiento común a todas las páginas:
   menú, borde del header, globo de WhatsApp y envío de formularios. */

// ---------- Envío de formularios ----------
// Servicio de envío (FormSubmit): se activa con un clic en el correo que llega
// a esta dirección la primera vez que alguien envía un formulario. Si el servicio
// no responde, cada formulario ofrece enviar por correo (mailto) o WhatsApp.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ventas@aceelectronicsperu.com';
const FORM_MAILTO = 'ventas@aceelectronicsperu.com';

async function enviarFormulario(payload) {
  try {
    const res = await fetch(FORM_ENDPOINT, {
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
const mailto = (asunto, cuerpo) => `mailto:${FORM_MAILTO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
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
    const ok = await enviarFormulario({
      _subject: asunto,
      _template: 'table',
      _captcha: 'false',
      _honey: d._honey || '',
      email: t(d.email),
      _replyto: t(d.email),
      _autoresponse: 'Gracias por escribir a ACE Electronics. Recibimos tu solicitud de cotización y un ingeniero te responderá en un día hábil. Si es urgente, escríbenos por WhatsApp al +51 950 091 893.',
      ...Object.fromEntries(pares)
    });
    estadoEnvio(btn, false);

    if (ok) {
      document.getElementById('doneEmail').textContent = t(d.email);
      mostrar(done);
    } else {
      document.getElementById('failMail').href = mailto(asunto, aTexto(pares));
      mostrar(fail);
    }
  });

  document.getElementById('formAgain').addEventListener('click', () => { contactForm.reset(); mostrar(contactForm); contactForm.querySelector('input').focus(); });
  fail.querySelector('[data-retry]').addEventListener('click', () => { mostrar(contactForm); btn.focus(); });
}

// ---------- Libro de Reclamaciones ----------
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

  lrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validar(lrForm, err)) return;
    const d = Object.fromEntries(new FormData(lrForm).entries());
    const ahora = new Date();
    const num = numeroHoja(ahora);
    const fecha = fechaLarga(ahora);
    const t = (v) => (v || '').trim();

    const pares = [
      ['Hoja de Reclamación N.º', num],
      ['Fecha y hora', fecha],
      ['Nombre completo', t(d.nombre)],
      ['Documento', `${d.tipo_documento} ${t(d.numero_documento)}`],
      ['Domicilio', t(d.domicilio)],
      ['Teléfono', t(d.telefono)],
      ['Correo electrónico', t(d.email)],
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

    // Constancia en pantalla (se usa tanto si el envío en línea funciona como si no)
    document.getElementById('lrNum').textContent = num;
    document.getElementById('lrFecha').textContent = fecha;
    document.getElementById('lrEmail').textContent = t(d.email);
    const resumen = document.getElementById('lrResumen');
    resumen.innerHTML = '';
    pares.slice(2).forEach(([k, v]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v || '-';
      div.append(dt, dd); resumen.append(div);
    });

    estadoEnvio(btn, true);
    const ok = await enviarFormulario({
      _subject: asunto,
      _template: 'table',
      _captcha: 'false',
      _honey: d._honey || '',
      email: t(d.email),
      _replyto: t(d.email),
      _cc: t(d.email),
      _autoresponse: `Hemos registrado tu Hoja de Reclamación N.º ${num} en el Libro de Reclamaciones de ACE Electronics S.A.C. (RUC 20501940195). Recibirás en este mismo correo una copia con el detalle. Responderemos en un plazo máximo de quince (15) días hábiles. La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.`,
      ...Object.fromEntries(pares)
    });
    estadoEnvio(btn, false);

    document.getElementById('lrMsgOk').hidden = !ok;
    document.getElementById('lrMsgFail').hidden = ok;
    const mail = document.getElementById('lrMail');
    mail.href = mailto(asunto, aTexto(pares));
    mail.hidden = ok;
    document.title = `Hoja de Reclamación ${num} — ACE Electronics`;
    lrForm.hidden = true;
    sheet.hidden = false;
    sheet.focus();
    window.scrollTo({ top: sheet.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
  });

  document.getElementById('lrPrint').addEventListener('click', () => window.print());
  document.getElementById('lrBack').addEventListener('click', () => { sheet.hidden = true; lrForm.hidden = false; btn.focus(); });
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
