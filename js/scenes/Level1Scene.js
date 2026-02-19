class Level1Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Level1Scene' });
    }

    init(data) {
        this.levelData = LEVEL1_DATA;
        this.playerData = data || {};
    }

    create() {
        const ld = this.levelData;
        const worldWidth = ld.width * ld.tileWidth;
        const worldHeight = ld.height * ld.tileHeight;

        // World bounds
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Parallax backgrounds
        this.bgFar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ld.background)
            .setOrigin(0, 0).setScrollFactor(0);
        this.bgMid = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ld.backgroundMid)
            .setOrigin(0, 0).setScrollFactor(0);

        // Create tile groups
        this.groundGroup = this.physics.add.staticGroup();
        this.platformGroup = this.physics.add.staticGroup();
        this.wallGroup = this.physics.add.staticGroup();
        this.hazardGroup = this.physics.add.staticGroup();
        this.breakableGroup = this.physics.add.staticGroup();
        this.onewayGroup = this.physics.add.staticGroup();

        // Build tilemap from data
        this.buildTilemap(ld);

        // Add atmospheric elements
        this.addAtmosphere(worldWidth, worldHeight);

        // Create player
        this.player = new Player(this, ld.playerSpawn.x, ld.playerSpawn.y);

        // Restore player state if continuing
        if (this.playerData.hp) this.player.hp = this.playerData.hp;
        if (this.playerData.lives) this.player.lives = this.playerData.lives;
        if (this.playerData.score) this.player.score = this.playerData.score;

        // Create enemies
        this.enemies = this.add.group();
        this.createEnemies(ld);

        // Create collectibles
        this.collectibles = this.add.group();
        this.createCollectibles(ld);

        // Create checkpoints
        this.checkpoints = [];
        this.createCheckpoints(ld);

        // Systems
        this.combatSystem = new CombatSystem(this);
        this.collisionHandler = new CollisionHandler(this);

        // Midnight tuning
        this.midnightTriggered = {};
        this.midnightTuning = new MidnightTuning(this);

        // Particle effects
        this.particleEffects = new ParticleEffects(this);

        // Camera effects
        this.cameraEffects = new CameraEffects(this);

        // Audio
        this.audioManager = new AudioManager(this);
        this.audioManager.startAmbientDrone();

        // Camera follow
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(100, 50);

        // Vignette overlay (fixed to camera)
        this.vignette = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
            .setScrollFactor(0).setDepth(100).setAlpha(0.5);

        // Launch HUD
        this.scene.launch('HUDScene', {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            tuning: this.player.tuningEnergy,
            maxTuning: this.player.maxTuning,
            lives: this.player.lives,
            score: this.player.score,
            level: 'Level 1: The Awakening',
            hasTuning: this.player.hasTuning,
        });

        // Boss state
        this.bossActive = false;
        this.bossDefeated = false;
        this.boss = null;

        // Level exit
        this.exitDoor = null;

        // Controls hint (first play)
        const controlsHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40,
            'Arrow keys: Move | Space: Jump | Z: Punch | X: Kick',
            { fontFamily: 'monospace', fontSize: '13px', color: '#aaaacc', backgroundColor: '#00000088', padding: { x: 10, y: 5 } }
        ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(101).setAlpha(1);

        this.tweens.add({
            targets: controlsHint,
            alpha: 0,
            delay: 4000,
            duration: 1000,
            onComplete: () => controlsHint.destroy(),
        });

        // Event listeners
        this.setupEvents();
    }

    buildTilemap(ld) {
        const tileTextures = {
            1: 'ground',
            2: 'platform',
            3: 'wall',
            4: 'hazard',
            5: 'breakable',
            6: 'oneway',
        };

        const tileGroups = {
            1: this.groundGroup,
            2: this.platformGroup,
            3: this.wallGroup,
            4: this.hazardGroup,
            5: this.breakableGroup,
            6: this.onewayGroup,
        };

        for (let row = 0; row < ld.tiles.length; row++) {
            for (let col = 0; col < ld.tiles[row].length; col++) {
                const tileType = ld.tiles[row][col];
                if (tileType === 0) continue;

                const x = col * ld.tileWidth + ld.tileWidth / 2;
                const y = row * ld.tileHeight + ld.tileHeight / 2;
                const texture = tileTextures[tileType];
                const group = tileGroups[tileType];

                if (texture && group) {
                    group.create(x, y, texture);
                }
            }
        }
    }

    addAtmosphere(worldWidth, worldHeight) {
        // Lampposts - glow below ground tiles with additive blending
        for (let x = 200; x < worldWidth; x += 300 + Math.floor(Math.random() * 200)) {
            const lampGlow = this.add.circle(x, worldHeight - 120, 40, COLORS.LAMP_LIGHT, 0.12);
            lampGlow.setDepth(1);
            lampGlow.setBlendMode(Phaser.BlendModes.ADD);
        }

        // Rain particles
        this.rainEmitter = this.add.particles(0, 0, 'particle_white', {
            x: { min: 0, max: worldWidth },
            y: -10,
            lifespan: 1500,
            speedY: { min: 200, max: 400 },
            speedX: { min: -20, max: -50 },
            scale: { start: 0.3, end: 0.1 },
            alpha: { start: 0.4, end: 0 },
            quantity: 3,
            frequency: 50,
        });
        this.rainEmitter.setDepth(90);
    }

    createEnemies(ld) {
        ld.enemies.forEach(e => {
            let enemy;
            switch (e.type) {
                case 'grunt':
                    enemy = new StrangerGrunt(this, e.x, e.y, e.patrolMin, e.patrolMax);
                    break;
            }
            if (enemy) {
                this.enemies.add(enemy);
            }
        });
    }

    createCollectibles(ld) {
        ld.collectibles.forEach(c => {
            const collectible = new Collectible(this, c.x, c.y, c.type);
            this.collectibles.add(collectible);
        });
    }

    createCheckpoints(ld) {
        ld.checkpoints.forEach(cp => {
            const checkpoint = this.physics.add.staticImage(cp.x, cp.y, 'checkpoint');
            checkpoint.activated = false;
            this.checkpoints.push(checkpoint);

            this.physics.add.overlap(this.player, checkpoint, () => {
                if (!checkpoint.activated) {
                    checkpoint.activated = true;
                    checkpoint.setTint(0x44ff44);
                    this.player.setCheckpoint(cp.x, cp.y);
                    this.particleEffects.checkpointActivate(cp.x, cp.y);
                    this.events.emit('checkpointActivated');
                }
            });
        });
    }

    setupEvents() {
        // Player events
        this.events.on('playerHurt', (hp, maxHp) => {
            this.cameraEffects.shake(200, 0.005);
            this.particleEffects.hit(this.player.x, this.player.y);
            this.scene.get('HUDScene').updateHP(hp, maxHp);
            this.audioManager.playSFX('hit');
        });

        this.events.on('playerHeal', (hp, maxHp) => {
            this.scene.get('HUDScene').updateHP(hp, maxHp);
        });

        this.events.on('playerDeath', () => {
            this.cameraEffects.flash(500, 0xff0000);
            this.particleEffects.death(this.player.x, this.player.y);
            this.audioManager.playSFX('death');
        });

        this.events.on('playerRespawn', (hp, maxHp, lives) => {
            this.scene.get('HUDScene').updateHP(hp, maxHp);
            this.scene.get('HUDScene').updateLives(lives);

            // Reset boss fight so camera unlocks and boss re-triggers on return
            if (this.bossActive) {
                const worldWidth = this.levelData.width * this.levelData.tileWidth;
                const worldHeight = this.levelData.height * this.levelData.tileHeight;
                this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
                if (this.boss) {
                    this.boss.destroy();
                    this.boss = null;
                }
                this.bossActive = false;
            }
        });

        this.events.on('playerAttack', (type) => {
            this.particleEffects.attackSwing(this.player.x, this.player.y, this.player.facingRight);
            this.audioManager.playSFX(type);
        });

        this.events.on('scoreChange', (score) => {
            this.scene.get('HUDScene').updateScore(score);
        });

        this.events.on('playerJump', () => {
            this.particleEffects.dust(this.player.x, this.player.y + 20);
            this.audioManager.playSFX('jump');
        });

        this.events.on('playerDoubleJump', () => {
            this.audioManager.playSFX('jump');
        });

        this.events.on('collectiblePickup', () => {
            this.audioManager.playSFX('pickup');
        });

        this.events.on('checkpointActivated', () => {
            this.audioManager.playSFX('checkpoint');
        });

        this.events.on('tuningDeflect', () => {
            this.audioManager.playSFX('tuning');
        });
    }

    update(time, delta) {
        // Update player
        this.player.update(time, delta);

        // Update enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) enemy.update(time, delta);
        });

        // Update collectibles
        this.collectibles.getChildren().forEach(c => {
            if (c.active) c.update(time, delta);
        });

        // Update combat system
        this.combatSystem.update(time, delta);

        // Parallax scrolling
        this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.1;
        this.bgFar.tilePositionY = this.cameras.main.scrollY * 0.05;
        this.bgMid.tilePositionX = this.cameras.main.scrollX * 0.3;
        this.bgMid.tilePositionY = this.cameras.main.scrollY * 0.15;

        // Check midnight tuning triggers
        this.checkMidnightTriggers();

        // Check boss trigger
        this.checkBossTrigger();

        // Update HUD tuning bar
        if (this.player.hasTuning) {
            this.scene.get('HUDScene').updateTuning(this.player.tuningEnergy, this.player.maxTuning);
        }

        // Update boss
        if (this.boss && this.boss.active) {
            this.boss.update(time, delta);
        }

        // Check for falling into pits
        if (this.player.y > this.levelData.height * this.levelData.tileHeight + 50) {
            this.player.takeDamage(30, 0);
            if (!this.player.isDead) {
                this.player.setPosition(this.player.checkpointX, this.player.checkpointY);
                this.player.setVelocity(0, 0);
            }
        }
    }

    checkMidnightTriggers() {
        const ld = this.levelData;
        ld.midnightTriggers.forEach((triggerX, i) => {
            if (!this.midnightTriggered[i] && this.player.x > triggerX) {
                this.midnightTriggered[i] = true;
                this.midnightTuning.trigger(ld.shiftablePlatforms);
            }
        });
    }

    checkBossTrigger() {
        if (!this.bossActive && !this.bossDefeated && this.player.x > this.levelData.bossTriggerX) {
            this.startBossFight();
        }
    }

    startBossFight() {
        this.bossActive = true;

        // Lock camera to boss arena
        const arena = this.levelData.bossArena;
        this.cameras.main.setBounds(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top);

        // Spawn boss
        this.boss = new MrSleep(this, this.levelData.bossSpawn.x, this.levelData.bossSpawn.y);
        this.enemies.add(this.boss);

        // Register boss with combat system
        this.combatSystem.registerEnemy(this.boss);

        // Boss entrance effect
        this.cameraEffects.flash(300, 0x4444ff);
        this.cameraEffects.shake(500, 0.01);
        this.audioManager.playSFX('boss_appear');

        // Show boss name
        this.scene.get('HUDScene').showBossName('MR. SLEEP');

        // Boss death event
        this.boss.on('defeated', () => {
            this.onBossDefeated();
        });
    }

    onBossDefeated() {
        this.bossActive = false;
        this.bossDefeated = true;

        // Dramatic effects
        this.cameraEffects.flash(1000, 0xffffff);
        this.cameraEffects.shake(1000, 0.02);

        // Unlock camera
        const worldWidth = this.levelData.width * this.levelData.tileWidth;
        const worldHeight = this.levelData.height * this.levelData.tileHeight;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // Unlock tuning for next level
        this.player.unlockTuning();

        // Show exit door
        this.time.delayedCall(2000, () => {
            const exit = this.levelData.exit;
            this.exitDoor = this.physics.add.staticImage(exit.x, exit.y, 'door');
            this.physics.add.overlap(this.player, this.exitDoor, () => {
                this.completeLevel();
            });
            this.particleEffects.checkpointActivate(exit.x, exit.y);
        });
    }

    completeLevel() {
        // Stop audio and HUD
        this.audioManager.stopMusic();
        this.scene.stop('HUDScene');

        // Save progress
        SaveManager.save({
            level: 2,
            hp: this.player.hp,
            lives: this.player.lives,
            score: this.player.score,
            hasTuning: true,
            hasSword: this.player.hasSword,
            hasDoublejump: this.player.hasDoublejump,
        });

        // Transition to cutscene then Level 2
        this.scene.start('CutsceneScene', {
            cutsceneKey: 'the_truth',
            nextScene: 'Level2Scene',
            playerData: {
                hp: this.player.hp,
                lives: this.player.lives,
                score: this.player.score,
                hasTuning: true,
            }
        });
    }
}
