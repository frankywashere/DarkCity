class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.playerAttackHitboxes = [];
        this.enemyList = [];
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

        // Destroy hitbox after hit to prevent multi-hit
        hitbox.destroy();
        this.playerAttackHitboxes = this.playerAttackHitboxes.filter(h => h !== hitbox);

        // Camera shake on hit
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.shake(100, 0.003);
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
