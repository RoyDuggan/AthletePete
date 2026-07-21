import { Request, Response } from "express";
import fs from "fs";
import path from "path";

import { parseAimCsv } from "./aimCsvParser";
import { detectLapsFromBeacons, type Lap } from "./lapDetector";
import {
  buildAdvisoryDataFromUpload,
  type ZoneBasis,
} from "./advisoryBuilder";
import { getZoneMap } from "./zoneMapStore";
import {
  MAX_SESSIONS,
  countSessions,
  createSessions,
  findStorageKeysByNames,
  userOwnsSession,
} from "./sessionStore";
import { consumeUploadCredit } from "./entitlementsService";
import type { AuthedRequest } from "../middleware/requireAuth";
import { buildLapMarkerConsistencyReport } from "./lapMarkerConsistency";
import { exportLapMarkerReportToExcel } from "./lapMarkerExcelExport";
import {
  interpretLapComparison,
  DEFAULT_LAP_PROMPT_TEMPLATE,
  type InterpretationRequest,
} from "./lapInterpretation";
import {
  interpretZone,
  DEFAULT_ZONE_PROMPT_TEMPLATE,
  type ZoneInterpretationRequest,
} from "./zoneInterpretation";
import {
  getUserPrompt,
  getUserPrompts,
  setUserPrompt,
  isPromptKey,
} from "./userPromptStore";
import { getDriverProfile } from "./driverProfileStore";
import { resolveFraming } from "./driverFramingStore";

/** Combined driver-framing override for a user, from their saved profile. */
function framingForUser(userId: string): string {
  const p = getDriverProfile(userId);
  return resolveFraming({
    ageBracket: p.ageBracket,
    experience: p.experience,
    coachingStyle: p.coachingStyle,
  });
}

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

function getUploadedFileText(file: Express.Multer.File): string {
  if (file.buffer) {
    return file.buffer.toString("utf-8");
  }

  if (file.path) {
    return fs.readFileSync(file.path, "utf-8");
  }

  throw new Error("Uploaded file content is not available.");
}

/** One parsed telemetry file in an uploaded group, numbered by upload order. */
type LoadedSession = {
  sessionId: string;
  sessionNumber: number;
  parsed: ReturnType<typeof parseAimCsv>;
  laps: Lap[];
};

/** Reference to a specific lap within the group (lap numbers repeat per file). */
type LapRef = { sessionId: string; lapNumber: number };

/** In/out laps are excluded from comparison everywhere. */
function isComparableLap(lap: Lap): boolean {
  return lap.lapType !== "out_lap" && lap.lapType !== "in_lap";
}

/** Loads + parses one already-uploaded file; null if it is missing. */
function loadSession(
  sessionId: string,
  sessionNumber: number
): LoadedSession | null {
  // Guard against path traversal — only ever read from the uploads dir.
  const safeName = path.basename(sessionId);
  const filePath = path.join(UPLOADS_DIR, safeName);

  if (!fs.existsSync(filePath)) return null;

  const parsed = parseAimCsv(fs.readFileSync(filePath, "utf-8"));
  const laps = detectLapsFromBeacons(parsed.samples, parsed.beaconMarkers);

  return { sessionId: safeName, sessionNumber, parsed, laps };
}

function sessionDisplayName(session: LoadedSession): string {
  // Prefer the reference string built from the AiM header metadata.
  const reference = session.parsed.reference?.trim();
  if (reference) return reference;

  // No metadata — stored files are "<timestamp>-<originalname>"; strip the prefix.
  return session.sessionId.replace(/^\d+-/, "");
}

/** Removes an uploaded file from the uploads dir; best-effort (never throws). */
function removeUploadedFile(storageKey: string): void {
  try {
    const filePath = path.join(UPLOADS_DIR, path.basename(storageKey));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn("Failed to remove duplicate upload:", storageKey, error);
  }
}

/** Approximate track length from a flying lap's sample distance span. */
function sessionTrackLength(session: LoadedSession): number | null {
  const lap =
    session.laps.find((l) => l.isValidFlyingLap) ?? session.laps[0] ?? null;
  const samples = lap?.samples ?? [];
  if (samples.length < 2) return null;

  const dist = (s: any) =>
    s?.distanceMeters ?? s?.distance ?? s?.Distance ?? null;
  const first = dist(samples[0]);
  const last = dist(samples[samples.length - 1]);
  if (typeof first !== "number" || typeof last !== "number") return null;

  const length = last - first;
  return length > 0 ? Math.round(length * 100) / 100 : null;
}

