$content = [System.IO.File]::ReadAllText("c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\style.css")
$stack = New-Object System.Collections.ArrayList
$lines = $content -split "`r?`n"
$lineNum = 0
$extra = $false

foreach ($line in $lines) {
    $lineNum++
    for ($i = 0; $i -lt $line.Length; $i++) {
        $char = $line[$i]
        if ($char -eq '{') {
            $null = $stack.Add(@($lineNum, $line))
        } elseif ($char -eq '}') {
            if ($stack.Count -eq 0) {
                Write-Host "Extra closing brace at line ${lineNum}: ${line}"
                $extra = $true
            } else {
                $stack.RemoveAt($stack.Count - 1)
            }
        }
    }
}

if ($stack.Count -gt 0) {
    Write-Host "Unclosed braces:"
    foreach ($item in $stack) {
        Write-Host "  Line $($item[0]): $($item[1])"
    }
} elseif (-not $extra) {
    Write-Host "All braces match perfectly!"
}
