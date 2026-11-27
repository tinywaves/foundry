import type { LanguageMode } from '@dhzh/foundry-shared';

export type Locale = Exclude<LanguageMode, 'system'>;

export type TranslationKey
  = | 'common.clear'
    | 'common.close'
    | 'navigation.overview'
    | 'navigation.capturesDescription'
    | 'navigation.jobs'
    | 'navigation.jobsDescription'
    | 'navigation.captures'
    | 'navigation.sessions'
    | 'navigation.sessionsDescription'
    | 'navigation.captureDetails'
    | 'navigation.captureDetailsDescription'
    | 'navigation.library'
    | 'navigation.prompts'
    | 'navigation.providers'
    | 'navigation.main'
    | 'navigation.account'
    | 'navigation.back'
    | 'navigation.openNavigation'
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
    | 'fetchers.firecrawl'
    | 'navigation.notFound'
    | 'navigation.newProvider'
    | 'navigation.editProvider'
    | 'navigation.providersDescription'
    | 'providers.avatar'
    | 'providers.avatarDescription'
    | 'providers.avatarUpload'
    | 'providers.avatarChange'
    | 'providers.avatarRemove'
    | 'providers.avatarInvalid'
    | 'providers.saveFailed'
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
    | 'captures.fetchFailed'
    | 'captures.jobStatus'
    | 'captures.jobStatus.pending'
    | 'captures.jobStatus.running'
    | 'captures.jobStatus.succeeded'
    | 'captures.jobStatus.failed'
    | 'captures.fetcher'
    | 'captures.creditsUsed'
    | 'captures.createdAt'
    | 'captures.updatedAt'
    | 'captures.error'
    | 'captures.noJobsTitle'
    | 'captures.noJobsDescription'
    | 'captures.noResponseTitle'
    | 'captures.noResponseDescription'
    | 'captures.rawResponse'
    | 'captures.detailUnavailable'
    | 'captures.addNote'
    | 'sessions.source'
    | 'sessions.codex'
    | 'sessions.claudeCode'
    | 'sessions.refresh'
    | 'sessions.archived'
    | 'sessions.subagents'
    | 'sessions.subagent'
    | 'sessions.unknownDirectory'
    | 'sessions.thread'
    | 'sessions.updated'
    | 'sessions.size'
    | 'sessions.tokens'
    | 'sessions.model'
    | 'sessions.sessionCount'
    | 'sessions.sessionCount_one'
    | 'sessions.sessionCount_other'
    | 'sessions.includeArchived'
    | 'sessions.loading'
    | 'sessions.showArchivedHint'
    | 'sessions.noReadableTitle'
    | 'sessions.noReadableDescription'
    | 'sessions.filesUnreadable_one'
    | 'sessions.filesUnreadable_other'
    | 'sessions.emptyTitle'
    | 'sessions.emptyDescription'
    | 'sessions.errorTitle'
    | 'sessions.errorDescription'
    | 'sessions.noThreadsTitle'
    | 'sessions.noThreadsDescription'
    | 'sessions.warningTitle'
    | 'sessions.filesUnreadable'

type TranslationTable = Record<TranslationKey, string>;