/**
 * Flat, session-aware list of every comparable (flying) lap across the group,
 * each prefixed with its session number so collisions in lap numbers between
 * files are unambiguous.
 */
function buildCombinedLaps(sessions: LoadedSession[]) {
  return sessions.flatMap((session) =>
    session.laps.filter(isComparableLap).map((lap) => ({
      lapId: `${session.sessionId}::${lap.lapNumber}`,
      sessionId: session.sessionId,
      sessionNumber: session.sessionNumber,
      lapNumber: lap.lapNumber,
      lapTimeSeconds: lap.lapTime,
      lapType: lap.lapType,
      isValidFlyingLap: lap.isValidFlyingLap,
      label: `S${session.sessionNumber} Lap ${lap.lapNumber}`,
    }))
  );
}

function lapRefLabel(sessions: LoadedSession[], ref: LapRef | null): string {
  if (!ref) return "n/a";
  const session = sessions.find((s) => s.sessionId === ref.sessionId);
  const number = session ? session.sessionNumber : "?";
  return `S${number} Lap ${ref.lapNumber}`;
}

function resolveLap(sessions: LoadedSession[], ref: LapRef | null): Lap | null {
  if (!ref) return null;
  const session = sessions.find((s) => s.sessionId === ref.sessionId);
  return session ? findLapByNumber(session.laps, ref.lapNumber) : null;
}

/**
 * Default comparison across the whole group: reference = fastest valid flying
 * lap, subject = the next fastest (both may come from different files).
 */
function defaultComparison(sessions: LoadedSession[]): {
  subject: LapRef | null;
  reference: LapRef | null;
} {
  const valid = sessions
    .flatMap((s) =>
      s.laps
        .filter((l) => l.isValidFlyingLap)
        .map((l) => ({ sessionId: s.sessionId, lap: l }))
    )
    .sort((a, b) => a.lap.lapTime - b.lap.lapTime);

  const toRef = (e?: { sessionId: string; lap: Lap }): LapRef | null =>
    e ? { sessionId: e.sessionId, lapNumber: e.lap.lapNumber } : null;

  return {
    reference: toRef(valid[0]),
    subject: toRef(valid[1]) ?? toRef(valid[0]),
  };
}

function findLapByNumber(laps: Lap[], lapNumber: unknown): Lap | null {
  const value =
    typeof lapNumber === "number" ? lapNumber : Number(lapNumber);

  if (!Number.isFinite(value)) return null;

  return laps.find((lap) => lap.lapNumber === value) ?? null;
}

/**
 * Builds the advisory response for a given pair of laps, plus the lap-selection
 * metadata (session token + all available laps) the UI needs to let the user
 * pick a different comparison.
 */
const ZONE_BASIS_VALUES: ZoneBasis[] = [
  "fastest",
  "within_2pct",
  "all",
  "custom",
];

function normaliseZoneBasis(value: unknown): ZoneBasis {
  return ZONE_BASIS_VALUES.includes(value as ZoneBasis)
    ? (value as ZoneBasis)
    : "fastest";
}

/**
 * Builds the advisory response for a chosen subject/reference pair that may come
 * from different files in the uploaded group, plus the session-aware lap list
 * the UI needs. Subject/reference default to the fastest pair across the group.
 */
