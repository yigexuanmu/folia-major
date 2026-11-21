// electron/linuxVulkan.cjs
// Whether the Linux build turns Chromium's Vulkan feature on (FOLIA_LINUX_VULKAN, issue #752).
// On the X11 backend Chromium leaves Vulkan off, and WebGPU then finds no adapter at all, so the
// smart beat effects never run. On the native Wayland backend the opposite holds: WebGPU runs on
// Dawn's own Vulkan path and needs no feature (verified 2026-11-21, Electron 45: with the feature
// off the analysis models still load on the NVIDIA adapter), and turning the feature on there
// makes Chromium log "'--ozone-platform=wayland' is not compatible with Vulkan" against a broken
// compositor surface. So the feature is turned on on X11 and never on Wayland.
//
// Who decides: FOLIA_LINUX_VULKAN=1 turns it on, =0 keeps it off; unset, the app decides by itself -
// on when this machine actually has a Vulkan driver for Chromium to use (a .json ICD manifest under
// one of the loader's search paths), off when it does not, since a machine without Vulkan gains
// nothing from the feature while its GL path is known to work. WebGPU on the GPU analysis path
// (beatThisGpu) needs this: without the feature requestAdapter() answers null and the perf check
// reads "cannot analyse on the graphics card" on an otherwise capable machine.
//
// One layer this cannot fix, on either backend: the GPU process's own sandbox. On NixOS the driver
// manifests live under /run/opengl-driver, which the sandboxed GPU process cannot open (the loader
// logs "loader_get_json: Failed to open JSON file"), so even with the feature on, WebGPU finds no
// adapter there; launching with --no-sandbox is the only workaround, and it is the user's call
// (verified 2026-11-21 on NixOS 26.11, Electron 45, on both x11 and native Wayland). See
// packaging/linux/README-LINUX.txt.

const fs = require('fs');
const { resolveLinuxOzonePlatform } = require('./windowAlwaysOnTopSupport.cjs');

/**
 * Where the Vulkan loader looks for driver manifests: the XDG data dirs, the loader's compiled-in
 * defaults, and NixOS's /run/opengl-driver link. One .json in any of them means "this machine has
 * a Vulkan driver" - NVIDIA, Mesa and SwiftShader all ship one.
 *
 * @param env the environment to read XDG_DATA_DIRS from
 */
function vulkanIcdDirs(env = process.env) {
  const dataHome = env.XDG_DATA_HOME || (env.HOME ? `${env.HOME}/.local/share` : null);
  const dataDirs = [dataHome, ...(env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':')];
  return [...dataDirs.filter(Boolean).map((dir) => `${dir}/vulkan/icd.d`),
    '/etc/vulkan/icd.d',
    '/run/opengl-driver/share/vulkan/icd.d',
    '/run/opengl-driver-32/share/vulkan/icd.d'];
}

// CPU rasterizers ship Vulkan manifests too (Mesa's lavapipe, SwiftShader); on a machine with no
// hardware ICD at all, turning the feature on for one of those would move the whole compositor
// onto software Vulkan. The names they go by are few enough to filter out.
const SOFTWARE_ICD = /(^|[-_])(lvp|lavapipe|swiftshader|swrast)([-_.]|$)/i;

/**
 * Whether this machine has a hardware Vulkan driver manifest at all. Only ever an approximation
 * of "WebGPU will find an adapter" - the GPU process's sandbox can still be in the way (see the
 * header) - but it is the right question for choosing the feature default: without a manifest
 * there is nothing for the feature to turn on.
 */
function vulkanIcdPresent({ env = process.env, dirs = vulkanIcdDirs(env) } = {}) {
  for (const dir of dirs) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const hardware = entries.filter((entry) => entry.endsWith('.json') && !SOFTWARE_ICD.test(entry));
    if (hardware.length > 0) return true;
  }
  return false;
}

/**
 * Decides whether to enable Vulkan. `refused` names why a requested opt-in was ignored
 * ('graphics-mode' or 'not-x11'), and is null when it was honoured or never asked for.
 * `source` names why an enabled feature was enabled ('opt-in' or 'auto'), and is null when
 * it stayed off.
 */
function resolveLinuxVulkanChoice({
  platform = process.platform,
  env = process.env,
  ozonePlatform = '',
  graphicsMode = 'system',
  icdPresent = false,
} = {}) {
  if (platform !== 'linux') {
    return { enabled: false, refused: null, ozonePlatform: null, source: null };
  }

  const optedOut = env.FOLIA_LINUX_VULKAN === '0';
  const optedIn = env.FOLIA_LINUX_VULKAN === '1';
  if (optedOut) {
    return { enabled: false, refused: null, ozonePlatform: null, source: null };
  }

  const resolvedOzonePlatform = resolveLinuxOzonePlatform({ platform, ozonePlatform, env });
  // swiftshader and software modes keep Chromium off the host GPU stack on purpose.
  if (graphicsMode !== 'system') {
    return { enabled: false, refused: optedIn ? 'graphics-mode' : null, ozonePlatform: optedIn ? resolvedOzonePlatform : null, source: null };
  }
  if (resolvedOzonePlatform !== 'x11') {
    return { enabled: false, refused: optedIn ? 'not-x11' : null, ozonePlatform: optedIn ? resolvedOzonePlatform : null, source: null };
  }
  if (!optedIn && !icdPresent) {
    // No driver for the feature to serve: the old off is the honest answer, and stays quiet.
    return { enabled: false, refused: null, ozonePlatform: null, source: null };
  }
  return { enabled: true, refused: null, ozonePlatform: resolvedOzonePlatform, source: optedIn ? 'opt-in' : 'auto' };
}

/** Records the decision: the opt-in, the automatic turn-on, and the refusals a user asked for. */
function logLinuxVulkanChoice(choice, graphicsMode) {
  if (choice.enabled && choice.source === 'auto') {
    console.info('[LinuxGraphics] Vulkan enabled on the x11 backend (a Vulkan driver was found); FOLIA_LINUX_VULKAN=0 keeps it off outside wallpaper sessions');
  } else if (choice.enabled) {
    console.info('[LinuxGraphics] Vulkan enabled by FOLIA_LINUX_VULKAN=1 on the x11 backend');
  } else if (choice.refused === 'graphics-mode') {
    console.warn(`[LinuxGraphics] FOLIA_LINUX_VULKAN=1 ignored: graphics mode is ${graphicsMode}, not system`);
  } else if (choice.refused === 'not-x11') {
    console.warn(`[LinuxGraphics] FOLIA_LINUX_VULKAN=1 ignored: backend is ${choice.ozonePlatform}, Vulkan only works on x11 (--ozone-platform=x11)`);
  }
}

module.exports = {
  resolveLinuxVulkanChoice,
  logLinuxVulkanChoice,
  vulkanIcdPresent,
  vulkanIcdDirs,
};
