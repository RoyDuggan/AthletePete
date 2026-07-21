import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * A user-defined ("custom") zone map: an ordered list of interior boundary
 * distances that partition a lap into contiguous zones. `n` boundaries produce
 * `n + 1` zones tiling [0 … lapLength]. Boundaries are stored as absolute
 * distance in metres from the lap start.
 */
export type ZoneMap = {
    id: string;
    /** Owner — zone maps are private to the user who created them. */
    userId: string;
    name: string;
    boundaries: number[];
    trackLengthMeters: number | null;
    createdAt: number;
    updatedAt: number;
};

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "zone-maps.json");

/** Reads the whole library. Returns [] if the file is missing or corrupt. */
function readAll(): ZoneMap[] {
    try {
        const text = fs.readFileSync(STORE_FILE, "utf-8");
        const parsed = JSON.parse(text);

        return Array.isArray(parsed) ? (parsed as ZoneMap[]) : [];
    } catch {
        return [];
    }
}

function writeAll(maps: ZoneMap[]): void {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(maps, null, 2), "utf-8");
}

/**
 * Normalises boundaries: drops non-finite values and any boundary <= 0, sorts
 * ascending, and collapses near-duplicates (within 0.01 m). Boundaries are NOT
 * clamped to a lap length here — a map may legitimately be reused on a
 * different-length track, so out-of-range clamping happens at analysis time.
 */
function normaliseBoundaries(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];

    const cleaned = raw
        .filter((b): b is number => typeof b === "number" && Number.isFinite(b))
        .filter((b) => b > 0)
        .sort((a, b) => a - b);

    const out: number[] = [];

    for (const b of cleaned) {
        if (out.length === 0 || b - out[out.length - 1] > 0.01) {
            out.push(b);
        }
    }

    return out;
}

export function listZoneMaps(userId: string): ZoneMap[] {
    return readAll().filter((map) => map.userId === userId);
}

export function getZoneMap(id: string, userId: string): ZoneMap | null {
    return (
        readAll().find((map) => map.id === id && map.userId === userId) ?? null
    );
}

/**
 * Creates a new zone map, or updates an existing one when `id` is supplied and
 * is owned by the user. Single source of truth for name/boundary normalisation.
 */
export function saveZoneMap(input: {
    id?: string;
    userId: string;
    name: string;
    boundaries: number[];
    trackLengthMeters: number | null;
}): ZoneMap {
    const name = String(input.name ?? "").trim();

    if (!name) {
        throw new Error("Zone map name is required.");
    }

    const boundaries = normaliseBoundaries(input.boundaries);
    const trackLengthMeters =
        typeof input.trackLengthMeters === "number" &&
        Number.isFinite(input.trackLengthMeters)
            ? input.trackLengthMeters
            : null;

    const maps = readAll();
    const now = Date.now();

    // Only an owned map may be updated by id; otherwise create a new one.
    const existingIndex = input.id
        ? maps.findIndex(
              (map) => map.id === input.id && map.userId === input.userId
          )
        : -1;

    if (existingIndex >= 0) {
        const updated: ZoneMap = {
            ...maps[existingIndex],
            name,
            boundaries,
            trackLengthMeters,
            updatedAt: now,
        };

        maps[existingIndex] = updated;
        writeAll(maps);

        return updated;
    }

    const created: ZoneMap = {
        id: crypto.randomUUID(),
        userId: input.userId,
        name,
        boundaries,
        trackLengthMeters,
        createdAt: now,
        updatedAt: now,
    };

    maps.push(created);
    writeAll(maps);

    return created;
}

export function deleteZoneMap(id: string, userId: string): boolean {
    const maps = readAll();
    const next = maps.filter(
        (map) => !(map.id === id && map.userId === userId)
    );

    if (next.length === maps.length) {
        return false;
    }

    writeAll(next);

    return true;
}

/** Removes every zone map owned by a user (for account deletion). */
export function deleteZoneMapsForUser(userId: string): number {
    const maps = readAll();
    const next = maps.filter((map) => map.userId !== userId);
    const removed = maps.length - next.length;
    if (removed > 0) writeAll(next);
    return removed;
}
