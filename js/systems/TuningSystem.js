class TuningSystem {
    constructor(scene) {
        this.scene = scene;
        this.pushables = []; // Objects that can be pushed/pulled
        this.deflectables = []; // Projectiles that can be deflected
        this.activePlatforms = [];

        // Listen for tuning events
        scene.events.on('tuningActive', (x, y, facingRight) => {
            this.onTuningActive(x, y, facingRight);
        });

        scene.events.on('tuningDeactivate', () => {
            this.onTuningDeactivate();
        });

        scene.events.on('tuningDeflect', (x, y, facingRight) => {
            this.onTuningDeflect(x, y, facingRight);
        });

        scene.events.on('tuningPlatform', (x, y) => {
            this.createTuningPlatform(x, y);
        });

        // Tuning aura visual
        this.aura = null;
    }

    registerPushable(obj) {
        this.pushables.push(obj);
    }

    registerDeflectable(proj) {
        this.deflectables.push(proj);
    }

    onTuningActive(x, y, facingRight) {
        // Show tuning aura
        if (this.scene.particleEffects) {
            this.scene.particleEffects.tuningGlow(x, y);
        }

        // Push/pull nearby objects
        const pushDir = facingRight ? 1 : -1;
        const player = this.scene.player;

        // Check directional intent
        const cursors = player.cursors;
        const isPushing = (facingRight && cursors.right.isDown) || (!facingRight && cursors.left.isDown);
        const isPulling = (facingRight && cursors.left.isDown) || (!facingRight && cursors.right.isDown);

        this.pushables.forEach(obj => {
            if (!obj.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);

            if (dist < 120) {
                const force = isPushing ? 200 : isPulling ? -150 : 0;
                if (force !== 0) {
                    obj.body.setVelocityX(pushDir * force);
                    if (player.tuningEnergy >= TUNING_PUSH_COST * (this.scene.game.loop.delta / 1000)) {
                        // Energy drains while actively pushing
                    }
                }
            }
        });

        // Push enemies away
        if (isPushing) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.isDead) return;
                const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (dist < 100) {
                    enemy.setVelocity(pushDir * 300, -100);
                    enemy.takeDamage(TUNING_PUSH_DAMAGE * (this.scene.game.loop.delta / 1000), pushDir);
                }
            });
        }
    }

    onTuningDeactivate() {
        // Clean up aura effects
    }

    onTuningDeflect(x, y, facingRight) {
        const player = this.scene.player;
        if (player.tuningEnergy < TUNING_DEFLECT_COST) return;

        player.tuningEnergy -= TUNING_DEFLECT_COST;

        // Visual flash
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.flash(100, 0x4488ff);
        }
        if (this.scene.particleEffects) {
            this.scene.particleEffects.burst(x, y, 'particle_blue', 10, {
                speed: 200,
                lifespan: 300,
                angle: facingRight ? { min: -45, max: 45 } : { min: 135, max: 225 }
            });
        }

        // Deflect nearby projectiles
        const dir = facingRight ? 1 : -1;
        const allProjectiles = this.scene.children.list.filter(child =>
            child.texture && child.texture.key === 'enemy_projectile' && child.active
        );

        allProjectiles.forEach(proj => {
            const dist = Phaser.Math.Distance.Between(x, y, proj.x, proj.y);
            if (dist < 80) {
                // Reverse projectile
                proj.setVelocityX(dir * 300);
                proj.setTint(0x4488ff);
                proj.deflected = true;

                // Make it hurt enemies instead (fallback damage if undefined)
                proj.damage = (proj.damage || 10) * 2;
                this.scene.enemies.getChildren().forEach(enemy => {
                    if (!enemy.isDead && enemy.body) {
                        this.scene.physics.add.overlap(proj, enemy, (p, e) => {
                            if (!p.active) return;
                            e.takeDamage(p.damage, dir);
                            p.destroy();
                        }, null, this.scene);
                    }
                });
            }
        });

        // Deflect hurled objects
        const hurlables = this.scene.children.list.filter(child =>
            child.deflectable && child.active
        );

        hurlables.forEach(obj => {
            const dist = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
            if (dist < 100) {
                obj.emit('deflected');
            }
        });
    }

    createTuningPlatform(x, y) {
        const player = this.scene.player;
        if (player.tuningEnergy < TUNING_PLATFORM_COST) return;
        if (!player.hasFullTuning) return;

        player.tuningEnergy -= TUNING_PLATFORM_COST;

        const platform = this.scene.physics.add.staticImage(x, y, 'tuning_platform');
        platform.setAlpha(0.7);
        platform.setTint(0x4488ff);

        // Player can stand on it
        this.scene.physics.add.collider(this.scene.player, platform, null, (p, plat) => {
            return p.body.velocity.y >= 0;
        });

        this.activePlatforms.push(platform);

        // Particles
        if (this.scene.particleEffects) {
            this.scene.particleEffects.tuningGlow(x, y);
        }

        // Fade and destroy after duration
        this.scene.tweens.add({
            targets: platform,
            alpha: 0,
            delay: TUNING_PLATFORM_DURATION - 500,
            duration: 500,
        });

        this.scene.time.delayedCall(TUNING_PLATFORM_DURATION, () => {
            platform.destroy();
            this.activePlatforms = this.activePlatforms.filter(p => p !== platform);
        });
    }

    update(time, delta) {
        // Clean up destroyed objects
        this.pushables = this.pushables.filter(o => o && o.active);
        this.deflectables = this.deflectables.filter(o => o && o.active);
    }
}
