$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
  Write-Warning 'backend\.env was not found. The API will start with operating-system environment variables only.'
}

npm run build:packages
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node --watch --env-file-if-exists=.env --import=tsx apps/api/src/server.ts
exit $LASTEXITCODE
