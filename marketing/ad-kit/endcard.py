"""The standard Arena ending for every tournament ad (same look, same sound; only the details change).

    python3 endcard.py out.mp4 --name "CODM SNIPER CUP" --line "SHIPMENT | 1V1 SNIPER" \
        --prize 1000 [--entry "KES 50"] [--when "SAT 15 NOV, 8PM"]

6 seconds: gold ARENA punches in on a braam, "PROVE IT.", the tournament, the prize
counting up with ticks and a chime, entry/date, then the "JOIN NOW" button.
"""
import argparse, os, subprocess, sys
from synth import Synth

KIT = os.path.dirname(os.path.abspath(__file__))
ANTON = os.path.join(KIT, 'fonts', 'Anton-Regular.ttf')
BEBAS = os.path.join(KIT, 'fonts', 'BebasNeue-Regular.ttf')
DUR, FPS = 6.0, 24
SITE = 'ARENA-ROYAL.VERCEL.APP'


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd[:8]), '...\n', r.stderr[-2500:])
        sys.exit(1)


def end_sound(path):
    """The Arena sonic signature. Fixed seed and timing, so it is identical in every ad."""
    s = Synth(DUR, seed=2026)
    s.add(s.bed([(0, 0.2), (0.3, 0.6), (5.2, 0.7), (6.0, 0)]))
    s.add(s.braam(0.0, 1.0, root=49.0, decay=3.0) + s.boom(0.0, 1.3, decay=2.4) + s.burst(0.0, 0.45, 0.5, 2500))
    for t0 in (0.6, 1.2, 1.6):
        s.add(s.boom(t0, 0.55, 38, 95, 0.25))
    k = 2.1
    while k < 2.9:
        s.add(s.tick(k))
        k += 0.05
    s.add(s.chime(2.9, 0.4) + s.boom(2.9, 0.7, 40, 120, 0.6))
    s.add(s.whoosh(3.6, 0.35) + s.boom(3.6, 0.8, 35, 100, 0.5))
    s.add(s.riser(4.3, 5.2, 0.3))
    s.add(s.braam(5.2, 0.9, root=55.0, decay=1.4) + s.boom(5.2, 1.1, decay=1.2))
    s.write(path, fade_out=0.45)


def assets(cache, W, H, vertical):
    """Backdrop layers for this size (made once, reused)."""
    os.makedirs(cache, exist_ok=True)
    p = lambda name: os.path.join(cache, name)
    if os.path.exists(p('cta.png')):
        return p
    run(['magick', '-size', f'{W}x{H}', 'gradient:#0d1428-#020306', p('bg.png')])
    # Light beams fanning down from above the title
    cx, top = W // 2, -int(H * 0.08)
    beams = ['magick', '-size', f'{W}x{H}', 'xc:none']
    for k, (spread, col) in enumerate([(-0.55, 'rgba(255,200,120,0.16)'), (-0.25, 'rgba(160,200,255,0.13)'),
                                      (0.0, 'rgba(255,230,180,0.18)'), (0.25, 'rgba(160,200,255,0.13)'),
                                      (0.55, 'rgba(255,200,120,0.16)')]):
        bx = cx + int(spread * W * 1.4)
        half = int(W * 0.09)
        beams += ['-fill', col, '-draw', f'polygon {cx - 8},{top} {cx + 8},{top} {bx + half},{H} {bx - half},{H}']
    run(beams + ['-blur', '0x22', p('beams.png')])
    run(['magick', '-size', f'{W}x{H}', 'xc:none', '-fill', 'rgba(255,170,70,0.35)',
         '-draw', f'ellipse {W // 2},{H} {int(W * 0.6)},{int(H * 0.12)} 0,360', '-blur', '0x40', p('floor.png')])
    # Rising embers
    import random
    random.seed(9)
    dots = ['magick', '-size', f'{W}x{2 * H}', 'xc:none']
    for _ in range(int(W * H / 3500)):
        x, y, r = random.randint(0, W), random.randint(0, 2 * H), random.choice([1, 1, 2, 2, 3])
        dots += ['-fill', f'rgba(255,{random.randint(150, 220)},90,{random.uniform(0.25, 0.8):.2f})',
                 '-draw', f'circle {x},{y} {x + r},{y}']
    run(dots + ['-blur', '0x0.8', p('embers.png')])
    # Gold title with glow
    tw = int(W * (0.86 if vertical else 0.56))
    th = int(tw * 0.3)
    run(['magick', '-size', f'{tw}x{th}', 'xc:none', '-font', ANTON, '-pointsize', str(int(th * 0.78)),
         '-gravity', 'center', '-fill', 'white', '-annotate', '+0+0', 'ARENA', p('tmask.png')])
    run(['magick', '-size', f'{tw}x{th}', 'gradient:#fff3c4-#c8892b', p('tmask.png'), '-alpha', 'off',
         '-compose', 'CopyOpacity', '-composite', p('tgold.png')])
    run(['magick', p('tmask.png'), '-fill', '#ffb84d', '-colorize', '100', '-blur', f'0x{max(8, th // 14)}', p('tglow.png')])
    run(['magick', p('tglow.png'), p('tgold.png'), '-compose', 'Over', '-composite', p('title.png')])
    # "JOIN NOW" button
    bw, bh = int(W * (0.84 if vertical else 0.46)), int(H * (0.065 if vertical else 0.1))
    run(['magick', '-size', f'{bw}x{bh}', 'xc:none', '-fill', '#ffc65c',
         '-draw', f'roundrectangle 0,0 {bw - 1},{bh - 1} {bh // 2},{bh // 2}',
         '-font', BEBAS, '-pointsize', str(int(bh * 0.52)), '-gravity', 'center', '-fill', '#120c02',
         '-annotate', '+0+2', f'JOIN NOW  ›  {SITE}', p('cta.png')])
    return p


