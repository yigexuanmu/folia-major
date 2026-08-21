{
  lib,
  stdenv,
  fetchPnpmDeps,
  fetchFromGitLab,
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
in

stdenv.mkDerivation (finalAttrs: {
  inherit pname version;

  src = src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    hash = "sha256-itypGerLvtqoESZRW7TejsT1PHfzapDzhKHJLjXMZlM=";
  };

  env.SKIP_NATIVE_BUILD = "true";
  env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
  env.ELECTRON_DEV = "false";
  env.ELECTRON = "true";

  dontAutoPatchelf = true;

  nativeBuildInputs = [
    nodejs
    pnpm.configHook
    copyDesktopItems
    makeWrapper
  ];

  buildPhase = ''
    runHook preBuild
    pnpm exec vite build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    appdir=$out/lib/folia-major
    mkdir -p $appdir
    cp -a dist $appdir/
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
