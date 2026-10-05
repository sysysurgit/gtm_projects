#!/usr/bin/env python3
"""Recalage voix -> scènes (méthode OOO, étape « time-mapping »), version générique.

Lit la configuration du projet (motion.config.json), une prise de voix et sa transcription
mot à mot ([{text,start,end}]). Insère les silences voulus (avant des punchlines, entre les
scènes), écrit audio/voice.wav et audio/timeline.json, puis injecte :
  - les temps des mots déclencheurs dans compositions/<scene>.html (bloc /*CUES*/{...}/*END*/,
    avec en plus "_dur" = durée de la scène) ;
  - data-start/data-duration des hôtes <div id="h-<scene>"> dans index.html ;
  - la durée totale (root, <audio id="mix">) et, si présent, la fin du bandeau #li-banner.

Usage : python3 build_timeline.py <projet> <prise.(wav|mp3)> <words.json>
"""
import json, re, subprocess, sys, unicodedata
from pathlib import Path

SR = 48000

def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", t)

def find_from(words, start, alts, nth=1):
    alts = [norm(a) for a in alts]
    seen = 0
    for i in range(start, len(words)):
        if norm(words[i]["text"]) in alts:
            seen += 1
            if seen == nth:
                return i
    raise SystemExit(f"mot introuvable : {alts} (à partir de l'index {start}, « {words[start]['text'] if start < len(words) else 'fin'} »)")

def main(root, voice, words_path):
    root = Path(root).resolve()
    cfg = json.loads((root / "motion.config.json").read_text())
    T = cfg.get("timing", {})
    LEAD_IN, SCENE_GAP = T.get("lead_in", 0.5), T.get("scene_gap", 0.35)
    SCENE_LEAD, TAIL = T.get("scene_lead", 0.3), T.get("tail", 2.4)
    scenes = cfg["scenes"]
    words = json.load(open(words_path))

    # 1) premier mot de chaque scène + cues, cherchés dans l'ordre du texte
    idx, scene_first, cue_idx = 0, [], {}
    for sc in scenes:
        s0 = find_from(words, idx, sc["first"])
        scene_first.append(s0)
        for c in sc["cues"]:
            cue_idx[(sc["id"], c["name"])] = find_from(words, s0, c["words"], c.get("nth", 1))
        idx = max([cue_idx[(sc["id"], c["name"])] for c in sc["cues"]] + [s0]) + 1

    # 2) silences à insérer avant certains mots
    inserts = {0: LEAD_IN}
    for k in range(1, len(scenes)):
        i = scene_first[k]
        inserts[i] = inserts.get(i, 0) + SCENE_GAP + scenes[k].get("extra_gap", 0)
    for p in cfg.get("pauses", []):
        i = cue_idx[(p["scene"], p["cue"])]
        inserts[i] = inserts.get(i, 0) + p["sec"]

    # 3) couper au milieu du blanc qui précède chaque mot, insérer le silence
    cuts = []
    for i, d in sorted(inserts.items()):
        t = 0.0 if i == 0 else (words[i - 1]["end"] + words[i]["start"]) / 2
        cuts.append((t, d))
    shift = lambda t: t + sum(d for (c, d) in cuts if c <= t)
    src_dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "csv=p=0", voice]).decode())
    pre = "aresample=48000,aformat=channel_layouts=mono,"
    parts, filt, prev = [], [], 0.0
    for n, (t, d) in enumerate(cuts):
        if t > prev:
            filt.append(f"[0:a]{pre}atrim={prev:.4f}:{t:.4f},asetpts=PTS-STARTPTS[a{n}]"); parts.append(f"[a{n}]")
        filt.append(f"anullsrc=r={SR}:cl=mono,atrim=0:{d:.4f}[z{n}]"); parts.append(f"[z{n}]")
        prev = t
    filt.append(f"[0:a]{pre}atrim={prev:.4f},asetpts=PTS-STARTPTS[last]"); parts.append("[last]")
    filt.append(f"{''.join(parts)}concat=n={len(parts)}:v=0:a=1[out]")
    (root / "audio").mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", voice, "-filter_complex", ";".join(filt),
                    "-map", "[out]", "-ar", str(SR), "-ac", "1", str(root / "audio" / "voice.wav")], check=True)

    # 4) bornes des scènes et cues relatifs
    starts = [0.0] + [round(shift(words[scene_first[k]]["start"]) - SCENE_LEAD, 3) for k in range(1, len(scenes))]
    end = round(shift(words[-1]["end"]) + TAIL, 3)
    tl = {"duration": end, "voice_duration": round(shift(src_dur), 3), "scenes": []}
    for k, sc in enumerate(scenes):
        s, e = starts[k], (starts[k + 1] if k + 1 < len(scenes) else end)
        cue = {c["name"]: round(shift(words[cue_idx[(sc["id"], c["name"])]]["start"]) - s, 3) for c in sc["cues"]}
        cue["_dur"] = round(e - s, 3)
        tl["scenes"].append({"id": sc["id"], "start": s, "duration": round(e - s, 3), "cues": cue})
    tl["words"] = [{"text": w["text"], "start": round(shift(w["start"]), 3), "end": round(shift(w["end"]), 3)} for w in words]
    (root / "audio" / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1))
    inject(root, tl)
    for sc in tl["scenes"]:
        print(f"{sc['id']:16s} {sc['start']:7.2f} +{sc['duration']:6.2f}  {sc['cues']}")
    print(f"durée totale {end:.2f}s")

def inject(root, tl):
    for sc in tl["scenes"]:
        f = root / "compositions" / f"{sc['id']}.html"
        if f.exists():
            s = re.sub(r"/\*CUES\*/.*?/\*END\*/", "/*CUES*/" + json.dumps(sc["cues"]) + "/*END*/", f.read_text(), flags=re.S)
            f.write_text(s)
    idx = root / "index.html"
    s = idx.read_text()
    # Le Studio réécrit les balises (data-hf-id…) : regex tolérantes à l'ordre des attributs
    for sc in tl["scenes"]:
        s = re.sub(rf'(<div[^>]*?\sid="h-{sc["id"]}"[^>]*?data-start=")[0-9.]+("[^>]*?data-duration=")[0-9.]+(")',
                   rf"\g<1>{sc['start']}\g<2>{sc['duration']}\g<3>", s, flags=re.S)
    s = re.sub(r'(id="root"[^>]*?data-duration=")[0-9.]+(")', rf"\g<1>{tl['duration']}\g<2>", s, count=1, flags=re.S)
    s = re.sub(r'(<audio[^>]*?\sid="mix"[^>]*?data-duration=")[0-9.]+(")', rf"\g<1>{tl['duration']}\g<2>", s, flags=re.S)
    last = tl["scenes"][-1]
    s = re.sub(r'(<div[^>]*?\sid="li-banner"[^>]*?data-duration=")[0-9.]+(")', rf"\g<1>{last['start']}\g<2>", s, flags=re.S)
    idx.write_text(s)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
