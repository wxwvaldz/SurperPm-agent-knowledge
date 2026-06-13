# Finalize a benchmark run: git after, copy claude debug, summary README
param(
    [Parameter(Mandatory = $true)][string]$RunDir,
    [string]$ConduitDir = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
$ConduitDir = if ($ConduitDir) { $ConduitDir } else { Join-Path $workspaceRoot "conduit-test" }
. (Join-Path $scriptDir "_win-utf8.ps1")

& python (Join-Path $scriptDir "benchmark_run_log.py") finalize $RunDir --repo $ConduitDir

$debug = Join-Path $RunDir "claude-debug.log"
if (Test-Path -LiteralPath $debug) {
    & python (Join-Path $scriptDir "benchmark_run_log.py") event $RunDir task:message claude-cli "debug log captured"
}

$summary = @"
# Benchmark run artifacts

| File | Purpose |
|------|---------|
| events.jsonl | Timeline (task:queued / message / completed) |
| prompt.txt | Slash command sent to Claude |
| goal.txt | Goal text from case definition |
| meta.json | Case id, level, scope |
| git/ | git status + diff before/after |
| claude-stream.jsonl | Raw stream-json (auto mode) |
| claude-debug.log | Claude --debug-file output |
| claude-home/ | Isolated CLAUDE_CONFIG_DIR for this run |

Redact before git commit. Do not commit API keys.
"@
Set-Content -LiteralPath (Join-Path $RunDir "README.md") -Value $summary -Encoding UTF8
Write-Host "Done. Review: $RunDir"
