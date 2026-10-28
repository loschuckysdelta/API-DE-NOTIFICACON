# 🔔 NotiWeb — panel de permisos por aplicación

Proyecto de código fuente: `web/` (API de Vercel + MongoDB Atlas + panel protegido) y `android/` (app que escucha notificaciones en **Android del propietario**).

**Importante**: no contiene APK ni enlace desplegado ni conexión a MongoDB activa. Necesitas configurar tus propias credenciales y compilar la app.

## Cómo funciona el control

- Cuando enciendes la app Android y aceptas su permiso, la app envía al servidor **solo los nombres y paquetes de las apps que aparecen en el lanzador**, sin sus mensajes, para mostrar opciones en el panel.
- En el panel puedes elegir `Permitir` o `Ignorar` por app. **Por defecto todas están desactivadas.** Puedes buscar "WhatsApp", "Lemon", "Yape" u otras apps que tengas instaladas.
- El Android consulta las reglas cada 30 segundos y aplica el filtro **ANTES de leer el título y el texto** de una notificación. Si está desactivada, no guarda el mensaje ni lo envía a la nube.
- **La API revisa otra vez la regla de permisos** antes de guardar en MongoDB, incluso si el teléfono todavía no recibió el cambio.
- La app descarta mensajes de acceso/OTP reconocibles, pero el filtro no puede garantizar excluir todo dato confidencial.
- `Borrar datos` elimina desde la web los registros **anteriores** de una app. Apagar el interruptor no borra automáticamente sus registros históricos.
- La app puede permanecer sin conexión. La cola local de notificaciones permitidas tiene límite de 150; antes de enviarla, vuelve a comprobar reglas. Si las reglas no pueden actualizarse durante 90 segundos, se suspende la captura y el envío (puede haber huecos en el historial).
- El panel usa reglas **globales para todos tus teléfonos**. No incluye ajustes distintos para cada móvil.

### Ejemplo

En el panel verás algo como:

| Aplicación | Guardar notificaciones | Resultado |
|---|---|---|
| WhatsApp | ❌ Ignorar | No se envían mensajes de WhatsApp |
| Lemon | ✅ Permitir | Se envían las notificaciones nuevas que Android muestre de Lemon |
| Yape | ❌ Ignorar | No se envían mensajes de Yape |

> Si una notificación menciona "Juan envió S/ 200", puede interpretarse como **posible** pago, pero **no verifica que el dinero se haya recibido**.

## Publicar web + API

1. Crea un clúster de MongoDB Atlas en https://cloud.mongodb.com, un usuario con acceso `readWrite` limitado a la base `notiweb` y habilita el acceso de red adecuado para el backend Vercel.
2. Descomprime el ZIP y abre PowerShell en **`web/`**.
3. Ejecuta `npm install`, `npm install -g vercel`, `vercel login` y `vercel`.
4. En tu proyecto de Vercel, ve a **Settings → Environment Variables** y agrega (para Production):
   - `MONGODB_URI`: URI de MongoDB Atlas (privada)
   - `MONGODB_DB`: `notiweb`
   - `ADMIN_PASSWORD`: clave robusta de administrador (mínimo 12 caracteres)
   - `SESSION_SECRET`: valor aleatorio de 32 bytes o más
   - `INGEST_TOKEN`: otro token distinto de 32 bytes o más, compartido con tus Android
   - `READ_TOKEN`: token distinto, opcional para consultas externas
5. Para generar `SESSION_SECRET`, `INGEST_TOKEN` y `READ_TOKEN`, ejecuta **tres veces** este comando en PowerShell y usa un valor nuevo para cada variable:

   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

6. Ejecuta `vercel --prod` desde la carpeta `web/`, luego entra a `https://TU-SITIO.vercel.app` e inicia sesión con `ADMIN_PASSWORD`.

**No pongas MONGODB_URI ni tokens en `public/`, HTML o repositorios públicos.**

## Instalar el lector Android

1. Abre la carpeta **`android/`** con Android Studio (JDK 17, SDK Android 35). El ZIP no trae wrapper JAR ni APK precompilado: puede ser necesario crear el wrapper Gradle desde Android Studio.
2. Compila desde **Build → Build APK(s)** e instala el APK en tu Android propio.
3. Introduce tu URL HTTPS de Vercel, `INGEST_TOKEN` y el nombre del teléfono.
4. Pulsa **Conceder acceso a notificaciones** y autoriza NotiWeb en ajustes de Android.
5. Pulsa **Iniciar envío a MongoDB**. Espera la publicación del catálogo de apps y abre el panel web.
6. Pulsa **Actualizar apps**, busca las apps y activa únicamente las que quieres. Por ejemplo, activa Lemon y deja WhatsApp en **Ignorar**.
7. A partir de la siguiente actualización de reglas (normalmente dentro de 30 s), las nuevas notificaciones de apps permitidas aparecerán en MongoDB y en el panel.

Puedes pulsar **Pausar envío** desde Android, o revocar el permiso en Ajustes del sistema en cualquier momento.

## Endpoints privados

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/apps` | Lista apps descubiertas y estado (sesión de administrador) |
| `POST` | `/api/apps` | Cambia permiso de una app: `{ "appPackage": "com.whatsapp", "enabled": false }` (sesión) |
| `GET` | `/api/device-config` | Obtiene apps permitidas (Bearer INGEST_TOKEN) |
| `POST` | `/api/device-catalog` | Publica nombres de apps detectadas (Bearer INGEST_TOKEN) |
| `POST` | `/api/ingest` | Guarda una notificación solamente si está permitida (Bearer INGEST_TOKEN) |
| `GET` | `/api/notifications` | Historial (sesión o Bearer READ_TOKEN) |
| `DELETE` | `/api/notifications?app=com.whatsapp` | Borra historial de una app (sesión) |
| `GET` | `/api/stats` | Totales por app, celular y posibles pagos (sesión o READ_TOKEN) |
| `POST` | `/api/login` | Iniciar sesión |
| `POST` | `/api/logout` | Cerrar sesión |
| `GET` | `/api/health` | Confirma que el servicio responde, no comprueba MongoDB |

Todos los registros de notificación expiran en 30 días. Debes ser el propietario del dispositivo o tener el consentimiento informado de su propietario para instalar y activar el lector. Las notificaciones antiguas anteriores a la instalación no se recuperan. Para accesos de varias personas o un entorno de producción más amplio, añade credenciales individuales por teléfono, protección anti-fuerza bruta y medidas de privacidad adicionales.

## Comprobación local

En `web/`: `npm test`. Hay pruebas unitarias de interpretación de notificaciones, pero **no** se ha hecho aquí una prueba real con MongoDB Atlas, Vercel o un APK instalado.
