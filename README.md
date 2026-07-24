# パズル⭐︎セカ | Puzzle × SEKAI

<div align="center">

![GitHub License](https://img.shields.io/github/license/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
![GitHub stars](https://img.shields.io/github/stars/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
![GitHub forks](https://img.shields.io/github/forks/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
![GitHub issues](https://img.shields.io/github/issues/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
![GitHub last commit](https://img.shields.io/github/last-commit/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
![GitHub repo size](https://img.shields.io/github/repo-size/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)
[![CodeFactor](https://img.shields.io/codefactor/grade/github/25-ji-code-de/puzzle-sekai?style=flat-square&color=884499)](https://www.codefactor.io/repository/github/25-ji-code-de/puzzle-sekai)

</div>

基于 [Pazuru-Pico](https://github.com/hamzaabamboo/pazuru-pico) (by HamP) 改造的 Project SEKAI 主题方块消除游戏。使用 PixiJS + TypeScript 构建。

**当前版本：`1.2.0`**

### 🎮 在线游玩

**[https://pico.nightcord.de5.net/](https://pico.nightcord.de5.net/)** — 浏览器直接打开，无需安装。

[![Play online](https://img.shields.io/badge/Play-pico.nightcord.de5.net-884499?style=for-the-badge)](https://pico.nightcord.de5.net/)

## ✨ 特性

- 🎮 **经典玩法** - 同组角色连通消除（含 WxS 特殊规则：四人 + 特殊位）
- ♾️ **双模式** - エンドレス / タイムアタック（60–180 秒可调）
- ⚙️ **设置面板** - 速度 1–5、出现组合 3–5 团、道具掉落率、娯楽モード
- ⭐ **难度与倍率** - 由速度 + 团数算出 ★1–★7，分数 × 难度 / 道具 / 娯楽 系数；设置页可查看倍率内訳
- 🏆 **最高分** - 全局榜记录分数、难度档与是否娯楽；R 可随时重开并停止结算 BGM
- 👾 **2×2 方块** - ネネロボ、ミクダヨー（娯楽「ミクダヨー参戦」开启时出现）
- 🎭 **特殊机制** - Emu Shift+↑ 飞行；Mikudayo 可作任意团 Miku 并桥接相邻团
- 🎪 **娯楽モード**（可多开，任意 ON 即标记娯楽）
  - ミクダヨー参戦 / カナデの余韻 / ショウタイム爆破 / 雫のミラー
  - にんじん嫌い / ポテトと瑞希 / えむちぢみ
  - 悬臂物理（cantilever）/ 真物理（truePhysics · Rapier）— 二者互斥
- 🥕 **道具系统** - にんじん・ポテト等；掉落率可调；可能列约束 Ena/Akito/Mizuki
- 📅 **每日挑战** - 按日固定 seed；可与 SEKAI Pass 云同步（可选登录）
- 🔁 **回放** - 本地录制 / 回放对局（设置面板）
- 🏆 **段位** - 按成绩累积 dan；结算可分享卡片
- 📱 **手机适配** - 触屏手势操控
- 🎯 **计分** - 硬降 / 软降 / 消除 + 连击，应用最终分数倍率
- 🎵 **BGM** - 对局曲随机；菜单 / 结算 intro→loop
- 🗣️ **语音与音效** - 角色落地语音、团消语音、娯楽专用效果音
- ✨ **消除特效** - 变白→发光→粒子消散
- 🌐 **欢迎页** - 模式选择、设置、操作说明、最高分展示
- 💻 **原生壳** - 可选 Tauri 桌面 + Capacitor Android（见 docs/native.md）

## 🚀 快速开始

### 前置要求

- Node.js 18+（CI 使用 Node 24 + Corepack Yarn 4.17）
- Yarn 4（`corepack enable`）

### 安装与运行

```bash
git clone https://github.com/25-ji-code-de/puzzle-sekai.git
cd puzzle-sekai
yarn install
yarn start
```

### 构建

```bash
yarn build
# 本地快速试 build 结构（跳过 WebP / 字体子集；勿用于发布）
yarn build:fast
```

### 桌面 / Android 客户端（下载包）

Web 版仍然是主交付物。可选的原生壳（Tauri 桌面 + Capacitor Android）把同一份 `dist/` 打成安装包，仅通过 GitHub Releases 分发、不上架应用商店。

详见 **[docs/native.md](./docs/native.md)**（Rust / Android SDK 前置、OAuth `puzzlesekai://` 注册、打包命令）。

架构分层简述见 **[docs/architecture.md](./docs/architecture.md)**。

```bash
yarn build:native   # 无 Service Worker 的壳用前端产物
yarn tauri:build    # 需 Rust 工具链
yarn cap:sync       # 同步到 android/
```

打版本 tag 后 GitHub Actions 会自动构建 Win / macOS / Linux / Android 安装包并挂到 Release（见 [docs/native.md](./docs/native.md#ci-releases-github-actions)）：

```bash
git tag v1.2.0 && git push origin v1.2.0
```

## 🛠️ 技术栈

- **渲染**: [PixiJS v5](https://pixijs.com/) (pixi.js-legacy)
- **音频**: [pixi-sound](https://github.com/pixijs/sound) + Web Audio API
- **触控**: Pointer Events 直拖（`src/active/touch-controls.ts`）
- **构建**: [Vite](https://vitejs.dev/)
- **语言**: TypeScript
- **样式**: SCSS
- **桌面壳**: [Tauri 2](https://v2.tauri.app/)（可选）
- **Android 壳**: [Capacitor](https://capacitorjs.com/)（可选，侧载）

## 🎮 操作说明

### 键盘

| 按键      | 操作         |
| --------- | ------------ |
| ← →       | 左右移动     |
| ↑ / X     | 顺时针旋转   |
| Z / Ctrl  | 逆时针旋转   |
| ↓         | 加速下落     |
| Space     | 直接落到底部 |
| Shift + ↑ | Emu 飞行     |
| R         | 重新开始     |

### 手机

| 手势                 | 操作                                     |
| -------------------- | ---------------------------------------- |
| 按下（出现虚拟摇杆） | 位置=牵连速度，叠在基础下落上            |
| 短点左 / 右半屏      | 逆时针 / 顺时针旋转                      |
| 摇杆下推             | 软降（可同时左右挪）                     |
| 中心长按蓄力一圈     | 转满硬降；移出死区再回中心则约 2.4s 慢蓄 |
| 快速下甩 / 上甩      | 硬降 / 微抬（Emu / NeneRobo）            |

## 🌐 SEKAI 生态

本项目是 **SEKAI 生态**的一部分。

查看完整的项目列表和架构：**[SEKAI 门户](https://sekai.nightcord.de5.net)**

---

**声明**：本项目受 _Project SEKAI COLORFUL STAGE! feat. Hatsune Miku_ 启发。

本项目是非官方、非商业性质的粉丝作品，与 SEGA、Colorful Palette、Crypton Future Media 或任何其他与《Project SEKAI》相关的版权持有方无任何官方关联。

所有游戏相关素材（包括但不限于角色、音乐、图像）的版权归其各自的版权持有方所有。

## 🤝 贡献

欢迎贡献！我们非常感谢任何形式的贡献。

在贡献之前，请阅读：

- [贡献指南](./CONTRIBUTING.md)
- [行为准则](./CODE_OF_CONDUCT.md)

## 🔒 安全

如果发现安全漏洞，请查看我们的 [安全政策](./SECURITY.md)。

## 📄 许可证

本项目采用 GNU Affero General Public License v3.0 only (AGPL-3.0-only) 许可证 - 详见 [LICENSE](./LICENSE) 文件。

第三方归属（原作 Pazuru-Pico、运行时库、字体等）见 [NOTICE](./NOTICE)。

⚠️ **重要提示**：AGPL-3.0-only 许可证仅适用于本项目的原创代码。游戏相关素材（音乐、图像等）的版权归 SEGA、Colorful Palette、Crypton Future Media 等原版权方所有。

## 📧 联系方式

- **GitHub Issues**: [https://github.com/25-ji-code-de/puzzle-sekai/issues](https://github.com/25-ji-code-de/puzzle-sekai/issues)
- **哔哩哔哩**: [@bili_47177171806](https://space.bilibili.com/3546904856103196)

## 🙏 致谢

- **[HamP (hamzaabamboo)](https://github.com/hamzaabamboo)** - 原项目 [Pazuru-Pico](https://github.com/hamzaabamboo/pazuru-pico) 作者
- **BanG Dream! Girls Band Party!☆PICO ～ OHMORI ～ Episode 9** - 原作灵感来源
- **Project SEKAI** - 角色与音乐素材来源

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个 Star！

[![Star History Chart](https://api.star-history.com/svg?repos=25-ji-code-de/puzzle-sekai&type=Date)](https://star-history.com/#25-ji-code-de/puzzle-sekai&Date)

---

<div align="center">

**[SEKAI 生态](https://sekai.nightcord.de5.net)** 的一部分

Made with 💜 by the [25-ji-code-de](https://github.com/25-ji-code-de) team

</div>
