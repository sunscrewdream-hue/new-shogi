# 新選組将棋 / Shinsengumi Shogi

GitHub Pages で公開するブラウザ将棋ゲームです。**正式な通常対局は `card-ai-test.html`**、歴史章の対局は `story-mode.html` です。`index.html` は公開入口の転送用として維持してください。

- [通常対局](https://sunscrewdream-hue.github.io/new-shogi/card-ai-test.html)
- [ストーリーモード](https://sunscrewdream-hue.github.io/new-shogi/story-mode.html)
- [構成・変更時の注意事項](docs/REPOSITORY_MAP.md)

## 開発上の重要事項

1. 完成済み9×9通常対局のルール・素材・演出を基準とし、作り直さない。
2. ストーリーの5×6（池田屋・油小路）は既存機能を再利用する。事件札の導入は保留中。
3. 現状のストーリー側は独立エンジンを持つため、通常対局と完全には共通化されていない。統合済みと誤認しない。
4. GitHub Pages の URL、HTML の相対パス、JS/CSS 内の画像・音声参照を確認せずにファイルを移動・改名・削除しない。
5. `assets/story/audio/*.part` はストーリーBGMの実データであり、不要ファイルではない。

変更後は通常対局と全ストーリー章をPC・スマホで確認してください。過去の仕様や作業状況はGoogleドライブの「新撰組将棋｜企画・決定事項」「新撰組将棋｜開発・修正履歴」を参照してください。
