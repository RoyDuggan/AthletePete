import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

import { LapMarkerConsistencyReport } from "./lapMarkerConsistency";

function getUtcTimestamp(): string {
    const now = new Date();
    return now
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "Z");
}

export async function exportLapMarkerReportToExcel(
    report: LapMarkerConsistencyReport
) {
    const workbook = new ExcelJS.Workbook();

    // ---------------------------
    // Sheet 1: Marker Stats
    // ---------------------------
    const statsSheet = workbook.addWorksheet("Marker Stats");

    statsSheet.columns = [
        { header: "Marker", key: "markerName", width: 30 },
        { header: "Lap Count", key: "lapCount", width: 10 },
        { header: "Mean (m)", key: "meanDistanceMeters", width: 15 },
        { header: "Std Dev (m)", key: "standardDeviationMeters", width: 15 },
        { header: "Range (m)", key: "rangeMeters", width: 15 },
        { header: "Max Deviation (m)", key: "maxDeviationMeters", width: 20 },
        { header: "CV (%)", key: "coefficientOfVariationPercent", width: 10 },
        { header: "Status", key: "status", width: 15 },
    ];

    report.markerStats.forEach((stat) => {
        statsSheet.addRow(stat);
    });

    // ---------------------------
    // Sheet 2: Lap Markers
    // ---------------------------
    const lapSheet = workbook.addWorksheet("Lap Markers");

    lapSheet.columns = [
        { header: "Lap", key: "lapNumber", width: 8 },
        { header: "Lap Time (s)", key: "lapTimeSeconds", width: 15 },
        { header: "Lap Distance (m)", key: "lapDistanceMeters", width: 18 },

        { header: "High Speed Dist (lap m)", key: "highestSpeedDistanceIntoLapMeters", width: 25 },
        { header: "Turn-in Dist (lap m)", key: "turnInProxyDistanceIntoLapMeters", width: 25 },
        { header: "Apex Dist (lap m)", key: "apexProxyDistanceIntoLapMeters", width: 25 },
    ];

    report.lapMarkers.forEach((row) => {
        lapSheet.addRow({
            lapNumber: row.lapNumber,
            lapTimeSeconds: row.lapTimeSeconds,
            lapDistanceMeters: row.lapDistanceMeters,
            highestSpeedDistanceIntoLapMeters: row.highestSpeedDistanceIntoLapMeters,
            turnInProxyDistanceIntoLapMeters: row.turnInProxyDistanceIntoLapMeters,
            apexProxyDistanceIntoLapMeters: row.apexProxyDistanceIntoLapMeters,
        });
    });

    // ---------------------------
    // Write file
    // ---------------------------
    const timestamp = getUtcTimestamp();

    const dir = path.resolve(__dirname, "../../tests");

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(
        dir,
        `lap-marker-report-${timestamp}.xlsx`
    );

    await workbook.xlsx.writeFile(filePath);

    console.log("Excel report written:", filePath);
}