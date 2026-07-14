$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $root 'backend\start-with-env.ps1')
exit $LASTEXITCODE
