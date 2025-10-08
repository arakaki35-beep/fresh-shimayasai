# 🥬 しんせん島野菜 - 沖縄青果市況価格可視化システム

沖縄県が公開する青果市況データを自動取得し、価格推移をグラフで可視化するWebアプリケーションです。

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://fresh-shimayasai.vercel.app/)
[![API Status](https://img.shields.io/badge/API-active-success)](https://fresh-shimayasai-api.onrender.com/)

![沖縄青果市況グラフ](https://via.placeholder.com/800x400?text=Price+Trends+Graph)

## 📋 概要

沖縄県の野菜直売所向けに、リアルタイムな市況価格情報を提供するシステムです。毎日自動で沖縄県公式サイトからExcelデータを取得し、データベースに保存。過去30日間の価格推移を折れ線グラフで視覚的に表示します。

### 主な機能

- 📊 **価格推移の可視化**: 過去30日間の野菜価格を折れ線グラフで表示
- 🔄 **自動データ更新**: 毎日朝9時に沖縄県サイトから最新データを自動取得
- 📈 **複数品目対応**: 最大27品目の野菜価格を同時表示
- 📱 **レスポンシブデザイン**: スマートフォンからPCまで対応

## 🛠️ 技術スタック

### フロントエンド
- HTML5 / CSS3
- JavaScript (ES6+)
- Bootstrap 5.3.0
- Chart.js (グラフ描画)
- Vercel (ホスティング)

### バックエンド
- Node.js
- Express.js (Webフレームワーク)
- Render (サーバーホスティング)

### データベース
- Supabase (PostgreSQL)

### 外部ライブラリ
- axios (HTTPクライアント)
- xlsx (Excel解析)
- node-cron (スケジュール実行)
- dotenv (環境変数管理)

## 🏗️ システムアーキテクチャ

```
┌─────────────┐
│   ユーザー    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────┐
│  Vercel (Frontend)      │
│  - HTML/CSS/JavaScript  │
│  - Chart.js             │
└──────┬──────────────────┘
       │ REST API
       ↓
┌─────────────────────────┐
│  Render (Backend)       │
│  - Express.js API       │
│  - Excel解析            │
│  - 自動データ取得        │
└──────┬──────────────────┘
       │
       ├─→ Supabase (Database)
       │    - PostgreSQL
       │    - 価格履歴データ
       │
       └─→ 沖縄県公式サイト
            - Excelファイル取得
```

## 📊 データベース設計

### vege_data テーブル

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| id | SERIAL | 主キー (自動採番) |
| date | DATE | データ取得日 |
| name | TEXT | 野菜名 |
| price | NUMERIC(10,2) | 平均価格 (円/kg) |
| created_at | TIMESTAMP | レコード作成日時 |

## 🚀 セットアップ

### 必要な環境

- Node.js 18.x 以上
- npm 9.x 以上
- Supabase アカウント
- Vercel アカウント
- Render アカウント

### ローカル開発環境構築

1. **リポジトリのクローン**
```bash
git clone https://github.com/yourusername/fresh-shimayasai.git
cd fresh-shimayasai
```

2. **依存パッケージのインストール**
```bash
npm install
```

3. **環境変数の設定**

`.env`ファイルを作成し、以下を設定：
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
PORT=8080
```

4. **データベースのセットアップ**

Supabaseで以下のSQLを実行：
```sql
CREATE TABLE vege_data(
    id SERIAL PRIMARY KEY,
    date DATE,
    name TEXT,
    price NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. **ローカルサーバー起動**
```bash
node server.js
```

ブラウザで `http://localhost:8080` にアクセス

## 📡 API エンドポイント

### ヘルスチェック
```http
GET /api/health
```

### 最新野菜価格取得
```http
GET /api/vegetables
```

**レスポンス例:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "date": "2025-09-25",
      "name": "ゴーヤー",
      "price": 185.50
    }
  ],
  "count": 27
}
```

### 価格履歴取得
```http
GET /api/vegetables-history
```

**レスポンス例:**
```json
{
  "status": "success",
  "data": {
    "ゴーヤー": [
      {"date": "2025-09-23", "price": 180.00},
      {"date": "2025-09-24", "price": 182.50}
    ]
  },
  "dates": ["2025-09-23", "2025-09-24"],
  "vegetables": ["ゴーヤー", "島人参"]
}
```

### 特定野菜の価格履歴
```http
GET /api/vegetables/:name
```

### データ手動更新
```http
GET /api/update-vegetables
```

## ⏰ 自動実行

毎日**12時（日本時間）**に自動でデータ更新が実行されます。

実行内容：
1. 沖縄県公式サイトからExcelファイルをダウンロード
2. 該当する曜日のシートからデータを抽出
3. データベースの既存データを削除
4. 新しいデータを一括登録

## 🎨 フロントエンド機能

### Chart.js による可視化

- **折れ線グラフ**: 複数野菜の価格推移を同時表示
- **カラーパレット**: 野菜ごとに自動で色を割り当て
- **インタラクティブ**: ホバーで詳細情報を表示
- **レスポンシブ**: 画面サイズに応じて自動調整

## 🔧 デプロイ

### Vercel (Frontend)

```bash
# Vercel CLIでデプロイ
vercel --prod
```

### Render (Backend)

1. GitHubリポジトリを接続
2. 環境変数を設定
3. 自動デプロイ設定を有効化

**必要な環境変数:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `PORT` (Renderが自動設定)

## 📈 今後の改善予定

- [ ] 自動データ取得の精度改善
- [ ] 価格帯指定の修正
- [ ] 果物データの追加
- [ ] 過去1年間のデータ分析機能

## 🐛 トラブルシューティング

### データが更新されない場合

1. Renderのログを確認
2. 沖縄県サイトのExcelファイル名が変更されていないか確認
3. 手動更新API (`/api/update-vegetables`) を実行

### グラフが表示されない場合

1. ブラウザの開発者ツールでエラーを確認
2. API接続を確認 (`/api/health`)
3. データベースにデータが存在するか確認

## 📄 ライセンス

MIT License

## 👤 作成者

arakaki35-beep
- GitHub: [@arakaki35-beep](https://github.com/arakaki35-beep)
- Portfolio: [[portfolio-url](https://arakaki35-beep.github.io/)]

## 🙏 謝辞

- データ提供: [沖縄県農林水産部流通・加工推進課](https://www.pref.okinawa.lg.jp/)
- 技術サポート: Claude (Anthropic)
