class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Background
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menu_bg');

        // Title
        this.add.text(GAME_WIDTH / 2, 100, 'DARK CITY', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#4488ff',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 155, 'THE AWAKENING', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#8888aa',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // Menu options
        const menuItems = [];
        const hasSave = SaveManager.hasSave();

        const newGameText = this.add.text(GAME_WIDTH / 2, 280, 'NEW GAME', {
            fontFamily: 'monospace', fontSize: '22px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: newGameText, action: () => this.startNewGame() });

        if (hasSave) {
            const continueText = this.add.text(GAME_WIDTH / 2, 330, 'CONTINUE', {
                fontFamily: 'monospace', fontSize: '22px', color: '#ccccdd',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            menuItems.push({ text: continueText, action: () => this.continueGame() });
        }

        const controlsText = this.add.text(GAME_WIDTH / 2, hasSave ? 380 : 330, 'CONTROLS', {
            fontFamily: 'monospace', fontSize: '22px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: controlsText, action: () => this.showControls() });

        // Menu selection
        this.selectedIndex = 0;
        this.menuItems = menuItems;
        this.updateSelection();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Mouse hover
        menuItems.forEach((item, i) => {
            item.text.on('pointerover', () => {
                this.selectedIndex = i;
                this.updateSelection();
            });
            item.text.on('pointerdown', () => {
                item.action();
            });
        });

        // Audio
        this.audioManager = new AudioManager(this);

        // Controls overlay (hidden)
        this.controlsOverlay = null;

        // Ambient particles
        this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT, 'particle_blue', {
            x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
            lifespan: 4000,
            speedY: { min: -30, max: -80 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.4, end: 0 },
            quantity: 1,
            frequency: 200,
        });

        // Credits
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Based on the 1998 film "Dark City"', {
            fontFamily: 'monospace', fontSize: '10px', color: '#555566',
        }).setOrigin(0.5);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateSelection();
            this.audioManager.playSFX('jump');
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            this.updateSelection();
            this.audioManager.playSFX('jump');
        }
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            if (this.controlsOverlay) {
                this.hideControls();
            } else {
                this.audioManager.playSFX('pickup');
                this.menuItems[this.selectedIndex].action();
            }
        }
    }

    updateSelection() {
        this.menuItems.forEach((item, i) => {
            if (i === this.selectedIndex) {
                item.text.setColor('#4488ff');
                item.text.setScale(1.1);
            } else {
                item.text.setColor('#ccccdd');
                item.text.setScale(1);
            }
        });
    }

    startNewGame() {
        SaveManager.clear();
        this.scene.start('CutsceneScene', {
            cutsceneKey: 'awakening',
            nextScene: 'Level1Scene',
            playerData: {}
        });
    }

    continueGame() {
        const save = SaveManager.load();
        if (save) {
            const levelMap = { 1: 'Level1Scene', 2: 'Level2Scene', 3: 'Level3Scene' };
            const sceneName = levelMap[save.level] || 'Level1Scene';
            this.scene.start(sceneName, save);
        }
    }

    showControls() {
        this.controlsOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.fillRect(-300, -200, 600, 400);
        bg.lineStyle(2, 0x4488ff, 0.7);
        bg.strokeRect(-300, -200, 600, 400);

        const title = this.add.text(0, -175, 'CONTROLS', {
            fontFamily: 'monospace', fontSize: '22px', color: '#4488ff'
        }).setOrigin(0.5);

        const controls = [
            'Arrow Keys    Move / Crouch',
            'Space / Up    Jump',
            'Shift         Run',
            'Z             Punch',
            'X             Kick',
            'C             Sword (Level 2+)',
            'A             Tuning Power (Level 2+)',
            'A + Direction Push/Pull objects',
            'A + Up (air)  Create platform (Level 3)',
            'Tap A         Deflect projectiles',
            'ESC           Pause',
        ];

        const controlText = this.add.text(0, 0, controls.join('\n'), {
            fontFamily: 'monospace', fontSize: '13px', color: '#aaaacc',
            lineSpacing: 6,
        }).setOrigin(0.5);

        const closeText = this.add.text(0, 170, 'Press ENTER to close', {
            fontFamily: 'monospace', fontSize: '12px', color: '#666688'
        }).setOrigin(0.5);

        this.controlsOverlay.add([bg, title, controlText, closeText]);
    }

    hideControls() {
        if (this.controlsOverlay) {
            this.controlsOverlay.destroy();
            this.controlsOverlay = null;
        }
    }
}
