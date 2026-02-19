class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.memoryFragments = data.memoryFragments || 0;
    }

    create() {
        // Start with black, fade to sunrise colors
        this.cameras.main.fadeIn(3000, 0, 0, 0);

        // Create Shell Beach sunrise background
        this.createSunriseBackground();

        // Victory text - appears after delay
        this.time.delayedCall(3000, () => {
            const titleText = this.add.text(GAME_WIDTH / 2, 80, 'SHELL BEACH', {
                fontFamily: 'monospace', fontSize: '42px', color: '#ffdd88',
                stroke: '#000000', strokeThickness: 4,
            }).setOrigin(0.5).setAlpha(0).setDepth(10);

            this.tweens.add({ targets: titleText, alpha: 1, duration: 2000 });
        });

        this.time.delayedCall(5000, () => {
            const subtitleText = this.add.text(GAME_WIDTH / 2, 130, '"You wanted to know what was at Shell Beach..."', {
                fontFamily: 'monospace', fontSize: '14px', color: '#ccaa66',
                fontStyle: 'italic',
            }).setOrigin(0.5).setAlpha(0).setDepth(10);

            this.tweens.add({ targets: subtitleText, alpha: 1, duration: 1500 });
        });

        // Score display
        this.time.delayedCall(7000, () => {
            const scorePanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20).setDepth(10);

            const bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRect(-200, -80, 400, 160);

            const scoreTitle = this.add.text(0, -60, 'FINAL SCORE', {
                fontFamily: 'monospace', fontSize: '18px', color: '#ffcc44',
            }).setOrigin(0.5);

            const scoreValue = this.add.text(0, -30, `${this.finalScore}`, {
                fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
            }).setOrigin(0.5);

            const memoriesText = this.add.text(0, 10, `Memory Fragments: ${this.memoryFragments}`, {
                fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc',
            }).setOrigin(0.5);

            const thanksText = this.add.text(0, 50, 'Thank you for playing', {
                fontFamily: 'monospace', fontSize: '12px', color: '#888899',
            }).setOrigin(0.5);

            scorePanel.add([bg, scoreTitle, scoreValue, memoriesText, thanksText]);
            scorePanel.setAlpha(0);
            this.tweens.add({ targets: scorePanel, alpha: 1, duration: 1500 });
        });

        // Credits
        this.time.delayedCall(10000, () => {
            const credits = [
                'DARK CITY: THE AWAKENING',
                '',
                'Based on the 1998 film',
                'directed by Alex Proyas',
                '',
                'A game by',
                'The Tuning Machine',
                '',
                '',
                'Press ENTER to return to menu',
            ];

            const creditsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, credits.join('\n'), {
                fontFamily: 'monospace', fontSize: '11px', color: '#888899',
                align: 'center', lineSpacing: 4,
            }).setOrigin(0.5, 1).setAlpha(0).setDepth(10);

            this.tweens.add({ targets: creditsText, alpha: 1, duration: 2000 });
        });

        // Input (after delay)
        this.canExit = false;
        this.time.delayedCall(8000, () => { this.canExit = true; });
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    createSunriseBackground() {
        // Sky gradient - dark to warm
        const gfx = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y++) {
            const t = y / GAME_HEIGHT;
            let r, g, b;
            if (t < 0.3) {
                // Upper sky - deep blue to orange
                const st = t / 0.3;
                r = Math.floor(20 + st * 200);
                g = Math.floor(20 + st * 120);
                b = Math.floor(60 + st * 20);
            } else if (t < 0.6) {
                // Horizon - warm golds
                const st = (t - 0.3) / 0.3;
                r = Math.floor(220 + st * 35);
                g = Math.floor(140 + st * 60);
                b = Math.floor(80 - st * 40);
            } else {
                // Ocean reflection
                const st = (t - 0.6) / 0.4;
                r = Math.floor(40 + (1 - st) * 80);
                g = Math.floor(80 + (1 - st) * 60);
                b = Math.floor(120 + (1 - st) * 40);
            }
            gfx.fillStyle((r << 16) | (g << 8) | b, 1);
            gfx.fillRect(0, y, GAME_WIDTH, 1);
        }

        // Sun
        const sun = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 40, 0xffdd66, 0.9);
        const sunGlow = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 80, 0xffaa44, 0.3);

        // Sun animation
        this.tweens.add({
            targets: [sun, sunGlow],
            y: GAME_HEIGHT * 0.3,
            duration: 20000,
            ease: 'Sine.easeOut',
        });

        // Ocean waves
        for (let y = GAME_HEIGHT * 0.6; y < GAME_HEIGHT; y += 3) {
            const waveAlpha = 0.05 + Math.random() * 0.1;
            gfx.fillStyle(0xffffff, waveAlpha);
            const waveX = Math.random() * GAME_WIDTH;
            gfx.fillRect(waveX, y, 30 + Math.random() * 50, 1);
        }

        // Pier silhouette
        gfx.fillStyle(0x332211, 0.8);
        gfx.fillRect(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.55, GAME_WIDTH * 0.4, 6);
        // Pier posts
        for (let x = GAME_WIDTH * 0.32; x < GAME_WIDTH * 0.68; x += 40) {
            gfx.fillRect(x, GAME_HEIGHT * 0.55, 4, GAME_HEIGHT * 0.15);
        }

        // Silhouette of Murdoch on pier
        gfx.fillStyle(0x111111, 0.9);
        // Body
        gfx.fillRect(GAME_WIDTH * 0.48, GAME_HEIGHT * 0.43, 12, 20);
        // Head
        gfx.fillCircle(GAME_WIDTH * 0.485, GAME_HEIGHT * 0.41, 6);
        // Coat
        gfx.fillTriangle(
            GAME_WIDTH * 0.475, GAME_HEIGHT * 0.55,
            GAME_WIDTH * 0.495, GAME_HEIGHT * 0.55,
            GAME_WIDTH * 0.485, GAME_HEIGHT * 0.46
        );

        // Light particles (like sun rays)
        this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'particle_yellow', {
            x: { min: -100, max: 100 },
            y: { min: -30, max: 30 },
            lifespan: 3000,
            speed: { min: 10, max: 40 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.5, end: 0 },
            quantity: 1,
            frequency: 200,
        }).setDepth(5);
    }

    update() {
        if (this.canExit && !this.transitioning && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.transitioning = true;
            this.cameras.main.fadeOut(1500, 0, 0, 0);
            this.time.delayedCall(1550, () => {
                this.scene.start('MenuScene');
            });
        }
    }
}
