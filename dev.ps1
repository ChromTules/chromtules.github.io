param([ValidateSet('dev', 'build', 'test', 'preview', 'check')][string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $runtime = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $runtime) { throw 'Install Node.js 24 LTS, then run npm install and npm run dev.' }
    $env:PATH = "$($runtime.FullName);$env:PATH"
}
& npm.cmd run $Task
exit $LASTEXITCODE
