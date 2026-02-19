// Dark City: The Awakening - Main Entry
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    backgroundColor: '#0a0a14',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        BootScene,
        MenuScene,
        CutsceneScene,
        Level1Scene,
        Level2Scene,
        Level3Scene,
        HUDScene,
        PauseScene,
        GameOverScene,
        VictoryScene
    ]
};

const game = new Phaser.Game(config);
