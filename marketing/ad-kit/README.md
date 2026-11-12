# Arena ad kit

Every tournament ad is **action cut + the standard Arena ending**. The ending (look and sound)
is the same in every ad; only the tournament details change.

All sound is synthesised here and all graphics are drawn here, so Arena owns everything.
Fonts are Anton and Bebas Neue (SIL Open Font License, see `fonts/`).
Needs `ffmpeg`, ImageMagick (`magick`) and Python 3 with numpy.

## 1. The ending (6 s)

```sh
python3 endcard.py end.mp4 --name "CODM SNIPER CUP" --line "SHIPMENT | 1V1 SNIPER" \
    --prize 1000 --entry "KES 50" --when "SAT 15 NOV, 8PM"
# add --horizontal for the 1280x720 version (site trailer slot); default is 720x1280 (Reels/TikTok/Status)
```

Gold ARENA punches in on a braam, "PROVE IT.", tournament name, game line, the prize counting up
with ticks and a chime, entry/date, then the JOIN NOW button. `--entry` and `--when` are optional.

## 2. The action cut

Generate shots in Kling (prompts below), then cut them with speed ramps: fast push-ins for the
hook, real speed into each shot, slow motion after it, 0.25 s of silence before the decisive shot.
Use `synth.py` for the sound (`boom`, `braam`, `shot`, `scope_in`, `heartbeat`, `whoosh`, `riser`).
Keep the action cut at the same size and 24 fps as the ending.

## 3. Join them

```sh
python3 assemble.py action.mp4 end.mp4 final-ad.mp4
```

## Kling prompts: Shipment, 1v1 sniper

Shipment is a small square container yard: four blocks of stacked shipping containers around a
cross-shaped centre intersection, open containers with doors at both ends, players on container
roofs for long sightlines, cranes and a dock beyond the walls. Generate each prompt at 9:16 for
social and again at 16:9 for the site. Keep the same two characters in every shot (one in dark
tactical gear, one in tan desert gear). Avoid on-screen text and logos; the edit adds them.

1. **Aerial reveal**: "Cinematic aerial drone shot at dusk descending into a small square shipping-container yard at a port, four blocks of stacked red, blue and green containers forming a cross-shaped intersection in the centre, cranes silhouetted against an orange sky, light rain, volumetric light, photoreal"
2. **Sprint**: "Low tracking shot following a soldier in dark tactical gear sprinting through a narrow alley between stacked shipping containers, sniper rifle in hand, puddles splashing, camera shake, motion blur, cinematic"
3. **Roof mantle**: "Soldier in tan desert gear vaults onto the roof of a shipping container in one motion and drops prone with a sniper rifle, rain, rim light, slow motion, cinematic"
4. **Quickscope**: "Over-the-shoulder shot, sniper raises rifle and fires within half a second, scope glint, bright muzzle flash, brass casing ejecting in slow motion, container yard background, cinematic"
5. **Scope view**: "First-person view through a sniper scope sweeping fast across stacked shipping containers and stopping on an enemy soldier peeking from an open container door, crosshair centred, shallow depth of field"
6. **Peek**: "Close-up of a soldier peeking around the corner of an open shipping container, eyes narrowing, rain on the helmet, tense, cinematic lighting"
7. **Near miss**: "Bullet sparks against a red shipping container wall inches from a soldier's head, he ducks back into cover, slow motion debris, cinematic"
8. **Final shot**: "Two snipers face each other across the centre intersection of a container yard, both fire at the same instant, twin muzzle flashes, slow motion, dramatic backlight"
9. **Aftermath**: "Wide shot of the empty centre of a container yard after a firefight, smoke drifting, one soldier standing, rain, cinematic, moody"

Avoid footage, logos, characters or music from Call of Duty or other creators: an ad for paid
tournaments must only use material Arena owns or is licensed to use.
