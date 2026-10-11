# Folia (个人 fork)

[chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的 fork。以全屏沉浸式歌词为核心，支持网易云、酷狗、Navidrome 与本地音乐库，提供 Electron 桌面端与 Web 版；本 fork 完整同步上游功能并持续跟踪上游稳定 release，差异只在下面的私房菜。

## 私房菜

按个人使用习惯做的一些改动，其余功能、界面与行为与上游保持一致。

| 项 | 说明 |
| --- | --- |
| 播放可用性增强 | 曲目无法直接播放时自动尝试其他来源，入口在 设置 → 播放。 |
| Linux 壁纸模式 | 打包 windowtolayer，桌面壁纸模式开箱可用。 |
| Nix 打包 | 仓库自带 flake，支持 `nix run` / `nix shell` / NixOS / Home Manager。 |
| 桌面端发行 | 自带 `Build All & Release` 工作流，产出 Windows / macOS / Linux 安装包。 |

## 安装

### 直接下载

Windows / macOS / Linux 安装包见 [Releases](https://github.com/yigexuanmu/folia-major/releases/latest)；Linux 也可解压 `folia-major-<版本>-linux-x64.tar.gz` 直接运行。

### Nix

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
}
# environment.systemPackages = [ inputs.folia-major.packages.${system}.default ];

# Home Manager
# home.packages = [ inputs.folia-major.packages.${system}.default ];
```

> `pnpm-deps` 的固定输出哈希随生成 store 的 pnpm 版本变化，所以 `flake.nix` 用固定修订输入 `nixpkgs-js` 单独钉住 pnpm / nodejs / `fetchPnpmDeps`，不跟随调用方 nixpkgs（否则 nixos-unstable 一滚动就失配）。升级该修订、改动 `pnpm-lock.yaml` 或 `pnpm-workspace.yaml` 后，用构建报错里的 `got: sha256-…` 覆盖 `packaging/nix/default.nix` 里的 `hash`。

AGPL-3.0 · 仅供个人学习，请通过官方平台支持正版音乐。
