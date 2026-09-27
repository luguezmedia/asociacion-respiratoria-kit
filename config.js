/* ============================================================
   Configuración del Kit de arranque
   ------------------------------------------------------------
   Qué completar acá:
   - FORM_ID y ENTRY_IDS: salen de correr crear-form-backend.gs (deja todo
     listo para pegar en el registro de ejecución).
   - WHATSAPP_NUMBER: a dónde llegan los archivos (logo, estatuto, fotos).
   - WHATSAPP_MENSAJE_BASE: mensaje que se abre prearmado en WhatsApp.

   Mientras FORM_ID esté vacío el kit funciona igual: al enviar, el resumen
   completo viaja dentro del mensaje de WhatsApp en lugar del formulario.
   ============================================================ */

window.KIT_CONFIG = {

  // ID del formulario de respaldo. Es la parte del medio de la URL publicada:
  // https://docs.google.com/forms/d/e/ESTE_ES_EL_FORM_ID/viewform
  FORM_ID: '',

  // Un entry id por campo, tal cual los deja el script: "entry.1234567890".
  // Los que queden vacíos se saltean solos al enviar.
  ENTRY_IDS: {
    nombre: '',
    rol: '',
    sigla: '',
    dominio: '',
    manual_marca: '',
    colores: '',
    codigos_color: '',
    estatuto: '',
    reglamento: '',
    mision: '',
    vision: '',
    historia: '',
    comision_directiva: '',
    comision_mostrar: '',
    videos: '',
    disertantes_ok: '',
    evento_nombre: '',
    evento_fecha: '',
    evento_lugar: '',
    redes_tiene: '',
    redes_usuario: '',
    alcance: '',
    posicionamiento: '',
    resumen_completo: ''
  },

  // WhatsApp de la agencia, en formato internacional sin "+" ni espacios.
  WHATSAPP_NUMBER: '5491159145216',

  // Mensaje prearmado. {nombre} se reemplaza solo con lo que escribió la persona.
  WHATSAPP_MENSAJE_BASE: 'Hola, soy {nombre}. Completé el Kit de arranque de la Asociación de Medicina Respiratoria de Ecuatorianos en Argentina y les mando por acá el logo, el estatuto en PDF, los códigos de color o el manual de marca, y las fotos de actividades.'
};
