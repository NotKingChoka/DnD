# D&D Academy / Школа приключенца

Интерактивный fantasy-курс по основам Dungeons & Dragons для новичков: короткие уроки, карта прогресса, анимированные примеры, мини-игры, достижения и локальное сохранение.

## Стек

- React 19 + Vite
- Framer Motion
- Lucide React
- LocalStorage
- GitHub Pages через `gh-pages`

## Запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
npm run preview
```

## Деплой на GitHub Pages

1. Создай репозиторий и добавь его как `origin`.
2. Отправь ветку `main`.
3. Выполни:

```bash
npm run deploy
```

`vite.config.js` уже использует `base: './'`, поэтому проект удобно выкладывать как статическую сборку.
