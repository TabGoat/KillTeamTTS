<#
Non-admin diagnostic script: keyboard_diagnose_noadmin.ps1
Collects accessible system, USB, Razer-related information without requiring elevation.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $scriptDir "keyboard_diagnose_noadmin-$timestamp.txt"

function Log { param($s) Add-Content -Path $logFile -Value $s; Write-Host $s }

Log "===== keyboard_diagnose_noadmin started at $(Get-Date) ====="

Log "--- OS / System ---"
try { Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber | Out-String | ForEach-Object { Log $_ } } catch { Log "Win32_OperatingSystem query failed: $_" }
try { Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, Name | Out-String | ForEach-Object { Log $_ } } catch { Log "Win32_ComputerSystem query failed: $_" }

Log "--- Processes matching 'razer' ---"
try { Get-Process | Where-Object { $_.ProcessName -match 'razer' } | Select-Object ProcessName, Id, @{n='StartTime';e={if ($_.StartTime) {$_.StartTime} else {'N/A'}}} | Out-String | ForEach-Object { Log $_ } } catch { Log "Get-Process: $_" }

Log "--- Services matching 'razer' ---"
try { Get-Service | Where-Object { $_.Name -match 'razer' -or $_.DisplayName -match 'razer' } | Format-Table -AutoSize | Out-String | ForEach-Object { Log $_ } } catch { Log "Get-Service: $_" }

Log "--- Installed Programs mentioning Razer ---"
try {
    Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.DisplayName -match 'Razer' } | Select-Object DisplayName, DisplayVersion, Publisher | Out-String | ForEach-Object { Log $_ }
} catch { Log "HKLM uninstall (64-bit) read failed: $_" }
try {
    Get-ItemProperty HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.DisplayName -match 'Razer' } | Select-Object DisplayName, DisplayVersion, Publisher | Out-String | ForEach-Object { Log $_ }
} catch { Log "HKLM uninstall (32-bit) read failed: $_" }

Log "--- PnP entities (Name matches Keyboard|Razer) ---"
try { Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -match 'Keyboard|Razer' } | Select-Object Name, PNPClass, DeviceID, Status | Out-String | ForEach-Object { Log $_ } } catch { Log "Win32_PnPEntity query failed: $_" }

Log "--- USB Controllers ---"
try { Get-WmiObject Win32_USBController | Select-Object Name, Status, DeviceID | Out-String | ForEach-Object { Log $_ } } catch { Log "Win32_USBController failed: $_" }

Log "--- powercfg /q (excerpt for 'USB') ---"
try { powercfg -q | Select-String -Pattern 'USB' -CaseSensitive:$false -Context 0,1 | Out-String | ForEach-Object { Log $_ } } catch { Log "powercfg failed: $_" }

Log "--- Recent System events mentioning USB/HID (last 48 hours) ---"
try {
    $since = (Get-Date).AddHours(-48)
    Get-WinEvent -FilterHashtable @{LogName='System'; StartTime=$since} -ErrorAction SilentlyContinue | Where-Object { $_.Message -match '(?i)USB' -or $_.Message -match '(?i)HID' } | Select-Object TimeCreated, Id, ProviderName, Message -First 200 | ForEach-Object { Log ("[$($_.TimeCreated)] (Event $($_.Id)) $($_.ProviderName)"); Log ($_.Message -replace "\r\n"," `n") }
} catch { Log "Get-WinEvent failed or inaccessible: $_" }

Log "===== keyboard_diagnose_noadmin finished at $(Get-Date) ====="

Write-Host "Diagnostics written to: $logFile"
Write-Host "Paste the file if you want help interpreting it."
