$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = 'v7'
$outputDir = Join-Path $projectRoot ('presentation_' + $version)
$pptPath = Join-Path $projectRoot ('research_plan_professor_feedback_' + $version + '.pptx')
$app = New-Object -ComObject PowerPoint.Application
$deck = $app.Presentations.Open($pptPath, $true, $false, $false)
$issues = @()
$fontNames = @{}
try {
    foreach ($slide in $deck.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
                $range = $shape.TextFrame2.TextRange
                $fontNames[$range.Font.Name] = $true
                if ($range.BoundHeight -gt $shape.Height + 1 -or $range.BoundWidth -gt $shape.Width + 1) {
                    $issues += [PSCustomObject]@{
                        Slide = $slide.SlideIndex
                        Text = $range.Text
                        BoxWidth = $shape.Width
                        TextWidth = $range.BoundWidth
                        BoxHeight = $shape.Height
                        TextHeight = $range.BoundHeight
                    }
                }
            }
        }
        $pngPath = Join-Path $outputDir ('slide-{0:D2}.png' -f $slide.SlideIndex)
        $slide.Export($pngPath, 'PNG', 1600, 900)
    }
    $deck.SaveAs((Join-Path $projectRoot ('research_plan_professor_feedback_' + $version + '.pdf')), 32)
    [PSCustomObject]@{ Slides = $deck.Slides.Count; Fonts = @($fontNames.Keys); OverflowCount = $issues.Count; Issues = $issues } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outputDir 'powerpoint-check.json') -Encoding UTF8
    Write-Output ('Slides: {0}; fonts: {1}; overflow: {2}' -f $deck.Slides.Count, ($fontNames.Keys -join ', '), $issues.Count)
} finally {
    $deck.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($deck)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
