# Smoke test: DeepSeek + Claude CLI (Windows UTF-8 safe).
param(
    [switch]$SkipApi,
    [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
if (-not $EnvFile) {
    $EnvFile = Join-Path $workspaceRoot "conduit-test\.env.claude.local"
}

. (Join-Path $scriptDir "_win-utf8.ps1")
& (Join-Path $scriptDir "load-dotenv.ps1") -EnvFile $EnvFile

if (-not $env:ANTHROPIC_API_KEY -or $env:ANTHROPIC_API_KEY -match '^<') {
    Write-Host "FAIL: set ANTHROPIC_API_KEY in conduit-test\.env.claude.local"
    exit 1
}
Write-Host "OK: ANTHROPIC_API_KEY set (length $($env:ANTHROPIC_API_KEY.Length))"
Write-Host "OK: ANTHROPIC_BASE_URL=$($env:ANTHROPIC_BASE_URL)"
Write-Host "OK: ANTHROPIC_MODEL=$($env:ANTHROPIC_MODEL)"

claude --version
if ($SkipApi) { exit 0 }

$core = Join-Path (Split-Path $scriptDir -Parent) "SuperPmAgent-core"
$coding = Join-Path (Split-Path $scriptDir -Parent) "SuperPmAgent-coding"
& (Join-Path $scriptDir "invoke-claude-print.ps1") `
    -Prompt "Reply with exactly: DEEPSEEK_OK" `
    -PluginDirs @($core, $coding)
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "OK: claude -p finished"
exit 0
