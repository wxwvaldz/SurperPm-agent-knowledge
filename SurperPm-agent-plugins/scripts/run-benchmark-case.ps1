# Run a benchmark case with full artifact capture (Windows UTF-8 safe).
# Usage:
#   .\run-benchmark-case.ps1 -CaseId L1-01
#   .\run-benchmark-case.ps1 -CaseId L1-01 -Mode auto
#   .\run-benchmark-case.ps1 -CaseId L1-01 -Mode auto -PermissionMode bypassPermissions
#   .\run-benchmark-case.ps1 -CaseId L3-03 -Mode interactive -PermissionMode acceptEdits
#
# After interactive session ends, finalize:
#   .\finalize-benchmark-run.ps1 -RunDir <path printed by init>

param(
    [Parameter(Mandatory = $true)][string]$CaseId,
    [ValidateSet("interactive", "auto")][string]$Mode = "interactive",
    [ValidateSet("default", "acceptEdits", "bypassPermissions", "dontAsk", "plan", "auto")]
    [string]$PermissionMode = "",
    [string]$ConduitDir = "",
    [string]$TargetRepoDir = "",
    [string]$PluginsRoot = "",
    [string]$EnvFile = "",
    [int]$TimeoutMinutes = 0
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$PluginsRoot = if ($PluginsRoot) { $PluginsRoot } else { Split-Path $scriptDir -Parent }
$workspaceRoot = Split-Path $PluginsRoot -Parent
$targetRepo = if ($TargetRepoDir) { $TargetRepoDir } elseif ($ConduitDir) { $ConduitDir } else { "" }
if (-not $targetRepo) {
    try {
        $resolved = & python (Join-Path $scriptDir "resolve_benchmark_target.py") $CaseId 2>&1
        if ($LASTEXITCODE -eq 0 -and $resolved) {
            $targetRepo = $resolved.Trim()
        }
    } catch {
        Write-Warning "Could not resolve target repo for $CaseId ; using conduit-test"
    }
}
if (-not $targetRepo) {
    $targetRepo = Join-Path $workspaceRoot "conduit-test"
}
$ConduitDir = $targetRepo
. (Join-Path $scriptDir "_win-utf8.ps1")

if (-not $EnvFile) {
    $envCandidates = @(
        (Join-Path $ConduitDir ".env.claude.local"),
        (Join-Path $workspaceRoot "conduit-test\.env.claude.local"),
        (Join-Path $workspaceRoot "SuperPmAgent-web\backend\.env")
    )
    foreach ($candidate in $envCandidates) {
        if (Test-Path -LiteralPath $candidate) {
            $EnvFile = $candidate
            break
        }
    }
}
if ($EnvFile -and (Test-Path -LiteralPath $EnvFile)) {
    & (Join-Path $scriptDir "load-dotenv.ps1") -EnvFile $EnvFile
} else {
    Write-Warning "No provider env file found. Checked target repo, sibling conduit-test, and SuperPmAgent-web backend."
}

$runDir = & python (Join-Path $scriptDir "benchmark_run_log.py") init $CaseId --mode $Mode
$runDir = $runDir.Trim()
Write-Host "Run directory: $runDir"

& python (Join-Path $scriptDir "benchmark_run_log.py") snapshot $runDir before --repo $ConduitDir

$prompt = Get-Content -LiteralPath (Join-Path $runDir "prompt.txt") -Raw -Encoding UTF8
$core = Join-Path $PluginsRoot "SuperPmAgent-core"
$coding = Join-Path $PluginsRoot "SuperPmAgent-coding"
$business = Join-Path $PluginsRoot "SuperPmAgent-business"
$claudeHome = Join-Path $runDir "claude-home"
New-Item -ItemType Directory -Force -Path $claudeHome | Out-Null
$env:CLAUDE_CONFIG_DIR = $claudeHome

if (-not $PermissionMode) {
    if ($Mode -eq "auto") {
        $PermissionMode = "bypassPermissions"
    } else {
        $PermissionMode = "acceptEdits"
    }
}
& (Join-Path $scriptDir "write-benchmark-claude-settings.ps1") -ClaudeHome $claudeHome -PermissionMode $PermissionMode
$permFlag = @("--permission-mode", $PermissionMode)

$debugLog = Join-Path $runDir "claude-debug.log"
$streamFile = Join-Path $runDir "claude-stream.jsonl"

if ($Mode -eq "auto") {
    Write-Host "AUTO mode: running claude -p with stream-json (may take several minutes)..."
    & python (Join-Path $scriptDir "benchmark_run_log.py") event $runDir task:running claude-cli "auto run started"
    Set-Location -LiteralPath $ConduitDir
    $escaped = $prompt.Replace('"', '\"')
    $cmd = "claude --plugin-dir `"$core`" --plugin-dir `"$coding`" --plugin-dir `"$business`" --permission-mode $PermissionMode --debug-file `"$debugLog`" --verbose -p `"$escaped`" --output-format stream-json < NUL"
    $claudeExit = 1
    try {
        if ($TimeoutMinutes -gt 0) {
            $cmdWithRedirect = "$cmd > `"$streamFile`" 2>&1"
            $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmdWithRedirect) -PassThru -WindowStyle Hidden
            $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
            while (-not $process.HasExited -and (Get-Date) -lt $deadline) {
                Start-Sleep -Seconds 5
                try { $process.Refresh() } catch { }
            }
            if (-not $process.HasExited) {
                $prevEapKill = $ErrorActionPreference
                $ErrorActionPreference = "Continue"
                try {
                    $killOut = & taskkill.exe /PID $($process.Id) /T /F 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-Warning "taskkill exited $LASTEXITCODE for PID $($process.Id): $($killOut -join ' ')"
                    }
                } catch {
                    Write-Warning "taskkill failed for PID $($process.Id): $($_.Exception.Message)"
                } finally {
                    $ErrorActionPreference = $prevEapKill
                }
                & python (Join-Path $scriptDir "benchmark_run_log.py") event $runDir task:failed claude-cli "timeout after $TimeoutMinutes minutes"
                $claudeExit = 124
            } else {
                $claudeExit = $process.ExitCode
            }
        } else {
            cmd /c "$cmd > `"$streamFile`" 2>&1"
            $claudeExit = $LASTEXITCODE
        }
    } finally {
        if (Test-Path -LiteralPath $streamFile) {
            & python (Join-Path $scriptDir "parse_claude_stream.py") $streamFile $runDir --phase claude-cli
        }
        if ($claudeExit -ne 0) {
            & python (Join-Path $scriptDir "benchmark_run_log.py") event $runDir task:failed claude-cli "claude -p exited with code $claudeExit"
        }
        & (Join-Path $scriptDir "finalize-benchmark-run.ps1") -RunDir $runDir -ConduitDir $ConduitDir
    }
    $effectiveExit = & python (Join-Path $scriptDir "benchmark_run_log.py") effective-exit $runDir --claude-exit $claudeExit
    if ($LASTEXITCODE -ne 0 -or -not $effectiveExit) {
        exit $claudeExit
    }
    exit ([int]($effectiveExit | Select-Object -Last 1))
}

# Interactive: user drives Claude; artifacts isolated under claude-home
Write-Host ""
Write-Host "INTERACTIVE mode"
Write-Host "  1. Claude will start below. Paste or run the goal from:"
Write-Host "     $runDir\prompt.txt"
Write-Host "  2. When finished, exit Claude (/exit). Artifacts finalize automatically."
Write-Host ""

& python (Join-Path $scriptDir "benchmark_run_log.py") event $runDir task:running claude-cli "interactive session starting"
Set-Location -LiteralPath $ConduitDir
claude --plugin-dir $core --plugin-dir $coding --plugin-dir $business @permFlag --debug-file $debugLog

Write-Host ""
Write-Host "Session ended. Finalizing..."
& (Join-Path $scriptDir "finalize-benchmark-run.ps1") -RunDir $runDir -ConduitDir $ConduitDir
