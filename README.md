**NUEVO:** Para corregir el aviso «El APK todavía no está publicado», lee [GUIA-PUBLICAR-APK.md](GUIA-PUBLICAR-APK.md). El workflow compila y publica automáticamente el APK desde GitHub Actions; sigue siendo necesario ejecutarlo en tu repositorio.

# NotiWeb — API de notificaciones Android + MongoDB + Vercel

**ACTUALIZACIÓN IMPORTANTE:** consulta [GUIA-INSTALACION-REAL.md](GUIA-INSTALACION-REAL.md) para compilar el APK nativo y comprobar los permisos reales. Esta versión agrega el registro de teléfonos `/api/device-status`, el botón de diagnóstico en Android y el workflow `.github/workflows/compilar-apk.yml`. **No contiene APK ya compilado**; la instalación web de Chrome NO lee notificaciones de otras aplicaciones.


Proyecto para **tus propios teléfonos Android**, con acceso a notificaciones concedido expresamente. Tiene un panel web de administrador y API Node.js para Vercel, MongoDB Atlas y código fuente del lector Android.

## Estructura CORREGIDA (sube el contenido completo al nivel principal del repositorio)

```text
API-DE-NOTIFICACION/
├── api/                 # funciones HTTP de Vercel
├── lib/                 # lógica privada, no endpoints públicos
├── public/
│   ├── index.html       # panel privado
│   ├── app.js
│   └── styles.css
├── android/             # código fuente Android, NO se ejecuta en Vercel
├── tests/
├── package.json
├── vercel.json
└── .env.example         # sin contraseñas reales
```

**No subas este ZIP sin descomprimir como único archivo de GitHub**: GitHub necesita los archivos dentro de las carpetas indicadas. No uses la versión antigua con `web/` para este paquete: los ficheros de Vercel van **directamente en la raíz**.

## 1. Subir los archivos al repositorio existente

Recomendado: desde tu PC con Git instalado, abre PowerShell:

```powershell
git clone https://github.com/loschuckysdelta/API-DE-NOTIFICACION.git
```

Descomprime este ZIP y copia **todos sus archivos y carpetas** dentro de la carpeta `API-DE-NOTIFICACION` clonada, reemplazando los archivos anteriores. En PowerShell, desde el directorio que contiene la carpeta clonada:

```powershell
cd API-DE-NOTIFICACION
git add .
git commit -m "Corregir NotiWeb API MongoDB y panel para Vercel"
git push origin main
```

**IMPORTANTE:** el repositorio anterior tenía `web/`. Puedes dejarlo temporalmente, pero usa `./` como Root Directory porque este paquete coloca `api/`, `public/`, `lib/` y `vercel.json` en la raíz del repositorio.

## 2. Configuración del proyecto Vercel

Abre https://vercel.com/los-chuckys-delta/api-de-notificacion/settings

- **Root Directory:** `./` o campo vacío (raíz del repositorio; NO `web`).
- **Framework Preset:** `Other`.
- **Build Command, Output Directory e Install Command:** sin personalizar.
- **Node.js:** 20 o una versión compatible superior.
- **Environment Variables:** pega variables por separado en Settings > Environment Variables (no las guardes en el repositorio).

Variables:

```env
MONGODB_URI=mongodb+srv://USUARIO:CLAVE@CLUSTER.mongodb.net/notiweb?retryWrites=true&w=majority
MONGODB_DB=notiweb
ADMIN_PASSWORD=CONTRASENA_LARGA_UNICA
SESSION_SECRET=UN_SECRETO_ALEATORIO_LARGO
INGEST_TOKEN=OTRO_TOKEN_ALEATORIO_LARGO
READ_TOKEN=TERCER_TOKEN_ALEATORIO_LARGO
```

En PowerShell genera secretos individuales con este comando (ejecútalo 3 veces):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`ADMIN_PASSWORD`: usa un valor privado de más de 12 caracteres. Las otras claves de sesión y tokens deben ser de 32 caracteres o más; **no deben ser iguales**.

