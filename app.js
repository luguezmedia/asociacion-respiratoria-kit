/* ============================================================
   Kit de arranque - lógica del asistente
   - Una pantalla por paso, navegación Atrás / Siguiente.
   - Autoguardado en localStorage en cada cambio (clave para el celular:
     si cierran WhatsApp o el navegador, al volver retoma donde estaba).
   - Solo el nombre es obligatorio.
   - Envío silencioso a un Google Form (config.js). Si no está configurado
     o falla, igual se llega a la pantalla de gracias y el resumen completo
     viaja dentro del mensaje de WhatsApp.
   ============================================================ */

(function () {
  'use strict';

  var CONFIG = window.KIT_CONFIG || {};
  var STORAGE_KEY = 'kit-arranque-amr-v1';
  var TOTAL = 10;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function trim(v) { return (v || '').trim(); }

  /* ---------- Estado ---------- */

  var state = initialState();
  var currentStep = 1;
  var firstGoTo = true;

  function initialState() {
    return {
      v: 1,
      enviado: false,
      backendOk: null,
      enviadoFecha: null,
      data: {
        nombre: '', rol: '', sigla: '', dominio: '',
        manual_marca: '', colores: '', codigos_color: '',
        estatuto: '', reglamento: '',
        mision: '', vision: '', historia: '',
        comision: [{ nombre: '', cargo: '' }],
        comision_mostrar: '',
        videos: [{ titulo: '', fecha: '', disertante: '', link: '' }],
        disertantes_ok: '',
        evento_nombre: '', evento_fecha: '', evento_lugar: '',
        redes_tiene: '', redes_usuario: '', alcance: '',
        posicionamiento: ''
      }
    };
  }

  /* ---------- Guardado local ---------- */

  var saveTimer = null;
  var saveStateTimer = null;

  function save(now) {
    if (saveTimer) clearTimeout(saveTimer);
    var doSave = function () {
      try {
        var snapshot = {
          v: state.v,
          step: currentStep,
          enviado: state.enviado,
          backendOk: state.backendOk,
          enviadoFecha: state.enviadoFecha,
          savedAt: Date.now(),
          data: state.data
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setSaveState('ok');
      } catch (err) {
        // Modo privado o almacenamiento lleno: avisamos sin romper nada.
        setSaveState('error');
      }
    };
    if (now) { doSave(); } else { saveTimer = setTimeout(doSave, 350); }
  }

  function setSaveState(kind) {
    var el = $('#save-state');
    if (!el) return;
    if (kind === 'error') {
      el.textContent = 'No se guarda solo';
      el.classList.add('is-on', 'is-error');
      return;
    }
    el.classList.remove('is-error');
    el.textContent = 'Guardado';
    el.classList.add('is-on');
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(function () { el.classList.remove('is-on'); }, 1600);
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !parsed.data) return false;

      var base = initialState();
      state.v = base.v;
      state.enviado = !!parsed.enviado;
      state.backendOk = parsed.backendOk;
      state.enviadoFecha = parsed.enviadoFecha || null;
      state.data = Object.assign(base.data, parsed.data);

      if (!Array.isArray(state.data.comision) || !state.data.comision.length) {
        state.data.comision = [{ nombre: '', cargo: '' }];
      }
      if (!Array.isArray(state.data.videos) || !state.data.videos.length) {
        state.data.videos = [{ titulo: '', fecha: '', disertante: '', link: '' }];
      }
      return { step: Math.min(Math.max(parsed.step || 1, 1), TOTAL) };
    } catch (err) {
      return false;
    }
  }

  /* ---------- Hidratar el formulario con el estado guardado ---------- */

  function hydrate() {
    $$('input[name], textarea[name], input[type="date"][name]').forEach(function (el) {
      if (el.type === 'radio') {
        el.checked = (state.data[el.name] === el.value);
      } else if (typeof state.data[el.name] === 'string') {
        el.value = state.data[el.name];
      }
    });
    syncCheckedClasses();
    renderRows('comision');
    renderRows('videos');
    $$('textarea').forEach(autoGrow);
  }

  function syncCheckedClasses() {
    $$('.opt input').forEach(function (inp) {
      var label = inp.closest('.opt');
      if (label) label.classList.toggle('is-checked', inp.checked);
    });
  }

  /* ---------- Filas dinámicas ---------- */

  function renderRows(kind) {
    var cont = $('[data-rows="' + kind + '"]');
    var tpl = $('#tpl-' + kind);
    if (!cont || !tpl) return;

    cont.innerHTML = '';
    state.data[kind].forEach(function (item, i) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      var num = $('.row-row__num', node);
      if (num) num.textContent = (kind === 'comision' ? 'Integrante ' : 'Video ') + (i + 1);
      $$('input', node).forEach(function (inp) {
        inp.value = item[inp.getAttribute('data-col')] || '';
      });
      cont.appendChild(node);
    });

    var empty = $('[data-empty="' + kind + '"]');
    if (empty) empty.hidden = state.data[kind].length > 0;
  }

  function readRows(kind) {
    var cont = $('[data-rows="' + kind + '"]');
    if (!cont) return [];
    return $$('.row-row', cont).map(function (row) {
      var item = {};
      $$('input', row).forEach(function (inp) {
        item[inp.getAttribute('data-col')] = inp.value;
      });
      return item;
    });
  }

  function addRow(kind) {
    state.data[kind] = readRows(kind);
    state.data[kind].push(kind === 'comision'
      ? { nombre: '', cargo: '' }
      : { titulo: '', fecha: '', disertante: '', link: '' });
    renderRows(kind);

    var cont = $('[data-rows="' + kind + '"]');
    var last = cont.lastElementChild;
    if (last) {
      last.scrollIntoView({ block: 'nearest' });
      var firstInput = $('input', last);
      if (firstInput) firstInput.focus();
    }
    save(true);
  }

  function removeRow(btn) {
    var row = btn.closest('.row-row');
    var cont = btn.closest('[data-rows]');
    if (!row || !cont) return;
    var kind = cont.getAttribute('data-rows');
    state.data[kind] = readRows(kind);
    var idx = $$('.row-row', cont).indexOf(row);
    if (idx > -1) state.data[kind].splice(idx, 1);
    renderRows(kind);

    var addBtn = $('[data-add="' + kind + '"]');
    if (addBtn) addBtn.focus();
    save(true);
  }

  /* ---------- Navegación ---------- */

  function goTo(step) {
    currentStep = Math.min(Math.max(step, 1), TOTAL);

    $$('.step').forEach(function (s) {
      var active = String(s.getAttribute('data-step')) === String(currentStep);
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });

    var back = $('#btn-back');
    var nextLabel = $('#btn-next-label');
    var next = $('#btn-next');
    next.disabled = false;
    if (back) back.hidden = currentStep === 1;
    if (nextLabel) nextLabel.textContent = currentStep === TOTAL ? 'Enviar' : 'Siguiente';

    $('#paso-label').textContent = 'Paso ' + currentStep + ' de ' + TOTAL;
    var fill = $('#progress-fill');
    fill.style.transform = 'scaleX(' + (currentStep / TOTAL) + ')';
    var prog = $('#progress');
    prog.setAttribute('aria-valuenow', String(currentStep));
    prog.setAttribute('aria-valuetext', 'Paso ' + currentStep + ' de ' + TOTAL);

    if (currentStep === TOTAL) renderSummary();

    if (!firstGoTo) {
      var note = $('#resume-note');
      if (note) note.hidden = true;
    }
    firstGoTo = false;

    window.scrollTo(0, 0);

    var section = $('[data-step="' + currentStep + '"]');
    if (section) $$('textarea', section).forEach(autoGrow);
    var heading = section ? $('.step__title, .colorblock__title', section) : null;
    var status = $('#sr-status');
    if (status) status.textContent = 'Paso ' + currentStep + ' de ' + TOTAL +
      (heading ? ': ' + heading.textContent : '');
    if (heading) heading.focus({ preventScroll: true });

    save();
  }

  function showThanks(sent) {
    $$('.step').forEach(function (s) { s.classList.remove('is-active'); s.hidden = true; });
    var thanks = $('[data-step="gracias"]');
    thanks.hidden = false;
    thanks.classList.add('is-active');

    var nav = $('#stepnav');
    if (nav) nav.hidden = true;

    $('#paso-label').textContent = 'Listo';
    $('#progress-fill').style.transform = 'scaleX(1)';

    var wa = $('#wa-link');
    if (wa) wa.href = buildWhatsAppLink(sent);
    var fallback = $('#wa-fallback-note');
    if (fallback) fallback.hidden = !!sent;

    window.scrollTo(0, 0);
    var heading = $('.colorblock__title', thanks);
    var status = $('#sr-status');
    if (status) status.textContent = 'Kit enviado. Último paso: mandar los archivos por WhatsApp.';
    if (heading) heading.focus({ preventScroll: true });
  }

  /* ---------- Validación (solo el nombre es obligatorio) ---------- */

  function validateStep1() {
    var input = $('#f-nombre');
    var error = $('#e-nombre');
    if (trim(input.value)) {
      input.removeAttribute('aria-invalid');
      error.hidden = true;
      return true;
    }
    input.setAttribute('aria-invalid', 'true');
    error.hidden = false;
    input.focus();
    return false;
  }

  /* ---------- Resumen ---------- */

  // Estructura del resumen: qué se muestra y desde qué paso se edita.
  var GROUPS = [
    { step: 1, titulo: 'Quién completa', rows: [['nombre', 'Nombre'], ['rol', 'Rol o institución']] },
    { step: 2, titulo: 'Identidad', rows: [['sigla', 'Sigla'], ['dominio', 'Nombre para la web'], ['manual_marca', 'Manual de marca'], ['colores', 'Colores definidos'], ['codigos_color', 'Códigos de color']] },
    { step: 3, titulo: 'Documentación', rows: [['estatuto', 'Estatuto en PDF'], ['reglamento', 'Reglamento interno']] },
    { step: 4, titulo: 'Textos base', rows: [['mision', 'Misión'], ['vision', 'Visión'], ['historia', 'Historia']] },
    { step: 5, titulo: 'Comisión directiva', rows: [['comision_txt', 'Integrantes'], ['comision_mostrar', 'Mostrar en la web']] },
    { step: 6, titulo: 'Clases y videos', rows: [['videos_txt', 'Videos'], ['disertantes_ok', 'OK de disertantes']] },
    { step: 7, titulo: 'Próximo evento', rows: [['evento_nombre', 'Evento'], ['evento_fecha_txt', 'Fecha'], ['evento_lugar', 'Lugar']] },
    { step: 8, titulo: 'Redes y alcance', rows: [['redes_tiene', 'Redes'], ['redes_usuario', 'Usuario'], ['alcance', 'Alcance']] },
    { step: 9, titulo: 'Primera impresión', rows: [['posicionamiento', 'Qué querés que piense']] }
  ];

  function comisionText() {
    return state.data.comision
      .filter(function (c) { return trim(c.nombre) || trim(c.cargo); })
      .map(function (c) { return trim(c.nombre) + ' - ' + trim(c.cargo); })
      .join('\n');
  }

  function videosText() {
    return state.data.videos
      .filter(function (v) { return trim(v.titulo) || trim(v.fecha) || trim(v.disertante) || trim(v.link); })
      .map(function (v) { return [v.titulo, v.fecha, v.disertante, v.link].map(trim).join(' | '); })
      .join('\n');
  }

  function valueFor(key) {
    if (key === 'comision_txt') return comisionText();
    if (key === 'videos_txt') return videosText();
    if (key === 'evento_fecha_txt') return fmtFecha(state.data.evento_fecha);
    return trim(state.data[key]);
  }

  function renderSummary() {
    var cont = $('#resumen');
    if (!cont) return;
    cont.innerHTML = '';

    GROUPS.forEach(function (g) {
      var group = document.createElement('div');
      group.className = 'sumgroup';

      var head = document.createElement('div');
      head.className = 'sumgroup__head';
      var title = document.createElement('h3');
      title.textContent = g.titulo;
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'linklike';
      edit.setAttribute('data-edit', String(g.step));
      edit.textContent = 'Editar';
      head.appendChild(title);
      head.appendChild(edit);
      group.appendChild(head);

      var dl = document.createElement('dl');
      dl.className = 'sumlist';
      g.rows.forEach(function (pair) {
        var row = document.createElement('div');
        row.className = 'sumrow';
        var dt = document.createElement('dt');
        dt.textContent = pair[1];
        var dd = document.createElement('dd');
        var val = valueFor(pair[0]);
        if (val) {
          dd.textContent = val;
        } else {
          dd.textContent = 'Sin completar';
          dd.classList.add('is-empty');
        }
        row.appendChild(dt);
        row.appendChild(dd);
        dl.appendChild(row);
      });
      group.appendChild(dl);
      cont.appendChild(group);
    });
  }

  /* ---------- Serialización y envío ---------- */

  function fmtFecha(iso) {
    if (!iso) return '';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function fechaHora() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function buildResumen() {
    var d = state.data;
    var lines = [];

    lines.push('KIT DE ARRANQUE');
    lines.push('Asociación de Medicina Respiratoria de Ecuatorianos en Argentina');
    lines.push('Completado por: ' + (trim(d.nombre) || '(sin nombre)') + (trim(d.rol) ? ' (' + trim(d.rol) + ')' : ''));
    lines.push('Fecha: ' + fechaHora());

    function block(titulo, items) {
      var withValue = items.filter(function (it) { return trim(it[1]); });
      if (!withValue.length) return;
      lines.push('');
      lines.push(titulo.toUpperCase());
      withValue.forEach(function (it) { lines.push(it[0] + ': ' + trim(it[1])); });
    }

    block('Identidad', [
      ['Sigla', d.sigla],
      ['Nombre para la web', d.dominio],
      ['Manual de marca', d.manual_marca],
      ['Colores definidos', d.colores],
      ['Códigos de color', d.codigos_color]
    ]);
    block('Documentación', [
      ['Estatuto en PDF', d.estatuto],
      ['Reglamento interno', d.reglamento]
    ]);
    block('Textos base', [
      ['Misión', d.mision],
      ['Visión', d.vision],
      ['Historia', d.historia]
    ]);
    block('Comisión directiva', [
      ['Integrantes', comisionText()],
      ['Mostrar en la web', d.comision_mostrar]
    ]);
    block('Clases y videos', [
      ['Videos', videosText()],
      ['OK de disertantes', d.disertantes_ok]
    ]);
    block('Próximo evento', [
      ['Evento', d.evento_nombre],
      ['Fecha', fmtFecha(d.evento_fecha)],
      ['Lugar', d.evento_lugar]
    ]);
    block('Redes y alcance', [
      ['Redes', d.redes_tiene],
      ['Usuario', d.redes_usuario],
      ['Alcance', d.alcance]
    ]);
    block('Primera impresión', [
      ['Qué querés que piense', d.posicionamiento]
    ]);

    return lines.join('\n');
  }

  function collect() {
    var d = state.data;
    return {
      nombre: trim(d.nombre),
      rol: trim(d.rol),
      sigla: trim(d.sigla),
      dominio: trim(d.dominio),
      manual_marca: d.manual_marca,
      colores: d.colores,
      codigos_color: trim(d.codigos_color),
      estatuto: d.estatuto,
      reglamento: d.reglamento,
      mision: trim(d.mision),
      vision: trim(d.vision),
      historia: trim(d.historia),
      comision_directiva: comisionText().replace(/\n/g, '; '),
      comision_mostrar: d.comision_mostrar,
      videos: videosText().replace(/\n/g, '; '),
      disertantes_ok: d.disertantes_ok,
      evento_nombre: trim(d.evento_nombre),
      evento_fecha: fmtFecha(d.evento_fecha),
      evento_lugar: trim(d.evento_lugar),
      redes_tiene: d.redes_tiene,
      redes_usuario: trim(d.redes_usuario),
      alcance: d.alcance,
      posicionamiento: trim(d.posicionamiento),
      resumen_completo: buildResumen()
    };
  }

  // POST silencioso (mode: no-cors) al Google Form de respaldo.
  // Sin FORM_ID o sin ENTRY_IDS configurados devuelve false y no rompe nada.
  function postToGoogleForm(payload) {
    var formId = trim(CONFIG.FORM_ID || '');
    var entryIds = CONFIG.ENTRY_IDS || {};
    if (!formId) return Promise.resolve(false);

    var params = new URLSearchParams();
    var mapped = 0;
    Object.keys(entryIds).forEach(function (key) {
      var entry = trim(entryIds[key] || '');
      var value = payload[key];
      if (!entry || !value) return;
      params.append(entry, value);
      mapped++;
    });
    if (!mapped) return Promise.resolve(false);

    var url = 'https://docs.google.com/forms/d/e/' + encodeURIComponent(formId) + '/formResponse';
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 8000);

    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString(),
      signal: controller ? controller.signal : undefined
    }).then(function () {
      clearTimeout(timer);
      return true;
    }).catch(function () {
      clearTimeout(timer);
      return false;
    });
  }

  function submit() {
    var payload = collect();
    var btn = $('#btn-next');
    var label = $('#btn-next-label');
    btn.disabled = true;
    label.textContent = 'Enviando...';

    var finish = function (sent) {
      state.enviado = true;
      state.backendOk = sent;
      state.enviadoFecha = new Date().toISOString();
      save(true);
      showThanks(sent);
    };

    try {
      postToGoogleForm(payload).then(finish).catch(function () { finish(false); });
    } catch (err) {
      // Nada frena la entrega: si el envío no se puede ni intentar,
      // el resumen viaja igual dentro del mensaje de WhatsApp.
      finish(false);
    }
  }

  /* ---------- WhatsApp ---------- */

  function buildWhatsAppLink(sent) {
    var base = CONFIG.WHATSAPP_MENSAJE_BASE ||
      'Hola, soy {nombre}. Completé el Kit de arranque de la asociación.';
    var text = base.replace('{nombre}', trim(state.data.nombre) || 'de la asociación');

    // Si el envío al formulario no está configurado o falló, el resumen viaja acá.
    if (!sent) {
      var resumen = buildResumen();
      var max = 1200;
      if (resumen.length > max) resumen = resumen.slice(0, max) + ' [...]';
      text += '\n\n---\n' + resumen;
    }

    var number = String(CONFIG.WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
  }

  /* ---------- Utilidades ---------- */

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }

  function updateSiglaPreview() {
    var el = $('#sigla-preview');
    if (!el) return;
    var v = trim(state.data.sigla);
    if (!v) { el.hidden = true; return; }
    // Normaliza "AMREA" o "Amrea!" a "amrea", sin acentos ni símbolos.
    var lower = v.toLowerCase().normalize('NFD');
    var slug = '';
    for (var i = 0; i < lower.length; i++) {
      var code = lower.charCodeAt(i);
      if (code >= 0x300 && code <= 0x36f) continue; // marcas de acento descompuestas
      var ch = lower.charAt(i);
      if (/[a-z0-9]/.test(ch)) slug += ch;
    }
    if (!slug) { el.hidden = true; return; }
    el.textContent = 'Mirá cómo quedaría la web: ' + slug + '.org.ar';
    el.hidden = false;
  }

  function updateConditionals() {
    $('#g-redes-usuario').hidden = state.data.redes_tiene !== 'Sí';
  }

  function updateFooter() {
    var number = String(CONFIG.WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
    if (!number) return;
    var wrap = $('#footer-contacto');
    var link = $('#footer-wa');
    link.href = 'https://wa.me/' + number + '?text=' +
      encodeURIComponent('Hola, tengo una duda con el Kit de arranque de la asociación.');
    wrap.hidden = false;
  }

  /* ---------- Eventos ---------- */

  function wire() {
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('input[type="text"][name], textarea[name]')) {
        state.data[t.name] = t.value;
        if (t.name === 'sigla') updateSiglaPreview();
        if (t.name === 'nombre') {
          t.removeAttribute('aria-invalid');
          var error = $('#e-nombre');
          if (error) error.hidden = true;
        }
        if (t.tagName === 'TEXTAREA') autoGrow(t);
        save();
      } else if (t.matches('[data-rows] input')) {
        var cont = t.closest('[data-rows]');
        state.data[cont.getAttribute('data-rows')] = readRows(cont.getAttribute('data-rows'));
        save();
      }
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('input[type="radio"]')) {
        state.data[t.name] = t.value;
        syncCheckedClasses();
        updateConditionals();
        save();
      } else if (t.matches('input[type="date"][name]')) {
        state.data[t.name] = t.value;
        save();
      }
    });

    document.addEventListener('click', function (e) {
      var remove = e.target.closest('[data-remove]');
      if (remove) { removeRow(remove); return; }
      var add = e.target.closest('[data-add]');
      if (add) { addRow(add.getAttribute('data-add')); return; }
      var edit = e.target.closest('[data-edit]');
      if (edit) { goTo(parseInt(edit.getAttribute('data-edit'), 10)); return; }
    });

    // Enter en un campo de texto avanza, salvo en los textarea.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && e.target.matches('input[type="text"][name]')) {
        e.preventDefault();
        $('#btn-next').click();
      }
    });

    $('#btn-next').addEventListener('click', function () {
      if (currentStep === TOTAL) { submit(); return; }
      if (currentStep === 1 && !validateStep1()) return;
      goTo(currentStep + 1);
    });

    $('#btn-back').addEventListener('click', function () {
      goTo(currentStep - 1);
    });

    $('#btn-review').addEventListener('click', function () {
      $('#stepnav').hidden = false;
      goTo(TOTAL);
    });

    // Guardar al salir o al pasar la app a segundo plano (muy común en el celular).
    window.addEventListener('pagehide', function () { save(true); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') save(true);
    });
  }

  /* ---------- Arranque ---------- */

  function init() {
    var restored = load();
    hydrate();
    updateConditionals();
    updateSiglaPreview();
    updateFooter();
    wire();

    if (restored && state.enviado) {
      showThanks(state.backendOk === true);
      return;
    }

    var start = restored ? restored.step : 1;
    if (restored && start > 1) {
      var note = $('#resume-note');
      if (note) note.hidden = false;
    }
    goTo(start);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
