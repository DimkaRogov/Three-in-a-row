# Contributing

## Workflow

1. Создайте ветку от `main` (`feature/*`, `fix/*`, `chore/*`, `docs/*`, `test/*`).
2. Делайте небольшие изменения с понятными коммитами.
3. Откройте PR в `main` и заполните шаблон.
4. Убедитесь, что CI зелёный.
5. После ревью вносите правки и обновляйте PR.

## Локальная проверка

### Backend (TypeScript)

```bash
cd server
npm ci
npm run lint
npm run build
npm test
```

### Haskell smoke

```bash
cabal build
```

## Стиль коммитов

- `Feature: ...` для новой функциональности
- `Fix: ...` для исправлений
- `Refactor: ...` для рефакторинга
- `Docs: ...` для документации
- `Test: ...` для тестов
