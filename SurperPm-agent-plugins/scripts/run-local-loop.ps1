# Local smoke loop: structure -> DeepSeek API -> Claude CLI (Windows UTF-8 safe).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File run-local-loop.ps1
#        ... -SkipCli   # skip token-consuming claude -p

param([switch]$SkipCli)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$root = Split-Path $scriptDir -Parent
$competition = Split-Path $root -Parent
$conduit = Join-Path $competition "conduit-test"
$envFile = Join-Path $conduit ".env.claude.local"

. (Join-Path $scriptDir "_win-utf8.ps1")

Write-Host "=== [1/4] validate_migration (no API key) ==="
& python (Join-Path $scriptDir "validate_migration.py")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== [2/4] load .env.claude.local ==="
& (Join-Path $scriptDir "load-dotenv.ps1") -EnvFile $envFile

Write-Host ""
Write-Host "=== [3/4] DeepSeek API connectivity ==="
& python (Join-Path $scriptDir "test-deepseek-connectivity.py")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($SkipCli) {
    Write-Host ""
    Write-Host "SKIP: Claude CLI (-SkipCli). Done."
    exit 0
}

Write-Host ""
Write-Host "=== [4/4] Claude CLI + plugins (one-shot) ==="
$core = Join-Path $root "SuperPmAgent-core"
$coding = Join-Path $root "SuperPmAgent-coding"
& (Join-Path $scriptDir "invoke-claude-print.ps1") `
    -Prompt "Reply with exactly: LOOP_OK" `
    -PluginDirs @($core, $coding)
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== LOCAL LOOP PASS ==="
Write-Host "Next: start-claude-conduit.ps1 then run /SuperPmAgent-core:goal for L1-01"
exit 0
