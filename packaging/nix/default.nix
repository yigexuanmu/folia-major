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
    rev = "b1fb5244da18b80a15775c9a753109c2e9979350";
    hash = "sha256-bxdrh/YI8GOFyOmfOBy0jwx9ReQdVK5Ign1a5yaydEo=";
  };

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    hash = "sha256-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=";
  };

  env.SKIP_NATIVE_BUILD = "true";
  env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
  env.ELECTRON_DEV = "false";
  env.ELECTRON = "true";

  nativeBuildInputs = [
    nodejs
    pnpm.configHook
    copyDesktopItems
    makeWrapper
    autoPatchelfHook
  ];

  buildPhase = ''
    runHook preBuild
    vite build
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
