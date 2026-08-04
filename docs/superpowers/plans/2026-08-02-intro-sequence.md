# 首页开场序列改版 Implementation Plan

> **状态：已完成。** 2026-08-05 补勾全部 checkbox；工作实际于 2026-08-02 完成并提交（c1cd4bc → 7062b0b → 4edb8d2），执行时未逐项勾选。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把首页加载阶段改为三段式开机短片：TNYH0330 字标中央登场 → 落底 → 进度条跑条 → 进度条消失后字标模糊淡出，其余动画不变。

**Architecture:** 纯 CSS 编排 + loader.js 一处配置化改动。首页通过 `window.AH_LOADER_BAR_DELAY` 声明进度条延迟，loader.js 读取（默认 0，占位页行为不变）；字标三段动画全部限定 `styles.css`（首页专用），loader.css 只做居中（全站生效）。

**Tech Stack:** 纯静态 HTML/CSS/JS，无构建。预览：`python3 -m http.server` 从仓库根启动。

**Spec:** `docs/superpowers/specs/2026-08-02-intro-sequence-design.md`（已批准，commit a179bb3）

## Global Constraints

- **保底揭示契约不可破坏**：任何路径都必须落到 `intro-ready`；`intro-skip` 路径（8s 兜底、6.5s MAX_TIME、reduced motion）下字标直接隐藏、开场整段跳过。所有字标/进度条动画规则必须带 `:not(.intro-skip)`。
- **实测进度契约不可破坏**：计数器只显示测量值；`BAR_DELAY` 期间进度 UI 不可见，不存在谎报。
- **时点对齐**：`index.html` 的 `AH_LOADER_BAR_DELAY = 1550` 必须与 `styles.css` 的 `--loader-in-at: 1.55s` 一致；两处都写注释互相指引。
- **结构保证**：`MIN_TIME = 1100 + BAR_DELAY`，使正常路径 `intro-ready`（≥2.65s）恒晚于字标落定（1.55s）。
- **版本号**：`loader.css` 全 5 页 `20260729-1 → 20260802-1`；`loader.js` 全 5 页 `20260729-2 → 20260802-1`；`styles.css` 仅 index.html `20260729-4 → 20260802-1`。
- **不变部分**：雾气（0.5s）、导航（2.2s）、铭文（3s）、`MAX_TIME`（6500ms）、8s 兜底、退出过渡，一律不碰。
- 代码风格：4 空格缩进；commit message 用简短祈使句。

---

### Task 1: loader.js 支持 BAR_DELAY + 首页声明配置

**Files:**
- Modify: `js/loader.js:53-58`（常量区）和 `js/loader.js:232-250`（frame 循环开头）
- Modify: `index.html:12`（内联脚本）
- Modify: `whoami.html:22`, `lived.html:22`, `loved.html:22`, `created.html:22`, `index.html:29`（loader.js 版本号）

**Interfaces:**
- Consumes: `window.AH_LOADER_BAR_DELAY`（首页内联脚本声明，ms 数字）
- Produces: loader.js 新行为——`elapsed < BAR_DELAY` 时计数器保持 `000 %` 且不推进 chase；`MIN_TIME = 1100 + BAR_DELAY`。Task 3 的 CSS `--loader-in-at: 1.55s` 依赖这里的 1550 对齐。

- [x] **Step 1: 启动本地预览服务器（整个计划复用，勿重复启动）**

在 worktree 根目录后台启动：

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && python3 -m http.server 8137
```

预期：`Serving HTTP on :: port 8137`。若端口被占，换 8138 并在后续步骤替换 URL。

- [x] **Step 2: 记录改动前基线行为**

浏览器打开 `http://localhost:8137/`，观察：计数器从页面加载即开始爬升（左下角），最快约 1.1s 后揭示。这是基线，Task 1 后应看到计数器先冻结再爬升。

- [x] **Step 3: 修改 loader.js 常量区**

`js/loader.js` 第 53-58 行，把：

```js
    const manifest = Array.isArray(window.AH_LOADER_ASSETS) ? window.AH_LOADER_ASSETS : [];
    const MIN_TIME = 1100;
    const MAX_TIME = 6500;
```

