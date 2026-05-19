# build_package.ps1
# Packages KillTeamTTS folder into a zip suitable for Tabletop Simulator (TTZ is just a zip)
param(
  [string]$SourceDir = "$PSScriptRoot",
  [string]$OutDir = "$PSScriptRoot\..\release",
  [string]$OutName = "KillTeamTTS-v0.1.zip"
)

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$zipPath = Join-Path $OutDir $OutName
Write-Host "Creating package: $zipPath"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $SourceDir '*') -DestinationPath $zipPath -Force
Write-Host "Package created: $zipPath"
