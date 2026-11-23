"""Original score + sound effects for the Batu short, mixed with the narration.
Uses the MIT-licensed DSP/instrument kit by mromidev (dsp.py, instruments.py, sfx_gen.py; see LICENSE-mromidev).
Output: anim/public/batu/mix.wav (48 kHz stereo, aligned to composition frame 0).
Times are composition frames (30 fps) taken from anim/src/videos/batu/Batu.tsx (VO = 12).
"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from dsp import SR, rng, lp, hp, bp, colored, fades, pan, read_wav, write_wav, norm_to, true_peak, integrated, make_ir, convolve_st
import instruments as I
import sfx_gen as S

ROOT = Path(__file__).resolve().parents[2]
VO = 12
F = dict(nap=12, hit=29, fear=59, winter1=75, seven=101, mongols=142, purpose=197, year=223, empire=267, caspian=344, genghis=381, batu=423, west=452,
         tens=469, ahead=524, rus=545, notOne=571, patch=602, quarrel=617, forests=656, swamps=674, noRoads=692, drown=746, butWinter=774, freeze=802,
         flat=825, city=886, dec=895, ryazan=925, kolomna=977, moscow=993, vladimir=1034, never=1057, fell=1105, wait=1147, novgorod=1178, youSee=1217,
         march=1280, thaw=1297, swamp=1363, hundred=1386, novg2=1419, batu2=1442, back=1458, tribute=1477, sacked=1547, so=1577, genius=1598, weather=1641)
t = lambda f: f / 30.0
r = rng(7)

voice, vsr = read_wav(str(ROOT / "anim/public/batu/voice.wav"))
voice = np.asarray(voice, dtype=np.float64)
if voice.ndim > 1: voice = voice.mean(axis=0) if voice.shape[0] <= 2 else voice.mean(axis=1)
if vsr != SR:
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(SR, vsr); voice = resample_poly(voice, SR // g, vsr // g)
DUR = (VO + len(voice) / SR * 30 + 75) / 30
N = int(DUR * SR) + SR
music = np.zeros((2, N)); sfx = np.zeros((2, N))


def put(buf, x, sec, gain=1.0, p=0.0):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = pan(x, p)
    i = int(sec * SR); a, b = max(0, i), min(N, i + x.shape[1])
    if b > a: buf[:, a:b] += gain * x[:, a - i:b - i]


def m2f(m): return 440.0 * 2 ** ((m - 69) / 12)
D2, A2, D3, F3, G3, A3, C4, D4, F4, G4, A4, C5, D5 = (38, 45, 50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74)
BEAT = 60 / 96

# ------------------------------------------------------------------ score
def drone(s0, s1, notes=(D2, A2), vel=0.45, warm=700):
    d = s1 - s0
    if d > 0.3: put(music, I.pad([m2f(n) for n in notes], d, vel, r, att=min(1.2, d / 3), rel=min(1.5, d / 3), warm=warm), s0)

def drums(s0, s1, dens=1.0, vel=0.7):
    k, s = 0, s0
    while s < s1:
        put(music, I.timpani(m2f(D2), vel * (1.0 if k % 4 == 0 else 0.7), r, dur=1.4), s, 0.9)
        if dens > 0.5 and k % 2 == 1: put(music, I.timpani(m2f(A2), vel * 0.55, r, dur=1.0), s + BEAT * 0.5, 0.7, 0.2)
        if dens > 0.8: put(music, I.snare(vel * 0.35, r, dur=0.2, snappy=0.6), s + BEAT * 0.75, 0.5, -0.2)
        s += BEAT; k += 1

def ostinato(s0, s1, notes=(D3, F3, G3, A3, C4, A3, G3, F3), vel=0.55, step=0.5):
    k, s = 0, s0
    while s < s1:
        put(music, I.pluck(m2f(notes[k % len(notes)]), vel, r, dur=0.9, bright=0.45), s, 0.8, 0.25 * np.sin(k))
        s += BEAT * step; k += 1

def glock_arp(s0, s1, notes=(D5, A4, F4, C5, G4, D5), vel=0.4):
    k, s = 0, s0
    while s < s1:
        put(music, I.glock(m2f(notes[k % len(notes)]), vel, r, dur=1.6), s, 0.5, 0.4 * np.sin(k * 1.7))
        s += BEAT * 0.5; k += 1

drone(0, t(F["seven"]), vel=0.5)
drone(t(F["mongols"]), t(F["wait"]) - 0.1, vel=0.4)
ostinato(t(F["mongols"]), t(F["empire"]))
drums(t(F["empire"]), t(F["ahead"]), dens=1.0, vel=0.75)
ostinato(t(F["empire"]), t(F["ahead"]), notes=(D3, A3, C4, D4, C4, A3, G3, A3))
ostinato(t(F["rus"]), t(F["forests"]), notes=(A3, G3, F3, D3, F3, G3), vel=0.45, step=1)
drone(t(F["forests"]), t(F["butWinter"]), notes=(D2, F3), vel=0.35, warm=500)
glock_arp(t(F["freeze"]), t(F["dec"]))
drums(t(F["dec"]), t(F["never"]), dens=1.0, vel=0.8)
ostinato(t(F["dec"]), t(F["never"]), notes=(D3, F3, A3, D4, C4, A3, F3, G3))
drone(t(F["never"]), t(F["wait"]), notes=(D2, A2, F3), vel=0.4)
drone(t(F["novgorod"]), t(F["hundred"]), notes=(A2, D3, F3), vel=0.35, warm=1100)
glock_arp(t(F["youSee"]), t(F["youSee"]) + 2.0, notes=(A4, D5, F4, A4), vel=0.35)
drums(t(F["hundred"]), t(F["tribute"]), dens=0.6, vel=0.65)
drone(t(F["tribute"]), DUR - 0.5, notes=(D2, A2, D3), vel=0.3)
drums(t(F["so"]), t(F["weather"]) + 0.3, dens=0.4, vel=0.5)
# accent hits land ~0.2 s before their word (in the breath), short and soft so they never sit on a syllable
for f0 in (F["year"], F["sacked"], F["genius"], F["weather"]):
    put(music, I.timpani(m2f(D2), 0.9, r, dur=1.2), t(f0) - 0.22, 0.55)
    put(music, I.cymbal(0.4, r, dur=1.0, bright=0.6), t(f0) - 0.22, 0.18)

# ------------------------------------------------------------------ effects
def hooves(s0, s1, gain=0.5):
    s = s0
    while s < s1:
        for k, dt in enumerate((0.0, 0.09, 0.17)):
            h = lp(colored(int(0.06 * SR), r, slope=-1.0), 900) * np.exp(-np.linspace(0, 9, int(0.06 * SR)))
            put(sfx, h, s + dt, gain * (1.0 if k == 0 else 0.7), -0.3 + 0.3 * k)
        s += 0.42

def fire(sec, dur=1.6, gain=0.6):
    n = int(dur * SR); env = np.minimum(1, np.linspace(0, 6, n)) * np.exp(-np.linspace(0, 2.5, n))
    roar = lp(colored(n, r, slope=-0.5), 1500) * env
    crack = np.zeros(n)
    for k in range(int(dur * 18)):
        i = int(r.uniform(0, n - 400)); crack[i:i + 200] += r.uniform(0.2, 1.0) * np.exp(-np.linspace(0, 8, 200)) * r.standard_normal(200)
    put(sfx, roar + hp(crack, 2500) * 0.5, sec, gain)
    put(sfx, S.whoosh(0.5, r, peak=0.2, f_lo=200, f_hi=1200), sec - 0.15, gain * 0.8)

def ice(sec, gain=0.5):
    n = int(0.9 * SR); x = np.zeros(n)
    for k in range(14):
        i = int(r.uniform(0, n - 600)); x[i:i + 500] += r.uniform(0.3, 1.0) * np.exp(-np.linspace(0, 10, 500)) * r.standard_normal(500)
    put(sfx, hp(x, 3000) + 0.4 * hp(S.wood_crack(r)[:n], 1800), sec, gain)
    put(sfx, I.glock(m2f(D5 + 12), 0.4, r, dur=1.2), sec, gain * 0.5, 0.3)

def rewind(s0, s1):
    n = int((s1 - s0) * SR); tt = np.linspace(0, s1 - s0, n)
    f = 300 + 1800 * (tt / (s1 - s0)) ** 1.5
    sweep = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.minimum(1, tt * 4) * np.minimum(1, (s1 - s0 - tt) * 6)
    put(sfx, sweep + 0.3 * S.whoosh(s1 - s0, r, peak=0.8)[:n], s0, 0.7)

# Sparse on purpose (owner: "too many sounds, they cover the voice"): only the key beats, quiet, and the whole
# effects bus is ducked under speech like the music.
for f0 in (F["nap"], F["hit"]): put(sfx, S.whoosh(1.0, r, peak=0.5, f_lo=250, f_hi=1500), t(f0), 0.3, -0.3)
ice(t(F["fear"]) + 0.2, 0.3)
rewind(t(F["seven"]) - 0.05, t(F["mongols"]) - 0.1)
put(sfx, S.whoosh(1.2, r, peak=0.6, f_lo=150, f_hi=900), t(F["empire"]), 0.35)
hooves(t(F["tens"]) - 0.3, t(F["ahead"]) + 0.4, 0.18)
ice(t(F["freeze"]), 0.3)
for f0 in (F["ryazan"], F["moscow"], F["vladimir"]): fire(t(f0), dur=1.0, gain=0.22)
put(sfx, I.glock(m2f(A4), 0.6, r), t(F["youSee"]), 0.35)
put(sfx, S.water_bed(3.0, r), t(F["thaw"]), 0.1)
put(sfx, I.timpani(m2f(D2), 1.0, r, dur=1.6), t(F["back"] - 6), 0.5)

# ------------------------------------------------------------------ mix
vbuf = np.zeros(N); i0 = int(VO / 30 * SR); vbuf[i0:i0 + len(voice)] = voice[: N - i0]
win = int(0.05 * SR); venv = np.sqrt(np.convolve(vbuf ** 2, np.ones(win) / win, mode="same"))
# speech activity 0..1, held through short word gaps so the bed doesn't pump between words
act = np.clip(venv / (venv.max() * 0.12 + 1e-9), 0, 1)
from scipy.ndimage import maximum_filter1d
act = maximum_filter1d(act, size=int(0.35 * SR))
act = np.convolve(act, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
duck = 1 - 0.85 * act                                                   # ~-16 dB under speech, full level in pauses
ir = make_ir(1.4, 3)
music_w = convolve_st(music, ir)[:, :N] * 0.35 + music
mix = np.vstack([vbuf, vbuf]) * 1.0 + music_w * duck * 0.19 + sfx * duck * 0.5
mix = mix[:, : int(DUR * SR)]
def limit(x, ceil=0.89, att=0.002, rel=0.15):
    """look-ahead peak limiter: gain follows the inverse of the smoothed peak envelope"""
    pk = np.abs(x).max(axis=0); la = int(att * SR)
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(pk, size=2 * la + 1)
    want = np.minimum(1.0, ceil / np.maximum(pk, 1e-9)); g = np.empty_like(want); cur = 1.0; a = np.exp(-1 / (rel * SR))
    for i in range(len(want)):                       # instant attack, smooth release
        cur = want[i] if want[i] < cur else a * cur + (1 - a) * want[i]; g[i] = cur
    return x * g

for _ in range(3):                                   # normalise -> limit -> renormalise
    mix = norm_to(mix, -14.0, mode="integrated"); mix = limit(mix)
out = ROOT / "anim/public/batu/mix.wav"
write_wav(str(out), mix, bits=16)
print(f"mix {mix.shape[1] / SR:.1f}s  LUFS {integrated(mix):.1f}  peak {true_peak(mix):.2f} -> {out}")
