// src/stores/useSongUnlockSettingsStore.ts
// 歌曲解锁（VIP/版权受限兜底音源）的开关与音源配置。
//
// fork 私有功能，随上游把 useSettingsUiStore 拆分为领域 store 而独立成店。
// 沿用拆分前的 localStorage 键（use_song_unlock / song_unlock_servers），
// 老用户安装新版本时设置原样保留。读写都走 storagePrimitives（D508）。

import { create } from 'zustand';
import { getStoredBoolean, getStoredString, setStoredBoolean, setStoredString } from './storagePrimitives';
import type { SongUnlockServer, UnlockServerConfig } from '../types';

export const USE_SONG_UNLOCK_STORAGE_KEY = 'use_song_unlock';
export const SONG_UNLOCK_SERVERS_STORAGE_KEY = 'song_unlock_servers';

const DEFAULT_UNLOCK_SERVERS: UnlockServerConfig[] = [
    { key: 'netease', enabled: true },
    { key: 'bodian', enabled: true },
    { key: 'kuwo', enabled: false },
];

// 认不认这个音源，以默认表为准：平台名只在默认表里出现一次（omniArchitecture 的计数规则）。
const isUnlockServerKey = (value: unknown): value is SongUnlockServer =>
    typeof value === 'string' && DEFAULT_UNLOCK_SERVERS.some(server => server.key === value);

/** 存下来的一项 `{ key, enabled }`；认不出 key 的丢掉，enabled 只认真正的 true。 */
const readServerEntry = (value: unknown): UnlockServerConfig | null => {
    if (typeof value !== 'object' || value === null) return null;
    const entry = value as { key?: unknown; enabled?: unknown };
    if (!isUnlockServerKey(entry.key)) return null;
    return { key: entry.key, enabled: entry.enabled === true };
};

const readStoredServers = (): UnlockServerConfig[] => {
    const stored = getStoredString(SONG_UNLOCK_SERVERS_STORAGE_KEY, '');
    if (!stored) return [...DEFAULT_UNLOCK_SERVERS];
    let parsed: unknown;
    try {
        parsed = JSON.parse(stored);
    } catch {
        // 解析失败按默认处理
        return [...DEFAULT_UNLOCK_SERVERS];
    }
    if (!Array.isArray(parsed)) return [...DEFAULT_UNLOCK_SERVERS];
    const saved = parsed.map(readServerEntry).filter((entry): entry is UnlockServerConfig => entry !== null);
    if (!saved.length) return [...DEFAULT_UNLOCK_SERVERS];
    // 以默认表为准补齐新音源，保留用户已有的启用状态
    return DEFAULT_UNLOCK_SERVERS.map((server) => {
        const storedServer = saved.find(entry => entry.key === server.key);
        return storedServer ? { key: server.key, enabled: storedServer.enabled } : server;
    });
};

interface SongUnlockSettingsState {
    useSongUnlock: boolean;
    songUnlockServers: UnlockServerConfig[];
    handleToggleSongUnlock: (enable: boolean) => void;
    handleToggleSongUnlockServer: (key: string, enabled: boolean) => void;
}

export const useSongUnlockSettingsStore = create<SongUnlockSettingsState>()((set, get) => ({
    useSongUnlock: getStoredBoolean(USE_SONG_UNLOCK_STORAGE_KEY, true),
    songUnlockServers: readStoredServers(),

    handleToggleSongUnlock: (enable) => {
        set({ useSongUnlock: enable });
        setStoredBoolean(USE_SONG_UNLOCK_STORAGE_KEY, enable);
    },

    handleToggleSongUnlockServer: (key, enabled) => {
        const servers = get().songUnlockServers.map((server) =>
            server.key === key ? { ...server, enabled } : server,
        );
        set({ songUnlockServers: servers });
        setStoredString(SONG_UNLOCK_SERVERS_STORAGE_KEY, JSON.stringify(servers));
    },
}));
