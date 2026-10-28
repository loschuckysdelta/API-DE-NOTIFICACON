/* Instalación web y descarga opcional de APK; nunca intercambiar PWA y lector Android. */
(() => {
  'use strict';
  const install = document.getElementById('installPwa');
  const native = document.getElementById('downloadApk');
  const info = document.getElementById('installInfo');
  if (!install || !native || !info) return;
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const setInfo = message => { info.textContent = message; };
  const update = () => {
    if (isStandalone()) { install.disabled = true; install.textContent = '✓ Panel instalado'; }
    else { install.disabled = false; install.textContent = '📲 Instalar panel como app'; }
  };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setInfo('El panel web se instaló correctamente. Para leer notificaciones de otras aplicaciones sigue siendo necesario el APK Android.');
    update();
  });
  install.addEventListener('click', async () => {
    if (isStandalone()) { setInfo('El panel ya está instalado en este dispositivo.'); return; }
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        setInfo(choice?.outcome === 'accepted' ? 'Instalación aceptada. Busca NotiWeb en tus aplicaciones.' : 'Instalación cancelada. Puedes intentarlo desde el menú de tu navegador.');
      } catch {
        setInfo('No se pudo abrir el instalador. En Chrome, abre el menú ⋮ y toca «Instalar aplicación» o «Agregar a pantalla principal».');
      }
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setInfo(ios
      ? 'En iPhone: toca Compartir y elige «Agregar a pantalla de inicio». Esta versión web no lee notificaciones de otras apps.'
      : 'En Android con Chrome: abre el menú ⋮ y elige «Instalar aplicación» o «Agregar a pantalla principal». Si no aparece, prueba desde Chrome.');
  });
  native.addEventListener('click', async () => {
    native.disabled = true;
    setInfo('Comprobando si está publicado el APK Android...');
    try {
      const result = await fetch('/downloads/NotiWeb.apk', { method: 'HEAD', cache: 'no-store' });
      if (!result.ok) throw new Error('APK no publicado');
      const kind = result.headers.get('content-type') || '';
      if (kind.includes('text/html')) throw new Error('No se encontró un APK válido');
      const anchor = document.createElement('a');
      anchor.href = '/downloads/NotiWeb.apk';
      anchor.download = 'NotiWeb.apk';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setInfo('Se inició la descarga del APK. Instálalo solo si proviene de tu propio proyecto y verificaste su origen.');
    } catch {
      setInfo('El APK todavía no está publicado. Compílalo en Android Studio y sube el archivo a public/downloads/NotiWeb.apk en GitHub. Luego vuelve a desplegar en Vercel.');
    } finally { native.disabled = false; }
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}));
  }
  update();
})();