const english: TranslationTable = {
  'common.clear': 'Clear',
  'common.close': 'Close',
  'navigation.overview': 'Overview',
  'navigation.capturesDescription': 'Collect links first, then organize them later.',
  'navigation.jobs': 'Jobs',
  'navigation.jobsDescription': 'Review fetch history and errors for this capture.',
  'navigation.captures': 'Captures',
  'navigation.captureDetails': 'Capture details',
  'navigation.captureDetailsDescription': 'Inspect the latest successful response from the configured fetcher.',
  'navigation.library': 'Library',
  'navigation.prompts': 'Prompts',
  'navigation.sessions': 'Sessions',
  'navigation.sessionsDescription': 'Browse local agent sessions, grouped by working directory.',
  'navigation.providers': 'Providers',
  'navigation.main': 'Main',
  'navigation.account': 'Account',
  'navigation.back': 'Back',
  'navigation.openNavigation': 'Open navigation',
  'navigation.windowTitlebar': 'Window titlebar',
  'sessions.source': 'Session source',
  'sessions.codex': 'ChatGPT',
  'sessions.claudeCode': 'Claude Code',
  'sessions.refresh': 'Refresh',
  'sessions.archived': 'Archived',
  'sessions.subagents': 'Subagents',
  'sessions.subagent': 'Subagent',
  'sessions.unknownDirectory': 'Unknown directory',
  'sessions.thread': 'Session',
  'sessions.updated': 'Last activity',
  'sessions.size': 'File size',
  'sessions.tokens': 'Tokens',
  'sessions.model': 'Model',
  'sessions.sessionCount': '{{count}} sessions',
  'sessions.sessionCount_one': '{{count}} session',
  'sessions.sessionCount_other': '{{count}} sessions',
  'sessions.includeArchived': 'Include archived',
  'sessions.loading': 'Reading local session records…',
  'sessions.showArchivedHint': 'Select “Include archived” to show archived sessions.',
  'sessions.noReadableTitle': 'No sessions could be read',
  'sessions.noReadableDescription': 'Refresh to try reading the session records again.',
  'sessions.filesUnreadable_one': '{{count}} session file could not be fully read. Try refreshing.',
  'sessions.filesUnreadable_other': '{{count}} session files could not be fully read. Try refreshing.',
  'sessions.emptyTitle': 'No {{source}} sessions',
  'sessions.emptyDescription': 'No local {{source}} session records were found. Start a conversation in {{source}}, then refresh.',
  'sessions.errorTitle': 'Could not read session records',
  'sessions.errorDescription': 'Local session records could not be read. Try refreshing.',
  'sessions.noThreadsTitle': 'No sessions match the filters',
  'sessions.noThreadsDescription': 'Try changing the session filters.',
  'sessions.warningTitle': 'Some records could not be read',
  'sessions.filesUnreadable': '{{count}} session files could not be fully read. Try refreshing.',
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
  'fetchers.firecrawl': 'Firecrawl',
  'navigation.notFound': 'Page not found',
  'navigation.newProvider': 'New provider',
  'navigation.editProvider': 'Edit provider',
  'navigation.providersDescription': 'Manage the model service connections used by Foundry.',
  'providers.avatar': 'Avatar',
  'providers.avatarDescription': 'Choose a PNG, JPEG, GIF, WebP, or SVG image up to 2 MB.',
  'providers.avatarUpload': 'Upload avatar',
  'providers.avatarChange': 'Change avatar',
  'providers.avatarRemove': 'Remove avatar',
  'providers.avatarInvalid': 'Choose a valid PNG, JPEG, GIF, WebP, or SVG image up to 2 MB.',
  'providers.saveFailed': 'Unable to save this provider. Please try again.',
  'captures.captureAdded': 'Capture added',
  'captures.captureExists': 'This link is already captured',
  'captures.note': 'Note',
  'captures.toPaste': 'to paste',
  'captures.pasteLink': 'Paste a link',
  'captures.capturing': 'Capturing…',
  'captures.enterToCapture': 'to capture',
  'captures.configureFetcherFirst': 'Configure a fetcher before capturing pages.',
  'captures.activeJobExists': 'A fetch job is already running for this capture.',
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
  'captures.fetchFailed': 'Link discovery failed',
  'captures.jobStatus': 'Status',
  'captures.jobStatus.pending': 'Pending',
  'captures.jobStatus.running': 'Running',
  'captures.jobStatus.succeeded': 'Succeeded',
  'captures.jobStatus.failed': 'Failed',
  'captures.fetcher': 'Fetcher',
  'captures.creditsUsed': 'Credits',
  'captures.createdAt': 'Created at',
  'captures.updatedAt': 'Updated at',
  'captures.error': 'Error',
  'captures.noJobsTitle': 'No fetch jobs',
  'captures.noJobsDescription': 'This capture does not have any fetch history.',
  'captures.noResponseTitle': 'No fetcher response yet',
  'captures.noResponseDescription': 'This capture has no successful response from the configured fetcher. Review its jobs or re-capture it.',
  'captures.rawResponse': 'Raw fetcher response',
  'captures.detailUnavailable': 'Capture details are unavailable',
  'captures.addNote': 'Add a note',
};

