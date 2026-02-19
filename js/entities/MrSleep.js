class MrSleep extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'mr_sleep', {
            hp: MRSLEEP_HP,
            speed: MRSLEEP_SPEED,
            damage: 20,
            detectRange: 500,
            attackRange: 50,
            attackCooldown: 1500,
            scoreValue: 1000,
            isBoss: true,
            knockbackResist: 2,
        });

        this.body.setSize(22, 44);
        this.body.setOffset(3, 4);

        // Boss phases
        this.phase = 1;
        this.phaseThresholds = [0.66, 0.33]; // HP ratios to advance phase

        // Teleport
        this.teleportCooldown = 3000;
        this.lastTeleportTime = 0;
        this.isTeleporting = false;

        // Lunge attack
        this.isLunging = false;
        this.lungeSpeed = 400;

        // Taunt
        this.isTaunting = false;
        this.tauntDuration = 800;
    }

    setState(newState) {
        this.state = newState;
        this.stateTimer = 0;
        switch (newState) {
            case 'IDLE': this.playEnemyAnim('idle'); break;
            case 'CHASE': this.playEnemyAnim('move'); break;
            case 'TAUNT': this.playEnemyAnim('idle'); break;
            case 'HURT': this.playEnemyAnim('idle'); break;
        }
    }

    update(time, delta) {
        if (this.isDead) return;

        // Check phase transitions
        this.checkPhase();

        // Boss AI
        this.target = this.scene.player;

        switch (this.state) {
            case 'IDLE':
                this.stateTimer += delta;
                if (this.stateTimer > 500) this.setState('CHASE');
                break;
            case 'CHASE':
                this.updateBossChase(time, delta);
                break;
            case 'TELEPORT':
                this.updateTeleport(time, delta);
                break;
            case 'TAUNT':
                this.updateTaunt(time, delta);
                break;
            case 'LUNGE':
                this.updateLunge(time, delta);
                break;
            case 'ATTACK':
                this.updateBossAttack(time, delta);
                break;
            case 'HURT':
                this.updateHurt(time, delta);
                break;
        }

        // Update facing
        if (this.body.velocity.x > 0) this.facingRight = true;
        else if (this.body.velocity.x < 0) this.facingRight = false;
        this.setFlipX(this.facingRight);
    }

    checkPhase() {
        const hpRatio = this.hp / this.maxHp;
        if (this.phase === 1 && hpRatio <= this.phaseThresholds[0]) {
            this.phase = 2;
            this.speed = MRSLEEP_SPEED * 1.3;
            this.teleportCooldown = 2500;
            this.onPhaseChange();
        } else if (this.phase === 2 && hpRatio <= this.phaseThresholds[1]) {
            this.phase = 3;
            this.speed = MRSLEEP_SPEED * 1.6;
            this.teleportCooldown = 2000;
            this.lungeSpeed = 500;
            this.onPhaseChange();
        }
    }

    onPhaseChange() {
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.flash(300, 0xff4444);
            this.scene.cameraEffects.shake(500, 0.01);
        }
        // Brief invulnerability during phase change
        this.setTint(0xff44ff);
        this.scene.time.delayedCall(500, () => this.clearTint());
    }

    updateBossChase(time, delta) {
        if (!this.target || this.target.isDead) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Decide action
        if (time - this.lastTeleportTime > this.teleportCooldown && dist > 100) {
            this.setState('TELEPORT');
            this.lastTeleportTime = time;
            return;
        }

        if (dist < this.attackRange + 20) {
            this.setState('TAUNT');
            return;
        }

        // Chase
        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * dir);
    }

    updateTeleport(time, delta) {
        this.stateTimer += delta;

        if (this.stateTimer < 300) {
            // Fade out
            this.playEnemyAnim('teleport_out');
            this.setAlpha(1 - this.stateTimer / 300);
            this.setVelocity(0, 0);
            // Scale shrink effect for visual punch
            this.setScale(1 - this.stateTimer / 600);
        } else if (this.stateTimer < 400) {
            // Teleport behind player
            if (!this.isTeleporting && this.target) {
                this.isTeleporting = true;
                const behindDir = this.target.facingRight ? -1 : 1;
                this.setPosition(this.target.x + behindDir * 80, this.target.y);
                this.playEnemyAnim('teleport_in');
            }
        } else if (this.stateTimer < 700) {
            // Fade in
            this.setAlpha((this.stateTimer - 400) / 300);
            this.setScale(0.5 + (this.stateTimer - 400) / 600);
        } else {
            this.setAlpha(1);
            this.setScale(1);
            this.isTeleporting = false;
            this.setState('TAUNT');
        }
    }

    updateTaunt(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);

        // Visual taunt - slight bob
        if (this.stateTimer < this.tauntDuration) {
            this.y += Math.sin(this.stateTimer * 0.05) * 0.5;
        } else {
            this.setState('LUNGE');
        }
    }

    updateLunge(time, delta) {
        this.stateTimer += delta;

        if (this.stateTimer < 100) {
            // Wind up
            this.setVelocityX(0);
            this.playEnemyAnim('lunge');
        } else if (this.stateTimer < 500) {
            // Lunge forward
            if (!this.isLunging) {
                this.isLunging = true;
                const dir = this.target && this.target.x > this.x ? 1 : -1;
                this.setVelocityX(dir * this.lungeSpeed);
                this.setTint(0xff8888);
            }

            // Check hit during lunge
            if (this.target && !this.target.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < 35) {
                    const knockDir = this.target.x > this.x ? 1 : -1;
                    this.target.takeDamage(this.damage, knockDir);
                    this.setVelocityX(0);
                    this.stateTimer = 600;
                }
            }
        } else {
            this.isLunging = false;
            this.clearTint();
            this.setVelocityX(0);
            this.setState('CHASE');
        }
    }

    updateBossAttack(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);

        if (this.stateTimer > this.attackCooldown) {
            this.setState('CHASE');
        }
    }
}
