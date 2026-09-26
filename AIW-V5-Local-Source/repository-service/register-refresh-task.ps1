# Registers a daily Windows scheduled task that runs refresh.ps1 as the current user, not elevated.
# Nothing registers it automatically: run this yourself when you decide the laptop should refresh the
# knowledge repository unattended. -Acquire also fetches newer documentation from approved GitHub
# repositories (network access to api.github.com and raw.githubusercontent.com).
#   powershell -NoProfile -File register-refresh-task.ps1 [-At 06:30] [-Acquire]
#   powershell -NoProfile -File register-refresh-task.ps1 -Unregister
param([string]$At = '06:30', [switch]$Acquire, [switch]$Unregister)
$ErrorActionPreference = 'Stop'
$name = 'AIW Knowledge Repository Refresh'
if ($Unregister) { Unregister-ScheduledTask -TaskName $name -Confirm:$false; Write-Output "Removed '$name'."; exit 0 }
$script = Join-Path $PSScriptRoot 'refresh.ps1'
$argument = '-NoProfile -File "' + $script + '"' + $(if ($Acquire) { ' -Acquire' } else { '' })
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Re-verifies the AIW knowledge repository store; with -Acquire, first fetches newer documentation from approved GitHub repositories.' | Out-Null
Write-Output "Registered '$name' daily at $At$(if ($Acquire) { ' with acquisition' }). Logs: knowledge-repository\store\logs."
