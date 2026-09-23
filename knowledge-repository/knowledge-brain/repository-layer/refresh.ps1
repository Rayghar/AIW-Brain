param(
 [string]$Root = (Join-Path $PSScriptRoot '..\..\AKR-0.10.73.7_\github-live'),
 [string]$Plan = (Join-Path $PSScriptRoot '..\output\repository-layer\pilot-selection.json'),
 [string]$Database = (Join-Path $PSScriptRoot '..\output\repository-layer\pilot.sqlite'),
 [ValidateRange(1,30)][int]$Batch = 30,
 [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$mutex = [System.Threading.Mutex]::new($false, 'Local\AIWRepositoryPilotRefresh')
try {
 if (-not $mutex.WaitOne(0)) { throw 'Another refresh is running.' }
 try {
  $refreshArgs = @((Join-Path $PSScriptRoot 'repository_layer.py'), 'refresh', '--root', $Root, '--plan', $Plan, '--db', $Database, '--batch', $Batch)
  if ($DryRun) { $refreshArgs += '--dry-run' }
  & python @refreshArgs
  if ($LASTEXITCODE -ne 0) { throw "Refresh exited with $LASTEXITCODE" }
 } finally { $mutex.ReleaseMutex() }
} finally { $mutex.Dispose() }
