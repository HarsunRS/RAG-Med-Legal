# DocMind — Windows dev startup script
# Usage: .\scripts\start-dev.ps1
#
# Starts Ollama (if not running), the FastAPI backend, and the Next.js frontend.
# Requires: Python venv at backend\venv, npm deps installed in frontend\
#
# First-time setup:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

# ── 1. Ollama ────────────────────────────────────────────────────────────────
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "Starting Ollama..." -ForegroundColor Cyan
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "Ollama already running." -ForegroundColor Green
}

# ── 2. Backend ───────────────────────────────────────────────────────────────
$BackendDir  = Join-Path $Root "backend"
$VenvActivate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"
$BackendLog  = Join-Path $env:TEMP "rag-backend.log"

if (-not (Test-Path $VenvActivate)) {
    Write-Host "ERROR: venv not found at $BackendDir\venv" -ForegroundColor Red
    Write-Host "Run: cd backend; python -m venv venv; venv\Scripts\Activate.ps1; pip install -r requirements.txt"
    exit 1
}

Write-Host "Starting backend (log: $BackendLog)..." -ForegroundColor Cyan

$BackendJob = Start-Job -ScriptBlock {
    param($dir, $log, $activate)
    Set-Location $dir
    & $activate
    uvicorn main:app --reload --port 8000 2>&1 | Tee-Object -FilePath $log
} -ArgumentList $BackendDir, $BackendLog, $VenvActivate

Start-Sleep -Seconds 3
Write-Host "Backend running at http://localhost:8000" -ForegroundColor Green
Write-Host "API docs:         http://localhost:8000/docs" -ForegroundColor DarkGray

# ── 3. Frontend ──────────────────────────────────────────────────────────────
$FrontendDir = Join-Path $Root "frontend"

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

Write-Host "Starting frontend at http://localhost:3000..." -ForegroundColor Cyan
Write-Host "(Press Ctrl+C to stop all services)`n" -ForegroundColor DarkGray

try {
    Push-Location $FrontendDir
    npm run dev
} finally {
    # ── Cleanup on Ctrl+C ────────────────────────────────────────────────────
    Write-Host "`nStopping backend job..." -ForegroundColor Yellow
    Stop-Job  -Job $BackendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob -ErrorAction SilentlyContinue
    Pop-Location
    Write-Host "Done." -ForegroundColor Green
}
