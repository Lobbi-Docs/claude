@echo off
REM Make all shell scripts executable (Windows version)
REM This adds execution permissions for Git Bash and WSL

echo Making scripts executable...

cd /d "%~dp0"

REM Use Git Bash if available
where bash >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Git Bash to set permissions...
    bash -c "chmod +x *.sh"
    bash -c "chmod +x ../hooks/scripts/*.sh"
    echo Done!
) else (
    echo Git Bash not found. Scripts are already executable on Windows.
    echo If you're using WSL, run: chmod +x scripts/*.sh
)

pause
