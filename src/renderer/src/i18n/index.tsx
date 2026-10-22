import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { InternationalizationProvider as AstryxInternationalizationProvider } from '@astryxdesign/core/i18n';
import zhCNMessages from '@astryxdesign/core/locales/zh-CN.generated.js';
import zhTWMessages from '@astryxdesign/core/locales/zh-TW.generated.js';
import jaJPMessages from '@astryxdesign/core/locales/ja-JP.generated.js';
import { useQuery } from '@tanstack/react-query';
import { getSettings, settingsKeys } from '@renderer/settings';
import type { LanguageMode } from '@renderer/settings';

export type Locale = Exclude<LanguageMode, 'system'>;

export type TranslationKey
  = | 'navigation.overview'
    | 'navigation.base'
    | 'navigation.baseDescription'
    | 'navigation.jobs'
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
    | 'settings.base'
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
    | 'settings.regionFormat'
    | 'settings.regionFormatDescription'
    | 'settings.timezone'
    | 'settings.timezoneDescription'
    | 'settings.system'
    | 'settings.light'
    | 'settings.dark'
    | 'settings.unitedStates'
    | 'settings.china'
    | 'settings.taiwan'
    | 'settings.japan'
    | 'settings.losAngeles'
    | 'settings.newYork'
    | 'settings.shanghai'
    | 'settings.taipei'
    | 'settings.tokyo'
    | 'settings.utc'
    | 'settings.noResults'
    | 'settings.trySearch'
    | 'settings.baseFetcher'
    | 'settings.baseFetcherDescription'
    | 'settings.baseNotConfigured'
    | 'settings.baseApiKey'
    | 'settings.baseApiKeyDescription'
    | 'settings.baseApiKeyPlaceholder'
    | 'settings.baseMaxAttempts'
    | 'settings.baseMaxAttemptsDescription'
    | 'settings.baseConcurrency'
    | 'settings.baseConcurrencyDescription'
    | 'base.captureAdded'
    | 'base.captureExists'
    | 'base.note'
    | 'base.toPaste'
    | 'base.pasteLink'
    | 'base.capturing'
    | 'base.enterToCapture'
    | 'base.configureFetcherFirst'
    | 'base.activeJobExists'
    | 'base.captureNotFound'
    | 'base.invalidUrl'
    | 'base.addCapture'
    | 'base.title'
    | 'base.openLink'
    | 'base.viewJobs'
    | 'base.recapture'
    | 'base.delete'
    | 'base.captureFilter'
    | 'base.allCaptures'
    | 'base.noCapturedContent'
    | 'base.refresh'
    | 'base.emptyTitle'
    | 'base.emptyDescription'
    | 'base.deleteCaptureTitle'
    | 'base.deleteCaptureDescription'
    | 'base.cancel'
    | 'base.recaptureStarted'
    | 'base.captureDeleted'
    | 'base.scrapeFailed'
    | 'base.jobStatus'
    | 'base.jobStatus.pending'
    | 'base.jobStatus.running'
    | 'base.jobStatus.succeeded'
    | 'base.jobStatus.failed'
    | 'base.fetcher'
    | 'base.createdAt'
    | 'base.updatedAt'
    | 'base.error'
    | 'base.backToCaptures'
    | 'base.noJobsTitle'
    | 'base.noJobsDescription'
    | 'base.addNote';

type TranslationTable = Record<TranslationKey, string>;

