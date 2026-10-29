import type { LanguageMode } from '../features/settings/api';

export type Locale = Exclude<LanguageMode, 'system'>;

export type TranslationKey
  = | 'navigation.overview'
    | 'navigation.capturesDescription'
    | 'navigation.jobs'
    | 'navigation.jobsDescription'
    | 'navigation.captures'
    | 'navigation.captureDetails'
    | 'navigation.captureDetailsDescription'
    | 'navigation.library'
    | 'navigation.prompts'
    | 'navigation.providers'
    | 'navigation.settings'
    | 'navigation.main'
    | 'navigation.account'
    | 'navigation.back'
    | 'navigation.windowTitlebar'
    | 'overview.title'
    | 'overview.description'
    | 'prompts.description'
    | 'providers.add'
    | 'providers.addFirst'
    | 'providers.empty'
    | 'providers.emptyTitle'
    | 'providers.deleteQuestion'
    | 'providers.cancel'
    | 'providers.delete'
    | 'providers.edit'
    | 'providers.deleteLabel'
    | 'providers.enable'
    | 'providers.disable'
    | 'providers.inUse'
    | 'providers.customModels'
    | 'providers.enabled'
    | 'providers.formDescription'
    | 'providers.failedFetchModels' | 'providers.save' | 'providers.name' | 'providers.protocol' | 'providers.baseUrl' | 'providers.apiKey' | 'providers.hideApiKey' | 'providers.showApiKey' | 'providers.clearApiKey' | 'providers.keepApiKey' | 'providers.models' | 'providers.required' | 'providers.modelSources' | 'providers.modelsTemporary' | 'providers.aboutModelSources' | 'providers.fetchModels' | 'providers.modelId' | 'providers.customModelId' | 'providers.displayName' | 'providers.displayNameOptional' | 'providers.addCustomModel'
    | 'navigation.notFound'
    | 'navigation.newProvider'
    | 'navigation.editProvider'
    | 'navigation.providersDescription'
    | 'settings.workspace'
    | 'settings.features'
    | 'settings.library'
    | 'settings.captures'
    | 'settings.advanced'
    | 'settings.configFolder'
    | 'settings.openConfigFolder'
    | 'settings.exportDataDescription'
    | 'settings.exportData'
    | 'settings.exportDataAction'
    | 'settings.finishJobsBeforeTransfer'
    | 'settings.importData'
    | 'settings.importDataAction'
    | 'settings.importDataDescription'
    | 'settings.appearance'
    | 'settings.appearanceDescription'
    | 'settings.languageRegion'
    | 'settings.languageRegionDescription'
    | 'settings.search'
    | 'settings.colorTheme'
    | 'settings.colorThemeDescription'
    | 'settings.language'
    | 'settings.languageDescription'
    | 'settings.timeFormat'
    | 'settings.timeFormatDescription'
    | 'settings.timezone'
    | 'settings.timezoneDescription'
    | 'settings.system'
    | 'settings.light'
    | 'settings.dark'
    | 'settings.losAngeles'
    | 'settings.newYork'
    | 'settings.shanghai'
    | 'settings.taipei'
    | 'settings.tokyo'
    | 'settings.utc'
    | 'settings.noResults'
    | 'settings.trySearch'
    | 'settings.libraryDescription'
    | 'settings.advancedDescription'
    | 'settings.capturesFetcher'
    | 'settings.capturesFetcherDescription'
    | 'settings.capturesNotConfigured'
    | 'settings.capturesApiKey'
    | 'settings.capturesApiKeyDescription'
    | 'settings.capturesApiKeyPlaceholder'
    | 'settings.clearCapturesApiKey'
    | 'settings.keepCapturesApiKey'
    | 'settings.capturesMaxAttempts'
    | 'settings.capturesMaxAttemptsDescription'
    | 'settings.capturesConcurrency'
    | 'settings.capturesConcurrencyDescription'
    | 'captures.captureAdded'
    | 'captures.captureExists'
    | 'captures.note'
    | 'captures.toPaste'
    | 'captures.pasteLink'
    | 'captures.capturing'
    | 'captures.enterToCapture'
    | 'captures.configureFetcherFirst'
    | 'captures.activeJobExists'
    | 'captures.dataTransferBusy'
    | 'captures.captureNotFound'
    | 'captures.invalidUrl'
    | 'captures.addCapture'
    | 'captures.title'
    | 'captures.url'
    | 'captures.viewDetails'
    | 'captures.viewJobs'
    | 'captures.recapture'
    | 'captures.delete'
    | 'captures.captureFilter'
    | 'captures.allCaptures'
    | 'captures.noCapturedContent'
    | 'captures.refresh'
    | 'captures.emptyTitle'
    | 'captures.emptyDescription'
    | 'captures.deleteCaptureTitle'
    | 'captures.cancel'
    | 'captures.recaptureStarted'
    | 'captures.captureDeleted'
    | 'captures.scrapeFailed'
    | 'captures.jobStatus'
    | 'captures.jobStatus.pending'
    | 'captures.jobStatus.running'
    | 'captures.jobStatus.succeeded'
    | 'captures.jobStatus.failed'
    | 'captures.fetcher'
    | 'captures.createdAt'
    | 'captures.updatedAt'
    | 'captures.error'
    | 'captures.noJobsTitle'
    | 'captures.noJobsDescription'
    | 'captures.noContentTitle'
    | 'captures.noContentDescription'
    | 'captures.detailUnavailable'
    | 'captures.addNote'
    | 'dataTransfer.exportTitle'
    | 'dataTransfer.exportSubtitle'
    | 'dataTransfer.passphrase'
    | 'dataTransfer.passphraseDescription'
    | 'dataTransfer.confirmPassphrase'
    | 'dataTransfer.passphraseMismatch'
    | 'dataTransfer.passphraseRequired'
    | 'dataTransfer.passphraseWarning'
    | 'dataTransfer.cancel'
    | 'dataTransfer.exportAction'
    | 'dataTransfer.exported'
    | 'dataTransfer.importTitle'
    | 'dataTransfer.importPassphraseDescription'
    | 'dataTransfer.inspectAction'
    | 'dataTransfer.previewTitle'
    | 'dataTransfer.exportedAt'
    | 'dataTransfer.appVersion'
    | 'dataTransfer.schemaVersion'
    | 'dataTransfer.providers'
    | 'dataTransfer.captures'
    | 'dataTransfer.jobs'
    | 'dataTransfer.replaceWarning'
    | 'dataTransfer.importAction'
    | 'dataTransfer.importingTitle'
    | 'dataTransfer.importingDescription'
    | 'dataTransfer.importingHint'
    | 'dataTransfer.restartTitle'
    | 'dataTransfer.restartDescription'
    | 'dataTransfer.restartHint'
    | 'dataTransfer.restartAction'
    | 'dataTransfer.activeJobs'
    | 'dataTransfer.archiveHasActiveJobs'
    | 'dataTransfer.busy'
    | 'dataTransfer.importExpired'
    | 'dataTransfer.invalidPassphrase'
    | 'dataTransfer.newerVersion'
    | 'dataTransfer.unsupportedArchive'
    | 'dataTransfer.invalidArchive'
    | 'dataTransfer.ioError';

