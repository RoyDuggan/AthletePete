@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   Karting MVP repo restructure starter
echo ============================================
echo.

REM -------------------------------------------------
REM Ensure we are in the project root
REM -------------------------------------------------
if not exist "backend" (
  echo ERROR: backend folder not found.
  echo Run this batch file from the root of karting-analysis.
  goto :end
)

if not exist "frontend" (
  echo ERROR: frontend folder not found.
  echo Run this batch file from the root of karting-analysis.
  goto :end
)

REM -------------------------------------------------
REM Create backup folder
REM -------------------------------------------------
set BACKUP_DIR=_restructure_backup
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating standard folder structure...

REM Backend folders
if not exist "backend\src" mkdir "backend\src"
if not exist "backend\src\routes" mkdir "backend\src\routes"
if not exist "backend\src\services" mkdir "backend\src\services"
if not exist "backend\src\utils" mkdir "backend\src\utils"
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\uploads" mkdir "backend\uploads"

REM Frontend folders
if not exist "frontend\public" mkdir "frontend\public"
if not exist "frontend\src" mkdir "frontend\src"
if not exist "frontend\src\assets" mkdir "frontend\src\assets"
if not exist "frontend\src\components" mkdir "frontend\src\components"
if not exist "frontend\src\pages" mkdir "frontend\src\pages"
if not exist "frontend\src\services" mkdir "frontend\src\services"
if not exist "frontend\src\types" mkdir "frontend\src\types"

REM -------------------------------------------------
REM Backup confusing root files if present
REM -------------------------------------------------
if exist "index.js" (
  echo Backing up root index.js
  copy /Y "index.js" "%BACKUP_DIR%\root-index.js.bak" >nul
)

if exist "package.json" (
  echo Backing up root package.json
  copy /Y "package.json" "%BACKUP_DIR%\root-package.json.bak" >nul
)

if exist "package-lock.json" (
  echo Backing up root package-lock.json
  copy /Y "package-lock.json" "%BACKUP_DIR%\root-package-lock.json.bak" >nul
)

REM -------------------------------------------------
REM Write root package.json (orchestration only)
REM -------------------------------------------------
echo Writing root package.json ...

(
echo {
echo   "name": "karting-analysis",
echo   "private": true,
echo   "scripts": {
echo     "dev:backend": "cd backend ^&^& npm run dev",
echo     "dev:frontend": "cd frontend ^&^& npm run dev",
echo     "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
echo     "build:backend": "cd backend ^&^& npm run build",
echo     "build:frontend": "cd frontend ^&^& npm run build",
echo     "build": "npm run build:backend ^&^& npm run build:frontend"
echo   },
echo   "devDependencies": {
echo     "concurrently": "^8.2.2"
echo   }
echo }
) > "package.json"

REM -------------------------------------------------
REM Root .gitignore
REM -------------------------------------------------
if not exist ".gitignore" (
  echo Writing root .gitignore ...
  (
  echo node_modules/
  echo .idea/
  echo dist/
  echo build/
  echo .DS_Store
  echo backend/node_modules/
  echo frontend/node_modules/
  echo backend/uploads/*
  echo !backend/uploads/.gitkeep
  echo _restructure_backup/
  ) > ".gitignore"
)

if not exist "backend\uploads\.gitkeep" (
  type nul > "backend\uploads\.gitkeep"
)

REM -------------------------------------------------
REM Backend package.json - only create if missing
REM -------------------------------------------------
if not exist "backend\package.json" (
  echo Creating backend\package.json ...
  (
  echo {
  echo   "name": "karting-backend",
  echo   "version": "1.0.0",
  echo   "private": true,
  echo   "main": "dist/index.js",
  echo   "scripts": {
  echo     "dev": "nodemon",
  echo     "build": "tsc",
  echo     "start": "node dist/index.js"
  echo   },
  echo   "dependencies": {
  echo     "cors": "^2.8.5",
  echo     "express": "^4.19.2",
  echo     "multer": "^1.4.5-lts.1"
  echo   },
  echo   "devDependencies": {
  echo     "@types/cors": "^2.8.17",
  echo     "@types/express": "^5.0.1",
  echo     "@types/multer": "^1.4.12",
  echo     "@types/node": "^22.10.2",
  echo     "nodemon": "^3.1.7",
  echo     "ts-node": "^10.9.2",
  echo     "typescript": "^5.7.2"
  echo   }
  echo }
  ) > "backend\package.json"
)

REM -------------------------------------------------
REM Backend nodemon.json - only create if missing
REM -------------------------------------------------
if not exist "backend\nodemon.json" (
  echo Creating backend\nodemon.json ...
  (
  echo {
  echo   "watch": ["src"],
  echo   "ext": "ts,json",
  echo   "ignore": ["uploads/*", "data/*", "dist/*"],
  echo   "exec": "npx ts-node src/index.ts"
  echo }
  ) > "backend\nodemon.json"
)

REM -------------------------------------------------
REM Backend tsconfig.json - only create if missing
REM -------------------------------------------------
if not exist "backend\tsconfig.json" (
  echo Creating backend\tsconfig.json ...
  (
  echo {
  echo   "compilerOptions": {
  echo     "target": "ES2020",
  echo     "module": "commonjs",
  echo     "rootDir": "./src",
  echo     "outDir": "./dist",
  echo     "strict": true,
  echo     "esModuleInterop": true,
  echo     "forceConsistentCasingInFileNames": true,
  echo     "skipLibCheck": true
  echo   },
  echo   "include": ["src/**/*"],
  echo   "exclude": ["node_modules", "dist"]
  echo }
  ) > "backend\tsconfig.json"
)

