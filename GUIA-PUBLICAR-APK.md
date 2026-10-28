# NotiWeb: corregir «El APK todavía no está publicado»

## Qué faltaba

El archivo descargable `public/downloads/NotiWeb.apk` **no estaba en el repositorio**. El workflow anterior creaba un artefacto privado en GitHub Actions, pero no lo copiaba a esa ruta. El script de PowerShell anterior tampoco subía la carpeta `.github`, por eso el botón de Vercel no encontraba un APK.

## Solución de este paquete

Este ZIP incorpora el workflow `.github/workflows/compilar-apk.yml`, que:

1. Instala Java 17, Android SDK 35 y Gradle 8.13 en GitHub Actions.
2. Compila `android/` como un APK de prueba (debug).
3. Comprueba que el archivo APK sea válido y corresponda a `com.loschuckys.notiweb`.
4. Permite descargar el archivo desde los Artifacts de GitHub Actions.
5. Publica el APK automáticamente en `public/downloads/NotiWeb.apk` con un commit a `main`.
6. Si Vercel está conectado a la rama `main`, el nuevo commit normalmente inicia el despliegue automáticamente.

## Pasos en tu repositorio

1. Descomprime el ZIP y sube TODO a la raíz de `https://github.com/loschuckysdelta/API-DE-NOTIFICACION`, incluyendo **la carpeta oculta `.github`**. La forma más simple en Windows es abrir PowerShell dentro de la carpeta del proyecto y ejecutar `./SUBIR-A-GITHUB.ps1` o `\.\SUBIR-A-GITHUB.ps1` según tu terminal, con Git y permisos para subir a `main`.
2. Abre https://github.com/loschuckysdelta/API-DE-NOTIFICACION/actions/workflows/compilar-apk.yml
3. Elige «Compilar y publicar APK Android NotiWeb» → «Run workflow» → rama `main`.
4. Espera a que el workflow indique **Success**. Si se interrumpe o falla, abre sus logs: el APK no aparecerá en Vercel hasta completar correctamente.
5. Comprueba que el repositorio contiene **`public/downloads/NotiWeb.apk`**.
6. En Vercel conserva Root Directory `./`. Si no despliega el commit automáticamente, abre la pestaña Deployments y haz Redeploy del commit más reciente.
7. Entra a `https://api-de-notificacion.vercel.app/downloads/NotiWeb.apk` o pulsa «Descargar APK Android» en tu panel.

## Si GitHub muestra «403 Permission denied» al publicar

En el repositorio: Settings → Actions → General → Workflow permissions → Read and write permissions → Save. Comprueba también si `main` está protegido; en ese caso un workflow podría no poder escribir directamente. Una alternativa es descargar `app-debug.apk` desde Artifacts, renombrarlo `NotiWeb.apk` y subirlo a `public/downloads` desde tu computadora.

## Seguridad y limitaciones

- **Este ZIP NO contiene APK compilado**. Se genera al ejecutar GitHub Actions con acceso a Android SDK. No se ha comprobado aún una compilación real; si aparece un error, consulta los logs del workflow.
- El workflow genera un **APK de desarrollo (debug)**, útil para pruebas en tus propios dispositivos. Su firma puede cambiar en cada compilación y podrías necesitar desinstalarlo antes de instalar una versión nueva. Para distribuir establemente, genera un `release` firmado con una clave privada que controles.
- Una APK publicada en `public/downloads` podrá descargarla cualquiera que conozca el enlace; no publiques un APK con credenciales dentro. La app NO debe contener URI, contraseñas ni tokens privados incrustados.
- Al instalarlo en tu Android, configura la URL de Vercel y tu INGEST_TOKEN, concede permiso de acceso a notificaciones, selecciona aplicaciones permitidas en el panel y activa el envío. No es posible leer notificaciones de otras apps con solo instalar la web.
- No guardes códigos de verificación ni notificaciones privadas de otras personas sin consentimiento. Puedes pausar o revocar el permiso en Android.