type TranslationTable = Record<TranslationKey, string>;

const english: TranslationTable = {
  'navigation.overview': 'Overview',
  'navigation.capturesDescription': 'Collect links first, then organize them later.',
  'navigation.jobs': 'Jobs',
  'navigation.jobsDescription': 'Review scrape history and errors for this capture.',
  'navigation.captures': 'Captures',
  'navigation.captureDetails': 'Capture details',
  'navigation.captureDetailsDescription': 'Read the latest successfully captured page.',
  'navigation.library': 'Library',
  'navigation.prompts': 'Prompts',
  'navigation.providers': 'Providers',
  'navigation.settings': 'Settings',
  'navigation.main': 'Main',
  'navigation.account': 'Account',
  'navigation.back': 'Back',
  'navigation.windowTitlebar': 'Window titlebar',
  'overview.title': 'Good to see you',
  'overview.description': 'A summary of the local workspace.',
  'prompts.description': 'Reusable text fragments for agent conversations.',
  'providers.add': 'Add provider',
  'providers.addFirst': 'Add your first provider',
  'providers.empty': 'Connect a model service to make its models available in Foundry.',
  'providers.emptyTitle': 'No model providers yet',
  'providers.deleteQuestion': 'Delete provider?',
  'providers.cancel': 'Cancel',
  'providers.delete': 'Delete',
  'providers.edit': 'Edit provider',
  'providers.deleteLabel': 'Delete provider',
  'providers.enable': 'Enable provider',
  'providers.disable': 'Disable provider',
  'providers.inUse': 'Provider is currently in use',
  'providers.customModels': 'custom models',
  'providers.enabled': 'enabled',
  'providers.formDescription': 'Connect a model service using one of Foundry\'s supported protocols.',
  'providers.failedFetchModels': 'Failed to fetch models',
  'providers.save': 'Save provider',
  'providers.name': 'Name',
  'providers.protocol': 'Protocol',
  'providers.baseUrl': 'Base URL',
  'providers.apiKey': 'API key',
  'providers.hideApiKey': 'Hide API key',
  'providers.showApiKey': 'Show API key',
  'providers.clearApiKey': 'Clear stored API key',
  'providers.keepApiKey': 'Keep stored API key',
  'providers.models': 'Models',
  'providers.required': 'Required',
  'providers.modelSources': 'Model sources',
  'providers.modelsTemporary': 'Fetched models are temporary. Custom models are saved with this provider.',
  'providers.aboutModelSources': 'About model sources',
  'providers.fetchModels': 'Fetch models',
  'providers.modelId': 'Model ID',
  'providers.customModelId': 'Custom model ID',
  'providers.displayName': 'Display name',
  'providers.displayNameOptional': 'Display name (optional)',
  'providers.addCustomModel': 'Add custom model',
  'navigation.notFound': 'Page not found',
  'navigation.newProvider': 'New provider',
  'navigation.editProvider': 'Edit provider',
  'navigation.providersDescription': 'Manage the model service connections used by Foundry.',
  'settings.workspace': 'Workspace',
  'settings.features': 'Features',
  'settings.library': 'Library',
  'settings.captures': 'Captures',
  'settings.advanced': 'Advanced',
  'settings.configFolder': 'Config folder',
  'settings.openConfigFolder': 'Open folder',
  'settings.exportDataDescription': 'Create an encrypted Foundry snapshot.',
  'settings.exportData': 'Export data',
  'settings.exportDataAction': 'Export',
  'settings.finishJobsBeforeTransfer': 'Finish active scrape jobs before transferring data.',
  'settings.importData': 'Import data',
  'settings.importDataAction': 'Import',
  'settings.importDataDescription': 'Restore data from an encrypted Foundry snapshot.',
  'settings.appearance': 'Appearance',
  'settings.appearanceDescription': 'Theme and density for this browser.',
  'settings.languageRegion': 'Language & region',
  'settings.languageRegionDescription': 'Language, formats, and time zone.',
  'settings.search': 'Search settings',
  'settings.colorTheme': 'Color theme',
  'settings.colorThemeDescription': 'Applies to this browser only.',
  'settings.language': 'Language',
  'settings.languageDescription': 'Used across menus, buttons, and email.',
  'settings.timeFormat': 'Time format',
  'settings.timeFormatDescription': 'Timestamp pattern used across Foundry.',
  'settings.timezone': 'Time zone',
  'settings.timezoneDescription': 'Used for scheduling and every timestamp you see.',
  'settings.system': 'System',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.losAngeles': 'Los Angeles (GMT-08:00)',
  'settings.newYork': 'New York (GMT-05:00)',
  'settings.shanghai': 'Shanghai (GMT+08:00)',
  'settings.taipei': 'Taipei (GMT+08:00)',
  'settings.tokyo': 'Tokyo (GMT+09:00)',
  'settings.utc': 'UTC (GMT+00:00)',
  'settings.noResults': 'No settings found',
  'settings.trySearch': 'Try theme, language, or sessions.',
  'settings.libraryDescription': 'Capture and prompt settings.',
  'settings.advancedDescription': 'Data transfer and local configuration.',
  'settings.capturesFetcher': 'Fetcher',
  'settings.capturesFetcherDescription': 'The service used to retrieve page content.',
  'settings.capturesNotConfigured': 'Not configured',
  'settings.capturesApiKey': 'API key',
  'settings.capturesApiKeyDescription': 'Authenticates requests to the selected fetch service.',
  'settings.capturesApiKeyPlaceholder': 'Enter an API key',
  'settings.clearCapturesApiKey': 'Clear stored API key',
  'settings.keepCapturesApiKey': 'Keep stored API key',
  'settings.capturesMaxAttempts': 'Maximum attempts',
  'settings.capturesMaxAttemptsDescription': 'Total requests per scrape job, from 1 to 10.',
  'settings.capturesConcurrency': 'Scrape concurrency',
  'settings.capturesConcurrencyDescription': 'Maximum simultaneous scrape jobs, from 1 to 5.',
  'captures.captureAdded': 'Capture added',
  'captures.captureExists': 'This link is already captured',
  'captures.note': 'Note',
  'captures.toPaste': 'to paste',
  'captures.pasteLink': 'Paste a link',
  'captures.capturing': 'Capturing…',
  'captures.enterToCapture': 'to capture',
  'captures.configureFetcherFirst': 'Configure a Fetcher in Settings before capturing pages.',
  'captures.activeJobExists': 'A scrape job is already running for this capture.',
  'captures.dataTransferBusy': 'Wait for the current data transfer to finish.',
  'captures.captureNotFound': 'Capture not found.',
  'captures.invalidUrl': 'Enter a valid HTTP or HTTPS URL.',
  'captures.addCapture': 'Add a capture',
  'captures.title': 'Title',
  'captures.url': 'URL',
  'captures.viewDetails': 'View details',
  'captures.viewJobs': 'View jobs',
  'captures.recapture': 'Re-capture',
  'captures.delete': 'Delete',
  'captures.captureFilter': 'Filter captures',
  'captures.allCaptures': 'All',
  'captures.noCapturedContent': 'No captured content',
  'captures.refresh': 'Refresh',
  'captures.emptyTitle': 'No captures yet',
  'captures.emptyDescription': 'Paste a link to start collecting.',
  'captures.deleteCaptureTitle': 'Delete capture?',
  'captures.cancel': 'Cancel',
  'captures.recaptureStarted': 'Re-capture started',
  'captures.captureDeleted': 'Capture deleted',
  'captures.scrapeFailed': 'Page fetch failed',
  'captures.jobStatus': 'Status',
  'captures.jobStatus.pending': 'Pending',
  'captures.jobStatus.running': 'Running',
  'captures.jobStatus.succeeded': 'Succeeded',
  'captures.jobStatus.failed': 'Failed',
  'captures.fetcher': 'Fetcher',
  'captures.createdAt': 'Created at',
  'captures.updatedAt': 'Updated at',
  'captures.error': 'Error',
  'captures.noJobsTitle': 'No scrape jobs',
  'captures.noJobsDescription': 'This capture does not have any scrape history.',
  'captures.noContentTitle': 'No captured content yet',
  'captures.noContentDescription': 'This capture has no successful page content. Review its jobs or re-capture it.',
  'captures.detailUnavailable': 'Capture details are unavailable',
  'captures.addNote': 'Add a note',
  'dataTransfer.exportTitle': 'Export Foundry data',
  'dataTransfer.exportSubtitle': 'Protect this snapshot with a passphrase.',
  'dataTransfer.passphrase': 'Passphrase',
  'dataTransfer.passphraseDescription': 'Used to encrypt and restore this backup.',
  'dataTransfer.confirmPassphrase': 'Confirm passphrase',
  'dataTransfer.passphraseMismatch': 'The passphrases do not match.',
  'dataTransfer.passphraseRequired': 'Enter a passphrase.',
  'dataTransfer.passphraseWarning': 'Foundry cannot recover a forgotten passphrase. Store it somewhere safe before exporting.',
  'dataTransfer.cancel': 'Cancel',
  'dataTransfer.exportAction': 'Choose location and export',
  'dataTransfer.exported': 'Foundry data exported.',
  'dataTransfer.importTitle': 'Import Foundry data',
  'dataTransfer.importPassphraseDescription': 'Enter the passphrase used when this snapshot was exported.',
  'dataTransfer.inspectAction': 'Unlock snapshot',
  'dataTransfer.previewTitle': 'Review import',
  'dataTransfer.exportedAt': 'Exported',
  'dataTransfer.appVersion': 'Foundry version',
  'dataTransfer.schemaVersion': 'Data version',
  'dataTransfer.providers': 'Providers',
  'dataTransfer.captures': 'Captures',
  'dataTransfer.jobs': 'Jobs',
  'dataTransfer.replaceWarning': 'Importing replaces all current Providers, Captures, Jobs, and application settings. Foundry will restart afterward.',
  'dataTransfer.importAction': 'Import and replace',
  'dataTransfer.importingTitle': 'Importing data',
  'dataTransfer.importingDescription': 'Importing Foundry data…',
  'dataTransfer.importingHint': 'Keep Foundry open until the import finishes.',
  'dataTransfer.restartTitle': 'Import complete',
  'dataTransfer.restartDescription': 'The data was imported successfully. Restart Foundry to load it.',
  'dataTransfer.restartHint': 'The current session remains locked until Foundry restarts.',
  'dataTransfer.restartAction': 'Restart Foundry',
  'dataTransfer.activeJobs': 'Finish active scrape jobs before exporting or importing data.',
  'dataTransfer.archiveHasActiveJobs': 'This snapshot contains unfinished scrape jobs and cannot be imported.',
  'dataTransfer.busy': 'Another data transfer is already in progress.',
  'dataTransfer.importExpired': 'The import session has expired. Select the file again.',
  'dataTransfer.invalidPassphrase': 'The passphrase is incorrect or the snapshot is corrupted.',
  'dataTransfer.newerVersion': 'This snapshot was created by a newer version of Foundry.',
  'dataTransfer.unsupportedArchive': 'This snapshot format is not supported by this version of Foundry.',
  'dataTransfer.invalidArchive': 'This is not a valid Foundry snapshot.',
  'dataTransfer.ioError': 'The data transfer could not be completed.',
};

