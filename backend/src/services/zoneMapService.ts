import { Response } from "express";

import {
    deleteZoneMap,
    getZoneMap,
    listZoneMaps,
    saveZoneMap,
} from "./zoneMapStore";
import { type AuthedRequest } from "../middleware/requireAuth";

/** GET /api/zone-maps — returns the user's saved-map library. */
export const handleListZoneMaps = (req: AuthedRequest, res: Response) => {
    try {
        return res.status(200).json({ zoneMaps: listZoneMaps(req.userId!) });
    } catch (error) {
        console.error("List zone-maps handler error:", error);

        return res.status(500).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Server failed while listing zone maps.",
        });
    }
};

/** POST /api/zone-maps — creates (or updates, when `id` is given) a zone map. */
export const handleCreateZoneMap = (req: AuthedRequest, res: Response) => {
    try {
        const { id, name, boundaries, trackLengthMeters } = req.body ?? {};

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "A map name is required." });
        }

        if (!Array.isArray(boundaries)) {
            return res
                .status(400)
                .json({ error: "boundaries must be an array of numbers." });
        }

        const zoneMap = saveZoneMap({
            id: typeof id === "string" ? id : undefined,
            userId: req.userId!,
            name,
            boundaries,
            trackLengthMeters:
                typeof trackLengthMeters === "number" ? trackLengthMeters : null,
        });

        return res.status(201).json({ zoneMap });
    } catch (error) {
        console.error("Create zone-map handler error:", error);

        return res.status(500).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Server failed while saving the zone map.",
        });
    }
};

/** DELETE /api/zone-maps/:id — removes a saved map. */
export const handleDeleteZoneMap = (req: AuthedRequest, res: Response) => {
    try {
        const id = String(req.params.id);

        if (!getZoneMap(id, req.userId!)) {
            return res.status(404).json({ error: "Zone map not found." });
        }

        deleteZoneMap(id, req.userId!);

        return res.status(200).json({ deleted: true });
    } catch (error) {
        console.error("Delete zone-map handler error:", error);

        return res.status(500).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Server failed while deleting the zone map.",
        });
    }
};