改为：

```js
    const manifest = Array.isArray(window.AH_LOADER_ASSETS) ? window.AH_LOADER_ASSETS : [];
    // Pages with a pre-bar intro (homepage) declare AH_LOADER_BAR_DELAY so the
    // chase starts when the progress UI fades in — otherwise a fast network
    // finishes the chase before the bar is ever seen. Must match --loader-in-at
    // in css/styles.css. Default 0: the counter runs from page start.
    const BAR_DELAY = Number.isFinite(+window.AH_LOADER_BAR_DELAY)
        ? +window.AH_LOADER_BAR_DELAY
        : 0;
    const MIN_TIME = 1100 + BAR_DELAY;
    const MAX_TIME = 6500;
```

- [x] **Step 4: 修改 frame 循环，BAR_DELAY 期间冻结显示**

`js/loader.js` 的 `frame` 函数里，`const elapsed = now - startedAt;` 之后、`const target = realProgress();` 之前，插入：

```js
        // Pre-bar intro: the progress UI is still off-screen — hold the
        // display at zero so the chase is seen from its first visible frame.
        if (elapsed < BAR_DELAY) {
            render(0);
            window.requestAnimationFrame(frame);
            return;
        }
```

- [x] **Step 5: index.html 声明配置**

`index.html` 第 12 行 `window.AH_LOADER_ASSETS = ...;` 之后插入：

```js
        // Pre-bar intro: the title card settles at 1.55s (see --loader-in-at
        // in css/styles.css); the progress chase starts then, not at page start.
        window.AH_LOADER_BAR_DELAY = 1550;
```

- [x] **Step 6: bump loader.js 版本号（全 5 页）**

5 个 HTML 文件中 `/js/loader.js?v=20260729-2` → `/js/loader.js?v=20260802-1`。可用：

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && sed -i '' 's|/js/loader.js?v=20260729-2|/js/loader.js?v=20260802-1|' index.html whoami.html lived.html loved.html created.html
```

验证：`grep -c "loader.js?v=20260802-1" *.html` 应输出每页 1（共 5）。

- [x] **Step 7: 浏览器验证**

硬刷新 `http://localhost:8137/`（DevTools 关缓存或 Cmd+Shift+R）：
- 计数器显示 `000 %` 冻结约 1.5s，然后开始爬升，到 `100 %` 后揭示
- 从加载到揭示总时长 ≥ 2.6s（快网络下明显比以前长）
- 打开 `http://localhost:8137/whoami.html`：计数器**立即**开始爬升（占位页无 BAR_DELAY），行为与线上一致

若不符合，检查配置拼写与 frame 插入位置，修复后重验。

- [x] **Step 8: Commit**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && git add js/loader.js index.html whoami.html lived.html loved.html created.html && git commit -m "Delay progress chase behind pre-bar intro"
```

---

### Task 2: loader.css 进度组件底部居中（全站）

**Files:**
- Modify: `css/loader.css:33-40`（`.site-loader-meta`）
- Modify: `index.html:26`, `whoami.html:18`, `lived.html:18`, `loved.html:18`, `created.html:18`（loader.css 版本号）

**Interfaces:**
- Consumes: 无（纯定位改动）
- Produces: `.site-loader-meta` 底部居中；Task 3 的字标落点（`bottom: calc(var(--page-inset) + 2.5rem)`）以此为下方锚点。

- [x] **Step 1: 修改 .site-loader-meta 定位**

`css/loader.css` 中把：

```css
.site-loader-meta {
    position: absolute;
    bottom: var(--page-inset, clamp(1.25rem, 3vw, 3rem));
    left: var(--page-inset, clamp(1.25rem, 3vw, 3rem));
    display: grid;
    gap: 0.7rem;
    justify-items: start;
}
```

改为：

```css
.site-loader-meta {
    position: absolute;
    bottom: var(--page-inset, clamp(1.25rem, 3vw, 3rem));
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    gap: 0.7rem;
    justify-items: center;
}
```

- [x] **Step 2: bump loader.css 版本号（全 5 页）**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && sed -i '' 's|/css/loader.css?v=20260729-1|/css/loader.css?v=20260802-1|' index.html whoami.html lived.html loved.html created.html
```

