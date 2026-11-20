{
  lib,
  stdenv,
  fetchPnpmDeps,
  fetchFromGitLab,
  fetchurl,
  cmake,
  rustPlatform,
  rustfmt,
  python3,
  nodejs,
  pnpm,
  electron,
  copyDesktopItems,
  makeDesktopItem,
  makeWrapper,
  alsa-lib,
  at-spi2-core,
  cups,
  dbus,
  expat,
  fontconfig,
  freetype,
  glib,
  gtk3,
  libdrm,
  libglvnd,
  libX11,
  libXcomposite,
  libXcursor,
  libXdamage,
  libXext,
  libXfixes,
  libXi,
  libXrandr,
  libXrender,
  libXScrnSaver,
  libXtst,
  mesa,
  nspr,
  nss,
  pipewire,
  wayland,
  libxkbcommon,
  zlib,
  pnpmConfigHook,
  # pass src override for flake builds (e.g. self)
  src ? null,
}:

let
  pname = "folia-major";
  version = (builtins.fromJSON (builtins.readFile ../../package.json)).version;

  # Desktop wallpaper mode (wlr-layer-shell bottom layer) needs windowtolayer. We
  # bundle the same pinned revision + patches that packaging/linux/build-windowtolayer.mjs
  # applies for CI/dev builds (see packaging/linux/patches/README.md): the released
  # nixpkgs windowtolayer (v0.3.1) predates the popup-resilience and single-layer-window
  # fixes Folia relies on.
  windowtolayerRev = "618a482d791e90f4977d643c206417f6aee73936";

  windowtolayerSrc = fetchFromGitLab {
    domain = "gitlab.freedesktop.org";
    owner = "mstoeckl";
    repo = "windowtolayer";
    rev = windowtolayerRev;
    hash = "sha256-b2hkhcg+R3QUKw0ghgDb7KEUUPlFIjE7VzZ1Vf2EJag=";
  };

  windowtolayer = rustPlatform.buildRustPackage {
    pname = "windowtolayer";
    version = "0.3.1+git-${builtins.substring 0 7 windowtolayerRev}";
    src = windowtolayerSrc;
    cargoLock.lockFile = "${windowtolayerSrc}/Cargo.lock";
    patches = [
      ../linux/patches/windowtolayer-popup-resilience.patch
      ../linux/patches/windowtolayer-single-layer-window.patch
    ];
    # build.rs generates wayland protocol bindings with protogen.py, which pipes
    # the output through rustfmt
    nativeBuildInputs = [ python3 rustfmt ];
  };

  runtimeLibs = lib.makeLibraryPath [
    stdenv.cc.cc.lib alsa-lib at-spi2-core cups dbus expat
    fontconfig freetype glib gtk3 libdrm libglvnd
    libX11 libXcomposite libXcursor libXdamage libXext libXfixes
    libXi libXrandr libXrender libXScrnSaver libXtst
    mesa nspr nss pipewire wayland libxkbcommon zlib
  ];

  # 智能过渡（automix）与智能动感模式的两个模型，随安装包分发。哈希与
  # shared/modelManifest.json 里的一致（build/fetchModels.mjs 用同一组数字校验，上游换模型时
  # 这里会失配报错，照 manifest 改即可）；文件本身不进仓库，只有打包版从 models/ 里带上。
  beatThisWeights = fetchurl {
    # Beat This! final0：拍点。41102271 字节。
    url = "https://github.com/chthollyphile/folia-major/releases/download/models-v1/beat_this-wgsl.bin";
    hash = "sha256-Y2WuW6LkKSJ3LaAfv9C96N0gtzYqZ5AY54pfJR/oqWc=";
  };
  htdemucsWeights = fetchurl {
    # htdemucs：分轨。htdemucs 与 htdemucs_gpu 是同一个文件，91838176 字节。
    url = "https://github.com/chthollyphile/folia-major/releases/download/models-v1/htdemucs-wgsl.bin";
    hash = "sha256-J9UzGnSk4jsYFys9WdA3jmmP15vA0P7TMW2nfjo32NE=";
  };

  # 两个模型的 CPU 运行时：MNN 3.6.1（固定提交，与 build/buildMnnRuntime.mjs 的 MNN_COMMIT 同一个）
  # 加 native/folia-mnn 里自己的算子，编译成一个共享库，electron/analysis/mnn.cjs 用 koffi 载入。
  # 机器没有可用 WebGPU 时全部分析都走它，所以 Nix 包必须自己编一份。
  mnnRev = "d407447ed56c4121a11ccbd266dc184ca1ead0c2";
  mnnSource = fetchurl {
    url = "https://github.com/alibaba/MNN/archive/${mnnRev}.tar.gz";
    hash = "sha256-E9ypVH332sQKtAxzGBNkBvSjPf6ZzUC/qk27InDLh5U=";
  };

  # mnn.cjs 按 build/mnn/<mac|win|linux>-<arch>/ 找库，arch 取的是 process.arch（x64 / arm64）。
  nodeArch = if stdenv.hostPlatform.isAarch64 then "arm64" else "x64";
