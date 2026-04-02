# ORCA Helper - Native Messaging Host インストーラー
# 拡張機能IDを自動検出し、マニフェストを生成してレジストリに登録する
#
# 使い方:
#   .\install_host.ps1                   # 自動検出
#   .\install_host.ps1 -ExtensionId "xxx" # ID指定

param(
    [string]$ExtensionId = ''
)

$HOST_NAME = 'com.orca.helper'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$MANIFEST_PATH = Join-Path $SCRIPT_DIR "$HOST_NAME.json"
$BAT_PATH = Join-Path $SCRIPT_DIR 'native_host.bat'

# ========================================
# 拡張機能ID自動検出
# ========================================
function Find-ExtensionId {
    $chromeUserData = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    if (-not (Test-Path $chromeUserData)) {
        Write-Host "[WARN] Chrome User Data not found at: $chromeUserData" -ForegroundColor Yellow
        return $null
    }

    # 全プロファイルの Extensions ディレクトリを検索
    $extDirs = Get-ChildItem -Path $chromeUserData -Directory | ForEach-Object {
        $extPath = Join-Path $_.FullName 'Extensions'
        if (Test-Path $extPath) { Get-ChildItem -Path $extPath -Directory }
    }

    foreach ($extDir in $extDirs) {
        # 各バージョンディレクトリ内の manifest.json をチェック
        $versionDirs = Get-ChildItem -Path $extDir.FullName -Directory -ErrorAction SilentlyContinue
        foreach ($vDir in $versionDirs) {
            $manifest = Join-Path $vDir.FullName 'manifest.json'
            if (Test-Path $manifest) {
                try {
                    $json = Get-Content $manifest -Raw | ConvertFrom-Json
                    if ($json.name -eq 'ORCA Helper') {
                        return $extDir.Name
                    }
                } catch {}
            }
        }
    }

    return $null
}

# ========================================
# メイン処理
# ========================================
Write-Host '=== ORCA Helper Native Messaging Host Installer ===' -ForegroundColor Cyan

# 1. 拡張機能ID取得
if (-not $ExtensionId) {
    Write-Host 'Detecting extension ID...' -ForegroundColor Gray
    $ExtensionId = Find-ExtensionId
}

if (-not $ExtensionId) {
    Write-Host '[ERROR] Extension ID not found.' -ForegroundColor Red
    Write-Host 'Please provide it manually:' -ForegroundColor Yellow
    Write-Host '  .\install_host.ps1 -ExtensionId "your-extension-id-here"' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'You can find it at chrome://extensions/' -ForegroundColor Yellow
    exit 1
}

Write-Host "Extension ID: $ExtensionId" -ForegroundColor Green

# 2. マニフェストJSON生成
$manifest = @{
    name = $HOST_NAME
    description = 'ORCA Helper - Opens WebORCA in a dedicated Chrome profile'
    path = $BAT_PATH
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 3

Set-Content -Path $MANIFEST_PATH -Value $manifest -Encoding UTF8
Write-Host "Manifest created: $MANIFEST_PATH" -ForegroundColor Green

# 3. レジストリ登録
$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HOST_NAME"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name '(Default)' -Value $MANIFEST_PATH
Write-Host "Registry key set: $regPath" -ForegroundColor Green

Write-Host ''
Write-Host '=== Installation complete! ===' -ForegroundColor Cyan
Write-Host 'Please reload the extension in chrome://extensions/' -ForegroundColor Yellow