const simplifiedChinese: TranslationTable = {
  ...english,
  'common.clear': '清空',
  'common.close': '关闭',
  'navigation.overview': '概览',
  'navigation.captures': '收藏',
  'navigation.captureDetails': '收藏详情',
  'navigation.captureDetailsDescription': '查看已配置抓取服务最近一次成功的响应。',
  'navigation.library': '资料库',
  'navigation.prompts': '提示词',
  'navigation.sessions': '会话',
  'navigation.sessionsDescription': '浏览本地智能体会话，按工作目录分组。',
  'navigation.providers': '服务提供商',
  'navigation.main': '主要功能',
  'navigation.account': '账户',
  'navigation.back': '返回',
  'navigation.openNavigation': '打开导航',
  'navigation.windowTitlebar': '窗口标题栏',
  'sessions.source': '会话来源',
  'sessions.codex': 'ChatGPT',
  'sessions.claudeCode': 'Claude Code',
  'sessions.refresh': '刷新',
  'sessions.archived': '已归档',
  'sessions.subagents': '子代理',
  'sessions.subagent': '子代理',
  'sessions.unknownDirectory': '未知目录',
  'sessions.thread': '会话',
  'sessions.updated': '最近活动',
  'sessions.size': '文件大小',
  'sessions.tokens': 'Token',
  'sessions.model': '模型',
  'sessions.sessionCount': '{{count}} 个会话',
  'sessions.sessionCount_one': '{{count}} 个会话',
  'sessions.sessionCount_other': '{{count}} 个会话',
  'sessions.includeArchived': '包含已归档',
  'sessions.loading': '正在读取本地会话记录…',
  'sessions.showArchivedHint': '勾选“包含已归档”以显示已归档会话。',
  'sessions.noReadableTitle': '未能读取到会话',
  'sessions.noReadableDescription': '请刷新，重新尝试读取会话记录。',
  'sessions.filesUnreadable_one': '{{count}} 个会话文件未能完整读取，请刷新重试。',
  'sessions.filesUnreadable_other': '{{count}} 个会话文件未能完整读取，请刷新重试。',
  'sessions.emptyTitle': '暂无 {{source}} 会话',
  'sessions.emptyDescription': '未找到本地 {{source}} 会话记录。请先在 {{source}} 中开始对话，然后刷新。',
  'sessions.errorTitle': '无法读取会话记录',
  'sessions.errorDescription': '无法读取本地会话记录，请刷新重试。',
  'sessions.noThreadsTitle': '没有符合筛选条件的会话',
  'sessions.noThreadsDescription': '请尝试调整会话筛选条件。',
  'sessions.warningTitle': '部分会话记录未能完整读取',
  'sessions.filesUnreadable': '{{count}} 个会话文件未能完整读取，请刷新重试。',
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
  'providers.avatar': '头像',
  'providers.avatarDescription': '选择不超过 2 MB 的 PNG、JPEG、GIF、WebP 或 SVG 图片。',
  'providers.avatarUpload': '上传头像',
  'providers.avatarChange': '更换头像',
  'providers.avatarRemove': '移除头像',
  'providers.avatarInvalid': '请选择有效且不超过 2 MB 的 PNG、JPEG、GIF、WebP 或 SVG 图片。',
  'providers.saveFailed': '服务商保存失败，请重试。',
  'navigation.capturesDescription': '先收集链接，之后再整理。',
  'navigation.jobs': '抓取记录',
  'navigation.jobsDescription': '查看这条收藏的抓取任务历史与错误。',
  'overview.title': '欢迎回来',
  'captures.captureAdded': '已收藏',
  'captures.captureExists': '这个链接已经收藏过了',
  'captures.note': '备注',
  'captures.toPaste': '粘贴',
  'captures.pasteLink': '粘贴链接',
  'captures.capturing': '正在收藏…',
  'captures.enterToCapture': '收藏',
  'captures.configureFetcherFirst': '请先在配置抓取服务。',
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
  'captures.fetchFailed': '链接发现失败',
  'captures.jobStatus': '状态',
  'captures.jobStatus.pending': '等待中',
  'captures.jobStatus.running': '抓取中',
  'captures.jobStatus.succeeded': '已成功',
  'captures.jobStatus.failed': '已失败',
  'captures.fetcher': '抓取服务',
  'captures.creditsUsed': '消耗额度',
  'captures.createdAt': '创建时间',
  'captures.updatedAt': '更新时间',
  'captures.error': '错误',
  'captures.noJobsTitle': '没有抓取记录',
  'captures.noJobsDescription': '这条收藏还没有抓取历史。',
  'captures.noResponseTitle': '还没有抓取服务响应',
  'captures.noResponseDescription': '这条收藏尚无已配置抓取服务返回的成功响应。请查看任务记录或重新抓取。',
  'captures.rawResponse': '抓取服务原始响应',
  'captures.detailUnavailable': '无法加载收藏详情',
  'captures.addNote': '添加备注',
};

