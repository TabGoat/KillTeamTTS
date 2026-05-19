param(
  [string]$ApiKey,
  [string]$AgentApiToken
)

# Usage:
# 1) Set execution policy once (Admin or CurrentUser):
#    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# 2) Run: .\run_sunor_agent.ps1 -ApiKey "sk_..." -AgentApiToken "your-agent-token"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "Python not found. Install Python 3.8+ from https://www.python.org/downloads/ and ensure 'Add to PATH' is checked." -ForegroundColor Yellow
  exit 1
}

if ($ApiKey) {
  $env:SUNOR_API_KEY = $ApiKey
} elseif (-not $env:SUNOR_API_KEY) {
  Write-Host "No SUNOR_API_KEY found in environment. Re-run with -ApiKey or set it using: $env:SUNOR_API_KEY = 'sk_...'" -ForegroundColor Red
  exit 1
}

if ($AgentApiToken) {
  $env:AGENT_API_TOKEN = $AgentApiToken
} elseif (-not $env:AGENT_API_TOKEN) {
  # generate a token for local testing and warn user to persist it
  $token = [guid]::NewGuid().ToString("N")
  Write-Host "No AGENT_API_TOKEN provided. Generating a local token (for testing): $token" -ForegroundColor Yellow
  $env:AGENT_API_TOKEN = $token
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
python -m pip install -r .\sunor_agent_requirements.txt

Write-Host "Starting secure Sunor Flask agent (foreground). Press Ctrl+C to stop." -ForegroundColor Green
# Run secure service
python .\sunor_agent_service_secure.py
