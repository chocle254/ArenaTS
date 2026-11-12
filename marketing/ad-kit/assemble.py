"""Joins an action cut and the standard Arena end card into one ad.

    python3 assemble.py action.mp4 endcard.mp4 final-ad.mp4

Both inputs must share size and frame rate (endcard.py makes 720x1280 or 1280x720 at 24 fps).
"""
import subprocess, sys

action, end, out = sys.argv[1:4]
r = subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-i', action, '-i', end,
    '-filter_complex', '[0:v]fps=24,setsar=1[a];[1:v]fps=24,setsar=1[b];[0:a]aresample=44100[x];[1:a]aresample=44100[y];'
                       '[a][x][b][y]concat=n=2:v=1:a=1[v][au]',
    '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], capture_output=True, text=True)
if r.returncode:
    print(r.stderr[-2000:]); sys.exit(1)
print('ad ->', out)