const english: TranslationTable = {
  'navigation.overview': 'Overview',
  'navigation.base': 'Base',
  'navigation.baseDescription': 'Collect links first, then organize them later.',
  'navigation.jobs': 'Jobs',
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
  'settings.base': 'Base',
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
  'settings.regionFormat': 'Region format',
  'settings.regionFormatDescription': 'Dates, numbers, and currency.',
  'settings.timezone': 'Time zone',
  'settings.timezoneDescription': 'Used for scheduling and every timestamp you see.',
  'settings.system': 'System',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.unitedStates': 'United States',
  'settings.china': 'China',
  'settings.taiwan': 'Taiwan',
  'settings.japan': 'Japan',
  'settings.losAngeles': 'Los Angeles (GMT-08:00)',
  'settings.newYork': 'New York (GMT-05:00)',
  'settings.shanghai': 'Shanghai (GMT+08:00)',
  'settings.taipei': 'Taipei (GMT+08:00)',
  'settings.tokyo': 'Tokyo (GMT+09:00)',
  'settings.utc': 'UTC (GMT+00:00)',
  'settings.noResults': 'No settings found',
  'settings.trySearch': 'Try theme, language, or sessions.',
  'settings.baseFetcher': 'Fetcher',
  'settings.baseFetcherDescription': 'The service used to retrieve page content.',
  'settings.baseNotConfigured': 'Not configured',
  'settings.baseApiKey': 'API key',
  'settings.baseApiKeyDescription': 'Authenticates requests to the selected fetch service.',
  'settings.baseApiKeyPlaceholder': 'Enter an API key',
  'settings.baseMaxAttempts': 'Maximum attempts',
  'settings.baseMaxAttemptsDescription': 'Total requests per scrape job, from 1 to 10.',
  'settings.baseConcurrency': 'Scrape concurrency',
  'settings.baseConcurrencyDescription': 'Maximum simultaneous scrape jobs, from 1 to 5.',
  'base.captureAdded': 'Capture added',
  'base.captureExists': 'This link is already captured',
  'base.note': 'Note',
  'base.toPaste': 'to paste',
  'base.pasteLink': 'Paste a link',
  'base.capturing': 'Capturing…',
  'base.enterToCapture': 'to capture',
  'base.configureFetcherFirst': 'Configure a Fetcher in Settings before capturing pages.',
  'base.activeJobExists': 'A scrape job is already running for this capture.',
  'base.captureNotFound': 'Capture not found.',
  'base.invalidUrl': 'Enter a valid HTTP or HTTPS URL.',
  'base.addCapture': 'Add a capture',
  'base.title': 'Title',
  'base.openLink': 'Open link',
  'base.viewJobs': 'View jobs',
  'base.recapture': 'Re-capture',
  'base.delete': 'Delete',
  'base.captureFilter': 'Filter captures',
  'base.allCaptures': 'All',
  'base.noCapturedContent': 'No captured content',
  'base.refresh': 'Refresh',
  'base.emptyTitle': 'No captures yet',
  'base.emptyDescription': 'Paste a link to start collecting.',
  'base.deleteCaptureTitle': 'Delete capture?',
  'base.deleteCaptureDescription': 'The capture and its scrape history will be hidden from Base.',
  'base.cancel': 'Cancel',
  'base.recaptureStarted': 'Re-capture started',
  'base.captureDeleted': 'Capture deleted',
  'base.scrapeFailed': 'Page fetch failed',
  'base.jobStatus': 'Status',
  'base.jobStatus.pending': 'Pending',
  'base.jobStatus.running': 'Running',
  'base.jobStatus.succeeded': 'Succeeded',
  'base.jobStatus.failed': 'Failed',
  'base.fetcher': 'Fetcher',
  'base.createdAt': 'Created at',
  'base.updatedAt': 'Updated at',
  'base.error': 'Error',
  'base.backToCaptures': 'Back to captures',
  'base.noJobsTitle': 'No scrape jobs',
  'base.noJobsDescription': 'This capture does not have any scrape history.',
  'base.addNote': 'Add a note',
};

