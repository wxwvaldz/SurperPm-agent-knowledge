# Phase E: reset all benchmark target repos after a round (ASCII output only).
param(
    [string]$WorkspaceRoot = "",
    [ValidateSet("inplace", "reclone", "skip")][string]$ConduitResetMode = "inplace",
    [switch]$SkipConduitClone,
    [string[]]$OnlySlugs = @()
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = if ($WorkspaceRoot) { $WorkspaceRoot } else { Split-Path $pluginsRoot -Parent }
. (Join-Path $scriptDir "_win-utf8.ps1")

$targetsJson = Join-Path $pluginsRoot "benchmark\targets.json"
if (-not (Test-Path -LiteralPath $targetsJson)) {
    Write-Warning "Missing targets.json"
    exit 1
}

$cfg = Get-Content -LiteralPath $targetsJson -Raw -Encoding UTF8 | ConvertFrom-Json
$diverseJson = Join-Path $pluginsRoot "benchmark\diverse20.json"
if (Test-Path -LiteralPath $diverseJson) {
    $diverseCfg = Get-Content -LiteralPath $diverseJson -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $diverseCfg.targets.PSObject.Properties) {
        $cfg.targets | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value -Force
    }
}
$app50Json = Join-Path $pluginsRoot "benchmark\app50.json"
if (Test-Path -LiteralPath $app50Json) {
    $app50Cfg = Get-Content -LiteralPath $app50Json -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $app50Cfg.targets.PSObject.Properties) {
        $cfg.targets | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value -Force
    }
}
$conduitPath = Join-Path $workspaceRoot "conduit-test"
$conduitCloneUrl = "https://github.com/FloretKu/conduit-test.git"

function Restore-ConduitEnv {
    param([string]$ConduitPath)
    $envFile = Join-Path $ConduitPath ".env.claude.local"
    $bak = Join-Path $env:TEMP "conduit-env.claude.local.bak"
    if (Test-Path -LiteralPath $bak) {
        Copy-Item -LiteralPath $bak -Destination $envFile -Force -ErrorAction SilentlyContinue
        Write-Host "[phase-e] restored conduit .env.claude.local"
    }
}

function Backup-ConduitEnv {
    param([string]$ConduitPath)
    $envFile = Join-Path $ConduitPath ".env.claude.local"
    $bak = Join-Path $env:TEMP "conduit-env.claude.local.bak"
    if (Test-Path -LiteralPath $envFile) {
        Copy-Item -LiteralPath $envFile -Destination $bak -Force -ErrorAction SilentlyContinue
    }
}

function Reset-ConduitInPlace {
    param([string]$ConduitPath)
    if (-not (Test-Path -LiteralPath (Join-Path $ConduitPath ".git"))) {
        Write-Warning "[phase-e] conduit-test is not a git repo; skip in-place reset"
        return $false
    }
    Write-Host "[phase-e] conduit in-place reset (no delete)"
    Backup-ConduitEnv -ConduitPath $ConduitPath

    Push-Location -LiteralPath $ConduitPath
    try {
        cmd /c "git fetch origin 2>nul"
        cmd /c "git checkout main 2>nul"
        if ($LASTEXITCODE -ne 0) { cmd /c "git checkout master 2>nul" }
        cmd /c "git reset --hard @{upstream} 2>nul"
        if ($LASTEXITCODE -ne 0) { cmd /c "git reset --hard origin/main 2>nul" }
        if ($LASTEXITCODE -ne 0) { cmd /c "git reset --hard origin/master 2>nul" }
        cmd /c "git clean -fd -e .env.claude.local 2>nul"
        $ok = ($LASTEXITCODE -eq 0)
    } finally {
        Pop-Location
    }

    Restore-ConduitEnv -ConduitPath $ConduitPath
    if ($ok) { Write-Host "[phase-e] conduit in-place reset OK" }
    return $ok
}

function Reset-ConduitReclone {
    param(
        [string]$ConduitPath,
        [string]$CloneUrl
    )
    $parent = Split-Path $ConduitPath -Parent
    $stagingName = "conduit-test.__benchmark_refresh"
    $staging = Join-Path $parent $stagingName
    $backup = "$ConduitPath.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"

    Backup-ConduitEnv -ConduitPath $ConduitPath

    if (Test-Path -LiteralPath $staging) {
        Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[phase-e] conduit reclone to staging: $staging"
    Push-Location -LiteralPath $parent
    try {
        cmd /c "git clone `"$CloneUrl`" `"$stagingName`""
        $cloneOk = ($LASTEXITCODE -eq 0)
    } finally {
        Pop-Location
    }

    if (-not $cloneOk) {
        Write-Warning "[phase-e] git clone to staging failed"
        return $false
    }

    try {
        if (Test-Path -LiteralPath $ConduitPath) {
            Rename-Item -LiteralPath $ConduitPath -NewName (Split-Path $backup -Leaf) -ErrorAction Stop
        }
        Move-Item -LiteralPath $staging -Destination $ConduitPath -Force -ErrorAction Stop
        Write-Host "[phase-e] conduit reclone complete"
        Restore-ConduitEnv -ConduitPath $ConduitPath
        return $true
    } catch {
        Write-Warning "[phase-e] could not swap conduit-test: $($_.Exception.Message)"
        if (Test-Path -LiteralPath $staging) {
            Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
        }
        return $false
    }
}

$phaseEExit = 0

foreach ($prop in $cfg.targets.PSObject.Properties) {
    $slug = $prop.Name
    $info = $prop.Value
    if ($OnlySlugs.Count -gt 0 -and ($slug -notin $OnlySlugs)) { continue }
    if (-not $info.reset) { continue }
    $rel = $info.path
    if (-not $rel) { continue }
    $repoDir = Join-Path $workspaceRoot $rel

    if ($slug -eq "conduit") {
        if ($SkipConduitClone -or $ConduitResetMode -eq "skip") {
            Write-Host "[phase-e] skip conduit reset"
            continue
        }
        if (-not (Test-Path -LiteralPath (Join-Path $conduitPath ".git"))) {
            Write-Warning "[phase-e] conduit-test missing or not a git repo; attempting reclone"
            $ConduitResetMode = "reclone"
        }
        $ok = $false
        if ($ConduitResetMode -eq "reclone") {
            $ok = Reset-ConduitReclone -ConduitPath $conduitPath -CloneUrl $conduitCloneUrl
            if (-not $ok) {
                Write-Warning "[phase-e] conduit reclone failed; trying in-place reset"
                $ok = Reset-ConduitInPlace -ConduitPath $conduitPath
            }
        } else {
            $ok = Reset-ConduitInPlace -ConduitPath $conduitPath
        }
        if (-not $ok) { $phaseEExit = 1 }
        continue
    }

    if (Test-Path -LiteralPath $repoDir) {
        & (Join-Path $scriptDir "reset-benchmark-target.ps1") -RepoDir $repoDir
        if ($LASTEXITCODE -ne 0) { $phaseEExit = 1 }
    } else {
        Write-Warning "[phase-e] Skip missing target: $repoDir"
    }
}

Write-Host "[phase-e] Target reset complete"
exit $phaseEExit
