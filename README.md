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

制作原本・過去版・テストコードはGoogleドライブで管理します。旧背景、旧カード、旧勝敗画像、重複音声、破損が判明した素材は商品版から除外し、整理前のバックアップから復元できるようにしています。商品版への反映前に、通常対局9×9とストーリー全章、画像・音声、スマートフォン表示を検証してください。

このブランチをGitHub Pagesで直接公開するには別途Pagesの公開元設定が必要です。現在の main の公開URLは変更していません。
