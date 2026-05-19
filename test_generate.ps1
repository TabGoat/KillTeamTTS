param(
  [string]$Preset = "lofi",
  [int]$PollInterval = 5
)

# Usage: .\test_generate.ps1 -Preset "lofi"
$base = "http://localhost:5000"
$body = @{ preset = $Preset } | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Method Post -Uri "$base/generate" -Body $body -ContentType "application/json"
} catch {
  Write-Host "Failed to create task: $_" -ForegroundColor Red
  exit 1
}

$taskId = $resp.task_id
Write-Host "Task created: $taskId"

while ($true) {
  Start-Sleep -Seconds $PollInterval
  try {
    $s = Invoke-RestMethod -Method Get -Uri "$base/status/$taskId"
  } catch {
    Write-Host "Status check failed: $_" -ForegroundColor Yellow
    continue
  }
  Write-Host "Status: $($s.status)"
  if ($s.status -eq 'success') {
    Write-Host "Audio URL: $($s.audio_url)"
    Write-Host "Local path: $($s.local_path)"
    break
  }
  if ($s.status -eq 'failure') {
    Write-Host "Generation failed: $($s.error)" -ForegroundColor Red
    break
  }
}

# Optionally open the file if running on Windows desktop
if ($s.local_path -and (Test-Path $s.local_path)) {
  Write-Host "Opening file..."
  Start-Process -FilePath $s.local_path
}