const traditionalChinese: TranslationTable = {
  ...simplifiedChinese,
  'common.clear': '清空',
  'common.close': '關閉',
  'navigation.overview': '總覽',
  'navigation.captures': '收藏',
  'navigation.captureDetails': '收藏詳情',
  'navigation.captureDetailsDescription': '檢視已設定抓取服務最近一次成功的回應。',
  'navigation.library': '資料庫',
  'navigation.prompts': '提示詞',
  'navigation.sessions': '對話',
  'navigation.sessionsDescription': '瀏覽本機 AI 代理的對話，依工作目錄分組。',
  'navigation.providers': '服務提供者',
  'navigation.main': '主要功能',
  'navigation.account': '帳戶',
  'navigation.back': '返回',
  'navigation.openNavigation': '開啟導覽',
  'navigation.windowTitlebar': '視窗標題列',
  'sessions.source': '對話來源',
  'sessions.codex': 'ChatGPT',
  'sessions.claudeCode': 'Claude Code',
  'sessions.refresh': '重新整理',
  'sessions.archived': '已封存',
  'sessions.subagents': '子代理',
  'sessions.subagent': '子代理',
  'sessions.unknownDirectory': '未知目錄',
  'sessions.thread': '對話',
  'sessions.updated': '最近活動',
  'sessions.size': '檔案大小',
  'sessions.tokens': 'Token',
  'sessions.model': '模型',
  'sessions.sessionCount': '{{count}} 個對話',
  'sessions.sessionCount_one': '{{count}} 個對話',
  'sessions.sessionCount_other': '{{count}} 個對話',
  'sessions.includeArchived': '包含已封存',
  'sessions.loading': '正在讀取本機對話紀錄…',
  'sessions.showArchivedHint': '勾選「包含已封存」以顯示已封存的對話。',
  'sessions.noReadableTitle': '未能讀取任何對話',
  'sessions.noReadableDescription': '請重新整理，再次嘗試讀取對話紀錄。',
  'sessions.filesUnreadable_one': '{{count}} 個對話檔案未能完整讀取，請重新整理後再試一次。',
  'sessions.filesUnreadable_other': '{{count}} 個對話檔案未能完整讀取，請重新整理後再試一次。',
  'sessions.emptyTitle': '尚無 {{source}} 對話',
  'sessions.emptyDescription': '找不到本機的 {{source}} 對話紀錄。請先在 {{source}} 中開始對話，再重新整理。',
  'sessions.errorTitle': '無法讀取對話紀錄',
  'sessions.errorDescription': '無法讀取本機對話紀錄，請重新整理後再試一次。',
  'sessions.noThreadsTitle': '沒有符合篩選條件的對話',
  'sessions.noThreadsDescription': '請嘗試調整對話篩選條件。',
  'sessions.warningTitle': '部分對話紀錄未能完整讀取',
  'sessions.filesUnreadable': '{{count}} 個對話檔案未能完整讀取，請重新整理後再試一次。',
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
  'providers.avatar': '頭像',
  'providers.avatarDescription': '選擇不超過 2 MB 的 PNG、JPEG、GIF、WebP 或 SVG 圖片。',
  'providers.avatarUpload': '上傳頭像',
  'providers.avatarChange': '更換頭像',
  'providers.avatarRemove': '移除頭像',
  'providers.avatarInvalid': '請選擇有效且不超過 2 MB 的 PNG、JPEG、GIF、WebP 或 SVG 圖片。',
  'providers.saveFailed': '服務商儲存失敗，請重試。',
  'navigation.capturesDescription': '先收集連結，之後再整理。',
  'navigation.jobs': '抓取紀錄',
  'navigation.jobsDescription': '查看這筆收藏的抓取工作紀錄與錯誤。',
  'overview.title': '歡迎回來',
  'captures.captureAdded': '已收藏',
  'captures.captureExists': '這個連結已經收藏過了',
  'captures.note': '備註',
  'captures.toPaste': '貼上',
  'captures.pasteLink': '貼上連結',
  'captures.capturing': '正在收藏…',
  'captures.enterToCapture': '收藏',
  'captures.configureFetcherFirst': '請先在設定抓取服務。',
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
  'captures.fetchFailed': '連結探索失敗',
  'captures.jobStatus': '狀態',
  'captures.jobStatus.pending': '等待中',
  'captures.jobStatus.running': '抓取中',
  'captures.jobStatus.succeeded': '已成功',
  'captures.jobStatus.failed': '已失敗',
  'captures.fetcher': '抓取服務',
  'captures.creditsUsed': '消耗額度',
  'captures.createdAt': '建立時間',
  'captures.updatedAt': '更新時間',
  'captures.error': '錯誤',
  'captures.noJobsTitle': '沒有抓取紀錄',
  'captures.noJobsDescription': '這筆收藏還沒有抓取紀錄。',
  'captures.noResponseTitle': '還沒有抓取服務回應',
  'captures.noResponseDescription': '這筆收藏尚無已設定抓取服務傳回的成功回應。請查看工作紀錄或重新抓取。',
  'captures.rawResponse': '抓取服務原始回應',
  'captures.detailUnavailable': '無法載入收藏詳情',
  'captures.addNote': '新增備註',
};

