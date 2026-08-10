<p align="center">
  <img src="/img/head2.png" alt="Folia" width="100%" />
</p>

<div align="center">

# Folia (个人 fork)

**Lyrics Reimagined // 辞曲新境**

基于 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的个性化分支，在保留上游完整功能的基础上，加了一些自己的私房菜。

[![GitHub release](https://img.shields.io/github/v/release/yigexuanmu/folia-major?label=release)](https://github.com/yigexuanmu/folia-major/releases)
[![License](https://img.shields.io/github/license/yigexuanmu/folia-major)](https://github.com/yigexuanmu/folia-major/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yigexuanmu/folia-major?style=social)](https://github.com/yigexuanmu/folia-major/stargazers)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

[上游仓库](https://github.com/chthollyphile/folia-major)

</div>

## 简介

Folia 是一个以全屏沉浸式歌词播放为核心的在线音乐播放器，支持网易云、酷狗、Navidrome 和本地音乐库，通过智能歌词匹配、AI 生成配色主题以及多种全屏歌词动画提供独特的听歌体验。提供基于 Electron 的 Windows / macOS / Linux 桌面端与基于 Node.js 的 Web 版本。

本 fork 在完整同步上游功能的同时，加了点自己的私房菜：

## 私房菜

这里是一些基于个人使用习惯做的改动，不定期更新，随缘维护：

## 展示

![visualizer](./img/visualizer.png)

### 演示视频

https://github.com/user-attachments/assets/af806cf1-f67f-4b88-b2e7-57db507e9e81

https://github.com/user-attachments/assets/fd27f4f0-64b9-4c57-8c3b-10df767f934b

https://github.com/user-attachments/assets/704f195a-2194-434b-86e8-8f36290e5cc4

### 部分主题预览

<table>
  <tr>
    <td width="50%">
      <img src="./img/preview-fume.png" alt="Fume 主题预览" />
    </td>
    <td width="50%">
      <img src="./img/preview-lumi.png" alt="Lumi 主题预览" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>浮名</strong></td>
    <td align="center"><strong>流光</strong></td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./img/preview-cad.png" alt="Cad 主题预览" />
    </td>
    <td width="50%">
      <img src="./img/preview-pat.png" alt="Pat 主题预览" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>心象</strong></td>
    <td align="center"><strong>云阶</strong></td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./img/preview-cappella.jpg" alt="群唱 主题预览" />
    </td>
    <td width="50%">
      <img src="./img/preview-tilt.png" alt="Tilt 主题预览" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>群唱</strong></td>
    <td align="center"><strong>倾诉</strong></td>
  </tr>
    <tr>
    <td width="50%">
      <img src="./img/preview-diorama.png" alt="镜台 主题预览" />
    </td>
    <td width="50%">
      <img src="./img/preview-pendolo.png" alt="时计 主题预览" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>镜台</strong></td>
    <td align="center"><strong>时计</strong></td>
  </tr>
</table>

不同的歌词动画具有不同的排版氛围和可调参数，让全屏歌词拥有如同文字PV般的丰富视觉效果，同时又能兼顾响应式布局，自动适配不同窗口尺寸。

## 核心能力

| 模块 | 说明 |
| --- | --- |
| 播放音源兜底 | 遇到无法直接播放的歌曲时，会尝试从其他平台找可用的音源（可在 设置 → 播放 中开关）。 |
| Nix 打包 | 提供 flake 构建，支持 `nix run` / `nix shell` / NixOS / Home Manager 安装，见 [Nix 安装](#nix-安装)。 |
| Linux 打包目标 | Linux 桌面端打包目标为 `dir`，方便直接使用产物。 |

其余功能与上游保持一致：全屏歌词动画、AI 主题生成、本地音乐库、多端部署等。

## 获取方式

### 直接下载

- **Windows / macOS / Linux**: 最新安装包请前往 [Releases 页面](https://github.com/yigexuanmu/folia-major/releases/latest) 下载。

### Nix 安装

仓库内包含完整的 Nix flake（`flake.nix`），无需额外配置：

```bash
# 直接运行（不安装）
nix run github:yigexuanmu/folia-major

# 临时进入 shell
nix shell github:yigexuanmu/folia-major -c folia-major

# 安装到系统（NixOS flake）
{
  inputs = {
    folia-major = {
      url = "github:yigexuanmu/folia-major";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  # 可选：复用你的 nixpkgs
  inputs.folia-major.inputs.nixpkgs.follows = "nixpkgs";
}
# environment.systemPackages = [ inputs.folia-major.packages.${system}.default ];

# Home Manager
# home.packages = [ inputs.folia-major.packages.${system}.default ];
```

## 本地开发

```bash
# npm
npm ci
npm run dev

# 或 pnpm
pnpm install --frozen-lockfile
pnpm dev

# 类型检查
npm run typecheck

# 桌面端构建
npm run build
npx electron-builder --win --publish never   # Windows
npx electron-builder --mac --publish never   # macOS
npx electron-builder --linux --publish never # Linux
```

## 与上游的关系

本仓库为 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的 fork，会持续跟踪并合并上游更新。除上述「私房菜」外，其余功能、界面与行为与上游保持一致。

## 免责声明

本项目在 AI 的广泛协助下开发，因此仍可能存在细微或不易察觉的问题。若给你带来不便，敬请理解。

本项目主要用于展示播放动效、界面设计与相关工程实现。应用中涉及的在线音乐流媒体、歌词、专辑封面及其他内容，其版权均归对应权利人所有。

本仓库及其源代码仅供个人学习、技术交流与非营利测试使用。请勿将其用于商业盈利用途。若因对在线资源的传播、加工或再分发而引发版权纠纷或其他责任，均由使用者自行承担，项目开发者不承担相关责任。

请始终尊重数字版权，并在条件允许时通过官方平台支持正版音乐。

## 许可证

本项目基于 `AGPL-3.0` 许可证开源，详情见 [LICENSE](LICENSE)。
