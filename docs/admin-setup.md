# ORCA Helper Chrome拡張機能 - Google Workspace 管理者設定ガイド

## 前提条件

- Google Workspace 管理者権限
- 拡張機能が GCS にデプロイ済み

## 拡張機能情報

| 項目 | 値 |
|------|-----|
| 拡張機能名 | ORCA Helper |
| Extension ID | `lhpmndgpjjjiobkffbdgidcjnjkmiigoi` |
| Update URL | `https://storage.googleapis.com/orca-helper-extension/update.xml` |

## 強制インストール設定手順

### 1. Google Admin Console にログイン

[admin.google.com](https://admin.google.com) に管理者アカウントでログイン

### 2. Chrome 管理画面に移動

**デバイス** → **Chrome** → **アプリと拡張機能** → **ユーザーとブラウザ**

### 3. 対象の組織部門を選択

左のパネルから、拡張機能を適用したい組織部門（OU）を選択。  
全員に適用する場合は最上位の組織を選択。

### 4. 拡張機能を追加

1. 右下の **＋** ボタン（黄色い丸いボタン）をクリック
2. **「Chrome アプリまたは拡張機能を URL で指定」** を選択
3. 以下を入力：
   - **拡張機能 ID**: `lhpmndgpjjjiobkffbdgidcjnjkmiigoi`
   - **更新 URL**: `https://storage.googleapis.com/orca-helper-extension/update.xml`
4. **保存** をクリック

### 5. インストールポリシーを設定

1. 追加した拡張機能をクリック
2. **インストール ポリシー** のドロップダウンから **「強制インストール」** を選択
3. **保存** をクリック

### 6. 反映を待つ

- ポリシーの反映には **数分〜数時間** かかる場合があります
- ユーザーの Chrome を再起動すると早く反映されます
- `chrome://policy` で確認可能

## 確認方法

対象ユーザーの Chrome で以下を確認：

1. `chrome://extensions` で ORCA Helper がインストールされていること
2. 拡張機能の「エンタープライズによりインストール済み」表記があること
3. 実際に WebORCA ページで動作すること

## トラブルシューティング

### 拡張機能がインストールされない

- `chrome://policy` でポリシーが届いているか確認
- Chrome を再起動
- 管理コンソールで正しい OU が選択されているか確認

### 更新が反映されない

- Chrome は通常数時間ごとに `update.xml` をチェックします
- `chrome://extensions` で「デベロッパーモード」ON → 「更新」ボタンで即時確認可能