const simplifiedChinese: TranslationTable = {
  ...english,
  'navigation.overview': '概览',
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
  'settings.regionFormat': '地区格式',
  'settings.regionFormatDescription': '日期、数字和货币格式。',
  'settings.timezone': '时区',
  'settings.timezoneDescription': '用于日程安排和所有时间戳。',
  'settings.system': '跟随系统',
  'settings.light': '浅色',
  'settings.dark': '深色',
  'settings.unitedStates': '美国',
  'settings.china': '中国',
  'settings.taiwan': '中国台湾',
  'settings.japan': '日本',
  'settings.losAngeles': '洛杉矶（GMT-08:00）',
  'settings.newYork': '纽约（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '东京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '未找到设置',
  'settings.trySearch': '试试搜索主题、语言或会话。',
  'navigation.base': 'Base',
  'navigation.baseDescription': '先收集链接，之后再整理。',
  'navigation.jobs': '抓取记录',
  'overview.title': '欢迎回来',
  'settings.features': '功能',
  'settings.base': 'Base',
  'settings.baseFetcher': '抓取服务',
  'settings.baseFetcherDescription': '用于获取网页内容的服务。',
  'settings.baseNotConfigured': '未配置',
  'settings.baseApiKey': 'API 密钥',
  'settings.baseApiKeyDescription': '用于向所选抓取服务认证请求。',
  'settings.baseApiKeyPlaceholder': '输入 API 密钥',
  'settings.baseMaxAttempts': '最大尝试次数',
  'settings.baseMaxAttemptsDescription': '每个抓取任务的总请求次数，1 到 10。',
  'settings.baseConcurrency': '抓取并发数',
  'settings.baseConcurrencyDescription': '同时运行的抓取任务上限，1 到 5。',
  'base.captureAdded': '已收藏',
  'base.captureExists': '这个链接已经收藏过了',
  'base.note': '备注',
  'base.toPaste': '粘贴',
  'base.pasteLink': '粘贴链接',
  'base.capturing': '正在收藏…',
  'base.enterToCapture': '收藏',
  'base.configureFetcherFirst': '请先在设置中配置抓取服务。',
  'base.activeJobExists': '这条收藏已有正在运行的抓取任务。',
  'base.captureNotFound': '找不到这条收藏。',
  'base.invalidUrl': '请输入有效的 HTTP 或 HTTPS 链接。',
  'base.addCapture': '添加收藏',
  'base.title': '标题',
  'base.openLink': '打开链接',
  'base.viewJobs': '查看抓取记录',
  'base.recapture': '重新抓取',
  'base.delete': '删除',
  'base.captureFilter': '筛选收藏',
  'base.allCaptures': '全部',
  'base.noCapturedContent': '尚未采集到内容',
  'base.refresh': '刷新',
  'base.emptyTitle': '还没有收藏',
  'base.emptyDescription': '粘贴一个链接开始收集。',
  'base.deleteCaptureTitle': '删除这条收藏？',
  'base.deleteCaptureDescription': '该收藏及其抓取历史将从 Base 中隐藏。',
  'base.cancel': '取消',
  'base.recaptureStarted': '已开始重新抓取',
  'base.captureDeleted': '收藏已删除',
  'base.scrapeFailed': '网页抓取失败',
  'base.jobStatus': '状态',
  'base.jobStatus.pending': '等待中',
  'base.jobStatus.running': '抓取中',
  'base.jobStatus.succeeded': '已成功',
  'base.jobStatus.failed': '已失败',
  'base.fetcher': '抓取服务',
  'base.createdAt': '创建时间',
  'base.updatedAt': '更新时间',
  'base.error': '错误',
  'base.backToCaptures': '返回收藏',
  'base.noJobsTitle': '没有抓取记录',
  'base.noJobsDescription': '这条收藏还没有抓取历史。',
  'base.addNote': '添加备注',
};

