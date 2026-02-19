class MrWall extends Enemy {
    constructor(scene, x, y, patrolMin, patrolMax) {
        super(scene, x, y, 'mr_wall', {
            hp: MRWALL_HP,
            speed: MRWALL_SPEED,
            damage: 25,
            detectRange: 300,
            attackRange: 50,
            attackCooldown: 2000,
            scoreValue: 300,
            patrolMin: patrolMin,
            patrolMax: patrolMax,
            knockbackResist: 3,
        });

        this.body.setSize(30, 48);
        this.body.setOffset(3, 4);

        // Charge attack
        this.isCharging = false;
        this.chargeSpeed = MRWALL_CHARGE_SPEED;
        this.chargeCooldown = 4000;
        this.lastChargeTime = 0;
        this.chargeDir = 0;
    }

    update(time, delta) {
        if (this.isDead) return;

        this.target = this.scene.player;

        switch (this.state) {
            case 'IDLE':
                this.updateIdle(time, delta);
                break;
            case 'PATROL':
                this.updatePatrol(time, delta);
                break;
            case 'ALERT':
                this.updateAlert(time, delta);
                break;
            case 'CHASE':
                this.updateWallChase(time, delta);
                break;
            case 'CHARGE_WINDUP':
                this.updateChargeWindup(time, delta);
                break;
            case 'CHARGE':
                this.updateCharge(time, delta);
                break;
            case 'ATTACK':
                this.updateAttack(time, delta);
                break;
            case 'HURT':
                this.updateHurt(time, delta);
                break;
        }

        if (this.body.velocity.x > 0) this.facingRight = true;
        else if (this.body.velocity.x < 0) this.facingRight = false;
        this.setFlipX(this.facingRight);
    }

    updateWallChase(time, delta) {
        if (!this.target || this.target.isDead) {
            this.setState('PATROL');
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const dx = Math.abs(this.x - this.target.x);
        const dy = Math.abs(this.y - this.target.y);

        if (dist > this.detectRange * 2) {
            this.setState('PATROL');
            return;
        }

        // Charge if player is in line of sight horizontally
        if (dy < 30 && dx > 80 && dx < 400 && time - this.lastChargeTime > this.chargeCooldown) {
            this.setState('CHARGE_WINDUP');
            this.lastChargeTime = time;
            return;
        }

        if (dist < this.attackRange) {
            this.setState('ATTACK');
            return;
        }

        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * dir);
    }

    updateChargeWindup(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(0);

        // Flash red during windup
        this.setTint(this.stateTimer % 200 < 100 ? 0xff4444 : 0xffffff);

        if (this.stateTimer > 800) {
            this.clearTint();
            this.chargeDir = this.target && this.target.x > this.x ? 1 : -1;
            this.setState('CHARGE');
        }
    }

    updateCharge(time, delta) {
        this.stateTimer += delta;
        this.setVelocityX(this.chargeDir * this.chargeSpeed);
        this.setTint(0xff6644);

        // Check hit during charge
        if (this.target && !this.target.isDead) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist < 40) {
                const knockDir = this.target.x > this.x ? 1 : -1;
                this.target.takeDamage(this.damage * 1.5, knockDir);
                this.target.setVelocity(knockDir * 400, -250);
            }
        }

        // Destroy breakable platforms during charge
        if (this.scene.breakableGroup) {
            this.scene.breakableGroup.getChildren().forEach(b => {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);
                if (dist < 30) {
                    if (this.scene.particleEffects) {
                        this.scene.particleEffects.hit(b.x, b.y);
                    }
                    b.destroy();
                }
            });
        }

        // Stop after duration or hitting wall
        if (this.stateTimer > 1500 || this.body.blocked.left || this.body.blocked.right) {
            this.clearTint();
            this.setVelocityX(0);

            // Stunned after charge
            if (this.body.blocked.left || this.body.blocked.right) {
                if (this.scene.cameraEffects) {
                    this.scene.cameraEffects.shake(200, 0.005);
                }
            }
            this.setState('IDLE');
            this.stateTimer = -1000; // Extra idle time (stunned)
        }
    }
}
