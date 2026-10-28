# NotiWeb — Notificaciones REALES del Android a MongoDB

La página web NO puede leer las notificaciones de otras aplicaciones del teléfono. El componente nativo (`android/`) utiliza **NotificationListenerService** (acceso explícito a notificaciones del sistema Android) para leer **solo las notificaciones NUEVAS de las apps que autorices**.

## Lo que ya está implementado en este código fuente

- Servicio `NotiListener` registrado en AndroidManifest.xml con `BIND_NOTIFICATION_LISTENER_SERVICE`.
- Botón para abrir los ajustes de Android, donde el propietario concede o revoca el acceso.
- Permitir/ignorar por aplicación desde el panel privado en Vercel; todas comienzan en `Ignorar`.
- No lectura del título ni del texto de un aviso si la aplicación no está autorizada en la política reciente.
- Filtrado básico de OTP y códigos de acceso; evita autorizar apps con datos particularmente sensibles.
- Envío HTTPS con `INGEST_TOKEN` a `/api/ingest`, que vuelve a comprobar el permiso antes de guardar la notificación en MongoDB.
- Cola local para reintentar envíos cuando regrese la conexión; botón para detener el envío y limpiar la cola.
- Endpoint `/api/device-status` para ver **celulares conectados, incluso con cero notificaciones**. Envía solo identificador, nombre elegido y estado, nunca mensajes.
- Botón **Comprobar conexión y sincronizar apps**: informa si el token fue rechazado (`401`), si MongoDB/API fallan (`503`) o si el servidor responde.

## 1. Subir el proyecto a GitHub y Vercel

Descomprime el ZIP y sube su contenido **directamente a la raíz** del repositorio `API-DE-NOTIFICACION` (carpetas `api/`, `lib/`, `public/`, `android/`, `.github/`, etc.; no subas la carpeta envolvente ni el ZIP como único archivo).

- En Vercel configura **Root Directory: `./`** y **Framework Preset: Other**.
- En Vercel, configura `MONGODB_URI`, `MONGODB_DB=notiweb`, `INGEST_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET` y `READ_TOKEN` con valores fuertes, distintos y PRIVADOS.
- Si compartiste alguna contraseña o token en una conversación, cámbialos primero. No guardes secretos en GitHub ni dentro del APK.
- Comprueba `/api/health` (API responde). Desde sesión del panel, `/api/health?db=1` verifica MongoDB. Debes tener acceso a MongoDB Atlas desde la infraestructura de Vercel.

## 2. Conseguir un APK (NO está precompilado)

Este ZIP contiene código fuente, no un APK ya compilado. Opciones:

**Con GitHub Actions (sin instalar Android Studio en tu PC):**

1. Sube el proyecto a GitHub con `.github/workflows/compilar-apk.yml` incluido.
2. Abre GitHub → repositorio `API-DE-NOTIFICACION` → pestaña **Actions** → **Compilar APK Android NotiWeb**.
3. Pulsa **Run workflow** si no se ejecutó al subir el código; abre la ejecución terminada.
4. En **Artifacts**, descarga `NotiWeb-Android-debug`, descomprime y obtén `app-debug.apk`.
5. Instálalo únicamente en TU propio Android, verificando antes el origen y el código. La compilación no requiere incrustar ningún token privado.

**Con Android Studio:** abre la carpeta `android/`, usa JDK 17, Gradle 8.13, SDK Android 35 y Build → Build APK(s). Puedes necesitar generar el Gradle Wrapper porque el proyecto fuente no contiene wrapper ejecutable.

Este proyecto no se ha compilado ni probado en un teléfono real desde esta sesión; la compilación de GitHub podría mostrar ajustes adicionales a corregir. No afirmamos que el APK ya exista.

## 3. Activar lectura real en tu celular

1. Abre **NotiWeb Android APK** instalado (NO el icono PWA que Chrome añade a la pantalla de inicio).
2. Introduce URL HTTPS de tu Vercel, tu `INGEST_TOKEN` privado y el nombre del celular. Pulsa **Guardar configuración**.
3. Toca **1. Conceder acceso a notificaciones** y autoriza voluntariamente NotiWeb en la pantalla del sistema Android. Este es un acceso especial: el permiso de que NotiWeb te envíe notificaciones NO es el mismo.
4. Toca **2. INICIAR ENVÍO A MONGODB**.
5. Toca **3. COMPROBAR CONEXIÓN Y SINCRONIZAR APPS**. Debe indicar `API y MongoDB responden`; si aparece 401 comprueba el token; si 503 comprueba MongoDB y Vercel; si hay error HTTPS comprueba URL y red.
6. En Vercel, abre tu panel con `ADMIN_PASSWORD`. En **Control de aplicaciones**, elige expresamente **Permitir** solo para los paquetes reales de las aplicaciones cuyos avisos quieras registrar. Si necesitas otra app, utiliza **Agregar aplicación** con su package ID real; por defecto queda bloqueada.
7. Espera aproximadamente 30–60 s para que las reglas lleguen al Android. Envía una notificación de prueba segura a una app permitida (sin OTP ni datos privados) y revisa **Centro de notificaciones**.
8. Consulta **Estado de mis celulares Android** en el panel: aparecerá incluso si todavía hay 0 mensajes guardados. El indicador «Conectado» requiere que el lector esté vinculado y haya comunicación reciente.

### Importante sobre permisos y seguridad

- Android tiene controles especiales que pueden impedir conceder acceso a notificaciones a algunas apps instaladas fuera de tiendas confiables. No se debe eludir una advertencia de seguridad sin verificar el origen de la app.
- El usuario puede revocar el acceso desde Ajustes de Android y usar el botón Pausar envío.
- El listener puede detenerse o retrasarse por restricciones de batería, fabricante, modo de ahorro o políticas del teléfono. La sincronización no está garantizada en tiempo real.
- Solo se reciben avisos que Android muestra al sistema; no se accede a bases internas de Lemon, Yape, WhatsApp u otros bancos.
- Las notificaciones bancarias NO prueban que un pago se haya realizado. Verifica siempre dentro de la aplicación bancaria oficial.
- Los códigos de verificación reconocibles se excluyen, pero el filtrado nunca es infalible. Prioriza apps no sensibles y controla permisos con cuidado.

## 4. Qué hacer si la página marca «0 notificaciones»

- Si en **Estado de mis celulares Android** todavía no figura el móvil, el problema es URL, token, permiso, listener o MongoDB. Abre el APK y usa el botón **3. Comprobar conexión**.
- Si el móvil sí aparece y dice conectado pero hay **0 notificaciones**, comprueba que permitiste el **identificador exacto** de la app, que el teléfono tenga internet y que realmente hayas recibido una notificación nueva.
- Si el código 401 aparece al comprobar conexión, `INGEST_TOKEN` del APK no coincide con Vercel. Si hay 503, revisa conexión MongoDB Atlas/IPs y logs privados de Vercel.
- Si el APK está pausado, no se envía nada; al reanudar, se aplican las reglas actuales antes de enviar.

**Nota:** La PWA instalada desde Chrome es únicamente el panel. Nunca confundas su botón «Instalar» con el lector nativo de notificaciones.
