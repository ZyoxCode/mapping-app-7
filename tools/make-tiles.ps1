# make-tiles.ps1: run from Windows PowerShell; hands the job to make-tiles.sh inside WSL.
#
# Usage:
#   .\make-tiles.ps1 C:\maps\land\land.shp public\data\land.pmtiles
#   .\make-tiles.ps1 land.geojson public\data\land.pmtiles -g -l land    (GeoJSON already in lon/lat: skips ogr2ogr)
#   .\make-tiles.ps1 land.shp land-test.pmtiles -z 12 -b "68.5,-50,71,-48.4"
#   .\make-tiles.ps1 land.geojson land.pmtiles -g -l land -z 12 --drop-densest-as-needed --full-detail=12 --low-detail=9 --simplification=2 --simplify-only-low-zooms
#
# Everything after the two paths is passed straight to make-tiles.sh (run it with -h for options).
param(
    [Parameter(Mandatory, Position = 0)][string]$InFile,
    [Parameter(Mandatory, Position = 1)][string]$OutFile,
    [Parameter(ValueFromRemainingArguments)][string[]]$Rest
)

$ErrorActionPreference = "Stop"

$in = (Resolve-Path -LiteralPath $InFile).ProviderPath
$out = if ([IO.Path]::IsPathRooted($OutFile)) { $OutFile } else { Join-Path (Get-Location).Path $OutFile }
$script = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "make-tiles.sh")).ProviderPath

# -e runs the command directly (no shell), so Windows paths with spaces and backslashes pass through intact.
$wslScript = wsl -e wslpath -u $script
wsl -e bash $wslScript $in $out @Rest
if ($LASTEXITCODE -ne 0) { throw "make-tiles failed (exit code $LASTEXITCODE)" }