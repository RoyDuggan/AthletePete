@echo off
setlocal
cd /d "%~dp0"

echo Creating advisory UI structure with starter code...

REM =========================
REM FOLDERS
REM =========================
mkdir src\components\advisory\AdvisorySummaryPanel 2>nul
mkdir src\components\advisory\LapComparisonView 2>nul
mkdir src\components\advisory\FeatureZoneVisualisation 2>nul
mkdir src\components\advisory\SetupAdvisoryPanel 2>nul
mkdir src\components\advisory\common 2>nul
mkdir src\views 2>nul
mkdir src\data 2>nul
mkdir src\styles 2>nul

REM =========================
REM VIEW: Advisory Dashboard
REM =========================
(
echo import AdvisorySummaryPanel from '../components/advisory/AdvisorySummaryPanel/AdvisorySummaryPanel';
echo import LapComparisonView from '../components/advisory/LapComparisonView/LapComparisonView';
echo import FeatureZoneVisualisation from '../components/advisory/FeatureZoneVisualisation/FeatureZoneVisualisation';
echo import SetupAdvisoryPanel from '../components/advisory/SetupAdvisoryPanel/SetupAdvisoryPanel';
echo import mockData from '../data/mockAdvisoryData';
echo.
echo export default function AdvisoryDashboard() {
echo   return (
echo     ^<div className="advisory-dashboard"^>
echo       ^<h1^>Karting Advisory Dashboard^</h1^>
echo       ^<AdvisorySummaryPanel data={mockData.summary} /^>
echo       ^<LapComparisonView data={mockData.lapComparison} /^>
echo       ^<FeatureZoneVisualisation data={mockData.featureZones} /^>
echo       ^<SetupAdvisoryPanel data={mockData.setup} /^>
echo     ^</div^>
echo   );
echo }
) > src\views\AdvisoryDashboard.jsx

REM =========================
REM COMPONENTS
REM =========================

REM Advisory Summary
(
echo export default function AdvisorySummaryPanel({ data }) {
echo   return (
echo     ^<div className="card"^>
echo       ^<h2^>Summary^</h2^>
echo       ^<p^>{data.text}^</p^>
echo     ^</div^>
echo   );
echo }
) > src\components\advisory\AdvisorySummaryPanel\AdvisorySummaryPanel.jsx

REM Lap Comparison
(
echo export default function LapComparisonView({ data }) {
echo   return (
echo     ^<div className="card"^>
echo       ^<h2^>Lap Comparison^</h2^>
echo       ^<p^>Fastest Lap: {data.fastestLap}^</p^>
echo       ^<p^>Second Fastest: {data.secondLap}^</p^>
echo       ^<p^>Delta: {data.delta}s^</p^>
echo     ^</div^>
echo   );
echo }
) > src\components\advisory\LapComparisonView\LapComparisonView.jsx

REM Feature Zones
(
echo export default function FeatureZoneVisualisation({ data }) {
echo   return (
echo     ^<div className="card"^>
echo       ^<h2^>Feature Zones^</h2^>
echo       {data.map((zone) =^> (
echo         ^<div key={zone.zoneNumber}^>
echo           Zone {zone.zoneNumber}: {zone.description}
echo         ^</div^>
echo       ))}
echo     ^</div^>
echo   );
echo }
) > src\components\advisory\FeatureZoneVisualisation\FeatureZoneVisualisation.jsx

REM Setup Advisory
(
echo export default function SetupAdvisoryPanel({ data }) {
echo   return (
echo     ^<div className="card"^>
echo       ^<h2^>Setup Advisory^</h2^>
echo       ^<p^>{data.jetting}^</p^>
echo     ^</div^>
echo   );
echo }
) > src\components\advisory\SetupAdvisoryPanel\SetupAdvisoryPanel.jsx

REM Common Card (optional reusable wrapper)
(
echo export default function SectionCard({ title, children }) {
echo   return (
echo     ^<div className="card"^>
echo       ^<h2^>{title}^</h2^>
echo       {children}
echo     ^</div^>
echo   );
echo }
) > src\components\advisory\common\SectionCard.jsx

REM =========================
REM MOCK DATA
REM =========================
(
echo const mockData = {
echo   summary: {
echo     text: "Fastest lap gained time in Main Slow Corner with better exit speed."
echo   },
echo   lapComparison: {
echo     fastestLap: 6,
echo     secondLap: 10,
echo     delta: 0.021
echo   },
echo   featureZones: [
echo     { zoneNumber: 1, description: "Main Slow Corner - strong exit" },
echo     { zoneNumber: 2, description: "Final Complex - RPM advantage" }
echo   ],
echo   setup: {
echo     jetting: "Consider slightly richer jetting due to RPM gain patterns."
echo   }
echo };
echo.
echo export default mockData;
) > src\data\mockAdvisoryData.js

REM =========================
REM BASIC STYLES
REM =========================
(
echo .advisory-dashboard {
echo   font-family: Arial, sans-serif;
echo   padding: 20px;
echo }
echo.
echo .card {
echo   border: 1px solid #ddd;
echo   border-radius: 8px;
echo   padding: 15px;
echo   margin-bottom: 15px;
echo   background: #f9f9f9;
echo }
) > src\styles\advisory.css

echo.
echo DONE - Advisory UI scaffold with starter code created.
pause