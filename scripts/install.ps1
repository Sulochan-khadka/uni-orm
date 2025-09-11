param([string]$Version = $env:UNIORM_VERSION)

$Repo = "sulochankhadka/uni-orm"  # <-- change if needed
$Bin  = "uni-orm.exe"
$Tag  = $Version

if (-not $Tag -or $Tag -eq "latest") {
  try {
    $latest = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
    $Tag = $latest.tag_name
  } catch {
    Write-Error "Could not resolve latest release tag"
    exit 1
  }
}

$Url = "https://github.com/$Repo/releases/download/$Tag/uni-orm-node20-win-x64.exe"
$DstDir = Join-Path $env:ProgramFiles "UniORM"
$Dst = Join-Path $DstDir $Bin
New-Item -ItemType Directory -Force -Path $DstDir | Out-Null

Write-Host "Downloading $Url"
Invoke-WebRequest -Uri $Url -OutFile $Dst
Write-Host "Saved to $Dst"

# Add to PATH for current user if missing
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$DstDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$DstDir", "User")
  Write-Host "Added $DstDir to your user PATH. Restart your shell if not recognized."
}

& $Dst --version
