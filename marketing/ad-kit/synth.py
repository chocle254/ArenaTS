"""Tiny sound-design toolkit for Arena ads (all sounds synthesised, no samples).

    s = Synth(duration_seconds, seed)
    s.add(s.boom(1.0))            # sub drop at 1 s
    s.write('out.wav')
"""
import wave
import numpy as np

SR = 44100


class Synth:
    def __init__(self, dur, seed=1):
        self.dur = dur
        self.n = int(SR * dur)
        self.t = np.arange(self.n) / SR
        self.rng = np.random.default_rng(seed)
        self.mix = np.zeros(self.n)

    # ---- helpers -------------------------------------------------------
    def env(self, t0, attack, decay):
        x = self.t - t0
        return np.where(x < 0, 0.0, np.where(x < attack, x / max(attack, 1e-4), np.exp(-(x - attack) / decay)))

    def filt(self, sig, cutoff, highpass=0.0):
        spec = np.fft.rfft(sig)
        f = np.fft.rfftfreq(len(sig), 1 / SR)
        g = 1 / (1 + (f / cutoff) ** 4)
        if highpass:
            g *= (f / highpass) ** 4 / (1 + (f / highpass) ** 4)
        return np.fft.irfft(spec * g, len(sig))

    @staticmethod
    def norm(x):
        return x / (np.max(np.abs(x)) + 1e-9)

    def noise(self, cutoff, highpass=0.0):
        return self.norm(self.filt(self.rng.standard_normal(self.n), cutoff, highpass))

    def add(self, sig):
        self.mix += sig

    # ---- sounds --------------------------------------------------------
    def boom(self, t0, s=1.0, low=28.0, high=110.0, decay=1.6):
        x = np.clip(self.t - t0, 0, None)
        freq = low + (high - low) * np.exp(-x * 9)
        return s * np.sin(2 * np.pi * np.cumsum(freq) / SR) * self.env(t0, 0.004, decay)

    def braam(self, t0, s=1.0, root=55.0, decay=2.4):
        x = np.clip(self.t - t0, 0, None)
        sig = np.zeros(self.n)
        for mult, amp in ((1.0, 1.0), (1.5, 0.6), (2.0, 0.55), (3.0, 0.25)):
            for det in (-0.6, 0.0, 0.7):
                f = root * mult + det
                sig += amp * (2 * ((f * x) % 1.0) - 1)
        sig = self.filt(sig * (x > 0), 900)
        return s * np.tanh(2.2 * sig / 6) * self.env(t0, 0.05, decay)

    def burst(self, t0, s, decay, cutoff, highpass=0.0, attack=0.002):
        return s * self.noise(cutoff, highpass) * self.env(t0, attack, decay)

    def whoosh(self, t_peak, s=0.45, length=0.35):
        return self.burst(t_peak - length, s, 0.12, 6000, 500, attack=length)

    def riser(self, t0, t1, s=0.5):
        x = (self.t - t0) / (t1 - t0)
        m = (x >= 0) & (x <= 1)
        tone = np.sin(2 * np.pi * np.cumsum(80 + 700 * np.clip(x, 0, 1) ** 2) / SR)
        return s * m * np.clip(x, 0, 1) ** 3 * (0.6 * self.noise(3000, 300) + 0.4 * tone)

    def shot(self, t0, s=1.0):
        """Sniper crack: sharp transient, sub drop, long tail."""
        return (self.burst(t0, 1.0 * s, 0.045, 12000, 1200) + self.boom(t0, 1.2 * s, 26, 150, 2.0)
                + self.burst(t0 + 0.04, 0.35 * s, 1.3, 1500, 150, attack=0.04))

    def scope_in(self, t0, s=0.35):
        """Quick mechanical 'clack' of a scope coming up."""
        return self.burst(t0, s, 0.03, 7000, 1800) + 0.6 * self.burst(t0 + 0.05, s, 0.02, 9000, 2500)

    def heartbeat(self, t0, t1, period=0.72, accel=0.86, s=0.9):
        sig, k, p = np.zeros(self.n), t0, period
        while k < t1:
            sig += self.boom(k, s, 40, 70, 0.12) + 0.7 * self.boom(k + 0.16, s, 40, 70, 0.12)
            k += p
            p = max(0.36, p * accel)
        return sig

    def tick(self, t0, s=0.18):
        x = np.clip(self.t - t0, 0, None)
        return s * np.sin(2 * np.pi * 2400 * x) * self.env(t0, 0.001, 0.012)

    def chime(self, t0, s=0.35):
        """Bright 'prize' sting."""
        x = np.clip(self.t - t0, 0, None)
        tone = sum(a * np.sin(2 * np.pi * f * x) for f, a in ((880, 1.0), (1320, 0.6), (1760, 0.35), (2640, 0.15)))
        return s * tone * self.env(t0, 0.005, 0.9)

    def bed(self, points):
        """Rumble bed (brown noise + 38 Hz) following [(time, level), ...]."""
        brown = np.cumsum(self.rng.standard_normal(self.n))
        brown = self.norm(self.filt(brown - np.convolve(brown, np.ones(4410) / 4410, mode='same'), 120, 20))
        times, levels = zip(*points)
        return (0.55 * brown + 0.35 * np.sin(2 * np.pi * 38 * self.t)) * np.interp(self.t, times, levels)

    # ---- master --------------------------------------------------------
    def master(self, fade_out=0.6, reverb=0.35):
        L = int(SR * 1.1)
        ir = self.rng.standard_normal(L) * np.exp(-np.arange(L) / (SR * 0.32))
        ir = self.filt(np.concatenate([ir, np.zeros(max(self.n - L, 0))]), 3500)[:L]
        ir /= np.sum(np.abs(ir))
        n2 = 2 * self.n
        wet = np.fft.irfft(np.fft.rfft(self.mix, n2) * np.fft.rfft(ir, n2), n2)[:self.n]
        wet *= np.max(np.abs(self.mix)) / (np.max(np.abs(wet)) + 1e-9)
        d = int(SR * 0.013)
        left = self.mix + reverb * wet
        right = self.mix + reverb * np.concatenate([np.zeros(d), wet[:-d]])
        fade = np.interp(self.t, [0, 0.02, self.dur - fade_out, self.dur], [0, 1, 1, 0])
        st = np.stack([left * fade, right * fade], axis=1)
        st = np.tanh(1.5 * st / (np.max(np.abs(st)) + 1e-9))
        return st * (10 ** (-1 / 20) / np.max(np.abs(st)))

    def write(self, path, **kw):
        st = self.master(**kw)
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((st * 32767).astype('<i2').tobytes())
