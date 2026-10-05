#!/usr/bin/env python3
"""Sound design (méthode OOO), version générique : bruitages synthétisés, musique de fond, mix.

Lit <projet>/audio/timeline.json (build_timeline.py) et la section "audio" de motion.config.json.
Écrit :
  audio/sfx/*.wav   click, pop, riser, hit, chime, whoosh, stamp (synthèse ffmpeg, aucune banque de sons)
  audio/music.wav   fond doux : accords tenus + arpège en croches (ou audio.music_file si fourni)
  audio/mix.wav     voix + musique compressée par la voix (sidechain OOO) + bruitages, normalisé

Config "audio" (toutes les clés sont optionnelles) :
  "sfx_gain": 0.30,                     niveau global des bruitages (retour client : rester bas)
  "sfx_gain_by_type": {"chime": 0.45},  gain relatif par type
  "click_on_scene_change": true,
  "music_volume": 0.32, "music_file": null, "bpm": 90,
  "chords": [[174.61,220,261.63,329.63], ...]  (Hz, 2 mesures chacun)
  "target_lufs": -14,
  "events": [{"scene": "s1-x", "cue": "quand", "sound": "riser", "offset": -1.6, "gain": 0.9}, ...]

Usage : python3 build_audio.py <projet>
"""
import json, subprocess, sys
from pathlib import Path

SR = 48000
DEFAULT_CHORDS = [
    [174.61, 220.00, 261.63, 329.63],  # Fmaj7
    [196.00, 246.94, 293.66, 329.63],  # G6
    [220.00, 261.63, 329.63, 392.00],  # Am7
    [130.81, 164.81, 196.00, 246.94],  # Cmaj7
]
DEFAULT_GAIN = {"chime": 0.45, "hit": 0.7, "riser": 0.8, "stamp": 0.8}

def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)

def make_sfx(d):
    d.mkdir(parents=True, exist_ok=True)
    synth = lambda name, expr, dur, post="": ff("-f", "lavfi", "-i", f"aevalsrc='{expr}':s={SR}:d={dur}" + (f",{post}" if post else ""),
                                               "-ac", "1", str(d / f"{name}.wav"))
    ff("-f", "lavfi", "-i", f"anoisesrc=d=0.05:c=white:a=0.7:r={SR}",
       "-f", "lavfi", "-i", f"aevalsrc='0.5*sin(2*PI*170*t)*exp(-60*t)':s={SR}:d=0.06",
       "-filter_complex", "[0]highpass=f=2800,afade=t=out:st=0:d=0.05[n];[n][1]amix=inputs=2:normalize=0[o]",
       "-map", "[o]", "-ac", "1", str(d / "click.wav"))
    synth("pop", "0.45*sin(2*PI*(1100*t-2600*t*t))*exp(-28*t)", 0.14)
    ff("-f", "lavfi", "-i", f"anoisesrc=d=1.6:c=pink:a=0.5:r={SR}",
       "-f", "lavfi", "-i", f"aevalsrc='0.22*sin(2*PI*(140*t+120*t*t))*pow(t/1.6,2)':s={SR}:d=1.6",
       "-filter_complex", "[0]bandpass=f=1800:width_type=o:w=2,afade=t=in:st=0:d=1.6:curve=exp[n];[n][1]amix=inputs=2:normalize=0[o]",
       "-map", "[o]", "-ac", "1", str(d / "riser.wav"))
    synth("hit", "0.8*sin(2*PI*(90*t-60*t*t))*exp(-9*t)", 0.6)
    synth("chime", "0.12*(sin(2*PI*1046.5*t)+0.4*sin(2*PI*1568*t)+0.12*sin(2*PI*2093*t))*exp(-3.5*t)*min(1,t/0.012)", 1.6, "lowpass=f=4000")
    ff("-f", "lavfi", "-i", f"anoisesrc=d=0.7:c=pink:a=0.35:r={SR}",
       "-af", "bandpass=f=900:width_type=o:w=1.5,afade=t=in:st=0:d=0.35,afade=t=out:st=0.35:d=0.35",
       "-ac", "1", str(d / "whoosh.wav"))
    synth("stamp", "0.7*sin(2*PI*(160*t-200*t*t))*exp(-22*t)", 0.3)

