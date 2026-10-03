#!/usr/bin/env python3
"""Serve an isolated review with its concrete hosting headers, bound to loopback."""
import argparse,json
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import unquote,urlsplit
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--headers',required=True);p.add_argument('--port',type=int,required=True);a=p.parse_args()
root=Path(a.root).resolve();rules=json.loads(Path(a.headers).read_text())['headers'];headers={r['source']:r['headers'] for r in rules}
for path,values in headers.items():
 if not path.startswith('/') or '..' in path.split('/'):raise ValueError('Unsafe route')
 for h in values:
  if any(c in h['key']+h['value'] for c in '\r\n'):raise ValueError('Unsafe header')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(root),**kw)
 def end_headers(self):
  for h in headers.get(unquote(urlsplit(self.path).path),[]):
   if h['key'].lower()!='content-type':self.send_header(h['key'],h['value'])
  self.send_header('X-Robots-Tag','noindex, nofollow');super().end_headers()
print(f'Review preview: http://127.0.0.1:{a.port}/',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
