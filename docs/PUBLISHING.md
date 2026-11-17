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

## Trusted Publishing (публикация без токенов)

После первого ручного релиза настрой доверенного издателя:

1. npmjs.com → пакет `dsh-department` → **Settings → Trusted Publishing → Add publisher**
2. Provider: **GitHub Actions**
3. Organization/user: `Vldimirus`
4. Repository: `dsh-department`
5. Workflow filename: `publish.yml`
6. Environment: оставить пустым
7. Add.

Затем в GitHub: **Settings → Actions → Allow all actions** (если Actions выключены).

Настроить доверенного издателя можно и командой (на машине, где выполнен `npm login`):

```bash
npm trust github dsh-department \
  --repo Vldimirus/dsh-department \
  --file publish.yml \
  --allow-publish --yes
```

Дальше релиз делается так:

1. Подними версию: `npm version patch --no-git-tag-version`, обнови `CHANGELOG.md`.
2. Закоммить и запушь `main`.
3. Поставь тег и запушь его:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```
4. GitHub Actions сам:
   - создаст страницу релиза (`release.yml`, заметки из `docs/releases/v<version>.md`);
   - прогонит тесты и опубликует пакет (`publish.yml`).

Секреты и токены не нужны: GitHub Actions получает короткоживущий OIDC-токен от npm.
