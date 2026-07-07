#!/usr/bin/env python
"""Local dev server for POVODEŇ with caching disabled, so every browser reload
picks up the latest JS (the plain `python -m http.server` lets browsers cache
ES modules, which makes edits appear not to take effect)."""
import http.server
import socketserver
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8088


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    with socketserver.TCPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        print(f'POVODEN dev server (no-cache) at http://127.0.0.1:{PORT}  serving {ROOT}')
        httpd.serve_forever()