验证：`grep -c "loader.css?v=20260802-1" *.html` 应输出每页 1（共 5）。

- [x] **Step 3: 浏览器验证**

硬刷新 `http://localhost:8137/` 与 `http://localhost:8137/whoami.html`：计数器 + 进度线均在**底部水平居中**。首页此刻仍是旧的"揭示后字标弹入"行为（Task 3 替换），属正常中间态。

- [x] **Step 4: Commit**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && git add css/loader.css index.html whoami.html lived.html loved.html created.html && git commit -m "Center boot loader meta"
```

---

### Task 3: styles.css 字标三段动画 + 进度条入场

**Files:**
- Modify: `css/styles.css:22-23`（`:root` 时间变量）
- Modify: `css/styles.css:272-297`（`.home-title-card` 及其动画规则）
- Modify: `css/styles.css:582-594`（keyframes 区，新增两个）
- Modify: `index.html:27`（styles.css 版本号）

**Interfaces:**
- Consumes: Task 1 的 `AH_LOADER_BAR_DELAY = 1550`（与 `--loader-in-at: 1.55s` 对齐）；Task 2 的居中 `.site-loader-meta`
- Produces: 完整三段式序列。无下游任务。

- [x] **Step 1: :root 时间变量**

`css/styles.css` 中把：

```css
    --reveal-blur-at: 0.5s;
    --card-out-at: 1.2s;
```

改为：

```css
    --reveal-blur-at: 0.5s;
    --card-settle-at: 0.9s;
    /* Must match AH_LOADER_BAR_DELAY (1550ms) in index.html. */
    --loader-in-at: 1.55s;
    /* Card dissolves only after the loader veil has fully faded (0.05 + 0.5s). */
    --card-out-at: 0.6s;
```

- [x] **Step 2: 重写 .home-title-card 块**

`css/styles.css` 中把现有的 `.home-title-card { ... }` 规则和 `.js.intro-ready:not(.intro-skip) .home-title-card { ... }` 规则（第 272-297 行）整体替换为：

```css
.home-title-card {
    position: fixed;
    bottom: calc(var(--page-inset) + 2.5rem);
    left: 50%;
    z-index: 101;
    margin: 0;
    color: var(--paper);
    font-size: clamp(0.69rem, 0.85vw, 0.78rem);
    font-weight: 700;
    letter-spacing: 0.16em;
    line-height: 1.2;
    text-transform: uppercase;
    text-shadow: 0 1px 0.8rem rgba(2, 8, 12, 0.5);
    transform: translateX(-50%);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}

/* Boot act one: the wordmark is on the veil from the first frame — focuses
 * in at screen center, holds a beat, then settles above the progress UI. */
.js:not(.intro-ready):not(.intro-skip) .home-title-card {
    visibility: visible;
    opacity: 1;
    animation:
        card-focus 0.55s var(--reveal-ease) backwards,
        card-settle 0.65s var(--reveal-ease) var(--card-settle-at) backwards;
}

/* Boot finale: only once the loader veil has fully faded does the card
 * dissolve into the scene. */
.js.intro-ready:not(.intro-skip) .home-title-card {
    visibility: visible;
    opacity: 1;
    animation: card-dissolve 0.75s ease-in var(--card-out-at) forwards;
}

/* Boot act two: the progress UI fades in only after the wordmark settles. */
.js:not(.intro-skip) .home-page .site-loader-meta {
    animation: loader-meta-in 0.4s ease var(--loader-in-at) backwards;
}
```

注意：只动首页；`z-index: 101` 必须高于 `.site-loader` 的 100。

- [x] **Step 3: 新增 keyframes**

`css/styles.css` 的 `@keyframes card-focus { ... }` 之后插入：

```css
@keyframes card-settle {
    from {
        transform: translate(-50%, calc(var(--page-inset) + 2.5rem - 50vh));
    }
}

