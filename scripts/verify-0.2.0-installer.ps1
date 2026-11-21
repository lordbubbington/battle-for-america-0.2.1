param([Parameter(Mandatory=$true)][string]$ReleaseDir)
$ErrorActionPreference='Stop'
$ReleaseDir=(Resolve-Path -LiteralPath $ReleaseDir).Path
$testRoot=(New-Item -ItemType Directory -Path (Join-Path ([System.IO.Path]::GetTempPath()) ("bfa020-install-"+[guid]::NewGuid()))).FullName
$installDir=Join-Path $testRoot 'app'
$setup=Join-Path $ReleaseDir 'Battle for America 2028 Setup 0.2.0.exe'
$exe='Battle for America 2028.exe'
$sourceDepot=Join-Path $ReleaseDir 'win-unpacked'
$existing=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
    Where-Object DisplayName -eq 'Battle for America 2028'
if ($existing) { throw 'An existing per-user installation is registered. Use a separate Windows test account for this installer check.' }
$install=Start-Process -FilePath $setup -ArgumentList "/S /D=$installDir" -Wait -PassThru -WindowStyle Hidden
if ($install.ExitCode -ne 0) { throw "Installer exited $($install.ExitCode)" }
$uninstaller=Join-Path $installDir 'Uninstall Battle for America 2028.exe'
try {
    foreach ($entry in @($exe,'resources/app.asar')) {
        $actual=(Get-FileHash -LiteralPath (Join-Path $installDir $entry)).Hash
        $expected=(Get-FileHash -LiteralPath (Join-Path $sourceDepot $entry)).Hash
        if ($actual -ne $expected) { throw "Installed file differs: $entry" }
    }
    $result = & node (Join-Path $PSScriptRoot 'smoke-0.2.0-windows.mjs') (Join-Path $installDir $exe)
    if ($LASTEXITCODE -ne 0) { throw "Installed game smoke exited $LASTEXITCODE" }
} finally {
    if (Test-Path -LiteralPath $uninstaller) {
        $uninstall=Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
        if ($uninstall.ExitCode -ne 0) { throw "Uninstaller exited $($uninstall.ExitCode)" }
    }
}
if (!$uninstall -or (Test-Path -LiteralPath (Join-Path $installDir $exe))) { throw 'Isolated installation was not removed' }
[ordered]@{
    installerExit=$install.ExitCode
    uninstallerExit=$uninstall.ExitCode
    installedExeAndAsarMatchDepot=$true
    smoke=($result -join "`n" | ConvertFrom-Json)
} | ConvertTo-Json -Depth 20
