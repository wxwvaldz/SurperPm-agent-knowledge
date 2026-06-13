# Start Claude Code in conduit-test with SuperPmAgent plugins (Windows UTF-8 safe).
param(
    [string]$EnvFile = "",
    [string]$ConduitDir = "",
    [string]$PluginsRoot = "",
    [string]$Print = "",
    [switch]$Doctor
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginsRoot = if ($PluginsRoot) { $PluginsRoot } else { Split-Path $scriptDir -Parent }
$workspaceRoot = Split-Path $PluginsRoot -Parent
$ConduitDir = if ($ConduitDir) { $ConduitDir } else { Join-Path $workspaceRoot "conduit-test" }
. (Join-Path $scriptDir "_win-utf8.ps1")

if (-not $EnvFile) {
    $candidates = @(
        (Join-Path $ConduitDir ".env.claude.local"),
        (Join-Path (Split-Path $PluginsRoot -Parent) "SuperPmAgent-web\backend\.env")
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { $EnvFile = $c; break }
    }
}

if ($EnvFile -and (Test-Path -LiteralPath $EnvFile)) {
    & (Join-Path $scriptDir "load-dotenv.ps1") -EnvFile $EnvFile
} else {
    Write-Warning "No .env found. Create conduit-test\.env.claude.local"
}

$core = Join-Path $PluginsRoot "SuperPmAgent-core"
$coding = Join-Path $PluginsRoot "SuperPmAgent-coding"
$business = Join-Path $PluginsRoot "SuperPmAgent-business"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Error "claude not on PATH. Install: irm https://claude.ai/install.ps1 | iex"
}

if ($Doctor) {
    claude doctor
    exit $LASTEXITCODE
}

Set-Location -LiteralPath $ConduitDir

if ($Print) {
    & (Join-Path $scriptDir "invoke-claude-print.ps1") `
        -Prompt $Print `
        -PluginDirs @($core, $coding, $business)
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Interactive Claude Code. Example:"
Write-Host "  /SuperPmAgent-core:goal <paste L1-01 goal from benchmark/cases>"
Write-Host ""
claude --plugin-dir $core --plugin-dir $coding --plugin-dir $business
