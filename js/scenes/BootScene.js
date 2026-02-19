class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222233, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

        const loadingText = this.add.text(width / 2, height / 2 - 40, 'DARK CITY', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#4488ff',
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x4488ff, 1);
            progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
            percentText.setText(Math.round(value * 100) + '%');
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Silently handle missing files -- we fall back to placeholders
        this.load.on('loaderror', (fileObj) => {
            console.log('Asset not found (will use placeholder): ' + fileObj.key);
        });

        // Try to load real sprite sheets and assets first
        this.loadRealAssets();
    }

    loadRealAssets() {
        // Character sprite sheets (64x64 frames)
        const characterSheets = [
            'murdoch_sheet',
            'stranger_grunt_sheet',
            'mr_sleep_sheet',
            'mr_wall_sheet',
            'mr_hand_sheet',
            'mr_book_sheet',
        ];

        characterSheets.forEach((key) => {
            this.load.spritesheet(key, `assets/sprites/${key}.png`, {
                frameWidth: 64,
                frameHeight: 64,
            });
            this.load.json(key, `assets/sprites/${key}.json`);
        });

        // Tile images - map game texture keys to generated tile files
        // Level 1 uses default keys: ground, platform, wall
        this.load.image('ground', 'assets/tiles/city_ground.png');
        this.load.image('platform', 'assets/tiles/city_platform.png');
        this.load.image('wall', 'assets/tiles/city_wall.png');
        // Level 2 underground tiles
        this.load.image('ground_underground', 'assets/tiles/underground_ground.png');
        this.load.image('platform_underground', 'assets/tiles/underground_platform.png');
        this.load.image('wall_underground', 'assets/tiles/underground_wall.png');
        // Level 3 lair tiles
        this.load.image('ground_lair', 'assets/tiles/lair_ground.png');
        this.load.image('platform_lair', 'assets/tiles/lair_platform.png');
        this.load.image('wall_lair', 'assets/tiles/lair_wall.png');

        // Background images
        this.load.image('bg_city_far', 'assets/backgrounds/bg_city_far.png');
        this.load.image('bg_city_mid', 'assets/backgrounds/bg_city_mid.png');
        this.load.image('bg_underground', 'assets/backgrounds/bg_underground.png');
        this.load.image('bg_lair', 'assets/backgrounds/bg_lair.png');
        this.load.image('bg_boss_arena', 'assets/backgrounds/bg_boss_arena.png');
        this.load.image('bg_shell_beach', 'assets/backgrounds/bg_shell_beach.png');

        // UI elements
        this.load.image('menu_bg', 'assets/ui/menu_background.png');
        this.load.image('portrait_murdoch', 'assets/ui/portrait_murdoch.png');

        // Cutscene illustrations
        const cutsceneImages = [
            'cutscene_awakening_1', 'cutscene_awakening_2', 'cutscene_awakening_3',
            'cutscene_truth_1', 'cutscene_truth_2', 'cutscene_truth_3',
            'cutscene_injection_1', 'cutscene_injection_2', 'cutscene_injection_3',
        ];
        cutsceneImages.forEach((key) => {
            this.load.image(key, `assets/cutscenes/${key}.png`);
        });
    }

    create() {
        // After loading completes, generate placeholders for anything that
        // failed to load (missing files). This ensures the game always works.
        this.generatePlaceholderTextures();

        this.scene.start('MenuScene');
    }

    generatePlaceholderTextures() {
        // Player - Murdoch (dark coat, light skin)
        if (!this.textures.exists('murdoch')) {
            this.createCharacterTexture('murdoch', 28, 48, COLORS.MURDOCH_COAT, COLORS.MURDOCH_SKIN);
        }
        if (!this.textures.exists('murdoch_crouch')) {
            this.createCharacterTexture('murdoch_crouch', 28, 32, COLORS.MURDOCH_COAT, COLORS.MURDOCH_SKIN);
        }

        // Enemies
        if (!this.textures.exists('stranger_grunt')) {
            this.createCharacterTexture('stranger_grunt', 28, 48, COLORS.STRANGER_COAT, COLORS.STRANGER_SKIN);
        }
        if (!this.textures.exists('mr_sleep')) {
            this.createCharacterTexture('mr_sleep', 28, 48, 0x1a1a2a, COLORS.STRANGER_SKIN);
        }
        if (!this.textures.exists('mr_wall')) {
            this.createCharacterTexture('mr_wall', 36, 52, COLORS.STRANGER_COAT, COLORS.STRANGER_SKIN);
        }
        if (!this.textures.exists('mr_hand')) {
            this.createCharacterTexture('mr_hand', 28, 48, 0x222233, COLORS.STRANGER_SKIN);
        }
        if (!this.textures.exists('mr_book')) {
            this.createCharacterTexture('mr_book', 32, 52, 0x1a0a2a, COLORS.STRANGER_SKIN);
        }

        // Tiles
        if (!this.textures.exists('ground')) {
            this.createTileTexture('ground', COLORS.PLATFORM, 0x444455);
        }
        if (!this.textures.exists('platform')) {
            this.createTileTexture('platform', 0x444466, 0x333355);
        }
        if (!this.textures.exists('wall')) {
            this.createTileTexture('wall', 0x333344, 0x222233);
        }
        if (!this.textures.exists('hazard')) {
            this.createTileTexture('hazard', COLORS.HAZARD, 0xcc3333);
        }
        if (!this.textures.exists('breakable')) {
            this.createTileTexture('breakable', 0x665544, 0x554433);
        }
        if (!this.textures.exists('oneway')) {
            this.createTileTexture('oneway', 0x555577, 0x444466);
        }

        // Underground tiles
        if (!this.textures.exists('ground_underground')) {
            this.createTileTexture('ground_underground', 0x334433, 0x223322);
        }
        if (!this.textures.exists('platform_underground')) {
            this.createTileTexture('platform_underground', 0x335533, 0x224422);
        }
        if (!this.textures.exists('wall_underground')) {
            this.createTileTexture('wall_underground', 0x223322, 0x112211);
        }

        // Lair tiles
        if (!this.textures.exists('ground_lair')) {
            this.createTileTexture('ground_lair', 0x332244, 0x221133);
        }
        if (!this.textures.exists('platform_lair')) {
            this.createTileTexture('platform_lair', 0x443355, 0x332244);
        }
        if (!this.textures.exists('wall_lair')) {
            this.createTileTexture('wall_lair', 0x221133, 0x110022);
        }

        // Collectibles
        if (!this.textures.exists('health_pickup')) {
            this.createCollectibleTexture('health_pickup', COLORS.HEALTH_PICKUP);
        }
        if (!this.textures.exists('tuning_pickup')) {
            this.createCollectibleTexture('tuning_pickup', COLORS.TUNING_PICKUP);
        }
        if (!this.textures.exists('memory_fragment')) {
            this.createCollectibleTexture('memory_fragment', COLORS.MEMORY_FRAGMENT);
        }

        // Projectiles
        if (!this.textures.exists('tuning_bolt')) {
            this.createProjectileTexture('tuning_bolt', COLORS.TUNING_GLOW);
        }
        if (!this.textures.exists('enemy_projectile')) {
            this.createProjectileTexture('enemy_projectile', 0xff4466);
        }

        // Particles
        if (!this.textures.exists('particle_blue')) {
            this.createParticleTexture('particle_blue', 0x4488ff);
        }
        if (!this.textures.exists('particle_white')) {
            this.createParticleTexture('particle_white', 0xffffff);
        }
        if (!this.textures.exists('particle_yellow')) {
            this.createParticleTexture('particle_yellow', 0xffcc44);
        }
        if (!this.textures.exists('particle_red')) {
            this.createParticleTexture('particle_red', 0xff4444);
        }
        if (!this.textures.exists('particle_dust')) {
            this.createParticleTexture('particle_dust', 0x888888);
        }

        // Tuning platform
        if (!this.textures.exists('tuning_platform')) {
            const tpGfx = this.make.graphics({ x: 0, y: 0, add: false });
            tpGfx.fillStyle(0x4488ff, 0.6);
            tpGfx.fillRect(0, 0, 64, 12);
            tpGfx.lineStyle(1, 0x66aaff, 0.8);
            tpGfx.strokeRect(0, 0, 64, 12);
            tpGfx.generateTexture('tuning_platform', 64, 12);
        }

        // Crate (pushable)
        if (!this.textures.exists('crate')) {
            const crateGfx = this.make.graphics({ x: 0, y: 0, add: false });
            crateGfx.fillStyle(0x886644, 1);
            crateGfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
            crateGfx.lineStyle(2, 0x664422, 1);
            crateGfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
            crateGfx.lineBetween(0, 0, TILE_SIZE, TILE_SIZE);
            crateGfx.lineBetween(TILE_SIZE, 0, 0, TILE_SIZE);
            crateGfx.generateTexture('crate', TILE_SIZE, TILE_SIZE);
        }

        // Checkpoint
        if (!this.textures.exists('checkpoint')) {
            const cpGfx = this.make.graphics({ x: 0, y: 0, add: false });
            cpGfx.fillStyle(0x44aaff, 0.7);
            cpGfx.fillRect(2, 0, 4, 48);
            cpGfx.fillStyle(0x88ccff, 0.9);
            cpGfx.fillTriangle(6, 0, 6, 16, 20, 8);
            cpGfx.generateTexture('checkpoint', 22, 48);
        }

        // Door / Level exit
        if (!this.textures.exists('door')) {
            const doorGfx = this.make.graphics({ x: 0, y: 0, add: false });
            doorGfx.fillStyle(0x886644, 1);
            doorGfx.fillRect(0, 0, 32, 56);
            doorGfx.fillStyle(0xffcc44, 1);
            doorGfx.fillRect(4, 4, 24, 48);
            doorGfx.fillStyle(0x886644, 1);
            doorGfx.fillCircle(24, 28, 3);
            doorGfx.generateTexture('door', 32, 56);
        }

        // Background layers - simple gradient rects
        if (!this.textures.exists('bg_city_far')) {
            this.createBgTexture('bg_city_far', 0x0a0a1a, 0x111128, 960, 540);
        }
        if (!this.textures.exists('bg_city_mid')) {
            this.createBgTexture('bg_city_mid', 0x0f0f22, 0x161633, 960, 540);
        }
        if (!this.textures.exists('bg_underground')) {
            this.createBgTexture('bg_underground', 0x0a1a0a, 0x112211, 960, 540);
        }
        if (!this.textures.exists('bg_lair')) {
            this.createBgTexture('bg_lair', 0x110022, 0x220044, 960, 540);
        }
        if (!this.textures.exists('bg_boss_arena')) {
            this.createBgTexture('bg_boss_arena', 0x1a0a2a, 0x2a1144, 960, 540);
        }

        // Cutscene illustration placeholders
        const cutsceneKeys = [
            'cutscene_awakening_1', 'cutscene_awakening_2', 'cutscene_awakening_3',
            'cutscene_truth_1', 'cutscene_truth_2', 'cutscene_truth_3',
            'cutscene_injection_1', 'cutscene_injection_2', 'cutscene_injection_3',
        ];
        cutsceneKeys.forEach((key) => {
            if (!this.textures.exists(key)) {
                const csGfx = this.make.graphics({ x: 0, y: 0, add: false });
                csGfx.fillStyle(0x111122, 1);
                csGfx.fillRect(0, 0, 400, 225);
                csGfx.lineStyle(2, 0x4488ff, 0.5);
                csGfx.strokeRect(0, 0, 400, 225);
                csGfx.fillStyle(0x4488ff, 0.3);
                csGfx.fillRect(180, 100, 40, 25);
                csGfx.generateTexture(key, 400, 225);
            }
        });

        // UI elements
        this.createUITextures();

        // Vignette overlay
        if (!this.textures.exists('vignette')) {
            const vigGfx = this.make.graphics({ x: 0, y: 0, add: false });
            vigGfx.fillStyle(0x000000, 0);
            vigGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            // Dark edges
            for (let i = 0; i < 60; i++) {
                const alpha = (60 - i) / 120;
                vigGfx.fillStyle(0x000000, alpha);
                vigGfx.fillRect(0, i, GAME_WIDTH, 1);
                vigGfx.fillRect(0, GAME_HEIGHT - i - 1, GAME_WIDTH, 1);
                vigGfx.fillRect(i, 0, 1, GAME_HEIGHT);
                vigGfx.fillRect(GAME_WIDTH - i - 1, 0, 1, GAME_HEIGHT);
            }
            vigGfx.generateTexture('vignette', GAME_WIDTH, GAME_HEIGHT);
        }
    }

    createCharacterTexture(key, w, h, bodyColor, headColor) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        // Body
        gfx.fillStyle(bodyColor, 1);
        gfx.fillRect(2, h * 0.25, w - 4, h * 0.75);
        // Head
        gfx.fillStyle(headColor, 1);
        gfx.fillRect(w * 0.2, 0, w * 0.6, h * 0.3);
        // Eyes
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(w * 0.3, h * 0.1, 3, 3);
        gfx.fillRect(w * 0.6, h * 0.1, 3, 3);
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(w * 0.32, h * 0.12, 2, 2);
        gfx.fillRect(w * 0.62, h * 0.12, 2, 2);
        gfx.generateTexture(key, w, h);
    }

    createTileTexture(key, fillColor, borderColor) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        if (key === 'hazard') {
            // Spike hazard instead of solid red block
            gfx.fillStyle(0x331111, 1);
            gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
            // Draw spikes
            gfx.fillStyle(fillColor, 1);
            const spikeW = 8;
            for (let sx = 0; sx < TILE_SIZE; sx += spikeW) {
                gfx.fillTriangle(sx, TILE_SIZE, sx + spikeW / 2, 4, sx + spikeW, TILE_SIZE);
            }
            // Warning stripes at base
            gfx.fillStyle(0xffcc00, 0.6);
            gfx.fillRect(0, TILE_SIZE - 4, TILE_SIZE, 4);
            gfx.fillStyle(0x000000, 0.8);
            for (let sx = 0; sx < TILE_SIZE; sx += 8) {
                gfx.fillRect(sx, TILE_SIZE - 4, 4, 4);
            }
        } else {
            gfx.fillStyle(fillColor, 1);
            gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.lineStyle(1, borderColor, 1);
            gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
            // Texture detail
            gfx.fillStyle(borderColor, 0.3);
            gfx.fillRect(4, 4, 8, 8);
            gfx.fillRect(18, 18, 8, 8);
        }

        gfx.generateTexture(key, TILE_SIZE, TILE_SIZE);
    }

    createCollectibleTexture(key, color) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(color, 1);
        gfx.fillCircle(8, 8, 7);
        gfx.lineStyle(1, 0xffffff, 0.4);
        gfx.strokeCircle(8, 8, 7);

        if (key === 'health_pickup') {
            // White cross
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillRect(6, 4, 4, 8);  // vertical bar
            gfx.fillRect(4, 6, 8, 4);  // horizontal bar
        } else if (key === 'tuning_pickup') {
            // Lightning bolt
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillTriangle(9, 3, 6, 8, 9, 8);
            gfx.fillTriangle(7, 8, 10, 8, 7, 13);
        } else if (key === 'memory_fragment') {
            // Star shape
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillTriangle(8, 3, 6, 10, 13, 6);
            gfx.fillTriangle(8, 13, 3, 6, 10, 10);
        }

        // Highlight
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillCircle(6, 6, 2);
        gfx.generateTexture(key, 16, 16);
    }

    createProjectileTexture(key, color) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(color, 1);
        gfx.fillCircle(6, 6, 5);
        gfx.fillStyle(0xffffff, 0.5);
        gfx.fillCircle(5, 5, 2);
        gfx.generateTexture(key, 12, 12);
    }

    createParticleTexture(key, color) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(color, 1);
        gfx.fillCircle(3, 3, 3);
        gfx.generateTexture(key, 6, 6);
    }

    createBgTexture(key, topColor, bottomColor, w, h) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        // Simple gradient using horizontal bars
        const topR = (topColor >> 16) & 0xff;
        const topG = (topColor >> 8) & 0xff;
        const topB = topColor & 0xff;
        const botR = (bottomColor >> 16) & 0xff;
        const botG = (bottomColor >> 8) & 0xff;
        const botB = bottomColor & 0xff;

        for (let y = 0; y < h; y++) {
            const t = y / h;
            const r = Math.floor(topR + (botR - topR) * t);
            const g = Math.floor(topG + (botG - topG) * t);
            const b = Math.floor(topB + (botB - topB) * t);
            gfx.fillStyle((r << 16) | (g << 8) | b, 1);
            gfx.fillRect(0, y, w, 1);
        }

        // Add building silhouettes for city backgrounds
        if (key.includes('city')) {
            gfx.fillStyle(0x000000, 0.4);
            for (let x = 0; x < w; x += 60 + Math.floor(Math.sin(x) * 20)) {
                const bw = 30 + Math.floor(Math.abs(Math.sin(x * 0.1)) * 40);
                const bh = 80 + Math.floor(Math.abs(Math.cos(x * 0.07)) * 120);
                gfx.fillRect(x, h - bh, bw, bh);
                // Windows
                gfx.fillStyle(0xffaa44, 0.2);
                for (let wy = h - bh + 10; wy < h - 10; wy += 15) {
                    for (let wx = x + 5; wx < x + bw - 5; wx += 10) {
                        if (Math.random() > 0.4) {
                            gfx.fillRect(wx, wy, 4, 6);
                        }
                    }
                }
                gfx.fillStyle(0x000000, 0.4);
            }
        }
        gfx.generateTexture(key, w, h);
    }

    createUITextures() {
        // HP bar background
        if (!this.textures.exists('hp_bar_bg')) {
            const hpBg = this.make.graphics({ x: 0, y: 0, add: false });
            hpBg.fillStyle(0x000000, 0.7);
            hpBg.fillRect(0, 0, 204, 18);
            hpBg.lineStyle(1, 0x666666, 1);
            hpBg.strokeRect(0, 0, 204, 18);
            hpBg.generateTexture('hp_bar_bg', 204, 18);
        }

        // HP bar fill
        if (!this.textures.exists('hp_bar_fill')) {
            const hpFill = this.make.graphics({ x: 0, y: 0, add: false });
            hpFill.fillStyle(COLORS.HEALTH_BAR, 1);
            hpFill.fillRect(0, 0, 200, 14);
            hpFill.generateTexture('hp_bar_fill', 200, 14);
        }

        // Tuning bar fill
        if (!this.textures.exists('tuning_bar_fill')) {
            const tunFill = this.make.graphics({ x: 0, y: 0, add: false });
            tunFill.fillStyle(COLORS.TUNING_BAR, 1);
            tunFill.fillRect(0, 0, 200, 14);
            tunFill.generateTexture('tuning_bar_fill', 200, 14);
        }

        // Portrait frame
        if (!this.textures.exists('portrait_murdoch')) {
            const pFrame = this.make.graphics({ x: 0, y: 0, add: false });
            pFrame.fillStyle(0x222233, 1);
            pFrame.fillRect(0, 0, 48, 48);
            pFrame.fillStyle(COLORS.MURDOCH_SKIN, 1);
            pFrame.fillRect(4, 4, 40, 40);
            pFrame.fillStyle(COLORS.MURDOCH_COAT, 1);
            pFrame.fillRect(4, 28, 40, 16);
            pFrame.lineStyle(2, 0x4488ff, 1);
            pFrame.strokeRect(0, 0, 48, 48);
            pFrame.generateTexture('portrait_murdoch', 48, 48);
        }

        // Dialogue box
        if (!this.textures.exists('dialogue_box')) {
            const dBox = this.make.graphics({ x: 0, y: 0, add: false });
            dBox.fillStyle(0x000000, 0.85);
            dBox.fillRect(0, 0, 800, 120);
            dBox.lineStyle(2, 0x4488ff, 0.7);
            dBox.strokeRect(0, 0, 800, 120);
            dBox.generateTexture('dialogue_box', 800, 120);
        }

        // Menu background
        if (!this.textures.exists('menu_bg')) {
            const menuBg = this.make.graphics({ x: 0, y: 0, add: false });
            for (let y = 0; y < GAME_HEIGHT; y++) {
                const t = y / GAME_HEIGHT;
                const r = Math.floor(10 + t * 15);
                const g = Math.floor(10 + t * 10);
                const b = Math.floor(20 + t * 30);
                menuBg.fillStyle((r << 16) | (g << 8) | b, 1);
                menuBg.fillRect(0, y, GAME_WIDTH, 1);
            }
            menuBg.generateTexture('menu_bg', GAME_WIDTH, GAME_HEIGHT);
        }
    }
}
