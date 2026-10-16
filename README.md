<div align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="RepoTime · 代码时光机 标志">
  <h1>RepoTime · 代码时光机</h1>
  <p><strong>每一个项目，都有自己的来处。</strong></p>
  <p>把 GitHub 公开仓库整理成可浏览的开发者档案：项目、时间轴与交互星图，记录一路写下的代码。</p>
  <p>
    <img src="https://img.shields.io/badge/version-0.1.0-7c3aed" alt="版本 0.1.0">
    <img src="https://img.shields.io/badge/Nuxt-4-00dc82" alt="Nuxt 4">
    <img src="https://img.shields.io/badge/TypeScript-3178c6" alt="TypeScript">
    <img src="https://img.shields.io/badge/deploy-static-2496ed" alt="纯静态部署">
  </p>
  <p>
    <a href="#你可以用它做什么">功能</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#配置账号与项目">整理项目</a> ·
    <a href="#部署到-vercel">部署</a>
  </p>
</div>

## 你可以用它做什么

- **整理一份作品档案**：每个实例对应一个 GitHub 账号，自动收录其公开自有仓库。
- **把多个仓库讲成一个项目**：用稳定的仓库数字 ID 合并前后端，补充精选、封面、缘由与里程碑。
- **沿时间回看开发过程**：区分仓库创建、GitHub Release 与个人记录，展示近期提交。
- **在星图里探索作品**：桌面端支持缩放、筛选、复位与全屏，移动端提供项目列表与时间轴。

| 能力 | 行为 |
| --- | --- |
| 构建时同步 | 读取 GitHub 公开数据，生成快照后预渲染所有公开页面 |
| 内容整理 | 精选、仓库合并、排除、外链、自定义封面和明确的项目关联 |
| 项目分类 | 按 GitHub 主语言统一分类 |
| 分享与访问 | 静态详情、旧仓库别名、分享元信息与静态 404 |
| 部署 | 发布静态文件，Token 只留在构建环境 |

**修改代码或 JSON → 构建时同步 GitHub → 生成静态页面 → 访客浏览。**

所有者通过源码仓库和部署平台维护内容。没有登录、数据库、在线编辑或运行时同步接口；GitHub 数据变化后，需要重新部署才会更新。

## 快速开始

使用 Node.js 24 和项目指定版本的 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm sync
pnpm dev
```

`pnpm sync` 读取 `config/repotime.json` 并生成 `.generated/archive.json`。快照不提交 Git，不手工编辑。首次启动必须先生成快照。

可运行 `[ -f .env ] || cp .env.example .env`，配置可选的 `GITHUB_TOKEN`。Token 只用于构建阶段，提高 GitHub 请求额度；无需私有仓库权限。不要使用 `NUXT_PUBLIC_*` 或其他公开变量保存 Token。

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

## 展示规则与数据来源

| 内容 | 来源与规则 |
| --- | --- |
| 仓库范围 | 默认隐藏 Fork，保留归档项目；仅收录公开自有仓库 |
| 时间来源 | 仓库创建日期、GitHub Release、个人里程碑分别标注 |
| 近期提交 | 每个仓库取默认分支最近 3 条；合并项目按时间汇总取最新 3 条 |
| 精选项目 | 额外同步语言明细与最多 10 条近期 Release |
| 默认封面 | 根据描述关键词选择 Lucide 图标，配色和构图由稳定项目 ID 决定 |
| 访问入口 | 星图点击直达 GitHub；合并项目打开配置中的首个仓库 |

默认封面是确定性的关键词规则，不依赖 AI 服务，也不改变语言分类。用途关键词优先于 AI 等实现技术；描述为空或不匹配时使用几何标识，无需为每个项目准备图片。

<details>
<summary><strong>星图的活跃度与筛选如何工作？</strong></summary>

每颗项目星显示完整项目名和创建日期。大小、亮度与光晕按最新 GitHub 推送时间分成 1 周、1 个月、3 个月、1 年及超过 1 年五档，以快照同步时间为基准，月份使用 UTC 日历边界。

合并项目取成员仓库中的最新推送时间，缺少推送时间时使用创建时间。坐标始终按完整快照计算；筛选只改变可见节点与视野，避免星星反复重排。移动端使用项目列表，仍可查看时间轴与完整档案。

</details>

空仓库显示暂无提交，不读取全量历史。仓库数量较多时，逐仓库请求可能超过匿名 API 额度，建议配置构建专用 Token。

## 开发与验证

```sh
pnpm test
pnpm typecheck
pnpm generate
pnpm verify:output
pnpm exec playwright install chromium
pnpm test:e2e
```

单元测试覆盖分页、去重、空账号、限流、失败重试、原子快照、配置变化、项目合并与日期来源。浏览器测试覆盖桌面和手机、静态详情与别名直达、查询参数、时间轴、键盘打开仓库、缩放复位及全屏。产物检查遍历所有公开路由，并扫描 HTML、JSON 和 JavaScript 中的 API 地址与 Token。

参考：[Nuxt 静态生成](https://nuxt.com/docs/4.x/api/commands/generate)、[GitHub 仓库接口](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)、[GitHub API 限额](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)、[Vercel 环境变量](https://vercel.com/docs/environment-variables)。

## 定时更新与维护

[每日重新部署工作流](.github/workflows/daily-redeploy.yml) 通过 Vercel Deploy Hook 触发构建。使用前，在 Vercel 创建指向目标分支的 Deploy Hook，并在 GitHub 仓库 Actions Secrets 中设置 **`VERCEL_DEPLOY_HOOK`**。未配置时工作流会报错；无需定时更新可停用该工作流。

Hook 地址相当于部署凭据，不要写进 README 或提交到配置文件。它只触发部署，实际同步仍由 Vercel 的 `pnpm generate` 完成。

备份源码和 `config/repotime.json` 即可保留人工整理信息；`.generated/archive.json` 是可重新生成的构建快照。

## 文档与反馈

核心配置见 [config/repotime.json](config/repotime.json)，同步实现见 [scripts/sync-github.ts](scripts/sync-github.ts)，公开产物检查见 [scripts/verify-output.ts](scripts/verify-output.ts)。

欢迎通过 [Issues](https://github.com/01Petard/RepoTime/issues) 反馈，附上脱敏配置、构建错误或复现步骤，不附带 GitHub Token 或 Deploy Hook。当前仓库未提供 `LICENSE` 文件。
