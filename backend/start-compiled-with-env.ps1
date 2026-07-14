$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
  Write-Warning 'backend\.env was not found. The API will start with operating-system environment variables only.'
}

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node --env-file-if-exists=.env apps/api/dist/server.js
exit $LASTEXITCODE
