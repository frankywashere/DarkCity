class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.audioContext = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.currentMusic = null;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio not available');
        }
    }

    // Generate simple SFX using oscillators
    playSFX(type) {
        if (!this.audioContext) return;

        // Resume context if suspended (autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        switch (type) {
            case 'jump':
                this.playTone(440, 0.08, 'sine', now, 880);
                break;
            case 'punch':
                this.playNoise(0.05, now);
                this.playTone(150, 0.08, 'square', now);
                break;
            case 'kick':
                this.playNoise(0.08, now);
                this.playTone(100, 0.1, 'square', now);
                break;
            case 'sword':
                this.playTone(800, 0.06, 'sawtooth', now, 200);
                this.playNoise(0.04, now);
                break;
            case 'hit':
                this.playNoise(0.1, now);
                this.playTone(200, 0.1, 'square', now, 80);
                break;
            case 'tuning':
                this.playTone(330, 0.15, 'sine', now, 660);
                this.playTone(440, 0.15, 'sine', now, 880);
                break;
            case 'pickup':
                this.playTone(523, 0.08, 'sine', now);
                this.playTone(659, 0.08, 'sine', now + 0.08);
                this.playTone(784, 0.08, 'sine', now + 0.16);
                break;
            case 'death':
                this.playTone(200, 0.3, 'sawtooth', now, 50);
                break;
            case 'checkpoint':
                this.playTone(440, 0.1, 'sine', now);
                this.playTone(550, 0.1, 'sine', now + 0.1);
                this.playTone(660, 0.15, 'sine', now + 0.2);
                break;
            case 'boss_appear':
                this.playTone(100, 0.5, 'sawtooth', now, 50);
                this.playTone(120, 0.5, 'sawtooth', now + 0.1, 60);
                break;
        }
    }

    playTone(freq, duration, type, startTime, endFreq) {
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        if (endFreq) {
            osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
        }

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, startTime);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    playNoise(duration, startTime) {
        const ctx = this.audioContext;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.sfxVolume * 0.15, startTime);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        source.connect(gain);
        gain.connect(this.sfxGain);

        source.start(startTime);
    }

    // Simple ambient drone for atmosphere
    startAmbientDrone() {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        // Low drone
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 55;

        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 82.5;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0.05;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.musicGain);

        osc1.start();
        osc2.start();

        this.currentMusic = { osc1, osc2, gain };
    }

    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.osc1.stop();
                this.currentMusic.osc2.stop();
            } catch (e) {}
            this.currentMusic = null;
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.musicGain) this.musicGain.gain.value = vol;
    }

    setSFXVolume(vol) {
        this.sfxVolume = vol;
        if (this.sfxGain) this.sfxGain.gain.value = vol;
    }
}