const traditionalChinese: TranslationTable = {
  ...simplifiedChinese,
  'navigation.overview': '總覽',
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
  'settings.regionFormat': '地區格式',
  'settings.regionFormatDescription': '日期、數字與貨幣格式。',
  'settings.timezone': '時區',
  'settings.timezoneDescription': '用於排程與所有時間戳記。',
  'settings.system': '跟隨系統',
  'settings.light': '淺色',
  'settings.dark': '深色',
  'settings.unitedStates': '美國',
  'settings.china': '中國',
  'settings.taiwan': '台灣',
  'settings.japan': '日本',
  'settings.losAngeles': '洛杉磯（GMT-08:00）',
  'settings.newYork': '紐約（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '東京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '找不到設定',
  'settings.trySearch': '試著搜尋主題、語言或工作階段。',
  'navigation.base': 'Base',
  'navigation.baseDescription': '先收集連結，之後再整理。',
  'navigation.jobs': '抓取紀錄',
  'overview.title': '歡迎回來',
  'settings.features': '功能',
  'settings.base': 'Base',
  'settings.baseFetcher': '抓取服務',
  'settings.baseFetcherDescription': '用於取得網頁內容的服務。',
  'settings.baseNotConfigured': '尚未設定',
  'settings.baseApiKey': 'API 金鑰',
  'settings.baseApiKeyDescription': '用於向所選抓取服務驗證請求。',
  'settings.baseApiKeyPlaceholder': '輸入 API 金鑰',
  'settings.baseMaxAttempts': '最大嘗試次數',
  'settings.baseMaxAttemptsDescription': '每個抓取工作的總請求次數，1 到 10。',
  'settings.baseConcurrency': '抓取並行數',
  'settings.baseConcurrencyDescription': '同時執行的抓取工作上線，1 到 5。',
  'base.captureAdded': '已收藏',
  'base.captureExists': '這個連結已經收藏過了',
  'base.note': '備註',
  'base.toPaste': '貼上',
  'base.pasteLink': '貼上連結',
  'base.capturing': '正在收藏…',
  'base.enterToCapture': '收藏',
  'base.configureFetcherFirst': '請先在設定中設定抓取服務。',
  'base.activeJobExists': '這筆收藏已有正在執行的抓取工作。',
  'base.captureNotFound': '找不到這筆收藏。',
  'base.invalidUrl': '請輸入有效的 HTTP 或 HTTPS 連結。',
  'base.addCapture': '新增收藏',
  'base.title': '標題',
  'base.openLink': '開啟連結',
  'base.viewJobs': '查看抓取紀錄',
  'base.recapture': '重新抓取',
  'base.delete': '刪除',
  'base.captureFilter': '篩選收藏',
  'base.allCaptures': '全部',
  'base.noCapturedContent': '尚未取得內容',
  'base.refresh': '重新整理',
  'base.emptyTitle': '還沒有收藏',
  'base.emptyDescription': '貼上一個連結開始收集。',
  'base.deleteCaptureTitle': '刪除這筆收藏？',
  'base.deleteCaptureDescription': '這筆收藏及其抓取紀錄將從 Base 中隱藏。',
  'base.cancel': '取消',
  'base.recaptureStarted': '已開始重新抓取',
  'base.captureDeleted': '收藏已刪除',
  'base.scrapeFailed': '網頁抓取失敗',
  'base.jobStatus': '狀態',
  'base.jobStatus.pending': '等待中',
  'base.jobStatus.running': '抓取中',
  'base.jobStatus.succeeded': '已成功',
  'base.jobStatus.failed': '已失敗',
  'base.fetcher': '抓取服務',
  'base.createdAt': '建立時間',
  'base.updatedAt': '更新時間',
  'base.error': '錯誤',
  'base.backToCaptures': '返回收藏',
  'base.noJobsTitle': '沒有抓取紀錄',
  'base.noJobsDescription': '這筆收藏還沒有抓取紀錄。',
  'base.addNote': '新增備註',
};

