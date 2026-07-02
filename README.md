# 営業・CS支援アプリ(MVP)

Next.js + TypeScript + Supabase + Anthropic Claude API構成。

## 現在動く範囲

* 認証・セッション保護(Googleログイン、middlewareによる未ログインアクセス拒否)
* ロール別権限制御(admin/managerは全件編集可、cs/sales/supportは自分がowner担当の企業・案件のみ編集可)
* 企業一覧(検索・業種/ステータス絞り込み)・企業新規登録・企業詳細(基本情報編集/AI商談準備生成)
* 案件のフェーズ変更UI、次回アクション(action_items)の登録・ステータス変更・削除UI
* 文字起こし入力(案件を選んでテキスト貼り付け→保存)
* 商談FB一括生成(議事録→行動強化FB→行動是正FB→次回提案方針→BANT→温度感→受注確度を連鎖生成し、案件へ反映)
* ダッシュボード(案件数・対応中・今月受注・スコア要確認の集計、案件一覧、次回アクション期限)
* 生成履歴の独立検索画面(`/reports`、対象種別・レポート種別・期間で絞り込み)
* 管理者設定画面(`/admin`、ユーザー管理・ロール/ステータス変更、AIプロンプトテンプレート管理)

## まだ実装していないもの

* ヨミ表/案件管理表のGoogle Sheets反映
* Google Docs出力
* BANT/スコアのマネージャー承認フロー(`score_status`フィールドはあるが確定操作UIがない)

## モックモードについて(Anthropic課金設定を後回しにする場合)

`.env.local` に以下を追加すると、Claude APIを一切呼び出さずダミーの生成結果を返すようになります。
Anthropicの支払い設定(claude.aiの契約とは別に、console.anthropic.comでの設定が必要)が済むまでの間、
画面遷移・DB保存・案件へのBANT反映などの動作確認を先に進めたい場合に使ってください。

```
CLAUDE_MOCK=true
```

ダミー応答には全て `[モック]` という接頭辞が付きます。実際のClaude生成に切り替えたい場合は、
この行を `CLAUDE_MOCK=false` にするか、行ごと削除して開発サーバーを再起動してください
(環境変数はサーバー起動時に読み込まれるため、変更後は必ず`npm run dev`をやり直す必要があります)。

## セットアップ手順

### 1. このフォルダに展開する

このzipの中身を、あなたの`sales-cs-app`フォルダの中にそのまま展開してください
(package.json がフォルダ直下に来るように)。既存ファイルは上書きしてください。

### 2. 依存パッケージのインストール

lucide-react を新たに追加したため、**必ずもう一度**実行してください。

```powershell
cd $HOME\projects\sales-cs-app\sales-cs-app
npm install
```

### 3. Supabaseのテーブルを作成する(初回のみ、済んでいればスキップ)

1. Supabaseダッシュボードで対象プロジェクトを開く
2. 「SQL Editor」→「New query」
3. `supabase/migrations/0001_init.sql` の中身を全てコピーして貼り付け、実行(Run)する

### 4. 環境変数(既に設定済みならスキップ)

`.env.local` に Supabase / OpenAI のキーが入っていることを確認してください。

### 5. (任意・ログインボタンを試す場合のみ)GoogleログインをSupabase側で有効化

1. Google Cloud Console で OAuth 2.0 クライアントIDを発行
   * 承認済みのリダイレクトURI に `https://<あなたのSupabaseプロジェクトURL>/auth/v1/callback` を追加
2. Supabaseダッシュボード → Authentication → Providers → Google を有効化し、
   Client ID / Client Secret を登録
3. Authentication → URL Configuration の Redirect URLs に `http://localhost:3000/` を追加

これを行わない場合、ログイン画面は表示されますが「Googleでログイン」ボタンを押すとエラーになります。今の段階ではスキップして、他の画面の動作確認を優先しても問題ありません。

### 6. 開発サーバーを起動する

```powershell
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### 7. 動作確認の手順(一気通貫)

1. `/companies` で企業を1件登録する
2. 企業詳細ページの「案件・商談履歴」タブで案件を1件作成する
3. 「商談準備 (AI)」タブで企業分析などを生成してみる
4. `/transcripts/new` で、作成した案件を選び、適当な文字起こしテキスト(数百字でOK、Zoom等の実データがあればなお良い)を貼り付けて保存する
5. 保存すると自動的に `/feedback/generate` に遷移するので、「AIで一括生成」を押す
6. 議事録・次回提案方針・BANT判定・温度感スコア・受注確度が表示されればOK(生成には数十秒かかることがあります)
7. `/`(ダッシュボード)を開き、案件数やスコア要確認件数が反映されているか確認する

## うまくいかない場合によくある原因

* `npm run dev` でエラーが出る → `.env.local` の値が未設定・タイプミスの可能性が高い
* AI生成ボタンを押しても反応がない・429エラー → OpenAIの支払い設定(Billing)を確認
* 商談FB生成が途中で止まる → 7種類のGPT呼び出しを連鎖しているため、どこかでJSON解析に失敗すると途中結果のみが表示されます。もう一度「AIで一括生成」を押すと再実行されます(前回分は上書きされず追加保存されます)
* 文字起こし入力で「対象案件」が選べない → 先に企業詳細ページから案件を1件作成する必要があります

