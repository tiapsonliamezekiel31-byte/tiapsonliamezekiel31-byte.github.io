# Deploy.ps1 - Automated deployment script
# Default parameters (can be edited manually before running)
$branch = "main"
$commitMsg = "feat: show specific item reward details and button labels in event claim popup"
$bumpSw = $true
$swTag = "auto" # "auto" generates timestamp tag
$buildCmd = ""  # e.g., "npm run build"
$triggerPagesRebuild = $false
$confirmBeforePush = $false
$pollLiveSwSecs = 30

function Get-RepoInfo {
    $remoteUrl = git config --get remote.origin.url
    if ($remoteUrl -match "[:/]([^/]+)/([^/]+?)(?:\.git)?$") {
        $owner = $matches[1]
        $repo = $matches[2]
    } else {
        Write-Error "Unable to parse remote URL: $remoteUrl"
        exit 1
    }
    return @($owner, $repo)
}

# Show current branch and status
Write-Host "Current branch:" (git rev-parse --abbrev-ref HEAD)
Write-Host "Uncommitted changes:" (git status --porcelain)

# Stage and commit any changes
if ((git status --porcelain) -ne "") {
    git add .
    if ($commitMsg -eq "") { $commitMsg = "auto-commit" }
    git commit -m $commitMsg
    Write-Host "Committed changes with message: $commitMsg"
} else { Write-Host "No changes to commit." }

# Bump Service Worker cache name if requested
if ($bumpSw) {
    $swFile = "sw.js"
    if (-not (Test-Path $swFile)) { Write-Error "$swFile not found"; exit 1 }
    $newTag = if ($swTag -eq "auto") { Get-Date -Format "yyyyMMdd-HHmm" } else { $swTag }
    (Get-Content $swFile) -replace "const CACHE_NAME = '[^']+'", "const CACHE_NAME = 'nemesis-ultimate-roguelike-$newTag'" | Set-Content $swFile
    git add $swFile
    git commit -m "ci: bump service worker cache to $newTag"
    Write-Host "Updated CACHE_NAME to $newTag"
}

# Run build command if provided
if ($buildCmd -ne "") {
    Write-Host "Running build command: $buildCmd"
    Invoke-Expression $buildCmd
    git add .
    git commit -m "ci: build artifacts"
}

# Push changes
if ($confirmBeforePush) {
    $confirm = Read-Host "Ready to push to origin/$branch? (y/n)"
    if ($confirm -ne "y") { Write-Host "Push aborted"; exit 0 }
}

git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed, attempting rebase..."
    git pull --rebase origin $branch
    if ($LASTEXITCODE -ne 0) { Write-Error "Rebase failed"; exit 1 }
    git push origin $branch
}

# Trigger pages rebuild if requested
if ($triggerPagesRebuild) {
    git commit --allow-empty -m "ci: trigger pages rebuild"
    git push origin $branch
}

# Verification
Write-Host "Last 5 commits (local):"
git log -5 --oneline
Write-Host "Last 5 commits (remote):"
git fetch origin $branch
git log -5 --oneline origin/$branch

# Fetch raw sw.js from repo and live site
$owner, $repo = Get-RepoInfo
$rawUrl = "https://raw.githubusercontent.com/$owner/$repo/$branch/sw.js"
$liveUrl = if ($repo -eq "$owner.github.io") { "https://$owner.github.io/sw.js" } else { "https://$owner.github.io/$repo/sw.js" }
Write-Host "Fetching raw sw.js from $rawUrl"
$rawContent = Invoke-WebRequest -Uri $rawUrl -UseBasicParsing | Select-Object -ExpandProperty Content
Write-Host "RAW CACHE_NAME:"
($rawContent -match "const CACHE_NAME = '([^']+)'") | Out-Null
$repoTag = $matches[1]
Write-Host $repoTag
Write-Host "Fetching live sw.js from $liveUrl"
$liveContent = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing | Select-Object -ExpandProperty Content
($liveContent -match "const CACHE_NAME = '([^']+)'") | Out-Null
Write-Host $matches[1]

# Poll if requested
if ($pollLiveSwSecs -gt 0) {
    $maxAttempts = [Math]::Ceiling(300 / $pollLiveSwSecs)
    $attempt = 0
    $liveTag = ""
    while ($attempt -lt $maxAttempts) {
        Write-Host "Polling attempt $($attempt + 1) of $maxAttempts..."
        Start-Sleep -Seconds $pollLiveSwSecs
        try {
            $liveContent = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing -ErrorAction Stop | Select-Object -ExpandProperty Content
            if ($liveContent -match "const CACHE_NAME = '([^']+)'") {
                $liveTag = $matches[1]
                Write-Host "Live tag is: $liveTag"
                if ($liveTag -eq $repoTag) { break }
            }
        } catch {
            Write-Warning "Failed to fetch live sw.js: $_"
        }
        $attempt++
    }
    if ($liveTag -eq $repoTag) { Write-Host "Live service worker matches repo tag ($repoTag)." } else { Write-Warning "Live service worker did not update within timeout (current: $liveTag, expected: $repoTag)." }
}

Write-Host "Deployment script completed."
