// src/stores/useSongUnlockSettingsStore.ts
// 歌曲解锁（VIP/版权受限兜底音源）的开关与音源配置。
//
// fork 私有功能，随上游把 useSettingsUiStore 拆分为领域 store 而独立成店。
// 沿用拆分前的 localStorage 键（use_song_unlock / song_unlock_servers），
// 老用户安装新版本时设置原样保留。

import { create } from 'zustand';
import { getStoredBoolean, setStoredBoolean } from './storagePrimitives';
import type { UnlockServerConfig } from '../types';

export const USE_SONG_UNLOCK_STORAGE_KEY = 'use_song_unlock';
export const SONG_UNLOCK_SERVERS_STORAGE_KEY = 'song_unlock_servers';

const DEFAULT_UNLOCK_SERVERS: UnlockServerConfig[] = [
    { key: 'netease', enabled: true },
    { key: 'bodian', enabled: true },
    { key: 'kuwo', enabled: false },
];

const readStoredServers = (): UnlockServerConfig[] => {
    try {
        if (typeof window === 'undefined') return [...DEFAULT_UNLOCK_SERVERS];
        const stored = localStorage.getItem(SONG_UNLOCK_SERVERS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as UnlockServerConfig[];
            if (Array.isArray(parsed) && parsed.length) {
                // 以默认表为准补齐新音源，保留用户已有的启用状态
                return DEFAULT_UNLOCK_SERVERS.map((server) => {
                    const storedServer = parsed.find((entry) => entry.key === server.key);
                    return storedServer ? { key: server.key, enabled: storedServer.enabled } : server;
                });
            }
        }
    } catch {
        // 解析失败按默认处理
    }
    return [...DEFAULT_UNLOCK_SERVERS];
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
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(SONG_UNLOCK_SERVERS_STORAGE_KEY, JSON.stringify(servers));
            }
        } catch {
            // 存储不可用时仅保留内存态
        }
    },
}));

