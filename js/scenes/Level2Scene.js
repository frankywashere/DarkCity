class Level2Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Level2Scene' });
    }

    init(data) {
        this.levelData = LEVEL2_DATA;
        this.playerData = data || {};
    }

    create() {
        const ld = this.levelData;
        const worldWidth = ld.width * ld.tileWidth;
        const worldHeight = ld.height * ld.tileHeight;

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Backgrounds
        this.bgFar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ld.background)
            .setOrigin(0, 0).setScrollFactor(0);
        this.bgMid = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ld.backgroundMid)
            .setOrigin(0, 0).setScrollFactor(0);

        // Tile groups
        this.groundGroup = this.physics.add.staticGroup();
        this.platformGroup = this.physics.add.staticGroup();
        this.wallGroup = this.physics.add.staticGroup();
        this.hazardGroup = this.physics.add.staticGroup();
        this.breakableGroup = this.physics.add.staticGroup();
        this.onewayGroup = this.physics.add.staticGroup();

        this.buildTilemap(ld);

        // Add atmospheric elements (underground dripping water)
        this.addAtmosphere(worldWidth, worldHeight);

        // Player
        this.player = new Player(this, ld.playerSpawn.x, ld.playerSpawn.y);

        // Restore player state
        if (this.playerData.hp) this.player.hp = this.playerData.hp;
        if (this.playerData.lives) this.player.lives = this.playerData.lives;
        if (this.playerData.score) this.player.score = this.playerData.score;

        // Level 2 unlocks
        this.player.unlockTuning();
        this.player.unlockDoublejump();
        this.player.unlockSword();
        if (this.playerData.hasTuning) this.player.unlockTuning();

        // Enemies
        this.enemies = this.add.group();
        this.createEnemies(ld);

        // Collectibles
        this.collectibles = this.add.group();
        this.createCollectibles(ld);

        // TuningSystem must exist before crates register with it
        this.tuningSystem = new TuningSystem(this);

        // Crates (pushable)
        this.crates = this.add.group();
        this.createCrates(ld);

        // Checkpoints
        this.checkpoints = [];
        this.createCheckpoints(ld);

        // Systems
        this.combatSystem = new CombatSystem(this);
        this.collisionHandler = new CollisionHandler(this);
        this.midnightTriggered = {};
        this.midnightTuning = new MidnightTuning(this);
        this.particleEffects = new ParticleEffects(this);
        this.cameraEffects = new CameraEffects(this);

        // Audio
        this.audioManager = new AudioManager(this);
        this.audioManager.startAmbientDrone();

        // Camera
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(100, 50);
        this.cameras.main.fadeIn(800, 0, 0, 0);

        // Vignette
        this.vignette = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
            .setScrollFactor(0).setDepth(100).setAlpha(0.5);

        // HUD
        this.scene.launch('HUDScene', {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            tuning: this.player.tuningEnergy,
            maxTuning: this.player.maxTuning,
            lives: this.player.lives,
            score: this.player.score,
            level: 'Level 2: The Underground',
            hasTuning: true,
        });

        // Boss state
        this.bossActive = false;
        this.bossDefeated = false;
        this.boss = null;
        this.exitDoor = null;

        this.setupEvents();
    }

    buildTilemap(ld) {
        const textureOverrides = {
            1: ld.tileTexture || 'ground',
            2: ld.platformTexture || 'platform',
            3: ld.wallTexture || 'wall',
            4: 'hazard',
            5: 'breakable',
            6: 'oneway',
        };
        const tileGroups = {
            1: this.groundGroup, 2: this.platformGroup, 3: this.wallGroup,
            4: this.hazardGroup, 5: this.breakableGroup, 6: this.onewayGroup,
        };

        for (let row = 0; row < ld.tiles.length; row++) {
            for (let col = 0; col < ld.tiles[row].length; col++) {
                const tileType = ld.tiles[row][col];
                if (tileType === 0) continue;
                const x = col * ld.tileWidth + ld.tileWidth / 2;
                const y = row * ld.tileHeight + ld.tileHeight / 2;
                const texture = textureOverrides[tileType];
                const group = tileGroups[tileType];
                if (texture && group) group.create(x, y, texture);
            }
        }
    }

    addAtmosphere(worldWidth, worldHeight) {
        // Dim green ceiling lights for underground ambiance
        for (let x = 150; x < worldWidth; x += 250 + Math.floor(Math.random() * 150)) {
            const glow = this.add.circle(x, 40, 30, 0x22cc66, 0.1);
            glow.setDepth(1);
            glow.setBlendMode(Phaser.BlendModes.ADD);
        }

        // Dripping water particles (green-tinted)
        this.dripEmitter = this.add.particles(0, 0, 'particle_white', {
            x: { min: 0, max: worldWidth },
            y: 0,
            lifespan: 2000,
            speedY: { min: 60, max: 140 },
            speedX: { min: -5, max: 5 },
            scale: { start: 0.25, end: 0.05 },
            alpha: { start: 0.5, end: 0 },
            tint: 0x44cc88,
            quantity: 1,
            frequency: 200,
        });
        this.dripEmitter.setDepth(90);
    }

    createEnemies(ld) {
        ld.enemies.forEach(e => {
            let enemy;
            switch (e.type) {
                case 'grunt':
                    enemy = new StrangerGrunt(this, e.x, e.y, e.patrolMin, e.patrolMax);
                    break;
                case 'wall':
                    enemy = new MrWall(this, e.x, e.y, e.patrolMin, e.patrolMax);
                    break;
            }
            if (enemy) this.enemies.add(enemy);
        });
    }

    createCollectibles(ld) {
        ld.collectibles.forEach(c => {
            const collectible = new Collectible(this, c.x, c.y, c.type);
            this.collectibles.add(collectible);
        });
    }

    createCrates(ld) {
        if (!ld.crates) return;
        ld.crates.forEach(c => {
            const crate = this.physics.add.sprite(c.x, c.y, 'crate');
            crate.body.setDrag(200, 0);
            crate.body.setBounce(0.1);
            crate.body.setMass(3);
            this.crates.add(crate);

            // Collisions for crate
            this.physics.add.collider(crate, this.groundGroup);
            this.physics.add.collider(crate, this.platformGroup);
            this.physics.add.collider(this.player, crate);

            // Register as pushable
            this.tuningSystem.registerPushable(crate);
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

        this.events.on('comboHit', (count) => {
            this.scene.get('HUDScene').showCombo(count);
            if (this.particleEffects) {
                this.particleEffects.comboSpark(this.player.x, this.player.y, count);
            }
        });

        this.events.on('comboReset', () => {
            this.scene.get('HUDScene').hideCombo();
        });

        this.events.on('playerDodge', () => {
            if (this.particleEffects) {
                this.particleEffects.dodgeTrail(this.player.x, this.player.y);
            }
            this.audioManager.playSFX('tuning'); // reuse tuning sound for dodge
        });

        this.events.on('enemyKilled', (x, y, scoreValue) => {
            // Convert world position to screen position for HUD
            const cam = this.cameras.main;
            const screenX = x - cam.scrollX;
            const screenY = y - cam.scrollY;
            this.scene.get('HUDScene').showScorePopup(screenX, screenY, scoreValue);
        });
    }

    update(time, delta) {
        this.player.update(time, delta);
        this.enemies.getChildren().forEach(e => { if (e.active) e.update(time, delta); });
        this.collectibles.getChildren().forEach(c => { if (c.active) c.update(time, delta); });
        this.combatSystem.update(time, delta);
        this.tuningSystem.update(time, delta);

        // Parallax
        this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.1;
        this.bgMid.tilePositionX = this.cameras.main.scrollX * 0.3;

        // Dynamic vignette - pulse based on health and boss proximity
        if (this.vignette) {
            let vignetteAlpha = 0.4; // base

            // Increase when HP is low
            const hpRatio = this.player.hp / this.player.maxHp;
            if (hpRatio < 0.3) {
                vignetteAlpha += 0.2 * (1 - hpRatio / 0.3);
            }

            // Increase during boss fight
            if (this.bossActive) {
                vignetteAlpha += 0.1;
            }

            this.vignette.setAlpha(Phaser.Math.Linear(this.vignette.alpha, vignetteAlpha, 0.05));
        }

        // Midnight triggers
        const ld = this.levelData;
        ld.midnightTriggers.forEach((triggerX, i) => {
            if (!this.midnightTriggered[i] && this.player.x > triggerX) {
                this.midnightTriggered[i] = true;
                this.midnightTuning.trigger(ld.shiftablePlatforms);
            }
        });

        // Boss trigger
        if (!this.bossActive && !this.bossDefeated && this.player.x > ld.bossTriggerX) {
            this.startBossFight();
        }

        // HUD tuning update
        this.scene.get('HUDScene').updateTuning(this.player.tuningEnergy, this.player.maxTuning);

        if (this.boss && this.boss.active) {
            this.boss.update(time, delta);
            // Update boss HP in HUD
            if (this.boss.hp !== undefined && this.boss.maxHp !== undefined) {
                this.scene.get('HUDScene').updateBossHP(this.boss.hp, this.boss.maxHp);
            }
        }

        // Pit detection
        if (this.player.y > ld.height * ld.tileHeight + 50) {
            this.player.takeDamage(30, 0);
            if (!this.player.isDead) {
                this.player.setPosition(this.player.checkpointX, this.player.checkpointY);
                this.player.setVelocity(0, 0);
            }
        }
    }

    startBossFight() {
        this.bossActive = true;

        // Freeze player
        this.player.setVelocity(0, 0);
        this.input.keyboard.enabled = false;

        const arena = this.levelData.bossArena;

        // Pan camera to boss spawn
        const panToBoss = () => {
            if (this.cameraEffects.cinematicPan) {
                this.cameraEffects.cinematicPan(
                    this.levelData.bossSpawn.x,
                    this.levelData.bossSpawn.y,
                    1000,
                    spawnBoss
                );
            } else {
                this.cameras.main.pan(this.levelData.bossSpawn.x, this.levelData.bossSpawn.y, 1000);
                this.cameras.main.once('camerapancomplete', spawnBoss);
            }
        };

        const spawnBoss = () => {
            // Spawn boss with scale-in effect
            this.boss = new MrHand(this, this.levelData.bossSpawn.x, this.levelData.bossSpawn.y);
            this.boss.setScale(0);
            this.boss.setAlpha(0);

            this.tweens.add({
                targets: this.boss,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 600,
                ease: 'Back.easeOut',
            });

            this.enemies.add(this.boss);
            this.combatSystem.registerEnemy(this.boss);

            this.cameraEffects.flash(500, 0x4444ff);
            this.cameraEffects.shake(1000, 0.02);
            this.audioManager.playSFX('boss_appear');
            this.scene.get('HUDScene').showBossName('MR. HAND');

            // Pan back to player, then lock camera
            this.time.delayedCall(1500, () => {
                this.cameras.main.pan(this.player.x, this.player.y, 800, 'Power2');
                this.cameras.main.once('camerapancomplete', () => {
                    // Lock camera to arena
                    this.cameras.main.setBounds(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top);
                    this.input.keyboard.enabled = true;

                    // Neo Geo style zoom in for boss fight
                    if (this.cameraEffects.bossZoom) {
                        this.cameraEffects.bossZoom(1.15);
                    } else {
                        this.cameras.main.zoomTo(1.15, 1000);
                    }
                });
            });

            this.boss.on('defeated', () => this.onBossDefeated());
        };

        panToBoss();
    }

    onBossDefeated() {
        // Reset boss zoom
        if (this.cameraEffects.bossZoomReset) {
            this.cameraEffects.bossZoomReset();
        } else {
            this.cameras.main.zoomTo(1, 500);
        }

        this.bossActive = false;
        this.bossDefeated = true;
        this.cameraEffects.flash(1000, 0xffffff);
        this.cameraEffects.shake(1000, 0.02);

        const worldWidth = this.levelData.width * this.levelData.tileWidth;
        const worldHeight = this.levelData.height * this.levelData.tileHeight;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        this.time.delayedCall(2000, () => {
            const exit = this.levelData.exit;
            this.exitDoor = this.physics.add.staticImage(exit.x, exit.y, 'door');
            this.physics.add.overlap(this.player, this.exitDoor, () => this.completeLevel());
            this.particleEffects.checkpointActivate(exit.x, exit.y);
        });
    }

    completeLevel() {
        this.audioManager.stopMusic();
        this.scene.stop('HUDScene');
        SaveManager.save({
            level: 3,
            hp: this.player.hp,
            lives: this.player.lives,
            score: this.player.score,
            hasTuning: true,
            hasSword: true,
            hasDoublejump: true,
        });

        this.scene.start('CutsceneScene', {
            cutsceneKey: 'the_injection',
            nextScene: 'Level3Scene',
            playerData: {
                hp: this.player.hp,
                lives: this.player.lives,
                score: this.player.score,
                hasTuning: true,
                hasSword: true,
                hasDoublejump: true,
            }
        });
    }
}
