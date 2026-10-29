param(
  [Parameter(Mandatory=$true)][string]$EngineeringPack,
  [Parameter(Mandatory=$true)][string]$Tenant,
  [string]$KnowledgeRoot = 'C:\AIW\aiw\knowledge-repository'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $EngineeringPack -PathType Leaf)) { throw 'Download the exact AIW_Video_Knowledge_Engineering_Pack.zip first.' }
if (-not (Test-Path -LiteralPath $KnowledgeRoot -PathType Container)) { throw "The knowledge repository directory does not exist: $KnowledgeRoot" }

# The pack has exactly six metadata files. Inspect entry names before expanding; the Node importer
# independently pins the SHA-256 of every extracted member to the recovered Library pack.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$expected = @(
  'AIW_Video_Knowledge_Graph_Blueprint.md',
  'aiw_video_scene_manifest.csv',
  'aiw_video_frame_semantic_index.csv',
  'aiw_video_knowledge_graph_seed.json',
  'aiw_video_ingestion_schema.json',
  'AIW_Video_Analysis_README.txt'
)
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $EngineeringPack).Path)
try {
  $names = @($zip.Entries | ForEach-Object { $_.FullName })
  if ($names.Count -ne $expected.Count -or @($names | Where-Object { $_ -notin $expected }).Count -gt 0) { throw 'The engineering ZIP has unexpected or missing members.' }
  if (@($zip.Entries | Where-Object { $_.Length -gt 20000000 }).Count -gt 0) { throw 'A ZIP member exceeds the 20 MB metadata limit.' }
} finally { $zip.Dispose() }

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('aiw-video-' + [Guid]::NewGuid().ToString('N'))
try {
  Expand-Archive -LiteralPath $EngineeringPack -DestinationPath $tmp -Force
  $store = Join-Path $KnowledgeRoot 'store\akr-store.sqlite'
  $cli = Join-Path $PSScriptRoot 'video-evidence-cli.mjs'
  & node $cli import --source $tmp --store $store --tenant $Tenant --library-id libfile_871244a2cf188191901156e77ed3edaa
  if ($LASTEXITCODE -ne 0) { throw "Video candidate import failed (Node exit $LASTEXITCODE)." }
  & node $cli status --store $store --tenant $Tenant
  if ($LASTEXITCODE -ne 0) { throw "Video candidate status failed (Node exit $LASTEXITCODE)." }
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }
}
