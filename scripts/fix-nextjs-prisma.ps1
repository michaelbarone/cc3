# Running Next.js Prisma Protocol Fix Script
Write-Host "Running Next.js Prisma Protocol Fix..."

# 1. Run the PowerShell script to fix compiled code
Write-Host "Fixing compiled Next.js code..."
try {
    & "$PSScriptRoot\fix-compiled.ps1"
} catch {
    Write-Error "Error running fix-compiled.ps1: $_"
}

# 2. Fix any PrismaClient instantiations in compiled code
Write-Host "Fixing PrismaClient instantiations in compiled code..."
try {
    $jsFiles = Get-ChildItem -Path ".\.next" -Filter "*.js" -Recurse
    foreach ($file in $jsFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        if ($content -match "new PrismaClient\(") {
            $newContent = $content -replace "new PrismaClient\(", "new PrismaClient({datasources:{db:{url:""file:./data/app.db""}}})"
            Set-Content -Path $file.FullName -Value $newContent
            Write-Host "Updated PrismaClient in $($file.FullName)"
        }
    }
} catch {
    Write-Error "Error fixing PrismaClient instantiations: $_"
}

# 3. Update any database configuration references
Write-Host "Updating database configuration references..."
try {
    $jsFiles = Get-ChildItem -Path ".\.next" -Filter "*.js" -Recurse
    foreach ($file in $jsFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        if ($content -match "process\.env\.DATABASE_URL") {
            $newContent = $content -replace "process\.env\.DATABASE_URL", "(""file:./data/app.db"")"
            Set-Content -Path $file.FullName -Value $newContent
            Write-Host "Updated DATABASE_URL references in $($file.FullName)"
        }
    }
} catch {
    Write-Error "Error updating database configuration references: $_"
}

Write-Host "Next.js Prisma Protocol Fix completed"