En MongoDB Atlas, crea un usuario con permisos de lectura/escritura solamente en la base `notiweb`, agrega las IP de salida de Vercel a la lista de acceso (si es necesario) y comprueba la contraseña. Si una contraseña, URI o token se compartió en un chat, **cámbialo antes de usar en producción**. No copies credenciales dentro del código, ni dentro de `public/`, ni al README.

Guarda variables para **Production** y ejecuta **Deployments → Redeploy** después de actualizar GitHub.

## 3. Comprobación de Vercel

- `https://TU-DOMINIO.vercel.app/` → panel de inicio de sesión.
- `https://TU-DOMINIO.vercel.app/api/health` → `{"ok":true,"service":"NotiWeb API"}` sin consulta a base de datos.
- `https://TU-DOMINIO.vercel.app/api/health?db=1` → comprobación de MongoDB **requiere sesión del administrador** (si no has iniciado sesión, devuelve 401).
- Tras iniciar sesión, el panel debe mostrar los datos de MongoDB o un mensaje de error de conexión.

Si `/` da 404, comprueba **Root Directory = `./`**, que `public/index.html` está en el repositorio y que **Output Directory no esté personalizada**. Si `/api/health` da 404, comprueba la carpeta `api/` en la raíz y el despliegue de los commits.

## 4. Instalar la app Android

La versión web y la API funcionan en Vercel; **Vercel no puede leer notificaciones del móvil por sí mismo**. El lector del teléfono está en `android/` y requiere compilarse en Android Studio o con la acción de GitHub incluida (no contiene APK precompilado ni Gradle Wrapper JAR). Dependiendo de tu configuración, tendrás que generar el Gradle Wrapper para sincronizar el proyecto.

1. Abre `android/` en Android Studio; instala SDK de Android 35, JDK 17 y Gradle 8.13 o genera su wrapper.
2. Compila e instala en tu propio teléfono Android.
3. Escribe la URL HTTPS de Vercel, tu `INGEST_TOKEN` y un nombre de teléfono.
4. Abre los ajustes para conceder el **acceso a notificaciones** a NotiWeb y pulsa **Iniciar envío**. Puedes pausarlo o revocarlo cuando quieras.
5. Abre el panel en Vercel, entra con `ADMIN_PASSWORD`, pulsa **Actualizar apps** y selecciona expresamente las apps permitidas.
6. Las notificaciones **nuevas** de las apps activadas podrán almacenarse en MongoDB. El panel permite buscar, paginar, filtrar por teléfono y eliminar historial. En **Control de aplicaciones → Agregar aplicación**, puedes añadir un nombre visible y el identificador real (package ID) de otra app Android. Se crea bloqueada; solo el botón **Permitir** habilita sus notificaciones.

Por defecto **todas las apps están bloqueadas**. La app solo lee título y texto después de verificar que la app fue autorizada. El servidor vuelve a comprobar el permiso antes de guardarlos. La app filtra mensajes de verificación reconocibles, pero no se puede garantizar la eliminación de toda información sensible; autoriza solo las apps realmente necesarias. Los registros se eliminan automáticamente pasados 30 días; los cambios del panel se sincronizan aproximadamente cada 30 segundos mientras el listener está activo y Android permite su ejecución. La cola local tiene capacidad limitada (hasta 150 registros).

Los avisos de pagos son **texto de notificación, no confirmaciones bancarias**. No utilices el historial para verificar dinero recibido; verifica en la app bancaria original.

## API

`GET /api/device-status` permite consultar celulares desde una sesión administrativa; `POST /api/device-status` permite al APK registrar su conexión con `INGEST_TOKEN`.


