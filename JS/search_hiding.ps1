$content = [System.IO.File]::ReadAllText("c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\style.css")
# Let's search for rules that might hide elements
$matches = [System.Text.RegularExpressions.Regex]::Matches($content, '(?s)([^{]+)\{([^}]+)\}')
foreach ($m in $matches) {
    $selector = $m.Groups[1].Value.Trim()
    $body = $m.Groups[2].Value.Trim()
    
    # Check if body contains any hiding properties
    if ($body -match 'display\s*:\s*none' -or $body -match 'visibility\s*:\s*hidden' -or $body -match 'opacity\s*:\s*0(\.0*)?(\s|!|;)' -or $body -match 'font-size\s*:\s*0' -or $body -match 'color\s*:\s*transparent') {
        # filter out things like dead enemies, spinner, etc. if they aren't popup related, but let's print them all first to see
        Write-Host "Selector: $selector"
        Write-Host "Body: $body"
        Write-Host "----------------"
    }
}
