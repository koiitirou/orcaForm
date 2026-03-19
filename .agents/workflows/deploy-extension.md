---
description: ORCA Helper Chrome拡張機能の更新デプロイ手順
---

# ORCA Helper 拡張機能の更新デプロイ

拡張機能のコードを変更した後、以下の手順で GCS にデプロイして Google Workspace ユーザーに更新を配信します。

## 手順

### 1. バージョン番号を更新

`manifest.json` の `version` フィールドを新しいバージョンに更新してください。  
Chrome の自動更新は **バージョン番号が上がった場合のみ** トリガーされます。

例: `"version": "2.2.0"` → `"version": "2.3.0"`

### 2. 変更を Git にコミット (任意)

// turbo
```powershell
git add -A
git commit -m "v{VERSION}: 変更内容の説明"
git push origin main
```

### 3. デプロイスクリプトを実行

// turbo
```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

**注意**: Chrome が起動中の場合は終了してから実行してください。

### 4. アップロード確認

// turbo
```powershell
cmd /c "C:\Users\236PC\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" storage ls -l gs://orca-helper-extension/
```

### 5. ブラウザで確認

以下の URL にアクセスして、`update.xml` のバージョンが正しいことを確認:

- https://storage.googleapis.com/orca-helper-extension/update.xml

### 6. ユーザーへの反映

- Chrome は通常 **数時間ごと** に update.xml をチェックして自動更新します
- 即時反映したい場合: `chrome://extensions` →「デベロッパーモード」ON →「更新」ボタン

## オプション

### ビルド済み .crx の再アップロード（コード変更なし）

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1 -SkipBuild
```
