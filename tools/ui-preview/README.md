# Предпросмотр UI

Снимает скриншоты панели «ИИ-отдел» без запуска DSH — на моках данных.

```bash
cd tools/ui-preview
npm init -y
npm i react@18 react-dom@18 playwright
npx playwright install chromium
cp ../../client.js ./client.js
cp node_modules/react/umd/react.development.js ./react.js
cp node_modules/react-dom/umd/react-dom.development.js ./react-dom.js
node shot.mjs   # → /tmp/preview-shot.png
```

`index.html` содержит мок-данные (задача, схема, офис) и рендерит
`TaskDetail`, `BlueprintView`, `OfficeView`. Правь моки под сценарий.
