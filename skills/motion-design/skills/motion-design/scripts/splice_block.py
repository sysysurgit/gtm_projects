#!/usr/bin/env python3
"""Remplace un bloc de phrases dans une prise de voix par une nouvelle génération du même bloc.

Coupe la prise d'origine au milieu des blancs qui entourent le bloc, insère le nouveau bloc
en conservant les mêmes blancs, et fusionne les timestamps mot à mot.

Usage : python3 tools/splice_block.py <prise.wav> <words.json> <bloc.wav> <bloc.json heygen>
                                      <premier mot> <dernier mot> <sortie.wav> <sortie_words.json> [après ce mot]
"""
import json, subprocess, sys, unicodedata, re

def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in t if unicodedata.category(c) != "Mn"))

def main(take, words_p, blk, blk_json, first, last, out, out_words, after=None):
    W = json.load(open(words_p))
    d = json.load(open(blk_json)); d = d.get("data", d)
    B = [{"text": x["word"], "start": x["start"], "end": x["end"]} for x in d["word_timestamps"] if not x["word"].startswith("<")]
    start = 0 if after is None else next(i for i, w in enumerate(W) if norm(w["text"]) == norm(after)) + 1
    i0 = next(i for i in range(start, len(W)) if norm(W[i]["text"]) == norm(first))
    i1 = next(i for i in range(i0, len(W)) if norm(W[i]["text"]) == norm(last))
    cut_a = (W[i0 - 1]["end"] + W[i0]["start"]) / 2
    cut_b = (W[i1]["end"] + W[i1 + 1]["start"]) / 2
    pre, post = W[i0]["start"] - cut_a, cut_b - W[i1]["end"]
    b0, b1 = B[0]["start"], B[-1]["end"]
    blk_len = pre + (b1 - b0) + post
    sr = 44100
    f = (f"[0]atrim=0:{cut_a:.4f},asetpts=PTS-STARTPTS[a];"
         f"anullsrc=r={sr}:cl=mono,atrim=0:{pre:.4f}[s1];"
         f"[1]atrim={b0:.4f}:{b1:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={b1-b0-0.01:.4f}:d=0.01[b];"
         f"anullsrc=r={sr}:cl=mono,atrim=0:{post:.4f}[s2];"
         f"[0]atrim={cut_b:.4f},asetpts=PTS-STARTPTS[c];"
         "[a][s1][b][s2][c]concat=n=5:v=0:a=1[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", take, "-i", blk, "-filter_complex", f,
                    "-map", "[out]", "-ar", str(sr), "-ac", "1", out], check=True)
    shift_b = cut_a + pre - b0
    delta = blk_len - (cut_b - cut_a)
    merged = W[:i0] + [{"text": x["text"], "start": round(x["start"] + shift_b, 4), "end": round(x["end"] + shift_b, 4)} for x in B] \
        + [{"text": x["text"], "start": round(x["start"] + delta, 4), "end": round(x["end"] + delta, 4)} for x in W[i1 + 1:]]
    json.dump(merged, open(out_words, "w"), ensure_ascii=False)
    print(f"bloc remplacé : {cut_a:.2f}–{cut_b:.2f}s → {blk_len:.2f}s (décalage {delta:+.2f}s), {len(merged)} mots")

if __name__ == "__main__":
    main(*sys.argv[1:10])
