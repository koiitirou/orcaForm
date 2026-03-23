<#
.SYNOPSIS
    Deploy ORCA Helper Chrome Extension to GCS
.DESCRIPTION
    1. Read version from manifest.json
    2. Package .crx with Chrome
    3. Update update.xml version
    4. Upload to GCS
.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -SkipBuild
#>
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# --- Config ---
$GCLOUD = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$EXTENSION_DIR = $PSScriptRoot
$PEM_FILE = Join-Path $EXTENSION_DIR "orca-helper.pem"
$CRX_FILE = Join-Path $EXTENSION_DIR "orca-helper.crx"
$UPDATE_XML = Join-Path $EXTENSION_DIR "update.xml"
$GCS_BUCKET = "gs://orca-helper-extension"
$EXTENSION_ID = "loodelplkdlepfcpebocphgclobijlhk"

# --- Get version ---
$manifest = Get-Content (Join-Path $EXTENSION_DIR "manifest.json") -Raw | ConvertFrom-Json
$version = $manifest.version
Write-Host "=== ORCA Helper Deploy ===" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Yellow

# --- PEM key check ---
if (-not (Test-Path $PEM_FILE)) {
    Write-Error "PEM key not found: $PEM_FILE"
    exit 1
}

if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[1/3] Packaging .crx ..." -ForegroundColor Green

    $tempDir = Join-Path $env:TEMP "orca-helper-pack"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null

    # Copy only extension files (exclude dev/build files)
    $excludeList = @('.git', '*.pem', '*.crx', 'deploy.ps1', 'docs', 'screenshots', 'update.xml', '.gitignore', 'PRIVACY_POLICY.md', '.agents')
    Get-ChildItem $EXTENSION_DIR -Exclude $excludeList | ForEach-Object {
        if ($_.PSIsContainer) {
            Copy-Item $_.FullName $tempDir -Recurse
        } else {
            Copy-Item $_.FullName $tempDir
        }
    }

    # Find Chrome
    $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $chrome)) {
        $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    }
    if (-not (Test-Path $chrome)) {
        Write-Error "Chrome not found."
        exit 1
    }

    Write-Host "  Chrome: $chrome"
    Write-Host "  Source: $tempDir"

    # Pack extension with Chrome
    $argList = @("--pack-extension=$tempDir", "--pack-extension-key=$PEM_FILE", "--no-message-box")
    Start-Process -FilePath $chrome -ArgumentList $argList -Wait

    # Chrome creates .crx next to the source directory
    $packedCrx = Join-Path $env:TEMP "orca-helper-pack.crx"
    if (Test-Path $packedCrx) {
        Move-Item $packedCrx $CRX_FILE -Force
        Write-Host "  Created: $CRX_FILE" -ForegroundColor Green
    } else {
        Write-Error "Failed to create .crx at: $packedCrx"
        exit 1
    }

    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# --- CRX check ---
if (-not (Test-Path $CRX_FILE)) {
    Write-Error ".crx not found: $CRX_FILE"
    exit 1
}

# --- Update update.xml ---
Write-Host ""
Write-Host "[2/3] Updating update.xml ..." -ForegroundColor Green
$xml = "<?xml version='1.0' encoding='UTF-8'?>`n"
$xml += "<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>`n"
$xml += "  <app appid='$EXTENSION_ID'>`n"
$xml += "    <updatecheck codebase='https://storage.googleapis.com/orca-helper-extension/orca-helper.crx' version='$version' />`n"
$xml += "  </app>`n"
$xml += "</gupdate>"
[System.IO.File]::WriteAllText($UPDATE_XML, $xml, [System.Text.Encoding]::UTF8)
Write-Host "  Done (version=$version)" -ForegroundColor Green

# --- Upload to GCS ---
Write-Host ""
Write-Host "[3/3] Uploading to GCS ..." -ForegroundColor Green

Write-Host "  Uploading orca-helper.crx ..."
& cmd /c """$GCLOUD"" storage cp ""$CRX_FILE"" $GCS_BUCKET/orca-helper.crx --content-type=application/x-chrome-extension"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to upload .crx"; exit 1 }

Write-Host "  Uploading update.xml ..."
& cmd /c """$GCLOUD"" storage cp ""$UPDATE_XML"" $GCS_BUCKET/update.xml --content-type=application/xml"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to upload update.xml"; exit 1 }

Write-Host ""
Write-Host "=== Deploy Complete! ===" -ForegroundColor Cyan
Write-Host "Version $version -> $GCS_BUCKET" -ForegroundColor Yellow
Write-Host ""
Write-Host "  update.xml: https://storage.googleapis.com/orca-helper-extension/update.xml"
Write-Host "  .crx:       https://storage.googleapis.com/orca-helper-extension/orca-helper.crx"
Write-Host "  ExtensionID: $EXTENSION_ID"
