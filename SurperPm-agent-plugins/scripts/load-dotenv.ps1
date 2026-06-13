# Load KEY=VALUE lines from a .env file into the current PowerShell session.
# Does not print secret values. Skips comments and empty lines.
param(
    [Parameter(Mandatory = $true)]
    [string]$EnvFile
)

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Error "Env file not found: $EnvFile"
    exit 1
}

$loaded = 0
Get-Content -LiteralPath $EnvFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    if ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
    if ($val -match '^<.*>$') { return }  # skip placeholders like <your_key>
    [Environment]::SetEnvironmentVariable($key, $val, "Process")
    $loaded++
}

# Claude Code / some providers accept AUTH_TOKEN instead of API_KEY
if ($env:ANTHROPIC_API_KEY -and -not $env:ANTHROPIC_AUTH_TOKEN) {
    [Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", $env:ANTHROPIC_API_KEY, "Process")
}

Write-Host "[load-dotenv] Loaded $loaded variables from $(Split-Path $EnvFile -Leaf) (values hidden)."
