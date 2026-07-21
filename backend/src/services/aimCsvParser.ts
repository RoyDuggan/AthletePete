export type TelemetrySample = {
    time: number;

    // Existing aliases kept for backwards compatibility with older services.
    distance?: number;
    speed?: number;

    // Normalised names used by the newer alignment services.
    distanceMeters?: number;
    speedKmh?: number;

    rpm?: number;
    accelerometerY?: number;
    AccelerometerY?: number;
    accelerometerX?: number;
    AccelerometerX?: number;

    // Vehicle-frame acceleration in g (from AiM "GPS LatAcc" / "GPS LonAcc").
    latAccG?: number;
    lonAccG?: number;

    // GPS / spatial channels. These are optional because not every AiM export includes them.
    latitude?: number;
    longitude?: number;
    gpsX?: number;
    gpsY?: number;
};

export type AimCsvParseResult = {
    headerRowIndex: number;
    unitsRowIndex: number;
    dataStartRowIndex: number;
    channelNames: string[];
    units: string[];
    telemetrySampleCount: number;
    samples: TelemetrySample[];
    firstSample: TelemetrySample | null;
    lastSample: TelemetrySample | null;
    beaconMarkers: number[];
    gpsSampleCount: number;
    hasGps: boolean;

    // AiM header metadata (the "Session","Vehicle",… key/value rows at the top of
    // the export). Raw strings, empty when the field is absent.
    sessionName: string;
    vehicle: string;
    racer: string;
    championship: string;
    sessionDate: string;
    sessionTime: string;
    sampleRate: number | null;
    duration: number | null;

    // Short, readable identifier derived from the metadata; see buildSessionReference.
    reference: string;
};

function cleanCell(value: string): string {
    return value.trim().replace(/^"+|"+$/g, "");
}

function normalise(value: string): string {
    return cleanCell(value)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function splitCsvLine(line: string): string[] {
    if (line.includes(",")) {
        return line.split(",").map(cleanCell);
    }

    if (line.includes("\t")) {
        return line.split("\t").map(cleanCell);
    }

    if (line.includes(";")) {
        return line.split(";").map(cleanCell);
    }

    return line.split(/\s{2,}/).map(cleanCell);
}

function isTelemetryHeaderRow(line: string): boolean {
    const cols = splitCsvLine(line).map(normalise);

    const firstIsTime = cols[0] === "time";

    const hasChannels =
        cols.some((c) => c.includes("speed")) ||
        cols.some((c) => c.includes("rpm")) ||
        cols.some((c) => c.includes("gps")) ||
        cols.some((c) => c.includes("latitude")) ||
        cols.some((c) => c.includes("longitude")) ||
        cols.some((c) => c.includes("distance"));

    return firstIsTime && cols.length >= 4 && hasChannels;
}

function isNumericRow(line: string): boolean {
    const first = splitCsvLine(line)[0];
    return first !== "" && !Number.isNaN(Number(first));
}

function extractBeaconMarkers(text: string): number[] {
    const row = text
        .split(/\r?\n/)
        .find((line) => normalise(splitCsvLine(line)[0] ?? "").startsWith("beacon"));

    if (!row) return [];

    return splitCsvLine(row)
        .slice(1)
        .map((value) => Number(cleanCell(value)))
        .filter((value) => !Number.isNaN(value) && value > 0);
}

function isLatitudeHeader(name: string): boolean {
    return (
        name === "lat" ||
        name === "gps lat" ||
        name === "gps latitude" ||
        name.includes("latitude")
    );
}

function isLongitudeHeader(name: string): boolean {
    return (
        name === "lon" ||
        name === "lng" ||
        name === "long" ||
        name === "gps lon" ||
        name === "gps lng" ||
        name === "gps longitude" ||
        name.includes("longitude")
    );
}

function isGpsXHeader(name: string): boolean {
    return (
        name === "x" ||
        name === "gps x" ||
        name === "gpsx" ||
        name === "position x" ||
        name === "pos x" ||
        name === "local x" ||
        name === "gps x m"
    );
}

function isGpsYHeader(name: string): boolean {
    if (
        name.includes("accelerometer y") ||
        name.includes("accelerometery") ||
        name.includes("acceleration y")
    ) {
        return false;
    }

    return (
        name === "y" ||
        name === "gps y" ||
        name === "gpsy" ||
        name === "position y" ||
        name === "pos y" ||
        name === "local y" ||
        name === "gps y m"
    );
}

/**
 * Quote-aware split of a single CSV row. Unlike splitCsvLine (used for the
 * telemetry grid) this respects double-quoted cells, so a value like
 * `"Monday, March 23, 2026"` stays a single cell instead of splitting on its
 * internal commas. Only used for the AiM metadata header rows.
 */
function parseQuotedRow(line: string): string[] {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            cells.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    cells.push(cur);

    return cells.map((cell) => cell.trim());
}

/** Value of a top-of-file metadata row keyed by its (normalised) first cell. */
function metaValue(lines: string[], key: string): string {
    const row = lines.find(
        (line) => normalise(parseQuotedRow(line)[0] ?? "") === key
    );
    return row ? (parseQuotedRow(row)[1] ?? "").trim() : "";
}

const MONTHS: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
};

