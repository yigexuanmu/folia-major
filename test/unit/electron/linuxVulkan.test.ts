import { describe, expect, it } from 'vitest';

// test/unit/electron/linuxVulkan.test.ts
// Vulkan turns on for the X11 backend in system graphics mode: by opt-in (FOLIA_LINUX_VULKAN=1,
// issue #752) or, unset, by itself when the machine has a Vulkan driver manifest for it to serve;
// FOLIA_LINUX_VULKAN=0 keeps it off either way.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Options = {
    platform?: string;
    env?: Record<string, string | undefined>;
    ozonePlatform?: string;
    graphicsMode?: string;
    icdPresent?: boolean;
};

type Choice = { enabled: boolean; refused: string | null; ozonePlatform: string | null; source: 'opt-in' | 'auto' | null };

const { resolveLinuxVulkanChoice, vulkanIcdPresent, vulkanIcdDirs } = require('../../../electron/linuxVulkan.cjs') as {
    resolveLinuxVulkanChoice: (options?: Options) => Choice;
    vulkanIcdPresent: (options?: { env?: Record<string, string | undefined>; dirs?: string[] }) => boolean;
    vulkanIcdDirs: (env?: Record<string, string | undefined>) => string[];
};

const OPT_IN = { FOLIA_LINUX_VULKAN: '1' };
const OPT_OUT = { FOLIA_LINUX_VULKAN: '0' };

describe('resolveLinuxVulkanChoice', () => {
    it('stays off unless the opt-in is honoured or the machine has a Vulkan driver', () => {
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: {}, ozonePlatform: 'x11', icdPresent: false }))
            .toEqual({ enabled: false, refused: null, ozonePlatform: null, source: null });
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: {}, ozonePlatform: 'x11', icdPresent: true }))
            .toEqual({ enabled: true, refused: null, ozonePlatform: 'x11', source: 'auto' });
        expect(resolveLinuxVulkanChoice({ platform: 'win32', env: OPT_IN, ozonePlatform: 'x11' }).refused).toBeNull();
    });

    it('keeps FOLIA_LINUX_VULKAN=0 off even on a machine with a driver', () => {
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: OPT_OUT, ozonePlatform: 'x11', icdPresent: true }))
            .toEqual({ enabled: false, refused: null, ozonePlatform: null, source: null });
    });

    it('forces the opt-in through even with no driver manifest, and reads other values as unset', () => {
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: OPT_IN, ozonePlatform: 'x11', icdPresent: false }))
            .toEqual({ enabled: true, refused: null, ozonePlatform: 'x11', source: 'opt-in' });
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: { FOLIA_LINUX_VULKAN: '' }, ozonePlatform: 'x11', icdPresent: true }).source)
            .toBe('auto');
    });

    it('enables Vulkan on the x11 backend, including XWayland inside a Wayland session', () => {
        const waylandSession = { ...OPT_IN, XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0' };
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: waylandSession, ozonePlatform: 'x11', icdPresent: true }))
            .toEqual({ enabled: true, refused: null, ozonePlatform: 'x11', source: 'opt-in' });
        // The automatic decision names itself, so the log can say what to set to turn it off.
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: {}, ozonePlatform: 'x11', icdPresent: true }).source).toBe('auto');
    });

    it('refuses the opt-in on the native Wayland backend, where Vulkan takes the GPU process down', () => {
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: OPT_IN, ozonePlatform: 'wayland', icdPresent: true }))
            .toEqual({ enabled: false, refused: 'not-x11', ozonePlatform: 'wayland', source: null });
        // No --ozone-platform: falls back to the environment the way Chromium does.
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: { ...OPT_IN, WAYLAND_DISPLAY: 'wayland-1' } }).refused).toBe('not-x11');
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: { ...OPT_IN, DISPLAY: ':0' }, icdPresent: true }).enabled).toBe(true);
        // The unset app stays quiet there too: the refusal is only logged for an explicit opt-in.
        expect(resolveLinuxVulkanChoice({ platform: 'linux', env: {}, ozonePlatform: 'wayland', icdPresent: true }).refused).toBeNull();
    });

    it('refuses the opt-in outside the system graphics mode', () => {
        for (const graphicsMode of ['swiftshader', 'software']) {
            expect(resolveLinuxVulkanChoice({ platform: 'linux', env: OPT_IN, ozonePlatform: 'x11', graphicsMode, icdPresent: true }).refused)
                .toBe('graphics-mode');
            expect(resolveLinuxVulkanChoice({ platform: 'linux', env: {}, ozonePlatform: 'x11', graphicsMode, icdPresent: true }).enabled)
                .toBe(false);
        }
    });
});

describe('vulkanIcdPresent', () => {
    it('answers by the .json manifests in the search dirs', () => {
        const dir = mkdtempSync(join(tmpdir(), 'folia-icd-'));
        try {
            expect(vulkanIcdPresent({ dirs: [dir] })).toBe(false);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'nvidia_icd.json'), '{}');
            expect(vulkanIcdPresent({ dirs: [dir] })).toBe(true);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('does not count a CPU rasterizer as a Vulkan driver', () => {
        const dir = mkdtempSync(join(tmpdir(), 'folia-icd-'));
        try {
            mkdirSync(dir, { recursive: true });
            for (const name of ['lvp_icd.x86_64.json', 'vk_swiftshader_icd.json', 'mesa_swrast_icd.x86_64.json']) {
                writeFileSync(join(dir, name), '{}');
            }
            expect(vulkanIcdPresent({ dirs: [dir] })).toBe(false);
            // One hardware manifest beside them is enough.
            writeFileSync(join(dir, 'radeon_icd.x86_64.json'), '{}');
            expect(vulkanIcdPresent({ dirs: [dir] })).toBe(true);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('searches XDG_DATA_DIRS and the loader defaults, missing quietly what is not there', () => {
        const dir = mkdtempSync(join(tmpdir(), 'folia-icd-'));
        try {
            expect(vulkanIcdDirs({ XDG_DATA_DIRS: dir })).toContain(join(dir, 'vulkan', 'icd.d'));
            expect(vulkanIcdDirs({})).toContain('/usr/share/vulkan/icd.d');
            // The dirs the answer comes from are handed in, so the test never reads the real machine.
            expect(vulkanIcdPresent({ dirs: [join(dir, 'missing')] })).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
