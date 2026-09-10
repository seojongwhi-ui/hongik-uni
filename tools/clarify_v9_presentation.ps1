param([Parameter(Mandatory = $true)][string]$ProjectRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$version = 'v11'
$outputDir = Join-Path $ProjectRoot ('presentation_' + $version)
[void][IO.Directory]::CreateDirectory($outputDir)
$pptPath = Join-Path $ProjectRoot ('research_plan_professor_feedback_' + $version + '.pptx')
Copy-Item -LiteralPath (Join-Path $ProjectRoot 'research_plan_professor_feedback_v9.pptx') -Destination $pptPath -Force

# Start from v9 to preserve its argument, slide structure, notes and geometry.
$edits = @(
    @{ Slide=4; Old='AI는 운전자를 꾸짖는 장치보다, 스스로 조절하게 돕는 동승자적 단서로 접근한다.'; New='AI는 동승자가 함께 있을 때처럼, 운전자가 스스로 감정과 행동을 조절하도록 돕는다.' },
    @{ Slide=14; Old='상황적 공간 → 사회적 평가 기제 → 개인의 내적 심리로 이어지는 3단계 구조를 선행연구 틀로 설정한다.'; New='운전 상황 → 타인의 평가에 대한 의식 → 개인의 심리 특성으로 이어지는 3단계 구조로 살펴본다.' },
    @{ Slide=15; Old='Goffman(1959)은 사회적 상호작용을 무대 위 수행으로 설명한다.'; New='Goffman(1959)은 타인과 만날 때의 행동을 관객 앞에서 하는 연기에 비유한다.' },
    @{ Slide=15; Old='타인의 시선과 사회적 규범이 존재하는 공간이다. 개인은 페르소나를 착용하고 인상 관리와 행동 통제를'; New='타인의 시선과 사회적 규범이 있는 공간이다. 타인에게 보여줄 모습을 의식하며 말과 행동을' },
    @{ Slide=15; Old='수행한다.'; New='조절한다.' },
    @{ Slide=15; Old='타인의 시선과 식별성이 약화된 공간이다. 연출이 느슨해지고 억제된 자아나 감정 표현이 나타날 수 있다.'; New='타인의 시선을 덜 의식하는 공간이다. 남에게 보일 모습을 덜 신경 쓰며, 참았던 감정을 드러낼 수 있다.' },
    @{ Slide=15; Old='혼자 운전하는 차량 내부는 공적 도로 위에 있지만, 운전자가 체감하는 맥락에서는 후면 영역의 성격을 가질 수'; New='차량은 공적인 도로 위에 있지만, 혼자 탄 운전자는 차 안을 타인의 시선을 덜 의식하는 공간으로 느낄 수' },
    @{ Slide=15; Old='동승자는 차량 내부를 전면 영역에 가깝게 만드는 단서가 될 수 있다.'; New='동승자가 있으면 운전자는 다른 사람에게 보이는 자신의 모습을 의식해 말과 행동을 조절할 수 있다.' },
    @{ Slide=16; Old='평가 불안이론: 평가 가능성의 소멸'; New='평가 불안이론: 타인의 평가를 의식하는 마음' },
    @{ Slide=16; Old='동승자 효과는 평가 가능성과 책임 인식의 문제로 볼 수 있다.'; New='동승자의 영향은 타인의 평가를 의식하는 마음과 안전을 지켜야 한다는 책임감으로 살펴볼 수 있다.' },
    @{ Slide=17; Old='익명성과 평가 불안 해제 상황에서도 왜 특정 개인만 강한 탈억제 행동이나 난폭 행동을 보이는가?'; New='신원이 드러나지 않고 평가받을 걱정이 적은 상황에서, 왜 일부 사람은 억제를 풀고 난폭하게 행동하는가?' },
    @{ Slide=17; Old='정서표현갈등은 정서를 표현하고 싶지만 억제하면서 생기는 내적 갈등이다. 자기방어적 양가성은 상처받을'; New='정서표현갈등은 감정을 표현하고 싶으면서도 참아야 한다고 느끼는 갈등이다. 자기방어적 양가성은 상처받을' },
    @{ Slide=17; Old='동승자는 억제된 정서의 표출을 다시 조절하게 하는 외적 단서다.'; New='동승자의 존재는 운전자가 참았던 감정을 드러내는 방식을 다시 조절하게 하는 계기가 된다.' },
    @{ Slide=18; Old='상황적 공간, 사회적 평가 기제, 개인 심리 변인이 연결되며 운전 행동의 차이를 만든다.'; New='운전 상황, 타인의 평가에 대한 의식, 개인의 심리 특성을 연결해 운전 행동의 차이를 설명한다.' },
    @{ Slide=18; Old='탈억제'; New='억제 풀림' },
    @{ Slide=18; Old='AEQ'; New='정서표현갈등(AEQ)' },
    @{ Slide=19; Old='혼자 운전할 때 동승자적 존재감과 안전 책임감을 환기하는 인터페이스 가능성을 탐색한다.'; New='혼자 운전할 때도 누군가 함께하는 느낌과 안전 책임감을 떠올리게 하는 AI 인터페이스를 탐색한다.' }
)

function Write-XmlEntry($Archive, [string]$Name, [xml]$Document) {
    $Archive.GetEntry($Name).Delete()
    $entry = $Archive.CreateEntry($Name)
    $stream = $entry.Open()
    $settings = [Xml.XmlWriterSettings]::new()
    $settings.Encoding = [Text.UTF8Encoding]::new($false)
    $writer = [Xml.XmlWriter]::Create($stream, $settings)
    try { $Document.Save($writer) } finally { $writer.Dispose(); $stream.Dispose() }
}

$archive = [IO.Compression.ZipFile]::Open($pptPath, [IO.Compression.ZipArchiveMode]::Update)
try {
    for ($slide = 1; $slide -le 19; $slide++) {
        $name = 'ppt/slides/slide' + $slide + '.xml'
        $reader = [IO.StreamReader]::new($archive.GetEntry($name).Open())
        try { [xml]$doc = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $nodes = $doc.SelectNodes('//*[local-name()="t"]')
        foreach ($edit in @($edits | Where-Object { $_.Slide -eq $slide })) {
            $matches = @($nodes | Where-Object { $_.InnerText -ceq $edit.Old })
            if ($matches.Count -ne 1) { throw "Slide ${slide}: expected one match: $($edit.Old)" }
            $matches[0].InnerText = $edit.New
        }
        foreach ($size in $doc.SelectNodes('//@sz')) {
            if ($size.Value -eq '1440') { $size.Value = '1400' }
        }
        Write-XmlEntry $archive $name $doc

        $svgName = 'slide-{0:D2}.svg' -f $slide
        [xml]$svg = [IO.File]::ReadAllText((Join-Path $ProjectRoot ('presentation_v9/' + $svgName)))
        foreach ($edit in @($edits | Where-Object { $_.Slide -eq $slide })) {
            $matches = @($svg.SelectNodes('//*[local-name()="text"]') | Where-Object { $_.InnerText -ceq $edit.Old })
            if ($matches.Count -ne 1) { throw "SVG ${slide}: expected one match: $($edit.Old)" }
            $matches[0].InnerText = $edit.New
        }
        foreach ($size in $svg.SelectNodes('//@font-size')) {
            if ($size.Value -eq '24') { $size.Value = '23.3333333333333' }
        }
        $svg.Save((Join-Path $outputDir $svgName))
    }
} finally { $archive.Dispose() }

[xml]$combined = [IO.File]::ReadAllText((Join-Path $ProjectRoot 'presentation_v9/research_plan_figma_editable_v9.svg'))
foreach ($edit in $edits) {
    $id = 'slide-{0:D2}' -f $edit.Slide
    $nodes = $combined.SelectNodes('//*[local-name()="g" and @id="' + $id + '"]/*[local-name()="text"]')
    $matches = @($nodes | Where-Object { $_.InnerText -ceq $edit.Old })
    if ($matches.Count -ne 1) { throw "Combined SVG: expected one match: $($edit.Old)" }
    $matches[0].InnerText = $edit.New
}
foreach ($size in $combined.SelectNodes('//@font-size')) {
    if ($size.Value -eq '24') { $size.Value = '23.3333333333333' }
}
$combined.Save((Join-Path $outputDir 'research_plan_figma_editable_v11.svg'))
$combined.Save((Join-Path $ProjectRoot 'research_plan_figma_editable.svg'))
$edits | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputDir 'wording-changes.json') -Encoding UTF8
Write-Output "Created v11 from v9: 19 slides; $($edits.Count) wording edits."
