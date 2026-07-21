@echo off
echo Creating backend structure...

REM Navigate to project root (adjust if needed)
cd /d %~dp0

REM Create backend folder
mkdir backend
cd backend

REM Create main folders
mkdir src
mkdir src\routes
mkdir src\services
mkdir src\utils
mkdir uploads

REM Create empty files
type nul > src\index.ts
type nul > nodemon.json

echo Backend structure created successfully!
pause
