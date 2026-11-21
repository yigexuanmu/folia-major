import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

// test/unit/electron/sandboxSetting.test.ts
// The Linux sandbox switch becomes Chromium's --no-sandbox, and the order of who decides is
// command-line > environment > the stored choice; off Linux it does nothing at all.

const require = createRequire(import.meta.url);

type FakeApp = {
    commandLine: { hasSwitch: (name: string) => boolean; appendSwitch: (name: string) => void };
};

const { applySandboxSetting } = require('../../../electron/sandboxSetting.cjs') as {
    applySandboxSetting: (input: { app: FakeApp; store: { get: (key: string) => unknown }; env?: Record<string, string | undefined>; platform?: string }) => { disabled: boolean; source: string | null };
};

const fakeApp = (passed: string[] = []) => {
    const appended: string[] = [];
    const app: FakeApp = {
        commandLine: {
            hasSwitch: name => passed.includes(name),
            appendSwitch: name => { appended.push(name); },
        },
    };
    return { app, appended };
};

const storeWith = (value: unknown) => ({ get: (key: string) => (key === 'LINUX_NO_SANDBOX' ? value : undefined) });

describe('applySandboxSetting', () => {
    it('does nothing off Linux, whatever the choice', () => {
        const { app, appended } = fakeApp();
        expect(applySandboxSetting({ app, store: storeWith(true), platform: 'win32' }))
            .toEqual({ disabled: false, source: null });
        expect(appended).toEqual([]);
    });

    it('reads the stored choice on Linux', () => {
        const on = fakeApp();
        expect(applySandboxSetting({ app: on.app, store: storeWith(true) }))
            .toEqual({ disabled: true, source: 'setting' });
        expect(on.appended).toEqual(['no-sandbox']);
        const off = fakeApp();
        expect(applySandboxSetting({ app: off.app, store: storeWith(false) }))
            .toEqual({ disabled: false, source: null });
        expect(off.appended).toEqual([]);
        // Anything but a real true reads as off.
        expect(applySandboxSetting({ app: fakeApp().app, store: storeWith('yes') }).disabled).toBe(false);
    });

    it('lets the environment win over the stored choice, both ways', () => {
        const forced = fakeApp();
        expect(applySandboxSetting({ app: forced.app, store: storeWith(false), env: { FOLIA_LINUX_NO_SANDBOX: '1' } }))
            .toEqual({ disabled: true, source: 'env' });
        expect(forced.appended).toEqual(['no-sandbox']);
        const held = fakeApp();
        expect(applySandboxSetting({ app: held.app, store: storeWith(true), env: { FOLIA_LINUX_NO_SANDBOX: '0' } }))
            .toEqual({ disabled: false, source: 'env' });
        expect(held.appended).toEqual([]);
        // Other values fall through to the stored choice.
        expect(applySandboxSetting({ app: fakeApp().app, store: storeWith(true), env: { FOLIA_LINUX_NO_SANDBOX: 'true' } }).disabled).toBe(true);
    });

    it('lets a --no-sandbox already on the command line win, and touches nothing then', () => {
        const { app, appended } = fakeApp(['no-sandbox']);
        expect(applySandboxSetting({ app, store: storeWith(false), env: {} }))
            .toEqual({ disabled: true, source: 'command-line' });
        expect(appended).toEqual([]);
    });
});
