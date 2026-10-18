#!/bin/bash
# tools/run_all.sh — the Phase 0/1 build gate suite.
#
# Runs every Python-based gate against the project. Each gate exits non-zero
# on failure; the suite stops at the first failing gate. Use `bash tools/run_all.sh`
# from the project root.
#
# Gates:
#   1. check_requirements.py  — spec traceability + disposition integrity
#   2. check_testability.py   — every Tier A requirement has a testable threshold
#   3. check_art_assets.py — every declared stage asset has a renderer; the mock matches the game
#   4. check_js_renderer.py — the playable actually loads the isometric renderer
#   5. check_vertical_slice.py — the stage-loop campaign sweep and structural probes
#   6. check_hazard_reach.py — Phase 2: no rail hazard may enter a lane without
#                           a telegraph at least as long as the traverse window
#
#   7. check_growth_ramp.py — the "+50% more killing items every 15 hops" ramp,
#                           measured through the real hazard generator
#
#   8. check_endgame.py — two-way traffic, a bird per stage, warned sink
#                       holes, and the doubled board density
#
#   9. check_phases.py   — the shape of a stage over time: a one-sided read,
#                       a build that gains the other side, a 15-second sprint
#                       at the end, a ten-object vocabulary, a ditch and a bird
#                       in every stage
#
# Future phases add: check_lane_invariants.py, check_content_schema.py,
# check_solvability.py, check_save_schema.py, check_quality.py.
# See docs/DEVELOPMENT-PLAN.md.

set -e
cd "$(dirname "$0")/.."
PYTHON="${PYTHON:-python3}"
GATE_OUTPUT="$(mktemp)"
trap 'rm -f "$GATE_OUTPUT"' EXIT

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

gate() {
  local name="$1"
  local script="$2"
  shift 2
  printf "running %-32s ... " "$name"
  if "$PYTHON" "$script" "$@" > "$GATE_OUTPUT" 2>&1; then
    printf "${GREEN}PASS${NC}\n"
    tail -1 "$GATE_OUTPUT" | sed 's/^/  /'
  else
    printf "${RED}FAIL${NC}\n"
    cat "$GATE_OUTPUT" | sed 's/^/  /'
    exit 1
  fi
}

gate "check_requirements"   tools/check_requirements.py
gate "check_testability"    tools/check_testability.py
gate "check_art_assets"     tools/check_art_assets.py
gate "check_models (3D library)" tools/check_models.py
gate "check_js_renderer"     tools/check_js_renderer.py
gate "check_js_runtime"       tools/check_js_runtime.py
gate "check_hazard_reach"     tools/check_hazard_reach.py
gate "check_growth_ramp"       tools/check_growth_ramp.py
gate "check_endgame"          tools/check_endgame.py
gate "check_phases"           tools/check_phases.py
gate "scoring and Endless"    tools/check_scoring.py
gate "playtest (10 runs)"      tools/playtest.py 10 --seed 20261010
gate "check_vertical_slice" tools/check_vertical_slice.py

echo
echo "all gates green"
