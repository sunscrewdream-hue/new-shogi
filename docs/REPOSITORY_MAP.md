# リポジトリ構成と安全な整理方針

2026-11-05 時点の `main` を対象とした第一次棚卸し。ここに記した「候補」は削除許可や未使用の証明ではありません。

## ブランチ

| ブランチ | 状況 | 方針 |
| --- | --- | --- |
| `main` | GitHub Pages の正式な開発・公開元 | 維持。新規作業の基準 |
| `image` | 以前の手動画像アップロードに使われた履歴 | 差分・固有素材を照合するまで削除しない |
| `sounds` | 以前の手動音声アップロードに使われた履歴 | 差分・固有音源を照合するまで削除しない |

## 公開入口と実行コード

| パス | 用途・注意 |
| --- | --- |
| `index.html` | GitHub Pages ルートの入口。既存転送を保持 |
| `card-ai-test.html` | 通常対局の正式本編。9×9の完成版 |
| `enhancements.js`, `enhancements.css`, `game-language.js` | 通常対局側の機能・表示補助 |
| `story-mode.html`, `story-mode.js`, `story-mode.css` | ストーリー画面・操作・演出 |
| `story-engine.js`, `story-data.js` | ストーリー側の独立エンジンと章定義。未共通化に注意 |
| `story-bgm.js`, `story-weapons.js` | ストーリーのBGM・兵器演出 |
| `collection.html`, `collection-progress.js`, `collection-progress.css` | 人物図鑑・収集表示 |
| `manual.html`, `manual-en.html`, `rules.html`, `history.html` | 説明・資料ページ。外部リンクも想定し、移動しない |

## 素材

| 場所 | 主な内容 |
| --- | --- |
| `assets/audio/` | 音声・効果音・タイトルBGM |
| `assets/portraits/` | 人物肖像40名 |
| `assets/dialogue_banners/` | 人物会話バナー40名 |
| `assets/story/` | 章背景・章専用盤・敵将・モブ・兵器・BGM |
| `assets/story/audio/bgm_*.part` | `story-bgm.js` が連結読込するBGM断片。**削除禁止** |
| `assets/visuals/`, `assets/sprites/`, `assets/pieces/`, `assets/cards/`, `assets/turn-notice/` | 本編およびストーリーが参照する共通美術素材 |

## 未整理・要精査候補

- ルート直下の `voice_*.mp3` と `assets/audio/` の同名音声：重複の可能性。ただし実参照・内容ハッシュを確認するまで保持。
- `honor_in_the_silence.mp3` と `honor_in_the_silence_96kbps.mp3`：後者は本編BGMとして参照中。前者は原音源の可能性があり削除しない。
- `assets/audio/track-001.b64`：テキスト形式の旧素材候補。参照・復元用途を確認する。
- ルート直下の `image`, `voices`：内容の短いファイル。手動アップロードの名残か確認する。
- ルート直下と `assets/` 以下の同名画像・SVG：同一素材と断定せずハッシュと全参照を照合する。
- `image`, `sounds` ブランチの固有ファイル：`main` へ取り込まれていない素材を特定してから、アーカイブ・統合の可否を判断する。

## 整理の安全手順

1. `main` の内容とGitHub Pagesの公開ページを基準として固定する。
2. HTML・CSS・JavaScript・manifest内の相対URL、動的生成URL、外部公開リンクを洗い出す。
3. ファイルごとに「使用中／未参照だが原本／保管候補／削除候補」を分類する。
4. 移動が必要な場合は参照パスを同じ変更で更新し、旧URLの互換性を検討する。
5. 変更後に通常対局、全章、BGM、ボイス、画像、PWAを確認し、GitHub Pagesの公開成功も検証する。
6. 破壊的な削除や旧ブランチの削除は、候補一覧と復元方法を提示して承認を得た後に実施する。

この第一次整理では実ファイルの移動・削除を行わない。
