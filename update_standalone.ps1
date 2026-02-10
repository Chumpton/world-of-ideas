# Build script to creating a standalone HTML file and place it in the WorldOfIdeas_GitHub_Build folder
Write-Host "Building World of Ideas Standalone..."
Write-Host "Cleaning previous build..."
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }

# Ensure the target directory exists
if (!(Test-Path "WorldOfIdeas_GitHub_Build")) {
    New-Item -ItemType Directory -Force -Path "WorldOfIdeas_GitHub_Build"
}

npm run build

if ($LASTEXITCODE -eq 0) {
    Copy-Item "dist/index.html" -Destination "WorldOfIdeas_GitHub_Build/index.html" -Force
    Write-Host "Success! GitHub Build created at: WorldOfIdeas_GitHub_Build/index.html"

    # Also update the Desktop Standalone folder
    $desktopStandalone = "../World_of_Ideas_Standalone"
    if (Test-Path $desktopStandalone) {
        Copy-Item "dist/index.html" -Destination "$desktopStandalone/index.html" -Force
        Write-Host "Success! Desktop Standalone updated at: $desktopStandalone/index.html"
    }
    else {
        Write-Host "Warning: Desktop Standalone directory not found at $desktopStandalone"
    }
}
else {
    Write-Host "Build failed."
}
