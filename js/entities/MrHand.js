class MrHand extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'mr_hand', {
            hp: MRHAND_HP,
            speed: MRHAND_SPEED,
            damage: 18,
            detectRange: 400,
            attackRange: 45,
            attackCooldown: 1200,
            scoreValue: 2000,
            isBoss: true,
            knockbackResist: 2,
        });

        this.body.setSize(22, 44);
        this.body.setOffset(3, 4);

        // Boss phases
        this.phase = 1;
        this.phaseThresholds = [0.66, 0.33];

        // Mirror mechanic - copies player's last attack
        this.lastPlayerAttack = null;
        this.mirrorCooldown = 2000;
        this.lastMirrorTime = 0;

        // Tuning attack (phase 2+)
        this.hasTuning = false;
        this.tuningProjectileCooldown = 3000;
        this.lastTuningProjectile = 0;

        // Tactical retreat
        this.retreatCooldown = 5000;
        this.lastRetreatTime = 0;

        // Listen for player attacks to mirror
        scene.events.on('playerAttack', (type) => {
            this.lastPlayerAttack = type;
        });
    }

    update(time, delta) {
        if (this.isDead) return;
        this.checkPhase();
        this.target = this.scene.player;

        switch (this.state) {
            case 'IDLE':
                this.stateTimer += delta;
                if (this.stateTimer > 500) this.setState('CHASE');
                break;
            case 'CHASE':
                this.updateHandChase(time, delta);
                break;
            case 'ATTACK':
                this.updateHandAttack(time, delta);
                break;
            case 'MIRROR':
                this.updateMirror(time, delta);
                break;
            case 'TUNING_ATTACK':
                this.updateTuningAttack(time, delta);
                break;
            case 'RETREAT':
                this.updateRetreat(time, delta);
                break;
            case 'HURT':
                this.updateHurt(time, delta);
                break;
        }

        if (this.body.velocity.x > 0) this.facingRight = true;
        else if (this.body.velocity.x < 0) this.facingRight = false;
        this.setFlipX(this.facingRight);
    }

    checkPhase() {
        const hpRatio = this.hp / this.maxHp;
        if (this.phase === 1 && hpRatio <= this.phaseThresholds[0]) {
            this.phase = 2;
            this.hasTuning = true;
            this.speed = MRHAND_SPEED * 1.2;
            this.onPhaseChange();
        } else if (this.phase === 2 && hpRatio <= this.phaseThresholds[1]) {
            this.phase = 3;
            this.speed = MRHAND_SPEED * 1.4;
            this.mirrorCooldown = 1500;
            this.tuningProjectileCooldown = 2000;
            this.onPhaseChange();
        }
    }

    onPhaseChange() {
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.flash(300, 0x4444ff);
            this.scene.cameraEffects.shake(500, 0.01);
        }
        this.setTint(0x8844ff);
        this.scene.time.delayedCall(500, () => this.clearTint());
    }

    updateHandChase(time, delta) {
        if (!this.target || this.target.isDead) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Tactical retreat if too close and recently hurt
        if (dist < 60 && this.hp < this.maxHp * 0.5 && time - this.lastRetreatTime > this.retreatCooldown) {
            this.setState('RETREAT');
            this.lastRetreatTime = time;
            return;
        }

        // Mirror player's attack
        if (this.lastPlayerAttack && time - this.lastMirrorTime > this.mirrorCooldown) {
            this.setState('MIRROR');
            this.lastMirrorTime = time;
            return;
        }

        // Tuning projectile (phase 2+)
        if (this.hasTuning && dist > 100 && time - this.lastTuningProjectile > this.tuningProjectileCooldown) {
            this.setState('TUNING_ATTACK');
            this.lastTuningProjectile = time;
            return;
        }

        if (dist < this.attackRange) {
            this.setState('ATTACK');
            return;
        }

        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * dir);
    }

    updateHandAttack(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);

        if (this.stateTimer > 200 && this.stateTimer < 400) {
            if (this.target && !this.target.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < this.attackRange + 10) {
                    const knockDir = this.target.x > this.x ? 1 : -1;
                    this.target.takeDamage(this.damage, knockDir);
                    this.stateTimer = 500;
                }
            }
        }

        if (this.stateTimer > this.attackCooldown) {
            this.setState('CHASE');
        }
    }

    updateMirror(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);
        this.setTint(0xaa88ff);

        if (this.stateTimer > 400 && this.stateTimer < 600) {
            // Execute mirrored attack
            if (this.target && !this.target.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                let damage = this.damage;
                if (this.lastPlayerAttack === 'kick') damage *= 1.3;
                else if (this.lastPlayerAttack === 'sword') damage *= 1.5;

                if (dist < 60) {
                    const knockDir = this.target.x > this.x ? 1 : -1;
                    this.target.takeDamage(damage, knockDir);
                }
            }
        }

        if (this.stateTimer > 800) {
            this.clearTint();
            this.lastPlayerAttack = null;
            this.setState('CHASE');
        }
    }

    updateTuningAttack(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);
        this.setTint(0x4488ff);

        if (this.stateTimer > 500 && this.stateTimer < 600) {
            // Fire tuning projectile
            this.fireTuningProjectile();
        }

        if (this.stateTimer > 1000) {
            this.clearTint();
            this.setState('CHASE');
        }
    }

    fireTuningProjectile() {
        if (!this.target) return;
        const dir = this.target.x > this.x ? 1 : -1;

        const projectile = this.scene.physics.add.sprite(this.x + dir * 20, this.y, 'enemy_projectile');
        projectile.body.setAllowGravity(false);
        projectile.setVelocityX(dir * 250);
        projectile.damage = 15;

        this.scene.physics.add.overlap(projectile, this.scene.player, (proj, player) => {
            if (!player.isDead && !player.isInvincible) {
                player.takeDamage(proj.damage, dir);
                proj.destroy();
            }
        });

        // Destroy after timeout
        this.scene.time.delayedCall(3000, () => {
            if (projectile.active) projectile.destroy();
        });
    }

    updateRetreat(time, delta) {
        this.stateTimer += delta;

        if (this.stateTimer < 800) {
            const dir = this.target && this.target.x > this.x ? -1 : 1;
            this.setVelocityX(this.speed * 1.5 * dir);
        } else {
            this.setState('CHASE');
        }
    }
}