| Método | Ruta | Uso | Autorización |
|---|---|---|---|
| GET | `/api/health` | Servicio activo | pública |
| GET | `/api/health?db=1` | Ping a MongoDB | sesión admin |
| POST | `/api/login` | Iniciar sesión del panel | contraseña admin |
| POST | `/api/logout` | Salir | sesión |
| GET / POST | `/api/apps` | Listar y activar/ignorar apps | sesión admin |
| GET | `/api/device-config` | Reglas de apps autorizadas | Bearer INGEST_TOKEN |
| POST | `/api/device-catalog` | Apps visibles del Android | Bearer INGEST_TOKEN |
| POST | `/api/ingest` | Guardar nueva notificación autorizada | Bearer INGEST_TOKEN |
| GET | `/api/notifications` | Historial y filtros | sesión admin o Bearer READ_TOKEN |
| DELETE | `/api/notifications?app=...` | Borrar historial | sesión admin |
| GET | `/api/stats` | Estadísticas | sesión admin o Bearer READ_TOKEN |

## Pruebas

Desde la raíz del proyecto: `npm test`. Las pruebas locales no sustituyen a pruebas reales con MongoDB Atlas, Vercel y Android.

Este proyecto es para dispositivos propios o para los que tengas consentimiento informado. No está preparado para distribución pública multiusuario: para uso masivo necesitaría credenciales individuales por equipo, control de acceso más granular y limitación de intentos de login.

## Nueva opción: agregar tus propias aplicaciones

1. Inicia sesión en el panel y abre **Control de aplicaciones**.
2. Busca la app primero: las instaladas en Android deben aparecer después de **Actualizar apps**.
3. Si no aparece, escribe **Nombre** (por ejemplo, *Mi banco*) y **identificador real de paquete Android** (ejemplo ficticio `com.ejemplo.banco`; **no funciona como paquete real**). Haz clic en **Agregar aplicación**.
4. Aparecerá en la lista como **Ignorar**. Pulsa **Permitir** solo si quieres recopilar sus nuevas notificaciones desde tu propio dispositivo. El nombre por sí solo no activa el lector ni instala la app.
5. Para desactivarla pulsa **Ignorar**; puedes borrar el historial previo de esa aplicación con **Borrar datos**.

**Corrección de estilos:** el archivo `public/styles.css` se ha reconstruido como CSS válido; corrige el panel que aparecía sin estilos en el teléfono.

**Despliegue:** en el repositorio usa el contenido del ZIP en la raíz (`api/`, `lib/`, `public/`, etc.) y Vercel Root Directory `./`. Conserva tus variables de entorno privadas en Vercel; no están dentro del ZIP. Tras subir a GitHub, haz **Redeploy**.

## Botones de instalación para Android y PWA

Ahora el panel muestra dos botones desde la página de inicio:

1. **Instalar panel como app**: abre el instalador de la **versión web PWA** de Chrome Android cuando el navegador lo permite. En otros navegadores muestra instrucciones de menú. Esta versión abre el panel, **no puede acceder a las notificaciones de otras aplicaciones**. Los archivos PWA son `public/manifest.webmanifest`, `public/sw.js`, `public/install.js` e iconos PNG. El service worker solamente almacena los iconos; nunca guarda la API ni mensajes privados.
2. **Descargar APK Android**: comprobará que exista **un APK real** servido en `/downloads/NotiWeb.apk`. Si no existe, mostrará cómo publicarlo y **no fingirá que se descargó**. Para activarlo, primero compila tu proyecto `android/` en Android Studio; renombra el resultado a `NotiWeb.apk` y colócalo en `public/downloads/NotiWeb.apk` dentro de GitHub, después despliega a Vercel. El proyecto no incluye un binario `.apk` ya compilado.

**Seguridad:** ni el APK ni la PWA deben llevar contraseñas de MongoDB ni `INGEST_TOKEN` incrustados. Los introduce el dueño del dispositivo. La PWA es solo el panel; la lectura de notificaciones requiere **la app Android nativa**, permiso explícito y lista de aplicaciones autorizadas.
