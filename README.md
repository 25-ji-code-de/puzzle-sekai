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

## ✨ 特性

- 🎮 **经典玩法** - 匹配同组角色消除方块
- 👾 **NeneRobo** - 2×2 特殊方块
- 📱 **手机适配** - 触屏手势操控
- 🎭 **Emu 特殊技能** - Shift+↑ 飞行
- 🎯 **计分系统** - 硬降/软降/消除计分，连击加成，最高分记录
- 🎵 **BGM 系统** - 多首曲目随机切换
- 🗣️ **角色语音** - 每个角色掉落时播放语音
- ✨ **消除特效** - 变白→发光→粒子消散三段动画
- 🌐 **欢迎页面** - 操作说明与游戏介绍

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Yarn

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
```

## 🛠️ 技术栈

- **渲染**: [PixiJS v5](https://pixijs.com/) (pixi.js-legacy)
- **音频**: [pixi-sound](https://github.com/pixijs/sound) + Web Audio API
- **触控**: [Hammer.js](https://hammerjs.github.io/)
- **构建**: [Vite](https://vitejs.dev/)
- **语言**: TypeScript
- **样式**: SCSS

## 🎮 操作说明

### 键盘

| 按键 | 操作 |
| --- | --- |
| ← → | 左右移动 |
| ↑ / X | 顺时针旋转 |
| Z / Ctrl | 逆时针旋转 |
| ↓ | 加速下落 |
| Space | 直接落到底部 |
| Shift + ↑ | Emu 飞行 |
| R | 重新开始 |

### 手机

| 手势 | 操作 |
| --- | --- |
| ← → 滑动 | 左右移动 |
| 点击左/右半屏 | 旋转 |
| 下滑 | 直接落到底部 |
| 长按 | 加速下落 |

## 🌐 SEKAI 生态

本项目是 **SEKAI 生态**的一部分。

查看完整的项目列表和架构：**[SEKAI 门户](https://sekai.nightcord.de5.net)**

---

**声明**：本项目受 *Project SEKAI COLORFUL STAGE! feat. Hatsune Miku* 启发。

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