const simplifiedChinese: TranslationTable = {
  ...english,
  'navigation.overview': '概览',
  'navigation.captures': '收藏',
  'navigation.captureDetails': '收藏详情',
  'navigation.captureDetailsDescription': '阅读最近一次成功抓取的页面内容。',
  'navigation.library': '资料库',
  'navigation.prompts': '提示词',
  'navigation.providers': '服务提供商',
  'navigation.settings': '设置',
  'navigation.main': '主要功能',
  'navigation.account': '账户',
  'navigation.back': '返回',
  'navigation.windowTitlebar': '窗口标题栏',
  'overview.description': '本地工作区摘要。',
  'prompts.description': '可复用于智能体对话的文本片段。',
  'providers.add': '添加服务提供商',
  'providers.addFirst': '添加第一个服务提供商',
  'providers.empty': '连接模型服务，即可在 Foundry 中使用其模型。',
  'providers.emptyTitle': '还没有模型服务提供商',
  'providers.deleteQuestion': '删除服务提供商？',
  'providers.cancel': '取消',
  'providers.delete': '删除',
  'providers.edit': '编辑服务提供商',
  'providers.deleteLabel': '删除服务提供商',
  'providers.enable': '启用服务提供商',
  'providers.disable': '停用服务提供商',
  'providers.inUse': '服务提供商正在使用中',
  'providers.customModels': '个自定义模型',
  'providers.enabled': '已启用',
  'providers.formDescription': '使用 Foundry 支持的协议连接模型服务。',
  'providers.failedFetchModels': '获取模型失败',
  'providers.save': '保存服务提供商',
  'providers.name': '名称',
  'providers.protocol': '协议',
  'providers.baseUrl': '基础 URL',
  'providers.apiKey': 'API 密钥',
  'providers.hideApiKey': '隐藏 API 密钥',
  'providers.showApiKey': '显示 API 密钥',
  'providers.clearApiKey': '清除已保存的 API 密钥',
  'providers.keepApiKey': '保留已保存的 API 密钥',
  'providers.models': '模型',
  'providers.required': '必填',
  'providers.modelSources': '模型来源',
  'providers.modelsTemporary': '获取的模型为临时模型，自定义模型会随服务提供商一起保存。',
  'providers.aboutModelSources': '关于模型来源',
  'providers.fetchModels': '获取模型',
  'providers.modelId': '模型 ID',
  'providers.customModelId': '自定义模型 ID',
  'providers.displayName': '显示名称',
  'providers.displayNameOptional': '显示名称（可选）',
  'providers.addCustomModel': '添加自定义模型',
  'navigation.notFound': '页面未找到',
  'navigation.newProvider': '新建服务提供商',
  'navigation.editProvider': '编辑服务提供商',
  'navigation.providersDescription': '管理 Foundry 使用的模型服务连接。',
  'settings.workspace': '工作区',
  'settings.advanced': '高级',
  'settings.configFolder': '配置文件夹',
  'settings.openConfigFolder': '打开文件夹',
  'settings.appearance': '外观',
  'settings.appearanceDescription': '此应用的明暗主题和密度。',
  'settings.languageRegion': '语言和地区',
  'settings.languageRegionDescription': '语言、格式和时区。',
  'settings.search': '搜索设置',
  'settings.colorTheme': '颜色主题',
  'settings.colorThemeDescription': '仅应用于此应用。',
  'settings.language': '语言',
  'settings.languageDescription': '用于菜单、按钮和邮件。',
  'settings.timeFormat': '时间格式',
  'settings.timeFormatDescription': 'Foundry 中所有时间戳使用的格式。',
  'settings.timezone': '时区',
  'settings.timezoneDescription': '用于日程安排和所有时间戳。',
  'settings.system': '跟随系统',
  'settings.light': '浅色',
  'settings.dark': '深色',
  'settings.losAngeles': '洛杉矶（GMT-08:00）',
  'settings.newYork': '纽约（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '东京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '未找到设置',
  'settings.trySearch': '试试搜索主题、语言或会话。',
  'settings.libraryDescription': '收藏和提示词设置。',
  'settings.advancedDescription': '数据传输和本地配置。',
  'navigation.capturesDescription': '先收集链接，之后再整理。',
  'navigation.jobs': '抓取记录',
  'navigation.jobsDescription': '查看这条收藏的抓取历史与错误。',
  'overview.title': '欢迎回来',
  'settings.features': '功能',
  'settings.library': '资料库',
  'settings.captures': '收藏',
  'settings.capturesFetcher': '抓取服务',
  'settings.capturesFetcherDescription': '用于获取网页内容的服务。',
  'settings.capturesNotConfigured': '未配置',
  'settings.capturesApiKey': 'API 密钥',
  'settings.capturesApiKeyDescription': '用于向所选抓取服务认证请求。',
  'settings.capturesApiKeyPlaceholder': '输入 API 密钥',
  'settings.clearCapturesApiKey': '清除已保存的 API 密钥',
  'settings.keepCapturesApiKey': '保留已保存的 API 密钥',
  'settings.capturesMaxAttempts': '最大尝试次数',
  'settings.capturesMaxAttemptsDescription': '每个抓取任务的总请求次数，1 到 10。',
  'settings.capturesConcurrency': '抓取并发数',
  'settings.capturesConcurrencyDescription': '同时运行的抓取任务上限，1 到 5。',
  'captures.captureAdded': '已收藏',
  'captures.captureExists': '这个链接已经收藏过了',
  'captures.note': '备注',
  'captures.toPaste': '粘贴',
  'captures.pasteLink': '粘贴链接',
  'captures.capturing': '正在收藏…',
  'captures.enterToCapture': '收藏',
  'captures.configureFetcherFirst': '请先在设置中配置抓取服务。',
  'captures.activeJobExists': '这条收藏已有正在运行的抓取任务。',
  'captures.captureNotFound': '找不到这条收藏。',
  'captures.invalidUrl': '请输入有效的 HTTP 或 HTTPS 链接。',
  'captures.addCapture': '添加收藏',
  'captures.title': '标题',
  'captures.url': '链接',
  'captures.viewDetails': '查看详情',
  'captures.viewJobs': '查看抓取记录',
  'captures.recapture': '重新抓取',
  'captures.delete': '删除',
  'captures.captureFilter': '筛选收藏',
  'captures.allCaptures': '全部',
  'captures.noCapturedContent': '尚未采集到内容',
  'captures.refresh': '刷新',
  'captures.emptyTitle': '还没有收藏',
  'captures.emptyDescription': '粘贴一个链接开始收集。',
  'captures.deleteCaptureTitle': '删除这条收藏？',
  'captures.cancel': '取消',
  'captures.recaptureStarted': '已开始重新抓取',
  'captures.captureDeleted': '收藏已删除',
  'captures.scrapeFailed': '网页抓取失败',
  'captures.jobStatus': '状态',
  'captures.jobStatus.pending': '等待中',
  'captures.jobStatus.running': '抓取中',
  'captures.jobStatus.succeeded': '已成功',
  'captures.jobStatus.failed': '已失败',
  'captures.fetcher': '抓取服务',
  'captures.createdAt': '创建时间',
  'captures.updatedAt': '更新时间',
  'captures.error': '错误',
  'captures.noJobsTitle': '没有抓取记录',
  'captures.noJobsDescription': '这条收藏还没有抓取历史。',
  'captures.noContentTitle': '还没有抓取内容',
  'captures.noContentDescription': '这条收藏尚无成功抓取的页面内容。请查看抓取记录或重新抓取。',
  'captures.detailUnavailable': '无法加载收藏详情',
  'captures.addNote': '添加备注',
  'captures.dataTransferBusy': '请等待当前数据传输完成。',
  'settings.exportDataDescription': '创建加密的 Foundry 快照。',
  'settings.exportData': '导出数据',
  'settings.exportDataAction': '导出',
  'settings.finishJobsBeforeTransfer': '请先等待正在运行的抓取任务完成。',
  'settings.importData': '导入数据',
  'settings.importDataAction': '导入',
  'settings.importDataDescription': '从加密的 Foundry 快照恢复数据。',
  'dataTransfer.exportTitle': '导出 Foundry 数据',
  'dataTransfer.exportSubtitle': '使用口令保护这个快照。',
  'dataTransfer.passphrase': '口令',
  'dataTransfer.passphraseDescription': '用于加密此备份，导入时需要输入。',
  'dataTransfer.confirmPassphrase': '确认口令',
  'dataTransfer.passphraseMismatch': '两次输入的口令不一致。',
  'dataTransfer.passphraseRequired': '请输入口令。',
  'dataTransfer.passphraseWarning': 'Foundry 无法恢复遗忘的口令，请在导出前妥善保存。',
  'dataTransfer.cancel': '取消',
  'dataTransfer.exportAction': '选择位置并导出',
  'dataTransfer.exported': 'Foundry 数据已导出。',
  'dataTransfer.importTitle': '导入 Foundry 数据',
  'dataTransfer.importPassphraseDescription': '输入导出这个快照时使用的口令。',
  'dataTransfer.inspectAction': '解锁快照',
  'dataTransfer.previewTitle': '确认导入',
  'dataTransfer.exportedAt': '导出时间',
  'dataTransfer.appVersion': 'Foundry 版本',
  'dataTransfer.schemaVersion': '数据版本',
  'dataTransfer.providers': '服务提供商',
  'dataTransfer.captures': '收藏',
  'dataTransfer.jobs': '抓取任务',
  'dataTransfer.replaceWarning': '导入会替换当前全部服务提供商、收藏、抓取任务和应用设置。导入完成后 Foundry 将重新启动。',
  'dataTransfer.importAction': '导入并替换',
  'dataTransfer.importingTitle': '正在导入数据',
  'dataTransfer.importingDescription': '正在导入 Foundry 数据…',
  'dataTransfer.importingHint': '导入完成前请保持 Foundry 开启。',
  'dataTransfer.restartTitle': '导入完成',
  'dataTransfer.restartDescription': '数据已成功导入，请重启 Foundry 以载入数据。',
  'dataTransfer.restartHint': '重启前当前会话会保持锁定。',
  'dataTransfer.restartAction': '重启 Foundry',
  'dataTransfer.activeJobs': '请先等待正在运行的抓取任务完成，再导出或导入数据。',
  'dataTransfer.archiveHasActiveJobs': '这个快照包含未完成的抓取任务，无法导入。',
  'dataTransfer.busy': '另一个数据传输正在进行中。',
  'dataTransfer.importExpired': '导入会话已过期，请重新选择文件。',
  'dataTransfer.invalidPassphrase': '口令错误或快照已损坏。',
  'dataTransfer.newerVersion': '这个快照由更新版本的 Foundry 创建。',
  'dataTransfer.unsupportedArchive': '当前 Foundry 版本不支持这个快照格式。',
  'dataTransfer.invalidArchive': '这不是有效的 Foundry 快照。',
  'dataTransfer.ioError': '数据传输未能完成。',
};

