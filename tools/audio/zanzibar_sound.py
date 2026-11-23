"""Score + sparse SFX for the Zanzibar short (same rules as batu_sound.py: few effects, everything ducked under speech).
Uses the MIT DSP/instrument kit by mromidev. Output: anim/public/zanzibar/mix.wav aligned to composition frame 0."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from dsp import SR, rng, lp, hp, colored, pan, read_wav, write_wav, norm_to, true_peak, integrated, make_ir, convolve_st
import instruments as I
import sfx_gen as S
from scipy.ndimage import maximum_filter1d

ROOT = Path(__file__).resolve().parents[2]
VO = 12
F = dict(the=12, m38=53, pay=115, shells=128, zanzibar=151, y1896=166, german=296, british=312, sultan=389, dies=397, khalid=462, moves=475,
         approval=529, so=597, warships=630, five=658, gathers=690, cannons=754, yacht=775, ultimatum=807, reply=881, wait=971, tiny=1000,
         yousee=1075, years=1086, thistime=1244, bluff=1279, oclock=1300, n902=1322, fire=1351, n905=1366, shoots=1410, sinks=1448, n940=1469,
         flames=1513, flag=1538, warover=1564, flees=1597, escapes=1645, bill=1768, payshells=1832, so2=1874, bravest=1889, worst=1939)
t = lambda f: f / 30.0
r = rng(11)
voice, vsr = read_wav(str(ROOT / "anim/public/zanzibar/voice.wav")); voice = np.asarray(voice, float)
voice = voice.mean(axis=0) if voice.ndim > 1 else voice
if vsr != SR:
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(SR, vsr); voice = resample_poly(voice, SR // g, vsr // g)
DUR = (VO + len(voice) / SR * 30 + 75) / 30
N = int(DUR * SR) + SR
music = np.zeros((2, N)); sfx = np.zeros((2, N))

def put(buf, x, sec, gain=1.0, p=0.0):
    x = np.asarray(x, float); x = pan(x, p) if x.ndim == 1 else x
    i = int(sec * SR); a, b = max(0, i), min(N, i + x.shape[1])
    if b > a: buf[:, a:b] += gain * x[:, a - i:b - i]
m2f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
BEAT = 60 / 104
# G major / E minor colonial-march colour, kept light
G2, D3, E3, G3, A3, B3, D4, E4, G4, A4, B4, D5 = 43, 50, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74

def pad(s0, s1, notes, vel=0.35, warm=900):
    if s1 - s0 > 0.3: put(music, I.pad([m2f(n) for n in notes], s1 - s0, vel, r, att=min(1, (s1 - s0) / 3), rel=min(1.2, (s1 - s0) / 3), warm=warm), s0)
def plucks(s0, s1, notes, vel=0.5, step=0.5):
    k, s = 0, s0
    while s < s1: put(music, I.pluck(m2f(notes[k % len(notes)]), vel, r, dur=0.8, bright=0.5), s, 0.7, 0.3 * np.sin(k)); s += BEAT * step; k += 1
def snare_march(s0, s1, vel=0.45):
    k, s = 0, s0
    while s < s1:
        put(music, I.snare(vel * (1 if k % 4 == 0 else 0.6), r, dur=0.18, snappy=0.8), s, 0.6, -0.1)
        if k % 2 == 0: put(music, I.timpani(m2f(G2), vel * 0.7, r, dur=0.9), s, 0.6)
        s += BEAT * 0.5; k += 1
def tick(s0, s1, gain=0.25):
    s = s0
    while s < s1:
        x = hp(colored(int(0.02 * SR), r), 2500) * np.exp(-np.linspace(0, 12, int(0.02 * SR))); put(sfx, x, s, gain); s += 0.25
def boom(sec, gain=0.5):
    n = int(1.4 * SR); env = np.exp(-np.linspace(0, 5, n)); put(sfx, lp(colored(n, r, slope=-1.2), 600) * env, sec, gain); put(sfx, I.timpani(m2f(G2 - 7), 0.9, r, dur=1.2), sec, gain * 0.6)

# ---- score
pad(0, t(F["zanzibar"]), (E3, B3), 0.3)
tick(t(F["the"]), t(F["m38"]) + 0.6)
plucks(t(F["zanzibar"]), t(F["dies"]), (G3, B3, D4, E4, D4, B3), 0.45)
pad(t(F["dies"]), t(F["so"]), (E3, G3, B3), 0.3, warm=700)
snare_march(t(F["so"]), t(F["reply"]))
plucks(t(F["so"]), t(F["reply"]), (G3, D4, G4, D4, B3, D4), 0.45)
pad(t(F["reply"]), t(F["oclock"]), (E3, B3, E4), 0.28, warm=650)
tick(t(F["oclock"]) - 0.3, t(F["fire"]), 0.3)
snare_march(t(F["fire"]), t(F["warover"]), 0.55)
pad(t(F["flees"]), t(F["bill"]), (G3, B3, D4), 0.3)
plucks(t(F["bill"]), DUR - 0.6, (G3, B3, D4, G4, D4, B3), 0.4, step=1)
for f0 in (F["m38"], F["y1896"], F["fire"], F["warover"], F["bravest"]):
    put(music, I.timpani(m2f(G2), 0.9, r, dur=1.2), t(f0) - 0.22, 0.5); put(music, I.cymbal(0.4, r, dur=1.0, bright=0.6), t(f0) - 0.22, 0.16)

# ---- sparse SFX
put(sfx, I.timpani(m2f(G2 + 5), 0.7, r, dur=0.6), t(F["shells"]) - 0.1, 0.35)            # stamp thump
put(sfx, S.whoosh(1.2, r, peak=0.6, f_lo=150, f_hi=900), t(F["zanzibar"]), 0.3)
put(sfx, I.timpani(m2f(G2 + 5), 0.7, r, dur=0.6), t(F["approval"]) - 0.1, 0.35)
for k in range(5): put(sfx, S.whoosh(0.7, r, peak=0.4, f_lo=200, f_hi=1000), t(F["warships"] - 20 + k * 8), 0.12, 0.5)
for k in range(9): boom(t(F["fire"]) + k * 0.9, 0.28)
boom(t(F["shoots"]), 0.2); put(sfx, S.splash_big(r), t(F["sinks"]), 0.25)
n = int(3 * SR); put(sfx, lp(colored(n, r, slope=-0.5), 1500) * np.minimum(1, np.linspace(0, 4, n)) * np.exp(-np.linspace(0, 1.2, n)), t(F["flames"]), 0.25)
put(sfx, S.whoosh(0.9, r, peak=0.4, f_lo=300, f_hi=1500), t(F["escapes"]), 0.25)
put(sfx, S.whoosh(0.6, r, peak=0.3, f_lo=600, f_hi=3000, air=0.4), t(F["bill"]) - 0.1, 0.3)  # paper slide
put(sfx, I.timpani(m2f(G2 + 5), 0.8, r, dur=0.6), t(F["payshells"]) - 0.1, 0.35)
for k in range(3): put(sfx, I.glock(m2f(D5 + k * 3), 0.4, r, dur=0.7), t(F["payshells"]) + 0.15 + k * 0.08, 0.25)

# ---- mix (identical rules to the Batu mix)
vbuf = np.zeros(N); i0 = int(VO / 30 * SR); vbuf[i0:i0 + len(voice)] = voice[: N - i0]
win = int(0.05 * SR); venv = np.sqrt(np.convolve(vbuf ** 2, np.ones(win) / win, mode="same"))
act = maximum_filter1d(np.clip(venv / (venv.max() * 0.12 + 1e-9), 0, 1), size=int(0.35 * SR))
act = np.convolve(act, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same"); duck = 1 - 0.85 * act
music_w = convolve_st(music, make_ir(1.3, 5))[:, :N] * 0.35 + music
mix = (np.vstack([vbuf, vbuf]) + music_w * duck * 0.19 + sfx * duck * 0.5)[:, : int(DUR * SR)]
def limit(x, ceil=0.89, rel=0.15):
    pk = maximum_filter1d(np.abs(x).max(axis=0), size=2 * int(0.002 * SR) + 1); want = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = np.empty_like(want); cur = 1.0; a = np.exp(-1 / (rel * SR))
    for i in range(len(want)): cur = want[i] if want[i] < cur else a * cur + (1 - a) * want[i]; g[i] = cur
    return x * g
for _ in range(3): mix = limit(norm_to(mix, -14.0, mode="integrated"))
write_wav(str(ROOT / "anim/public/zanzibar/mix.wav"), mix, bits=16)
print(f"mix {mix.shape[1] / SR:.1f}s LUFS {integrated(mix):.1f} peak {true_peak(mix):.2f}")