const japanese: TranslationTable = {
  ...english,
  'navigation.overview': '概要',
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
  'settings.regionFormat': '地域の形式',
  'settings.regionFormatDescription': '日付、数値、通貨の形式。',
  'settings.timezone': 'タイムゾーン',
  'settings.timezoneDescription': 'スケジュールとすべてのタイムスタンプに使用します。',
  'settings.system': 'システム',
  'settings.light': 'ライト',
  'settings.dark': 'ダーク',
  'settings.unitedStates': 'アメリカ合衆国',
  'settings.china': '中国',
  'settings.taiwan': '台湾',
  'settings.japan': '日本',
  'settings.losAngeles': 'ロサンゼルス（GMT-08:00）',
  'settings.newYork': 'ニューヨーク（GMT-05:00）',
  'settings.shanghai': '上海（GMT+08:00）',
  'settings.taipei': '台北（GMT+08:00）',
  'settings.tokyo': '東京（GMT+09:00）',
  'settings.utc': 'UTC（GMT+00:00）',
  'settings.noResults': '設定が見つかりません',
  'settings.trySearch': 'テーマ、言語、セッションを検索してみてください。',
  'navigation.base': 'Base',
  'navigation.baseDescription': 'まずリンクを集め、後から整理します。',
  'navigation.jobs': '取得履歴',
  'overview.title': 'おかえりなさい',
  'settings.features': '機能',
  'settings.base': 'Base',
  'settings.baseFetcher': 'フェッチャー',
  'settings.baseFetcherDescription': 'ページ内容を取得するサービス。',
  'settings.baseNotConfigured': '未設定',
  'settings.baseApiKey': 'API キー',
  'settings.baseApiKeyDescription': '選択した取得サービスへのリクエストを認証します。',
  'settings.baseApiKeyPlaceholder': 'API キーを入力',
  'settings.baseMaxAttempts': '最大試行回数',
  'settings.baseMaxAttemptsDescription': 'ジョブごとの総リクエスト数（1〜10）。',
  'settings.baseConcurrency': '取得の同時実行数',
  'settings.baseConcurrencyDescription': '同時に実行する取得ジョブの上限（1〜5）。',
  'base.captureAdded': 'キャプチャしました',
  'base.captureExists': 'このリンクはすでにキャプチャ済みです',
  'base.note': 'メモ',
  'base.toPaste': '貼り付け',
  'base.pasteLink': 'リンクを貼り付け',
  'base.capturing': 'キャプチャ中…',
  'base.enterToCapture': 'キャプチャする',
  'base.configureFetcherFirst': '先に設定でフェッチャーを構成してください。',
  'base.activeJobExists': 'このキャプチャには実行中の取得ジョブがあります。',
  'base.captureNotFound': 'キャプチャが見つかりません。',
  'base.invalidUrl': '有効な HTTP または HTTPS URL を入力してください。',
  'base.addCapture': 'キャプチャを追加',
  'base.title': 'タイトル',
  'base.openLink': 'リンクを開く',
  'base.viewJobs': '取得履歴を見る',
  'base.recapture': '再取得',
  'base.delete': '削除',
  'base.captureFilter': 'キャプチャを絞り込む',
  'base.allCaptures': 'すべて',
  'base.noCapturedContent': '取得内容なし',
  'base.refresh': '更新',
  'base.emptyTitle': 'キャプチャはまだありません',
  'base.emptyDescription': 'リンクを貼り付けて収集を始めましょう。',
  'base.deleteCaptureTitle': 'キャプチャを削除しますか？',
  'base.deleteCaptureDescription': 'キャプチャと取得履歴は Base から非表示になります。',
  'base.cancel': 'キャンセル',
  'base.recaptureStarted': '再取得を開始しました',
  'base.captureDeleted': 'キャプチャを削除しました',
  'base.scrapeFailed': 'ページの取得に失敗しました',
  'base.jobStatus': '状態',
  'base.jobStatus.pending': '待機中',
  'base.jobStatus.running': '取得中',
  'base.jobStatus.succeeded': '成功',
  'base.jobStatus.failed': '失敗',
  'base.fetcher': 'フェッチャー',
  'base.createdAt': '作成日時',
  'base.updatedAt': '更新日時',
  'base.error': 'エラー',
  'base.backToCaptures': 'キャプチャに戻る',
  'base.noJobsTitle': '取得履歴はありません',
  'base.noJobsDescription': 'このキャプチャには取得履歴がありません。',
  'base.addNote': 'メモを追加',
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
