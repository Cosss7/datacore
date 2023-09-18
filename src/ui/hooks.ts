import { Datacore } from "index/datacore";
import { debounce } from "obsidian";
import { IndexQuery } from "index/types/index-query";
import { Indexable } from "index/types/indexable";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SearchResult } from "index/datastore";
import { Literals } from "expression/literal";

/** Hook that updates the view whenever the revision updates, returning the newest revision. */
export function useIndexUpdates(datacore: Datacore, settings?: { debounce?: number }): number {
    const [revision, setRevision] = useState(datacore.datastore.revision);
    const debouncedRevision = useMemo(() => {
        if (settings?.debounce && settings.debounce == 0) return setRevision;
        else return debounce(setRevision, settings?.debounce ?? 500);
    }, [setRevision, settings?.debounce]);

    useEffect(() => {
        const ref = datacore.on("update", debouncedRevision);
        return () => datacore.offref(ref);
    }, []);

    return revision;
}

/** A hook which updates whenever file metadata for a specific file updates. */
export function useFileMetadata(
    datacore: Datacore,
    path: string,
    settings?: { debounce?: number }
): Indexable | undefined {
    const indexRevision = useIndexUpdates(datacore, settings);

    // TODO: I think load returns consistent objects so it should be okay.
    return useMemo(() => datacore.datastore.load(path), [indexRevision, path]);
}

export interface UseQuerySettings {
    /**
     * If present, debounce repeated query updates so that an update only occurs every <debounce> milliseconds. This
     * defaults to the overall default debounce settings.
     */
    debounce?: number;
}

/** Perform a live query which updates its results whenever the backing query would change. */
export function useFullQuery(
    datacore: Datacore,
    query: IndexQuery,
    settings?: UseQuerySettings
): SearchResult<Indexable> {
    // Track index updates with customizable debouncing.
    const indexRevision = useIndexUpdates(datacore, settings);

    // We "intern" the query, meaning we reuse the oldest version if it is semantically equal but just a different object.
    const internedQuery = useInterning(
        query,
        (a, b) => Literals.compare(a as Record<string, any>, b as Record<string, any>) == 0
    );
    // Intern the output as well so react diffing "just works" with the result of useQuery.
    const internedResult = useRef<SearchResult<Indexable> | undefined>(undefined);

    // On every index revision update, re-run the query and check if it produced meaningfully new values.
    return useMemo(() => {
        const newResult = datacore.datastore.search(query);
        if (internedResult.current === undefined) {
            internedResult.current = newResult;
            return newResult;
        }

        // If revisions differ, this is definitely a novel new result, so return it.
        const oldResult = internedResult.current;
        if (oldResult.revision != newResult.revision) {
            internedResult.current = newResult;
            return newResult;
        }

        // Revisions are the same, so we have to compare the object sets.
        if (!sameObjects(oldResult.results, newResult.results)) {
            internedResult.current = newResult;
            return newResult;
        }

        // Same revision and same objects, this is the same query result, so return the old object.
        return internedResult.current;
    }, [internedQuery, indexRevision]);
}

/** Simplier version of useFullQuery which just directly returns results. */
export function useQuery(datacore: Datacore, query: IndexQuery, settings?: UseQuerySettings): Indexable[] {
    return useFullQuery(datacore, query, settings).results;
}

/** Determines if the two sets of objects are the same. */
function sameObjects(old: Indexable[], incoming: Indexable[]) {
    if (old.length != incoming.length) return false;

    const olds: Record<string, number> = {};
    for (const indexable of old) {
        olds[indexable.$id] = indexable.$revision!;
    }

    for (const indexable of incoming) {
        const value = olds[indexable.$id];
        if (value == undefined) return false;
        if (value != indexable.$revision) return false;
    }

    return true;
}

/**
 * "Interns" the incoming value, returning the oldest equal instance. This is a trick to improve React diffing
 *  behavior, as two objects which are equals via equality(a, b) will return the same object reference after being
 *  interned.
 */
export function useInterning<T>(value: T, equality: (a: T, b: T) => boolean): T {
    const ref = useRef<T>();

    if (ref.current === undefined || !equality(ref.current, value)) {
        ref.current = value;
    }

    return ref.current;
}

/** Use a stable callback which hides mutable state behind a stable reference. */
export function useStableCallback<T>(callback: T, deps: any[]): T {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = callback;
    }, [callback, ...deps]);

    return useCallback(
        (...args: any[]) => {
            (ref.current as any)(...args);
        },
        [ref]
    ) as T;
}
