# Публикация на GitHub и в npm

## 1. GitHub

1. Создай **пустой** репозиторий `dsh-department` (без README и лицензии — они уже есть).
2. Впиши его в `package.json`:

```json
"repository": { "type": "git", "url": "git+https://github.com/<username>/dsh-department.git" },
"homepage": "https://github.com/<username>/dsh-department#readme",
"bugs": { "url": "https://github.com/<username>/dsh-department/issues" }
```

3. Добавь remote и запушь:

```bash
git remote add github git@github.com:<username>/dsh-department.git
git push -u github main
git push github --tags
```

4. В настройках репозитория включи Actions (workflow `CI` уже в `.github/workflows/ci.yml`),
   добавь описание и темы: `dsh`, `deepseek-harness`, `multi-agent`, `ai-department`.

## 2. npm

Имя `dsh-department` свободно.

```bash
npm login
npm publish --access public
```

Проверка:

```bash
npm view dsh-department version
npx @deepseek-ai/dsh plugin --profile web add dsh-department
```

## 3. Релиз

- версия по semver, `CHANGELOG.md` обновлён;
- тег `v<version>` и GitHub Release с `dsh-department-<version>.tgz`;
- в релизе указать требования: DSH `>=0.2.0`, Node `>=24.9`;
- приложить `docs/RELEASE.md` как чек-лист.

## 4. Проверка установки у пользователя

```bash
dsh plugin --profile web add dsh-department
# перезапустить DSH
```

Затем в чате: `dept_start` и панель «Отдел».