in

stdenv.mkDerivation (finalAttrs: {
  inherit pname version;

  src = src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    # 该哈希只对 flake 里 nixpkgs-js 固定的 pnpm/nodejs（见 flake.nix）成立，与调用方
    # nixpkgs 无关。升级 nixpkgs-js、改动 pnpm-lock.yaml 或 pnpm-workspace.yaml 后，
    # 用 nix build 报错里的 "got: sha256-..." 覆盖此值即可。
    hash = "sha256-0QTfNTqejIJwyE81Svx2uGdnAueAffdiuJ/wj1no67o=";
  };

  env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
  env.ELECTRON_DEV = "false";
  env.ELECTRON = "true";

  dontAutoPatchelf = true;

  nativeBuildInputs = [
    nodejs
    pnpm
    pnpmConfigHook
    cmake
    copyDesktopItems
    makeWrapper
  ];

  buildPhase = ''
    runHook preBuild

    # 分析用的 CPU 运行时（见上面 mnnSource）。装到 mnn.cjs 的默认查找位置，随下面的
    # `cp -a build` 一起进安装目录；包装脚本另外用 FOLIA_MNN_LIBRARY 指一次，两条路都通。
    mkdir -p .mnn-src
    tar -xzf ${mnnSource} -C .mnn-src --strip-components=1
    cmake -S native/folia-mnn -B .mnn-build \
      -DCMAKE_BUILD_TYPE=Release \
      -DMNN_SOURCE_DIR=$PWD/.mnn-src
    cmake --build .mnn-build --target folia_mnn -j''${NIX_BUILD_CORES:-1}
    mkdir -p build/mnn/linux-${nodeArch}
    cp .mnn-build/libfolia_mnn.so build/mnn/linux-${nodeArch}/libfolia_mnn.so

    pnpm exec vite build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    appdir=$out/lib/folia-major
    mkdir -p $appdir
    cp -a dist $appdir/
    # build/ assets: main.cjs resolves icons via __dirname/../build/*
    # (tray icon, thumbar icons); electron-builder copies them as extraResources
    # for packaged builds, the nix package needs them in-place too
    cp -a build $appdir/build
    # The two analysis models. main.cjs's getBundledModelsDirectory() is resources/models in a
    # packaged build and <app>/models here (this package is not electron-builder's), so they go
    # next to dist/ - without them automix says it needs the models and nothing analyses.
    mkdir -p $appdir/models
    cp ${beatThisWeights} $appdir/models/beat_this-wgsl.bin
    cp ${htdemucsWeights} $appdir/models/htdemucs-wgsl.bin
    cp -a electron $appdir/
    cp -a shared $appdir/
    cp package.json $appdir/
    cp -a node_modules $appdir/node_modules
    cp -a ${windowtolayer}/bin/windowtolayer $appdir/windowtolayer
    mkdir -p $out/bin
    makeWrapper ${electron}/bin/electron $out/bin/folia-major \
      --add-flags $appdir \
      --prefix LD_LIBRARY_PATH : "${runtimeLibs}" \
      --set ELECTRON_OZONE_PLATFORM_HINT "auto" \
      --set FOLIA_WINDOWTOLAYER_PATH $appdir/windowtolayer \
      --set FOLIA_MNN_LIBRARY $appdir/build/mnn/linux-${nodeArch}/libfolia_mnn.so \
      --add-flags "--enable-features=UseOzonePlatform --ozone-platform=x11 --enable-wayland-ime"
    install -Dm644 packaging/linux/folia-major.desktop \
      $out/share/applications/folia-major.desktop
    install -Dm644 build/icon.png \
      $out/share/icons/hicolor/512x512/apps/folia-major.png
    runHook postInstall
  '';

  desktopItems = [
    (makeDesktopItem {
      name = "folia-major";
      desktopName = "Folia Major";
      exec = "folia-major";
      icon = "folia-major";
      categories = [ "Audio" "Utility" ];
    })
  ];

  meta = {
    description = "Lyrics Reimagined — immersive full-screen lyrics music player";
    homepage = "https://github.com/yigexuanmu/folia-major";
    license = lib.licenses.agpl3Only;
    mainProgram = "folia-major";
    platforms = lib.platforms.linux;
  };
})
