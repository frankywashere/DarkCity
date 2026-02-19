class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.playerAttackHitboxes = [];
        this.enemyList = [];
        this.comboHitCount = 0;
        this.comboResetTimer = null;
    }

    registerPlayerAttack(hitbox) {
        this.playerAttackHitboxes.push(hitbox);
    }

    registerEnemy(enemy) {
        this.enemyList.push(enemy);
    }

    handlePlayerAttackHit(hitbox, enemy) {
        if (enemy.isDead || !hitbox.active) return;

        const knockDir = enemy.x > hitbox.owner.x ? 1 : -1;
        let damage = hitbox.damage;

        // Knockback bonus for kick
        if (hitbox.attackType === 'kick') {
            enemy.setVelocity(knockDir * KNOCKBACK_FORCE * 1.5, -200);
        }

        enemy.takeDamage(damage, knockDir);

        // Track combo hits
        this.comboHitCount++;
        if (this.comboResetTimer) {
            this.comboResetTimer.remove(false);
        }
        this.comboResetTimer = this.scene.time.delayedCall(1000, () => {
            this.comboHitCount = 0;
        });

        // Flash enemy white on hit
        enemy.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (enemy.active) enemy.clearTint();
        });

        // HIT STOP: Brief physics pause for impact feel (50-120ms based on attack type)
        const hitStopDuration = {
            punch: 40,
            kick: 60,
            sword: 100,
            divekick: 80,
        }[hitbox.attackType] || 50;

        this.scene.physics.pause();
        this.scene.time.delayedCall(hitStopDuration, () => {
            this.scene.physics.resume();
        });

        // Divekick bounce: player bounces up when dive kick connects
        if (hitbox.isDivekick && hitbox.owner) {
            hitbox.owner.setVelocityY(-280);
        }

        // Dynamic camera shake based on attack type
        const shakeConfig = {
            punch: { duration: 80, intensity: 0.003 },
            kick: { duration: 120, intensity: 0.005 },
            sword: { duration: 150, intensity: 0.008 },
            divekick: { duration: 100, intensity: 0.006 },
        }[hitbox.attackType] || { duration: 100, intensity: 0.003 };

        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.shake(shakeConfig.duration, shakeConfig.intensity);
        }

        // Destroy hitbox after hit
        hitbox.destroy();
        this.playerAttackHitboxes = this.playerAttackHitboxes.filter(h => h !== hitbox);

        // ENEMY DEATH SPECTACLE
        if (enemy.hp <= 0) {
            // Emit enemyKilled event with position and score value
            this.scene.events.emit('enemyKilled', enemy.x, enemy.y, enemy.scoreValue || 100);

            // Enhanced death particles
            if (this.scene.particleEffects) {
                this.scene.particleEffects.koExplosion(enemy.x, enemy.y);
            }

            // KO FLASH: Dramatic zoom + slowmo when enemy dies
            if (this.scene.cameraEffects) {
                this.scene.cameraEffects.koFlash();
            }
        }
    }

    update(time, delta) {
        // Clean up destroyed hitboxes
        this.playerAttackHitboxes = this.playerAttackHitboxes.filter(h => h && h.active);

        // Check player attacks vs breakable platforms (hitbox survives this check)
        const breakables = this.scene.breakableGroup ? this.scene.breakableGroup.getChildren() : [];
        for (let i = this.playerAttackHitboxes.length - 1; i >= 0; i--) {
            const hitbox = this.playerAttackHitboxes[i];
            if (!hitbox || !hitbox.active || !hitbox.body) continue;

            for (let j = breakables.length - 1; j >= 0; j--) {
                const tile = breakables[j];
                if (!tile || !tile.active || !tile.body) continue;

                const hb = hitbox.body;
                const tb = tile.body;
                if (hb.x < tb.x + tb.width && hb.x + hb.width > tb.x &&
                    hb.y < tb.y + tb.height && hb.y + hb.height > tb.y) {
                    if (this.scene.particleEffects) {
                        this.scene.particleEffects.burst(tile.x, tile.y, 'particle_dust', 8, {
                            speed: 150, lifespan: 500
                        });
                    }
                    tile.destroy();
                }
            }
        }

        // Dynamically check all active hitboxes against ALL current enemies
        // This catches enemies spawned after the attack was created (e.g. boss summons)
        const enemies = this.scene.enemies ? this.scene.enemies.getChildren() : [];
        for (let i = this.playerAttackHitboxes.length - 1; i >= 0; i--) {
            const hitbox = this.playerAttackHitboxes[i];
            if (!hitbox || !hitbox.active || !hitbox.body) continue;

            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                if (!enemy || !enemy.active || enemy.isDead || !enemy.body) continue;

                // Manual overlap check using physics bounds
                const hb = hitbox.body;
                const eb = enemy.body;
                if (hb.x < eb.x + eb.width &&
                    hb.x + hb.width > eb.x &&
                    hb.y < eb.y + eb.height &&
                    hb.y + hb.height > eb.y) {
                    this.handlePlayerAttackHit(hitbox, enemy);
                    break; // hitbox is destroyed after hit, move to next
                }
            }
        }
    }
}
