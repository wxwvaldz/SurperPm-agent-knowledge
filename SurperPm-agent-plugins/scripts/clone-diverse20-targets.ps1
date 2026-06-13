# Shallow-clone all diverse-20 benchmark targets (ASCII output only).
param(
    [string]$WorkspaceRoot = "",
    [switch]$Force
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot
$pluginsRoot = Split-Path $scriptDir -Parent
$workspaceRoot = if ($WorkspaceRoot) { $WorkspaceRoot } else { Split-Path $pluginsRoot -Parent }
. (Join-Path $scriptDir "_win-utf8.ps1")

$manifest = Join-Path $pluginsRoot "benchmark\diverse20.json"
if (-not (Test-Path -LiteralPath $manifest)) {
    Write-Error "Missing $manifest"
    exit 1
}

$cfg = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$failed = 0
$ok = 0

foreach ($prop in $cfg.targets.PSObject.Properties) {
    $slug = $prop.Name
    $info = $prop.Value
    $url = $info.clone_url
    $rel = $info.path
    if (-not $url -or -not $rel) {
        Write-Warning "Skip $slug (missing url or path)"
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
    Write-Host "[clone] $slug from $url"
    Push-Location -LiteralPath $parent
    try {
        $leaf = Split-Path $dest -Leaf
        cmd /c "git clone --depth 1 `"$url`" `"$leaf`""
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "[clone] FAILED $slug"
            $failed++
        } else {
            $ok++
        }
    } finally {
        Pop-Location
    }
}

Write-Host "[clone] done ok=$ok failed=$failed"
if ($failed -gt 0) { exit 1 }
exit 0