def make_music(a_dir, total, chords, bpm):
    seg = 2 * 4 * 60 / bpm
    beat = 60 / bpm
    parts = []
    for i in range(int(total // seg) + 2):
        ch = chords[i % len(chords)]
        pad = "+".join(f"0.05*sin(2*PI*{f}*t)+0.02*sin(2*PI*{f*2.003}*t)" for f in ch)
        arp = "+".join(f"0.06*sin(2*PI*{ch[k % len(ch)]*2}*t)*exp(-7*mod(t-{k*beat/2:.3f},{2*beat:.3f}))*gte(mod(t,{2*beat:.3f}),{k*beat/2:.3f})"
                       for k in range(4))
        p = a_dir / f"_m{i}.wav"
        ff("-f", "lavfi", "-i", f"aevalsrc='({pad})*(0.85+0.15*sin(2*PI*0.25*t))+{arp}':s={SR}:d={seg:.4f}",
           "-af", f"afade=t=in:st=0:d=0.08,afade=t=out:st={seg-0.08:.3f}:d=0.08", "-ac", "1", str(p))
        parts.append(p)
    lst = a_dir / "_m.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    ff("-f", "concat", "-safe", "0", "-i", str(lst),
       "-af", f"lowpass=f=3200,aecho=0.8:0.6:120|240:0.25|0.15,atrim=0:{total:.3f},afade=t=in:st=0:d=1.5,afade=t=out:st={total-2.5:.3f}:d=2.5",
       "-ac", "2", str(a_dir / "music.wav"))
    for p in parts:
        p.unlink()
    lst.unlink()

def main(root):
    root = Path(root).resolve()
    A = root / "audio"
    cfg = json.loads((root / "motion.config.json").read_text()).get("audio", {})
    tl = json.loads((A / "timeline.json").read_text())
    total = tl["duration"]
    make_sfx(A / "sfx")
    music = A / "music.wav"
    if cfg.get("music_file"):
        ff("-i", str(root / cfg["music_file"]), "-af", f"atrim=0:{total:.3f},afade=t=out:st={total-2.5:.3f}:d=2.5", "-ac", "2", str(music))
    else:
        make_music(A, total, cfg.get("chords", DEFAULT_CHORDS), cfg.get("bpm", 90))

    sc = {s["id"]: s for s in tl["scenes"]}
    ev = []
    if cfg.get("click_on_scene_change", True):
        ev += [(s["start"] - 0.02, "click", 0.9) for s in tl["scenes"][1:]]
    for e in cfg.get("events", []):
        s = sc[e["scene"]]
        ev.append((s["start"] + s["cues"][e["cue"]] + e.get("offset", 0.0), e["sound"], e.get("gain", 1.0)))
    ev.sort()

    gain_by = {**DEFAULT_GAIN, **cfg.get("sfx_gain_by_type", {})}
    base = cfg.get("sfx_gain", 0.30)
    inputs = ["-i", str(A / "voice.wav"), "-i", str(music)]
    f = [f"[0]aformat=channel_layouts=stereo,apad=whole_dur={total:.3f},asplit=2[vo][sc]",  # apad : sinon la musique s'arrête avec la voix
         f"[1][sc]sidechaincompress=threshold=0.06:ratio=2:attack=350:release=1400:knee=8,volume={cfg.get('music_volume', 0.32)}[mu]"]
    labels = []
    for k, (t, name, g) in enumerate(ev):
        inputs += ["-i", str(A / "sfx" / f"{name}.wav")]
        d = max(0, int(t * 1000))
        f.append(f"[{k+2}]aformat=channel_layouts=stereo,adelay={d}|{d},volume={base*g*gain_by.get(name, 1.0):.3f}[e{k}]")
        labels.append(f"[e{k}]")
    mix_in = "[vo][mu]"
    n = 2
    if labels:
        f.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0[fx]")
        mix_in += "[fx]"; n = 3
    lufs = cfg.get("target_lufs", -14)
    f.append(f"{mix_in}amix=inputs={n}:normalize=0,atrim=0:{total:.3f},"
             f"loudnorm=I={lufs}:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.85:level=false[out]")
    ff(*inputs, "-filter_complex", ";".join(f), "-map", "[out]", "-ac", "2", "-ar", str(SR), str(A / "mix.wav"))
    print(f"{len(ev)} bruitages placés, mix {total:.2f}s → audio/mix.wav")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
