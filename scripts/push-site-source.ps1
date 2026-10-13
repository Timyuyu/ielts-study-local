param(
  [Parameter(Mandatory = $true)][string]$Token,
  [Parameter(Mandatory = $true)][string]$RemoteUrl,
  [Parameter(Mandatory = $true)][string]$Branch
)

$env:GIT_CONFIG_COUNT = "2"
$env:GIT_CONFIG_KEY_0 = "http.extraHeader"
$env:GIT_CONFIG_VALUE_0 = "Authorization: Bearer $Token"
$env:GIT_CONFIG_KEY_1 = "credential.helper"
$env:GIT_CONFIG_VALUE_1 = "!f() { exit 1; }; f"
$env:GIT_TERMINAL_PROMPT = "0"

try {
  & git push $RemoteUrl "HEAD:$Branch"
  exit $LASTEXITCODE
} finally {
  Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_CONFIG_KEY_0 -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_CONFIG_VALUE_0 -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_CONFIG_KEY_1 -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_CONFIG_VALUE_1 -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
}
