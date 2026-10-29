param(
  [Parameter(Mandatory = $true)][string]$Username,
  [Parameter(Mandatory = $true)][string]$Email,
  [Parameter(Mandatory = $true)][string]$DisplayName
)

$securePassword = Read-Host 'Admin password (12+ characters)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $nodeArgs = @((Join-Path $PSScriptRoot 'bootstrap-admin.mjs'), '--username', $Username, '--email', $Email, '--display-name', $DisplayName)
  & node @nodeArgs
  exit $LASTEXITCODE
}
finally {
  $env:BOOTSTRAP_ADMIN_PASSWORD = $null
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  if ($securePassword) { $securePassword.Dispose() }
}
