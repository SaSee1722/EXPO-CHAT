/**
 * AliasContext.tsx
 * Provides a global map of { profileId → alias } loaded once from SQLite.
 * Any screen can call useAlias() to get/set nicknames without extra DB calls.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from 'react';
import { getAllAliases, setAlias as dbSet, deleteAlias as dbDelete } from '@/services/database/aliasDB';

interface AliasContextValue {
    /** { profileId → alias } — populated from SQLite on mount */
    aliases: Record<string, string>;
    /**
     * Resolve a display name:
     * returns alias if one is set, otherwise falls back to realName
     */
    resolveName: (profileId: string | undefined, realName: string | undefined) => string;
    /** Save/update a nickname. Pass empty string to delete. */
    saveAlias: (profileId: string, alias: string) => Promise<void>;
    /** Remove a nickname */
    removeAlias: (profileId: string) => Promise<void>;
}

const AliasContext = createContext<AliasContextValue>({
    aliases: {},
    resolveName: (_id, name) => name ?? 'User',
    saveAlias: async () => {},
    removeAlias: async () => {},
});

export function AliasProvider({ children }: { children: ReactNode }) {
    const [aliases, setAliases] = useState<Record<string, string>>({});

    // Load all saved aliases from SQLite once on mount
    useEffect(() => {
        getAllAliases().then(setAliases).catch(console.error);
    }, []);

    const resolveName = useCallback(
        (profileId: string | undefined, realName: string | undefined): string => {
            if (profileId && aliases[profileId]) return aliases[profileId];
            return realName ?? 'User';
        },
        [aliases]
    );

    const saveAlias = useCallback(async (profileId: string, alias: string) => {
        await dbSet(profileId, alias);
        setAliases((prev) => {
            const next = { ...prev };
            if (alias.trim()) {
                next[profileId] = alias.trim();
            } else {
                delete next[profileId];
            }
            return next;
        });
    }, []);

    const removeAlias = useCallback(async (profileId: string) => {
        await dbDelete(profileId);
        setAliases((prev) => {
            const next = { ...prev };
            delete next[profileId];
            return next;
        });
    }, []);

    return (
        <AliasContext.Provider value={{ aliases, resolveName, saveAlias, removeAlias }}>
            {children}
        </AliasContext.Provider>
    );
}

export const useAlias = () => useContext(AliasContext);
