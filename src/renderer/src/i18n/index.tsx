import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { InternationalizationProvider as AstryxInternationalizationProvider } from '@astryxdesign/core/i18n';
import zhCNMessages from '@astryxdesign/core/locales/zh-CN.generated.js';
import zhTWMessages from '@astryxdesign/core/locales/zh-TW.generated.js';
import jaJPMessages from '@astryxdesign/core/locales/ja-JP.generated.js';
import { useQuery } from '@tanstack/react-query';
import { getSettings, settingsKeys } from '@renderer/apis/settings';
import type { LanguageMode } from '@renderer/apis/settings';

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
    | 'providers.failedFetchModels' | 'providers.save' | 'providers.name' | 'providers.protocol' | 'providers.baseUrl' | 'providers.apiKey' | 'providers.hideApiKey' | 'providers.showApiKey' | 'providers.models' | 'providers.required' | 'providers.modelSources' | 'providers.modelsTemporary' | 'providers.aboutModelSources' | 'providers.fetchModels' | 'providers.modelId' | 'providers.customModelId' | 'providers.displayName' | 'providers.displayNameOptional' | 'providers.addCustomModel'
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
    | 'settings.appearance'
    | 'settings.languageRegion'
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
    | 'settings.capturesFetcher'
    | 'settings.capturesFetcherDescription'
    | 'settings.capturesNotConfigured'
    | 'settings.capturesApiKey'
    | 'settings.capturesApiKeyDescription'
    | 'settings.capturesApiKeyPlaceholder'
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
    | 'captures.addNote';

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
  'settings.appearance': 'Appearance',
  'settings.languageRegion': 'Language & region',
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
  'settings.capturesFetcher': 'Fetcher',
  'settings.capturesFetcherDescription': 'The service used to retrieve page content.',
  'settings.capturesNotConfigured': 'Not configured',
  'settings.capturesApiKey': 'API key',
  'settings.capturesApiKeyDescription': 'Authenticates requests to the selected fetch service.',
  'settings.capturesApiKeyPlaceholder': 'Enter an API key',
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
  'settings.languageRegion': '语言和地区',
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
  'settings.languageRegion': '語言與地區',
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
  'settings.languageRegion': '言語と地域',
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
};

const translations: Record<Locale, TranslationTable> = {
  'en-US': english,
  'zh-CN': simplifiedChinese,
  'zh-TW': traditionalChinese,
  'ja-JP': japanese,
};

function resolveLocale(language: LanguageMode): Locale {
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

const resources = Object.fromEntries(
  Object.entries(translations).map(([locale, table]) => [locale, { translation: table }]),
);

if (!i18n.isInitialized) {
  void i18n.init({
    resources,
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const language = settingsQuery.data?.workspace['language-region'].language ?? 'system';
  const locale = useMemo(() => resolveLocale(language), [language]);

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  return (
    <AstryxInternationalizationProvider
      locale={locale}
      messages={{
        'zh-CN': zhCNMessages,
        'zh-TW': zhTWMessages,
        'ja-JP': jaJPMessages,
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </AstryxInternationalizationProvider>
  );
}