REM -------------------------------------------------
REM Backend starter files - only if missing
REM -------------------------------------------------
if not exist "backend\src\index.ts" (
  echo Creating backend\src\index.ts ...
  (
  echo import express from 'express';
  echo import cors from 'cors';
  echo import path from 'path';
  echo import uploadRoutes from './routes/uploadRoutes';
  echo.
  echo const app = express^(^);
  echo const PORT = process.env.PORT ^|^| 3001;
  echo.
  echo app.use^(cors^(^)^);
  echo app.use^(express.json^(^)^);
  echo.
  echo app.use^('/uploads', express.static^(path.join^(__dirname, '../uploads'^)^)^);
  echo app.use^('/api', uploadRoutes^);
  echo.
  echo app.get^('/api/health', ^(_req, res^) =^> {
  echo   res.json^({ status: 'ok' }^);
  echo }^);
  echo.
  echo app.listen^(PORT, ^(^) =^> {
  echo   console.log^(`Backend running on http://localhost:${PORT}`^);
  echo }^);
  ) > "backend\src\index.ts"
)

if not exist "backend\src\routes\uploadRoutes.ts" (
  echo Creating backend\src\routes\uploadRoutes.ts ...
  (
  echo import { Router } from 'express';
  echo import multer from 'multer';
  echo import path from 'path';
  echo import { handleUploadSession } from '../services/uploadService';
  echo.
  echo const router = Router^(^);
  echo.
  echo const storage = multer.diskStorage^({
  echo   destination: ^(_req, _file, cb^) =^> cb^(null, path.join^(__dirname, '../../uploads'^)^),
  echo   filename: ^(_req, file, cb^) =^> cb^(null, `${Date.now^(^)}-${file.originalname}`^)
  echo }^);
  echo.
  echo const upload = multer^({ storage }^);
  echo.
  echo router.post^('/upload-session', upload.single^('file'^), handleUploadSession^);
  echo.
  echo export default router;
  ) > "backend\src\routes\uploadRoutes.ts"
)

if not exist "backend\src\services\uploadService.ts" (
  echo Creating backend\src\services\uploadService.ts ...
  (
  echo import { Request, Response } from 'express';
  echo.
  echo export const handleUploadSession = async ^(req: Request, res: Response^) =^> {
  echo   try {
  echo     if ^(!req.file^) {
  echo       return res.status^(400^).json^({ error: 'No file uploaded.' }^);
  echo     }
  echo.
  echo     return res.json^({
  echo       message: 'Upload received',
  echo       fileName: req.file.originalname,
  echo       storedAs: req.file.filename,
  echo       parsedSessionInfo: {
  echo         sessionName: 'Placeholder Session',
  echo         track: 'TBC',
  echo         sampleRate: 20
  echo       },
  echo       setupAdvisory: {
  echo         jetting: {
  echo           pressureMb: 1008,
  echo           recommendedMainJet: 118,
  echo           confidence: 'Medium'
  echo         },
  echo         gearing: {
  echo           currentFront: 10,
  echo           currentRear: 80,
  echo           recommendation: '+2 rear teeth',
  echo           confidence: 'Medium'
  echo         }
  echo       }
  echo     }^);
  echo   } catch ^(error^) {
  echo     console.error^('Upload handler error:', error^);
  echo     return res.status^(500^).json^({ error: 'Server failed while parsing file.' }^);
  echo   }
  echo };
  ) > "backend\src\services\uploadService.ts"
)

if not exist "backend\src\utils\README.txt" (
  (
  echo Put backend helper utilities here.
  ) > "backend\src\utils\README.txt"
)

REM -------------------------------------------------
REM Frontend package.json - only create if missing
REM -------------------------------------------------
if not exist "frontend\package.json" (
  echo Creating frontend\package.json ...
  (
  echo {
  echo   "name": "karting-frontend",
  echo   "private": true,
  echo   "version": "1.0.0",
  echo   "type": "module",
  echo   "scripts": {
  echo     "dev": "vite",
  echo     "build": "tsc -b ^&^& vite build",
  echo     "preview": "vite preview"
  echo   },
  echo   "dependencies": {
  echo     "react": "^18.3.1",
  echo     "react-dom": "^18.3.1"
  echo   },
  echo   "devDependencies": {
  echo     "@types/react": "^18.3.12",
  echo     "@types/react-dom": "^18.3.1",
  echo     "@vitejs/plugin-react": "^4.3.4",
  echo     "typescript": "^5.6.3",
  echo     "vite": "^5.4.11"
  echo   }
  echo }
  ) > "frontend\package.json"
)

