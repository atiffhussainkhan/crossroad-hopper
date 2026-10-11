"""Run the real browser scripts with JavaScriptCore or Node's global VM.

JSC remains the default where available. Set JS_ENGINE=node to exercise the
portable fallback, and NODE=/path/to/node when Node is outside PATH.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
SIM_MODULES = ("src/stages.js", "src/tiles.js", "src/hazards.js", "src/sim-core.js")


def engine_command() -> list[str]:
    engine = os.environ.get("JS_ENGINE", "auto").lower()
    if engine not in ("auto", "jsc", "node"):
        raise RuntimeError("JS_ENGINE must be auto, jsc or node")
    jsc = os.environ.get("JSC", JSC)
    if engine != "node" and Path(jsc).is_file():
        return [jsc]
    if engine == "jsc":
        raise RuntimeError(f"JavaScriptCore was requested but not found: {jsc}")
    node = os.environ.get("NODE") or shutil.which("node")
    if not node:
        raise RuntimeError("Install Node.js or set NODE=/path/to/node to run the gates")
    return [node, str(ROOT / "tools/node_runner.cjs")]


def run_file(path: Path, *, timeout: int = 300) -> subprocess.CompletedProcess:
    return subprocess.run(engine_command() + [str(path)], capture_output=True,
                          text=True, cwd=str(ROOT), timeout=timeout)


def run_script(body: str, *, modules: tuple | list = (),
               timeout: int = 300) -> subprocess.CompletedProcess:
    # Concatenation evaluates each module in the same global script scope,
    # matching <script> tags. Node require() would wrap and hide the exports.
    parts = ['var console = { log: function () { print.apply(null, arguments); } };']
    parts.extend((ROOT / rel).read_text() for rel in modules)
    parts.append(body)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write("\n".join(parts))
        path = Path(f.name)
    try:
        return run_file(path, timeout=timeout)
    finally:
        path.unlink(missing_ok=True)


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 tools/js_runtime.py <bundle.js>")
    result = run_file(Path(sys.argv[1]).resolve())
    print(result.stdout, end="")
    print(result.stderr, end="", file=sys.stderr)
    raise SystemExit(result.returncode)