function buildComparisonResponse(params: {
  sessions: LoadedSession[];
  subject: LapRef | null;
  reference: LapRef | null;
  zoneBasis: ZoneBasis;
  customBoundaries?: number[];
  customZoneMapId?: string;
}) {
  const { sessions } = params;

  const fallback = defaultComparison(sessions);
  const subjectRef = params.subject ?? fallback.subject;
  const referenceRef = params.reference ?? fallback.reference;

  const subjectLap = resolveLap(sessions, subjectRef);
  const referenceLap = resolveLap(sessions, referenceRef);

  // Metadata (session name/date/sample rate) comes from the subject lap's file;
  // the zone-basis pool is every comparable lap across the whole group.
  const subjectSession =
    sessions.find((s) => s.sessionId === subjectRef?.sessionId) ?? sessions[0];
  const basisPool = sessions.flatMap((s) => s.laps.filter(isComparableLap));

  const subjectLabel = lapRefLabel(sessions, subjectRef);
  const referenceLabel = lapRefLabel(sessions, referenceRef);

  const advisoryData = buildAdvisoryDataFromUpload({
    originalName: subjectSession ? sessionDisplayName(subjectSession) : "",
    sizeBytes: 0,
    parsed: subjectSession.parsed,
    laps: basisPool,
    fastestLap: subjectLap,
    secondFastestLap: referenceLap,
    zoneBasis: params.zoneBasis,
    customBoundaries: params.customBoundaries,
    customZoneMapId: params.customZoneMapId,
    subjectLabel,
    referenceLabel,
  });

  return {
    ...advisoryData,
    // sessionId stays the subject file so existing single-session guards work.
    sessionId: subjectRef?.sessionId ?? subjectSession?.sessionId ?? "",
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      sessionNumber: s.sessionNumber,
      name: sessionDisplayName(s),
      trackLengthMeters: sessionTrackLength(s),
    })),
    availableLaps: buildCombinedLaps(sessions),
    subjectSessionId: subjectRef?.sessionId ?? null,
    referenceSessionId: referenceRef?.sessionId ?? null,
    subjectLapNumber: subjectLap?.lapNumber ?? null,
    referenceLapNumber: referenceLap?.lapNumber ?? null,
    subjectLabel,
    referenceLabel,
  };
}

export const handleUploadSession = async (req: Request, res: Response) => {
  try {
    console.log("POST /api/upload-session hit");

    // Accept one or many files. upload.fields populates req.files as an object
    // keyed by field name; "files" is the multi-session field and "file" is the
    // legacy single-file field.
    const filesByField = (req.files ?? {}) as Record<
      string,
      Express.Multer.File[]
    >;
    const uploaded: Express.Multer.File[] = [
      ...(filesByField.files ?? []),
      ...(filesByField.file ?? []),
      ...(req.file ? [req.file] : []),
    ];

    if (uploaded.length === 0) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const userId = (req as AuthedRequest).userId!;

    // Parse each file up front (its reference string is needed before we persist
    // anything). A file that fails to parse is skipped and reported rather than
    // failing the whole batch — one bad export never loses the good sessions.
    const skipped: { name: string; reason: string }[] = [];
    const parsedFiles: { file: Express.Multer.File; session: LoadedSession }[] =
      [];

    uploaded.forEach((file) => {
      const sessionId =
        file.filename ?? (file.path ? path.basename(file.path) : "");
      try {
        const parsed = parseAimCsv(getUploadedFileText(file));
        const laps = detectLapsFromBeacons(parsed.samples, parsed.beaconMarkers);
        parsedFiles.push({
          file,
          session: {
            sessionId,
            sessionNumber: parsedFiles.length + 1,
            parsed,
            laps,
          },
        });
      } catch (error) {
        skipped.push({
          name: file.originalname ?? sessionId,
          reason: error instanceof Error ? error.message : "Could not read file.",
        });
        removeUploadedFile(sessionId);
      }
    });

    if (parsedFiles.length === 0) {
      return res.status(400).json({
        error:
          "None of the uploaded files could be read as AiM telemetry exports.",
        skipped,
      });
    }

    const sessions: LoadedSession[] = parsedFiles.map((pf) => pf.session);

    // Deduplicate against saved sessions (and within this batch) on the reference
    // string. A reference already stored for this user is not persisted again:
    // its freshly-written file is discarded and the session is repointed at the
    // existing copy, so re-uploading the same telemetry never creates duplicates.
    const references = sessions.map((s) => s.parsed.reference.trim());
    const existingByRef = await findStorageKeysByNames(userId, references);

    const seenInBatch = new Map<string, string>(); // reference -> storageKey
    const droppedInBatch = new Set<number>();
    const toPersist: {
      storageKey: string;
      name: string;
      originalName: string | null;
      sizeBytes: number | null;
    }[] = [];

    parsedFiles.forEach(({ file, session }, index) => {
      const physicalKey = session.sessionId;
      const reference = references[index];

      // No metadata → no reliable dedup key; keep the file and treat as unique.
      if (!reference) {
        toPersist.push({
          storageKey: physicalKey,
          name: sessionDisplayName(session),
          originalName: file.originalname ?? null,
          sizeBytes: typeof file.size === "number" ? file.size : null,
        });
        return;
      }

      const storedKey = existingByRef.get(reference);
      if (storedKey) {
        // Duplicate of a previously-saved session. Keep it in this analysis group
        // (the user may be comparing against it) but point at the stored copy and
        // drop the redundant upload.
        removeUploadedFile(physicalKey);
        session.sessionId = storedKey;
        return;
      }

      const earlierInBatch = seenInBatch.get(reference);
      if (earlierInBatch) {
        // Same file twice in one upload — drop the repeat from the group entirely.
        removeUploadedFile(physicalKey);
        droppedInBatch.add(index);
        return;
      }

      seenInBatch.set(reference, physicalKey);
      toPersist.push({
        storageKey: physicalKey,
        name: reference,
        originalName: file.originalname ?? null,
        sizeBytes: typeof file.size === "number" ? file.size : null,
      });
    });

    // Enforce the free-tier storage cap on the count of genuinely new sessions.
    const existingCount = await countSessions(userId);
    if (existingCount + toPersist.length > MAX_SESSIONS) {
      for (const item of toPersist) removeUploadedFile(item.storageKey);
      return res.status(403).json({
        error: `Session storage limit reached (${MAX_SESSIONS}). Delete some sessions or upgrade to upload more.`,
        code: "session_limit",
      });
    }

    await createSessions(userId, toPersist);

    // The analysis group excludes files dropped as in-batch duplicates, renumbered
    // so the S1/S2 labels stay contiguous.
    const groupSessions: LoadedSession[] = sessions
      .filter((_, index) => !droppedInBatch.has(index))
      .map((session, index) => ({ ...session, sessionNumber: index + 1 }));

    // Default comparison: fastest pair across the whole group.
    const response = buildComparisonResponse({
      sessions: groupSessions,
      subject: null,
      reference: null,
      zoneBasis: "fastest",
    });

    const lapMarkerReport = buildLapMarkerConsistencyReport(
      groupSessions.flatMap((s) => s.laps)
    );

    await exportLapMarkerReportToExcel(lapMarkerReport);

    // The dataset loaded successfully — charge one credit (no-op for subscribers).
    await consumeUploadCredit(userId);

    return res.status(200).json({
      ...response,
      lapMarkerReport,
      skipped,
    });
  } catch (error) {
    console.error("Upload handler error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Server failed while parsing file.",
    });
  }
};

