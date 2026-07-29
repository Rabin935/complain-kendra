# Start Expo on the device LAN IP (avoids Hyper-V / Docker virtual adapters).
$ErrorActionPreference = "Stop"

function Get-LanIPv4 {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object -Property InterfaceMetric, SkipAsSource

  foreach ($candidate in $candidates) {
    $adapter = Get-NetAdapter -InterfaceIndex $candidate.InterfaceIndex -ErrorAction SilentlyContinue
    if ($adapter -and $adapter.Status -eq "Up" -and $adapter.InterfaceDescription -notmatch "Hyper-V|vEthernet|Virtual|Docker|WSL|Loopback") {
      return $candidate.IPAddress
    }
  }

  return $candidates | Select-Object -First 1 -ExpandProperty IPAddress
}

$lanIp = Get-LanIPv4
if ($lanIp) {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
  Write-Host "Using LAN host: $lanIp" -ForegroundColor Green
} else {
  Write-Host "Could not detect LAN IP; Expo will choose automatically." -ForegroundColor Yellow
}

# Only clear Metro cache when EXPO_CLEAR=1 (clearing every time makes reloads slower).
$expoArgs = @("expo", "start", "--lan", "--port", "8081")
if ($env:EXPO_CLEAR -eq "1") {
  $expoArgs += "--clear"
  Write-Host "Clearing Metro cache..." -ForegroundColor Cyan
}

npx @expoArgs
