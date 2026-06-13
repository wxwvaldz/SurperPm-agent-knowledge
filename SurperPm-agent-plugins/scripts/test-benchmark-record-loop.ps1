# Smoke test: benchmark run recording pipeline (short Claude call, not full L1 goal).
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
$conduit = Join-Path $workspaceRoot "conduit-test"

. (Join-Path $scriptDir "_win-utf8.ps1")
$envFile = Join-Path $conduit ".env.claude.local"
if (Test-Path -LiteralPath $envFile) {
    & (Join-Path $scriptDir "load-dotenv.ps1") -EnvFile $envFile
}

Write-Host "=== [1] init L1-01 run folder ==="
$runId = "smoke-record-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$runDir = & python (Join-Path $scriptDir "benchmark_run_log.py") init L1-01 --mode auto --run-id $runId
$runDir = $runDir.Trim()
Write-Host "RunDir: $runDir"

Write-Host "=== [2] git snapshot before ==="
& python (Join-Path $scriptDir "benchmark_run_log.py") snapshot $runDir before --repo $conduit

Write-Host "=== [3] claude -p (short) + stream capture ==="
$core = Join-Path $pluginsRoot "SuperPmAgent-core"
$coding = Join-Path $pluginsRoot "SuperPmAgent-coding"
$debugLog = Join-Path $runDir "claude-debug.log"
$streamFile = Join-Path $runDir "claude-stream.jsonl"
$claudeHome = Join-Path $runDir "claude-home"
New-Item -ItemType Directory -Force -Path $claudeHome | Out-Null
$env:CLAUDE_CONFIG_DIR = $claudeHome

& python (Join-Path $scriptDir "benchmark_run_log.py") event $runDir task:running claude-cli "record smoke started"

Set-Location -LiteralPath $conduit
$cmd = "claude --plugin-dir `"$core`" --plugin-dir `"$coding`" --debug-file `"$debugLog`" --verbose -p `"Reply with exactly: RECORD_OK`" --output-format stream-json < NUL"
cmd /c "$cmd > `"$streamFile`" 2>&1"

if (Test-Path -LiteralPath $streamFile) {
    $lines = (Get-Content -LiteralPath $streamFile | Measure-Object -Line).Lines
    Write-Host "OK: stream file lines=$lines"
    & python (Join-Path $scriptDir "parse_claude_stream.py") $streamFile $runDir --phase claude-cli
} else {
    Write-Host "WARN: no stream file"
}

Write-Host "=== [4] finalize ==="
& (Join-Path $scriptDir "finalize-benchmark-run.ps1") -RunDir $runDir -ConduitDir $conduit

Write-Host "=== [5] verify artifacts ==="
$required = @(
    "events.jsonl",
    "prompt.txt",
    "goal.txt",
    "meta.json",
    "README.md",
    "git\git-status-before.txt",
    "git\git-status-after.txt"
)
$ok = $true
foreach ($rel in $required) {
    $p = Join-Path $runDir $rel
    if (Test-Path -LiteralPath $p) {
        Write-Host "OK exists $rel"
    } else {
        Write-Host "FAIL missing $rel"
        $ok = $false
    }
}
$eventLines = (Get-Content -LiteralPath (Join-Path $runDir "events.jsonl") | Measure-Object -Line).Lines
Write-Host "events.jsonl lines: $eventLines"
if ($eventLines -lt 4) {
    Write-Host "FAIL: expected >= 4 events"
    $ok = $false
}

if (-not $ok) { exit 1 }
Write-Host "=== RECORD LOOP PASS ==="
exit 0
