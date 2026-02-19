class MrBook extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'mr_book', {
            hp: MRBOOK_HP,
            speed: MRBOOK_SPEED,
            damage: 25,
            detectRange: 600,
            attackRange: 80,
            attackCooldown: 2000,
            scoreValue: 5000,
            isBoss: true,
            knockbackResist: 4,
        });

        this.body.setSize(28, 48);
        this.body.setOffset(2, 4);

        // 3 Phases
        this.phase = 1;

        // Phase 1: Ground - telekinesis + summon grunts
        this.summonCooldown = 8000;
        this.lastSummonTime = 0;
        this.telekinesisCooldown = 3000;
        this.lastTelekinesisTime = 0;
        this.maxSummons = 3;

        // Phase 2: Platforms - hurl objects
        this.hurlCooldown = 4000;
        this.lastHurlTime = 0;
        this.arenaReshaped = false;

        // Phase 3: Sky battle
        this.skyPlatforms = [];
        this.finalAttackCooldown = 2500;
        this.lastFinalAttack = 0;

        // Hover
        this.hoverOffset = 0;
        this.baseY = y;

        // Invulnerability during transitions
        this.transitioning = false;
    }

    update(time, delta) {
        if (this.isDead || this.transitioning) return;

        this.target = this.scene.player;
        this.checkPhase(time);

        // Hover effect
        this.hoverOffset += delta * 0.003;
        if (this.phase < 3) {
            this.y = this.baseY + Math.sin(this.hoverOffset) * 8;
        }

        switch (this.phase) {
            case 1: this.updatePhase1(time, delta); break;
            case 2: this.updatePhase2(time, delta); break;
            case 3: this.updatePhase3(time, delta); break;
        }

        if (this.body.velocity.x > 0) this.facingRight = true;
        else if (this.body.velocity.x < 0) this.facingRight = false;
        this.setFlipX(this.facingRight);
    }

    checkPhase(time) {
        const hpRatio = this.hp / this.maxHp;

        if (this.phase === 1 && hpRatio <= 0.66) {
            this.transitionToPhase(2);
        } else if (this.phase === 2 && hpRatio <= 0.33) {
            this.transitionToPhase(3);
        }
    }

    transitionToPhase(newPhase) {
        this.transitioning = true;
        this.phase = newPhase;

        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.flash(500, 0x8844ff);
            this.scene.cameraEffects.shake(1000, 0.02);
        }

        this.setTint(0xff44ff);
        this.setVelocity(0, 0);

        if (newPhase === 2) {
            this.reshapeArena();
        } else if (newPhase === 3) {
            this.createSkyBattle();
        }

        this.scene.time.delayedCall(2000, () => {
            this.clearTint();
            this.transitioning = false;
        });
    }

    // Phase 1: Ground combat
    updatePhase1(time, delta) {
        if (!this.target || this.target.isDead) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Summon grunts
        if (time - this.lastSummonTime > this.summonCooldown) {
            this.summonGrunts(time);
            return;
        }

        // Telekinesis attack
        if (time - this.lastTelekinesisTime > this.telekinesisCooldown && dist < 300) {
            this.telekinesisAttack(time);
            return;
        }

        // Move toward player slowly
        if (dist > 150) {
            const dir = this.target.x > this.x ? 1 : -1;
            this.setVelocityX(this.speed * 0.5 * dir);
        } else if (dist < 100) {
            // Back away
            const dir = this.target.x > this.x ? -1 : 1;
            this.setVelocityX(this.speed * 0.3 * dir);
        } else {
            this.setVelocityX(0);
        }
    }

    summonGrunts(time) {
        this.lastSummonTime = time;
        this.setTint(0x8844ff);

        // Count existing summons
        const existingGrunts = this.scene.enemies.getChildren().filter(e =>
            e instanceof StrangerGrunt && !e.isDead
        ).length;

        if (existingGrunts < this.maxSummons) {
            const spawnSide = Math.random() > 0.5 ? -100 : 100;
            const grunt = new StrangerGrunt(
                this.scene,
                this.x + spawnSide,
                this.y,
                this.x - 200,
                this.x + 200
            );
            this.scene.enemies.add(grunt);

            // Set up collisions for new grunt
            this.scene.physics.add.collider(grunt, this.scene.groundGroup);
            this.scene.physics.add.collider(grunt, this.scene.platformGroup);

            if (this.scene.particleEffects) {
                this.scene.particleEffects.tuningGlow(this.x + spawnSide, this.y);
            }
        }

        this.scene.time.delayedCall(300, () => this.clearTint());
    }

    telekinesisAttack(time) {
        this.lastTelekinesisTime = time;
        this.setTint(0x4488ff);
        this.setVelocityX(0);

        // Fire 3 projectiles in a spread
        const dir = this.target && this.target.x > this.x ? 1 : -1;
        const angles = [-20, 0, 20];

        angles.forEach((angle, i) => {
            this.scene.time.delayedCall(i * 200, () => {
                const proj = this.scene.physics.add.sprite(this.x + dir * 20, this.y - 10, 'enemy_projectile');
                proj.body.setAllowGravity(false);
                const rad = Phaser.Math.DegToRad(angle);
                proj.setVelocity(dir * 200 * Math.cos(rad), 200 * Math.sin(rad));
                proj.damage = 15;
                proj.setTint(0x8844ff);

                this.scene.physics.add.overlap(proj, this.scene.player, (p, player) => {
                    if (!player.isDead && !player.isInvincible) {
                        player.takeDamage(p.damage, dir);
                        p.destroy();
                    }
                });

                this.scene.time.delayedCall(4000, () => {
                    if (proj.active) proj.destroy();
                });
            });
        });

        this.scene.time.delayedCall(800, () => this.clearTint());
    }

    // Phase 2: Platform battle
    reshapeArena() {
        if (this.arenaReshaped) return;
        this.arenaReshaped = true;

        // Create vertical platforms in the arena
        const arenaLeft = this.scene.levelData.bossArena ? this.scene.levelData.bossArena.left : this.x - 300;
        const platforms = [
            { x: arenaLeft + 80, y: 350 },
            { x: arenaLeft + 200, y: 250 },
            { x: arenaLeft + 350, y: 300 },
            { x: arenaLeft + 450, y: 200 },
            { x: arenaLeft + 550, y: 350 },
        ];

        platforms.forEach((p, i) => {
            this.scene.time.delayedCall(i * 300, () => {
                const plat = this.scene.platformGroup.create(p.x, p.y, 'platform');
                plat.refreshBody();
                if (this.scene.particleEffects) {
                    this.scene.particleEffects.midnightFlash(p.x, p.y);
                }
            });
        });
    }

    updatePhase2(time, delta) {
        if (!this.target || this.target.isDead) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Hurl objects at player
        if (time - this.lastHurlTime > this.hurlCooldown) {
            this.hurlObject(time);
            return;
        }

        // Telekinesis still active
        if (time - this.lastTelekinesisTime > this.telekinesisCooldown * 0.8) {
            this.telekinesisAttack(time);
            return;
        }

        // Hover and move
        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * 0.6 * dir);
        this.body.setAllowGravity(false);
    }

    hurlObject(time) {
        this.lastHurlTime = time;
        this.setTint(0xff8844);

        // Create a large projectile (building segment)
        const dir = this.target && this.target.x > this.x ? 1 : -1;
        const hurl = this.scene.physics.add.sprite(this.x, this.y - 40, 'crate');
        hurl.body.setAllowGravity(false);
        hurl.setScale(1.5);
        hurl.setVelocity(dir * 180, 50);
        hurl.damage = 25;

        this.scene.physics.add.overlap(hurl, this.scene.player, (h, player) => {
            if (!player.isDead && !player.isInvincible) {
                player.takeDamage(h.damage, dir);
                h.destroy();
            }
        });

        // Can be deflected back by tuning
        hurl.deflectable = true;
        hurl.on('deflected', () => {
            hurl.setVelocity(-dir * 250, -50);
            this.scene.physics.add.overlap(hurl, this, (h) => {
                this.takeDamage(30, -dir);
                h.destroy();
            });
        });

        this.scene.time.delayedCall(5000, () => {
            if (hurl.active) hurl.destroy();
        });

        this.scene.time.delayedCall(400, () => this.clearTint());
    }

    // Phase 3: Sky battle
    createSkyBattle() {
        this.body.setAllowGravity(false);

        // Create floating platforms for sky battle
        const cx = this.x;
        const positions = [
            { x: cx - 200, y: 300 },
            { x: cx - 100, y: 200 },
            { x: cx, y: 250 },
            { x: cx + 100, y: 150 },
            { x: cx + 200, y: 300 },
            { x: cx, y: 350 },
        ];

        positions.forEach((p, i) => {
            this.scene.time.delayedCall(i * 200, () => {
                const plat = this.scene.platformGroup.create(p.x, p.y, 'platform');
                plat.refreshBody();
                this.skyPlatforms.push(plat);
            });
        });

        this.baseY = 150;
    }

    updatePhase3(time, delta) {
        if (!this.target || this.target.isDead) return;

        // Move platforms slowly
        this.skyPlatforms.forEach((p, i) => {
            if (p.active) {
                p.y += Math.sin(time * 0.001 + i) * 0.3;
                p.refreshBody();
            }
        });

        // More aggressive attacks
        if (time - this.lastFinalAttack > this.finalAttackCooldown) {
            this.lastFinalAttack = time;

            if (Math.random() > 0.5) {
                this.telekinesisAttack(time);
            } else {
                this.hurlObject(time);
            }
        }

        // Hover toward player
        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * 0.8 * dir);

        // Vertical tracking
        const dy = this.target.y - this.y;
        this.setVelocityY(dy * 0.5);
    }

    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.body.setAllowGravity(false);

        // Epic death sequence
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.slowMo(2000);
            this.scene.cameraEffects.shake(2000, 0.03);
        }

        // Dissolve effect
        let deathTimer = 0;
        const deathInterval = this.scene.time.addEvent({
            delay: 100,
            repeat: 20,
            callback: () => {
                deathTimer++;
                if (this.scene.particleEffects) {
                    this.scene.particleEffects.death(
                        this.x + Phaser.Math.Between(-20, 20),
                        this.y + Phaser.Math.Between(-20, 20)
                    );
                }
                this.setAlpha(1 - deathTimer / 20);
            }
        });

        this.scene.time.delayedCall(2500, () => {
            if (this.scene.cameraEffects) {
                this.scene.cameraEffects.flash(1500, 0xffffff);
            }
            if (this.scene.player) {
                this.scene.player.addScore(this.scoreValue);
            }
            this.emit('defeated');
            this.destroy();
        });
    }
}
