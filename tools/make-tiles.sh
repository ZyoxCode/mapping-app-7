#!/usr/bin/env bash
# make-tiles.sh: turn a shapefile (or GeoJSON, GeoPackage, zipped shapefile) into a .pmtiles archive.
#
# All the heavy work happens on WSL's own disk, because ogr2ogr and tippecanoe are very slow
# when reading or writing files under /mnt/c. The script copies the source in, converts it,
# builds the tiles, and copies only the finished .pmtiles back.
#
# Run it inside WSL, or from Windows with make-tiles.ps1. Paths can be Windows (C:\...) or Linux.
set -euo pipefail

usage() {
    cat <<'EOF'
Usage: make-tiles.sh INPUT OUTPUT.pmtiles [options] [--tippecanoe-option=value ...]

  INPUT    .shp, .geojson, .gpkg or .zip (anything ogr2ogr can read)
  OUTPUT   .pmtiles file to write

Options (put them after the two paths):
  -g       INPUT is already a GeoJSON in lon/lat (WGS84): skip ogr2ogr and use it as is.
           (Shapefiles, zips and GeoPackages can't be used with -g.)
  -l NAME  tile layer name (default: output file name without extension).
           Must match sourceLayer in your TileLayer.
  -Z N     min zoom (default 0)
  -z N|g   max zoom, or g to let tippecanoe pick one (default 12)
  -b BBOX  clip to minlon,minlat,maxlon,maxlat (handy for quick tests)
  -f       ignore the cached copy/conversion and redo it
  -h       show this help

Anything starting with -- (and everything after it) is handed to tippecanoe as is. Use the
--option=value form. By default the script adds --no-tile-size-limit so dense tiles don't fail
the build; that is left out automatically if you pass any --drop-* or --coalesce-* option.

Examples:
  make-tiles.sh 'C:\maps\land\land.shp' 'C:\app\public\data\land.pmtiles'
  make-tiles.sh land.geojson land.pmtiles -g -l land -z 12 \
      --drop-densest-as-needed --full-detail=12 --low-detail=9 --simplification=2 --simplify-only-low-zooms
  make-tiles.sh land.shp land-test.pmtiles -z 12 -b 68.5,-50,71,-48.4
EOF
}

# Accept Windows paths (C:\... or C:/...) as well as Linux ones.
to_linux() {
    if [[ "$1" =~ ^[A-Za-z]:[\\/] ]]; then wslpath -u "$1"; else realpath -m "$1"; fi
}

case "${1:-}" in "" | -h | --help) usage; exit 0 ;; esac
[[ $# -ge 2 ]] || { usage; exit 1; }

IN=$(to_linux "$1")
OUT=$(to_linux "$2")
shift 2

LAYER=""
MINZ=0
MAXZ=12
BBOX=""
FORCE=0
GEOJSON=0
EXTRA=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -l) LAYER=${2:?-l needs a layer name}; shift 2 ;;
        -Z) MINZ=${2:?-Z needs a number}; shift 2 ;;
        -z) MAXZ=${2:?-z needs a number or g}; shift 2 ;;
        -b) BBOX=${2:?-b needs minlon,minlat,maxlon,maxlat}; shift 2 ;;
        -f) FORCE=1; shift ;;
        -g) GEOJSON=1; shift ;;
        -h | --help) usage; exit 0 ;;
        --) shift; EXTRA+=("$@"); break ;;
        --*) EXTRA+=("$@"); break ;;
        *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    esac
done

# PowerShell turns an unquoted 68.5,-50,71,-48.4 into a space-separated list; accept both.
BBOX=${BBOX// /,}

[[ "$MINZ" =~ ^[0-9]+$ ]] || { echo "-Z must be a whole number (got '$MINZ')" >&2; exit 1; }
[[ "$MAXZ" =~ ^[0-9]+$ || "$MAXZ" == g ]] || { echo "-z must be a whole number or g (got '$MAXZ')" >&2; exit 1; }

[[ -f "$IN" ]] || { echo "Input not found: $IN" >&2; exit 1; }

NEEDED=(tippecanoe)
if [[ $GEOJSON -eq 0 ]]; then NEEDED+=(ogr2ogr); fi
for cmd in "${NEEDED[@]}"; do
    command -v "$cmd" >/dev/null || { echo "$cmd is not installed in this WSL distro" >&2; exit 1; }
done

if [[ $GEOJSON -eq 1 ]]; then
    case "${IN,,}" in
        *.shp | *.zip | *.gpkg)
            echo "-g only works with GeoJSON input. Drop -g to convert $IN with ogr2ogr." >&2
            exit 1
            ;;
    esac
