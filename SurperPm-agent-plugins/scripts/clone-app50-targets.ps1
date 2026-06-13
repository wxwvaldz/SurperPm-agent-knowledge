# Shallow-clone all app-50 benchmark targets (ASCII output only).
param(
    [string]$WorkspaceRoot = "",
    [switch]$Force,
    [int]$MaxAttempts = 2
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = if ($WorkspaceRoot) { $WorkspaceRoot } else { Split-Path $pluginsRoot -Parent }
. (Join-Path $scriptDir "_win-utf8.ps1")

$manifest = Join-Path $pluginsRoot "benchmark\app50.json"
if (-not (Test-Path -LiteralPath $manifest)) {
    Write-Error "Missing $manifest"
    exit 1
}

$cfg = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$failed = @()
$ok = 0

foreach ($prop in $cfg.targets.PSObject.Properties) {
    $slug = $prop.Name
    $info = $prop.Value
    $url = $info.clone_url
    $rel = $info.path
    if (-not $url -or -not $rel) {
        Write-Warning "Skip $slug (missing url or path)"
        $failed += $slug
        continue
    }
    $dest = Join-Path $workspaceRoot $rel
    if ((Test-Path -LiteralPath $dest) -and -not $Force) {
        if (Test-Path -LiteralPath (Join-Path $dest ".git")) {
            Write-Host "[clone] exists: $slug -> $dest"
            $ok++
            continue
        }
    }
    if (Test-Path -LiteralPath $dest) {
        Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
    }
    $parent = Split-Path $dest -Parent
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $leaf = Split-Path $dest -Leaf
    $cloned = $false
    for ($attempt = 1; $attempt -le [Math]::Max(1, $MaxAttempts); $attempt++) {
        Write-Host "[clone] $slug attempt $attempt/$MaxAttempts from $url"
        Push-Location -LiteralPath $parent
        try {
            cmd /c "git -c core.longpaths=true clone --depth 1 `"$url`" `"$leaf`""
            if ($LASTEXITCODE -eq 0) {
                $cloned = $true
                break
            }
        } finally {
            Pop-Location
        }
        if (Test-Path -LiteralPath $dest) {
            Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
    if ($cloned) {
        $ok++
    } else {
        Write-Warning "[clone] FAILED $slug"
        $failed += $slug
    }
}

Write-Host "[clone] done ok=$ok failed=$($failed.Count)"
if ($failed.Count -gt 0) {
    Write-Host "[clone] failed slugs: $($failed -join ', ')"
    exit 1
}
exit 0
