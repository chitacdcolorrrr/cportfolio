# 首页开场序列改版设计

日期：2026-08-02
状态：已获用户批准（两轮确认）

## 目标

把首页加载阶段从"匿名黑屏 + 左下角进度"改为一段有起承转合的开机短片：

1. TNYH0330 字标第一帧就在场（现在是加载结束后才弹出 0.7 秒的客串）
2. 进度条跑完并**完全消失后**，字标才开始模糊淡出（干净的因果链）
3. 其余动画（雾气、导航、铭文）原封不动

## 完整序列

### 第一阶段 · 开场（黑场遮罩上，仅首页）

| 时间 | 事件 |
|---|---|
| 0s | TNYH0330 在屏幕中央模糊淡入（0.55s，复用 `card-focus` keyframe：opacity + blur(0.2rem) → 清晰） |
| 0.55–0.9s | 停顿一拍 |
| 0.9s | 字标滑向底部居中（0.65s，缓出落地，新 keyframe `card-settle`） |
| 1.55s | 计数器 + 进度条在字标下方淡入（0.4s，新 keyframe `loader-meta-in`） |

落地后的构图（底部居中垂直堆叠）：

```
            TNYH0330
             042 %
            ━━━━╌╌╌╌
```

### 第二阶段 · 跑条（沿用现有实测逻辑）

- 百分比与进度条仍由 `js/loader.js` 的实测字节数驱动，显示逻辑不变。
- **关键改动**：进度追逐（smoothing chase）推迟到进度条淡入时刻（`BAR_DELAY = 1550ms`）才开始。否则快网络下追逐在进度条可见前就已到 99%，进度条会"以满格登场"。推迟期间计数器不可见，不存在谎报；追逐开始后仍只追真实测量值。
- 最短展示时间：`MIN_TIME = 1100 + BAR_DELAY = 2650ms`（占位页 `BAR_DELAY = 0`，行为完全不变）。这同时构成结构保证：正常路径下 `intro-ready` 不可能早于 2.65s，字标（1.55s 落定）必然落地后才开始收尾。
- `MAX_TIME`（6500ms）与 8s 兜底不变。

### 第三阶段 · 收尾（intro-ready 之后）

| 时间 | 事件 |
|---|---|
| t = 0 | 遮罩 + 计数器 + 进度条一起淡出（0.5s，现有机制），场景在站立的字标身后"显影" |
| t ≈ 0.6s | 进度条完全消失后，字标开始模糊淡出（`card-dissolve` 0.75s，现有 keyframe） |
| t = 0.5s | 底部雾气变浓（**不变**） |
| t = 2.2s | 导航逐条浮现（**不变**） |
| t = 3s | 品牌 + 铭文（**不变**） |

字标初始位置取屏幕正中央（实现上略偏上，符合光学中心）。

## 改动清单

### `index.html`

- 内联 `<head>` 脚本新增一行：`window.AH_LOADER_BAR_DELAY = 1550;`（与 `styles.css` 的 `--loader-in-at: 1.55s` 必须保持一致，两处都加注释互相指引）
- 版本号 bump：`loader.css`、`loader.js`、`styles.css`

### `js/loader.js`

- 读取 `window.AH_LOADER_BAR_DELAY`（`Number.isFinite` 校验，默认 0）
- `MIN_TIME = 1100 + barDelay`
- frame 循环：`elapsed < barDelay` 时 `render(0)` 并继续下一帧，不推进 `shown`
- 其余（实测计数、字体门、MAX_TIME、退出过渡）不动

### `css/loader.css`（全站生效）

- `.site-loader-meta`：左下 → 底部居中：`left: 50%; transform: translateX(-50%); justify-items: center;`（`bottom` 不变）

### `css/styles.css`（仅首页）

- `:root` 变量：
  - `--card-out-at: 1.2s` → `0.6s`（进度条/遮罩淡完的时刻：0.05s delay + 0.5s transition）
  - 新增 `--card-settle-at: 0.9s`、`--loader-in-at: 1.55s`
- `.home-title-card`：
  - `bottom: calc(var(--page-inset) + 2.5rem)`（升到进度条组件上方，实现时浏览器里微调）
  - `z-index: 101`（高于遮罩的 100，加载期间可见）
  - 加载期间可见：`.js:not(.intro-ready):not(.intro-skip)` 时 `opacity: 1; visibility: visible`，动画 `card-focus 0.55s backwards` + `card-settle 0.65s var(--reveal-ease) var(--card-settle-at) backwards`
  - 收尾：`.js.intro-ready:not(.intro-skip)` 时保持 `visibility: visible; opacity: 1` 并播放 `card-dissolve 0.75s ease-in var(--card-out-at) forwards`（替换现有的"`card-focus` 入场 + `card-dissolve`"组合规则，加载期不再弹入）
- `.home-page .site-loader-meta`（首页限定，占位页不受影响）：
  - `.js:not(.intro-skip)` 时 `animation: loader-meta-in 0.4s ease var(--loader-in-at) backwards`
- 新 keyframe：
  ```css
  @keyframes card-settle {
      from { transform: translate(-50%, calc(var(--page-inset) + 2.5rem - 50vh)); }
  }
  @keyframes loader-meta-in {
      from { opacity: 0; }
  }
  ```
  `card-settle` 省略 `to`，落点即元素基础 transform（`translateX(-50%)`），动画结束无跳变。
- `card-focus` keyframe 保留（改为第一阶段的中央入场用）

### 版本号 bump

- `loader.css?v=`：全部 5 个 HTML
- `loader.js?v=`：全部 5 个 HTML
- `styles.css?v=`：仅 `index.html`
- 新值：`20260802-1`（`styles.css` 现为 `20260729-4`，同理 bump 到 `20260802-1`）

## 契约保护（不可破坏）

- `intro-skip` 路径（8s 兜底、6.5s MAX_TIME、reduced motion）：字标规则带 `:not(.intro-skip)`，直接隐藏；`loader-meta-in` 动画同样不带 skip，进度组件立即显示（现有行为）。开场整段跳过，字标不可能卡在屏幕上。
- 保底揭示链不变：任何加载失败都必须落到 `intro-ready`。
- `MIN_TIME = 1100 + BAR_DELAY` 保证正常路径下 `intro-ready`（≥2.65s）恒晚于字标落定（1.55s）——收尾与开场在结构上不会交叠。
- 无 JS（无 `.js` class）：无遮罩、字标隐藏、页面直接可见，与现状一致。

## 验证

- 本地 `python3 -m http.server` 从仓库根预览， Chrome 实测：
  - 正常加载：三段式序列按时间线播放，计数器从 0 真实爬升
  - DevTools 节流到 Slow 3G：进度条淡入后停在真实百分比等待字节，不谎报
  - `prefers-reduced-motion` 模拟：整段跳过，立即揭示
  - 四个占位页：加载动画底部居中，其余行为与线上一致
- 确认无视觉回归后推送（push 即上线，无 staging）
