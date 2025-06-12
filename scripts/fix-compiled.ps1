# Fix Compiled Next.js Code
# This script searches through all .js files in the .next directory and replaces
# all occurrences of 'prisma://' with 'file:' in the compiled code.

Write-Host "Starting Fix Compiled Next.js Code script..."

# Track stats
$filesSearched = 0
$filesModified = 0
$replacementsMade = 0

# Function to recursively search directories
function Search-Directory {
    param (
        [string]$directory
    )

    try {
        $files = Get-ChildItem -Path $directory -ErrorAction Stop

        foreach ($item in $files) {
            if ($item.PSIsContainer) {
                # It's a directory, recurse into it
                Search-Directory -directory $item.FullName
            } elseif ($item.Extension -eq ".js") {
                # It's a JS file
                $filesSearched++

                # Read file content
                $content = Get-Content -Path $item.FullName -Raw -ErrorAction Stop

                # Check if the file contains 'prisma://'
                if ($content -match 'prisma://') {
                    # Create backup of the file
                    Copy-Item -Path $item.FullName -Destination "$($item.FullName).bak" -ErrorAction Stop

                    # Replace all occurrences of 'prisma://' with 'file:'
                    $newContent = $content -replace 'prisma://', 'file:'

                    # Count replacements
                    $replCount = ([regex]::Matches($content, 'prisma://')).Count
                    $script:replacementsMade += $replCount

                    # Write the modified content back to the file
                    Set-Content -Path $item.FullName -Value $newContent -ErrorAction Stop

                    Write-Host "Modified $($item.FullName) ($replCount replacements)"
                    $script:filesModified++
                }
            }
        }
    } catch {
        Write-Error "Error processing directory $directory: $_"
    }
}

# Path to .next directory
$nextDir = Join-Path -Path (Get-Location) -ChildPath '.next'

# Check if .next directory exists
if (Test-Path -Path $nextDir) {
    Write-Host "Searching in $nextDir..."
    Search-Directory -directory $nextDir

    Write-Host "`nSummary:"
    Write-Host "Files searched: $filesSearched"
    Write-Host "Files modified: $filesModified"
    Write-Host "Total replacements: $replacementsMade"

    if ($filesModified -gt 0) {
        Write-Host "`nSuccess! Replaced all references to prisma:// with file: in compiled Next.js code."
    } else {
        Write-Host "`nNo files were modified. Either there were no references to prisma:// or an error occurred."
    }
} else {
    Write-Error "Error: .next directory not found at $nextDir"
}
