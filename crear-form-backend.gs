// ============================================================
// KIT DE ARRANQUE - Formulario de respaldo (el "backend" del asistente web)
//
// CÓMO USARLO (3 minutos):
// 1. Entrá a https://script.google.com y creá un "Nuevo proyecto".
// 2. Borrá lo que hay y pegá TODO este archivo.
// 3. Clic en "Ejecutar". Te va a pedir permisos: Avanzado, "Ir a (nombre del
//    proyecto)", Permitir. (Es tu propio proyecto de Google, por eso avisa.)
// 4. Abajo, en el registro de ejecución, aparecen:
//    - El FORM_ID y los ENTRY_IDS listos para pegar en config.js
//    - El link del formulario y el de la planilla donde caen las respuestas
//
// Importante: este formulario NO se comparte con nadie. Lo completa solo la
// página del Kit de arranque, con un envío silencioso.
// ============================================================

function crearFormBackendKit() {

  var form = FormApp.create('Kit de arranque (respaldo) - Asociación de Medicina Respiratoria de Ecuatorianos en Argentina');
  form.setDescription('Este formulario lo completa solo la página del Kit de arranque. No hace falta compartirlo con nadie.');
  form.setCollectEmail(false);
  form.setConfirmationMessage('Recibido.');

  // Mismo orden que ENTRY_IDS en config.js.
  // tipo: 'texto' = pregunta corta | 'parrafo' = párrafo
  var CAMPOS = [
    { id: 'nombre',             titulo: 'Nombre de quien completa',         tipo: 'texto' },
    { id: 'rol',                titulo: 'Rol o institución',                tipo: 'texto' },
    { id: 'sigla',              titulo: 'Sigla o nombre corto',             tipo: 'texto' },
    { id: 'dominio',            titulo: 'Nombre que les gustaría para la web (dominio)', tipo: 'texto' },
    { id: 'manual_marca',       titulo: 'Manual de marca',                  tipo: 'texto' },
    { id: 'colores',            titulo: 'Colores definidos',                tipo: 'texto' },
    { id: 'codigos_color',      titulo: 'Códigos de color',                 tipo: 'texto' },
    { id: 'estatuto',           titulo: 'Estatuto en PDF',                  tipo: 'texto' },
    { id: 'reglamento',         titulo: 'Reglamento interno',               tipo: 'texto' },
    { id: 'mision',             titulo: 'Misión',                           tipo: 'parrafo' },
    { id: 'vision',             titulo: 'Visión',                           tipo: 'parrafo' },
    { id: 'historia',           titulo: 'Historia',                         tipo: 'parrafo' },
    { id: 'comision_directiva', titulo: 'Comisión directiva (Nombre - Cargo; ...)', tipo: 'parrafo' },
    { id: 'comision_mostrar',   titulo: '¿Mostramos la comisión directiva en la web?', tipo: 'texto' },
    { id: 'videos',             titulo: 'Videos (Título | Fecha | Disertante | Link; ...)', tipo: 'parrafo' },
    { id: 'disertantes_ok',     titulo: 'OK de los disertantes para publicar', tipo: 'texto' },
    { id: 'evento_nombre',      titulo: 'Próximo evento: nombre',           tipo: 'texto' },
    { id: 'evento_fecha',       titulo: 'Próximo evento: fecha',            tipo: 'texto' },
    { id: 'evento_lugar',       titulo: 'Próximo evento: lugar',            tipo: 'texto' },
    { id: 'redes_tiene',        titulo: '¿Tienen Instagram o Facebook?',    tipo: 'texto' },
    { id: 'redes_usuario',      titulo: 'Usuario o link de redes',          tipo: 'texto' },
    { id: 'alcance',            titulo: 'Alcance de la web',                tipo: 'texto' },
    { id: 'posicionamiento',    titulo: 'Qué querés que piense un colega al entrar', tipo: 'parrafo' },
    { id: 'resumen_completo',   titulo: 'Resumen completo (respaldo)',      tipo: 'parrafo' }
  ];

  CAMPOS.forEach(function (campo) {
    var item = campo.tipo === 'parrafo' ? form.addParagraphTextItem() : form.addTextItem();
    item.setTitle(campo.titulo);
    item.setRequired(false);
  });

  // Planilla para leer las respuestas ordenadas (queda en tu Drive).
  var planilla = SpreadsheetApp.create('Respuestas - Kit de arranque (Asociación de Medicina Respiratoria)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilla.getId());

  // ---- Sacar FORM_ID y entry IDs de la página publicada ----
  // FormApp no expone los entry IDs, así que se leen del HTML publicado.
  // Vienen en el mismo orden en el que se agregaron las preguntas.
  var urlPublicada = form.getPublishedUrl();
  var formId = '';
  var match = urlPublicada.match(/\/d\/e\/([^\/]+)\//);
  if (match) formId = match[1];

  var entryIds = [];
  var aviso = '';
  try {
    var html = UrlFetchApp.fetch(urlPublicada, { muteHttpExceptions: true }).getContentText();
    var encontrados = html.match(/entry\.\d+/g) || [];
    // Únicos, conservando el orden de aparición.
    encontrados.forEach(function (id) {
      if (entryIds.indexOf(id) === -1) entryIds.push(id);
    });
    if (entryIds.length !== CAMPOS.length) {
      aviso = 'ATENCIÓN: se encontraron ' + entryIds.length + ' entry ids y hay ' +
        CAMPOS.length + ' preguntas. Revisá el orden antes de pegar.';
    }
  } catch (error) {
    aviso = 'No se pudo leer la página publicada (revisá los permisos de UrlFetchApp): ' + error;
  }

  var lineas = CAMPOS.map(function (campo, i) {
    return "    " + campo.id + ": '" + (entryIds[i] || 'FALTA') + "',";
  }).join('\n');

  Logger.log('===== PEGAR EN config.js (kit-arranque) =====');
  Logger.log("FORM_ID: '" + formId + "',");
  Logger.log('ENTRY_IDS: {\n' + lineas + '\n}');
  Logger.log('=============================================');
  Logger.log('Formulario: ' + urlPublicada);
  Logger.log('Planilla de respuestas: ' + planilla.getUrl());
  if (aviso) Logger.log(aviso);
}
