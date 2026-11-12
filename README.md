# 新選組将棋 / Shinsengumi Shogi

静的HTML・CSS・JavaScriptで動作するブラウザゲームの公開用パッケージです。現在の配布・公開対象は `release/preview-20261108` です。`main` はレガシー系統のため、配布や修正の基準にしません。

## 起動

index.html をWebサーバーの公開ディレクトリ直下に配置してください。ルートは通常対局に転送します。

- 通常対局：card-ai-test.html（現行正式版。既存URLとの互換性維持のため当面この名前を使用）
- ストーリーモード：story-mode.html
- 人物図鑑：collection.html
- 説明：manual.html、manual-en.html、rules.html、history.html
- 名シーンムービー：movies.html

ビルド処理やデータベースは不要です。HTTPS対応の静的Webサーバーに、このブランチのファイル階層をそのまま配置できます。相対パスを維持するため、階層ごとコピーしてください。

## 配置構成

- ルート直下のHTML：ページ入口
- ルート直下のJS/CSS：ゲーム処理・表示
- assets/audio/：音声・BGM・効果音（ストーリー専用音源もここへ集約）
- assets/characters/：人物・勝敗演出・モブ
- assets/cards/：通常事件札と兵器カード
- assets/boards/：各章の盤面
- assets/backgrounds/：季節と各章の背景
- assets/backgrounds/seasons/：通常対局と物語で共用する四季の京都
- assets/effects/：命中等の画像演出
- assets/scenes/：章の物語・序章・終章の場面画像
- assets/portraits/、assets/dialogue_banners/、assets/collection/：既存の正式人物素材
- manifest.webmanifest：Webアプリ設定

## 変更・検証のルール

制作原本・過去版・試作品・不採用素材・制作確認用HTMLはGoogleドライブで管理し、GitHubの公開版には持ち込みません。採用素材を差し替える際は、旧素材のファイルとHTML/CSS/JavaScriptからの旧パス参照を同じ変更で撤去します。紙芝居素材は `assets/scenes/` の版番号を付けない正規ファイル名だけを使用します。

使用中の互換用ページやテスト機能は、実際の利用状況を確認せずに削除しません。たとえば `card-ai-test.html` は名前に `test` を含みますが、現在の正式な通常対局ページです。

変更時には静的・動的な参照、通常対局9×9、ストーリー全章、画像・音声、PC・スマートフォン表示を確認し、Googleドライブの制作LOGに新旧パス、採用日、検証結果、コミットを記録してください。Gitの履歴から過去版は復旧できますが、最新ブランチのファイル一覧には旧版を残しません。


## 別サーバーへの公開

1. 配布用ZIPを展開し、**ZIP内のファイル階層をそのまま**任意のHTTPS静的Webサーバーにアップロードしてください。
2. 公開URLは設置先の `index.html` または `card-ai-test.html` です。サブディレクトリ配信にも対応するようサイト内リンクは原則相対パスです。
3. `assets/audio/story/*.part` は全38個がストーリーBGMの実データです。**削除・改名・文字コード変換・テキスト転送をしないでください。** クライアント側で結合してMP3として再生します。
4. `.mp4` は `video/mp4`、`.mp3` は `audio/mpeg`、`.webp` は `image/webp`、`.webmanifest` は `application/manifest+json` で配信し、`.part` は**バイナリを改変せず配信**してください。動画のシーク操作に HTTP Range 対応を推奨します。
5. 配信先はHTTPSを利用してください。ホーム画面追加（PWA）やスマホの音声再生はブラウザ権限・ユーザー操作の影響を受けます。
6. 初回アップロード時にブラウザとCDNキャッシュをクリア／更新し、PC・iPhone Safari・Android Chromeで最低限、通常対局、各章開始、人物図鑑、音量フェーダー、勝敗音声、名シーン動画を確認してください。

**ZIPの対象**：公開サイトに必要なHTML/JS/CSS/画像/動画/音源/manifestのみ。Git履歴、GitHub Actions、作業ログ、制作原本、開発チェック用ファイルは含めません。