@keyframes loader-meta-in {
    from {
        opacity: 0;
    }
}
```

`card-settle` 省略 `to`：落点即元素基础 transform（`translateX(-50%)`），动画结束无跳变。`card-focus`、`card-dissolve` 保持原样不删。

- [x] **Step 4: bump styles.css 版本号（仅首页）**

`index.html` 中 `/css/styles.css?v=20260729-4` → `/css/styles.css?v=20260802-1`：

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && sed -i '' 's|/css/styles.css?v=20260729-4|/css/styles.css?v=20260802-1|' index.html
```

验证：`grep -c "styles.css?v=20260802-1" index.html` 应输出 1。

- [x] **Step 5: 浏览器验证完整序列**

硬刷新 `http://localhost:8137/`，按时间线逐项核对：
1. 首帧黑场上 TNYH0330 在屏幕中央（略偏上）模糊淡入（0–0.55s）
2. 停顿后滑向底部（0.9–1.55s），落点在进度组件上方，不重叠
3. 计数器 + 进度线在字标下方淡入（1.55–1.95s），从 `000 %` 开始真实爬升
4. 加载完成 → 遮罩 + 进度组件淡出（0.5s），场景显影，字标原地站立
5. 进度条完全消失后（约 intro-ready 后 0.6s）字标开始模糊淡出（0.75s）
6. 雾气（0.5s）、导航逐条浮现（2.2s）、品牌 + 铭文（3s）与线上一致

若字标落点与进度组件间距不协调，微调 `.home-title-card` 的 `bottom` 值（±0.3rem 内）并重验——这是 spec 允许的唯一调参。

- [x] **Step 6: Commit**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && git add css/styles.css index.html && git commit -m "Choreograph title card boot entrance"
```

---

### Task 4: 全路径验证矩阵

**Files:**
- 无改动；仅验证。发现回归则回到对应任务修复。

**Interfaces:**
- Consumes: Task 1-3 的全部产出
- Produces: 上线信心；验证通过后交回主会话走 PR 流程（push 到 main = 上线，由用户合并，不在本计划内）

- [x] **Step 1: Slow 3G 节流验证（实测契约）**

DevTools Network 面板节流 Slow 3G，硬刷新 `http://localhost:8137/`：进度条 1.55s 淡入后停在真实百分比等待字节（可能长时间卡在低位），数字只随真实下载推进，绝不跳到 100；加载完成后序列正常收尾。取消节流。

- [x] **Step 2: reduced motion 验证（skip 契约）**

DevTools Rendering 面板勾选 `Emulate CSS media feature prefers-reduced-motion: reduce`，刷新：无开场、无字标、无追逐，页面立即揭示；顶部品牌、导航、铭文全部就位。取消模拟后再验证一次正常路径仍完好。

- [x] **Step 3: 占位页回归**

逐个打开 `whoami.html`、`lived.html`、`loved.html`、`created.html`：加载动画底部居中、计数器从 0 立即爬升、揭示后进入占位内容，无字标（字标是首页专属）。

- [x] **Step 4: 版本号终检**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && grep -n "20260729" *.html; grep -rn "20260802-1" *.html | wc -l
```

预期：第一条命令无输出（旧版本号清零）；第二条输出 11（loader.css×5 + loader.js×5 + styles.css×1）。

- [x] **Step 5: 复查 diff**

```bash
cd /Users/qihaohong/Documents/AH/.claude/worktrees/intro-sequence && git log --oneline main..HEAD && git diff main..HEAD --stat
```

预期：3 个 commit；改动文件为 `js/loader.js`、`css/loader.css`、`css/styles.css`、5 个 HTML，外加 spec/plan 文档。逐文件过一遍 diff，确认没有越界改动（尤其 `MAX_TIME`、兜底计时器、退出过渡、雾气/导航/铭文时间变量未被触碰）。

- [x] **Step 6: 交回主会话**

验证全部通过后，向主会话报告：序列实测符合 spec、契约路径全部完好、diff 干净，可以走 push + draft PR 流程。