fi

[[ -n "$LAYER" ]] || LAYER=$(basename "$OUT" .pmtiles)

CACHE="$HOME/.cache/make-tiles"
mkdir -p "$CACHE"
WORK=$(mktemp -d "$HOME/.make-tiles.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

START=$SECONDS

# The prepared data (a copy of the GeoJSON with -g, otherwise the ogr2ogr conversion) is cached,
# keyed on the source file's size and modified time, so re-running with different zoom or
# simplification settings skips the slow steps.
KEY=$({ stat -c '%n %s %Y' "$IN" "${IN%.*}.dbf" 2>/dev/null || true; } | sha1sum | cut -c1-16)
if [[ $GEOJSON -eq 1 ]]; then EXT=geojson; else EXT=geojsonl; fi
DATA="$CACHE/$KEY.$EXT"

if [[ -f "$DATA" && $FORCE -eq 0 ]]; then
    echo "==> Reusing prepared data (pass -f to redo)"
elif [[ $GEOJSON -eq 1 ]]; then
    echo "==> Copying GeoJSON to the WSL disk (skipping ogr2ogr)"
    cp "$IN" "$WORK/data.$EXT"
    mv "$WORK/data.$EXT" "$DATA"
else
    echo "==> Copying source to the WSL disk"
    NAME=$(basename "$IN")
    cp "$IN" "$WORK/"
    if [[ "${IN,,}" == *.shp ]]; then
        base="${IN%.*}"
        for ext in shx dbf prj cpg qix; do
            if [[ -f "$base.$ext" ]]; then cp "$base.$ext" "$WORK/"; fi
        done
    fi
    case "${IN,,}" in
        *.zip) SRC="/vsizip/$WORK/$NAME" ;;
        *) SRC="$WORK/$NAME" ;;
    esac

    echo "==> Converting to GeoJSONSeq (EPSG:4326)"
    ogr2ogr -f GeoJSONSeq -t_srs EPSG:4326 "$WORK/data.$EXT" "$SRC"
    mv "$WORK/data.$EXT" "$DATA"
fi

echo "==> tippecanoe: layer '$LAYER', zoom $MINZ-$MAXZ"
ARGS=(-o "$WORK/out.pmtiles" -l "$LAYER" -Z "$MINZ" --force)
if [[ "$MAXZ" == g ]]; then ARGS+=(-zg); else ARGS+=(-z "$MAXZ"); fi

# Without a size limit nothing is dropped, so skip it if the user asked for dropping/coalescing.
LIMIT=(--no-tile-size-limit)
for a in ${EXTRA[@]+"${EXTRA[@]}"}; do
    case "$a" in
        --drop-* | --coalesce-* | --no-tile-size-limit | --maximum-tile-bytes* | -M*) LIMIT=() ;;
    esac
done
ARGS+=(${LIMIT[@]+"${LIMIT[@]}"})

# --read-parallel only works on newline-delimited GeoJSON (one feature per line).
case "${IN,,}" in
    *.geojsonl | *.geojsons | *.ndjson) ARGS+=(--read-parallel) ;;
    *) if [[ $GEOJSON -eq 0 ]]; then ARGS+=(--read-parallel); fi ;;
esac
if [[ -n "$BBOX" ]]; then ARGS+=(--clip-bounding-box="$BBOX"); fi
tippecanoe "${ARGS[@]}" ${EXTRA[@]+"${EXTRA[@]}"} "$DATA"

echo "==> Copying result back"
mkdir -p "$(dirname "$OUT")"
cp "$WORK/out.pmtiles" "$OUT.partial"
mv -f "$OUT.partial" "$OUT"

echo "==> Done: $OUT ($(du -h "$OUT" | cut -f1)) in $((SECONDS - START))s"