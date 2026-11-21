import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useDesktopSettingsStore } from '../../../../../stores/useDesktopSettingsStore';
import { Reveal, Row, Toggle, type SettingsOptionDef } from '../../kit';

// src/components/modal/settings/pages/graphics/NoSandboxRow.tsx
// The 关闭浏览器沙箱 row of the 动画与性能 page (Linux desktop only): the saved choice, what this
// run actually started with, and the reminders - a change waits for the next launch, and an
// environment variable or the command line can take the decision away from this row.

type NoSandboxState = Awaited<ReturnType<NonNullable<NonNullable<Window['electron']>['getLinuxNoSandboxState']>>>;

export const NoSandboxRow: React.FC<{ option: SettingsOptionDef }> = ({ option }) => {
    const { t } = useTranslation();
    const { enabled, setEnabled } = useDesktopSettingsStore(useShallow(state => ({
        enabled: state.linuxNoSandbox,
        setEnabled: state.handleToggleLinuxNoSandbox,
    })));
    // What this run started with; it does not change until the app restarts.
    const [state, setState] = useState<NoSandboxState>(null);

    useEffect(() => {
        let cancelled = false;
        window.electron?.getLinuxNoSandboxState?.()
            .then(next => { if (!cancelled) setState(next); })
            .catch((error: unknown) => console.warn('[Sandbox] Reading the sandbox state failed', error));
        return () => { cancelled = true; };
    }, []);

    const forced = state?.source === 'env';
    const fromCommandLine = state?.source === 'command-line';
    const waitsForRestart = state !== null && !forced && !fromCommandLine && state.applied !== enabled;

    return (
        <>
            <Row option={option} hint={t('options.noSandboxHint')} note={t('options.noSandboxDesc')}>
                <Toggle checked={enabled} onChange={setEnabled} />
            </Row>
            <Reveal when={waitsForRestart}>
                <Row sub notice={t('options.noSandboxRestartNotice')} />
            </Reveal>
            <Reveal when={forced || fromCommandLine}>
                <Row sub notice={t('options.noSandboxOverriddenNotice')} />
            </Reveal>
        </>
    );
};
