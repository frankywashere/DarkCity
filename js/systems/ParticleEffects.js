class ParticleEffects {
    constructor(scene) {
        this.scene = scene;
    }

    hit(x, y) {
        this.burst(x, y, 'particle_white', 8, { speed: 150, lifespan: 300, scale: { start: 0.8, end: 0 } });
    }

    death(x, y) {
        this.burst(x, y, 'particle_red', 20, { speed: 200, lifespan: 800, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 } });
        this.burst(x, y, 'particle_dust', 10, { speed: 100, lifespan: 600, scale: { start: 0.6, end: 0 } });
    }

    dust(x, y) {
        this.burst(x, y, 'particle_dust', 5, {
            speed: 50,
            lifespan: 400,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            gravityY: -50
        });
    }

    attackSwing(x, y, facingRight) {
        const offsetX = facingRight ? 20 : -20;
        this.burst(x + offsetX, y, 'particle_white', 4, {
            speed: 80,
            lifespan: 200,
            scale: { start: 0.4, end: 0 },
            angle: facingRight ? { min: -30, max: 30 } : { min: 150, max: 210 }
        });
    }

    collect(x, y, particleKey) {
        this.burst(x, y, particleKey || 'particle_yellow', 12, {
            speed: 120,
            lifespan: 500,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: -100
        });
    }

    checkpointActivate(x, y) {
        this.burst(x, y, 'particle_blue', 15, {
            speed: 100,
            lifespan: 800,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            gravityY: -150
        });
    }

    tuningGlow(x, y) {
        this.burst(x, y, 'particle_blue', 3, {
            speed: 30,
            lifespan: 400,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            gravityY: -80
        });
    }

    midnightFlash(x, y) {
        this.burst(x, y, 'particle_blue', 30, {
            speed: 300,
            lifespan: 1000,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 }
        });
    }

    koExplosion(x, y) {
        // Big burst for enemy kill
        this.burst(x, y, 'particle_white', 15, {
            speed: 250,
            lifespan: 400,
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
        });
        this.burst(x, y, 'particle_blue', 8, {
            speed: 150,
            lifespan: 600,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.8, end: 0 },
            gravityY: -100,
        });
    }

    dodgeTrail(x, y) {
        this.burst(x, y, 'particle_blue', 4, {
            speed: 40,
            lifespan: 300,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.4, end: 0 },
        });
    }

    divekickImpact(x, y) {
        this.burst(x, y, 'particle_dust', 10, {
            speed: 180,
            lifespan: 400,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.8, end: 0 },
            angle: { min: -60, max: 240 },
        });
        this.burst(x, y, 'particle_white', 6, {
            speed: 100,
            lifespan: 300,
            scale: { start: 0.5, end: 0 },
        });
    }

    comboSpark(x, y, comboCount) {
        const count = Math.min(comboCount * 2, 12);
        this.burst(x, y, 'particle_yellow', count, {
            speed: 80 + comboCount * 20,
            lifespan: 300,
            scale: { start: 0.3 + comboCount * 0.1, end: 0 },
            alpha: { start: 0.9, end: 0 },
        });
    }

    burst(x, y, key, count, config = {}) {
        const emitter = this.scene.add.particles(x, y, key, {
            speed: config.speed || 100,
            lifespan: config.lifespan || 500,
            scale: config.scale || { start: 0.5, end: 0 },
            alpha: config.alpha || { start: 1, end: 0 },
            gravityY: config.gravityY || 0,
            angle: config.angle || { min: 0, max: 360 },
            emitting: false,
        });

        emitter.explode(count);

        // Auto-destroy after lifespan
        this.scene.time.delayedCall((config.lifespan || 500) + 100, () => {
            emitter.destroy();
        });
    }
}
