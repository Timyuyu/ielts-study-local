$ErrorActionPreference = 'Stop'
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Set JAVA_HOME (JDK 21) and ANDROID_HOME (Android SDK) first.' }
Push-Location (Split-Path $PSScriptRoot -Parent)
$previousJavaOptions = $env:JAVA_TOOL_OPTIONS
try {
    node mobile/catalog-V1.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Speech catalog failed' }
    & "$PSScriptRoot\record-audio-V1.ps1"
    npm run build:android-web
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
    Set-Content -LiteralPath 'mobile/android/local.properties' -Value ('sdk.dir=' + $env:ANDROID_HOME.Replace('\', '/')) -Encoding ascii
    # A nonexistent Unix socket directory lets affected Windows JDKs use TCP for build IPC.
    $env:JAVA_TOOL_OPTIONS = "$previousJavaOptions -Djdk.net.unixdomain.tmpdir=./missing-unix-socket-directory"
    & 'mobile/android/gradlew.bat' -p mobile/android --no-daemon assembleRelease testReleaseUnitTest
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
    Write-Output 'Unsigned APK: mobile/android/app/build/outputs/apk/release/app-release-unsigned.apk'
} finally {
    $env:JAVA_TOOL_OPTIONS = $previousJavaOptions
    Pop-Location
}