/**
 * Re-runs the analysis for an already-uploaded group of sessions against a
 * user-chosen subject/reference pair, without re-uploading. The pair may span
 * different files (cross-session). Backward compatible with the single-session
 * shape: `sessionId` + `subjectLapNumber`/`referenceLapNumber`.
 */
export const handleAnalyseSession = async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      sessions: sessionIdsRaw,
      subjectSessionId,
      referenceSessionId,
      subjectLapNumber,
      referenceLapNumber,
      zoneBasis,
      customZoneMapId,
    } = req.body ?? {};

    // The group is the explicit sessions[] list, falling back to a lone
    // sessionId for the legacy single-session callers.
    const groupIds: string[] = Array.isArray(sessionIdsRaw)
      ? sessionIdsRaw.map((id: unknown) => String(id))
      : typeof sessionId === "string"
      ? [sessionId]
      : [];

    if (groupIds.length === 0) {
      return res
        .status(400)
        .json({ error: "sessionId or sessions[] is required." });
    }

    const userId = (req as AuthedRequest).userId!;

    // Load each file the user owns, dropping any that are missing or not theirs.
    const sessions: LoadedSession[] = [];
    for (const id of groupIds) {
      const safe = path.basename(id);
      if (!(await userOwnsSession(userId, safe))) continue;
      const loaded = loadSession(safe, sessions.length + 1);
      if (loaded) sessions.push(loaded);
    }

    if (sessions.length === 0) {
      return res.status(404).json({
        error: "Session file(s) not found. Please re-upload the telemetry.",
      });
    }

    // Build subject/reference refs. A ref is only used when its file is in the
    // group and the lap number is finite; otherwise it falls back to default.
    const makeRef = (sid: unknown, lapNum: unknown): LapRef | null => {
      const resolvedId = String(sid ?? sessionId ?? "");
      // A null/undefined/blank lap number means "no lap chosen" — fall back to
      // the default fastest-pair comparison. Guard explicitly because
      // Number(null) === 0, which would otherwise pass the isFinite check and
      // build a phantom "lap 0" ref that resolves to no lap (empty analysis).
      if (lapNum === null || lapNum === undefined || lapNum === "") return null;
      const n = Number(lapNum);
      if (!resolvedId || !Number.isFinite(n)) return null;
      if (!sessions.some((s) => s.sessionId === path.basename(resolvedId))) {
        return null;
      }
      return { sessionId: path.basename(resolvedId), lapNumber: n };
    };

    const subjectRef = makeRef(subjectSessionId, subjectLapNumber);
    const referenceRef = makeRef(referenceSessionId, referenceLapNumber);

    // Resolve a custom zone map when requested. An unknown/missing id falls back
    // to automatic "fastest" detection rather than failing the request.
    let resolvedBasis = normaliseZoneBasis(zoneBasis);
    let customBoundaries: number[] | undefined;
    let resolvedZoneMapId: string | undefined;

    if (resolvedBasis === "custom" && typeof customZoneMapId === "string") {
      const map = getZoneMap(customZoneMapId, userId);

      if (map) {
        customBoundaries = map.boundaries;
        resolvedZoneMapId = map.id;
      } else {
        resolvedBasis = "fastest";
      }
    } else if (resolvedBasis === "custom") {
      resolvedBasis = "fastest";
    }

    const response = buildComparisonResponse({
      sessions,
      subject: subjectRef,
      reference: referenceRef,
      zoneBasis: resolvedBasis,
      customBoundaries,
      customZoneMapId: resolvedZoneMapId,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Analyse-session handler error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Server failed while re-analysing the session.",
    });
  }
};

