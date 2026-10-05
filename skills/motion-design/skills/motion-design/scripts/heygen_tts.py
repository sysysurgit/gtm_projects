#!/usr/bin/env python3
"""Synthèse vocale HeyGen + timestamps mot à mot (sans transcription).

Pré-requis (une fois, par l'utilisateur) :
  curl -fsSL https://static.heygen.ai/cli/install.sh | bash
  heygen auth login --oauth        # OAuth = crédit gratuit (~2 min de voix / mois). --api-key = payant.

Usage :
  python3 heygen_tts.py <texte.txt | "texte"> <voice_id> <sortie_sans_extension> [--ssml] [--locale fr-FR]
Écrit <sortie>.json (réponse brute), <sortie>.wav (audio) et <sortie>.words.json ([{text,start,end}]).

Voix françaises testées : Audrey 7459d7aa599b4f97908600896a0e7ef4 (dynamique, choisie pour OpenClimat),
Chloé 4b1de1582d2c477485ad2e0c2717f0ff (plus posée). Lister : heygen voice list --engine starfish --language French
"""
import json, os, subprocess, sys
from pathlib import Path

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ssml = "--ssml" in sys.argv
    locale = sys.argv[sys.argv.index("--locale") + 1] if "--locale" in sys.argv else "fr-FR"
    if "--locale" in sys.argv:
        args.remove(locale)
    if len(args) != 3:
        sys.exit(__doc__)
    src, voice, out = args
    text = Path(src).read_text() if os.path.isfile(src) else src
    env = {**os.environ, "PATH": f"{Path.home()}/.local/bin:" + os.environ.get("PATH", "")}
    cmd = ["heygen", "voice", "speech", "create", "--text", text, "--voice-id", voice, "--locale", locale]
    if ssml:
        cmd += ["--input-type", "ssml"]
    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    Path(out + ".json").write_text(res.stdout or res.stderr)
    d = json.loads(res.stdout or res.stderr)
    if "error" in d:
        sys.exit(f"HeyGen : {d['error'].get('code')} — {d['error'].get('message')}")
    d = d.get("data", d)
    subprocess.run(["curl", "-sL", d["audio_url"], "-o", out + ".wav"], check=True)
    words = [{"text": w["word"], "start": w["start"], "end": w["end"]} for w in d["word_timestamps"] if not w["word"].startswith("<")]
    Path(out + ".words.json").write_text(json.dumps(words, ensure_ascii=False))
    print(f"{d['duration']:.2f}s, {len(words)} mots → {out}.wav / {out}.words.json")

if __name__ == "__main__":
    main()
