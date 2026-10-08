# RepoTime

可自行部署的 GitHub 开发者档案站。每个实例展示一个配置账号的公开自有仓库，支持项目合并、精选、分类、时间轴与交互星图。

**修改代码或 JSON → 构建时同步 GitHub → 生成静态页面 → 访客浏览。**

所有者通过源码仓库和部署平台维护内容。站点没有登录、数据库、编辑接口或同步接口；GitHub 发生变化后，重新部署才会更新页面。

## 本地运行

使用 Node.js 24 和项目指定版本的 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm sync
pnpm dev
```

`pnpm sync` 读取 `config/repotime.json` 并生成 `.generated/archive.json`。快照不提交 Git，不手工编辑。首次启动必须先生成快照。

可复制 `.env.example` 为 `.env`，配置可选的 `GITHUB_TOKEN`。Token 只用于构建阶段，提高 GitHub 请求额度；无需私有仓库权限。不要使用 `NUXT_PUBLIC_*` 或其他公开变量保存 Token。

```sh
pnpm generate        # 重新同步一次，然后生成所有页面
pnpm preview         # http://localhost:4173，预览纯静态产物
```

前端开发时可使用 `pnpm generate:snapshot` 重用现有快照，避免反复消耗 API 额度。生产部署始终使用 `pnpm generate`。

## 配置账号与项目

所有整理信息都位于 `config/repotime.json`。初始账号为 `01Petard`；已核实的组合与精选作为配置示例保留，没有账号专用组件或项目专用封面。

换成自己的账号时，修改 `owner`，并先清空 `projects`、`excludeRepositoryIds`、`relations`。同步后，所有公开自有仓库会自动生成项目；再按需整理。

```json
{
  "schemaVersion": 1,
  "owner": "your-github-login",
  "site": {
    "title": "RepoTime · 开发者档案",
    "description": "沿时间探索公开项目。",
    "headline": "每一行代码，\n都有来处。",
    "intro": "记录项目与持续生长的想法。"
  },
  "excludeRepositoryIds": [],
  "projects": [],
  "relations": []
}
```

部署后可设置 `site.siteUrl` 为站点的绝对地址，例如 `https://your-site.vercel.app`，用于规范地址和分享图片的绝对 URL。

`site.brand` 可设置页面左上角的名称；省略时显示 GitHub 用户名。

从快照查找仓库 ID：

```sh
node --input-type=module -e 'import a from "./.generated/archive.json" with { type: "json" }; console.table(a.repositories.map(r => ({ id: r.id, name: r.name })))'
```

`projects` 中每条配置可包含以下字段。未配置的仓库继续自动展示。

| 字段 | 用途 |
| --- | --- |
| `id`、`title` | 稳定项目标识与展示名称；`id` 使用小写字母、数字和连字符，`repo-` 前缀保留给自动项目 |
| `repositoryIds` | 一个或多个 GitHub 数字 ID；多个仓库合并为一个项目 |
| `featured` | 是否精选，默认为 `false` |
| `description`、`technologies` | 可选简介与技术标签 |
| `startedAt` | 可选 `YYYY-MM-DD` 开始日期，明确标注为个人记录 |
| `why` | 可选创作缘由，仅填写有依据或本人确认的内容 |
| `milestones` | 个人记录数组：`date`、`title`、可选 `sourceUrl` |
| `links` | 外部链接数组：`label`、`url` |
| `cover` | 可选 `/covers/name.svg`、PNG、WebP 或 JPG；文件放在 `public/covers/`。默认使用通用视觉，无需为每个项目准备文件 |

`relations` 使用整理项目的 `id`：`{ "from": "project-a", "to": "project-b", "label": "明确的关联说明" }`。只展示配置中明确给出的关联。

所有项目统一按 GitHub 主语言分类，不支持人工领域分类。合并项目按 `repositoryIds` 的配置顺序取首个有主语言的仓库；全部缺失时显示“未分类”。

仓库合并与排除使用数字 ID，重命名不影响关系。被合并仓库的旧 `repo-{id}` 地址仍可打开所属项目。重复归属、引用缺失仓库、无效日期和不存在的封面会导致构建失败。

## 部署到 Vercel

将项目上传到自己的源码仓库，在 Vercel 导入。`vercel.json` 已指定：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Other |
| Build Command | `pnpm generate` |
| Output Directory | `.output/public` |
| Node.js | 24.x |

可在 Vercel 构建环境添加 `GITHUB_TOKEN`。不要上传 `.env`、快照或构建产物。

提交代码或配置后触发重新部署；手动 Redeploy 也会重新执行同步。API 请求串行执行，网络错误和 5xx 最多重试两次；限流立即停止并报告可重试时间。配置校验、必要请求或分页完整性检查失败时，构建退出失败，旧的生产部署继续提供服务。

仅发布 `.output/public`。不使用 SSR Functions、SPA fallback rewrite 或运行中的 Nuxt 服务；未知账号与项目返回静态 404。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm generate
pnpm verify:output
pnpm exec playwright install chromium
pnpm test:e2e
```

单元测试覆盖分页、去重、空账号、限流、失败重试、原子快照、配置变化、项目合并与日期来源。浏览器测试覆盖桌面和手机、静态详情与别名直达、查询参数、时间轴、键盘打开仓库、缩放复位及全屏。产物检查遍历所有公开路由，并扫描 HTML、JSON 和 JavaScript 中的 API 地址与 Token。

未设置 `cover` 时，页面根据描述中的中英文用途关键词选择 Lucide 图标；具体用途优先于 AI 等实现技术。配色与构图由稳定项目 ID 决定，描述为空或不匹配时使用几何标识。图案由同一个组件生成，不新增项目专用文件或 API 请求。这是确定性的关键词规则，不依赖 AI 服务，也不会改变项目分类。

默认隐藏 Fork、保留归档项目。开发宇宙默认显示项目列表，桌面可切换星图；每颗项目星常驻显示完整项目名和创建日期。星星大小、亮度与光晕按最新 GitHub 推送时间分为 1 周、1 个月、3 个月、1 年及超过 1 年五档；基准为快照同步时间，月份使用 UTC 日历边界，合并项目取最新成员仓库时间，无推送时间时使用仓库创建时间。点击星星直接在新窗口打开 GitHub，合并项目使用配置的第一个仓库。筛选只影响当前浏览，星图以完整快照计算稳定坐标，筛选时只改变可见节点和视野。移动端提供项目列表，时间轴与完整档案同样可浏览。

公开仓库创建日期、GitHub Release 和个人记录分别标注来源。精选仓库同步语言明细和最多 10 条近期 Release；每个收录仓库同步默认分支最近 3 条提交，合并项目按提交时间汇总取最新 3 条，显示作者、UTC 时间、说明和 GitHub 链接；空仓库显示暂无记录。不读取全量提交历史，不展示私有仓库。仓库较多时这些请求可能超出匿名额度，建议配置构建专用 Token。

参考：[Nuxt 静态生成](https://nuxt.com/docs/4.x/api/commands/generate)、[GitHub 仓库接口](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)、[GitHub API 限额](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)、[Vercel 环境变量](https://vercel.com/docs/environment-variables)。
