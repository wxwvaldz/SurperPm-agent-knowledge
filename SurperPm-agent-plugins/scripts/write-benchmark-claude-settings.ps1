# Write isolated Claude settings for benchmark runs (ASCII only).
param(
    [Parameter(Mandatory = $true)][string]$ClaudeHome,
    [ValidateSet("default", "acceptEdits", "bypassPermissions", "dontAsk", "plan", "auto")]
    [string]$PermissionMode = "acceptEdits"
)

$ErrorActionPreference = "Stop"
$dir = Join-Path $ClaudeHome ".claude"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$settings = @{
    permissions = @{
        defaultMode = $PermissionMode
        allow       = @(
            "Read",
            "Write",
            "Edit",
            "Glob",
            "Grep",
            "Skill",
            "Bash(*)"
        )
    }
    skipDangerousModePermissionPrompt = $true
}

if ($PermissionMode -eq "bypassPermissions") {
    $settings.permissions.allow = @("*")
}

$path = Join-Path $dir "settings.json"
$settings | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $path -Encoding UTF8
Write-Host "Wrote $path (defaultMode=$PermissionMode)"