const traditionalChinese: TranslationTable = {
  ...simplifiedChinese,
  'navigation.overview': '總覽',
  'navigation.captures': '收藏',
  'navigation.captureDetails': '收藏詳情',
  'navigation.captureDetailsDescription': '閱讀最近一次成功抓取的頁面內容。',
  'navigation.library': '資料庫',
  'navigation.prompts': '提示詞',
  'navigation.providers': '服務提供者',
  'navigation.settings': '設定',
  'navigation.main': '主要功能',
  'navigation.account': '帳戶',
  'navigation.back': '返回',
  'navigation.windowTitlebar': '視窗標題列',
  'overview.description': '本機工作區摘要。',
  'prompts.description': '可重複用於代理人對話的文字片段。',
  'providers.add': '新增服務提供者',
  'providers.addFirst': '新增第一個服務提供者',
  'providers.empty': '連接模型服務，即可在 Foundry 中使用其模型。',
  'providers.emptyTitle': '尚無模型服務提供者',
  'providers.deleteQuestion': '刪除服務提供者？',
  'providers.cancel': '取消',
  'providers.delete': '刪除',
  'providers.edit': '編輯服務提供者',
  'providers.deleteLabel': '刪除服務提供者',
  'providers.enable': '啟用服務提供者',
  'providers.disable': '停用服務提供者',
  'providers.inUse': '服務提供者目前正在使用中',
  'providers.customModels': '個自訂模型',
  'providers.enabled': '已啟用',
  'providers.formDescription': '使用 Foundry 支援的協定連線模型服務。',
  'providers.failedFetchModels': '取得模型失敗',
  'providers.save': '儲存服務提供者',
  'providers.name': '名稱',
  'providers.protocol': '協定',
  'providers.baseUrl': '基礎 URL',
  'providers.apiKey': 'API 金鑰',
  'providers.hideApiKey': '隱藏 API 金鑰',
  'providers.showApiKey': '顯示 API 金鑰',
  'providers.clearApiKey': '清除已儲存的 API 金鑰',
  'providers.keepApiKey': '保留已儲存的 API 金鑰',
  'providers.models': '模型',
  'providers.required': '必填',
  'providers.modelSources': '模型來源',
  'providers.modelsTemporary': '取得的模型為暫時模型，自訂模型會隨服務提供者一起儲存。',
  'providers.aboutModelSources': '關於模型來源',
  'providers.fetchModels': '取得模型',
  'providers.modelId': '模型 ID',
  'providers.customModelId': '自訂模型 ID',
  'providers.displayName': '顯示名稱',
  'providers.displayNameOptional': '顯示名稱（選填）',
  'providers.addCustomModel': '新增自訂模型',
  'navigation.notFound': '找不到頁面',
  'navigation.newProvider': '新增服務提供者',
  'navigation.editProvider': '編輯服務提供者',
  'navigation.providersDescription': '管理 Foundry 使用的模型服務連線。',
  'settings.workspace': '工作區',
  'settings.advanced': '進階',
  'settings.configFolder': '設定資料夾',
  'settings.openConfigFolder': '開啟資料夾',
  'settings.appearance': '外觀',
  'settings.appearanceDescription': '此應用程式的外觀主題與密度。',
  'settings.languageRegion': '語言與地區',
  'settings.languageRegionDescription': '語言、格式與時區。',
  'settings.search': '搜尋設定',
  'settings.colorTheme': '色彩主題',
  'settings.colorThemeDescription': '僅套用於此應用程式。',
  'settings.language': '語言',
  'settings.languageDescription': '用於選單、按鈕與郵件。',
  'settings.timeFormat': '時間格式',
  'settings.timeFormatDescription': 'Foundry 中所有時間戳記使用的格式。',
  'settings.timezone': '時區',
  'settings.timezoneDescription': '用於排程與所有時間戳記。',
  'settings.system': '跟隨系統',
  'settings.light': '淺色',
  'settings.dark': '深色',
  'settings.losAngeles': '洛杉磯（GMT-08:00）',
  'settings.newYork': '紐約（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '東京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '找不到設定',
  'settings.trySearch': '試著搜尋主題、語言或工作階段。',
  'settings.libraryDescription': '收藏與提示詞設定。',
  'settings.advancedDescription': '資料傳輸與本機設定。',
  'navigation.capturesDescription': '先收集連結，之後再整理。',
  'navigation.jobs': '抓取紀錄',
  'navigation.jobsDescription': '查看這筆收藏的抓取紀錄與錯誤。',
  'overview.title': '歡迎回來',
  'settings.features': '功能',
  'settings.library': '資料庫',
  'settings.captures': '收藏',
  'settings.capturesFetcher': '抓取服務',
  'settings.capturesFetcherDescription': '用於取得網頁內容的服務。',
  'settings.capturesNotConfigured': '尚未設定',
  'settings.capturesApiKey': 'API 金鑰',
  'settings.capturesApiKeyDescription': '用於向所選抓取服務驗證請求。',
  'settings.capturesApiKeyPlaceholder': '輸入 API 金鑰',
  'settings.clearCapturesApiKey': '清除已儲存的 API 金鑰',
  'settings.keepCapturesApiKey': '保留已儲存的 API 金鑰',
  'settings.capturesMaxAttempts': '最大嘗試次數',
  'settings.capturesMaxAttemptsDescription': '每個抓取工作的總請求次數，1 到 10。',
  'settings.capturesConcurrency': '抓取並行數',
  'settings.capturesConcurrencyDescription': '同時執行的抓取工作上線，1 到 5。',
  'captures.captureAdded': '已收藏',
  'captures.captureExists': '這個連結已經收藏過了',
  'captures.note': '備註',
  'captures.toPaste': '貼上',
  'captures.pasteLink': '貼上連結',
  'captures.capturing': '正在收藏…',
  'captures.enterToCapture': '收藏',
  'captures.configureFetcherFirst': '請先在設定中設定抓取服務。',
  'captures.activeJobExists': '這筆收藏已有正在執行的抓取工作。',
  'captures.captureNotFound': '找不到這筆收藏。',
  'captures.invalidUrl': '請輸入有效的 HTTP 或 HTTPS 連結。',
  'captures.addCapture': '新增收藏',
  'captures.title': '標題',
  'captures.url': '連結',
  'captures.viewDetails': '查看詳情',
  'captures.viewJobs': '查看抓取紀錄',
  'captures.recapture': '重新抓取',
  'captures.delete': '刪除',
  'captures.captureFilter': '篩選收藏',
  'captures.allCaptures': '全部',
  'captures.noCapturedContent': '尚未取得內容',
  'captures.refresh': '重新整理',
  'captures.emptyTitle': '還沒有收藏',
  'captures.emptyDescription': '貼上一個連結開始收集。',
  'captures.deleteCaptureTitle': '刪除這筆收藏？',
  'captures.cancel': '取消',
  'captures.recaptureStarted': '已開始重新抓取',
  'captures.captureDeleted': '收藏已刪除',
  'captures.scrapeFailed': '網頁抓取失敗',
  'captures.jobStatus': '狀態',
  'captures.jobStatus.pending': '等待中',
  'captures.jobStatus.running': '抓取中',
  'captures.jobStatus.succeeded': '已成功',
  'captures.jobStatus.failed': '已失敗',
  'captures.fetcher': '抓取服務',
  'captures.createdAt': '建立時間',
  'captures.updatedAt': '更新時間',
  'captures.error': '錯誤',
  'captures.noJobsTitle': '沒有抓取紀錄',
  'captures.noJobsDescription': '這筆收藏還沒有抓取紀錄。',
  'captures.noContentTitle': '還沒有抓取內容',
  'captures.noContentDescription': '這筆收藏尚無成功抓取的頁面內容。請查看抓取紀錄或重新抓取。',
  'captures.detailUnavailable': '無法載入收藏詳情',
  'captures.addNote': '新增備註',
  'captures.dataTransferBusy': '請等待目前的資料傳輸完成。',
  'settings.exportDataDescription': '建立加密的 Foundry 快照。',
  'settings.exportData': '匯出資料',
  'settings.exportDataAction': '匯出',
  'settings.finishJobsBeforeTransfer': '請先等待執行中的抓取工作完成。',
  'settings.importData': '匯入資料',
  'settings.importDataAction': '匯入',
  'settings.importDataDescription': '從加密的 Foundry 快照還原資料。',
  'dataTransfer.exportTitle': '匯出 Foundry 資料',
  'dataTransfer.exportSubtitle': '使用通關密語保護這個快照。',
  'dataTransfer.passphrase': '通關密語',
  'dataTransfer.passphraseDescription': '用於加密此備份，匯入時需要輸入。',
  'dataTransfer.confirmPassphrase': '確認通關密語',
  'dataTransfer.passphraseMismatch': '兩次輸入的通關密語不一致。',
  'dataTransfer.passphraseRequired': '請輸入通關密語。',
  'dataTransfer.passphraseWarning': 'Foundry 無法還原忘記的通關密語，請在匯出前妥善保存。',
  'dataTransfer.cancel': '取消',
  'dataTransfer.exportAction': '選擇位置並匯出',
  'dataTransfer.exported': 'Foundry 資料已匯出。',
  'dataTransfer.importTitle': '匯入 Foundry 資料',
  'dataTransfer.importPassphraseDescription': '輸入匯出這個快照時使用的通關密語。',
  'dataTransfer.inspectAction': '解鎖快照',
  'dataTransfer.previewTitle': '確認匯入',
  'dataTransfer.exportedAt': '匯出時間',
  'dataTransfer.appVersion': 'Foundry 版本',
  'dataTransfer.schemaVersion': '資料版本',
  'dataTransfer.providers': '服務提供者',
  'dataTransfer.captures': '收藏',
  'dataTransfer.jobs': '抓取工作',
  'dataTransfer.replaceWarning': '匯入會取代目前全部服務提供者、收藏、抓取工作與應用程式設定。匯入完成後 Foundry 將重新啟動。',
  'dataTransfer.importAction': '匯入並取代',
  'dataTransfer.importingTitle': '正在匯入資料',
  'dataTransfer.importingDescription': '正在匯入 Foundry 資料…',
  'dataTransfer.importingHint': '匯入完成前請保持 Foundry 開啟。',
  'dataTransfer.restartTitle': '匯入完成',
  'dataTransfer.restartDescription': '資料已成功匯入，請重新啟動 Foundry 以載入資料。',
  'dataTransfer.restartHint': '重新啟動前目前工作階段會保持鎖定。',
  'dataTransfer.restartAction': '重新啟動 Foundry',
  'dataTransfer.activeJobs': '請先等待執行中的抓取工作完成，再匯出或匯入資料。',
  'dataTransfer.archiveHasActiveJobs': '這個快照包含未完成的抓取工作，無法匯入。',
  'dataTransfer.busy': '另一個資料傳輸正在進行中。',
  'dataTransfer.importExpired': '匯入工作階段已過期，請重新選擇檔案。',
  'dataTransfer.invalidPassphrase': '通關密語錯誤或快照已損壞。',
  'dataTransfer.newerVersion': '這個快照由較新版本的 Foundry 建立。',
  'dataTransfer.unsupportedArchive': '目前 Foundry 版本不支援這個快照格式。',
  'dataTransfer.invalidArchive': '這不是有效的 Foundry 快照。',
  'dataTransfer.ioError': '資料傳輸未能完成。',
};

