class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.lastLevel = data.level || 'Level1Scene';
    }

    create() {
        // Stop HUD if running
        if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0000);

        // Red flash
        this.cameras.main.flash(500, 100, 0, 0);

        this.add.text(GAME_WIDTH / 2, 120, 'GAME OVER', {
            fontFamily: 'monospace', fontSize: '42px', color: '#ff4444',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 190, '"Sleep now..."', {
            fontFamily: 'monospace', fontSize: '16px', color: '#886666',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 240, `Score: ${this.finalScore}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#ffcc44',
        }).setOrigin(0.5);

        // Menu items
        const menuItems = [];

        const retryText = this.add.text(GAME_WIDTH / 2, 330, 'RETRY', {
            fontFamily: 'monospace', fontSize: '22px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: retryText, action: () => this.retry() });

        const menuText = this.add.text(GAME_WIDTH / 2, 380, 'MAIN MENU', {
            fontFamily: 'monospace', fontSize: '22px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: menuText, action: () => this.goToMenu() });

        this.selectedIndex = 0;
        this.menuItems = menuItems;
        this.updateSelection();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        menuItems.forEach((item, i) => {
            item.text.on('pointerover', () => { this.selectedIndex = i; this.updateSelection(); });
            item.text.on('pointerdown', () => { item.action(); });
        });

        // Death particles
        this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'particle_red', {
            x: { min: -200, max: 200 },
            y: { min: -100, max: 100 },
            lifespan: 3000,
            speed: 30,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.5, end: 0 },
            quantity: 1,
            frequency: 150,
        });
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateSelection();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            this.updateSelection();
        }
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.menuItems[this.selectedIndex].action();
        }
    }

    updateSelection() {
        this.menuItems.forEach((item, i) => {
            item.text.setColor(i === this.selectedIndex ? '#ff4444' : '#ccccdd');
            item.text.setScale(i === this.selectedIndex ? 1.1 : 1);
        });
    }

    retry() {
        const save = SaveManager.load();
        this.scene.start(this.lastLevel, save || {});
    }

    goToMenu() {
        this.scene.start('MenuScene');
    }
}
