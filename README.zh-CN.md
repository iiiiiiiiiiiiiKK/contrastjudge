# ContrastJudge · 色彩审判官

**按 WCAG 2.2 判定色彩对比度 —— 一切计算都在你的浏览器里完成。**

[English](README.md) · **简体中文**

输入任意 CSS 颜色，得到精确对比度，查看它在正文、大号文本与界面组件上分别满足哪条标准；
模拟色觉障碍效果，得到无障碍替代色，并导出为 CSS 变量或 JSON 设计令牌。界面右上角可一键切换
**中文 / English**，切换即时生效、不需要重新输入任何数据，选择会被记住。

[**在线使用**](https://iiiiiiiiiiiiikk.github.io/contrastjudge/) ·
[计算方法](https://iiiiiiiiiiiiikk.github.io/contrastjudge/#learn) ·
[反馈问题](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/issues) ·
[作者 𝕏 / @0xkillcoin](https://x.com/0xkillcoin)

[![CI](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/actions/workflows/ci.yml/badge.svg)](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/actions/workflows/ci.yml)
[![Deploy](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/actions/workflows/deploy-pages.yml)
[![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2%20AA%20%26%20AAA-0B6B3A)](https://www.w3.org/TR/WCAG22/)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-1F4FD8)](LICENSE)

---

<div align="center">
  <img src="docs/screenshots/workspace-zh.webp" alt="ContrastJudge 中文界面：顶部是语言切换与作者 X 链接，左侧为颜色输入，右侧为对比度结果与逐条标准判定" width="100%" />
  <sub>中文工作区 —— 颜色输入、逐条标准判定、无障碍替代色、实时预览。</sub>
</div>

## 为什么做这个工具

每个对比度检查器都会给你一个数字，但很少有工具告诉你**这个数字为什么重要**、它对应哪条成功标准、
不通过时该往哪个方向改，更少有工具愿意把公式摊开让你自己核对。

ContrastJudge 有三条底线：

1. **公式就是产品本身。** 直接实现 WCAG 2.2 的亮度与对比度定义，阈值比较使用**未取整**的数值，
   并用两套独立的第三方实现交叉验证。
2. **数据不出浏览器。** 没有账号、没有统计、没有服务器，颜色值不会出现在任何网络请求里。
   关掉标签页，调色板就只存在于你本机。
3. **如实说明做不到什么。** 对比度通过不等于符合 WCAG。工具在界面上、在每份导出报告里、以及本文档中
   都写明了这一点。

## 功能

| 功能                 | 说明                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **颜色输入**         | `#rgb`、`#rgba`、`#rrggbb`、`#rrggbbaa`、`rgb()`/`rgba()`、`hsl()`/`hsla()`（同时支持旧逗号语法与现代空格语法）、148 个 CSS 具名颜色、`transparent` |
| **精确对比度**       | 按 WCAG 2.2 相对亮度与 `(L1 + 0.05) / (L2 + 0.05)` 计算，比较时不取整，显示两位小数并给出 6 位精确值                                                |
| **逐条标准判定**     | SC 1.4.3 AA（4.5:1 / 大号 3:1）、SC 1.4.6 AAA（7:1 / 大号 4.5:1）、SC 1.4.11 AA 非文本（3:1）                                                       |
| **大号文本自动识别** | 24px 起，粗体 18.66px 起 —— 由预览控件实时驱动，而不是一个复选框                                                                                    |
| **无障碍替代色**     | 同时给出「改文字色」和「改背景色」两组候选，尽量保留原色相与饱和度                                                                                  |
| **实时预览**         | 用你的配色渲染真实文字、实心按钮、描边按钮与链接，可调字号、字重、字体                                                                              |
| **色觉障碍模拟**     | 红色盲、绿色盲、蓝色盲、全色盲，基于 Machado (2009) 矩阵，严重度可调，每张卡显示模拟后的对比度                                                      |
| **调色板**           | 命名保存颜色，查看 HEX/RGB/HSL 与对页面背景的对比度，重命名，用作文字色或背景色                                                                     |
| **导出**             | CSS 自定义属性（hex/rgb/hsl，可选对比度注释）与 JSON 设计令牌（含完整对比度矩阵）                                                                   |
| **批量检查**         | 每行一组颜色，输出表格，并可下载 Markdown / CSV 报告                                                                                                |
| **历史方案**         | 最近 12 次检查，一键恢复，仅存本地                                                                                                                  |
| **中文 / English**   | 顶栏一键切换，连错误提示、批量报告、方法说明都一并翻译                                                                                              |
| **深色模式与响应式** | 浅色/深色主题，320px 到宽屏自适应，在真实浏览器的 iPhone 与 Pixel 视口验证过                                                                        |
| **键盘与读屏**       | 跳转链接、roving tabindex 标签页、表单标签、实时播报、清晰的焦点样式                                                                                |

<div align="center">
  <img src="docs/screenshots/workspace-iphone-14.webp" alt="ContrastJudge 在 iPhone 14 视口：顶栏保留作者 X 链接，工作区堆叠为单列，对比度结果位于首屏" width="320" />
  <img src="docs/screenshots/dark-iphone-14.webp" alt="ContrastJudge 深色模式在 iPhone 视口" width="320" />
  <br />
  <sub>iPhone 14 视口（390 × 844 @3x），浅色与深色。单列布局，无横向滚动，X 链接始终可达。</sub>
</div>

## 计算公式

WCAG 2.2 分两步定义对比度。ContrastJudge 逐字实现（见 [`src/lib/wcag.ts`](src/lib/wcag.ts)），
并且所有阈值比较都使用**未取整**的数值 —— 这是
[SC 1.4.3 的 Understanding 文档](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
明确要求的（`4.499:1` 不满足 `4.5:1`）。

### 1 —— sRGB 通道线性化

对 R、G、B 三个通道，令 `Csrgb = C8bit / 255`：

```
if Csrgb <= 0.04045   →   C = Csrgb / 12.92
else                  →   C = ((Csrgb + 0.055) / 1.055) ^ 2.4
```

<sub>2021 年 5 月之前该拐点是 `0.03928`。W3C 说明这一变化对对比度结果没有实际影响；本工具使用现行的
`0.04045`。</sub>

### 2 —— 相对亮度

```
L = 0.2126 · R + 0.7152 · G + 0.0722 · B
```

`L` 从 0（黑）到 1（白）。定义中**不包含** alpha，因此半透明颜色会先被压平到其底色上 ——
这就是「页面背景色」字段的用途。

### 3 —— 对比度

```
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

| 颜色组合                                      |   对比度 |
| --------------------------------------------- | -------: |
| 黑底白字                                      | **21:1** |
| 白字 #2563eb 底                               |   5.17:1 |
| #767676 叠白底（经典的「刚好达标」灰）        |   4.54:1 |
| **#777777 叠白底**（显示为 4.48，**不达标**） |   4.48:1 |
| #9aa4b2 叠白底（常见的浅灰说明文字）          |   2.52:1 |

### 4 —— 阈值，以及「大号文本」的判定

| 成功标准                 | 等级 |  正文 |                 大号文本 |
| ------------------------ | ---- | ----: | -----------------------: |
| 1.4.3 对比度（最低要求） | AA   | 4.5:1 |                      3:1 |
| 1.4.6 对比度（增强）     | AAA  |   7:1 |                    4.5:1 |
| 1.4.11 非文本对比度      | AA   |     — | 界面组件与有意义图形 3:1 |

大号文本指至少 **18pt**，或至少 **14pt 粗体**。按 `1pt = 1.333px`，即 **24px**，粗体为 **18.66px**。
ContrastJudge 由预览控件推导该判定，所以改字号会实时改变被判定的是哪条阈值。

### 验证

实现不是「自己验证自己」，而是用**两套独立的第三方库**生成的数据交叉验证
（`wcag-contrast` 与 `color-contrast-checker`）：

- 990 组颜色对，对比度与我们相差小于 `1e-5`
- 200 组颜色对，相对亮度相差小于 `1e-9`
- 77 组颜色对，在两套参考实现之间互相一致
- 990 组颜色对，四条文本阈值的通过/不通过判定全部一致
- 边界用例：`#767676`（4.54:1 通过）、`#777777`（4.48:1 不通过）、`#595959`（7.00:1）、
  `#5a5a5a`（6.90:1）、黑白（21:1）、同色（1:1）

重新生成参考数据：`node scripts/gen-reference-fixture.cjs`。两个参考库只在 `devDependencies` 中，
不会进入生产包。

## 这个工具不能告诉你什么

对比度计算器只回答一个问题。剩下的值得直说：

- **通过对比度不等于符合 WCAG。** 一个页面对比度完美，仍可能完全无法用键盘操作、
  读屏读不出来、或者放大到 200% 就崩掉。
- **豁免条款需要人来判断。** SC 1.4.3 排除了附带文本、纯装饰与徽标，
  没有算法能替你判断首页大图上的文字算不算装饰。
- **文字图像、图表与示意图**需要单独评审，单一比值描述不了它们。
- **渲染出来的对比度 ≠ 计算出来的对比度。** 抗锯齿、次像素渲染、显示伽马都会改变实际观感；
  细字重看起来会比数学结果更淡 —— 所以本工具建议对细字重**超出**最低要求。
- **色觉模拟只是示意。** Machado 矩阵是有生理学依据的近似，真实色觉因人而异。
  看到警示应当理解为「该补一个非颜色信号」，而不是「已证明有问题」或「已修复」。

## 快速开始

```bash
git clone https://github.com/iiiiiiiiiiiiiKK/contrastjudge.git
cd contrastjudge
npm ci
npm run dev
```

打开 <http://localhost:5173/contrastjudge/>。（开发服务器默认按 GitHub Pages 的子路径提供应用；
若想在根路径访问，设置 `VITE_BASE=/`。）

需要 Node.js **20.19+** 或 **22.12+**（Vite 8）。

### 常用命令

| 命令                        | 作用                                                     |
| --------------------------- | -------------------------------------------------------- |
| `npm run dev`               | Vite 开发服务器（HMR）                                   |
| `npm run build`             | 类型检查（`tsc --noEmit`）后生产构建到 `dist/`           |
| `npm run preview`           | 本地预览构建产物：`http://127.0.0.1:4590/contrastjudge/` |
| `npm run typecheck`         | 仅 TypeScript 检查                                       |
| `npm run lint`              | ESLint（typescript-eslint、react-hooks、react-refresh）  |
| `npm run format`            | Prettier 格式化                                          |
| `npm test`                  | Vitest 单元 + 组件测试                                   |
| `npm run test:e2e`          | Playwright：桌面 + iPhone + Pixel 三种视口               |
| `npm run verify:production` | 用真实浏览器冒烟测试线上站点                             |
| `npm run audit:a11y`        | 对线上站点 7 种页面状态跑 axe-core                       |
| `npm run check:readme`      | 校验 README 中的相对链接与图片是否存在                   |
| `npm run verify`            | 类型检查 → lint → 测试 → 构建                            |

## 环境变量

**全部可选。** ContrastJudge 没有后端、没有 API 密钥、没有秘密。

| 变量            | 默认值            | 用途                                             |
| --------------- | ----------------- | ------------------------------------------------ |
| `VITE_BASE`     | `/contrastjudge/` | 构建期基础路径。自定义域名或根路径部署时设为 `/` |
| `E2E_PORT`      | `4591`            | Playwright 预览服务器端口                        |
| `E2E_BASE_PATH` | `/contrastjudge/` | E2E 测试访问的路径                               |
| `E2E_NO_SERVER` | 未设置            | 设为 `1` 时复用已在运行的服务器                  |

参见 [`.env.example`](.env.example)。

## 测试

```text
单元 + 组件（Vitest, jsdom）      132 个测试，9 个文件
端到端（Playwright, Chromium）     101 通过 / 4 跳过，3 种视口配置
```

按文件说明：

| 文件                             | 验证内容                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `tests/color.test.ts`            | 所有支持的语法都解析出正确通道；10 种非法写法被拒绝并给出类型化错误；RGB↔HSL 在 4,096 个采样颜色上往返一致 |
| `tests/wcag.test.ts`             | 传递函数、亮度权重、21:1 与 1:1 极值、990 组独立参考数据、AA/AAA 边界、大号文本判定、alpha 压平            |
| `tests/suggest.test.ts`          | 候选色一定达到目标、色相偏移小于 3°、结果确定、目标不可达时如实返回空                                      |
| `tests/cvd.test.ts`              | Machado 矩阵复现论文中对纯红/纯蓝的取值、插值单调、alpha 保留、灰色不受影响                                |
| `tests/exports.test.ts`          | CSS 变量命名（含 `ß → ss` 折叠）、重名处理、对比度注释、JSON 结构、Markdown/CSV 转义                       |
| `tests/batch.test.ts`            | 五种行格式、注释跳过、逐行错误定位（含行号）                                                               |
| `tests/app.test.tsx`             | 非法输入只报错不猜色；交换前后对比度一致；AA/AAA 切换；标签页键盘导航；主题持久化；复制失败会提示          |
| `tests/i18n.test.ts`             | 两套词典键集与占位符集完全一致；中文词典没有漏翻的英文；嵌套消息按语言解析；渲染结果不含 `undefined`       |
| `tests/language-switch.test.tsx` | 切换中文后标签页、字段、错误提示全部翻译；对比度不变；重新挂载后仍为中文；系统语言为中文时默认中文         |
| `e2e/app.spec.ts`                | 真实浏览器里得到同样的数值；下载可用；任何视口都无横向滚动；手机端单列堆叠；触点尺寸；焦点顺序；实时播报   |
| `e2e/language.spec.ts`           | 顶栏切换可键盘操作且整页生效；下载的 Markdown 报告是中文；刷新后保持；手机顶栏在两种语言下都不溢出         |

运行全部检查：

```bash
npm run verify        # 类型检查 + lint + 单元测试 + 生产构建
npm run test:e2e      # Playwright，三种视口
```

CI 在每次 push 与 pull request 时运行这两组任务，见 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)。

### 生产环境验证

每次部署都会针对线上地址验证，而不只是验证 `dist/`：

```bash
npm run verify:production
```

该脚本用真实 Chromium 在桌面与 iPhone 14 视口下访问线上站点，断言：黑白 21.00:1、`#767676` 为
4.54:1、`#777777` 为 4.48:1 且不通过、`rgb()`/`hsl()` 输入生效、`#12345` 被拒绝、应用候选色后判定
翻转为「通过」、CSS/JSON 导出内容正确、`.css` 下载可用、批量表格渲染、深色模式刷新后保持、
390px 下无横向溢出、手机端单列堆叠、控制台零错误。

最近一次运行：**33/33 全部通过**（中英文均验证）。

## 部署

### GitHub Pages（当前线上环境）

站点是纯静态的 —— `dist/` 只有一个 HTML、一个 CSS 和一个 JS，无任何运行时依赖。
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 在每次推送到 `main` 时
构建、测试并发布（使用 Pages artifact 流程并写入 `.nojekyll`）：

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. 推送到 `main`，工作流会自动部署 `dist/`
3. 基础路径取自仓库变量 `vars.PAGES_BASE_PATH`（默认 `/contrastjudge/`）；使用自定义域名时设为 `/`

线上地址：<https://iiiiiiiiiiiiikk.github.io/contrastjudge/>

### 部署到别处

产物是静态目录，除基础路径外无需任何配置：

```bash
VITE_BASE=/ npm run build     # Cloudflare Pages / Netlify / Vercel / nginx
```

- **Cloudflare Pages** —— 构建命令 `npm run build`，输出目录 `dist`，环境变量 `VITE_BASE=/`
- **Vercel** —— 框架选 “Vite”，输出 `dist`，环境变量 `VITE_BASE=/`
- **自建 nginx** —— 拷贝 `dist/` 并加上 `try_files $uri /index.html;` 回退

不需要 Serverless 函数、数据库、定时任务或任何机密，免费额度足够 —— 除了静态带宽之外没有可计费项。

## 项目结构

```
src/
  i18n/                语言层：词典、上下文、插值、纯函数翻译器
    translations.ts    English 与简体中文词条（类型强制键集一致）
    messages.ts        Message 类型与占位符插值（支持嵌套消息）
    I18nProvider.tsx   语言状态、持久化、<html lang> 同步
  lib/                 纯函数、不依赖 DOM、全部有单元测试
    color.ts           严格解析 + 转换 + alpha 合成（错误以可翻译 Message 返回）
    wcag.ts            线性化、亮度、对比度、阈值、报告生成
    suggest.ts         保色相的目标对比度搜索
    cvd.ts             Machado 2009 模拟与色觉差异度量
    batch.ts           批量行解析与逐行评估
    exports.ts         CSS / JSON / Markdown / CSV 生成、剪贴板、下载
  components/          展示型 React 组件
  hooks/               useJudge（状态机）、useTheme、toast
  styles/app.css       单一样式表、设计变量、浅色与深色主题
tests/                 Vitest：纯函数 + Testing Library 组件测试
e2e/                   Playwright：桌面、iPhone 14、Pixel 5
scripts/               代码生成器、截图优化、线上验证、无障碍审计
```

**设计原则**

- **纯核心。** `src/lib` 不引用 React、不碰 DOM（导出/下载辅助函数除外），每条规则都能独立测试。
- **严格解析、失败要响。** `parseColor` 返回可辨识联合；界面绝不臆造颜色，也绝不遗留过期的对比度。
- **不做无谓布局抖动。** 颜色评估按输入记忆化；批量表格只在文本变化时重算。
- **一套样式表、真正的设计变量。** 浅色/深色都是 `[data-theme]` 上的 CSS 变量，
  系统偏好与手动切换共用同一条代码路径。
- **错误文案也翻译。** 解析错误返回的是「词条 + 参数」，而不是写死的英文句子，
  所以切换语言后连报错提示都是目标语言。

## 本工具自身的无障碍

工具必须达到它自己衡量的标准。以下均在 E2E 与人工检查中验证：

- 所有可交互控件都是真实的 `<button>`、`<a>`、`<input>` 或 `<select>`，并带有无障碍名称。
- 跳转链接是第一个 Tab 停留点；激活后焦点移到 `<main>`。
- 标签页实现 roving `tabindex`，支持方向键/Home/End，并有正确的 `aria-selected`。
- 非法颜色输入会设置 `aria-invalid` 并由错误文案描述，同时被播报。
- 判定结果通过 polite 实时区域播报；状态从不只靠颜色表达 —— 每个通过/不通过都同时有图标与文字。
- 焦点环是双色描边，在浅色与深色背景上都清晰可见。
- 主要控件触点 ≥44px（次级小标签 ≥34px）。
- 尊重 `prefers-reduced-motion`。
- 无障碍名称都以可见文字开头（WCAG 2.5.3），语音控制可用。
- 可横向滚动的批量表格容器可获得焦点，键盘用户能滚动它。
- 语言切换按钮有明确的 `aria-label`，并同步更新 `<html lang>`。

### 自动化审计

`npm run audit:a11y` 会对运行中的站点跑 **axe-core**（WCAG 2.0/2.1/2.2 A + AA 以及最佳实践规则），
覆盖 13 种页面状态：浅色工作区、四个标签页、深色模式、非法输入错误态、iPhone 14 视口，以及同样的组合在中文界面下（含中文手机视口）的全部状态。

```bash
LIVE_URL=https://iiiiiiiiiiiiikk.github.io/contrastjudge/ npm run audit:a11y
```

最近结果：**13/13 页面状态 0 违规**（中英文皆然）。开发过程中发现并修复了三处真实问题：顶栏品牌链接与
候选色卡片的 `aria-label` 与可见文字不一致（违反 2.5.3）、批量表格的滚动容器无法用键盘聚焦，
以及语言切换按钮最初的无障碍名称没有包含可见文字「中文 / EN」（同样违反 2.5.3）。

自动化检查只是下限 —— axe 只能发现少数真实障碍。如果你用读屏或键盘遇到问题，
请[提一个 issue](https://github.com/iiiiiiiiiiiiiKK/contrastjudge/issues)。

## 隐私

- 无统计、无遥测、无 Cookie、无第三方脚本、不从 CDN 加载字体。
- 颜色、调色板、历史与语言偏好都保存在 `localStorage` 的 `contrastjudge:` 前缀下，不会离开设备。
- 唯一的对外链接是文档引用（W3C）与作者主页。
- 清除站点数据即可删除全部内容；服务端没有任何可删的东西，因为根本没有服务端。

## 已知限制

| 限制                     | 原因                                     | 变通方式                              |
| ------------------------ | ---------------------------------------- | ------------------------------------- |
| 仅支持 sRGB              | WCAG 2.2 的对比度定义就是针对 sRGB       | 先把 P3/Display-P3 转换到 sRGB 再检查 |
| 不支持渐变与图片背景     | 一个比值只能描述一组纯色                 | 渐变两端分别检查，或用批量检查        |
| 不支持导入 CSS/HTML      | 为保持零依赖与离线可用                   | 把颜色对粘贴到批量检查                |
| 吸管依赖 EyeDropper API  | 仅 Chromium 系支持，且需要用户手势与授权 | 用色块取色器或直接粘贴数值            |
| 全色盲以感知亮度灰度建模 | 全色盲没有 Machado 那样的公认严重度表    | 当作纯亮度校验使用                    |
| 历史与调色板按浏览器保存 | 有意为之的本地优先设计                   | 用 JSON 导出在设备间迁移              |
| 目前只有中文与英文       | 词典是按语言手写的                       | 欢迎提交新语言，见贡献指南            |

## 后续计划

- [ ] 通过 URL hash 分享一次检查（仍然没有服务器：状态就在 URL 里）
- [ ] 导入 CSS 文件并批量审计其中声明的所有颜色对
- [ ] 可选显示 APCA（WCAG 3 草案）对比，并明确标注为非规范性
- [ ] 更多语言（日文、西班牙文优先）
- [ ] 把视觉回归基线提交进仓库

## 参与贡献

欢迎贡献 —— 尤其是带确切输入与期望值的缺陷报告。请先读 [CONTRIBUTING.md](CONTRIBUTING.md)，
一句话版本：纯函数、先写测试、不发网络请求、比较前不取整。

## 许可证

[MIT](LICENSE) © 2026 [0xkillcoin](https://x.com/0xkillcoin)

WCAG 2.2 是 W3C 建议标准，规范正文版权归 W3C，本项目仅作引用。Machado (2009) 矩阵已注明出处。
CSS 具名颜色遵循 CSS Color Module Level 4 的关键字表。

---

<div align="center">

由 [**@0xkillcoin**](https://x.com/0xkillcoin) 在 𝕏 上维护 —— 欢迎来打招呼，或者发一组能把它算崩的颜色。

<sub>如果它帮你省了一轮设计评审，点个 star 能让更多人找到它。</sub>

</div>
