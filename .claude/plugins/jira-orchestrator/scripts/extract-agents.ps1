$agentsDir = "C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\plugins\jira-orchestrator\agents"
$output = @{}

Get-ChildItem "$agentsDir\*.md" | ForEach-Object {
    $name = $_.BaseName
    $content = Get-Content $_.FullName -Raw

    # Extract description
    if ($content -match 'description:\s*(.+)') {
        $desc = $matches[1].Trim()
    } else {
        $desc = "Agent for $name"
    }

    # Extract model
    if ($content -match 'model:\s*(\w+)') {
        $model = $matches[1].Trim()
    } else {
        $model = "sonnet"
    }

    $output[$name] = @{
        description = $desc
        model = $model
        handler = "agents/$name.md"
    }
}

$output | ConvertTo-Json -Depth 3
