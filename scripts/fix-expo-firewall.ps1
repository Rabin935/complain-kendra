# Open Windows Firewall for Expo Metro and mark Wi-Fi as Private.
# Right-click PowerShell -> Run as administrator, then:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\fix-expo-firewall.ps1

$ErrorActionPreference = "Stop"

$ruleName = "Expo Metro 8081"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any | Out-Null
  Write-Host "Added firewall rule: $ruleName" -ForegroundColor Green
} else {
  Enable-NetFirewallRule -DisplayName $ruleName
  Write-Host "Enabled firewall rule: $ruleName" -ForegroundColor Green
}

try {
  Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
  Write-Host "Wi-Fi network category set to Private" -ForegroundColor Green
} catch {
  Write-Host "Could not set Wi-Fi to Private: $($_.Exception.Message)" -ForegroundColor Yellow
}

Get-NetConnectionProfile | Format-Table Name, InterfaceAlias, NetworkCategory -AutoSize
Write-Host "Done. Restart Expo with: npm run start:phone" -ForegroundColor Cyan
