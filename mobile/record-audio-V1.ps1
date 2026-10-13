$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$audioRoot = Join-Path $PSScriptRoot 'offline-audio'
$catalog = Get-Content -LiteralPath (Join-Path $audioRoot 'catalog.json') -Raw | ConvertFrom-Json
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$voice = New-Object -ComObject SAPI.SpVoice
$englishVoice = @($voice.GetVoices()) | Where-Object { $_.GetDescription() -match 'English.*United States|Zira|David' } | Select-Object -First 1
if (-not $englishVoice) { throw 'Install a Windows English offline voice before generating recordings.' }
$voice.Voice = $englishVoice
$voice.Rate = -1
$index = 0
foreach ($item in $catalog) {
    $index++
    $mp3 = Join-Path $audioRoot ($item.id + '.mp3')
    if ((Test-Path -LiteralPath $mp3) -and (Get-Item -LiteralPath $mp3).Length -gt 500) { continue }
    $wav = Join-Path $audioRoot ($item.id + '.wav')
    $stream = New-Object -ComObject SAPI.SpFileStream
    try {
        $stream.Format.Type = 22
        $stream.Open($wav, 3)
        $voice.AudioOutputStream = $stream
        $null = $voice.Speak($item.text)
    } finally { $stream.Close() }
    & $ffmpeg -hide_banner -loglevel error -y -i $wav -ac 1 -ar 24000 -codec:a libmp3lame -b:a 48k $mp3
    if ($LASTEXITCODE -ne 0 -or (Get-Item -LiteralPath $mp3).Length -lt 500) { throw "Recording failed at $index" }
    Remove-Item -LiteralPath $wav
    if ($index % 100 -eq 0) { Write-Output "Recorded $index / $($catalog.Count)" }
}
Write-Output "Offline recordings ready: $($catalog.Count)"
