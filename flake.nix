{
  description = "Folia Major — immersive full-screen lyrics music player";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        folia-major = pkgs.callPackage ./packaging/nix/default.nix { src = self; };
      in
      {
        packages.default = folia-major;
        packages.folia-major = folia-major;
      }
    );
}
