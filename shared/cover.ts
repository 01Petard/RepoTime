const signals = [
  { icon: 'plane', pattern: /航班|航空|机票|\b(?:flights?|aviation|airline)\b/i },
  { icon: 'activity', pattern: /健康|健身|身体|睡眠|运动记录|\b(?:health|fitness|wellness|sleep|workout)\b/i },
  { icon: 'form', pattern: /表单|浏览器.*(?:插件|扩展)|\b(?:autofill|forms?|browser extension|chrome extension)\b/i },
  { icon: 'wallet', pattern: /理财|财务|记账|账单|投资|\b(?:finance|financial|budget|banking|invoice|expenses?)\b/i },
  { icon: 'game', pattern: /游戏|坦克|\b(?:games?|gaming|arcade|puzzle)\b/i },
  { icon: 'shopping', pattern: /电商|商城|购物|\b(?:e-commerce|ecommerce|shopping|storefront)\b/i },
  { icon: 'music', pattern: /音乐|音频|\b(?:music|audio|playlist|podcast)\b/i },
  { icon: 'camera', pattern: /摄影|相册|\b(?:photography|photo gallery|camera)\b/i },
  { icon: 'brain', pattern: /人工智能|大语言模型|智能体|\b(?:ai|llm|chatgpt|agents?|machine learning)\b/i },
  { icon: 'notebook', pattern: /笔记|知识库|博客|\b(?:notes?|notebook|wiki|blog|knowledge base)\b/i },
  { icon: 'database', pattern: /数据库|数据分析|可视化|\b(?:database|analytics|visualization|dashboard)\b/i },
  { icon: 'graduation', pattern: /学习|课程|作业|\b(?:learning|tutorial|course|class|assignment|education)\b/i },
  { icon: 'terminal', pattern: /命令行|开发工具|脚手架|\b(?:cli|command.line|developer tool|scaffold)\b/i },
  { icon: 'code', pattern: /应用|平台|服务端|前端|后端|\b(?:app|application|platform|frontend|backend|api|server)\b/i },
] as const

const colors = [
  { ink: '#87c8ff', surface: '#152737' },
  { ink: '#91e5cc', surface: '#152c2b' },
  { ink: '#e7b5c8', surface: '#2b251e' },
  { ink: '#bda4fb', surface: '#242236' },
  { ink: '#f2aed0', surface: '#30222c' },
] as const

export function coverDesign(id: string, description: string) {
  let seed = 2166136261
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  // These are decorative signals, never inferred project categories or factual labels.
  const text = description.replace(/https?:\/\/\S+/gi, ' ')
  const icon = signals.find(signal => signal.pattern.test(text))?.icon ?? 'abstract'
  const cells = Array.from({ length: 25 }, (_, index) => {
    const column = index % 5
    const row = Math.floor(index / 5)
    return { x: column, y: row, filled: (row === 2 && column === 2) || ((seed >>> (row * 3 + Math.min(column, 4 - column))) & 1) === 1 }
  })
  return { icon, ...colors[seed % colors.length]!, variant: seed % 3, cells } as const
}
