# Релиз плагина dsh-department

## 1. Перед релизом

- [ ] `npm test` — все тесты зелёные.
- [ ] Проверить плагин в живом профиле: панель, офис, задача, коммит, пауза.
- [ ] Обновить `CHANGELOG.md` и версию в `package.json` (semver).
- [ ] Проверить `npm pack --dry-run`: в пакет попадает только нужное.
- [ ] `README.md` (ru) и `README.en.md` (en) актуальны.
- [ ] Лицензия MIT на месте, автор/репозиторий указаны.

## 2. Сборка пакета

```bash
npm pack --dry-run     # посмотреть состав
npm pack               # dsh-department-<version>.tgz
```

Установка из tgz в чистый профиль:

```bash
dsh plugin --profile web add /abs/path/dsh-department-<version>.tgz
```

или через инструмент DSH:

```
plugin_manager install_bundle target /abs/path/dsh-department-<version>.tgz
```

Перезапустить DSH и проверить панель отдела.

## 3. Публикация в npm

Имя `dsh-department` свободно (проверено 2026-11-17).

```bash
npm login
npm publish --access public
```

После публикации установка:

```bash
dsh plugin --profile web add dsh-department
```

## 4. Тег и GitHub release

```bash
git tag v<version> -m "dsh-department <version>"
git push origin HEAD --tags
```

В GitHub release приложить:

- `dsh-department-<version>.tgz`;
- ссылку на `CHANGELOG.md`;
- требования: DSH `>=0.2.0`, Node `>=24.9`;
- короткий quick start.

## 5. Проверка после публикации

- [ ] установка из npm в чистый профиль;
- [ ] панель открывается, задача создаётся, `dept_health` отвечает;
- [ ] офис рисуется, спрайты грузятся (`/api/department/asset`);
- [ ] коммит этапа ставит тег и пушит;
- [ ] пауза/возобновление работают.

## 6. Откат

- npm: `npm unpublish dsh-department@<version>` (в течение 72 ч) или выпустить patch.
- DSH: `plugin_manager install_bundle` предыдущей версии; данные задач не трогаются.
- Git: откатить тег/коммит, но не переписывать историю у пользователей.

## 7. Что важно для пользователей

- Плагин хранит состояние в `docs/department/<taskId>/state.json` внутри проекта.
- Нужны `git` и Node 24+; для художника/бета-тестера — `sharp`/`playwright`.
- Первый запуск: `dept_start` в чате, затем панель отдела.