/** "Monday, March 23, 2026" → "2026-03-23" (null if unrecognised). */
function toIsoDate(raw: string): string | null {
    const match = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (!match) return null;

    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return null;

    return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

/** "12:08 PM" → "12:08" in 24-hour form (null if unrecognised). */
function to24HourTime(raw: string): string | null {
    const match = raw.match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
    if (!match) return null;

    let hour = Number(match[1]);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

/**
 * Short, readable identifier for a session, built from its AiM header metadata:
 * "<session> - <vehicle> - <YYYY-MM-DD HH:MM>". Missing parts are dropped so the
 * result stays tidy, and the date/time fall back to their raw strings when they
 * can't be parsed. Used both as the saved-session display name and as the dedup
 * key, so re-uploading the same telemetry file doesn't store it twice.
 */
function buildSessionReference(meta: {
    sessionName: string;
    vehicle: string;
    sessionDate: string;
    sessionTime: string;
}): string {
    const isoDate = toIsoDate(meta.sessionDate) ?? meta.sessionDate.trim();
    const time = to24HourTime(meta.sessionTime) ?? meta.sessionTime.trim();
    const stamp = [isoDate, time].filter(Boolean).join(" ").trim();

    return [meta.sessionName.trim(), meta.vehicle.trim(), stamp]
        .filter(Boolean)
        .join(" - ");
}

export function parseAimCsv(text: string): AimCsvParseResult {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const beaconMarkers = extractBeaconMarkers(text);

    // AiM header metadata sits in the "key","value" rows above the telemetry grid.
    const sessionName = metaValue(lines, "session");
    const vehicle = metaValue(lines, "vehicle");
    const racer = metaValue(lines, "racer");
    const championship = metaValue(lines, "championship");
    const sessionDate = metaValue(lines, "date");
    const sessionTime = metaValue(lines, "time");
    const sampleRateRaw = Number(metaValue(lines, "sample rate"));
    const durationRaw = Number(metaValue(lines, "duration"));
    const reference = buildSessionReference({
        sessionName,
        vehicle,
        sessionDate,
        sessionTime,
    });

    const headerRowIndex = lines.findIndex(isTelemetryHeaderRow);

    if (headerRowIndex === -1) {
        throw new Error("Telemetry header row not found.");
    }

    const unitsRowIndex = headerRowIndex + 1;
    const dataStartRowIndex = headerRowIndex + 2;

    const headerCols = splitCsvLine(lines[headerRowIndex]);
    const unitCols = splitCsvLine(lines[unitsRowIndex] || "");

    const samples: TelemetrySample[] = [];

    for (let i = dataStartRowIndex; i < lines.length; i++) {
        const line = lines[i];

        if (!isNumericRow(line)) continue;

        const cols = splitCsvLine(line);

        const time = Number(cols[0]);
        if (Number.isNaN(time)) continue;

        const sample: TelemetrySample = { time };

        headerCols.forEach((name, index) => {
            const n = normalise(name);
            const value = Number(cols[index]);

            if (Number.isNaN(value)) return;

            // Vehicle-frame g acceleration. Check before lat/long and the raw
            // accelerometer channels so "GPS LatAcc"/"GPS LonAcc" bind here.
            if (n.includes("latacc") || n.includes("lateral acc")) {
                sample.latAccG = value;
                return;
            }

            if (n.includes("lonacc") || n.includes("longitudinal acc")) {
                sample.lonAccG = value;
                return;
            }

            if (n.includes("accelerometer x") || n.includes("accelerometerx")) {
                sample.accelerometerX = value;
                sample.AccelerometerX = value;
                return;
            }

            if (isLatitudeHeader(n)) {
                sample.latitude = value;
                return;
            }

            if (isLongitudeHeader(n)) {
                sample.longitude = value;
                return;
            }

            if (isGpsXHeader(n)) {
                sample.gpsX = value;
                return;
            }

            if (isGpsYHeader(n)) {
                sample.gpsY = value;
                return;
            }

            if (n.includes("distance")) {
                sample.distance = value;
                sample.distanceMeters = value;
                return;
            }

            if (n.includes("speed") && !n.includes("distance")) {
                sample.speed = value;
                sample.speedKmh = value;
                return;
            }

            if (n.includes("rpm")) {
                sample.rpm = value;
                return;
            }

            if (
                n.includes("accelerometer y") ||
                n.includes("accelerometery") ||
                n.includes("acceleration y") ||
                n.includes("lateral")
            ) {
                sample.accelerometerY = value;
                sample.AccelerometerY = value;
                return;
            }
        });

        samples.push(sample);
    }

    const gpsSampleCount = samples.filter(
        (sample) =>
            (sample.latitude !== undefined && sample.longitude !== undefined) ||
            (sample.gpsX !== undefined && sample.gpsY !== undefined)
    ).length;

    return {
        beaconMarkers,
        headerRowIndex,
        unitsRowIndex,
        dataStartRowIndex,
        channelNames: headerCols,
        units: unitCols,
        telemetrySampleCount: samples.length,
        samples,
        firstSample: samples[0] ?? null,
        lastSample: samples[samples.length - 1] ?? null,
        gpsSampleCount,
        hasGps: gpsSampleCount > 0,

        sessionName,
        vehicle,
        racer,
        championship,
        sessionDate,
        sessionTime,
        sampleRate: Number.isFinite(sampleRateRaw) ? sampleRateRaw : null,
        duration: Number.isFinite(durationRaw) ? durationRaw : null,
        reference,
    };
}
