<#
keyboard_diagnose.ps1
Purpose: Collect diagnostic information about USB/keyboard/Razer devices and apply safe fixes.
Usage (run PowerShell as Administrator):
  - Diagnostic only: .\keyboard_diagnose.ps1
  - Diagnostic + safe fixes: .\keyboard_diagnose.ps1 -AutoFix
The script writes a log file keyboard_diagnose-<timestamp>.txt in the script directory.
#>
param(
    [switch]$AutoFix
)

function Require-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "This script must be run as Administrator. Right-click PowerShell and choose 'Run as administrator'."
        exit 1
    }
}

Require-Admin

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $scriptDir "keyboard_diagnose-$timestamp.txt"

function Log { param($s) Add-Content -Path $logFile -Value $s; Write-Host $s }

Log "===== keyboard_diagnose started at $(Get-Date) ====="

# System info
Log "--- OS / System ---"
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber | Out-String | ForEach-Object { Log $_ }
Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, Name | Out-String | ForEach-Object { Log $_ }

# Disable USB selective suspend (powercfg)
Log "--- Power settings: disabling USB selective suspend (AC + DC) ---"
try {
    powercfg -SETACVALUEINDEX SCHEME_CURRENT SUB_USB USBSELECTIVE_SUSPEND 0 | Out-Null
    powercfg -SETDCVALUEINDEX SCHEME_CURRENT SUB_USB USBSELECTIVE_SUSPEND 0 | Out-Null
    powercfg -SETACTIVE SCHEME_CURRENT | Out-Null
    Log "USB selective suspend set to 0 (disabled)."
} catch {
    Log "Failed to change powercfg settings: $_"
}

# Razer services
Log "--- Razer Services (if present) ---"
$razerServices = Get-Service | Where-Object { $_.Name -like '*Razer*' -or $_.DisplayName -like '*Razer*' }
if ($razerServices) { $razerServices | Format-Table -AutoSize | Out-String | ForEach-Object { Log $_ } } else { Log "No Razer services found." }

# Attempt safe restart of any Razer services
if ($AutoFix -and $razerServices) {
    foreach ($s in $razerServices) {
        try {
            if ($s.Status -eq 'Running') { Restart-Service -Name $s.Name -Force -ErrorAction Stop; Log "Restarted service $($s.Name)." } else { Start-Service -Name $s.Name -ErrorAction Stop; Log "Started service $($s.Name)." }
        } catch { Log "Could not restart/start service $($s.Name): $_" }
    }
}

# PnP devices: keyboards and Razer-branded
Log "--- PnP devices: keyboards ---"
try {
    Get-PnpDevice -Class Keyboard | Select-Object Status, InstanceId, FriendlyName, Class | Sort-Object Status | Out-String | ForEach-Object { Log $_ }
} catch { Log "Get-PnpDevice failed: $_" }

Log "--- PnP devices: containing 'Razer' in name/service ---"
try {
    Get-PnpDevice | Where-Object { ($_.FriendlyName -and $_.FriendlyName -match '(?i)razer') -or ($_.Service -and $_.Service -match '(?i)razer') } | Select-Object Status, InstanceId, FriendlyName, Class, Service | Out-String | ForEach-Object { Log $_ }
} catch { Log "Get-PnpDevice failed: $_" }

# Show driver packages mentioning razer
Log "--- pnputil driver packages (searching for 'razer') ---"
try {
    pnputil /enum-drivers 2>$null | Select-String -Pattern 'razer' -CaseSensitive:$false | Out-String | ForEach-Object { Log $_ }
} catch { Log "pnputil failed or not available: $_" }

# Recent System events with USB/HID keywords (last 48 hours)
Log "--- Recent System events mentioning USB/HID (last 48 hours) ---"
try {
    $since = (Get-Date).AddHours(-48)
    Get-WinEvent -FilterHashtable @{LogName='System'; StartTime=$since} -ErrorAction Stop | Where-Object { $_.Message -match '(?i)USB' -or $_.Message -match '(?i)HID' -or $_.ProviderName -match '(?i)Kernel-PnP' } | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message -First 200 | ForEach-Object { Log "[$($_.TimeCreated)] (Event $($_.Id)) $($_.ProviderName) - $($_.LevelDisplayName)"; Log ($_.Message -replace "\r\n"," `n") }
} catch { Log "Get-WinEvent failed: $_" }

# List USB hubs and Root Hubs
Log "--- USB controllers / hubs ---"
try {
    Get-PnpDevice -Class 'USB' | Select-Object Status, InstanceId, FriendlyName, Class | Out-String | ForEach-Object { Log $_ }
} catch { Log "Get-PnpDevice failed: $_" }

# List HID devices
Log "--- HID devices (subset) ---"
try {
    Get-PnpDevice -Class 'HIDClass' | Select-Object Status, InstanceId, FriendlyName, Class | Out-String | ForEach-Object { Log $_ }
} catch { Log "Get-PnpDevice failed: $_" }

# Identify non-present / problem keyboard devices
Log "--- Non-OK or Not Present keyboard devices ---"
try {
    $badKeyboards = Get-PnpDevice -Class Keyboard | Where-Object { $_.Status -ne 'OK' }
    if ($badKeyboards) { $badKeyboards | Select-Object Status, InstanceId, FriendlyName | Out-String | ForEach-Object { Log $_ } }
    else { Log "No non-OK keyboard devices found." }
} catch { Log "Get-PnpDevice failed: $_" }

# Optional: AutoFix actions (careful, non-destructive by default)
if ($AutoFix) {
    Log "--- AutoFix: attempting safe fixes ---"

    # 1) Restart PnP service
    try { Restart-Service -Name "PlugPlay" -Force -ErrorAction Stop; Log "Restarted Plug and Play service." } catch { Log "Could not restart PlugPlay service: $_" }

    # 2) Remove non-present or problematic keyboard devices (only those not in OK state)
    try {
        $toRemove = Get-PnpDevice -Class Keyboard | Where-Object { $_.Status -ne 'OK' }
        foreach ($d in $toRemove) {
            Log "Attempting removal of device: $($d.FriendlyName) [$($d.InstanceId)]"
            try { Remove-PnpDevice -InstanceId $d.InstanceId -Confirm:$false -ErrorAction Stop; Log "Removed $($d.InstanceId)" } catch { Log "Failed to remove $($d.InstanceId): $_" }
        }
    } catch { Log "Could not enumerate/remove problematic keyboard devices: $_" }

    # 3) Re-scan for hardware changes
    try { & pnputil /scan-devices 2>$null; Log "Triggered device scan via pnputil (if available)." } catch { Log "pnputil not available to scan devices." }

    Log "AutoFix actions complete. Reboot recommended for changes to fully apply."
}

Log "===== keyboard_diagnose finished at $(Get-Date) ====="

Write-Host "Diagnostics written to: $logFile"
Write-Host "If you want help interpreting the log, paste its contents or attach it in your next message."
