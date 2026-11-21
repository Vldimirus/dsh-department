/**
 * Браузерная половина плагина «ИИ-отдел»: доска задач, карточка задачи и офис.
 * Классический скрипт: без import/export, React берётся из таблицы модулей.
 */
window.__ModuleLoader__.load({
  id: 'dsh-department',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React


    // --- i18n -------------------------------------------------------------
    // Словарь интерфейса. Серверные тексты (аудит, события) пока на русском —
    // см. docs/I18N.md: их перевод идёт отдельным этапом.
    const LOCALES = {
      ru: {
        'nav.board': 'Доска',
        'nav.projects': 'Проекты',
        'nav.office': 'Офис',
        'nav.blueprint': 'Схема',
        'nav.charts': 'Графики',
        'nav.editor': 'Редактор',
        'nav.refresh': 'Обновить',
        'office.title': 'Офис отдела',
        'office.staff': 'сотрудников: {n} из {m}',
        'office.empty': 'никого нет',
        'office.paused': 'отдел на паузе',
        'projects.title': 'Проекты',
        'task.pause': 'Пауза',
        'task.resume': 'Продолжить',
        'tabs.overview': 'Обзор',
        'tabs.docs': 'Документы',
        'tabs.questions': 'Вопросы',
        'tabs.audit': 'Аудит',
        'tabs.events': 'События',
        'tabs.correction': 'Корректировка',
        'tabs.roles': 'Роли',
        'tabs.design': 'Дизайн',
        'tabs.billing': 'Бюджет',
        'tabs.git': 'Git',

        'stage.analysis': 'Обсуждение',
        'stage.concept': 'Концепция',
        'stage.concept_review': 'Проверка концепции',
        'stage.design': 'Дизайн',
        'stage.design_review': 'Проверка дизайна',
        'stage.spec': 'ТЗ',
        'stage.spec_review': 'Проверка ТЗ',
        'stage.executing': 'Исполнение',
        'stage.release': 'Подготовка к продакшену',
        'stage.done': 'Завершено',
        'stage.blocked': 'Заблокировано',
        'status.pass': 'Пройдено',
        'status.fail': 'Провал',
        'status.pending': 'Ожидание',
        'role.manager': 'Руководитель',
        'role.coder': 'Кодер',
        'role.tester': 'Тестер',
        'role.reviewer': 'Ревьюер',
        'role.analyst': 'Аналитик',
        'role.artist': 'Художник',
        'role.archivist': 'Архивариус',
        'role.instrumenter': 'Инструментатор',
        'doc.task': 'Задача',
        'doc.analysis': 'Анализ',
        'doc.concept': 'Концепция',
        'doc.spec': 'ТЗ',
        'doc.plan': 'План',
        'doc.report': 'Отчёт',
        'doc.review': 'Ревью',
        'doc.memo': 'Служебная записка',
        'doc.backlog': 'Бэклог',
        'doc.bugs': 'Баги',
        'doc.rework': 'Переработка',
        'block.status': 'Состояние',
        'block.stage': 'Этап',
        'block.attempts': 'Попытки (провалы)',
        'block.tests': 'Тесты',
        'block.review': 'Ревью',
        'block.tokens': 'Токены',
        'block.cost': 'Стоимость',
        'block.calls': 'Вызовов модели',
        'block.approval': 'Утверждение',
        'approve.spec': 'Утвердить ТЗ',
        'approve.concept': 'Утвердить концепцию',
        'approve.design': 'Утвердить дизайн',
        'doc.main': 'главный документ',
        'block.openQuestions': 'Открытые вопросы',
        'block.documents': 'Документы',
        'block.recentEvents': 'Последние события',
        'block.audit': 'Аудит dept_verify',
        'block.events': 'События',
        'block.questions': 'Открытые вопросы',
        'block.commits': 'Коммиты',
        'block.tags': 'Теги',
        'block.branch': 'Ветка',
        'block.roles': 'Роли и модели',
        'doc.search': 'поиск по названию',
        'doc.allTypes': 'все типы',
        'doc.notFound': 'ничего не найдено',
        'doc.choose': 'Выбери документ слева — здесь появится содержимое.',
        'doc.loading': 'загрузка…',
        'doc.error': 'ошибка: ',
        'audit.pass': 'Итог: PASS',
        'audit.fail': 'Итог: FAIL',
        'event.time': 'время',
        'event.author': 'автор',
        'event.noDetails': 'без подробностей',
        'event.choose': 'Выбери событие слева — здесь появятся подробности.',
        'badge.paused': '⏸ пауза',
        'badge.noBody': 'никого нет',
        'office.roleTag': 'сотрудник',
        'party.title': '🎉 Вечеринка!',
        'party.text': 'Все задачи отдела закрыты — можно отдыхать.',
        'office.fullTitle': 'Офис ИИ-отдела',
        'event.unknown': 'событие',
        'branch.prefix': 'ветка',


        'dept.enabled': 'Отдел: вкл',
        'dept.disabled': 'Отдел: выкл',
        'dept.newTask': '＋ Задача',
        'dept.createTitle': 'Новая задача отдела',
        'dept.root': 'Проект',
        'dept.taskId': 'ID задачи',
        'dept.title': 'Название',
        'dept.brief': 'Бриф',
        'dept.test': 'Команда тестов',
        'dept.create': 'Создать',
        'dept.pick': 'Выбрать…',
        'dept.up': '↑ Наверх',
        'dept.chooseThis': 'Выбрать эту папку',
        'dept.git': 'git-проекты',
        'dept.dirError': 'Не удалось прочитать каталог',
        'dept.cancel': 'Отмена',
        'dept.offBanner': 'Отдел выключен — новые задачи не запускаются, инструменты заблокированы.',
        'activity.title': 'Сейчас работают',
        'activity.none': 'активности нет',
        'office.lounge': 'КОМНАТА ОТДЫХА',
        'office.status.paused': 'пауза',
        'office.status.working': 'работает',
        'office.status.walking': 'идёт',
        'office.status.break': 'перерыв',
        'office.status.free': 'свободно',
        'side.project': 'Проект:',
        'side.now': 'Сейчас',
        'side.files': 'Файлы:',
        'side.recent': 'Последние действия',
        'side.openTask': 'Открыть задачу',
        'side.choose': 'Выбери человечка на схеме — здесь появятся проект, файлы и история.',
        'badge.onPause': '⏸ на паузе',
        'msg.pricesSaved': 'Цены сохранены',
        'msg.done': 'Готово',
        'msg.error': 'ошибка',

        'billing.hint': 'Лимит и цены за 1M токенов; курс — для пересчёта в рубли.',
        'billing.live': 'сейчас (после перезапуска)',
        'billing.total': 'всего по этапам',
        'billing.totalCost': 'стоимость по этапам',
        'billing.snapshot': 'снимок при последнем коммите',
        'billing.humanSet': 'лимит установлен человеком',
        'billing.limit': 'Лимит токенов',
        'billing.input': '$/1M вход',
        'billing.output': '$/1M выход',
        'billing.cacheRead': '$/1M кэш-чтение',
        'billing.cacheWrite': '$/1M кэш-запись',
        'billing.rate': 'курс ₽',
        'roles.hint': 'Модель и reasoning для каждой роли. Пустая модель — по умолчанию.',
        'roles.core': 'основная роль — всегда включена',
        'roles.toggle': 'включить/выключить роль',
        'roles.saved': 'Лимит роли сохранён',
        'git.noCommits': 'нет коммитов',
        'none.short': 'нет',
        'questions.empty': 'Открытых вопросов нет.',
        'questions.waiting': 'ждёт ответа',
        'questions.answer': 'ответ',
        'questions.answerBtn': 'Ответить',
        'questions.memos': 'Служебные записки (ждут решения человека)',
        'questions.memo': 'записка',
        'questions.decision': 'решение команды: ',
        'questions.file': 'файл: ',
        'questions.remarks': 'замечания (если не устраивает)',
        'questions.approve': 'Утвердить',
        'questions.changes': 'Замечания',
        'questions.answered': 'Отвеченные',
        'questions.answeredBadge': 'отвечен',
        'correction.hint': 'Как письмо руководителю: что поменять и к чему это относится.',
        'correction.toManager': 'Руководитель возьмёт в работу и соберёт специалистов.',
        'correction.concept': 'Концепция',
        'correction.spec': 'ТЗ',
        'correction.plan': 'План',
        'correction.code': 'Код',
        'correction.data': 'Данные',
        'correction.interface': 'Интерфейс',
        'block.newCorrection': 'Новая корректировка',
        'block.correctionHistory': 'История корректировок',
        'block.billing': 'Бюджет и цены',
        'field.doc': 'К чему относится',
        'field.subject': 'Тема',
        'field.text': 'Текст корректировки',
        'btn.sendCorrection': 'Отправить корректировку',
        'btn.savePrices': 'Сохранить цены',
        'nav.back': 'К доске',
        'none': 'нет',
        'doc.other': 'Документ',
        'doc.reworkPlan': 'План переработки',
        'doc.section': 'Раздел специалиста',
        'doc.bug': 'Баг-репорт',
        'doc.stageReport': 'Отчёт этапа',
        'doc.stageReview': 'Ревью этапа',
        'doc.failure': 'Анализ провала',
        'doc.approach': 'Смена подхода',
        'audit.present': 'есть',
        'audit.missing': 'нет',
        'audit.approved': 'утверждено',
        'audit.notApproved': 'не утверждено',
        'audit.closed': 'этап закрыт коммитом',
        'event.tests_passed': 'Тесты пройдены',
        'event.review_passed': 'Ревью пройдено',
        'event.commit_pushed': 'Коммит отправлен',
        'event.stage_done': 'Этап завершён',
        'event.question_asked': 'Вопрос задан',
        'event.question_answered': 'Ответ получен',
        'event.amended_document': 'Документ поправлен',
        'event.approved': 'Документ утверждён',
        'event.correction_created': 'Корректировка отправлена',
        'event.budget_updated': 'Бюджет изменён',
        'event.task_paused': 'Пауза',
        'event.task_resumed': 'Возобновлено',
        'event.branch_ready': 'Ветка создана',
        'event.roles_updated': 'Роли изменены',
        'event.memo_ready': 'Записка готова',
        'event.idea_critiqued': 'Идея оценена',
        'event.module_planned': 'Модули спланированы',

        'projects.count': "проектов: {n}",
        'projects.none': "Проектов с задачами нет.",
        'btn.reset': "Сбросить",
        'btn.save': "Сохранить",
        'title.textSize': "Размер текста",
        'pause.byButton': "по кнопке",
        'roles.instances': "сколько экземпляров роли можно запускать одновременно",
        'roles.enabled': "Роль включена",
        'roles.disabled': "Роль выключена",
        'roles.coreMark': " · основная",
        'block.byStages': "По этапам",
        'unit.tokens': " т. · $",
        'chart.costTitle': "Стоимость",
        'form.name': "ваше имя",
        'form.nameTitle': "Имя для подписи",
        'empty.projects': "Нет проектов с задачами.",
        'empty.tasks': "Нет задач.",
        'empty.noTasksHint': "Задач пока нет. Создай задачу через dept_start.",
        'loading.task': "Загрузка задачи…",
        'title.department': "ИИ-отдел разработки",
        'title.departmentShort': "ИИ-отдел",
        'count.tasks': "задач: {n}",
        'count.refreshing': " · обновление…",
        'charts.tokensLine': "токенов: {t} · ${c} · время: {h} ч {m} мин",
        'charts.duration': "Длительность",
        'charts.gates': "Гейты по этапам",
        'minutesShort': "мин",
        'status.workingBadge': "● работает",
        'status.breakBadge': "○ перерыв",
        'status.pausedBadge': "⏸ пауза",
        'bp.filesCount': "файлов: {n}",
        'bp.linesCount': "строк: {n}",
        'bp.stats': "файлов: {f} · строк: {l} · связей: {e}",
        'bp.loading': "загрузка…",
        'bp.allGroups': "← Все группы",
        'bp.groups': "Группы",
        'bp.lines': "строк",
        'bp.layer': "слой",
        'bp.symbols': "Функции и классы",
        'bp.imports': "Импортирует",
        'bp.usedBy': "Используется в",
        'bp.inner': "внутри группы связей: {i} · наружу: {o}",
        'bp.root': "(корень)",
        'layer.core': "Ядро",
        'layer.ui': "Интерфейс",
        'layer.tests': "Тесты",
        'layer.docs': "Документы",
        'bp.title': "Схема проекта",
        'bp.byDir': "По папкам",
        'bp.byLayer': "По слоям",
        'bp.choose': "Выбери группу слева, затем файл на схеме.",
        'charts.title': "Графики по этапам",
        'stageNo': "этап",
        'none.yet': "пока нет",
        'activity.manager': "менеджер",
        'activity.subagent': "субагент",
      },
      en: {
        'nav.board': 'Board',
        'nav.projects': 'Projects',
        'nav.office': 'Office',
        'nav.blueprint': 'Blueprint',
        'nav.charts': 'Charts',
        'nav.editor': 'Editor',
        'nav.refresh': 'Refresh',
        'office.title': 'Department office',
        'office.staff': 'staff: {n} of {m}',
        'office.empty': 'nobody here',
        'office.paused': 'department paused',
        'projects.title': 'Projects',
        'task.pause': 'Pause',
        'task.resume': 'Resume',
        'tabs.overview': 'Overview',
        'tabs.docs': 'Documents',
        'tabs.questions': 'Questions',
        'tabs.audit': 'Audit',
        'tabs.events': 'Events',
        'tabs.correction': 'Corrections',
        'tabs.roles': 'Roles',
        'tabs.design': 'Design',
        'tabs.billing': 'Budget',
        'tabs.git': 'Git',

        'stage.analysis': 'Discussion',
        'stage.concept': 'Concept',
        'stage.concept_review': 'Concept review',
        'stage.design': 'Design',
        'stage.design_review': 'Design review',
        'stage.spec': 'Spec',
        'stage.spec_review': 'Spec review',
        'stage.executing': 'Execution',
        'stage.release': 'Production prep',
        'stage.done': 'Done',
        'stage.blocked': 'Blocked',
        'status.pass': 'Pass',
        'status.fail': 'Fail',
        'status.pending': 'Pending',
        'role.manager': 'Manager',
        'role.coder': 'Coder',
        'role.tester': 'Tester',
        'role.reviewer': 'Reviewer',
        'role.analyst': 'Analyst',
        'role.artist': 'Artist',
        'role.archivist': 'Archivist',
        'role.instrumenter': 'Instrumenter',
        'doc.task': 'Task',
        'doc.analysis': 'Analysis',
        'doc.concept': 'Concept',
        'doc.spec': 'Spec',
        'doc.plan': 'Plan',
        'doc.report': 'Report',
        'doc.review': 'Review',
        'doc.memo': 'Memo',
        'doc.backlog': 'Backlog',
        'doc.bugs': 'Bugs',
        'doc.rework': 'Rework',
        'block.status': 'Status',
        'block.stage': 'Stage',
        'block.attempts': 'Attempts (failures)',
        'block.tests': 'Tests',
        'block.review': 'Review',
        'block.tokens': 'Tokens',
        'block.cost': 'Cost',
        'block.calls': 'Model calls',
        'block.approval': 'Approval',
        'approve.spec': 'Approve spec',
        'approve.concept': 'Approve concept',
        'approve.design': 'Approve design',
        'doc.main': 'key document',
        'block.openQuestions': 'Open questions',
        'block.documents': 'Documents',
        'block.recentEvents': 'Recent events',
        'block.audit': 'Audit dept_verify',
        'block.events': 'Events',
        'block.questions': 'Open questions',
        'block.commits': 'Commits',
        'block.tags': 'Tags',
        'block.branch': 'Branch',
        'block.roles': 'Roles & models',
        'doc.search': 'search by title',
        'doc.allTypes': 'all types',
        'doc.notFound': 'nothing found',
        'doc.choose': 'Pick a document on the left — its content appears here.',
        'doc.loading': 'loading…',
        'doc.error': 'error: ',
        'audit.pass': 'Result: PASS',
        'audit.fail': 'Result: FAIL',
        'event.time': 'time',
        'event.author': 'author',
        'event.noDetails': 'no details',
        'event.choose': 'Pick an event on the left — details appear here.',
        'badge.paused': '⏸ paused',
        'badge.noBody': 'nobody here',
        'office.roleTag': 'employee',
        'party.title': '🎉 Party!',
        'party.text': 'All department tasks are closed — time to rest.',
        'office.fullTitle': 'AI department office',
        'event.unknown': 'event',
        'branch.prefix': 'branch',


        'dept.enabled': 'Department: on',
        'dept.disabled': 'Department: off',
        'dept.newTask': '+ Task',
        'dept.createTitle': 'New department task',
        'dept.root': 'Project',
        'dept.taskId': 'Task ID',
        'dept.title': 'Title',
        'dept.brief': 'Brief',
        'dept.test': 'Test command',
        'dept.create': 'Create',
        'dept.pick': 'Choose…',
        'dept.up': '↑ Up',
        'dept.chooseThis': 'Choose this folder',
        'dept.git': 'git projects',
        'dept.dirError': 'Cannot read directory',
        'dept.cancel': 'Cancel',
        'dept.offBanner': 'Department is off — new tasks are not started, tools are blocked.',
        'activity.title': 'Working now',
        'activity.none': 'no activity',
        'office.lounge': 'LOUNGE',
        'office.status.paused': 'paused',
        'office.status.working': 'working',
        'office.status.walking': 'walking',
        'office.status.break': 'on break',
        'office.status.free': 'free',
        'side.project': 'Project:',
        'side.now': 'Now',
        'side.files': 'Files:',
        'side.recent': 'Recent actions',
        'side.openTask': 'Open task',
        'side.choose': 'Pick a person on the map — project, files and history appear here.',
        'badge.onPause': '⏸ paused',
        'msg.pricesSaved': 'Prices saved',
        'msg.done': 'Done',
        'msg.error': 'error',





        'projects.count': 'projects: {n}',
        'projects.none': 'No projects with tasks.',
        'btn.reset': 'Reset',
        'btn.save': 'Save',
        'title.textSize': 'Text size',
        'pause.byButton': 'by button',
        'roles.instances': 'how many instances of the role can run at once',
        'roles.enabled': 'Role enabled',
        'roles.disabled': 'Role disabled',
        'roles.coreMark': ' · core',
        'block.byStages': 'By stages',
        'unit.tokens': ' k · $',
        'chart.costTitle': 'Cost',
        'form.name': 'your name',
        'form.nameTitle': 'Signature name',
        'empty.projects': 'No projects with tasks.',
        'empty.tasks': 'No tasks.',
        'empty.noTasksHint': 'No tasks yet. Create one with dept_start.',
        'loading.task': 'Loading task…',
        'title.department': 'AI development department',
        'title.departmentShort': 'Department',
        'count.tasks': 'tasks: {n}',
        'count.refreshing': ' · refreshing…',
        'charts.tokensLine': 'tokens: {t} · ${c} · time: {h}h {m}m',
        'charts.duration': 'Duration',
        'charts.gates': 'Gates by stages',
        'minutesShort': 'min',
        'status.workingBadge': '● working',
        'status.breakBadge': '○ on break',
        'status.pausedBadge': '⏸ paused',
        'bp.filesCount': 'files: {n}',
        'bp.linesCount': 'lines: {n}',
        'bp.stats': 'files: {f} · lines: {l} · edges: {e}',
        'bp.loading': 'loading…',
        'bp.allGroups': '← All groups',
        'bp.groups': 'Groups',
        'bp.lines': 'lines',
        'bp.layer': 'layer',
        'bp.symbols': 'Functions and classes',
        'bp.imports': 'Imports',
        'bp.usedBy': 'Used by',
        'bp.inner': 'inside group edges: {i} · outside: {o}',
        'bp.root': '(root)',
        'layer.core': 'Core',
        'layer.ui': 'UI',
        'layer.tests': 'Tests',
        'layer.docs': 'Docs',
        'bp.title': 'Project blueprint',
        'bp.byDir': 'By folders',
        'bp.byLayer': 'By layers',
        'bp.choose': 'Pick a group on the left, then a file on the map.',
        'charts.title': 'Charts by stages',
        'stageNo': 'stage',
        'none.yet': 'none yet',
        'activity.manager': 'manager',
        'activity.subagent': 'subagent',
        'billing.hint': 'Token limit and prices per 1M tokens; rate converts to RUB.',
        'billing.live': 'current (since restart)',
        'billing.total': 'total by stages',
        'billing.totalCost': 'cost by stages',
        'billing.snapshot': 'snapshot at last commit',
        'billing.humanSet': 'limit set by human',
        'billing.limit': 'Token limit',
        'billing.input': '$/1M input',
        'billing.output': '$/1M output',
        'billing.cacheRead': '$/1M cache read',
        'billing.cacheWrite': '$/1M cache write',
        'billing.rate': 'rate RUB',
        'roles.hint': 'Model and reasoning per role. Empty model means default.',
        'roles.core': 'core role — always enabled',
        'roles.toggle': 'enable/disable role',
        'roles.saved': 'Role limit saved',
        'git.noCommits': 'no commits',
        'none.short': 'none',
        'questions.empty': 'No open questions.',
        'questions.waiting': 'waiting for answer',
        'questions.answer': 'answer',
        'questions.answerBtn': 'Answer',
        'questions.memos': 'Memos (waiting for human decision)',
        'questions.memo': 'memo',
        'questions.decision': 'team decision: ',
        'questions.file': 'file: ',
        'questions.remarks': 'remarks (if not satisfied)',
        'questions.approve': 'Approve',
        'questions.changes': 'Remarks',
        'questions.answered': 'Answered',
        'questions.answeredBadge': 'answered',
        'correction.hint': 'Like a letter to the manager: what to change and what it relates to.',
        'correction.toManager': 'The manager will take it and gather specialists.',
        'correction.concept': 'Concept',
        'correction.spec': 'Spec',
        'correction.plan': 'Plan',
        'correction.code': 'Code',
        'correction.data': 'Data',
        'correction.interface': 'Interface',
        'block.newCorrection': 'New correction',
        'block.correctionHistory': 'Correction history',
        'block.billing': 'Budget & prices',
        'field.doc': 'Relates to',
        'field.subject': 'Subject',
        'field.text': 'Correction text',
        'btn.sendCorrection': 'Send correction',
        'btn.savePrices': 'Save prices',
        'nav.back': 'Back to board',
        'none': 'none',
        'doc.other': 'Document',
        'doc.reworkPlan': 'Rework plan',
        'doc.section': 'Specialist section',
        'doc.bug': 'Bug report',
        'doc.stageReport': 'Stage report',
        'doc.stageReview': 'Stage review',
        'doc.failure': 'Failure analysis',
        'doc.approach': 'Approach change',
        'audit.present': 'present',
        'audit.missing': 'missing',
        'audit.approved': 'approved',
        'audit.notApproved': 'not approved',
        'audit.closed': 'stage closed by commit',
        'event.tests_passed': 'Tests passed',
        'event.review_passed': 'Review passed',
        'event.commit_pushed': 'Commit pushed',
        'event.stage_done': 'Stage done',
        'event.question_asked': 'Question asked',
        'event.question_answered': 'Answer received',
        'event.amended_document': 'Document amended',
        'event.approved': 'Document approved',
        'event.correction_created': 'Correction created',
        'event.budget_updated': 'Budget updated',
        'event.task_paused': 'Paused',
        'event.task_resumed': 'Resumed',
        'event.branch_ready': 'Branch ready',
        'event.roles_updated': 'Roles updated',
        'event.memo_ready': 'Memo ready',
        'event.idea_critiqued': 'Idea critiqued',
        'event.module_planned': 'Modules planned',

      },
    }
    let deptLang = (() => {
      try {
        const saved = localStorage.getItem('dept-lang')
        if (saved === 'ru' || saved === 'en') return saved
        const nav = (navigator.language || 'ru').toLowerCase()
        return nav.startsWith('ru') ? 'ru' : 'en'
      } catch {
        return 'ru'
      }
    })()
    const t = (key, vars) => {
      const table = LOCALES[deptLang] ?? LOCALES.ru
      let value = table[key] ?? LOCALES.ru[key] ?? key
      for (const [name, replacement] of Object.entries(vars ?? {})) value = value.split('{' + name + '}').join(String(replacement))
      return value
    }

    const stageLabel = (stage) => { const value = t('stage.' + stage); return value === 'stage.' + stage ? String(stage ?? '') : value }
    const roleLabel = (role) => { const value = t('role.' + role); return value === 'role.' + role ? String(role ?? '') : value }
    const DOC_KEY = {
      'документ': 'doc.other',
      'план переработки': 'doc.reworkPlan',
      'раздел специалиста': 'doc.section',
      'баг-репорт': 'doc.bug',
      'отчёт этапа': 'doc.stageReport',
      'ревью этапа': 'doc.stageReview',
      'анализ провала': 'doc.failure',
      'смена подхода': 'doc.approach',
      'служебная записка': 'doc.memo',
      'бэклог': 'doc.backlog',
      'план': 'doc.plan',
      'тз': 'doc.spec',
      'концепция': 'doc.concept',
      'анализ': 'doc.analysis',
      'задача': 'doc.task',
    }
    const docLabel = (type) => {
      const raw = String(type ?? '')
      const key = DOC_KEY[raw.toLowerCase()] ?? ('doc.' + raw.toLowerCase())
      const value = t(key)
      return value === key ? raw : value
    }
    const auditDetail = (detail) => {
      const raw = String(detail ?? '')
      const simple = {
        present: 'audit.present', missing: 'audit.missing',
        approved: 'audit.approved', 'not approved': 'audit.notApproved',
        'этап закрыт коммитом': 'audit.closed',
      }[raw]
      if (simple) return t(simple)
      if (raw.startsWith('status=')) return raw.replace('status=', 'status: ')
      return raw
    }
    const eventLabel = (action) => {
      const key = 'event.' + action
      const value = t(key)
      if (value !== key) return value
      return String(action ?? '').replace(/_/g, ' ')
    }
    const actorLabel = (actor) => { const value = t('role.' + actor); return value === 'role.' + actor ? String(actor ?? '') : value }
    const setDeptLang = (lang) => {
      deptLang = lang === 'en' ? 'en' : 'ru'
      try { localStorage.setItem('dept-lang', deptLang) } catch { /* приватный режим */ }
    }

    const PANEL_ID = 'department'
    const ROUTES = {
      tasks: '/api/department/tasks',
      task: '/api/department/task',
      activity: '/api/department/activity',
      approve: '/api/department/approve',
      answer: '/api/department/answer',
      amend: '/api/department/amend',
      budget: '/api/department/budget',
      blueprint: '/api/department/blueprint',
      roles: '/api/department/roles',
      documents: '/api/department/documents',
      document: '/api/department/document',
      correction: '/api/department/correction',
      pause: '/api/department/pause',
      settings: '/api/department/settings',
      createTask: '/api/department/task/create',
      editor: '/api/department/editor',
      browseDirs: '/api/department/browse-dirs',
      taskDelete: '/api/department/task/delete',
      taskStart: '/api/department/task/start',
      reopen: '/api/department/task/reopen',
      design: '/api/department/design',
      designImage: '/api/department/design/image',
      designFeedback: '/api/department/design/feedback',
      projects: '/api/department/projects',
      review: '/api/department/review',
    }

    function styleOnce() {
      const css = `
        .dept-root { display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100%; overflow: auto; color: var(--dsw-alias-label-primary, #e6edf7); font-size: var(--dept-text, 13px); }
        .dept-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .dept-title { font-size: calc(var(--dept-text, 13px) + 2px); font-weight: 600; letter-spacing: .01em; }
        .dept-sub { color: var(--dsw-alias-label-tertiary, #8b98ad); font-size: calc(var(--dept-text, 13px) - 1px); }
        .dept-block { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 10px 12px; background: var(--dsw-alias-bg-secondary, #10151f); display: flex; flex-direction: column; gap: 8px; }
        .dept-block-title { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-kv { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; border-bottom: 1px dashed #1f2a3d; padding-bottom: 3px; }
        .dept-kv:last-child { border-bottom: none; }
        .dept-kv span:first-child { color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-form-row { display: flex; flex-direction: column; gap: 3px; }
        .dept-form-row label { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-input { border: 1px solid var(--dsw-alias-border-secondary, #2a3446); background: var(--dsw-alias-bg-secondary, #121826); color: inherit; border-radius: 8px; padding: 5px 8px; font-size: calc(var(--dept-text, 13px) - 1px); min-width: 120px; }
        .dept-btn { border: 1px solid var(--dsw-alias-border-secondary, #2a3446); background: var(--dsw-alias-bg-secondary, #121826); color: inherit; border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
        .dept-btn:hover { border-color: var(--dsw-alias-border-primary, #3d4a63); }
        .dept-btn.active { border-color: #4b8bff; color: #cfe3ff; }
        .dept-tabs { display: flex; gap: 6px; }
        .dept-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
        .dept-card { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 12px; background: var(--dsw-alias-bg-secondary, #10151f); cursor: pointer; display: flex; flex-direction: column; gap: 8px; }
        .dept-card:hover { border-color: var(--dsw-alias-border-primary, #3d4a63); }
        .dept-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .dept-badge { border-radius: 999px; padding: 2px 8px; font-size: calc(var(--dept-text, 13px) - 2px); border: 1px solid var(--dsw-alias-border-secondary, #2a3446); }
        .dept-badge.ok { color: #7fdc9a; border-color: #2c5a3d; }
        .dept-badge.fail { color: #ff9a9a; border-color: #6a2c2c; }
        .dept-badge.wait { color: #d8c07a; border-color: #5a4a22; }
        .dept-bar { height: 6px; border-radius: 999px; background: var(--dsw-alias-bg-tertiary, #1b2333); overflow: hidden; }
        .dept-bar > i { display: block; height: 100%; background: linear-gradient(90deg, #4b8bff, #7fd4ff); }
        .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
        .dept-doc { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 8px; padding: 6px 8px; font-size: calc(var(--dept-text, 13px) - 1px); }
        .dept-doc.missing { opacity: .5; border-style: dashed; }
        .dept-events { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
        .dept-event { display: flex; gap: 8px; flex-wrap: wrap; }
        .dept-event time { color: var(--dsw-alias-label-tertiary, #8b98ad); min-width: 92px; }

        .dept-md { font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
        .dept-md p { margin: 0 0 8px; }
        .dept-md .md-h1 { font-size: 17px; margin: 10px 0 6px; }
        .dept-md .md-h2 { font-size: 15px; margin: 10px 0 6px; }
        .dept-md .md-h3, .dept-md .md-h4 { font-size: 13px; margin: 8px 0 4px; }
        .dept-md ul, .dept-md ol { margin: 0 0 8px; padding-left: 18px; }
        .dept-md li { margin: 2px 0; }
        .dept-md blockquote { margin: 8px 0; padding: 4px 10px; border-left: 3px solid #3d4a63; color: #b8c4d6; background: #141c2b; }
        .dept-md hr { border: none; border-top: 1px solid #24304a; margin: 10px 0; }
        .dept-md a { color: #7fb8ff; }
        .dept-inline-code { background: #1b2438; border: 1px solid #2a3446; border-radius: 4px; padding: 0 4px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
        .md-code { margin: 8px 0; border: 1px solid #232c3d; border-radius: 8px; overflow: hidden; }
        .md-code-lang { padding: 2px 8px; background: #141c2b; color: #6f7f98; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
        .md-code pre { margin: 0; padding: 8px 10px; overflow: auto; background: #0d1320; }
        .md-code code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; white-space: pre; }
        .md-keyword { color: #c792ea; }
        .md-string { color: #a5e075; }
        .md-num { color: #f0a35e; }
        .md-comment { color: #6f7f98; font-style: italic; }
        .md-table { overflow: auto; margin: 8px 0; }
        .dept-table { border-collapse: collapse; width: 100%; font-size: 12px; }
        .dept-table th, .dept-table td { border: 1px solid #26324a; padding: 4px 8px; text-align: left; vertical-align: top; }
        .dept-table th { background: #182235; color: #c9d6ea; }
        .dept-table tr:nth-child(even) td { background: #121a28; }
        .dept-pre { white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: calc(var(--dept-text, 13px) - 1px); color: var(--dsw-alias-label-secondary, #b8c4d6); }
        .dept-modal { position: fixed; inset: 0; background: #0008; display: flex; align-items: center; justify-content: center; z-index: 50; }
  .dept-modal-card { background: var(--dsw-alias-bg-secondary, #141a28); border: 1px solid var(--dsw-alias-border-secondary, #2a3446); border-radius: 12px; padding: 16px; width: min(560px, 92vw); display: flex; flex-direction: column; gap: 10px; }
  .dept-form-row { display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; }
  .dept-form-row textarea { resize: vertical; }
  .dept-empty { padding: 24px; text-align: center; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-office-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
        .dept-office { min-width: 0; }
        .dept-office-side { width: 340px; border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 10px; background: var(--dsw-alias-bg-secondary, #10151f); display: flex; flex-direction: column; gap: 6px; }
        .dept-office-side .dept-pre { max-height: 220px; overflow: auto; }
        .dept-office { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 16px; background: radial-gradient(circle at 50% 0%, #121a2b 0%, #0a0f18 70%); padding: 8px; }
        .dept-office svg { width: 100%; height: auto; display: block; }
        .dept-typing rect { animation: dept-type .3s steps(2) infinite; }
        .dept-typing rect:last-child { animation-delay: .15s; }
        .dept-keyboard { animation: dept-key .4s steps(2) infinite; }
        .dept-steam { animation: dept-steam 1.6s ease-in-out infinite; }
        .dept-steam.s2 { animation-delay: .5s; }
        .dept-reading { animation: dept-read 2.2s ease-in-out infinite; transform-origin: center; }
        @keyframes dept-type { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        @keyframes dept-key { 0%, 100% { fill: #1a2436; } 50% { fill: #6fb2ff; } }
        @keyframes dept-steam { 0% { opacity: 0; transform: translateY(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
        @keyframes dept-read { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        .dept-legs rect { animation: dept-walk .34s steps(2) infinite; }
        .dept-legs rect:last-child { animation-delay: .17s; }
        @keyframes dept-walk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .dept-avatar { cursor: pointer; transition: transform .9s cubic-bezier(.2,.8,.2,1); }
        .dept-avatar .dept-body { animation: dept-bob 2.6s ease-in-out infinite; transform-origin: center; }
        .dept-avatar.busy .dept-pulse { animation: dept-pulse 1.4s ease-in-out infinite; }
        .dept-avatar.busy .dept-typing circle { animation: dept-typing 1s ease-in-out infinite; }
        .dept-avatar.busy .dept-typing circle:nth-child(2) { animation-delay: .15s; }
        .dept-avatar.busy .dept-typing circle:nth-child(3) { animation-delay: .3s; }
        @keyframes dept-pulse { 0%,100% { opacity: .2; r: 16; } 50% { opacity: .7; r: 24; } }
        @keyframes dept-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes dept-typing { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
        .dept-office-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--dsw-alias-label-tertiary, #8b98ad); padding: 6px 4px 0; }
      `
      let style = document.getElementById('department-styles')
      if (!style) {
        style = document.createElement('style')
        style.id = 'department-styles'
        document.head.append(style)
      }
      // Перезаписываем всегда: иначе после обновления плагина остаётся старый CSS.
      if (style.textContent !== css) style.textContent = css
    }

    async function api(path) {
      const response = await fetch(path, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return response.json()
    }

    function badge(status) {
      const cls = status === 'pass' ? 'ok' : status === 'fail' ? 'fail' : 'wait'
      return h('span', { className: `dept-badge ${cls}` }, status)
    }

    function formatElapsed(ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}с`
    }

    function useActivity() {
      const [items, setItems] = useState([])
      const [error, setError] = useState(null)
      useEffect(() => {
        let alive = true
        async function load() {
          try {
            const payload = await api(ROUTES.activity)
            if (!alive) return
            setItems(payload.activity ?? [])
            setError(null)
          } catch (problem) {
            if (alive) setError(problem.message)
          }
        }
        load()
        const timer = setInterval(load, 3000)
        return () => { alive = false; clearInterval(timer) }
      }, [])
      return { items, error }
    }

    function ActivityBlock({ items, error }) {
      return h(
        'div',
        null,
        h('div', { className: 'dept-title' }, t('activity.title')),
        error ? h('div', { className: 'dept-sub' }, error) : null,
        items.length === 0
          ? h('div', { className: 'dept-sub' }, t('activity.none'))
          : h('div', { className: 'dept-events' }, ...items.map((entry) =>
              h('div', { key: entry.sessionId, className: 'dept-event' },
                h('span', { className: entry.busy ? 'dept-badge ok' : 'dept-badge wait' }, entry.busy ? '●' : '○'),
                h('span', null, `${entry.kind === 'менеджер' ? t('activity.manager') : t('activity.subagent')}: ${entry.lastAction}${entry.tool ? ' · ' + entry.tool : ''}`),
                h('span', { className: 'dept-sub' }, formatElapsed(entry.elapsedMs)),
              ))),
      )
    }

    /* ---------------- Офис ---------------- */

    // Шахматный порядок: соседние столы смещены по вертикали.
    // Состояние сотрудников живёт вне компонента: переключение вкладок не сбрасывает
    // координаты и начатые переходы. Позиция считается по времени.
    const officeSettled = new Map()
    const officePlans = new Map()

    const ROLE_STYLE = {
      manager: { shirt: '#2a3448', hair: '#3a2a1a' },
      coder: { shirt: '#3d7bff', hair: '#5a3a22' },
      tester: { shirt: '#3f8a4f', hair: '#2a1a10' },
      reviewer: { shirt: '#9b7bff', hair: '#4a2a10' },
      analyst: { shirt: '#c9b48c', hair: '#5a3a22' },
      artist: { shirt: '#c25a4a', hair: '#2a1a10' },
      archivist: { shirt: '#5b6a90', hair: '#6a6a6a' },
      instrumenter: { shirt: '#a8713a', hair: '#3a2a1a' },
    }
    const DESKS = [
      { key: 'coder', x: 90, y: 112, label: 'Кодер' },
      { key: 'manager', x: 220, y: 112, label: 'Руководитель' },
      { key: 'reviewer', x: 350, y: 112, label: 'Ревьюер' },
      { key: 'analyst', x: 90, y: 232, label: 'Аналитик' },
      { key: 'tester', x: 220, y: 232, label: 'Тестер' },
      { key: 'archivist', x: 350, y: 232, label: 'Архивариус' },
    ]

    function inferRole(entry) {
      if (entry.kind === 'менеджер') return 'manager'
      const tool = String(entry.tool || '')
      const args = String(entry.args || '').toLowerCase()
      if (tool === 'write' || tool === 'edit') return 'coder'
      if (tool === 'bash' && /test|check|node --test/.test(args)) return 'tester'
      if (tool === 'read' || tool === 'grep' || tool === 'glob') return 'reviewer'
      if (tool === 'dept_commit') return 'archivist'
      if (tool === 'dept_start' || tool === 'dept_stage' || tool === 'dept_amend') return 'manager'
      return 'coder'
    }

    function zoneOfPoint(point) {
      return point.x < 404 ? 'open' : 'break'
    }

    function routeTo(from, to) {
      const door = [{ x: 436, y: 159 }, { x: 404, y: 159 }, { x: 372, y: 159 }]
      if (zoneOfPoint(from) === zoneOfPoint(to)) return [to]
      const pass = zoneOfPoint(from) === 'break' ? door : [...door].reverse()
      return [...pass, to]
    }

    function routeLength(from, points) {
      let total = 0
      let previous = from
      for (const point of points) {
        total += Math.hypot(point.x - previous.x, point.y - previous.y)
        previous = point
      }
      return total
    }

    function pointAlong(from, points, ratio) {
      const total = routeLength(from, points)
      let covered = total * ratio
      let previous = from
      for (const point of points) {
        const length = Math.hypot(point.x - previous.x, point.y - previous.y)
        if (covered <= length || point === points[points.length - 1]) {
          const local = length === 0 ? 0 : Math.min(1, covered / length)
          return { x: previous.x + (point.x - previous.x) * local, y: previous.y + (point.y - previous.y) * local }
        }
        covered -= length
        previous = point
      }
      return points[points.length - 1] ?? from
    }

    function OfficeView({ items, selected, onSelect, tasks, onOpenTask, attention, party, paused, pauseReason }) {
      const assignments = React.useRef(null)
      if (!assignments.current) assignments.current = new Map()
      const roleOf = (entry) => {
        if (entry?.kind === 'менеджер') return 'manager'
        return DESKS.find((desk) => desk.key === (assignments.current.get(entry?.sessionId) ?? ''))?.key ?? 'coder'
      }
      const SPRITES = {
        manager: ['manager-1', 'manager-2', 'manager-3'],
        coder: ['coder-1', 'coder-2', 'coder-3'],
        tester: ['tester-1', 'tester-2', 'tester-3'],
        reviewer: ['reviewer-1', 'reviewer-2', 'reviewer-3'],
        analyst: ['analyst-1', 'analyst-2'],
        artist: ['artist-1', 'artist-2'],
        archivist: ['analyst-1'],
        instrumenter: ['coder-1'],
      }
      const spriteBase = typeof location !== 'undefined' && location.protocol === 'file:' ? '' : '/api/department/asset?name='
      const spriteFor = (entry) => {
        const role = roleOf(entry)
        const list = SPRITES[role] ?? SPRITES.coder
        const seed = String(entry?.sessionId ?? role).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
        return spriteBase + 'char-' + list[seed % list.length] + '.png'
      }
      const settled = React.useRef(new Map())
      const plans = React.useRef(new Map())
      const [, setFrame] = React.useState(0)
      React.useEffect(() => {
        const timer = setInterval(() => setFrame((value) => value + 1), 250)
        return () => clearInterval(timer)
      }, [])

      const byRole = new Map()
      const seats = DESKS.filter((desk) => desk.key !== 'manager')
      const taken = new Set()
      for (const entry of items) {
        let role = entry.kind === 'менеджер' ? 'manager' : assignments.current.get(entry.sessionId)
        if (entry.kind !== 'менеджер' && !role) {
          const preferred = inferRole(entry)
          const free = seats.filter((desk) => !taken.has(desk.key))
          const chosen = free.find((desk) => desk.key === preferred) ?? free[0] ?? seats[0]
          role = chosen.key
          assignments.current.set(entry.sessionId, role)
        }
        if (role !== 'manager') taken.add(role)
        if (!byRole.has(role)) byRole.set(role, entry)
      }

      const selectedEntry = items.find((entry) => entry.sessionId === selected) ?? null
      const selectedTask = selectedEntry && tasks ? tasks.find((task) => task.root === selectedEntry.cwd) : null
      const projectName = (cwd) => String(cwd ?? '').split('/').filter(Boolean).pop() ?? '—'
      const filesOf = (entry) => {
        const text = [entry?.args ?? '', ...(entry?.recent ?? []).map((event) => event.text)].join(' ')
        const matches = text.match(/[\w./-]+\.(?:js|mjs|md|json|html|css)/g) ?? []
        return [...new Set(matches.map((file) => file.replace(/^\.\//, '')))].slice(0, 8)
      }
      const chairSeats = [{ x: 446, y: 152 }, { x: 520, y: 152 }, { x: 594, y: 152 }, { x: 446, y: 198 }, { x: 520, y: 198 }, { x: 594, y: 198 }]
      const coolerSpot = { x: 570, y: 252 }
      const windowSpot = { x: 466, y: 66 }
      const loungeTargets = [...chairSeats.map((seat, index) => ({ kind: 'seat', spot: seat, index })), { kind: 'cooler', spot: coolerSpot }, { kind: 'window', spot: windowSpot }]
      const time = Date.now()

      const box = (x, y, width, height, fill, extra) => h('rect', Object.assign({ x, y, width, height, fill }, extra ?? {}))
      const wall = (x, y, width, height) => h('g', null,
        box(x, y, width, height, '#3b4666'),
        box(x, y, width, 3, '#55628a'))
      const door = (x, y, width, height) => h('g', null,
        box(x, y, width, height, '#6b5a3a'),
        box(x + 2, y + 2, width - 4, height - 4, '#8a7450'))
      const monitorOn = (x, y) => h('g', null,
        box(x - 11, y, 22, 15, '#0b1220'),
        box(x - 10, y + 1, 20, 13, '#2d6cff'),
        box(x - 8, y + 3, 7, 2, '#cfe6ff'),
        box(x - 8, y + 6, 11, 2, '#cfe6ff'),
        box(x - 2, y + 15, 4, 3, '#1a2436'))
      const monitorBack = () => h('g', null,
        box(-17, -26, 10, 14, '#2a3448'),
        box(-16, -25, 8, 12, '#1a2436'),
        box(-17, -25, 1, 10, '#8fd3ff'),
        box(-13, -12, 2, 4, '#1a2436'),
        box(-15, -8, 6, 2, '#2a3448'))
      const plant = (x, y) => h('g', null,
        box(x - 7, y, 14, 10, '#8a5a2b'),
        box(x - 7, y, 14, 3, '#a8713a'),
        box(x - 9, y - 14, 18, 14, '#3f8a4f'),
        box(x - 6, y - 18, 12, 6, '#4fa05e'),
        box(x - 3, y - 21, 6, 5, '#5cb06c'))
      const cooler = (x, y) => h('g', null,
        box(x - 8, y - 10, 16, 22, '#dfe6ee'),
        box(x - 8, y - 10, 16, 3, '#f2f6fa'),
        box(x - 6, y - 24, 12, 14, '#7fc4ff'),
        box(x - 6, y - 24, 12, 3, '#a8d8ff'),
        box(x - 2, y - 4, 4, 3, '#9aa7b8'))
      const chair = (x, y) => h('g', null,
        box(x - 9, y - 4, 18, 6, '#4a3a26'),
        box(x - 9, y - 4, 18, 2, '#5d4a30'),
        box(x - 9, y - 16, 18, 4, '#4a3a26'),
        box(x + 7, y - 16, 3, 12, '#3a2d1d'))
      const deskSprite = (desk) => h('g', { key: 'desk-' + desk.key },
        box(desk.x - 34, desk.y - 6, 68, 16, '#8a5a2b'),
        box(desk.x - 34, desk.y - 6, 68, 4, '#a8713a'),
        box(desk.x - 30, desk.y + 10, 4, 14, '#6b4420'),
        box(desk.x + 26, desk.y + 10, 4, 14, '#6b4420'),
        box(desk.x + 16, desk.y - 14, 5, 5, '#efe9d6'),
        box(desk.x + 16, desk.y - 14, 5, 2, '#c25a4a'),
        box(desk.x - 26, desk.y - 13, 9, 6, '#efe9d6'))

      const personAtDesk = (entry, desk) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: entry.sessionId,
          className: 'dept-avatar busy',
          transform: 'translate(' + desk.x + ',' + desk.y + ')',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          // сотрудник за столом: ноги скрыты, видно голову и туловище
          h('defs', null,
            h('clipPath', { id: 'work-clip-' + entry.sessionId },
              h('rect', { x: -12, y: -48, width: 24, height: 42 }))),
          h('g', { clipPath: 'url(#work-clip-' + entry.sessionId + ')' },
            h('image', { href: spriteFor(entry), x: -12, y: -48, width: 24, height: 48 })),
          // монитор тыльной стороной к нам, экран светится слева
          h('g', { className: 'dept-monitor-back' }, monitorBack()),
          // клавиатура на столе
          box(-4, -10, 10, 3, '#1a2436'),
          box(-3, -9, 8, 1, '#3a4560'),
          // руки — светлые пятна, скользят по клавиатуре
          h('g', { className: 'dept-hands h1' },
            h('ellipse', { cx: -2, cy: -8, rx: 2.5, ry: 1.8, fill: '#ffe2b0' })),
          h('g', { className: 'dept-hands h2' },
            h('ellipse', { cx: 3, cy: -8, rx: 2.5, ry: 1.8, fill: '#ffe2b0' })))
      }

      const seatedPerson = (entry, desk, index) => {
        const isSelected = selected === entry.sessionId
        const reading = (index % 2) === 0
        return h('g', {
          key: 'seat-' + entry.sessionId,
          className: 'dept-avatar idle',
          transform: 'translate(' + desk.x + ',' + desk.y + ')',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          h('defs', null,
            h('clipPath', { id: 'seat-clip-' + entry.sessionId },
              h('rect', { x: -12, y: -48, width: 24, height: 34 }))),
          h('g', { clipPath: 'url(#seat-clip-' + entry.sessionId + ')' },
            h('image', { href: spriteFor(entry), x: -12, y: -48, width: 24, height: 48 })),
          reading ? h('g', { className: 'dept-reading' },
              box(-9, -24, 18, 12, '#ece6d0'),
              box(-7, -23, 6, 1, '#8e8873'),
              box(-7, -21, 14, 1, '#8e8873'),
              box(-7, -19, 11, 1, '#8e8873'))
            : h('g', { className: 'dept-coffee' },
                box(6, -24, 6, 9, '#f2f2f2'),
                box(7, -23, 4, 2, '#7a4a24'),
                h('rect', { className: 'dept-steam s1', x: 8, y: -29, width: 2, height: 3, fill: '#d8e6ff' }),
                h('rect', { className: 'dept-steam s2', x: 10, y: -31, width: 2, height: 3, fill: '#d8e6ff' })),
          h('text', { x: 0, y: 18, fill: '#4a3a26', fontSize: 8, textAnchor: 'middle' },
            entry.kind === 'менеджер' ? 'руководитель' : (DESKS.find((desk) => desk.key === (assignments.current.get(entry.sessionId) ?? 'coder'))?.label ?? 'агент')))
      }

      const standingPerson = (entry, spot, looking) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: 'stand-' + entry.sessionId,
          className: 'dept-avatar',
          style: {
            transform: 'translate(' + spot.x + 'px,' + spot.y + 'px)',
            transition: 'transform 1.2s linear',
            filter: isSelected ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined,
          },
          onClick: () => onSelect(entry.sessionId),
        },
          h('ellipse', { cx: 0, cy: 1, rx: 9, ry: 3, fill: '#00000022' }),
          h('image', { href: spriteFor(entry), x: -12, y: -48, width: 24, height: 48 }))
      }

      const walkingPerson = (entry, spot) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: 'walk-' + entry.sessionId,
          className: 'dept-avatar walking',
          style: {
            transform: 'translate(' + spot.x + 'px,' + spot.y + 'px)',
            transition: 'transform .34s linear',
            filter: isSelected ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined,
          },
          onClick: () => onSelect(entry.sessionId),
        },
          h('ellipse', { cx: 0, cy: 1, rx: 9, ry: 3, fill: '#00000022' }),
          h('image', { href: spriteFor(entry), x: -12, y: -48, width: 24, height: 48 }))
      }

      const actors = []
      for (const [role, entry] of byRole.entries()) {
        const id = entry.sessionId
        const desk = DESKS.find((candidate) => candidate.key === role)
        const target = entry.busy
          ? { kind: 'desk', spot: { x: desk.x, y: desk.y } }
          : (() => {
              const index = [...byRole.keys()].indexOf(role)
              const pick = loungeTargets[(id.length + Math.floor(time / 14000) + index) % loungeTargets.length]
              return { kind: pick.kind, spot: pick.spot, index: pick.index ?? index }
            })()
        if (!officeSettled.has(id)) officeSettled.set(id, { x: chairSeats[actors.length % chairSeats.length].x, y: chairSeats[actors.length % chairSeats.length].y, mode: 'seat', index: actors.length })
        const current = officeSettled.get(id)
        const plan = officePlans.get(id)
        if (plan) {
          const ratio = Math.min(1, (time - plan.start) / plan.duration)
          const position = pointAlong(plan.from, plan.points, ratio)
          if (ratio >= 1) {
            officePlans.delete(id)
            officeSettled.set(id, { x: plan.target.spot.x, y: plan.target.spot.y, mode: plan.target.kind, index: plan.target.index ?? current.index })
            actors.push({ entry, mode: plan.target.kind, spot: plan.target.spot, index: plan.target.index ?? current.index, desk })
          } else {
            actors.push({ entry, mode: 'walk', spot: position, index: current.index, desk })
          }
        } else {
          const moved = current.mode !== target.kind || Math.hypot(current.x - target.spot.x, current.y - target.spot.y) > 2
          if (moved) {
            const points = routeTo({ x: current.x, y: current.y }, target.spot)
            const duration = Math.min(11000, Math.max(3000, routeLength({ x: current.x, y: current.y }, points) * 48))
            officePlans.set(id, { from: { x: current.x, y: current.y }, points, start: time, duration, target })
            actors.push({ entry, mode: 'walk', spot: current, index: current.index, desk })
          } else {
            actors.push({ entry, mode: current.mode, spot: { x: current.x, y: current.y }, index: current.index, desk })
          }
        }
      }

      if (paused) {
        // На паузе весь отдел отдыхает: никто не работает и не ходит.
        actors.forEach((actor, index) => {
          actor.mode = 'seat'
          actor.spot = chairSeats[index % chairSeats.length]
        })
      }

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-row' },
          h('div', { className: 'dept-title' }, t('office.title')),
          paused ? h('span', { className: 'dept-badge wait' }, t('office.paused') + (pauseReason ? ': ' + pauseReason : '')) : null,
          h('div', { className: 'dept-sub' }, items.length ? t('office.staff', { n: items.length, m: DESKS.length }) : t('office.empty'))),
        party
          ? h('div', { className: 'dept-block', style: { borderColor: '#7fdc9a', textAlign: 'center' } },
              h('div', { className: 'dept-title' }, t('party.title')),
              h('div', { className: 'dept-sub' }, t('party.text')))
          : null,
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap' } },
          h('div', { className: 'dept-office', style: { flex: '1 1 auto', minWidth: 0 } },
            h('svg', { viewBox: '0 0 640 400', role: 'img', 'aria-label': t('office.fullTitle'), style: { imageRendering: 'pixelated' } },
              h('defs', null,
                h('pattern', { id: 'dept-floor', width: 16, height: 16, patternUnits: 'userSpaceOnUse' },
                  box(0, 0, 16, 16, '#c9b48c'),
                  box(0, 0, 16, 8, '#d3bf97'),
                  box(8, 8, 8, 8, '#d3bf97'))),
              box(0, 0, 640, 400, '#2a3350'),
              box(12, 12, 616, 376, 'url(#dept-floor)'),
              wall(12, 4, 616, 10), wall(12, 386, 616, 10), wall(4, 4, 10, 392), wall(626, 4, 10, 392),
              ...Array.from({ length: 5 }, (_, index) => box(40 + index * 110, 6, 44, 7, '#8fd3ff')),
              wall(404, 14, 8, 128), door(404, 142, 8, 34), wall(404, 176, 8, 116),
              wall(412, 292, 216, 8), wall(12, 292, 172, 8), door(184, 292, 40, 8), door(470, 292, 40, 8), wall(510, 292, 118, 8),
              h('text', { x: 22, y: 34, fill: '#8a96ad', fontSize: 9 }, 'OPEN SPACE'),
              h('text', { x: 420, y: 34, fill: '#8a96ad', fontSize: 9 }, t('office.lounge')),
              plant(26, 268), plant(386, 24), plant(26, 24), plant(618, 276),
              cooler(366, 58),
              // диван вдоль стены комнаты отдыха
              box(420, 44, 200, 10, '#5d4a30'),
              box(420, 44, 200, 3, '#6f5a3a'),
              box(426, 54, 188, 14, '#7a6244'),
              box(426, 54, 188, 2, '#8a7050'),
              // кофейный столик
              box(470, 112, 100, 28, '#8a5a2b'),
              box(470, 112, 100, 4, '#a8713a'),
              box(474, 140, 4, 12, '#6b4420'),
              box(562, 140, 4, 12, '#6b4420'),
              // кофемашина
              box(590, 58, 26, 32, '#dfe6ee'),
              box(590, 58, 26, 3, '#f2f6fa'),
              box(592, 44, 22, 14, '#3d7bff'),
              box(596, 74, 14, 4, '#9aa7b8'),
              // кулер
              cooler(596, 250),
              chair(446, 152), chair(520, 152), chair(594, 152), chair(520, 198),
              ...DESKS.map((desk) => deskSprite(desk)),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                if (!entry) return h('g', { transform: 'translate(' + desk.x + ',' + desk.y + ')' }, monitorBack())
                const actor = actors.find((item) => item.entry.sessionId === entry.sessionId)
                return actor && actor.mode === 'desk' ? personAtDesk(entry, desk) : null
              }),
              ...actors.map((actor) => {
                if (actor.mode === 'desk') return null
                if (actor.mode === 'walk') return walkingPerson(actor.entry, actor.spot)
                return actor.mode === 'seat' ? seatedPerson(actor.entry, actor.spot, actor.index) : standingPerson(actor.entry, actor.spot, actor.mode)
              }),
              (attention ?? 0) > 0
                ? (() => {
                    const managerDesk = DESKS.find((desk) => desk.key === 'manager') ?? { x: 220, y: 112 }
                    return h('g', { key: 'attention' },
                      h('rect', { x: managerDesk.x - 36, y: managerDesk.y - 66, width: 72, height: 22, rx: 11, fill: '#d8c07a', stroke: '#1b2434' }),
                      h('text', { x: managerDesk.x, y: managerDesk.y - 51, fill: '#1b2434', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' }, '✍ ' + attention))
                  })()
                : null,
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                const actor = entry ? actors.find((item) => item.entry.sessionId === entry.sessionId) : null
                const busy = Boolean(entry?.busy)
                const atDesk = actor?.mode === 'desk'
                return h('text', { key: 'label-' + desk.key, x: desk.x, y: desk.y + 48, fill: atDesk ? '#9fd0ff' : '#6f7f98', fontSize: 8, textAnchor: 'middle' },
                  roleLabel(desk.key) + (paused ? ' · ' + t('office.status.paused') : entry ? (atDesk ? ' · ' + t('office.status.working') : busy ? ' · ' + t('office.status.walking') : ' · ' + t('office.status.break')) : ' · ' + t('office.status.free')))
              }),
            ),
          ),
          h('div', { className: 'dept-office-side', style: { flex: '0 0 340px', width: '340px' } },
            selectedEntry
              ? [
                  h('div', { className: 'dept-title' }, roleLabel(selectedEntry.kind === 'менеджер' ? 'manager' : (assignments.current.get(selectedEntry.sessionId) ?? inferRole(selectedEntry)))),
                  h('div', { className: 'dept-row' },
                    h('span', { className: (selectedEntry.busy && !paused) ? 'dept-badge ok' : 'dept-badge wait' }, paused ? t('status.pausedBadge') : selectedEntry.busy ? t('status.workingBadge') : t('status.breakBadge')),
                    h('span', { className: 'dept-sub' }, formatElapsed(selectedEntry.elapsedMs))),
                  h('div', { className: 'dept-sub' }, t('side.project') + ' ' + projectName(selectedEntry.cwd) + (selectedTask ? ' · ' + selectedTask.taskId + ' · ' + selectedTask.stage : '')),
                  h('div', { className: 'dept-sub' }, t('side.now')),
                  h('div', { className: 'dept-pre' }, `${selectedEntry.lastAction}${selectedEntry.tool ? '\n' + selectedEntry.tool : ''}${selectedEntry.args ? '\n' + selectedEntry.args : ''}`),
                  (filesOf(selectedEntry).length ? h('div', { className: 'dept-sub' }, t('side.files') + ' ' + filesOf(selectedEntry).join(', ')) : null),
                  h('div', { className: 'dept-sub' }, t('side.recent')),
                  (selectedEntry.recent ?? []).length === 0
                    ? h('div', { className: 'dept-sub' }, t('none.yet'))
                    : h('div', { className: 'dept-events' }, ...selectedEntry.recent.map((event, index) =>
                        h('div', { key: index, className: 'dept-event' },
                          h('time', null, String(new Date(event.ts).toLocaleTimeString('ru-RU'))),
                          h('span', null, event.text)))),
                  selectedTask ? h('button', { className: 'dept-btn', onClick: () => onOpenTask(selectedEntry.cwd) }, t('side.openTask')) : null,
                ]
              : h('div', { className: 'dept-sub' }, t('side.choose')),
          ),
        ),
      )
    }

    /* ---------------- Доска ---------------- */

    function TaskCard({ task, onOpen }) {
      return h(
        'div',
        { className: 'dept-card', onClick: () => onOpen(task), style: task.memos ? { borderColor: '#d8c07a' } : undefined },
        h('div', { className: 'dept-row' }, h('strong', null, task.title), h('span', { className: 'dept-sub' }, task.taskId)),
        h('div', { className: 'dept-row' }, h('span', { className: 'dept-badge' }, stageLabel(task.stage)), task.paused ? h('span', { className: 'dept-badge wait' }, t('badge.paused')) : null, h('span', { className: 'dept-sub' }, `${t('branch.prefix')} ${task.branch}`)),
        h('div', { className: 'dept-bar' }, h('i', { style: { width: `${task.progress}%` } })),
        h('div', { className: 'dept-row' }, h('span', { className: 'dept-sub' }, `${task.progress}%`), badge(`tests:${task.tests}`), badge(`review:${task.review}`),
          task.memos ? h('span', { className: 'dept-badge wait' }, '✍ ' + task.memos) : null),
        task.lastEvent ? h('div', { className: 'dept-sub' }, `${eventLabel(task.lastEvent.action)} · ${task.lastEvent.detail ?? ''}`) : null,
      )
    }

    /* ---------------- Документы (почта отдела) ---------------- */

    function DocumentsView({ root, taskId, memos }) {
      const [documents, setDocuments] = useState([])
      const [query, setQuery] = useState('')
      const [type, setType] = useState('all')
      const [selected, setSelected] = useState(null)
      const [content, setContent] = useState('')
      const [error, setError] = useState(null)

      useEffect(() => {
        api(ROUTES.documents + '?root=' + encodeURIComponent(root) + '&taskId=' + encodeURIComponent(taskId))
          .then((payload) => { setDocuments(payload.documents ?? []); setError(null) })
          .catch((problem) => setError(problem.message))
      }, [root, taskId])

      useEffect(() => {
        if (!selected) return
        setContent(t('doc.loading'))
        api(ROUTES.document + '?root=' + encodeURIComponent(root) + '&taskId=' + encodeURIComponent(taskId) + '&path=' + encodeURIComponent(selected))
          .then((payload) => setContent(payload.content ?? ''))
          .catch((problem) => setContent(t('doc.error') + problem.message))
      }, [selected, root, taskId])

      const MAIN_DOCS = ['spec.md', 'concept.md', 'design.md', 'plan.md']
      const mainRank = (item) => {
        const index = MAIN_DOCS.indexOf(String(item.path).split('/').pop())
        return index === -1 ? 9 : index
      }
      const types = ['all', ...new Set(documents.map((item) => item.type))]
      const memoPaths = memos ?? []
      const isMemo = (item) => item.type === 'служебная записка' && memoPaths.some((path) => String(path).endsWith(item.path))
      const filtered = documents
        .filter((item) => {
          if (type !== 'all' && item.type !== type) return false
          if (!query.trim()) return true
          const haystack = (item.title + ' ' + item.path + ' ' + item.type).toLowerCase()
          return haystack.includes(query.trim().toLowerCase())
        })
        .sort((a, b) => mainRank(a) - mainRank(b) || Number(isMemo(b)) - Number(isMemo(a)) || String(b.ts).localeCompare(String(a.ts)))

      return h('div', { style: { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '12px', alignItems: 'start' } },
        h('div', { className: 'dept-block', style: { maxHeight: '560px', overflow: 'auto' } },
          h('div', { className: 'dept-block-title' }, t('block.documents')),
          h('input', { className: 'dept-input', placeholder: t('doc.search'), value: query, onChange: (event) => setQuery(event.target.value) }),
          h('select', { className: 'dept-input', value: type, onChange: (event) => setType(event.target.value) },
            ...types.map((item) => h('option', { key: item, value: item }, item === 'all' ? t('doc.allTypes') : docLabel(item)))),
          error ? h('div', { className: 'dept-badge fail' }, error) : null,
          filtered.length === 0
            ? h('div', { className: 'dept-sub' }, t('doc.notFound'))
            : h('div', { className: 'dept-events' }, ...filtered.map((item) =>
                h('div', {
                  key: item.path,
                  className: 'dept-kv',
                  style: { cursor: 'pointer', background: selected === item.path ? '#1b2438' : undefined, alignItems: 'flex-start', flexDirection: 'column', gap: '2px' },
                  onClick: () => setSelected(item.path),
                },
                  h('span', null, item.title || item.path),
                  h('span', { className: 'dept-sub' }, docLabel(item.type) + ' · ' + String(item.ts).replace('T', ' ').slice(0, 16)))))),
        h('div', { className: 'dept-block', style: { maxHeight: '560px', overflow: 'auto' } },
          selected
            ? h('div', null,
                h('div', { className: 'dept-block-title' }, selected),
                h(Markdown, { text: content }))
            : h('div', { className: 'dept-sub' }, t('doc.choose'))))
    }

    function TaskDetail({ detail, onBack, onReload, onEditor, onDeleted }) {
      const docs = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md', 'backlog.md']
      const [tab, setTab] = useState('overview')
      const [name, setName] = useState(() => localStorage.getItem('dept-approver') || 'vladimir')
      const [budget, setBudget] = useState(detail.budget ?? null)
      const [drafts, setDrafts] = useState({})
      const [remarks, setRemarks] = useState({})
      const [eventId, setEventId] = useState(null)
      const [corr, setCorr] = useState({ doc: 'spec', subject: '', text: '' })
      const [roles, setRoles] = useState([])
      const [prices, setPrices] = useState({ limit: '', input: '', output: '', cacheRead: '', cacheWrite: '', rate: '' })
      const [savingBudget, setSavingBudget] = useState(false)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState(null)

      useEffect(() => { localStorage.setItem('dept-approver', name) }, [name])
      useEffect(() => {
        api(`${ROUTES.budget}?root=${encodeURIComponent(detail.root)}&taskId=${encodeURIComponent(detail.taskId)}`)
          .then((payload) => setBudget(payload.budget))
          .catch(() => {})
      }, [detail.taskId, detail.events?.length])
      useEffect(() => {
        api(`${ROUTES.roles}?root=${encodeURIComponent(detail.root)}&taskId=${encodeURIComponent(detail.taskId)}`)
          .then((payload) => setRoles(payload.roles ?? []))
          .catch(() => {})
      }, [detail.taskId])

      useEffect(() => {
        if (!budget) return
        setPrices({
          limit: String(budget.limitTokens ?? ''),
          input: String(budget.prices?.inputTokens ?? 0.27),
          output: String(budget.prices?.outputTokens ?? 1.1),
          cacheRead: String(budget.prices?.cacheReadTokens ?? 0.07),
          cacheWrite: String(budget.prices?.cacheWriteTokens ?? 0.27),
          rate: String(budget.rateRUB ?? 90),
        })
      }, [budget?.limitTokens, budget?.rateRUB])

      async function savePrices() {
        setSavingBudget(true)
        try {
          const response = await fetch(ROUTES.budget, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              root: detail.root,
              taskId: detail.taskId,
              limitTokens: Number(prices.limit) || 0,
              rateRUB: Number(prices.rate) || 0,
              prices: {
                inputTokens: Number(prices.input) || 0,
                outputTokens: Number(prices.output) || 0,
                cacheReadTokens: Number(prices.cacheRead) || 0,
                cacheWriteTokens: Number(prices.cacheWrite) || 0,
              },
            }),
          })
          const data = await response.json().catch(() => ({}))
          setMessage(response.ok ? t('msg.pricesSaved') : (data.error || t('msg.error')))
        } finally {
          setSavingBudget(false)
        }
      }

      async function reopenTaskAction() {
        await post(ROUTES.reopen, { root: detail.root, taskId: detail.taskId, reason: 'Доработки по замечаниям человека' })
      }

      async function startDepartment() {
        try {
          const response = await fetch(ROUTES.taskStart, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: detail.root, taskId: detail.taskId, by: name }) })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || response.statusText)
          setMessage(data.sessionId ? 'Руководитель запущен в чате ' + data.sessionId : 'Промт отправлен в чат проекта')
        } catch (problem) {
          setMessage(problem.message)
        }
      }

      async function deleteTask() {
        if (!window.confirm('Удалить задачу ' + detail.taskId + '? Папка будет перемещена в docs/department/.trash.')) return
        try {
          const response = await fetch(`${ROUTES.taskDelete}?root=${encodeURIComponent(detail.root)}&taskId=${encodeURIComponent(detail.taskId)}&by=${encodeURIComponent(name)}`, { method: 'DELETE' })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || response.statusText)
          if (onDeleted) onDeleted()
        } catch (problem) {
          setMessage(problem.message)
        }
      }

      async function post(path, body) {
        setBusy(true)
        setMessage(null)
        try {
          const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, by: name }) })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || response.statusText)
          setMessage(t('msg.done'))
          if (onReload) onReload()
          return data
        } catch (problem) {
          setMessage(problem.message)
          return null
        } finally {
          setBusy(false)
        }
      }

      const approved = new Set(detail.approvals ?? [])
      const openQuestions = (detail.questions ?? []).filter((question) => question.status === 'open')
      const answeredQuestions = (detail.questions ?? []).filter((question) => question.status !== 'open')
      const usage = budget?.usage
      const tokens = usage ? usage.inputTokens + usage.outputTokens : budget?.usedTokens ?? 0
      const costRub = budget?.costUSD && budget?.rateRUB ? budget.costUSD * budget.rateRUB : null

      const kv = (label, value) => h('div', { className: 'dept-kv' }, h('span', null, label), h('span', null, String(value)))
      const tabs = [
        ['overview', t('tabs.overview')],
        ['docs', t('tabs.docs')],
        ['questions', `${t('tabs.questions')}${openQuestions.length ? ' (' + openQuestions.length + ')' : ''}`],
        ['audit', t('tabs.audit')],
        ['events', t('tabs.events')],
        ['correction', t('tabs.correction')],
        ['design', t('tabs.design')],
        ['roles', t('tabs.roles')],
        ['billing', t('tabs.billing')],
        ['git', t('tabs.git')],
      ]

      const content = (() => {
        if (tab === 'docs') {
          return h(DocumentsView, { root: detail.root, taskId: detail.taskId, memos: detail.memoPaths ?? [] })
        }
        if (tab === 'questions') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.openQuestions')),
            openQuestions.length === 0
              ? h('div', { className: 'dept-sub' }, t('questions.empty'))
              : h('div', { className: 'dept-events' }, ...openQuestions.map((question) =>
                  h('div', { key: question.id, className: 'dept-block', style: { gap: '6px' } },
                    h('div', { className: 'dept-row' },
                      h('span', { className: 'dept-badge wait' }, t('questions.waiting')),
                      h('span', { className: 'dept-sub' }, question.id)),
                    h('div', null, question.text),
                    question.recommended ? h('div', { className: 'dept-sub' }, `отдел выбрал: ${question.recommended}`) : null,
                    h('div', { className: 'dept-row' },
                      h('input', {
                        className: 'dept-input',
                        placeholder: question.options?.length ? question.options.join(' / ') : t('questions.answer'),
                        value: drafts[question.id] ?? '',
                        onChange: (event) => setDrafts({ ...drafts, [question.id]: event.target.value }),
                      }),
                      h('button', {
                        className: 'dept-btn',
                        disabled: busy || !(drafts[question.id] ?? '').trim(),
                        onClick: () => post(ROUTES.answer, { root: detail.root, taskId: detail.taskId, questionId: question.id, answer: (drafts[question.id] ?? '').trim() }),
                      }, t('questions.answerBtn')))))),
            detail.paused ? h('div', { className: 'dept-row', style: { marginTop: '4px' } }, h('span', { className: 'dept-badge wait' }, t('badge.onPause') + (detail.pauseReason ? ': ' + detail.pauseReason : ''))) : null,
            (detail.questions ?? []).filter((question) => question.status === 'memo').length > 0
              ? h('div', null,
                  h('div', { className: 'dept-block-title' }, t('questions.memos')),
                  ...(detail.questions ?? []).filter((question) => question.status === 'memo').map((question) =>
                    h('div', { key: question.id, className: 'dept-block', style: { gap: '6px' } },
                      h('div', { className: 'dept-row' },
                        h('span', { className: 'dept-badge wait' }, t('questions.memo')),
                        h('span', { className: 'dept-sub' }, question.id)),
                      h('div', null, question.text),
                      question.decision ? h('div', { className: 'dept-sub' }, t('questions.decision') + question.decision) : null,
                      question.memoPath ? h('div', { className: 'dept-sub' }, t('questions.file') + question.memoPath) : null,
                      h('input', { className: 'dept-input', placeholder: t('questions.remarks'), value: remarks[question.id] ?? '', onChange: (event) => setRemarks({ ...remarks, [question.id]: event.target.value }) }),
                      h('div', { className: 'dept-row' },
                        h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.review, { root: detail.root, taskId: detail.taskId, questionId: question.id, verdict: 'approve' }) }, t('questions.approve')),
                        h('button', { className: 'dept-btn', disabled: busy || !(remarks[question.id] ?? '').trim(), onClick: () => post(ROUTES.review, { root: detail.root, taskId: detail.taskId, questionId: question.id, verdict: 'changes', remarks: (remarks[question.id] ?? '').trim() }) }, t('questions.changes'))))))
              : null,
            answeredQuestions.length > 0
              ? h('div', null,
                  h('div', { className: 'dept-block-title' }, t('questions.answered')),
                  h('div', { className: 'dept-events' }, ...answeredQuestions.map((question) =>
                    h('div', { key: question.id, className: 'dept-event' },
                      h('span', { className: 'dept-badge ok' }, t('questions.answeredBadge')),
                      h('span', null, question.answer),
                      h('span', { className: 'dept-sub' }, question.answeredBy)))))
              : null)
        }
        if (tab === 'audit') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.audit')),
            ...(detail.audit?.checks ?? []).map((check) =>
              h('div', { key: check.id, className: 'dept-kv' },
                h('span', null, check.id + (check.detail ? ' · ' + auditDetail(check.detail) : '')),
                h('span', { className: check.ok ? 'dept-badge ok' : 'dept-badge fail' }, check.ok ? 'OK' : 'FAIL'))),
            h('div', { className: 'dept-sub' }, detail.audit?.ok ? t('audit.pass') : t('audit.fail')))
        }
        if (tab === 'events') {
          const selectedEvent = (detail.events ?? []).find((event) => event.id === eventId) ?? null
          return h('div', { style: { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '12px', alignItems: 'start' } },
            h('div', { className: 'dept-block', style: { maxHeight: '520px', overflow: 'auto' } },
              h('div', { className: 'dept-block-title' }, t('block.events')),
              ...(detail.events ?? []).map((event) =>
                h('div', {
                  key: event.id,
                  className: 'dept-kv',
                  style: { cursor: 'pointer', background: eventId === event.id ? '#1b2438' : undefined, flexDirection: 'column', alignItems: 'flex-start', gap: '2px' },
                  onClick: () => setEventId(event.id),
                },
                  h('span', null, String(event.ts).replace('T', ' ').slice(5, 19)),
                  h('span', { className: 'dept-sub' }, `${actorLabel(event.actor)}: ${eventLabel(event.action)}`)))),
            h('div', { className: 'dept-block' },
              selectedEvent
                ? h('div', null,
                    h('div', { className: 'dept-block-title' }, eventLabel(selectedEvent.action)),
                    h('div', { className: 'dept-kv' }, h('span', null, t('event.time')), h('span', null, String(selectedEvent.ts).replace('T', ' ').slice(0, 19))),
                    h('div', { className: 'dept-kv' }, h('span', null, t('event.author')), h('span', null, selectedEvent.actor)),
                    h('div', { className: 'dept-sub' }, selectedEvent.detail ?? t('event.noDetails')))
                : h('div', { className: 'dept-sub' }, t('event.choose'))))
        }
        if (tab === 'correction') {
          const corrections = detail.corrections ?? []
          return h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '12px', alignItems: 'start' } },
            h('div', { className: 'dept-block' },
              h('div', { className: 'dept-block-title' }, t('block.newCorrection')),
              h('div', { className: 'dept-sub' }, t('correction.hint')),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('field.doc')),
                h('select', { className: 'dept-input', value: corr.doc, onChange: (event) => setCorr({ ...corr, doc: event.target.value }) },
                  h('option', { value: 'concept' }, t('correction.concept')),
                  h('option', { value: 'spec' }, t('correction.spec')),
                  h('option', { value: 'plan' }, t('correction.plan')),
                  h('option', { value: 'code' }, t('correction.code')),
                  h('option', { value: 'data' }, t('correction.data')),
                  h('option', { value: 'interface' }, t('correction.interface')))),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('field.subject')),
                h('input', { className: 'dept-input', value: corr.subject, onChange: (event) => setCorr({ ...corr, subject: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('field.text')),
                h('textarea', { className: 'dept-input', rows: 8, value: corr.text, onChange: (event) => setCorr({ ...corr, text: event.target.value }) })),
              h('div', { className: 'dept-row' },
                h('button', {
                  className: 'dept-btn',
                  disabled: busy || !corr.text.trim(),
                  onClick: async () => {
                    const result = await post(ROUTES.correction, { root: detail.root, taskId: detail.taskId, doc: corr.doc, subject: corr.subject.trim(), text: corr.text.trim() })
                    if (result) setCorr({ doc: corr.doc, subject: '', text: '' })
                  },
                }, t('btn.sendCorrection')),
                h('span', { className: 'dept-sub' }, t('correction.toManager')))),
            h('div', { className: 'dept-block', style: { maxHeight: '560px', overflow: 'auto' } },
              h('div', { className: 'dept-block-title' }, t('block.correctionHistory')),
              corrections.length === 0
                ? h('div', { className: 'dept-sub' }, t('none.yet'))
                : h('div', { className: 'dept-events' }, ...corrections.map((item) =>
                    h('div', { key: item.id, className: 'dept-block', style: { gap: '4px' } },
                      h('div', { className: 'dept-row' },
                        h('span', { className: 'dept-badge ' + (item.status === 'done' ? 'ok' : item.status === 'in_progress' ? 'wait' : '') }, item.status),
                        h('span', { className: 'dept-sub' }, item.id + ' · ' + item.doc)),
                      h('div', null, item.subject || item.text.slice(0, 80)),
                      h('div', { className: 'dept-sub' }, String(item.ts).replace('T', ' ').slice(0, 16) + (item.summary ? ' · ' + item.summary : '')))))))
        }
        if (tab === 'design') {
          return h(DesignTab, { root: detail.root, taskId: detail.taskId })
        }
        if (tab === 'roles') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.roles')),
            h('div', { className: 'dept-sub' }, t('roles.hint')),
            ...roles.map((role) =>
              h('div', { key: role.name, className: 'dept-kv', style: { alignItems: 'center', gap: '6px' } },
                h('input', {
                  type: 'checkbox',
                  checked: role.enabled !== false,
                  disabled: role.core,
                  title: role.core ? t('roles.core') : t('roles.toggle'),
                  onChange: async (event) => {
                    const response = await fetch(ROUTES.roles, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning, enabled: event.target.checked }),
                    })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage(event.target.checked ? 'Роль включена' : 'Роль выключена') } else { setMessage(data.error || 'ошибка') }
                  },
                }),
                h('span', { style: { minWidth: '120px' } }, role.title + (role.core ? ' · основная' : '')),
                h('input', {
                  type: 'number', min: 1, max: 10,
                  className: 'dept-input', style: { width: '64px', minWidth: '64px' },
                  title: t('roles.instances'),
                  value: role.maxInstances ?? 1,
                  onChange: async (event) => {
                    const value = Number(event.target.value)
                    const response = await fetch(ROUTES.roles, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning, enabled: role.enabled, maxInstances: value }),
                    })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage(t('roles.saved')) } else { setMessage(data.error || 'ошибка') }
                  },
                }),
                h('input', {
                  className: 'dept-input',
                  placeholder: 'model (default)',
                  value: role.model ?? '',
                  onChange: (event) => setRoles(roles.map((item) => item.name === role.name ? { ...item, model: event.target.value } : item)),
                }),
                h('select', {
                  className: 'dept-input',
                  value: role.reasoning ?? '',
                  onChange: (event) => setRoles(roles.map((item) => item.name === role.name ? { ...item, reasoning: event.target.value } : item)),
                },
                  h('option', { value: '' }, 'default'),
                  h('option', { value: 'low' }, 'low'),
                  h('option', { value: 'medium' }, 'medium'),
                  h('option', { value: 'high' }, 'high')),
                h('button', {
                  className: 'dept-btn',
                  disabled: busy,
                  onClick: async () => {
                    const response = await fetch(ROUTES.roles, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning }) })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage(t('roles.saved')) } else { setMessage(data.error || 'ошибка') }
                  },
                }, t('btn.save')))))
        }
        if (tab === 'billing') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.billing')),
            h('div', { className: 'dept-sub' }, t('billing.hint')),
            h('div', { className: 'dept-kv' }, h('span', null, t('billing.live')), h('span', null, `${((budget?.usage?.inputTokens ?? 0) + (budget?.usage?.outputTokens ?? 0)).toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')} т.`)),
            h('div', { className: 'dept-kv' }, h('span', null, t('billing.total')), h('span', null, `${(budget?.history ?? []).reduce((sum, item) => sum + Number(item.tokens ?? 0), 0).toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')} т.`)),
            h('div', { className: 'dept-kv' }, h('span', null, t('billing.totalCost')), h('span', null, `$${(budget?.history ?? []).reduce((sum, item) => sum + Number(item.costUSD ?? 0), 0).toFixed(3)}`)),
            h('div', { className: 'dept-kv' }, h('span', null, t('billing.snapshot')), h('span', null, `${(budget?.usedTokens ?? 0).toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')} т.`)),
            budget?.humanSet ? h('div', { className: 'dept-badge ok' }, t('billing.humanSet')) : null,
            h('div', { className: 'dept-row' },
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.limit')),
                h('input', { className: 'dept-input', value: prices.limit, onChange: (event) => setPrices({ ...prices, limit: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.input')),
                h('input', { className: 'dept-input', value: prices.input, onChange: (event) => setPrices({ ...prices, input: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.output')),
                h('input', { className: 'dept-input', value: prices.output, onChange: (event) => setPrices({ ...prices, output: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.cacheRead')),
                h('input', { className: 'dept-input', value: prices.cacheRead, onChange: (event) => setPrices({ ...prices, cacheRead: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.cacheWrite')),
                h('input', { className: 'dept-input', value: prices.cacheWrite, onChange: (event) => setPrices({ ...prices, cacheWrite: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, t('billing.rate')),
                h('input', { className: 'dept-input', value: prices.rate, onChange: (event) => setPrices({ ...prices, rate: event.target.value }) }))),
            h('div', { className: 'dept-row' },
              h('button', { className: 'dept-btn', disabled: savingBudget, onClick: savePrices }, t('btn.savePrices')),
              h('span', { className: 'dept-sub' }, message ?? '')),
            (budget?.history ?? []).length > 0
              ? h('div', null,
                  h('div', { className: 'dept-block-title' }, t('block.byStages')),
                  ...(budget.history ?? []).map((item, index) =>
                    h('div', { key: index, className: 'dept-kv' },
                      h('span', null, t('stageNo') + ' ' + item.stage),
                      h('span', null, item.tokens.toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU') + t('unit.tokens') + Number(item.costUSD).toFixed(2)))))
              : null)
        }
        if (tab === 'git') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.commits')),
            h('div', { className: 'dept-pre' }, (detail.recentCommits ?? []).join('\n') || t('git.noCommits')),
            h('div', { className: 'dept-block-title' }, t('block.tags')),
            h('div', { className: 'dept-sub' }, (detail.tags ?? []).join(', ') || '—'),
            h('div', { className: 'dept-block-title' }, t('block.branch')),
            h('div', { className: 'dept-sub' }, detail.currentBranch ?? detail.branch))
        }
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.openQuestions')),
            openQuestions.length === 0
              ? h('div', { className: 'dept-sub' }, 'нет')
              : h('div', { className: 'dept-events' }, ...openQuestions.map((question) =>
                  h('div', { key: question.id, className: 'dept-event' }, h('span', null, question.text))))),
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.documents')),
            h('div', { className: 'dept-row' }, ...docs.map((file) =>
              h('span', { key: file, className: 'dept-badge ' + (detail.files?.[file] ? 'ok' : 'wait') }, file)))),
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, t('block.recentEvents')),
            h('div', { className: 'dept-events' }, ...(detail.events ?? []).slice(0, 8).map((event) =>
              h('div', { key: event.id, className: 'dept-event' },
                h('time', null, String(event.ts).replace('T', ' ').slice(5, 19)),
                h('span', null, actorLabel(event.actor) + ': ' + eventLabel(event.action)))))))
      })()

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, detail.title),
            h('div', { className: 'dept-sub' }, `${detail.taskId} · ${stageLabel(detail.stage)} · ${detail.progress}% · ${detail.currentBranch ?? detail.branch}`),
            detail.paused ? h('div', { className: 'dept-row', style: { marginTop: '4px' } }, h('span', { className: 'dept-badge wait' }, t('badge.onPause') + (detail.pauseReason ? ': ' + detail.pauseReason : ''))) : null,
            (detail.questions ?? []).filter((question) => question.status === 'memo').length > 0
              ? h('div', { className: 'dept-row', style: { marginTop: '4px' } },
                  h('span', { className: 'dept-badge wait' }, '✍ служебных записок: ' + (detail.questions ?? []).filter((question) => question.status === 'memo').length))
              : null),
          h('div', { className: 'dept-row' },
            h('input', { className: 'dept-input', value: name, onChange: (event) => setName(event.target.value), placeholder: t('form.name'), title: t('form.nameTitle') }),
            h('button', { className: 'dept-btn', onClick: startDepartment }, 'Запустить отдел'),
            ['done', 'release', 'blocked'].includes(detail.stage)
              ? h('button', { className: 'dept-btn', onClick: reopenTaskAction }, 'Переоткрыть')
              : null,
            h('button', { className: 'dept-btn', onClick: () => onEditor && onEditor() }, t('nav.editor')),
            h('button', { className: 'dept-btn fail', disabled: busy, onClick: deleteTask }, 'Удалить'),
            h('button', {
              className: 'dept-btn',
              disabled: busy,
              onClick: () => post(ROUTES.pause, { root: detail.root, taskId: detail.taskId, paused: !detail.paused, reason: t('pause.byButton') }),
            }, detail.paused ? t('task.resume') : t('task.pause')),
            h('button', { className: 'dept-btn', onClick: onBack }, '← ' + t('nav.back')))),
        h('div', { className: 'dept-tabs' }, ...tabs.map(([key, label]) =>
          h('button', { key, className: 'dept-btn' + (tab === key ? ' active' : ''), onClick: () => setTab(key) }, label))),
        h('div', { style: { display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: '12px', alignItems: 'start' } },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            h('div', { className: 'dept-block' },
              h('div', { className: 'dept-block-title' }, t('block.status')),
              kv(t('block.stage'), stageLabel(detail.stage)),
              kv(t('block.attempts'), detail.attempts),
              kv(t('block.tests'), detail.tests),
              kv(t('block.review'), detail.review),
              kv(t('block.tokens'), `${tokens.toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')} / ${(budget?.limitTokens ?? 0).toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')}`),
              kv(t('block.cost'), `${budget?.costUSD ? '$' + budget.costUSD.toFixed(2) : '—'}${costRub ? ' ≈ ' + costRub.toFixed(0) + ' ₽' : ''}`),
              kv(t('block.calls'), usage?.calls ?? 0),
              h('div', { className: 'dept-bar' }, h('i', { style: { width: `${detail.progress}%` } }))),
            (detail.stage === 'spec_review' && !approved.has('spec'))
              || (detail.stage === 'concept_review' && !approved.has('concept'))
              || (detail.stage === 'design_review' && !approved.has('design'))
              ? h('div', { className: 'dept-block' },
                  h('div', { className: 'dept-block-title' }, t('block.approval')),
                  detail.stage === 'spec_review'
                    ? h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.approve, { root: detail.root, taskId: detail.taskId, doc: 'spec' }) }, t('approve.spec'))
                    : detail.stage === 'concept_review'
                      ? h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.approve, { root: detail.root, taskId: detail.taskId, doc: 'concept' }) }, t('approve.concept'))
                      : h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.approve, { root: detail.root, taskId: detail.taskId, doc: 'design' }) }, t('approve.design')))
              : null),
          content,
        ),
        message ? h('div', { className: 'dept-sub' }, message) : null,
      )
    }

    /* ---------------- Схема проекта ---------------- */

    const BLUEPRINT_COLORS = ['#4b8bff', '#7fdc9a', '#d8c07a', '#c25a4a', '#9b7bff', '#6fd4e0', '#e08ab0']

    function BlueprintView({ tasks }) {
      const roots = [...new Set((tasks ?? []).map((task) => task.root))]
      const [root, setRoot] = useState(roots[0] ?? null)
      const [blueprint, setBlueprint] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)
      const [group, setGroup] = useState(null)
      const [file, setFile] = useState(null)
      const [mode, setMode] = useState('dir')

      useEffect(() => {
        if (!root) return
        setLoading(true)
        setGroup(null)
        setFile(null)
        api(`${ROUTES.blueprint}?root=${encodeURIComponent(root)}`)
          .then((payload) => { setBlueprint(payload.blueprint); setError(null) })
          .catch((problem) => setError(problem.message))
          .finally(() => setLoading(false))
      }, [root])

      if (!root) return h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, t('empty.projects')))

      const files = blueprint?.files ?? []
      const edges = blueprint?.edges ?? []
      const groupKey = (item) => (mode === 'layer' ? item.layer : item.dir)
      const groups = new Map()
      for (const item of files) {
        const key = groupKey(item)
        if (!groups.has(key)) groups.set(key, { dir: key, files: [], loc: 0 })
        const bucket = groups.get(key)
        bucket.files.push(item)
        bucket.loc += item.loc
      }
      const groupList = [...groups.values()].sort((a, b) => b.files.length - a.files.length)
      const LAYER_TITLES = { core: t('layer.core'), ui: t('layer.ui'), tests: t('layer.tests'), docs: t('layer.docs') }
      const groupName = (dir) => (mode === 'layer' ? (LAYER_TITLES[dir] ?? dir) : (dir === '.' ? t('bp.root') : dir))
      const colorOf = (dir) => BLUEPRINT_COLORS[Math.max(0, groupList.findIndex((item) => item.dir === dir)) % BLUEPRINT_COLORS.length]

      // связи между группами
      const groupEdges = new Map()
      for (const edge of edges) {
        const fromFile = files.find((item) => item.path === edge.from)
        const toFile = files.find((item) => item.path === edge.to)
        if (!fromFile || !toFile || fromFile.dir === toFile.dir) continue
        const key = fromFile.dir + ' -> ' + toFile.dir
        groupEdges.set(key, (groupEdges.get(key) ?? 0) + 1)
      }

      const groupsView = () => {
        const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(groupList.length))))
        const rows = Math.ceil(groupList.length / columns)
        const cellW = 150
        const cellH = 100
        const offsetX = Math.max(20, (640 - columns * cellW) / 2)
        const offsetY = Math.max(20, (420 - rows * cellH) / 2)
        const positions = new Map()
        groupList.forEach((item, index) => {
          const col = index % columns
          const row = Math.floor(index / columns)
          positions.set(item.dir, { x: offsetX + col * cellW, y: offsetY + row * cellH })
        })
        return h('svg', { viewBox: '0 0 640 420' },
          h('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#141a28' }),
          ...[...groupEdges.entries()].map(([key, count], index) => {
            const [fromDir, toDir] = key.split(' -> ')
            const from = positions.get(fromDir)
            const to = positions.get(toDir)
            if (!from || !to) return null
            return h('g', { key: 'ge' + index },
              h('line', { x1: from.x + 55, y1: from.y + 30, x2: to.x + 55, y2: to.y + 30, stroke: '#3a4a6a', strokeWidth: Math.min(4, 1 + count * 0.4), opacity: 0.7 }))
          }),
          ...groupList.map((item) => {
            const position = positions.get(item.dir)
            const color = colorOf(item.dir)
            return h('g', { key: item.dir, style: { cursor: 'pointer' }, onClick: () => { setGroup(item.dir); setFile(null) } },
              h('rect', { x: position.x, y: position.y, width: 110, height: 62, rx: 10, fill: '#1b2438', stroke: color, strokeWidth: 1.5 }),
              h('text', { x: position.x + 8, y: position.y + 20, fill: '#e6edf7', fontSize: 9 }, groupName(item.dir).slice(0, 16)),
              h('text', { x: position.x + 8, y: position.y + 36, fill: '#8b98ad', fontSize: 8 }, t('bp.filesCount', { n: item.files.length })),
              h('text', { x: position.x + 8, y: position.y + 50, fill: '#8b98ad', fontSize: 8 }, t('bp.linesCount', { n: item.loc })),
              h('circle', { cx: position.x + 98, cy: position.y + 12, r: 4, fill: color }))
          }))
      }

      const filesView = (dir) => {
        const bucket = groups.get(dir)
        const items = bucket.files
        const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(items.length))))
        const rows = Math.ceil(items.length / columns)
        const cellW = 140
        const cellH = 84
        const offsetX = Math.max(40, (640 - columns * cellW) / 2)
        const offsetY = Math.max(40, (400 - rows * cellH) / 2)
        const positions = new Map()
        items.forEach((item, index) => {
          positions.set(item.path, { x: offsetX + (index % columns) * cellW, y: offsetY + Math.floor(index / columns) * cellH })
        })
        const inner = edges.filter((edge) => positions.has(edge.from) && positions.has(edge.to))
        const outer = edges.filter((edge) => (positions.has(edge.from) && !positions.has(edge.to)) || (!positions.has(edge.from) && positions.has(edge.to)))
        return h('svg', { viewBox: '0 0 640 420' },
          h('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#141a28' }),
          ...inner.map((edge, index) => {
            const from = positions.get(edge.from)
            const to = positions.get(edge.to)
            const active = file && (edge.from === file || edge.to === file)
            return h('line', { key: 'ie' + index, x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: active ? '#7fdc9a' : '#3a4a6a', strokeWidth: active ? 1.6 : 1, opacity: 0.8 })
          }),
          ...items.map((item) => {
            const position = positions.get(item.path)
            const isSelected = file === item.path
            return h('g', { key: item.path, style: { cursor: 'pointer' }, onClick: () => setFile(item.path) },
              h('circle', { cx: position.x, cy: position.y, r: isSelected ? 8 : 6, fill: colorOf(dir), stroke: isSelected ? '#fff' : '#0b1220', strokeWidth: 1 }),
              h('text', { x: position.x + 10, y: position.y + 3, fill: '#c9d6ea', fontSize: 8 }, item.path.split('/').pop().slice(0, 18)))
          }),
          h('text', { x: 20, y: 400, fill: '#8b98ad', fontSize: 9 }, t('bp.inner', { i: inner.length, o: outer.length })))
      }

      const selectedFile = file ? files.find((item) => item.path === file) : null
      const segment = group ? filesView(group) : groupsView()

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, t('bp.title')),
            h('div', { className: 'dept-sub' }, blueprint ? t('bp.stats', { f: blueprint.stats.files, l: blueprint.stats.loc, e: edges.length }) : (loading ? t('bp.loading') : '—'))),
          h('div', { className: 'dept-row' },
            roots.length > 1
              ? h('select', { className: 'dept-input', value: root, onChange: (event) => setRoot(event.target.value) },
                  ...roots.map((candidate) => h('option', { key: candidate, value: candidate }, candidate.split('/').pop())))
              : null,
            h('button', { className: 'dept-btn' + (mode === 'dir' ? ' active' : ''), onClick: () => { setMode('dir'); setGroup(null); setFile(null) } }, t('bp.byDir')),
            h('button', { className: 'dept-btn' + (mode === 'layer' ? ' active' : ''), onClick: () => { setMode('layer'); setGroup(null); setFile(null) } }, t('bp.byLayer')),
            group ? h('button', { className: 'dept-btn', onClick: () => { setGroup(null); setFile(null) } }, t('bp.allGroups')) : null)),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 300px', gap: '12px', alignItems: 'start' } },
          h('div', { className: 'dept-block', style: { maxHeight: '460px', overflow: 'auto' } },
            h('div', { className: 'dept-block-title' }, t('bp.groups')),
            ...groupList.map((item) =>
              h('div', {
                key: item.dir,
                className: 'dept-kv',
                style: { cursor: 'pointer', background: group === item.dir ? '#1b2438' : undefined },
                onClick: () => { setGroup(item.dir); setFile(null) },
              },
                h('span', null, groupName(item.dir)),
                h('span', { className: 'dept-sub' }, `${item.files.length}`)))),
          h('div', { className: 'dept-block', style: { padding: 0, overflow: 'hidden' } }, segment),
          h('div', { className: 'dept-block' },
            selectedFile
              ? [
                  h('div', { className: 'dept-block-title' }, selectedFile.path.split('/').pop()),
                  h('div', { className: 'dept-sub' }, selectedFile.path),
                  h('div', { className: 'dept-kv' }, h('span', null, t('bp.lines')), h('span', null, selectedFile.loc)),
                  h('div', { className: 'dept-kv' }, h('span', null, t('bp.layer')), h('span', null, LAYER_TITLES[selectedFile.layer] ?? selectedFile.layer)),
                  h('div', { className: 'dept-block-title' }, t('bp.symbols')),
                  (selectedFile.symbols ?? []).length === 0
                    ? h('div', { className: 'dept-sub' }, '—')
                    : h('div', { className: 'dept-events', style: { maxHeight: '180px', overflow: 'auto' } },
                        ...(selectedFile.symbols ?? []).map((symbol) =>
                          h('div', { key: symbol.name + symbol.line, className: 'dept-event' },
                            h('span', { className: 'dept-sub', style: { minWidth: '34px' } }, symbol.line),
                            h('span', null, symbol.name)))),
                  h('div', { className: 'dept-block-title' }, t('bp.imports')),
                  selectedFile.imports.length === 0 ? h('div', { className: 'dept-sub' }, '—') : h('div', { className: 'dept-events' },
                    ...selectedFile.imports.map((target) => h('div', { key: target, className: 'dept-event' }, h('span', null, target)))),
                  h('div', { className: 'dept-block-title' }, t('bp.usedBy')),
                  (() => {
                    const dependents = edges.filter((edge) => edge.to === selectedFile.path).map((edge) => edge.from)
                    return dependents.length === 0 ? h('div', { className: 'dept-sub' }, '—') : h('div', { className: 'dept-events' },
                      ...dependents.map((source) => h('div', { key: source, className: 'dept-event' }, h('span', null, source))))
                  })(),
                ]
              : h('div', { className: 'dept-sub' }, t('bp.choose'))),
        ),
      )
    }

    /* ---------------- Графики ---------------- */

    function ChartsView({ tasks }) {
      const [current, setCurrent] = useState(tasks[0] ?? null)
      const [detail, setDetail] = useState(null)
      const [error, setError] = useState(null)

      useEffect(() => {
        if (!current) return
        api(ROUTES.task + '?root=' + encodeURIComponent(current.root) + '&taskId=' + encodeURIComponent(current.taskId))
          .then((payload) => { setDetail(payload); setError(null) })
          .catch((problem) => setError(problem.message))
      }, [current?.root, current?.taskId])

      if (!current) return h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, t('empty.tasks')))

      const history = detail?.history ?? []
      const totalTokens = history.reduce((sum, item) => sum + item.tokens, 0)
      const totalCost = history.reduce((sum, item) => sum + item.costUSD, 0)
      const totalMs = history.reduce((sum, item) => sum + item.durationMs, 0)
      const maxTokens = Math.max(1, ...history.map((item) => item.tokens))
      const maxCost = Math.max(0.0001, ...history.map((item) => item.costUSD))
      const maxMs = Math.max(1, ...history.map((item) => item.durationMs))
      const hours = Math.floor(totalMs / 3600000)
      const minutes = Math.round((totalMs % 3600000) / 60000)

      const rows = (items, max, format) => h('div', { className: 'dept-events' }, ...items.map((item) =>
        h('div', { key: item.stage, className: 'dept-event', style: { alignItems: 'center' } },
          h('span', { style: { minWidth: '64px' } }, t('stageNo') + ' ' + item.stage),
          h('div', { style: { flex: '1 1 auto', height: '10px', background: '#1b2438', borderRadius: '6px', overflow: 'hidden' } },
            h('div', { style: { width: Math.max(2, Math.round((item.value / max) * 100)) + '%', height: '100%', background: item.color } })),
          h('span', { className: 'dept-sub', style: { minWidth: '84px', textAlign: 'right' } }, format(item)))))

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, t('charts.title')),
            h('div', { className: 'dept-sub' }, t('charts.tokensLine', { t: totalTokens.toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU'), c: totalCost.toFixed(2), h: hours, m: minutes }))),
          tasks.length > 1
            ? h('select', { className: 'dept-input', value: current.taskId, onChange: (event) => setCurrent(tasks.find((task) => task.taskId === event.target.value) ?? tasks[0]) },
                ...tasks.map((task) => h('option', { key: task.root + task.taskId, value: task.taskId }, task.taskId)))
            : null),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        history.length === 0
          ? h('div', { className: 'dept-block' }, h('div', { className: 'dept-sub' }, 'Этапов ещё нет — графики появятся после первых коммитов.'))
          : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' } },
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, 'Токены'),
                rows(history.map((item) => ({ ...item, value: item.tokens, color: '#4b8bff' })), maxTokens, (item) => item.tokens.toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU'))),
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, t('chart.costTitle')),
                rows(history.map((item) => ({ ...item, value: item.costUSD, color: '#7fdc9a' })), maxCost, (item) => '$' + item.costUSD.toFixed(3))),
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, t('charts.duration')),
                rows(history.map((item) => ({ ...item, value: item.durationMs, color: '#d8c07a' })), maxMs, (item) => Math.round(item.durationMs / 60000) + ' ' + t('minutesShort')))),
        h('div', { className: 'dept-block' },
          h('div', { className: 'dept-block-title' }, t('charts.gates')),
          ...history.map((item) =>
            h('div', { key: item.stage, className: 'dept-kv' },
              h('span', null, t('stageNo') + ' ' + item.stage),
              h('span', { className: 'dept-row' },
                h('span', { className: 'dept-badge ' + (item.tests === 'pass' ? 'ok' : item.tests === 'fail' ? 'fail' : 'wait') }, 'тесты: ' + item.tests),
                h('span', { className: 'dept-badge ' + (item.review === 'pass' ? 'ok' : item.review === 'fail' ? 'fail' : 'wait') }, 'ревью: ' + item.review))))))
    }

    /* ---------------- Проекты ---------------- */

    function ProjectsView({ onOpen }) {
      const [projects, setProjects] = useState([])
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)

      async function load() {
        setLoading(true)
        try {
          const payload = await api(ROUTES.projects)
          setProjects(payload.projects ?? [])
          setError(null)
        } catch (problem) {
          setError(problem.message)
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => { load() }, [])

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, t('projects.title')),
            h('div', { className: 'dept-sub' }, t('projects.count', { n: projects.length }) + (loading ? t('count.refreshing') : ''))),
          h('button', { className: 'dept-btn', onClick: load }, t('nav.refresh'))),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        projects.length === 0 && !loading
          ? h('div', { className: 'dept-empty' }, t('projects.none'))
          : h('div', { className: 'dept-list' }, ...projects.map((project) =>
              h('div', { key: project.root, className: 'dept-card', onClick: () => onOpen(project.root) },
                h('div', { className: 'dept-row' }, h('strong', null, project.name), h('span', { className: 'dept-sub' }, project.root)),
                h('div', { className: 'dept-row' },
                  h('span', { className: 'dept-badge' }, t('count.tasks', { n: project.taskCount })),
                  h('span', { className: 'dept-badge ' + (project.active > 0 ? 'ok' : 'wait') }, `в работе: ${project.active}`),
                  h('span', { className: 'dept-sub' }, `токены: ${project.budgetUsed.toLocaleString(deptLang === 'en' ? 'en-US' : 'ru-RU')}`)),
                h('div', { className: 'dept-sub' }, Object.entries(project.stages).map(([stage, count]) => `${stage}: ${count}`).join(' · ')),
                project.lastEvent ? h('div', { className: 'dept-sub' }, `${project.lastEvent.action} · ${project.lastEvent.detail ?? ''}`) : null))) )
    }


    /* ---------------- Markdown ---------------- */

    const MD_KEYWORDS = '(?:const|let|var|function|return|if|else|for|while|class|new|import|export|from|async|await|try|catch|throw|switch|case|break|continue|def|int|float|double|bool|void|struct|template|typename|public|private|protected|std|auto|null|true|false|None|True|False|and|or|not|in|is)'

    function highlightCode(code) {
      const pattern = new RegExp('(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|\\b\\d+(?:\\.\\d+)?\\b|\\b' + MD_KEYWORDS + '\\b)', 'g')
      const nodes = []
      let last = 0
      let match
      while ((match = pattern.exec(code)) !== null) {
        if (match.index > last) nodes.push(code.slice(last, match.index))
        const token = match[0]
        let className = 'md-num'
        if (token.startsWith('//') || token.startsWith('#') || token.startsWith('/*')) className = 'md-comment'
        else if (token.startsWith("'") || token.startsWith('"')) className = 'md-string'
        else if (/^\d/.test(token)) className = 'md-num'
        else className = 'md-keyword'
        nodes.push(h('span', { key: 'c' + nodes.length, className }, token))
        last = pattern.lastIndex
      }
      if (last < code.length) nodes.push(code.slice(last))
      return nodes
    }

    function inlineMarkdown(text) {
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
      const nodes = []
      let last = 0
      let match
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) nodes.push(h('code', { key: 'm' + nodes.length, className: 'dept-inline-code' }, token.slice(1, -1)))
        else if (token.startsWith('**')) nodes.push(h('strong', { key: 'm' + nodes.length }, token.slice(2, -2)))
        else if (token.startsWith('*')) nodes.push(h('em', { key: 'm' + nodes.length }, token.slice(1, -1)))
        else {
          const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
          nodes.push(h('a', { key: 'm' + nodes.length, href: link[2], target: '_blank', rel: 'noreferrer' }, link[1]))
        }
        last = pattern.lastIndex
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    function parseTable(lines) {
      const rows = lines.map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()))
      const header = rows[0] ?? []
      const body = rows.slice(1).filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell) || cell === ''))
      return h('table', { className: 'dept-table' },
        h('thead', null, h('tr', null, ...header.map((cell, index) => h('th', { key: index }, inlineMarkdown(cell))))),
        h('tbody', null, ...body.map((row, rowIndex) =>
          h('tr', { key: rowIndex }, ...row.map((cell, cellIndex) => h('td', { key: cellIndex }, inlineMarkdown(cell)))))))
    }

    function Markdown({ text }) {
      const lines = String(text ?? '').split(/\r?\n/)
      const blocks = []
      let index = 0
      const isTableStart = (line, next) => line.trim().startsWith('|') && next !== undefined && /^\s*\|?[\s:|-]+\|?\s*$/.test(next)
      while (index < lines.length) {
        const line = lines[index]
        if (/^```/.test(line.trim())) {
          const lang = line.trim().slice(3).trim()
          const code = []
          index += 1
          while (index < lines.length && !/^```/.test(lines[index].trim())) { code.push(lines[index]); index += 1 }
          index += 1
          blocks.push(h('div', { key: 'b' + blocks.length, className: 'md-code' },
            h('div', { className: 'md-code-lang' }, lang || 'code'),
            h('pre', null, h('code', null, ...highlightCode(code.join('\n'))))))
          continue
        }
        if (isTableStart(line, lines[index + 1])) {
          const tableLines = []
          while (index < lines.length && lines[index].trim().startsWith('|')) { tableLines.push(lines[index]); index += 1 }
          blocks.push(h('div', { key: 'b' + blocks.length, className: 'md-table' }, parseTable(tableLines)))
          continue
        }
        const heading = line.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
          const level = heading[1].length
          blocks.push(h('h' + Math.min(4, level), { key: 'b' + blocks.length, className: 'md-h' + level }, inlineMarkdown(heading[2])))
          index += 1
          continue
        }
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) {
            items.push(lines[index].replace(/^\s*([-*]|\d+\.)\s+/, ''))
            index += 1
          }
          blocks.push(h('ul', { key: 'b' + blocks.length, className: 'md-list' }, ...items.map((item, itemIndex) => h('li', { key: itemIndex }, inlineMarkdown(item)))))
          continue
        }
        if (/^\s*>\s?/.test(line)) {
          const quote = []
          while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
            quote.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          blocks.push(h('blockquote', { key: 'b' + blocks.length }, inlineMarkdown(quote.join(' '))))
          continue
        }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
          blocks.push(h('hr', { key: 'b' + blocks.length }))
          index += 1
          continue
        }
        if (line.trim() === '') { index += 1; continue }
        const paragraph = []
        while (index < lines.length && lines[index].trim() !== '' && !/^```/.test(lines[index].trim()) && !/^#{1,6}\s/.test(lines[index]) && !isTableStart(lines[index], lines[index + 1])) {
          paragraph.push(lines[index])
          index += 1
        }
        blocks.push(h('p', { key: 'b' + blocks.length }, inlineMarkdown(paragraph.join('\n'))))
      }
      return h('div', { className: 'dept-md' }, ...blocks)
    }

    /* ---------------- Панель ---------------- */


    function DesignTab({ root, taskId }) {
      const [data, setData] = useState(null)
      const [error, setError] = useState(null)
      const [notes, setNotes] = useState({})
      const [busy, setBusy] = useState(false)

      async function load() {
        try {
          const payload = await api(ROUTES.design + '?root=' + encodeURIComponent(root) + '&taskId=' + encodeURIComponent(taskId))
          setData(payload)
        } catch (problem) {
          setError(problem.message)
        }
      }

      useEffect(() => { load() }, [root, taskId])

      async function mark(path, verdict) {
        setBusy(true)
        try {
          const by = localStorage.getItem('dept-approver') || 'vladimir'
          await fetch(ROUTES.designFeedback, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ root, taskId, path, verdict, note: notes[path] ?? '', by }),
          })
          await load()
        } catch (problem) {
          setError(problem.message)
        } finally {
          setBusy(false)
        }
      }

      if (error) return h('div', { className: 'dept-badge fail' }, error)
      if (!data) return h('div', { className: 'dept-sub' }, t('doc.loading'))

      return h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '12px', alignItems: 'start' } },
        h('div', { className: 'dept-block', style: { maxHeight: '620px', overflow: 'auto' } },
          h('div', { className: 'dept-block-title' }, 'design.md'),
          data.design ? h(Markdown, { text: data.design }) : h('div', { className: 'dept-sub' }, 'Дизайн ещё не написан.')),
        h('div', { className: 'dept-block', style: { maxHeight: '620px', overflow: 'auto' } },
          h('div', { className: 'dept-block-title' }, 'Референсы и эскизы'),
          data.references.length === 0
            ? h('div', { className: 'dept-sub' }, 'Пока нет файлов в references/.')
            : h('div', null, ...data.references.map((name) =>
                h('div', { key: name, className: 'dept-block', style: { gap: '6px' } },
                  h('img', {
                    src: ROUTES.designImage + '?root=' + encodeURIComponent(root) + '&taskId=' + encodeURIComponent(taskId) + '&name=' + encodeURIComponent(name),
                    alt: name,
                    style: { width: '100%', borderRadius: '8px', imageRendering: 'auto' },
                  }),
                  h('div', { className: 'dept-sub' }, name),
                  h('div', { className: 'dept-row' },
                    h('button', { className: 'dept-btn', disabled: busy, onClick: () => mark(name, 'like') }, '♥ Нравится'),
                    h('button', { className: 'dept-btn', disabled: busy, onClick: () => mark(name, 'dislike') }, '✗ Не то')),
                  h('input', {
                    className: 'dept-input',
                    placeholder: 'комментарий (что нравится/не нравится)',
                    value: notes[name] ?? '',
                    onChange: (event) => setNotes({ ...notes, [name]: event.target.value }),
                  })))),
          h('div', { className: 'dept-block-title' }, 'Отметки человека'),
          (data.feedback ?? []).length === 0
            ? h('div', { className: 'dept-sub' }, 'пока нет')
            : h('div', { className: 'dept-events' }, ...(data.feedback ?? []).slice().reverse().map((item, index) =>
                h('div', { key: index, className: 'dept-event' },
                  h('span', { className: 'dept-badge ' + (item.verdict === 'like' ? 'ok' : 'fail') }, item.verdict === 'like' ? '♥' : '✗'),
                  h('span', null, item.path + (item.note ? ' — ' + item.note : '')))))))
    }

    function DepartmentPanel() {
      styleOnce()
      const [view, setView] = useState('board')
      const [tasks, setTasks] = useState([])
      const [selected, setSelected] = useState(null)
      const [detail, setDetail] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(true)
      const [selectedSession, setSelectedSession] = useState(null)
      const [projectFilter, setProjectFilter] = useState(null)
      const [name, setName] = useState(() => localStorage.getItem('dept-approver') || 'vladimir')
      const [settings, setSettings] = useState({ enabled: true })
      const [editorKey, setEditorKey] = useState('')
      const [showCreate, setShowCreate] = useState(false)
      const [form, setForm] = useState({ root: '', taskId: '', title: '', brief: '', testCommand: '' })
      const [creating, setCreating] = useState(false)
      const [createError, setCreateError] = useState(null)
      const [browse, setBrowse] = useState(null)
      const [langTick, setLangTick] = useState(0)
      const [textSize, setTextSize] = useState(() => {
        const saved = Number(localStorage.getItem('dept-text-size'))
        return saved >= 12 && saved <= 20 ? saved : 13
      })
      const activity = useActivity()
      const attention = tasks.reduce((sum, task) => sum + (task.memos ?? 0), 0)
      const party = tasks.length > 0 && tasks.every((task) => task.stage === 'done')

      async function loadTasks() {
        setLoading(true)
        setError(null)
        try {
          const payload = await api(ROUTES.tasks)
          setTasks(payload.tasks ?? [])
        } catch (problem) {
          setError(problem.message)
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        api(ROUTES.settings).then(setSettings).catch(() => {})
      }, [])

      async function postJson(path, body) {
        const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || response.statusText)
        return data
      }

      async function openBrowse(target) {
        try {
          const payload = await api(`${ROUTES.browseDirs}?path=${encodeURIComponent(target || form.root || '')}`)
          setBrowse(payload)
        } catch (problem) {
          setBrowse({ error: problem.message })
        }
      }

      async function toggleDepartment() {
        try {
          const next = await postJson(ROUTES.settings, { enabled: !settings.enabled, by: name })
          setSettings(next)
        } catch (problem) {
          setError(problem.message)
        }
      }

      function applyRoot(path) {
        const base = String(path).split('/').filter(Boolean).pop() ?? 'project'
        const id = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-01'
        setForm((current) => ({
          ...current,
          root: path,
          taskId: current.taskId || id,
          title: current.title || base,
        }))
      }

      async function createTask() {
        setCreating(true)
        setCreateError(null)
        try {
          await postJson(ROUTES.createTask, { ...form, by: name })
          const created = { root: form.root, taskId: form.taskId, title: form.title }
          setShowCreate(false)
          setForm({ root: '', taskId: '', title: '', brief: '', testCommand: '' })
          setBrowse(null)
          await loadTasks()
          await openTask(created)
        } catch (problem) {
          setCreateError(problem.message)
        } finally {
          setCreating(false)
        }
      }

      async function openTask(task) {
        setSelected(task)
        setDetail(null)
        setView('board')
        try {
          const payload = await api(`${ROUTES.task}?root=${encodeURIComponent(task.root)}&taskId=${encodeURIComponent(task.taskId)}`)
          setDetail(payload)
        } catch (problem) {
          setError(problem.message)
        }
      }

      useEffect(() => {
        document.documentElement.style.setProperty('--dept-text', textSize + 'px')
        localStorage.setItem('dept-text-size', String(textSize))
      }, [textSize])
      useEffect(() => { loadTasks() }, [])

      if (selected) {
        return detail
          ? h(TaskDetail, { detail, onDeleted: () => { setSelected(null); setDetail(null); loadTasks() }, onEditor: () => { setEditorKey(detail.root + ':' + detail.taskId); setView('editor'); setSelected(null); setDetail(null) }, onBack: () => { setSelected(null); setDetail(null) }, onReload: () => { if (selected) openTask(selected) } })
          : h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, t('loading.task')))
      }

      if (view === 'projects') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, t('nav.board')),
              h('button', { className: 'dept-btn active' }, t('nav.projects')),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, t('nav.office')),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, t('nav.blueprint')),
              h('button', { className: 'dept-btn', onClick: () => setView('charts') }, t('nav.charts')), h('button', { className: 'dept-btn', onClick: () => setView('editor') }, t('nav.editor')),
              h('button', { className: 'dept-btn', onClick: () => setShowCreate(true) }, t('dept.newTask')),
              h('button', { className: 'dept-btn' + (settings.enabled ? '' : ' fail'), onClick: toggleDepartment }, settings.enabled ? t('dept.enabled') : t('dept.disabled')))),
          h(ProjectsView, { onOpen: (root) => { setProjectFilter(root); setView('board') } }))
      }

      if (view === 'charts') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, t('nav.board')),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, t('nav.office')),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, t('nav.blueprint')),
              h('button', { className: 'dept-btn active' }, t('nav.charts'))),
            h('button', { className: 'dept-btn', onClick: loadTasks }, t('nav.refresh'))),
          h(ChartsView, { tasks }))
      }

      if (view === 'editor') {
        const editorTasks = projectFilter ? tasks.filter((task) => task.root === projectFilter) : tasks
        const current = editorTasks.find((task) => `${task.root}:${task.taskId}` === editorKey) ?? editorTasks[0] ?? null
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', null,
              h('div', { className: 'dept-title' }, t('nav.editor')),
              h('div', { className: 'dept-sub' }, 'Рисуйте спрайты и отправляйте художнику; трафарет помогает обводить контуры.')),
            h('div', { className: 'dept-row' },
              h('select', {
                className: 'dept-input',
                value: current ? `${current.root}:${current.taskId}` : '',
                onChange: (event) => setEditorKey(event.target.value),
              }, ...editorTasks.map((task) => h('option', { key: `${task.root}:${task.taskId}`, value: `${task.root}:${task.taskId}` }, `${task.root.split('/').pop()} · ${task.taskId}`))),
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, '← ' + t('nav.board')))),
          current
            ? h('iframe', {
                src: `${ROUTES.editor}?root=${encodeURIComponent(current.root)}&taskId=${encodeURIComponent(current.taskId)}`,
                style: { width: '100%', height: 'calc(100vh - 150px)', border: '0', borderRadius: '12px', background: '#0b0f18' },
                title: 'Пиксель-редактор',
              })
            : h('div', { className: 'dept-empty' }, t('empty.noTasksHint')))
      }

      if (view === 'blueprint') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, t('nav.board')),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, t('nav.office')),
              h('button', { className: 'dept-btn active' }, t('nav.blueprint'))),
            h('button', { className: 'dept-btn', onClick: loadTasks }, t('nav.refresh'))),
          h(BlueprintView, { tasks }))
      }

      if (view === 'office') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, t('nav.board')),
              h('button', { className: 'dept-btn active', onClick: () => setView('office') }, t('nav.office')),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, t('nav.blueprint')),
              h('button', { className: 'dept-btn', onClick: () => setView('charts') }, t('nav.charts')), h('button', { className: 'dept-btn', onClick: () => setView('editor') }, t('nav.editor')),
              h('button', { className: 'dept-btn', onClick: () => setShowCreate(true) }, t('dept.newTask')),
              h('button', { className: 'dept-btn' + (settings.enabled ? '' : ' fail'), onClick: toggleDepartment }, settings.enabled ? t('dept.enabled') : t('dept.disabled'))),
            h('button', { className: 'dept-btn', onClick: loadTasks }, t('nav.refresh'))),
          h(OfficeView, { items: activity.items, selected: selectedSession, onSelect: setSelectedSession, tasks, attention, onOpenTask: (root) => { const task = tasks.find((candidate) => candidate.root === root); if (task) openTask(task) }, party, paused: tasks.some((task) => task.paused), pauseReason: (tasks.find((task) => task.paused) ?? {}).pauseReason }),
        )
      }

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, t('title.department')),
            h('div', { className: 'dept-sub' }, t('count.tasks', { n: tasks.length }) + (loading ? t('count.refreshing') : '')),
          ),
          h('div', { className: 'dept-tabs' },
            h('button', { className: 'dept-btn active', onClick: () => setView('board') }, t('nav.board')),
            h('button', { className: 'dept-btn', onClick: () => setView('projects') }, t('nav.projects')),
            h('button', { className: 'dept-btn', onClick: () => setView('office') }, t('nav.office')),
            h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, t('nav.blueprint')),
            h('button', { className: 'dept-btn', onClick: () => setView('charts') }, t('nav.charts')), h('button', { className: 'dept-btn', onClick: () => setView('editor') }, t('nav.editor')),
              h('button', { className: 'dept-btn', onClick: () => setShowCreate(true) }, t('dept.newTask')),
              h('button', { className: 'dept-btn' + (settings.enabled ? '' : ' fail'), onClick: toggleDepartment }, settings.enabled ? t('dept.enabled') : t('dept.disabled')),
            h('button', {
              className: 'dept-btn',
              onClick: () => {
                setDeptLang(deptLang === 'en' ? 'ru' : 'en')
                setLangTick((value) => value + 1)
              },
              title: 'Language / Язык',
            }, deptLang === 'en' ? 'RU' : 'EN'),
            h('button', { className: 'dept-btn', onClick: () => setTextSize(textSize >= 19 ? 12 : textSize + 2), title: t('title.textSize') }, 'A+'),
            h('button', {
              className: 'dept-btn' + (settings.enabled ? '' : ' fail'),
              onClick: toggleDepartment,
              title: settings.enabled ? 'Выключить отдел' : 'Включить отдел',
            }, settings.enabled ? t('dept.enabled') : t('dept.disabled')),
            h('button', { className: 'dept-btn', onClick: () => setShowCreate(true) }, t('dept.newTask')),
            h('button', { className: 'dept-btn', onClick: loadTasks }, t('nav.refresh'))),
        ),
        settings.enabled ? null : h('div', { className: 'dept-badge fail' }, t('dept.offBanner')),
        attention > 0
          ? h('div', { className: 'dept-block' },
              h('div', { className: 'dept-block-title' }, 'Требует внимания'),
              h('div', null, `${attention} служебных записок ждут вашего решения — откройте задачу, вкладка «Вопросы».`))
          : null,
        h(ActivityBlock, { items: activity.items, error: activity.error }),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        projectFilter ? h('div', { className: 'dept-row' }, h('span', { className: 'dept-badge' }, 'проект: ' + projectFilter.split('/').pop()), h('button', { className: 'dept-btn', onClick: () => setProjectFilter(null) }, t('btn.reset'))) : null,
        (projectFilter ? tasks.filter((task) => task.root === projectFilter) : tasks).length === 0 && !loading
          ? h('div', { className: 'dept-empty' }, t('empty.noTasksHint'))
          : h('div', { className: 'dept-list' }, ...tasks.map((task) => h(TaskCard, { key: `${task.root}:${task.taskId}`, task, onOpen: openTask }))),
        showCreate
          ? h('div', { className: 'dept-modal' },
              h('div', { className: 'dept-modal-card' },
                h('div', { className: 'dept-title' }, t('dept.createTitle')),
                h('div', { className: 'dept-form-row' }, h('label', null, t('dept.root')),
                  h('div', { className: 'dept-row', style: { flexWrap: 'nowrap' } },
                    h('input', { className: 'dept-input', list: 'dept-roots', value: form.root, placeholder: '/home/agent/work/projects/my-app', onChange: (event) => setForm({ ...form, root: event.target.value }), style: { flex: 1 } }),
                    h('button', { className: 'dept-btn', type: 'button', onClick: () => openBrowse(form.root) }, t('dept.pick'))),
                  h('datalist', { id: 'dept-roots' }, ...[...new Set(tasks.map((task) => task.root))].map((root) => h('option', { key: root, value: root })))),
                browse
                  ? h('div', { className: 'dept-block', style: { maxHeight: '220px', overflow: 'auto', gap: '6px' } },
                      browse.error
                        ? h('div', { className: 'dept-badge fail' }, t('dept.dirError') + ': ' + browse.error)
                        : h('div', null,
                            h('div', { className: 'dept-sub' }, browse.path),
                            h('div', { className: 'dept-row' },
                              browse.parent ? h('button', { className: 'dept-btn', type: 'button', onClick: () => openBrowse(browse.parent) }, t('dept.up')) : null,
                              h('button', { className: 'dept-btn', type: 'button', onClick: () => { applyRoot(browse.path); setBrowse(null) } }, t('dept.chooseThis'))),
                            ...browse.dirs.map((dir) => h('button', {
                              key: dir,
                              className: 'dept-btn',
                              type: 'button',
                              style: { textAlign: 'left' },
                              onClick: () => openBrowse(browse.path + '/' + dir),
                            }, dir + (browse.projects?.includes(dir) ? ' · ' + t('dept.git') : '')))))
                  : null,
                h('div', { className: 'dept-form-row' }, h('label', null, t('dept.taskId')),
                  h('input', { className: 'dept-input', value: form.taskId, placeholder: 'feature-01', onChange: (event) => setForm({ ...form, taskId: event.target.value }) })),
                h('div', { className: 'dept-form-row' }, h('label', null, t('dept.title')),
                  h('input', { className: 'dept-input', value: form.title, onChange: (event) => setForm({ ...form, title: event.target.value }) })),
                h('div', { className: 'dept-form-row' }, h('label', null, t('dept.test')),
                  h('input', { className: 'dept-input', value: form.testCommand, placeholder: 'авто: npm test, если есть package.json', onChange: (event) => setForm({ ...form, testCommand: event.target.value }) })),
                h('div', { className: 'dept-form-row' }, h('label', null, t('dept.brief')),
                  h('textarea', { className: 'dept-input', rows: 5, value: form.brief, onChange: (event) => setForm({ ...form, brief: event.target.value }) })),
                createError ? h('div', { className: 'dept-badge fail' }, createError) : null,
                h('div', { className: 'dept-row' },
                  h('button', { className: 'dept-btn', disabled: creating || !form.root || !form.taskId, onClick: createTask }, t('dept.create')),
                  h('button', { className: 'dept-btn', onClick: () => { setShowCreate(false); setCreateError(null) } }, t('dept.cancel')))))
          : null,
      )
    }

    function DepartmentIcon(props) {
      const size = props?.size ?? 16
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 20V8l5-3 5 3v12', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M14 20V11l5-2v11', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M3 20h18', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: 9, cy: 12, r: 1.3, fill: 'currentColor' }))
    }

    const inject = ['slots']

    function apply(ctx) {
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
        { name: 'sidebar.panellist', id: PANEL_ID, order: 55, label: t('title.departmentShort') },
        DepartmentIcon,
      ))
      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_ID },
        DepartmentPanel,
      ))
    }

    return { PANEL_ID, apply, inject, styleOnce, DepartmentPanel, TaskDetail, BlueprintView, OfficeView, ChartsView }
  },
})
