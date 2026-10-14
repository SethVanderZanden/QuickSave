Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "QuickSave needs Node.js 20 or newer."
  Write-Host "Install it from https://nodejs.org then run start.ps1 again."
  exit 1
}

Write-Host "Installing dependencies (first run can take a minute)..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting QuickSave..."
npm start
