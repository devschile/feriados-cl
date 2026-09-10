// PostHog — mismo proyecto compartido con el resto de los sitios de devsChile
// (devschile.cl, beerjs.cl, pegas, tienda...). Cada evento se etiqueta con
// site='feriados.devschile.cl' para poder filtrar sin depender de `$host`.
//
// El token es público (es el que viaja en el bundle de todos los otros sitios),
// así que va literal: este sitio es HTML plano y no tiene paso de build donde
// inyectar variables de entorno.
//
// Solo mide la landing. Las Netlify Functions no pasan por acá: posthog-js es
// una librería de navegador.
(function () {
  var POSTHOG_KEY = 'phc_pMbrDFcoVoYS9kqBRmgLEzdTjuNXYqV4sypn7YsnFuY4';
  var POSTHOG_HOST = 'https://us.i.posthog.com';
  var SITE = 'feriados.devschile.cl';

  // Eventos disparados antes de que cargue el CDN: se guardan y se envían
  // apenas el cliente está listo.
  var pending = [];
  var ready = false;

  // Helper global para que el script de la página pueda registrar eventos sin
  // preocuparse de si PostHog ya cargó (o si nunca carga, por un bloqueador).
  window.dcCapture = function (event, properties) {
    if (ready) {
      window.posthog.capture(event, properties);
    } else {
      pending.push([event, properties]);
    }
  };

  var script = document.createElement('script');
  script.src = 'https://us-assets.i.posthog.com/static/array.js';
  script.async = true;
  script.crossOrigin = 'anonymous';

  script.onload = function () {
    if (!window.posthog || typeof window.posthog.init !== 'function') return;

    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      respect_dnt: true
    });

    window.posthog.register({ site: SITE });

    window.posthog.startExceptionAutocapture({
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false
    });

    ready = true;

    for (var i = 0; i < pending.length; i++) {
      window.posthog.capture(pending[i][0], pending[i][1]);
    }
    pending = [];
  };

  document.head.appendChild(script);
})();