def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace(':', '\\:').replace(',', '\\,').replace('%', '\\%')


def fade(a, b, end=DUR - 0.35, out=DUR):
    return f"if(lt(t,{a}),0,if(lt(t,{b}),(t-{a})/{b - a},if(lt(t,{end}),1,max(0,({out}-t)/{out - end}))))"


def render(out, name, line, prize, entry=None, when=None, vertical=True):
    W, H = (720, 1280) if vertical else (1280, 720)
    p = assets(os.path.join(KIT, '.cache', 'v' if vertical else 'h'), W, H, vertical)
    snd = os.path.join(KIT, '.cache', 'endcard.wav')
    if not os.path.exists(snd):
        end_sound(snd)

    u = H / 1280 if vertical else H / 720 * 0.62  # text scale
    ys = {  # vertical layout / widescreen layout (fractions of height)
        'title': 0.17 if vertical else 0.08, 'prove': 0.36 if vertical else 0.36, 'name': 0.47 if vertical else 0.50,
        'line': 0.535 if vertical else 0.60, 'label': 0.615 if vertical else 0.69, 'prize': 0.645 if vertical else 0.73,
        'details': 0.77 if vertical else 0.88, 'cta': 0.84 if vertical else 0.86,
    }
    prize_txt = f"KES {prize:,}"
    count = f"KES %{{eif\\:min({prize}\\,{prize}*(t-2.1)/0.8)\\:d}}"

    def dt(text, a, b, size, y, font=ANTON, color='white', raw=False, enable=None):
        txt = text if raw else esc(text)
        en = enable or f"gte(t,{a})"
        return (f"drawtext=fontfile='{font}':text='{txt}':fontsize={int(size)}:fontcolor={color}:"
                f"shadowcolor=black@0.6:shadowx=0:shadowy={max(2, int(4 * u))}:"
                f"x=(w-text_w)/2:y=h*{y}:alpha='{fade(a, b)}':enable='{en}'")

    texts = [
        dt('PROVE IT.', 0.6, 0.75, 118 * u if vertical else 150 * u, ys['prove']),
        dt(name.upper(), 1.2, 1.35, 70 * u if vertical else 84 * u, ys['name']),
        dt(line.upper(), 1.6, 1.75, 40 * u if vertical else 46 * u, ys['line'], font=BEBAS, color='0xc9d5dc'),
        dt('PRIZE POOL', 2.05, 2.15, 34 * u if vertical else 38 * u, ys['label'], font=BEBAS, color='0x9fb0bb'),
        dt(count, 2.1, 2.12, 120 * u if vertical else 120 * u, ys['prize'], color='0xffcf7a', raw=True,
           enable='between(t,2.1,2.9)'),
        dt(prize_txt, 2.9, 2.9001, 120 * u if vertical else 120 * u, ys['prize'], color='0xffcf7a'),
    ]
    if vertical:
        details = '   |   '.join(x for x in (f'ENTRY {entry}' if entry else None, when) if x)
        if details:
            texts.append(dt(details.upper(), 3.0, 3.2, 38 * u, ys['details'] - 0.06, font=BEBAS, color='0xd6e0e6'))
    else:
        details = '   |   '.join(x for x in (f'ENTRY {entry}' if entry else None, when) if x)
        if details:
            texts.append(dt(details.upper(), 3.0, 3.2, 40 * u, 0.80, font=BEBAS, color='0xd6e0e6'))

    tw = int(W * (0.86 if vertical else 0.56))
    g = [
        f"[1:v]format=rgba,colorchannelmixer=aa=0.95[beams]",
        f"[0:v][beams]overlay=x='(W-w)/2+{int(W * 0.02)}*sin(t*0.9)':y=0:format=auto[b1]",
        f"[2:v]format=rgba[floor]",
        f"[b1][floor]overlay=0:0:format=auto[b2]",
        f"[3:v]format=rgba,colorchannelmixer=aa=0.75[emb]",
        f"[b2][emb]overlay=x=0:y='-mod(t*{int(H * 0.05)}\\,{H})':format=auto[b3]",
        f"[4:v]format=rgba,fade=t=in:st=0:d=0.12:alpha=1,"
        f"scale=w='{tw}*if(lt(t\\,0.25)\\,1.35-0.35*t/0.25\\,1+0.015*(t-0.25))':h=-1:eval=frame[title]",
        f"[b3][title]overlay=x='(W-w)/2':y='H*{ys['title']}+({int(tw * 0.3)}-h)/2':format=auto[b4]",
        f"[5:v]format=rgba,fade=t=in:st=3.6:d=0.25:alpha=1[cta]",
        f"[b4][cta]overlay=x='(W-w)/2':y='H*{ys['cta'] if vertical else 0.9}-h/2+{int(H * 0.02)}*max(0\\,1-(t-3.6)/0.25)'"
        f":enable='gte(t,3.6)':format=auto[b5]",
        f"[b5]{','.join(texts)}[b6]",
        f"color=white:s={W}x{H}:r={FPS}:d=0.3,format=rgba,fade=t=out:st=0:d=0.3:alpha=1[fl]",
        f"[b6][fl]overlay=0:0:eof_action=pass:format=auto[b7]",
        f"[b7]scale={W + 24}:{H + 24},crop={W}:{H}:"
        f"x='12+if(lt(t\\,0.4)\\,10*sin(t*70)*(0.4-t)/0.4\\,0)+if(between(t\\,5.2\\,5.6)\\,7*sin((t-5.2)*70)*(5.6-t)/0.4\\,0)':"
        f"y='12+if(lt(t\\,0.4)\\,7*cos(t*63)*(0.4-t)/0.4\\,0)',"
        f"noise=alls=6:allf=t+u,vignette=PI/4.5,fade=t=out:st={DUR - 0.35}:d=0.35,format=yuv420p[vout]",
    ]
    gf = os.path.join(KIT, '.cache', 'endcard_graph.txt')
    open(gf, 'w').write(';\n'.join(g))
    loop = lambda f: ['-loop', '1', '-framerate', str(FPS), '-t', str(DUR), '-i', f]
    run(['ffmpeg', '-v', 'error', '-y', *loop(p('bg.png')), *loop(p('beams.png')), *loop(p('floor.png')),
         *loop(p('embers.png')), *loop(p('title.png')), *loop(p('cta.png')), '-i', snd,
         '-/filter_complex', gf, '-map', '[vout]', '-map', '6:a', '-t', str(DUR), '-r', str(FPS),
         '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', out])
    print('end card ->', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--name', required=True, help='Tournament name, e.g. "CODM SNIPER CUP"')
    ap.add_argument('--line', required=True, help='Game / format line, e.g. "SHIPMENT | 1V1 SNIPER"')
    ap.add_argument('--prize', type=int, required=True, help='Prize pool in KES, e.g. 1000')
    ap.add_argument('--entry', help='Entry fee text, e.g. "KES 50" or "FREE"')
    ap.add_argument('--when', help='Start time text, e.g. "SAT 15 NOV, 8PM"')
    ap.add_argument('--horizontal', action='store_true', help='1280x720 for the site trailer slot')
    a = ap.parse_args()
    render(a.out, a.name, a.line, a.prize, a.entry, a.when, vertical=not a.horizontal)
