$ErrorActionPreference = "Continue"

Write-Host "Running Vite Build..."
& npm run build 2>&1 | Tee-Object -FilePath "build_log_debug.txt"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful. Copying files..."
    if (!(Test-Path "WorldOfIdeas_GitHub_Build")) {
        New-Item -ItemType Directory -Force -Path "WorldOfIdeas_GitHub_Build"
    }
    Copy-Item "dist/index.html" -Destination "WorldOfIdeas_GitHub_Build/index.html" -Force
    Write-Host "Standalone created."
} else {
    Write-Host "Build FAILED."
}
