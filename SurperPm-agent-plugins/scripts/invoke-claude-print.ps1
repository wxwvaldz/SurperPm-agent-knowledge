# Non-interactive claude -p on Windows (NUL stdin + UTF-8). Requires env already loaded.
param(
    [Parameter(Mandatory = $true)][string]$Prompt,
    [string[]]$PluginDirs = @()
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_win-utf8.ps1")

$parts = @("claude")
foreach ($d in $PluginDirs) {
    if ($d) { $parts += @("--plugin-dir", $d) }
}
$parts += @("-p", $Prompt, "--output-format", "text")

$cmd = ($parts | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
}) -join " "

cmd /c "$cmd < NUL"
exit $LASTEXITCODE
