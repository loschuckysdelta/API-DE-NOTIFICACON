# Ejecutar desde PowerShell: .\SUBIR-A-GITHUB.ps1
# Requiere Git y acceso a tu cuenta de GitHub. No modifica las variables de entorno de Vercel.
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$repo = Join-Path $PSScriptRoot 'API-DE-NOTIFICACION-GITHUB'
if (Test-Path $repo) {
    Write-Host 'Ya existe la carpeta temporal API-DE-NOTIFICACION-GITHUB. Renombrala o eliminela antes de continuar.'
    exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host 'Necesitas instalar Git para Windows.'
    exit 1
}
git clone 'https://github.com/loschuckysdelta/API-DE-NOTIFICACION.git' $repo
if ($LASTEXITCODE -ne 0) { throw 'No se pudo clonar el repositorio; verifica tu acceso.' }
foreach ($folder in @('api','lib','public','android','tests')) {
    $target = Join-Path $repo $folder
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Copy-Item -Path (Join-Path (Join-Path $source $folder) '*') -Destination $target -Recurse -Force
}
foreach ($file in @('package.json','vercel.json','.gitignore','.env.example','README.md')) {
    Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $repo $file) -Force
}
Push-Location $repo
try {
    git add api lib public android tests package.json vercel.json .gitignore .env.example README.md
    git commit -m 'Corregir estructura Vercel y API de NotiWeb'
    if ($LASTEXITCODE -ne 0) { Write-Host 'No hay cambios nuevos para confirmar o falta configurar Git.'; exit 1 }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Error al enviar al repositorio. Comprueba tu autenticacion de GitHub.' }
    Write-Host 'Archivos enviados. En Vercel: Root Directory = ./, Framework Preset = Other, Redeploy.'
} finally { Pop-Location }
