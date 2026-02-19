class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    init(data) {
        this.parentScene = data.parentScene;
    }

    create() {
        // Semi-transparent overlay
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

        this.add.text(GAME_WIDTH / 2, 150, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '36px', color: '#4488ff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        const menuItems = [];

        const resumeText = this.add.text(GAME_WIDTH / 2, 280, 'RESUME', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: resumeText, action: () => this.resumeGame() });

        const mainMenuText = this.add.text(GAME_WIDTH / 2, 330, 'MAIN MENU', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ccccdd',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuItems.push({ text: mainMenuText, action: () => this.goToMenu() });

        this.selectedIndex = 0;
        this.menuItems = menuItems;
        this.updateSelection();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        menuItems.forEach((item, i) => {
            item.text.on('pointerover', () => { this.selectedIndex = i; this.updateSelection(); });
            item.text.on('pointerdown', () => { item.action(); });
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
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.resumeGame();
        }
    }

    updateSelection() {
        this.menuItems.forEach((item, i) => {
            item.text.setColor(i === this.selectedIndex ? '#4488ff' : '#ccccdd');
            item.text.setScale(i === this.selectedIndex ? 1.1 : 1);
        });
    }

    resumeGame() {
        this.scene.resume(this.parentScene);
        this.scene.stop();
    }

    goToMenu() {
        this.scene.stop(this.parentScene);
        this.scene.stop('HUDScene');
        this.scene.start('MenuScene');
    }
}
