"""Record executable regression outcomes; never infer success from a report label."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time

p = argparse.ArgumentParser()
p.add_argument('--app', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
app, output = Path(a.app).resolve(), Path(a.output).resolve()
output.mkdir(parents=True, exist_ok=True)
base = Path(__file__).parent.resolve()
env = dict(os.environ, AIW_PACKET_PATH=str(output / 'project-packet.json'))
commands = [('repository-unit', [sys.executable, '-m', 'unittest', 'discover', '-s', str(base), '-p', 'test_repository_layer.py', '-v'], base),
            ('explorer-regression', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], base.parent),
            ('adapter', ['node', 'repository-packet-validate.mjs'], app),
            ('adapter-syntax', ['node', '--check', 'repository-packet.js'], app),
            ('worker-syntax', ['node', '--check', 'worker.js'], app),
            ('application-build', ['node', 'build.mjs'], app)]
package = json.loads((app / 'package.json').read_text())
for name, command in package['scripts'].items():
    if (name == 'test' or name.startswith('test:')) and name != 'test:browser':
        commands.append((name, command.split(), app))
results = []
for name, command, cwd in commands:
    started = time.monotonic()
    try:
        result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, timeout=300)
        log = result.stdout + result.stderr
        code = result.returncode
    except subprocess.TimeoutExpired as exc:
        log, code = (exc.stdout or b'') + (exc.stderr or b'') + b'\nTIMEOUT', -1
    (output / (name.replace(':', '-') + '.log')).write_bytes(log)
    results.append({'name': name, 'command': command, 'exitCode': code, 'passed': code == 0, 'seconds': round(time.monotonic()-started, 2)})
    (output / 'regression-results.json').write_text(json.dumps({'complete': False, 'results': results}, indent=2))
    print(name, 'PASS' if code == 0 else 'FAIL', flush=True)
(output / 'regression-results.json').write_text(json.dumps({'complete': True, 'results': results,
    'passed': sum(x['passed'] for x in results), 'failed': sum(not x['passed'] for x in results)}, indent=2))
sys.exit(0 if all(x['passed'] for x in results) else 1)
