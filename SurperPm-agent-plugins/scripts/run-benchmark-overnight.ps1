# Nightly soak test: multiple rounds, multi-repo matrix, auto review, no plugin code changes.
param(
    [int]$MaxRounds = 4,
    [double]$UntilHours = 8,
    [ValidateSet("standard", "extended", "xc-only", "conduit-extended", "diverse-20", "app-50")][string]$CaseSet = "standard",
    [ValidateSet("interactive", "auto")][string]$Mode = "auto",
    [int]$RetryFailed = 1,
    [switch]$ContinueOnFail,
    [int]$PerCaseTimeoutMinutes = 30,
    [switch]$ParallelRepos,
    [int]$RepoParallelism = 2,
    [string]$LogPath = "",
    [switch]$SkipPhaseA,
    [switch]$SkipPhaseE,
    [int]$RoundIndexOffset = 0,
    [ValidateSet("inplace", "reclone", "skip")][string]$ConduitResetBetweenRounds = "inplace",
    [switch]$ConduitRecloneAtEnd
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
$runsRoot = Join-Path $pluginsRoot "benchmark\runs"
Set-Location -LiteralPath $workspaceRoot
. (Join-Path $scriptDir "_win-utf8.ps1")

if (-not $LogPath) {
    $date = Get-Date -Format "yyyyMMdd"
    $LogPath = Join-Path $runsRoot "overnight-$date.log"
}

function Write-Log {
    param([string]$Message)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $line
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

function Test-Prerequisites {
    $claude = Get-Command claude -ErrorAction SilentlyContinue
    if (-not $claude) {
        Write-Log "BLOCKER: claude CLI not on PATH"
        return $false
    }
    $ver = & claude --version 2>&1
    Write-Log "claude: $ver"
    $envFile = Join-Path $workspaceRoot "conduit-test\.env.claude.local"
    if (-not (Test-Path -LiteralPath $envFile)) {
        $alt = Join-Path $workspaceRoot "SuperPmAgent-web\backend\.env"
        if (-not (Test-Path -LiteralPath $alt)) {
            Write-Log "WARN: no provider env at conduit-test or SuperPmAgent-web backend"
        }
    }
    return $true
}

function Invoke-PhaseA {
    Write-Log "Phase A: probes"
    if ($SkipPhaseA) { return $true }
    & python (Join-Path $scriptDir "validate_migration.py") 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { return $false }
    & python (Join-Path $scriptDir "test-web-contract.py") 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { return $false }
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "test-benchmark-record-loop.ps1") 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { return $false }
    return $true
}

function Invoke-PhaseB {
    param([int]$RoundIndex)
    Write-Log "Phase B: matrix CaseSet=$CaseSet roundIndex=$RoundIndex"
    $matrixArgs = @{
        Mode                   = $Mode
        CaseSet                = $CaseSet
        RoundIndex             = $RoundIndex
        ContinueOnFail         = $ContinueOnFail
        RetryFailed            = $RetryFailed
        PerCaseTimeoutMinutes  = $PerCaseTimeoutMinutes
        ParallelRepos          = $ParallelRepos
        RepoParallelism        = $RepoParallelism
    }
    & (Join-Path $scriptDir "run-benchmark-matrix.ps1") @matrixArgs 2>&1 | Out-Host
    return $LASTEXITCODE
}

function Invoke-PhaseC {
    Write-Log "Phase C: auto review"
    & python (Join-Path $scriptDir "review-benchmark-round.py") 2>&1 | Out-Host
    return $LASTEXITCODE
}

function Invoke-PhaseE {
    param(
        [int]$RoundIndex = 0,
        [ValidateSet("inplace", "reclone", "skip")][string]$ConduitMode = "inplace"
    )
    if ($SkipPhaseE) { return $true }
    $slugJson = & python (Join-Path $scriptDir "benchmark_config.py") reset-slugs --set $CaseSet --round-index $RoundIndex 2>&1
    $onlySlugs = @()
    if ($LASTEXITCODE -eq 0 -and $slugJson) {
        try {
            $parsedSlugs = $slugJson | ConvertFrom-Json
            foreach ($s in $parsedSlugs) {
                if ($s) { $onlySlugs += [string]$s }
            }
        } catch { }
    }
    if ($onlySlugs -notcontains "conduit") {
        $ConduitMode = "skip"
    }
    Write-Log "Phase E: reset targets (conduit=$ConduitMode slugs=$($onlySlugs -join ','))"
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $resetArgs = @{
            WorkspaceRoot     = $workspaceRoot
            ConduitResetMode  = $ConduitMode
        }
        if ($onlySlugs.Count -gt 0) { $resetArgs.OnlySlugs = $onlySlugs }
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "reset-round-targets.ps1") @resetArgs 2>&1 | Out-Host
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
    if ($code -ne 0) {
        Write-Log "WARN Phase E exited $code (continuing overnight)"
        return $false
    }
    return $true
}

$deadline = (Get-Date).AddHours($UntilHours)
Write-Log "OVERNIGHT START MaxRounds=$MaxRounds UntilHours=$UntilHours CaseSet=$CaseSet Mode=$Mode ParallelRepos=$ParallelRepos RepoParallelism=$RepoParallelism RoundIndexOffset=$RoundIndexOffset"
Write-Log "Log: $LogPath"

if (-not (Test-Prerequisites)) {
    exit 2
}

$roundIndex = 0
$completedRounds = 0

while ($completedRounds -lt $MaxRounds -and (Get-Date) -lt $deadline) {
    $roundIndex++
    $effectiveRoundIndex = $RoundIndexOffset + $roundIndex - 1
    Write-Log "=== Round slot $roundIndex / $MaxRounds (config index $effectiveRoundIndex) ==="

    $note = "overnight $CaseSet slot $roundIndex config-index $effectiveRoundIndex"
    $newRound = & python (Join-Path $scriptDir "benchmark_run_log.py") round new --note $note 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "FAIL round new: $newRound"
        if (-not $ContinueOnFail) { break }
        continue
    }
    Write-Log "Created round $newRound"

    if (-not (Invoke-PhaseA)) {
        Write-Log "Phase A failed"
        if (-not $ContinueOnFail) { break }
    }

    $bCode = Invoke-PhaseB -RoundIndex $effectiveRoundIndex
    if ($bCode -ne 0) {
        Write-Log "Phase B exited $bCode (continuing if ContinueOnFail)"
        if (-not $ContinueOnFail) { break }
    }

    $cCode = Invoke-PhaseC
    if ($cCode -ne 0) {
        Write-Log "Phase C exited $cCode"
    }

    Invoke-PhaseE -RoundIndex $effectiveRoundIndex -ConduitMode $ConduitResetBetweenRounds | Out-Null
    $completedRounds++
    Write-Log "Round slot $roundIndex complete. Completed=$completedRounds"
}

if ($ConduitRecloneAtEnd -and -not $SkipPhaseE) {
    Write-Log "Final conduit reclone (ConduitRecloneAtEnd)"
    Invoke-PhaseE -ConduitMode "reclone" | Out-Null
}

Write-Log "OVERNIGHT END completed_rounds=$completedRounds log=$LogPath"
if ($completedRounds -eq 0) { exit 1 }
exit 0
