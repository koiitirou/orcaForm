# ORCA Helper - Native Messaging Host
# chrome_proxy.exe を --user-data-dir="C:\weborca-chrome" で起動する

$ErrorActionPreference = 'Stop'

$CHROME_EXE = 'C:\Program Files\Google\Chrome\Application\chrome_proxy.exe'
$USER_DATA_DIR = 'C:\weborca-chrome'

function Read-NativeMessage {
    $stdin = [System.Console]::OpenStandardInput()

    # 4バイトのメッセージ長を読み取り
    $lengthBytes = New-Object byte[] 4
    $bytesRead = $stdin.Read($lengthBytes, 0, 4)
    if ($bytesRead -lt 4) { return $null }

    $length = [System.BitConverter]::ToUInt32($lengthBytes, 0)
    if ($length -eq 0 -or $length -gt 1048576) { return $null }

    # メッセージ本体を読み取り
    $messageBytes = New-Object byte[] $length
    $totalRead = 0
    while ($totalRead -lt $length) {
        $read = $stdin.Read($messageBytes, $totalRead, $length - $totalRead)
        if ($read -eq 0) { break }
        $totalRead += $read
    }

    return [System.Text.Encoding]::UTF8.GetString($messageBytes, 0, $totalRead)
}

function Write-NativeMessage {
    param([string]$Message)

    $stdout = [System.Console]::OpenStandardOutput()
    $messageBytes = [System.Text.Encoding]::UTF8.GetBytes($Message)
    $lengthBytes = [System.BitConverter]::GetBytes([uint32]$messageBytes.Length)

    $stdout.Write($lengthBytes, 0, 4)
    $stdout.Write($messageBytes, 0, $messageBytes.Length)
    $stdout.Flush()
}

try {
    $rawMessage = Read-NativeMessage
    if (-not $rawMessage) {
        Write-NativeMessage '{"success":false,"error":"Failed to read message"}'
        exit 1
    }

    $msg = $rawMessage | ConvertFrom-Json

    if ($msg.action -eq 'openUrl' -and $msg.url) {
        $arguments = @(
            "--user-data-dir=`"$USER_DATA_DIR`""
            $msg.url
        )

        Start-Process -FilePath $CHROME_EXE -ArgumentList $arguments
        Write-NativeMessage '{"success":true}'
    }
    else {
        Write-NativeMessage '{"success":false,"error":"Unknown action or missing url"}'
    }
}
catch {
    $errMsg = $_.Exception.Message -replace '"', '\"'
    Write-NativeMessage "{`"success`":false,`"error`":`"$errMsg`"}"
}
