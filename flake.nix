{
  description = "Folia Major — immersive full-screen lyrics music player";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # JS 工具链（pnpm / nodejs / fetchPnpmDeps）单独钉在一个固定修订上，不跟随调用方的 nixpkgs。
    # 原因：fetchPnpmDeps 的固定输出哈希取决于生成 pnpm store 的 pnpm 版本（store 布局与
    # v11/index.db 结构都随版本变）。下游若用 `inputs.nixpkgs.follows = "nixpkgs"`，每次
    # nixos-unstable 更新都可能换掉 pnpm，哈希随即失配（历史上已发生多次）。
    # 钉死后哈希与调用方 nixpkgs 无关；升级工具链修订时才需要重新生成哈希。
    nixpkgs-js.url = "github:NixOS/nixpkgs/6510408d147d8c5e6d76043e899e9251756f6a75";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-js,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        jsPkgs = import nixpkgs-js { inherit system; };
        folia-major = pkgs.callPackage ./packaging/nix/default.nix {
          src = self;
          # 这些一律取自 nixpkgs-js：pnpm store 由 jsPkgs 的 pnpm 生成，安装也必须用同一个
          # pnpm；fetchPnpmDeps 取自 jsPkgs，连带其 stdenvNoCC / sqlite / jq / nodejs-slim
          # 一起固定，调用方 nixpkgs 只再提供 stdenv、electron 与图形运行库。
          fetchPnpmDeps = jsPkgs.fetchPnpmDeps;
          pnpm = jsPkgs.pnpm;
          nodejs = jsPkgs.nodejs;
          pnpmConfigHook = jsPkgs.pnpmConfigHook;
        };
      in
      {
        packages.default = folia-major;
        packages.folia-major = folia-major;
      }
    );
}
