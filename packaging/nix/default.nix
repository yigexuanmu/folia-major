{
  lib,
  stdenv,
  fetchFromGitHub,
  fetchPnpmDeps,
  nodejs,
  pnpm,
  electron,
  copyDesktopItems,
  makeDesktopItem,
  makeWrapper,
  autoPatchelfHook,
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
}:

let
  pname = "folia-major";
  version = (lib.importJSON ./version.json).version;

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

  src = fetchFromGitHub {
    owner = "yigexuanmu";
    repo = "folia-major";
    rev = "9af5c662f3396a54babcd8edad6b8f20d699903a";
    hash = "sha256-Swa7+pl+TIErgsAOVXPnkehFzko0Xj+EwPgBg1KSMl8=";
  };

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    hash = "sha256-t3W63ncj9QNIw+p+cNaH3s2yfgpEzw88A04Nz01kaRY=";
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

    cp -rL node_modules $appdir/node_modules

    mkdir -p $out/bin
    makeWrapper ${electron}/bin/electron $out/bin/folia-major \
      --add-flags $appdir \
      --prefix LD_LIBRARY_PATH : "${runtimeLibs}" \
      --set ELECTRON_OZONE_PLATFORM_HINT "auto" \
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
