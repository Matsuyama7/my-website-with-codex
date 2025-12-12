#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import random
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


QUOTES = [
    "今日のあなたは、昨日のあなたの続きです。",
    "小さく始めて、速く学ぶ。",
    "勝つまでやれば負けではない。",
    "集中は才能を上回る。",
    "積み上げた分だけ、自信になる。",
]


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/quote":
            quote = random.choice(QUOTES)
            payload = json.dumps({"quote": quote}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def log_message(self, fmt: str, *args) -> None:
        return


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    front_dir = repo_root / "front"
    if not front_dir.exists():
        raise SystemExit("front/ directory not found")

    port = int(os.environ.get("PORT", "8000"))

    def handler_factory(*args, **kwargs):
        return Handler(*args, directory=str(front_dir), **kwargs)

    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler_factory)
    print(f"Serving front/ on http://localhost:{port}")
    print("API: GET /api/quote")
    httpd.serve_forever()


if __name__ == "__main__":
    main()