const japanese: TranslationTable = {
  ...english,
  'navigation.overview': '概要',
  'navigation.captures': 'キャプチャ',
  'navigation.library': 'ライブラリ',
  'navigation.prompts': 'プロンプト',
  'navigation.providers': 'プロバイダー',
  'navigation.settings': '設定',
  'navigation.main': 'メイン',
  'navigation.account': 'アカウント',
  'navigation.back': '戻る',
  'navigation.windowTitlebar': 'ウィンドウタイトルバー',
  'overview.description': 'ローカルワークスペースの概要。',
  'prompts.description': 'エージェントとの会話で再利用できるテキスト。',
  'providers.add': 'プロバイダーを追加',
  'providers.addFirst': '最初のプロバイダーを追加',
  'providers.empty': 'モデルサービスを接続すると、そのモデルを Foundry で利用できます。',
  'providers.emptyTitle': 'モデルプロバイダーがまだありません',
  'providers.deleteQuestion': 'プロバイダーを削除しますか？',
  'providers.cancel': 'キャンセル',
  'providers.delete': '削除',
  'providers.edit': 'プロバイダーを編集',
  'providers.deleteLabel': 'プロバイダーを削除',
  'providers.enable': 'プロバイダーを有効化',
  'providers.disable': 'プロバイダーを無効化',
  'providers.inUse': 'プロバイダーは現在使用中です',
  'providers.customModels': '個のカスタムモデル',
  'providers.enabled': '有効',
  'providers.formDescription': 'Foundryがサポートするプロトコルでモデルサービスに接続します。',
  'providers.failedFetchModels': 'モデルの取得に失敗しました',
  'providers.save': 'プロバイダーを保存',
  'providers.name': '名前',
  'providers.protocol': 'プロトコル',
  'providers.baseUrl': 'ベース URL',
  'providers.apiKey': 'API キー',
  'providers.hideApiKey': 'API キーを隠す',
  'providers.showApiKey': 'API キーを表示',
  'providers.clearApiKey': '保存済みの API キーを削除',
  'providers.keepApiKey': '保存済みの API キーを保持',
  'providers.models': 'モデル',
  'providers.required': '必須',
  'providers.modelSources': 'モデルソース',
  'providers.modelsTemporary': '取得したモデルは一時的なものです。カスタムモデルはこのプロバイダーと一緒に保存されます。',
  'providers.aboutModelSources': 'モデルソースについて',
  'providers.fetchModels': 'モデルを取得',
  'providers.modelId': 'モデル ID',
  'providers.customModelId': 'カスタムモデル ID',
  'providers.displayName': '表示名',
  'providers.displayNameOptional': '表示名（任意）',
  'providers.addCustomModel': 'カスタムモデルを追加',
  'navigation.notFound': 'ページが見つかりません',
  'navigation.newProvider': '新しいプロバイダー',
  'navigation.editProvider': 'プロバイダーを編集',
  'navigation.providersDescription': 'Foundryで使用するモデルサービス接続を管理します。',
  'settings.workspace': 'ワークスペース',
  'settings.advanced': '詳細設定',
  'settings.configFolder': '設定フォルダー',
  'settings.openConfigFolder': 'フォルダーを開く',
  'settings.appearance': '外観',
  'settings.appearanceDescription': 'このアプリのテーマと密度。',
  'settings.languageRegion': '言語と地域',
  'settings.languageRegionDescription': '言語、形式、タイムゾーン。',
  'settings.search': '設定を検索',
  'settings.colorTheme': 'カラーテーマ',
  'settings.colorThemeDescription': 'このアプリにのみ適用されます。',
  'settings.language': '言語',
  'settings.languageDescription': 'メニュー、ボタン、メールで使用します。',
  'settings.timeFormat': '時刻形式',
  'settings.timeFormatDescription': 'Foundry のすべてのタイムスタンプに使用する形式。',
  'settings.timezone': 'タイムゾーン',
  'settings.timezoneDescription': 'スケジュールとすべてのタイムスタンプに使用します。',
  'settings.system': 'システム',
  'settings.light': 'ライト',
  'settings.dark': 'ダーク',
  'settings.losAngeles': 'ロサンゼルス（GMT-08:00）',
  'settings.newYork': 'ニューヨーク（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '東京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '設定が見つかりません',
  'settings.trySearch': 'テーマ、言語、セッションを検索してみてください。',
  'settings.libraryDescription': 'キャプチャとプロンプトの設定。',
  'settings.advancedDescription': 'データ転送とローカル設定。',
  'navigation.capturesDescription': 'まずリンクを集め、後から整理します。',
  'navigation.jobs': '取得履歴',
  'navigation.jobsDescription': 'このキャプチャの取得履歴とエラーを確認します。',
  'navigation.captureDetails': 'キャプチャの詳細',
  'navigation.captureDetailsDescription': '最後に正常に取得したページを表示します。',
  'overview.title': 'おかえりなさい',
  'settings.features': '機能',
  'settings.library': 'ライブラリ',
  'settings.captures': 'キャプチャ',
  'settings.capturesFetcher': 'フェッチャー',
  'settings.capturesFetcherDescription': 'ページ内容を取得するサービス。',
  'settings.capturesNotConfigured': '未設定',
  'settings.capturesApiKey': 'API キー',
  'settings.capturesApiKeyDescription': '選択した取得サービスへのリクエストを認証します。',
  'settings.capturesApiKeyPlaceholder': 'API キーを入力',
  'settings.clearCapturesApiKey': '保存済みの API キーを削除',
  'settings.keepCapturesApiKey': '保存済みの API キーを保持',
  'settings.capturesMaxAttempts': '最大試行回数',
  'settings.capturesMaxAttemptsDescription': 'ジョブごとの総リクエスト数（1〜10）。',
  'settings.capturesConcurrency': '取得の同時実行数',
  'settings.capturesConcurrencyDescription': '同時に実行する取得ジョブの上限（1〜5）。',
  'captures.captureAdded': 'キャプチャしました',
  'captures.captureExists': 'このリンクはすでにキャプチャ済みです',
  'captures.note': 'メモ',
  'captures.toPaste': '貼り付け',
  'captures.pasteLink': 'リンクを貼り付け',
  'captures.capturing': 'キャプチャ中…',
  'captures.enterToCapture': 'キャプチャする',
  'captures.configureFetcherFirst': '先に設定でフェッチャーを構成してください。',
  'captures.activeJobExists': 'このキャプチャには実行中の取得ジョブがあります。',
  'captures.captureNotFound': 'キャプチャが見つかりません。',
  'captures.invalidUrl': '有効な HTTP または HTTPS URL を入力してください。',
  'captures.addCapture': 'キャプチャを追加',
  'captures.title': 'タイトル',
  'captures.url': 'URL',
  'captures.viewDetails': '詳細を表示',
  'captures.viewJobs': '取得履歴を見る',
  'captures.recapture': '再取得',
  'captures.delete': '削除',
  'captures.captureFilter': 'キャプチャを絞り込む',
  'captures.allCaptures': 'すべて',
  'captures.noCapturedContent': '取得内容なし',
  'captures.refresh': '更新',
  'captures.emptyTitle': 'キャプチャはまだありません',
  'captures.emptyDescription': 'リンクを貼り付けて収集を始めましょう。',
  'captures.deleteCaptureTitle': 'キャプチャを削除しますか？',
  'captures.cancel': 'キャンセル',
  'captures.recaptureStarted': '再取得を開始しました',
  'captures.captureDeleted': 'キャプチャを削除しました',
  'captures.scrapeFailed': 'ページの取得に失敗しました',
  'captures.jobStatus': '状態',
  'captures.jobStatus.pending': '待機中',
  'captures.jobStatus.running': '取得中',
  'captures.jobStatus.succeeded': '成功',
  'captures.jobStatus.failed': '失敗',
  'captures.fetcher': 'フェッチャー',
  'captures.createdAt': '作成日時',
  'captures.updatedAt': '更新日時',
  'captures.error': 'エラー',
  'captures.noJobsTitle': '取得履歴はありません',
  'captures.noJobsDescription': 'このキャプチャには取得履歴がありません。',
  'captures.noContentTitle': '取得したコンテンツはまだありません',
  'captures.noContentDescription': 'このキャプチャには成功したページコンテンツがありません。取得履歴を確認するか、再取得してください。',
  'captures.detailUnavailable': 'キャプチャの詳細を読み込めません',
  'captures.addNote': 'メモを追加',
  'captures.dataTransferBusy': '現在のデータ転送が完了するまでお待ちください。',
  'settings.exportDataDescription': '暗号化された Foundry スナップショットを作成します。',
  'settings.exportData': 'データをエクスポート',
  'settings.exportDataAction': 'エクスポート',
  'settings.finishJobsBeforeTransfer': '実行中の取得ジョブが完了するまでお待ちください。',
  'settings.importData': 'データをインポート',
  'settings.importDataAction': 'インポート',
  'settings.importDataDescription': '暗号化された Foundry スナップショットからデータを復元します。',
  'dataTransfer.exportTitle': 'Foundry データをエクスポート',
  'dataTransfer.exportSubtitle': 'パスフレーズでこのスナップショットを保護します。',
  'dataTransfer.passphrase': 'パスフレーズ',
  'dataTransfer.passphraseDescription': 'このバックアップの暗号化と復元に使用します。',
  'dataTransfer.confirmPassphrase': 'パスフレーズを確認',
  'dataTransfer.passphraseMismatch': 'パスフレーズが一致しません。',
  'dataTransfer.passphraseRequired': 'パスフレーズを入力してください。',
  'dataTransfer.passphraseWarning': '忘れたパスフレーズは復元できません。エクスポート前に安全な場所へ保管してください。',
  'dataTransfer.cancel': 'キャンセル',
  'dataTransfer.exportAction': '保存先を選択してエクスポート',
  'dataTransfer.exported': 'Foundry データをエクスポートしました。',
  'dataTransfer.importTitle': 'Foundry データをインポート',
  'dataTransfer.importPassphraseDescription': 'このスナップショットのエクスポート時に使用したパスフレーズを入力してください。',
  'dataTransfer.inspectAction': 'スナップショットを開く',
  'dataTransfer.previewTitle': 'インポートを確認',
  'dataTransfer.exportedAt': 'エクスポート日時',
  'dataTransfer.appVersion': 'Foundry バージョン',
  'dataTransfer.schemaVersion': 'データバージョン',
  'dataTransfer.providers': 'プロバイダー',
  'dataTransfer.captures': 'キャプチャ',
  'dataTransfer.jobs': 'ジョブ',
  'dataTransfer.replaceWarning': 'インポートすると、現在のプロバイダー、キャプチャ、ジョブ、アプリ設定がすべて置き換わります。完了後は Foundry が再起動します。',
  'dataTransfer.importAction': 'インポートして置き換える',
  'dataTransfer.importingTitle': 'データをインポート中',
  'dataTransfer.importingDescription': 'Foundry データをインポートしています…',
  'dataTransfer.importingHint': 'インポートが完了するまで Foundry を開いたままにしてください。',
  'dataTransfer.restartTitle': 'インポート完了',
  'dataTransfer.restartDescription': 'データをインポートしました。Foundry を再起動して読み込んでください。',
  'dataTransfer.restartHint': '再起動するまで現在のセッションはロックされます。',
  'dataTransfer.restartAction': 'Foundry を再起動',
  'dataTransfer.activeJobs': 'データをエクスポートまたはインポートする前に、実行中の取得ジョブを完了してください。',
  'dataTransfer.archiveHasActiveJobs': 'このスナップショットには未完了の取得ジョブが含まれているため、インポートできません。',
  'dataTransfer.busy': '別のデータ転送が進行中です。',
  'dataTransfer.importExpired': 'インポートセッションの有効期限が切れました。ファイルを選択し直してください。',
  'dataTransfer.invalidPassphrase': 'パスフレーズが正しくないか、スナップショットが破損しています。',
  'dataTransfer.newerVersion': 'このスナップショットは新しいバージョンの Foundry で作成されています。',
  'dataTransfer.unsupportedArchive': 'この Foundry バージョンではこのスナップショット形式をサポートしていません。',
  'dataTransfer.invalidArchive': '有効な Foundry スナップショットではありません。',
  'dataTransfer.ioError': 'データ転送を完了できませんでした。',
};

export const translations: Record<Locale, TranslationTable> = {
  'en-US': english,
  'zh-CN': simplifiedChinese,
  'zh-TW': traditionalChinese,
  'ja-JP': japanese,
};

export function resolveLocale(language: LanguageMode): Locale {
  const supportedLocales: Locale[] = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
  if (supportedLocales.includes(language as Locale)) {
    return language as Locale;
  }
  const browserLanguage = new Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (browserLanguage.startsWith('zh-tw') || browserLanguage.startsWith('zh-hk')) {
    return 'zh-TW';
  }
  if (browserLanguage.startsWith('zh')) {
    return 'zh-CN';
  }
  return browserLanguage.startsWith('ja') ? 'ja-JP' : 'en-US';
}
