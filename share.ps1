#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# share.ps1  –  Start Proximiti in "share with a friend" mode
#
# What it does:
#   1. Starts the Express API server  (port 3001)
#   2. Starts the Vite dev server     (port 5173)
#   3. Opens an ngrok tunnel          (port 5173)
#      → One public URL covers BOTH frontend + /api (via Vite proxy)
#
# Usage:
#   .\share.ps1
# ─────────────────────────────────────────────────────────────────────────────

Write-Host "`n🚀  Proximiti – Share Mode`n" -ForegroundColor Cyan

# ── 1. Kill stale processes on 3001 / 5173 if any ───────────────────────────
foreach ($port in @(3001, 5173)) {
    $pid_ = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
    if ($pid_) {
        Write-Host "  Stopping previous process on :$port (PID $pid_)…"
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
    }
}

# ── 2. Start Express backend in background ────────────────────────────────────
Write-Host "`n▶  Starting API server on port 3001…" -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoProfile -Command npm run server" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3   # give the server a moment to boot

# ── 3. Start Vite dev server in background ───────────────────────────────────
Write-Host "▶  Starting Vite dev server on port 5173…" -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoProfile -Command npm run dev" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

# ── 4. Start ngrok tunnel ────────────────────────────────────────────────────
Write-Host "▶  Opening ngrok tunnel…" -ForegroundColor Green
Write-Host "   (your friend will use the URL that appears in the ngrok window)`n"

# ngrok will open in this window so you can see the public URL
ngrok http 5173

# ── Cleanup on exit ──────────────────────────────────────────────────────────
Write-Host "`n⏹  Shutting down…" -ForegroundColor Yellow
Stop-Process -Id $backend.Id  -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
