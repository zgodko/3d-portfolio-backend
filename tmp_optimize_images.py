import subprocess
import sys
from pathlib import Path

root = Path('images')
files = sorted([p for p in root.rglob('*') if p.is_file()
               and p.suffix.lower() == '.png'])
print(f'png files {len(files)}')
optipng = r'C:\optipng-7.9.1-win64\optipng.exe'
failed = []
for index, path in enumerate(files, 1):
    print(f'[{index}/{len(files)}] {path}')
    try:
        subprocess.run([optipng, '-o2', str(path)], check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    except subprocess.CalledProcessError as exc:
        failed.append((str(path), exc.returncode))
        print(f'FAILED {path} (code {exc.returncode})')

if failed:
    print(f'failed count {len(failed)}')
    for path, code in failed[:20]:
        print(path, code)
    sys.exit(1)

print('done')
