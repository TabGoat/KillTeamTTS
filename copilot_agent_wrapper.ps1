param(
  [string]$Prompt,
  [string]$Preset
)

$base = "http://localhost:5000"

# Ensure AGENT_API_TOKEN is set locally
if (-not $env:AGENT_API_TOKEN) {
  $set = Read-Host "AGENT_API_TOKEN not set. Enter a token to use for local requests (or press Enter to abort)"
  if (-not $set) { Write-Host "Aborting; set AGENT_API_TOKEN env var or pass -AgentApiToken to run_sunor_agent.ps1" -ForegroundColor Red; exit 1 }
  $env:AGENT_API_TOKEN = $set
}

$headers = @{ 'X-AGENT-AUTH' = $env:AGENT_API_TOKEN }

function Test-Service {
  try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/presets" -TimeoutSec 5 -Headers $headers
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-Service)) {
  Write-Host "Local Sunor service not responding at $base." -ForegroundColor Yellow
  $start = Read-Host "Start the service now in a new PowerShell window? (Y/N)"
  if ($start -match '^[Yy]') {
    # Start the run script in a new window and pass the agent token
    Start-Process -FilePath powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File .\run_sunor_agent.ps1 -AgentApiToken `"$env:AGENT_API_TOKEN`"" -WindowStyle Normal
    Write-Host "Started run_sunor_agent.ps1 in a new window. Waiting for service to come up..."
    $tries = 0
    while (-not (Test-Service) -and $tries -lt 30) {
      Start-Sleep -Seconds 2
      $tries++
    }
    if (-not (Test-Service)) {
      Write-Host "Service did not start within expected time. Please check the run window." -ForegroundColor Red
      exit 1
    }
  } else {
    Write-Host "Aborting. Start the Flask service first with .\run_sunor_agent.ps1" -ForegroundColor Red
    exit 1
  }
}

# If no prompt/preset provided, show presets and ask
if (-not $Prompt -and -not $Preset) {
  try {
    $presets = Invoke-RestMethod -Method Get -Uri "$base/presets" -Headers $headers
    Write-Host "Available presets:" -ForegroundColor Cyan
    $i = 0
    foreach ($k in $presets.Keys) {
      $i++; Write-Host "[$i] $k - $($presets[$k].name)"
    }
    $choice = Read-Host "Enter preset name or type a custom prompt"
    if ($presets.ContainsKey($choice)) { $Preset = $choice } else { $Prompt = $choice }
  } catch {
    Write-Host "Failed to fetch presets: $_" -ForegroundColor Yellow
    $Prompt = Read-Host "Enter text prompt for music generation"
  }
}

# Build request body
$body = @{}
if ($Preset) { $body.preset = $Preset }
if ($Prompt) { $body.prompt = $Prompt }

# Start generation
try {
  $resp = Invoke-RestMethod -Method Post -Uri "$base/generate" -Body ($body | ConvertTo-Json -Depth 4) -ContentType "application/json" -Headers $headers
} catch {
  Write-Host "Failed to create generation task: $_" -ForegroundColor Red
  exit 1
}

$taskId = $resp.task_id
Write-Host "Task queued: $taskId" -ForegroundColor Green

# Poll for status
while ($true) {
  Start-Sleep -Seconds 4
  try {
    $s = Invoke-RestMethod -Method Get -Uri "$base/status/$taskId" -Headers $headers
  } catch {
    Write-Host "Status check failed: $_" -ForegroundColor Yellow
    continue
  }
  Write-Host "Status: $($s.status)"
  if ($s.status -eq 'success') {
    Write-Host "Generation complete." -ForegroundColor Green
    Write-Host "Audio URL: $($s.audio_url)"
    Write-Host "Local path: $($s.local_path)"
    if ($s.local_path -and (Test-Path $s.local_path)) {
      Start-Process -FilePath $s.local_path
    }
    break
  }
  if ($s.status -eq 'failure') {
    Write-Host "Generation failed: $($s.error)" -ForegroundColor Red
    break
  }
}
