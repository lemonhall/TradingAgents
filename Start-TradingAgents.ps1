$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$localHome = Join-Path $projectRoot '.home'
$localAppData = Join-Path $localHome 'AppData\Local'
$roamingAppData = Join-Path $localHome 'AppData\Roaming'
$tempDir = Join-Path $projectRoot '.tmp'

@(
    $localHome,
    $localAppData,
    $roamingAppData,
    $tempDir,
    (Join-Path $projectRoot '.cache'),
    (Join-Path $projectRoot '.tradingagents')
) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

$env:HOME = $localHome
$env:USERPROFILE = $localHome
$env:HOMEDRIVE = 'E:'
$env:HOMEPATH = $localHome.Substring(2)
$env:APPDATA = $roamingAppData
$env:LOCALAPPDATA = $localAppData
$env:XDG_CACHE_HOME = Join-Path $projectRoot '.cache'
$env:UV_CACHE_DIR = Join-Path $projectRoot '.uv-cache'
$env:PIP_CACHE_DIR = Join-Path $projectRoot '.uv-cache\pip'
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:TRADINGAGENTS_RESULTS_DIR = Join-Path $projectRoot '.tradingagents\logs'
$env:TRADINGAGENTS_CACHE_DIR = Join-Path $projectRoot '.tradingagents\cache'
$env:TRADINGAGENTS_MEMORY_LOG_PATH = Join-Path $projectRoot '.tradingagents\memory\trading_memory.md'

if (-not $env:HTTP_PROXY) {
    $env:HTTP_PROXY = 'http://127.0.0.1:7897'
}
if (-not $env:HTTPS_PROXY) {
    $env:HTTPS_PROXY = 'http://127.0.0.1:7897'
}

$entryPoint = Join-Path $projectRoot '.venv\Scripts\tradingagents.exe'
if (-not (Test-Path -LiteralPath $entryPoint)) {
    throw "TradingAgents is not installed at $entryPoint"
}

Push-Location $projectRoot
try {
    & $entryPoint @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
