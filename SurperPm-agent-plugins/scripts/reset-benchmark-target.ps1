# Reset a benchmark target repo to clean upstream baseline (ASCII output only).
param(
    [Parameter(Mandatory = $true)][string]$RepoDir
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_win-utf8.ps1")

if (-not (Test-Path -LiteralPath (Join-Path $RepoDir ".git"))) {
    Write-Warning "Skip reset: not a git repo at $RepoDir"
    exit 0
}

$envFile = Join-Path $RepoDir ".env.claude.local"
$envBackup = Join-Path $env:TEMP "SuperPmAgent-benchmark-env.claude.local.bak"
if (Test-Path -LiteralPath $envFile) {
    Copy-Item -LiteralPath $envFile -Destination $envBackup -Force
}

Push-Location -LiteralPath $RepoDir
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    cmd /c "git checkout main 2>nul"
    if ($LASTEXITCODE -ne 0) { cmd /c "git checkout master 2>nul" }
    cmd /c "git fetch origin 2>nul"
    cmd /c "git reset --hard @{upstream} 2>nul"
    if ($LASTEXITCODE -ne 0) { cmd /c "git reset --hard origin/main 2>nul" }
    if ($LASTEXITCODE -ne 0) { cmd /c "git reset --hard origin/master 2>nul" }
    cmd /c "git clean -fd -e .env.claude.local 2>nul"
} finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
}

if (Test-Path -LiteralPath $envBackup) {
    Copy-Item -LiteralPath $envBackup -Destination $envFile -Force
}
Write-Host "[reset] Clean baseline: $RepoDir"
