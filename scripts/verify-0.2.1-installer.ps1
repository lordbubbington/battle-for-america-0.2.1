param([Parameter(Mandatory=$true)][string]$ReleaseDir, [switch]$LaunchSmoke)
$ErrorActionPreference = 'Stop'
$ReleaseDir = (Resolve-Path -LiteralPath $ReleaseDir).Path
$setup = Join-Path $ReleaseDir 'Battle for America 2028 Setup 0.2.1.exe'
$sourceDepot = Join-Path $ReleaseDir 'win-unpacked'
$exe = 'Battle for America 2028.exe'
$expected = Get-FileHash -LiteralPath (Join-Path $sourceDepot $exe)
$expectedAsar = Get-FileHash -LiteralPath (Join-Path $sourceDepot 'resources/app.asar')
$smoke = [ordered]@{ attempted = $false; passed = $false; error = $null; output = $null }
$existing = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
  Where-Object DisplayName -eq 'Battle for America 2028'
if ($existing) { throw 'An existing per-user installation is registered; this isolated installer check will not touch it.' }

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$testRoot = Join-Path $tempRoot ("bfa021-install-" + [guid]::NewGuid().ToString('N'))
$installDir = Join-Path $testRoot 'app'
$null = New-Item -ItemType Directory -Path $testRoot
$install = Start-Process -FilePath $setup -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru -WindowStyle Hidden
if ($install.ExitCode -ne 0) { throw "Installer exited $($install.ExitCode)" }

$uninstaller = Join-Path $installDir 'Uninstall Battle for America 2028.exe'
try {
  $installedExe = Get-FileHash -LiteralPath (Join-Path $installDir $exe)
  $installedAsar = Get-FileHash -LiteralPath (Join-Path $installDir 'resources/app.asar')
  if ($installedExe.Hash -ne $expected.Hash) { throw 'Installed executable differs from the unpacked depot.' }
  if ($installedAsar.Hash -ne $expectedAsar.Hash) { throw 'Installed app.asar differs from the unpacked depot.' }
  if ($LaunchSmoke) {
    $smoke.attempted = $true
    $smokeScript = Join-Path $PSScriptRoot 'smoke-0.2.1-difficulty-windows.mjs'
    $smokeStdout = Join-Path $testRoot 'smoke.stdout.txt'
    $smokeStderr = Join-Path $testRoot 'smoke.stderr.txt'
    $nodePath = (Get-Command node).Source
    $smokeArgs = @('"' + $smokeScript + '"', '"' + (Join-Path $installDir $exe) + '"')
    $smokeProcess = Start-Process -FilePath $nodePath -ArgumentList $smokeArgs -RedirectStandardOutput $smokeStdout `
      -RedirectStandardError $smokeStderr -Wait -PassThru -WindowStyle Hidden
    $smokeOutput = if (Test-Path -LiteralPath $smokeStdout) { Get-Content -Raw -LiteralPath $smokeStdout } else { '' }
    $smokeError = if (Test-Path -LiteralPath $smokeStderr) { Get-Content -Raw -LiteralPath $smokeStderr } else { '' }
    $smoke.output = $smokeOutput
    $smoke.passed = $smokeProcess.ExitCode -eq 0
    if (!$smoke.passed) { $smoke.error = "Installed packaged smoke exited $($smokeProcess.ExitCode): $smokeError" }
  }
} finally {
  if (Test-Path -LiteralPath $uninstaller) {
    $uninstall = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
    if ($uninstall.ExitCode -ne 0) { throw "Uninstaller exited $($uninstall.ExitCode)" }
  }
}
if (!$uninstall -or (Test-Path -LiteralPath (Join-Path $installDir $exe))) { throw 'Isolated installation did not uninstall cleanly.' }
$installedRegistration = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
  Where-Object DisplayName -eq 'Battle for America 2028'
if ($installedRegistration) { throw 'The isolated installer left a registered per-user installation.' }

$resolvedRoot = (Resolve-Path -LiteralPath $testRoot).Path
if (!$resolvedRoot.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing cleanup outside the temporary root: $resolvedRoot"
}
Remove-Item -LiteralPath $resolvedRoot -Recurse -Force
[ordered]@{
  installerExit = $install.ExitCode
  installedExeMatchesDepot = $true
  installedAppAsarMatchesDepot = $true
  launchSmoke = $smoke
  uninstallerExit = $uninstall.ExitCode
  isolatedInstallRemoved = $true
} | ConvertTo-Json -Depth 8
