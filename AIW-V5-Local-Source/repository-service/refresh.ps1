# Refresh the AIW knowledge repository on this laptop: optionally acquire newer documentation from the
# approved GitHub repositories (-Acquire), then rebuild the store, which re-verifies every current
# revision against its manifest and turns changes into notices. A named mutex prevents overlapping runs.
# Output is appended to knowledge-repository/store/logs. Run from anywhere:
#   powershell -NoProfile -File AIW-V5-Local-Source\repository-service\refresh.ps1 [-Acquire] [-Only GH-A,GH-B] [-Max 400] [-DryRun]
param([switch]$Acquire, [string]$Only = '', [int]$Max = 0, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$logs = Join-Path (Split-Path -Parent $source) 'knowledge-repository\store\logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$log = Join-Path $logs ('refresh-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$mutex = New-Object System.Threading.Mutex($false, 'Local\AIWKnowledgeRepositoryRefresh')
if (-not $mutex.WaitOne(0)) { Add-Content $log 'A refresh is already running; this run did nothing.'; exit 0 }
Push-Location $source
# Node reports progress on stderr; Windows PowerShell 5.1 must log it, not treat it as a failure.
$ErrorActionPreference = 'Continue'
try {
  $code = 0
  if ($Acquire) {
    $arguments = @('repository-service/cli.mjs', 'acquire')
    if ($Only) { $arguments += @('--only', $Only) }
    if ($Max -gt 0) { $arguments += @('--max', "$Max") }
    if ($DryRun) { $arguments += '--dry-run' }
    & node @arguments *>> $log
    $code = $LASTEXITCODE
  }
  if (-not $DryRun) {
    & node repository-service/cli.mjs build *>> $log
    if ($LASTEXITCODE -ne 0) { $code = $LASTEXITCODE }
  }
  Add-Content $log ("Finished with exit code " + $code + " at " + (Get-Date -Format o))
  exit $code
}
finally {
  Pop-Location
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
