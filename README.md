# 新選組将棋 / Shinsengumi Shogi

静的HTML・CSS・JavaScriptで動作するブラウザゲームの公開用パッケージです。このブランチは制作・テスト資料を除いた配布候補版です。

## 起動

index.html をWebサーバーの公開ディレクトリ直下に配置してください。ルートは通常対局に転送します。

- 通常対局：card-ai-test.html（現行正式版。既存URLとの互換性維持のため当面この名前を使用）
- ストーリーモード：story-mode.html
- 人物図鑑：collection.html
- 説明：manual.html、manual-en.html、rules.html、history.html

ビルド処理やデータベースは不要です。HTTPS対応の静的Webサーバーに、このブランチのファイル階層をそのまま配置できます。相対パスを維持するため、階層ごとコピーしてください。

## 配置構成

- ルート直下のHTML：ページ入口
- ルート直下のJS/CSS：ゲーム処理・表示
- assets/：画像、音声、盤面、カード、演出素材
- manifest.webmanifest：Webアプリ設定

## 変更・検証のルール

制作原本・過去版・テストコードはGoogleドライブおよび開発用の main で管理します。商品版への反映前に、通常対局9×9とストーリー全章、画像・音声、スマートフォン表示を検証してください。

このブランチをGitHub Pagesで直接公開するには別途Pagesの公開元設定が必要です。現在の main の公開URLは変更していません。
