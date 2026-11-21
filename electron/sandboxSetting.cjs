// electron/sandboxSetting.cjs
// Whether Chromium's sandbox is switched off, chosen in Settings > Performance (Linux only).
// NixOS and friends keep the Vulkan driver manifests where the GPU process's sandbox cannot open
// them (/run/opengl-driver on NixOS; Chromium upstream bug 569434837), so WebGPU finds no adapter
// and the GPU analysis (智能动感模式) cannot run. The only workaround today is Chromium's
// --no-sandbox, which unprotects the renderer as well - a real tradeoff, so the choice lives
// behind an explicit switch and never behind a default or a heuristic.
//
// macOS and Windows get nothing: their WebGPU works with the sandbox on, and --no-sandbox there
// would only be a liability. FOLIA_LINUX_NO_SANDBOX=1 forces the switch on (for a launcher that
// cannot reach the settings), =0 keeps it off; both win over the stored choice.

const SETTING_KEY = 'LINUX_NO_SANDBOX';

/** The stored value read as a boolean; anything else is false. */
function normalizeSandboxDisabled(value) {
    return value === true;
}

/**
 * Adds Chromium's --no-sandbox for the stored choice, or the environment's. Must run before the
 * ready event, while no process is running yet. A --no-sandbox already on the command line wins,
 * and then the stored choice is left alone. Answers what this run of the app does:
 * { disabled, source: 'setting' | 'env' | 'command-line' | null }.
 */
function applySandboxSetting({ app, store, env = process.env, platform = process.platform } = {}) {
    if (platform !== 'linux') {
        return { disabled: false, source: null };
    }
    if (app.commandLine.hasSwitch('no-sandbox')) {
        return { disabled: true, source: 'command-line' };
    }
    if (env.FOLIA_LINUX_NO_SANDBOX === '0') {
        return { disabled: false, source: 'env' };
    }
    if (env.FOLIA_LINUX_NO_SANDBOX === '1') {
        app.commandLine.appendSwitch('no-sandbox');
        return { disabled: true, source: 'env' };
    }
    if (!normalizeSandboxDisabled(store.get(SETTING_KEY))) {
        return { disabled: false, source: null };
    }
    app.commandLine.appendSwitch('no-sandbox');
    return { disabled: true, source: 'setting' };
}

/** Records the decision: every way the sandbox ends up off reaches the log, the env ones loudest. */
function logSandboxChoice(choice) {
    if (choice.disabled && choice.source === 'command-line') {
        console.info('[LinuxGraphics] Chromium sandbox off: --no-sandbox on the command line');
    } else if (choice.disabled && choice.source === 'env') {
        console.info('[LinuxGraphics] Chromium sandbox off: FOLIA_LINUX_NO_SANDBOX=1');
    } else if (choice.disabled) {
        console.warn('[LinuxGraphics] Chromium sandbox off by the settings switch: the renderer runs unsandboxed too');
    }
}

module.exports = { applySandboxSetting, logSandboxChoice, normalizeSandboxDisabled, SETTING_KEY };