/**
 * Generates an AI "race data engineer" interpretation of the overall lap-to-lap
 * comparison. Called on demand from the dashboard (a paid Claude API call), so
 * it is a separate endpoint rather than part of the analysis pipeline.
 */
export const handleInterpretComparison = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as AuthedRequest).userId!;
    const body = (req.body ?? {}) as InterpretationRequest;

    if (!body.lapComparison) {
      return res
        .status(400)
        .json({ error: "lapComparison is required to interpret." });
    }

    // Prefer the template the client sent (reflects unsaved editor edits);
    // otherwise fall back to the user's saved account override.
    const template =
      typeof body.template === "string" && body.template.trim().length > 0
        ? body.template
        : getUserPrompt(userId, "lap") ?? undefined;

    const interpretation = await interpretLapComparison({
      ...body,
      template,
      framing: framingForUser(userId),
    });

    return res.status(200).json({ interpretation });
  } catch (error) {
    console.error("Interpret-comparison handler error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Server failed while generating the AI interpretation.";

    // A missing API key is a configuration issue, not a transient failure.
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;

    return res.status(status).json({ error: message });
  }
};

/** Returns the default, customisable per-zone prompt template. */
export const handleGetZonePromptTemplate = (_req: Request, res: Response) => {
  return res.status(200).json({ template: DEFAULT_ZONE_PROMPT_TEMPLATE });
};

/** Returns the default, customisable overall lap-interpretation prompt. */
export const handleGetLapPromptTemplate = (_req: Request, res: Response) => {
  return res.status(200).json({ template: DEFAULT_LAP_PROMPT_TEMPLATE });
};

/** GET /api/user-prompts — the caller's saved prompt overrides (per account). */
export const handleGetUserPrompts = (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  return res.status(200).json({ prompts: getUserPrompts(userId) });
};

/**
 * PUT /api/user-prompts — upserts one prompt override for the caller. An empty
 * template clears the override (resets to the server default). Body: { key,
 * template }.
 */
export const handleSaveUserPrompt = (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const { key, template } = (req.body ?? {}) as {
    key?: unknown;
    template?: unknown;
  };

  if (!isPromptKey(key)) {
    return res
      .status(400)
      .json({ error: "key must be one of 'lap' or 'zone'." });
  }
  if (typeof template !== "string") {
    return res.status(400).json({ error: "template must be a string." });
  }

  setUserPrompt(userId, key, template);
  return res.status(200).json({ prompts: getUserPrompts(userId) });
};

export const handleInterpretZone = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId!;
    const body = (req.body ?? {}) as ZoneInterpretationRequest;

    if (!body.values || typeof body.values !== "object") {
      return res
        .status(400)
        .json({ error: "values are required to interpret a zone." });
    }

    // Client template wins (live editor edits); else the saved account override.
    const template =
      typeof body.template === "string" && body.template.trim().length > 0
        ? body.template
        : getUserPrompt(userId, "zone") ?? undefined;

    const summary = await interpretZone({
      ...body,
      template,
      framing: framingForUser(userId),
    });

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Interpret-zone handler error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Server failed while generating the AI zone summary.";

    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;

    return res.status(status).json({ error: message });
  }
};
