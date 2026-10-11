#!/usr/bin/env python3
"""Bounded, read-only renderer discovery. Static evidence is not a runtime test."""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

EXCLUDED = {"vendor", "node_modules", ".git", "docs", "assets", "examples", "tests", "test"}
SOURCE_SUFFIXES = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"}


def _lex(text: str) -> tuple[str, str]:
    """Preserve offsets/newlines while hiding comments, then string literals."""
    clean, code = list(text), list(text)
    i = 0
    while i < len(text):
        if text.startswith("//", i) or text.startswith("/*", i):
            end = text.find("\n", i) if text.startswith("//", i) else text.find("*/", i + 2)
            end = len(text) if end < 0 else end + (0 if text.startswith("//", i) else 2)
            for j in range(i, end):
                if text[j] != "\n":
                    clean[j] = code[j] = " "
            i = end
        elif text[i] in "'\"`":
            quote, start = text[i], i
            i += 1
            while i < len(text):
                if text[i] == "\\":
                    i += 2
                elif text[i] == quote:
                    i += 1
                    break
                else:
                    i += 1
            for j in range(start, min(i, len(text))):
                if text[j] != "\n":
                    code[j] = " "
        else:
            i += 1
    return "".join(clean), "".join(code)


class _Scripts(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.scripts: list[tuple[str | None, str, int, str]] = []
        self.current: tuple[str | None, str, int] | None = None
        self.parts: list[str] = []
        self.data_line: int | None = None
        self.base = ""

    def handle_starttag(self, tag: str, attrs: list) -> None:
        values = dict(attrs)
        if tag == "base" and not self.base:
            self.base = values.get("href") or ""
        if tag == "script":
            self.current = (values.get("src"), values.get("type") or "", self.getpos()[0])
            self.parts, self.data_line = [], None

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.data_line = self.data_line or self.getpos()[0]
            self.parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.current is not None:
            src, kind, line = self.current
            self.scripts.append((src, kind, self.data_line or line, "".join(self.parts)))
            self.current = None


def doctor(project: Path, *, max_files: int = 256, max_bytes: int = 4 * 1024 * 1024) -> dict:
    root = Path(project).expanduser().resolve()
    result = {
        "renderer": "unknown", "model_loader": "not-found", "2d_fallback": False,
        "static_only": True, "source_scope": "entry-graph", "scanned_files": 0, "scanned_lines": 0,
        "truncated": False, "evidence": [], "next_step": "Inspect the application entry point and verify it in a browser.",
    }
    if not root.is_dir():
        result["error"] = "Project directory does not exist."
        return result

    queue: deque[Path] = deque()
    seen: set[Path] = set()
    importmap: dict[str, tuple[str, Path]] = {}
    bytes_read = 0
    flags: set[str] = set()
    evidence_counts: dict[str, int] = {}

    def evidence(kind: str, file: Path, line: int, detail: str) -> None:
        limit = 2 if kind in {"three-renderer", "webgl-context", "2d-context", "gltf-loader"} else 1
        if evidence_counts.get(kind, 0) >= limit:
            return
        evidence_counts[kind] = evidence_counts.get(kind, 0) + 1
        result["evidence"].append({"kind": kind, "file": file.relative_to(root).as_posix(), "line": line, "detail": detail})

    def local(spec: str, owner: Path, *, bare: bool = False) -> Path | None:
        if spec in importmap:
            spec, owner = importmap[spec]
        elif bare and not spec.startswith((".", "/")):
            return None
        parts = urlsplit(spec)
        if parts.scheme or parts.netloc:
            return None
        raw = unquote(parts.path)
        if not raw:
            return None
        path = (root / raw.lstrip("/")) if raw.startswith("/") else owner.parent / raw
        path = path.resolve()
        try:
            relative = path.relative_to(root)
        except ValueError:
            return None
        if any(part.lower() in EXCLUDED for part in relative.parts):
            return None
        if path.is_file():
            return path
        if not path.suffix:
            for suffix in (".js", ".ts", ".mjs", ".tsx", ".jsx"):
                candidate = path.with_suffix(suffix)
                if candidate.is_file():
                    return candidate
        return None

    def inspect(text: str, file: Path, first_line: int = 1) -> None:
        clean, code = _lex(text)
        namespaces = {"THREE"}
        renderers = {"WebGLRenderer"}
        loaders = {"GLTFLoader"}
        imports = re.compile(r"\b(?:import\s+(?:[^;'\"()]+?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+|import\s*\(\s*|require\s*\(\s*)['\"]([^'\"]+)['\"]")
        for match in imports.finditer(clean):
            if not re.match(r"(?:import|export|require)\b", code[match.start():]):
                continue
            spec = match.group(1)
            target = local(spec, file, bare=True)
            if target is not None:
                queue.append(target)
            statement = clean[match.start():match.end()]
            if spec == "three" or re.search(r"(?:^|/)three(?:\.module)?(?:\.min)?\.js$", spec):
                namespace = re.search(r"\*\s+as\s+([\w$]+)", statement)
                if namespace:
                    namespaces.add(namespace.group(1))
                named = re.search(r"\bWebGLRenderer(?:\s+as\s+([\w$]+))?\b", statement)
                if named:
                    renderers.add(named.group(1) or "WebGLRenderer")
            if "gltfloader" in spec.lower():
                alias = re.search(r"\bGLTFLoader(?:\s+as\s+([\w$]+))?\b", statement)
                default = re.match(r"import\s+([\w$]+)\s+from\b", statement)
                if alias:
                    loaders.add(alias.group(1) or "GLTFLoader")
                if default:
                    loaders.add(default.group(1))
                evidence("loader-hint", file, first_line + text.count("\n", 0, match.start()), "GLTF loader import; instantiation checked separately.")

        for match in re.finditer(r"\bnew\s+([\w$]+(?:\s*\.\s*[\w$]+)*)\s*\(", code):
            constructor = re.sub(r"\s", "", match.group(1))
            line = first_line + text.count("\n", 0, match.start())
            pieces = constructor.split(".")
            if constructor in renderers or (len(pieces) == 2 and pieces[0] in namespaces and pieces[1] == "WebGLRenderer"):
                flags.add("three")
                evidence("three-renderer", file, line, "Instantiates " + constructor + ".")
            if constructor in loaders or (len(pieces) == 2 and pieces[0] in namespaces and pieces[1] == "GLTFLoader"):
                flags.add("gltf")
                evidence("gltf-loader", file, line, "Instantiates " + constructor + ".")
        for match in re.finditer(r"\.\s*getContext\s*\(", code):
            argument = re.match(r"\s*(['\"])(2d|webgl2?|experimental-webgl)\1", clean[match.end():], re.I)
            if argument:
                context = argument.group(2).lower()
                kind = "2d-context" if context == "2d" else "webgl-context"
                flags.add("2d" if context == "2d" else "webgl")
                evidence(kind, file, first_line + text.count("\n", 0, match.start()), "Requests " + context + " context.")

    entry = root / "index.html"
    if entry.is_file():
        queue.append(entry)
    else:
        # No known HTML entry: bounded source scan is a weaker discovery route.
        result["source_scope"] = "bounded-discovery"
        visited_dirs = 0
        for directory, dirs, files in os.walk(root):
            dirs[:] = sorted(d for d in dirs if d.lower() not in EXCLUDED)
            visited_dirs += 1
            if visited_dirs > max(32, max_files * 4):
                result["truncated"] = True
                break
            for name in sorted(files):
                path = Path(directory) / name
                if path.suffix.lower() in SOURCE_SUFFIXES | {".html"}:
                    try:
                        resolved_parts = path.resolve().relative_to(root).parts
                    except ValueError:
                        continue
                    if any(p.lower() in EXCLUDED for p in resolved_parts):
                        continue
                    queue.append(path)
                    if len(queue) > max_files:
                        result["truncated"] = True
                        break
            if len(queue) > max_files:
                break

    while queue:
        file = queue.popleft()
        if file in seen:
            continue
        if result["scanned_files"] >= max_files:
            result["truncated"] = True
            break
        try:
            size = file.stat().st_size
            if bytes_read + size > max_bytes:
                result["truncated"] = True
                continue
            text = file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            evidence("unreadable-source", file, 1, "Referenced source could not be read.")
            continue
        seen.add(file)
        bytes_read += size
        result["scanned_files"] += 1
        result["scanned_lines"] += len(text.splitlines())
        if file.suffix.lower() == ".html":
            parser = _Scripts()
            parser.feed(text)
            owner = file
            remote_base = bool(urlsplit(parser.base).scheme or urlsplit(parser.base).netloc)
            if parser.base and not remote_base:
                base_path = urlsplit(urljoin("/" + file.relative_to(root).as_posix(), parser.base)).path
                owner = root / unquote(base_path).lstrip("/")
                if base_path.endswith("/"):
                    owner /= "index.html"
            for _, kind, _, body in parser.scripts:
                if kind.lower() == "importmap":
                    try:
                        entries = json.loads(body).get("imports", {})
                        if not isinstance(entries, dict):
                            raise ValueError("Invalid imports mapping")
                        importmap.update({key: (value, owner) for key, value in entries.items() if isinstance(value, str)})
                    except (ValueError, TypeError, AttributeError):
                        evidence("invalid-importmap", file, 1, "Import map is not valid JSON.")
            for src, kind, line, body in parser.scripts:
                if kind.lower() == "importmap":
                    continue
                if src:
                    if remote_base:
                        evidence("external-script-hint", file, line, "Remote base/script; not renderer proof.")
                        continue
                    target = local(src, owner)
                    if target:
                        queue.append(target)
                    elif urlsplit(src).scheme or urlsplit(src).netloc:
                        evidence("external-script-hint", file, line, "External script; not renderer proof.")
                    elif not any(p.lower() in EXCLUDED for p in Path(urlsplit(src).path).parts):
                        evidence("missing-script", file, line, "Local script not found: " + src)
                elif kind.lower() in {"", "module", "text/javascript", "application/javascript"}:
                    inspect(body, file, line)
        else:
            inspect(text, file)

    result["renderer"] = "three-webgl" if "three" in flags else "webgl" if "webgl" in flags else "2d-canvas" if "2d" in flags else "unknown"
    result["model_loader"] = "gltf" if "gltf" in flags else "not-found"
    result["2d_fallback"] = "2d" in flags and bool(flags & {"three", "webgl"})
    if flags & {"three", "webgl"}:
        result["next_step"] = ("Serve the project over HTTP and verify a chosen model, dependencies, animation and sizing in a browser."
                               if "gltf" in flags else "Confirm or add a glTF loader, then validate a chosen model in a browser.")
    elif "2d" in flags:
        result["next_step"] = "Use existing 2D assets, or implement a 3D renderer before importing meshes."
    if result["truncated"]:
        result["next_step"] += " Scan was bounded; inspect any unscanned entry dependencies."
    if result["source_scope"] == "bounded-discovery":
        result["next_step"] += " No index.html entry was found; confirm these files belong to the active application."
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    result = doctor(args.project)
    print(json.dumps(result, separators=(",", ":")))
    return 2 if "error" in result else 0


if __name__ == "__main__":
    raise SystemExit(main())
