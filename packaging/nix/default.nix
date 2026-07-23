{
  lib,
  stdenv,
  fetchzip,
  autoPatchelfHook,
  copyDesktopItems,
  makeDesktopItem,
  makeWrapper,

  alsa-lib,
  fontconfig,
  freetype,
  glib,
  gtk3,
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
  nss,
  zlib,

  # pass the repo root (e.g. path:.) to build from local Git checkout
  # otherwise downloads the prebuilt release from GitHub
  src ? null,
}:

let
  versionJson = lib.importJSON ./version.json;
  pname = "folia-major";
  version = versionJson.version;

  runtimeDependencies = [
    alsa-lib
    fontconfig
    freetype
    glib
    gtk3
    libglvnd
    libX11
    libXcomposite
    libXcursor
    libXdamage
    libXext
    libXfixes
    libXi
    libXrandr
    libXrender
    libXScrnSaver
    libXtst
    mesa
    nss
    stdenv.cc.cc.lib
    zlib
  ];

  libraryPath = lib.makeLibraryPath runtimeDependencies;

  source = if src != null then src else fetchzip {
    url = "https://github.com/yigexuanmu/folia-major/releases/download/v${version}/folia-major-${version}-linux-x64.tar.gz";
    hash = versionJson."${stdenv.hostPlatform.system}-hash" or lib.fakeHash;
    stripRoot = false;
  };
in

stdenv.mkDerivation (finalAttrs: {
  inherit pname version;

  src = source;

  nativeBuildInputs = [
    autoPatchelfHook
    copyDesktopItems
    makeWrapper
  ];

  buildInputs = runtimeDependencies;

  desktopItems = [
    (makeDesktopItem {
      name = "folia-major";
      desktopName = "Folia Major";
      exec = "folia-major";
      icon = "folia-major";
      categories = [
        "Audio"
        "Utility"
      ];
    })
  ];

  installPhase = ''
    runHook preInstall

    appSourceDir=$(dirname "$(find . -type f -name 'folia-major' -perm -u+x | head -n1)")
    if [ -z "$appSourceDir" ]; then
      echo "Could not locate folia-major executable in source archive" >&2
      exit 1
    fi

    appdir=$out/lib/folia-major
    install -d $appdir
    cp -a "$appSourceDir"/. $appdir/

    install -Dm644 "$appSourceDir"/resources/icon.png \
      $out/share/icons/hicolor/512x512/apps/folia-major.png

    runHook postInstall
  '';

  postFixup = ''
    makeWrapper \
      $out/lib/folia-major/folia-major \
      $out/bin/folia-major \
      --prefix LD_LIBRARY_PATH : "${libraryPath}" \
      --set ELECTRON_OZONE_PLATFORM_HINT "auto" \
      --add-flags "--enable-features=UseOzonePlatform --ozone-platform=x11 --enable-wayland-ime --disable-gpu"
  '';

  meta = {
    description = "Lyrics Reimagined — immersive full-screen lyrics music player";
    longDescription = ''
      Folia is a full-screen immersive lyrics music player.
      Supports Netease Cloud Music, Navidrome, local music,
      AI-generated themes, and rich lyrics animations.
    '';
    homepage = "https://github.com/yigexuanmu/folia-major";
    license = lib.licenses.agpl3Only;
    mainProgram = "folia-major";
    maintainers = with lib.maintainers; [ ];
    platforms = [ "x86_64-linux" ];
  };
})
