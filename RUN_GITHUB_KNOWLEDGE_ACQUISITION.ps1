param(
  [string]$Token = $env:AIW_GITHUB_TOKEN,
  [string]$Connectors = "",
  [switch]$PreflightOnly
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
if (-not $Token) { Write-Warning "No AIW_GITHUB_TOKEN supplied. Public unauthenticated requests have lower rate limits." }
$env:AIW_GITHUB_TOKEN = $Token
$env:AIW_GITHUB_API_VERSION = "2026-03-10"
$env:AIW_REFRESH_CONNECTORS = $Connectors
Push-Location $backend
try {
  node scripts/rc10-73-6-preflight.mjs
  $preflightExitCode = $LASTEXITCODE
  if ($preflightExitCode -ne 0) { exit $preflightExitCode }
  if (-not $PreflightOnly) {
    node scripts/rc10-73-6-run-live-github-acquisition.mjs
    exit $LASTEXITCODE
  }
} finally { Pop-Location }
