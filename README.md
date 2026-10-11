# Folia (个人 fork)

**Lyrics Reimagined // 辞曲新境**

[chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的 fork。以全屏沉浸式歌词为核心，支持网易云、酷狗、Navidrome 与本地音乐库，提供 Electron 桌面端与 Web 版；本 fork 完整同步上游功能并持续跟踪上游稳定 release，差异只在下面的私房菜。

## 获取方式

### 直接下载

- **Windows / macOS / Linux**：安装包见 [Releases](https://github.com/yigexuanmu/folia-major/releases/latest)。
- **Linux**：也可解压 `folia-major-<版本>-linux-x64.tar.gz` 直接运行。

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
}
# environment.systemPackages = [ inputs.folia-major.packages.${system}.default ];

# Home Manager
# home.packages = [ inputs.folia-major.packages.${system}.default ];
```

> **关于 `pnpm-deps` 哈希与工具链**：`flake.nix` 额外用输入 `nixpkgs-js` 钉住 pnpm / nodejs
> 与 `fetchPnpmDeps` 的实现版本。`pnpm` 的固定输出哈希取决于生成 store 的 pnpm 版本，
> 因此它不能跟随调用方的 nixpkgs —— 否则 `nixos-unstable` 每次滚动更新 pnpm，
> `folia-major-pnpm-deps` 的哈希就会失配，`nix build` 直接失败（历史上已发生多次）。
> `nixpkgs-js` 是固定修订，不跟随，所以哈希与你的 nixpkgs 无关。升级该修订、改动
> `pnpm-lock.yaml` 或 `pnpm-workspace.yaml` 后，用构建报错里的 `got: sha256-…` 覆盖
> `packaging/nix/default.nix` 中的 `hash` 即可。

## 私房菜

按个人使用习惯做的一些改动，其余功能、界面与行为与上游保持一致。

| 项 | 说明 |
| --- | --- |
| 播放可用性增强 | 曲目无法直接播放时自动尝试其他来源，入口在 设置 → 播放。 |
| Linux 壁纸模式 | 打包 windowtolayer，桌面壁纸模式开箱可用。 |
| Nix 打包 | 仓库自带 flake，支持 `nix run` / `nix shell` / NixOS / Home Manager。 |
| 桌面端发行 | 自带 `Build All & Release` 工作流，产出 Windows / macOS / Linux 安装包。 |

## 本地开发

```bash
npm ci                 # 或 pnpm install --frozen-lockfile
npm run dev            # 开发服务器
npm run typecheck      # 类型检查
npm run test:unit      # 单元测试
npm run build          # 构建 web 资源
npx electron-builder --linux --publish never   # 桌面端打包（--win / --mac 同理）
```

## 免责声明

仅供个人学习、技术交流与非营利测试，请勿商用。应用内涉及的在线音乐、歌词与封面版权归对应权利人所有，请通过官方平台支持正版音乐。

## 许可证

`AGPL-3.0`，详见 [LICENSE](LICENSE)。