const japanese: TranslationTable = {
  ...english,
  'common.clear': 'クリア',
  'common.close': '閉じる',
  'navigation.overview': '概要',
  'navigation.captures': 'キャプチャ',
  'navigation.library': 'ライブラリ',
  'navigation.prompts': 'プロンプト',
  'navigation.sessions': 'セッション',
  'navigation.sessionsDescription': 'ローカルのエージェントセッションを作業ディレクトリ別に表示します。',
  'navigation.providers': 'プロバイダー',
  'navigation.main': 'メイン',
  'navigation.account': 'アカウント',
  'navigation.back': '戻る',
  'navigation.openNavigation': 'ナビゲーションを開く',
  'navigation.windowTitlebar': 'ウィンドウタイトルバー',
  'sessions.source': 'セッションの作成元',
  'sessions.codex': 'ChatGPT',
  'sessions.claudeCode': 'Claude Code',
  'sessions.refresh': '再読み込み',
  'sessions.archived': 'アーカイブ済み',
  'sessions.subagents': 'サブエージェント',
  'sessions.subagent': 'サブエージェント',
  'sessions.unknownDirectory': '不明なディレクトリ',
  'sessions.thread': 'セッション',
  'sessions.updated': '最終アクティビティ',
  'sessions.size': 'ファイルサイズ',
  'sessions.tokens': 'Token',
  'sessions.model': 'モデル',
  'sessions.sessionCount': '{{count}} 件のセッション',
  'sessions.sessionCount_one': '{{count}} 件のセッション',
  'sessions.sessionCount_other': '{{count}} 件のセッション',
  'sessions.includeArchived': 'アーカイブ済みを含める',
  'sessions.loading': 'セッション記録を読み込み中…',
  'sessions.showArchivedHint': '「アーカイブ済みを含める」を選択すると、アーカイブ済みのセッションが表示されます。',
  'sessions.noReadableTitle': 'セッションを読み込めませんでした',
  'sessions.noReadableDescription': '再読み込みして、セッション記録の読み込みをやり直してください。',
  'sessions.filesUnreadable_one': '{{count}} 件のセッションファイルを完全に読み込めませんでした。再読み込みしてください。',
  'sessions.filesUnreadable_other': '{{count}} 件のセッションファイルを完全に読み込めませんでした。再読み込みしてください。',
  'sessions.emptyTitle': '{{source}} のセッションがありません',
  'sessions.emptyDescription': 'ローカルに {{source}} のセッション記録が見つかりません。{{source}} で会話を始めてから再読み込みしてください。',
  'sessions.errorTitle': 'セッション記録を読み込めませんでした',
  'sessions.errorDescription': 'ローカルのセッション記録を読み込めませんでした。再読み込みしてください。',
  'sessions.noThreadsTitle': '条件に一致するセッションがありません',
  'sessions.noThreadsDescription': 'セッションの絞り込み条件を変更してください。',
  'sessions.warningTitle': '一部の記録を読み込めませんでした',
  'sessions.filesUnreadable': '{{count}} 件のセッションファイルを完全に読み込めませんでした。再読み込みしてください。',
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
  'providers.avatar': 'アバター',
  'providers.avatarDescription': '2 MB 以下の PNG、JPEG、GIF、WebP、SVG 画像を選択してください。',
  'providers.avatarUpload': '画像をアップロード',
  'providers.avatarChange': '画像を変更',
  'providers.avatarRemove': '画像を削除',
  'providers.avatarInvalid': '2 MB 以下の有効な PNG、JPEG、GIF、WebP、SVG 画像を選択してください。',
  'providers.saveFailed': 'プロバイダーを保存できませんでした。もう一度お試しください。',
  'navigation.capturesDescription': 'まずリンクを集め、後から整理します。',
  'navigation.jobs': '取得履歴',
  'navigation.jobsDescription': 'このキャプチャの取得履歴とエラーを確認します。',
  'navigation.captureDetails': 'キャプチャの詳細',
  'navigation.captureDetailsDescription': '設定済みフェッチャーから最後に成功したレスポンスを表示します。',
  'overview.title': 'おかえりなさい',
  'captures.captureAdded': 'キャプチャしました',
  'captures.captureExists': 'このリンクはすでにキャプチャ済みです',
  'captures.note': 'メモ',
  'captures.toPaste': '貼り付け',
  'captures.pasteLink': 'リンクを貼り付け',
  'captures.capturing': 'キャプチャ中…',
  'captures.enterToCapture': 'キャプチャする',
  'captures.configureFetcherFirst': '先にフェッチャーを構成してください。',
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
  'captures.fetchFailed': 'リンク探索に失敗しました',
  'captures.jobStatus': '状態',
  'captures.jobStatus.pending': '待機中',
  'captures.jobStatus.running': '取得中',
  'captures.jobStatus.succeeded': '成功',
  'captures.jobStatus.failed': '失敗',
  'captures.fetcher': 'フェッチャー',
  'captures.creditsUsed': 'クレジット',
  'captures.createdAt': '作成日時',
  'captures.updatedAt': '更新日時',
  'captures.error': 'エラー',
  'captures.noJobsTitle': '取得履歴はありません',
  'captures.noJobsDescription': 'このキャプチャには取得履歴がありません。',
  'captures.noResponseTitle': 'フェッチャーのレスポンスはまだありません',
  'captures.noResponseDescription': 'このキャプチャには設定済みフェッチャーから成功したレスポンスがありません。取得履歴を確認するか、再取得してください。',
  'captures.rawResponse': 'フェッチャーの生レスポンス',
  'captures.detailUnavailable': 'キャプチャの詳細を読み込めません',
  'captures.addNote': 'メモを追加',
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
