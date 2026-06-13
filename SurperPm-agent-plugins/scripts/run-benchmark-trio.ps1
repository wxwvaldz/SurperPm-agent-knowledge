# Run L1, L2, L3 demo cases sequentially (interactive by default).
param(
    [ValidateSet("interactive", "auto")][string]$Mode = "interactive",
    [switch]$ContinueOnFail,
    [string]$ConduitDir = "",
    [switch]$NoIsolateCases
)

$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
$ConduitDir = if ($ConduitDir) { $ConduitDir } else { Join-Path $workspaceRoot "conduit-test" }
Set-Location -LiteralPath $workspaceRoot
$cases = @("L1-01", "L2-01", "L3-03")

function Reset-BenchmarkTargetRepo {
    param([string]$RepoDir)
    if (-not (Test-Path -LiteralPath (Join-Path $RepoDir ".git"))) {
        Write-Warning "Skip isolate: not a git repo at $RepoDir"
        return
    }
    $envFile = Join-Path $RepoDir ".env.claude.local"
    $envBackup = Join-Path $env:TEMP "SuperPmAgent-benchmark-env.claude.local.bak"
    if (Test-Path -LiteralPath $envFile) {
        Copy-Item -LiteralPath $envFile -Destination $envBackup -Force
    }
    & (Join-Path $scriptDir "reset-benchmark-target.ps1") -RepoDir $RepoDir
}

foreach ($c in $cases) {
    if (-not $NoIsolateCases) {
        Reset-BenchmarkTargetRepo -RepoDir $ConduitDir
    }
    Write-Host "========== $c =========="
    & (Join-Path $scriptDir "run-benchmark-case.ps1") -CaseId $c -Mode $Mode -ConduitDir $ConduitDir
    if ($LASTEXITCODE -ne 0 -and -not $ContinueOnFail) { exit $LASTEXITCODE }
}
Write-Host "Trio complete. See benchmark/runs/"