REM -------------------------------------------------
REM Frontend starter files - only if missing
REM -------------------------------------------------
if not exist "frontend\index.html" (
  echo Creating frontend\index.html ...
  (
  echo ^<!doctype html^>
  echo ^<html lang="en"^>
  echo ^<head^>
  echo   ^<meta charset="UTF-8" /^>
  echo   ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^>
  echo   ^<title^>Karting Analysis^</title^>
  echo ^</head^>
  echo ^<body^>
  echo   ^<div id="root"^>^</div^>
  echo   ^<script type="module" src="/src/main.tsx"^>^</script^>
  echo ^</body^>
  echo ^</html^>
  ) > "frontend\index.html"
)

if not exist "frontend\vite.config.ts" (
  echo Creating frontend\vite.config.ts ...
  (
  echo import { defineConfig } from 'vite';
  echo import react from '@vitejs/plugin-react';
  echo.
  echo export default defineConfig^({
  echo   plugins: [react^(^)],
  echo   server: {
  echo     port: 5173,
  echo     proxy: {
  echo       '/api': 'http://localhost:3001'
  echo     }
  echo   }
  echo }^);
  ) > "frontend\vite.config.ts"
)

if not exist "frontend\tsconfig.json" (
  echo Creating frontend\tsconfig.json ...
  (
  echo {
  echo   "compilerOptions": {
  echo     "target": "ES2020",
  echo     "useDefineForClassFields": true,
  echo     "lib": ["ES2020", "DOM", "DOM.Iterable"],
  echo     "allowJs": false,
  echo     "skipLibCheck": true,
  echo     "esModuleInterop": true,
  echo     "allowSyntheticDefaultImports": true,
  echo     "strict": true,
  echo     "forceConsistentCasingInFileNames": true,
  echo     "module": "ESNext",
  echo     "moduleResolution": "Node",
  echo     "resolveJsonModule": true,
  echo     "isolatedModules": true,
  echo     "noEmit": true,
  echo     "jsx": "react-jsx"
  echo   },
  echo   "include": ["src"],
  echo   "references": []
  echo }
  ) > "frontend\tsconfig.json"
)

if not exist "frontend\src\main.tsx" (
  echo Creating frontend\src\main.tsx ...
  (
  echo import React from 'react';
  echo import ReactDOM from 'react-dom/client';
  echo import App from './App';
  echo import './index.css';
  echo.
  echo ReactDOM.createRoot^(document.getElementById^('root'^)!^).render^(
  echo   ^<React.StrictMode^>
  echo     ^<App /^>
  echo   ^</React.StrictMode^>
  echo ^);
  ) > "frontend\src\main.tsx"
)

if not exist "frontend\src\App.tsx" (
  echo Creating frontend\src\App.tsx ...
  (
  echo export default function App^(^) {
  echo   return ^(
  echo     ^<div style^={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}^>
  echo       ^<h1^>Karting Analysis MVP^</h1^>
  echo       ^<p^>Frontend scaffold is in place.^</p^>
  echo       ^<p^>Next step: connect file upload and results view to the backend API.^</p^>
  echo     ^</div^>
  echo   ^);
  echo }
  ) > "frontend\src\App.tsx"
)

if not exist "frontend\src\index.css" (
  echo Creating frontend\src\index.css ...
  (
  echo body {
  echo   margin: 0;
  echo   background: #f3f4f6;
  echo   color: #111827;
  echo }
  echo.
  echo * {
  echo   box-sizing: border-box;
  echo }
  ) > "frontend\src\index.css"
)

if not exist "frontend\src\services\api.ts" (
  echo Creating frontend\src\services\api.ts ...
  (
  echo export async function healthCheck^(^) {
  echo   const response = await fetch^('/api/health'^);
  echo   if ^(!response.ok^) throw new Error^('Health check failed'^);
  echo   return response.json^(^);
  echo }
  ) > "frontend\src\services\api.ts"
)

if not exist "frontend\src\types\README.txt" (
  (
  echo Put shared frontend TypeScript types here.
  ) > "frontend\src\types\README.txt"
)

REM -------------------------------------------------
REM docker-compose placeholder - only create if missing
REM -------------------------------------------------
if not exist "docker-compose.yml" (
  echo Creating docker-compose.yml ...
  (
  echo version: "3.9"
  echo services:
  echo   backend:
  echo     build: ./backend
  echo     ports:
  echo       - "3001:3001"
  echo   frontend:
  echo     build: ./frontend
  echo     ports:
  echo       - "5173:5173"
  ) > "docker-compose.yml"
)

echo.
echo ============================================
echo Structure complete.
echo ============================================
echo.
echo Next steps:
echo   1. npm install
echo   2. cd backend ^&^& npm install
echo   3. cd ..\frontend ^&^& npm install
echo   4. cd ..
echo   5. npm run dev
echo.
echo Backups are in: %BACKUP_DIR%
echo.

:end
endlocal
pause