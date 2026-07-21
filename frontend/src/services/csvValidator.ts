export type CsvValidationResult = {
    isValid: boolean;
    errors: string[];
    warnings: string[];
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
    const columns = splitCsvLine(line).map(normalise);

    const firstColumnIsTime = columns[0] === "time";
    const hasSeveralColumns = columns.length >= 4;

    const hasTelemetryChannels =
        columns.some((column) => column.includes("gps")) ||
        columns.some((column) => column.includes("speed")) ||
        columns.some((column) => column.includes("rpm")) ||
        columns.some((column) => column.includes("distance"));

    return firstColumnIsTime && hasSeveralColumns && hasTelemetryChannels;
}

function isNumericTelemetryRow(line: string): boolean {
    const columns = splitCsvLine(line);
    const firstValue = cleanCell(columns[0] ?? "");

    return firstValue !== "" && !Number.isNaN(Number(firstValue));
}

export async function validateCsvFile(file: File): Promise<CsvValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!file) {
        errors.push("No file selected.");
        return { isValid: false, errors, warnings };
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
        errors.push("File must be a CSV file.");
    }

    if (file.size === 0) {
        errors.push("CSV file is empty.");
        return { isValid: false, errors, warnings };
    }

    const text = await file.text();

    if (text.trim().length === 0) {
        errors.push("CSV file contains no readable data.");
        return { isValid: false, errors, warnings };
    }

    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        errors.push("CSV file contains no usable rows.");
        return { isValid: false, errors, warnings };
    }

    const hasAimHeader = lines.some((line) =>
        normalise(line).includes("aim csv file")
    );

    if (!hasAimHeader) {
        warnings.push("File does not appear to be an AiM CSV export.");
    }

    const headerIndex = lines.findIndex(isTelemetryHeaderRow);

    if (headerIndex === -1) {
        errors.push(
            "Could not find telemetry header row. Expected a row beginning with 'Time' and containing GPS, speed, RPM, or distance channels."
        );
        return { isValid: false, errors, warnings };
    }

    const unitsRowIndex = headerIndex + 1;

    if (!lines[unitsRowIndex]) {
        errors.push("Units row not found after telemetry header row.");
        return { isValid: false, errors, warnings };
    }

    // 🔍 DEBUG OUTPUT
    console.log("HEADER INDEX:", headerIndex);
    console.log("HEADER LINE:", lines[headerIndex]);
    console.log("UNITS LINE:", lines[unitsRowIndex]);
    console.log(
        "NEXT 5 LINES AFTER UNITS:",
        lines.slice(unitsRowIndex + 1, unitsRowIndex + 6)
    );

    const debugRows = lines.slice(unitsRowIndex + 1, unitsRowIndex + 6).map((line) => {
        const split = splitCsvLine(line);
        const firstValue = cleanCell(split[0] ?? "");
        return {
            line,
            split,
            firstValue,
            isNumeric: !Number.isNaN(Number(firstValue)),
        };
    });

    console.log("NUMERIC TEST:", debugRows);

    // ✅ MAIN FIX: scan all rows after units for numeric data
    const dataRows = lines
        .slice(unitsRowIndex + 1)
        .filter(isNumericTelemetryRow);

    if (dataRows.length === 0) {
        errors.push("No telemetry data records found after the header and units rows.");
        return { isValid: false, errors, warnings };
    }

    if (dataRows.length < 20) {
        warnings.push("Very few telemetry rows were found. Analysis may be unreliable.");
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}