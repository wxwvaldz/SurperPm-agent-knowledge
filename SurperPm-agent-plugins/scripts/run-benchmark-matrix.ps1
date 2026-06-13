# Three-track benchmark matrix driven by benchmark/matrix.json
param(
    [ValidateSet("interactive", "auto")][string]$Mode = "interactive",
    [ValidateSet("standard", "extended", "xc-only", "conduit-extended", "diverse-20", "app-50")][string]$CaseSet = "standard",
    [int]$RoundIndex = 0,
    [switch]$SkipTrio,
    [switch]$SkipCrossRepo,
    [switch]$SkipWeb,
    [switch]$ContinueOnFail,
    [int]$RetryFailed = 0,
    [int]$PerCaseTimeoutMinutes = 0,
    [switch]$ParallelRepos,
    [int]$RepoParallelism = 2,
    [string]$ConduitDir = "",
    [string]$TargetRepoDir = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = Split-Path $pluginsRoot -Parent
$ConduitDir = if ($ConduitDir) { $ConduitDir } elseif ($TargetRepoDir) { $TargetRepoDir } else { Join-Path $workspaceRoot "conduit-test" }
Set-Location -LiteralPath $workspaceRoot
. (Join-Path $scriptDir "_win-utf8.ps1")

function Get-CaseSetJson {
    $json = & python (Join-Path $scriptDir "benchmark_config.py") cases --set $CaseSet --round-index $RoundIndex 2>&1
    if ($LASTEXITCODE -ne 0) { throw "benchmark_config.py failed: $json" }
    return $json | ConvertFrom-Json
}

function Reset-TargetSafe {
    param([string]$RepoDir)
    if (-not (Test-Path -LiteralPath (Join-Path $RepoDir ".git"))) {
        Write-Warning "Skip reset (not a git repo): $RepoDir"
        return $false
    }
    & (Join-Path $scriptDir "reset-benchmark-target.ps1") -RepoDir $RepoDir
    return $true
}

function Resolve-CaseTarget {
    param([string]$CaseId)
    $out = & python (Join-Path $scriptDir "resolve_benchmark_target.py") $CaseId 2>&1
    if ($LASTEXITCODE -ne 0) { throw "resolve_benchmark_target failed for $CaseId : $out" }
    return $out.Trim()
}

function New-Lane {
    param(
        [string]$Name,
        [string]$RepoDir,
        [string[]]$Cases,
        [switch]$Web
    )
    [pscustomobject]@{
        Name    = $Name
        RepoDir = $RepoDir
        Cases   = @($Cases)
        Web     = [bool]$Web
    }
}

function Invoke-CaseWithRetry {
    param(
        [string]$CaseId,
        [string]$RepoDir
    )
    $attempts = 1 + [Math]::Max(0, $RetryFailed)
    $lastCode = 0
    for ($i = 1; $i -le $attempts; $i++) {
        if ($i -gt 1) {
            Write-Host "[retry $i/$attempts] $CaseId"
            Reset-TargetSafe -RepoDir $RepoDir | Out-Null
        }
        Write-Host "========== $CaseId @ $RepoDir (attempt $i) =========="
        $caseArgs = @{
            CaseId     = $CaseId
            Mode       = $Mode
            ConduitDir = $RepoDir
        }
        if ($PerCaseTimeoutMinutes -gt 0) {
            $caseArgs.TimeoutMinutes = $PerCaseTimeoutMinutes
        }
        & (Join-Path $scriptDir "run-benchmark-case.ps1") @caseArgs
        $lastCode = $LASTEXITCODE
        if ($lastCode -eq 0) { return 0 }
    }
    return $lastCode
}

function Invoke-LaneSerial {
    param([pscustomobject]$Lane)
    $laneFailures = 0
    if ($Lane.Web) {
        Write-Host "=== Lane $($Lane.Name): WEB contract ==="
        & python (Join-Path $scriptDir "test-web-contract.py") --record
        if ($LASTEXITCODE -ne 0) { $laneFailures++ }
        return $laneFailures
    }

    Write-Host "=== Lane $($Lane.Name): $($Lane.RepoDir) ==="
    foreach ($c in $Lane.Cases) {
        Reset-TargetSafe -RepoDir $Lane.RepoDir | Out-Null
        $code = Invoke-CaseWithRetry -CaseId $c -RepoDir $Lane.RepoDir
        if ($code -ne 0) { $laneFailures++ }
    }
    return $laneFailures
}

function Start-LaneJob {
    param([pscustomobject]$Lane)
    $caseScript = Join-Path $scriptDir "run-benchmark-case.ps1"
    $resetScript = Join-Path $scriptDir "reset-benchmark-target.ps1"
    $webScript = Join-Path $scriptDir "test-web-contract.py"
    $laneCases = @($Lane.Cases)
    Start-Job -Name $Lane.Name -ScriptBlock {
        param(
            [string]$LaneName,
            [string]$RepoDir,
            [string[]]$Cases,
            [bool]$IsWeb,
            [string]$CaseScript,
            [string]$ResetScript,
            [string]$WebScript,
            [string]$Mode,
            [int]$RetryFailed,
            [int]$PerCaseTimeoutMinutes
        )

        $env:SuperPmAgent_SKIP_REFRESH_INDEX = "1"
        $failures = 0
        Write-Output "=== Lane $LaneName started ==="

        if ($IsWeb) {
            & python $WebScript --record
            if ($LASTEXITCODE -ne 0) { $failures++ }
            Write-Output ([pscustomobject]@{ Lane = $LaneName; ExitCode = $failures })
            return
        }

        foreach ($caseId in $Cases) {
            if (Test-Path -LiteralPath (Join-Path $RepoDir ".git")) {
                & powershell -NoProfile -ExecutionPolicy Bypass -File $ResetScript -RepoDir $RepoDir
            } else {
                Write-Output "WARN: skip reset, not a git repo: $RepoDir"
            }

            $attempts = 1 + [Math]::Max(0, $RetryFailed)
            $caseOk = $false
            for ($i = 1; $i -le $attempts; $i++) {
                Write-Output "========== $caseId @ $RepoDir (lane $LaneName attempt $i/$attempts) =========="
                $cmdArgs = @(
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-File", $CaseScript,
                    "-CaseId", $caseId,
                    "-Mode", $Mode,
                    "-ConduitDir", $RepoDir
                )
                if ($PerCaseTimeoutMinutes -gt 0) {
                    $cmdArgs += @("-TimeoutMinutes", [string]$PerCaseTimeoutMinutes)
                }
                & powershell @cmdArgs
                if ($LASTEXITCODE -eq 0) {
                    $caseOk = $true
                    break
                }
                if ($i -lt $attempts -and (Test-Path -LiteralPath (Join-Path $RepoDir ".git"))) {
                    & powershell -NoProfile -ExecutionPolicy Bypass -File $ResetScript -RepoDir $RepoDir
                }
            }
            if (-not $caseOk) { $failures++ }
        }

        Write-Output ([pscustomobject]@{ Lane = $LaneName; ExitCode = $failures })
    } -ArgumentList @(
        $Lane.Name,
        $Lane.RepoDir,
        $laneCases,
        [bool]$Lane.Web,
        $caseScript,
        $resetScript,
        $webScript,
        $Mode,
        $RetryFailed,
        $PerCaseTimeoutMinutes
    )
}

function Invoke-LanesParallel {
    param([object[]]$Lanes)
    if ($RepoParallelism -lt 1) { $RepoParallelism = 1 }
    if ($RepoParallelism -gt 8) {
        Write-Warning "RepoParallelism=$RepoParallelism is high for local CLI stability. DeepSeek account limits are much higher, but local network/CLI can still fail."
    }

    $pending = [System.Collections.Queue]::new()
    foreach ($lane in $Lanes) { $pending.Enqueue($lane) }
    $running = @()
    $totalFailures = 0

    while ($pending.Count -gt 0 -or $running.Count -gt 0) {
        while ($pending.Count -gt 0 -and $running.Count -lt $RepoParallelism) {
            $lane = $pending.Dequeue()
            Write-Host "[parallel] start lane $($lane.Name)"
            $running += Start-LaneJob -Lane $lane
        }

        $done = Wait-Job -Job $running -Any -Timeout 5
        if (-not $done) { continue }

        foreach ($job in @($done)) {
            $output = Receive-Job -Job $job -ErrorAction Continue
            foreach ($item in $output) {
                if ($item -is [string]) {
                    Write-Host $item
                } elseif ($item.PSObject.Properties.Name -contains "ExitCode") {
                    Write-Host "[parallel] lane $($item.Lane) exit=$($item.ExitCode)"
                    $totalFailures += [int]$item.ExitCode
                } else {
                    Write-Output $item
                }
            }
            if ((Get-Job -Id $job.Id).State -eq "Failed") {
                Write-Warning "[parallel] lane job failed: $($job.Name)"
                $totalFailures++
            }
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            $running = @($running | Where-Object { $_.Id -ne $job.Id })
        }
    }

    & python -c "import sys; sys.path.insert(0, r'$scriptDir'); from benchmark_rounds import _refresh_index; _refresh_index()"
    return $totalFailures
}

$spec = Get-CaseSetJson
$failed = 0
$lanes = @()

$conduitCases = @()
if (-not $SkipTrio -and $spec.trio.Count -gt 0) {
    $conduitCases += @($spec.trio)
}
if ($spec.PSObject.Properties.Name -contains "conduit_standalone" -and $spec.conduit_standalone.Count -gt 0) {
    $conduitCases += @($spec.conduit_standalone)
}
if ($conduitCases.Count -gt 0) {
    $lanes += New-Lane -Name "repo-conduit" -RepoDir $ConduitDir -Cases $conduitCases
}

if (-not $SkipCrossRepo -and $spec.xc.Count -gt 0) {
    $repoGroups = @{}
    foreach ($c in $spec.xc) {
        try {
            $repo = Resolve-CaseTarget -CaseId $c
        } catch {
            Write-Warning $_
            $failed++
            continue
        }
        if (-not $repoGroups.ContainsKey($repo)) {
            $repoGroups[$repo] = @()
        }
        $repoGroups[$repo] += $c
    }
    foreach ($repo in $repoGroups.Keys) {
        $name = "repo-" + (Split-Path $repo -Leaf)
        $lanes += New-Lane -Name $name -RepoDir $repo -Cases $repoGroups[$repo]
    }
}

if (-not $SkipWeb -and $spec.web.Count -gt 0) {
    $lanes += New-Lane -Name "web-contract" -RepoDir "" -Cases @($spec.web) -Web
}

if ($ParallelRepos) {
    Write-Host "=== Parallel repo lanes (RepoParallelism=$RepoParallelism) ==="
    $failed += Invoke-LanesParallel -Lanes $lanes
} else {
    foreach ($lane in $lanes) {
        $laneFailures = Invoke-LaneSerial -Lane $lane
        if ($laneFailures -gt 0) {
            $failed += $laneFailures
            if (-not $ContinueOnFail) { exit 1 }
        }
    }
}

if ($failed -gt 0) {
    Write-Host "Matrix finished with $failed failure(s)."
    exit 1
}
Write-Host "Matrix complete. See benchmark/runs/"
