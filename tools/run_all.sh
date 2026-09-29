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
#   4. check_vertical_slice.py — the stage-loop campaign sweep and structural probes
#
# Future phases add: check_lane_invariants.py, check_hazard_reach.py,
# check_content_schema.py, check_solvability.py, check_save_schema.py,
# check_quality.py. See docs/DEVELOPMENT-PLAN.md.

set -e
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

gate() {
  local name="$1"
  local script="$2"
  printf "running %-32s ... " "$name"
  if python3 "$script" > /tmp/gate.out 2>&1; then
    printf "${GREEN}PASS${NC}\n"
    tail -1 /tmp/gate.out | sed 's/^/  /'
  else
    printf "${RED}FAIL${NC}\n"
    cat /tmp/gate.out | sed 's/^/  /'
    exit 1
  fi
}

gate "check_requirements"   tools/check_requirements.py
gate "check_testability"    tools/check_testability.py
gate "check_art_assets"     tools/check_art_assets.py
gate "check_vertical_slice" tools/check_vertical_slice.py

echo
echo "all gates green"
