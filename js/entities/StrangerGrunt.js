class StrangerGrunt extends Enemy {
    constructor(scene, x, y, patrolMin, patrolMax) {
        super(scene, x, y, 'stranger_grunt', {
            hp: GRUNT_HP,
            speed: GRUNT_SPEED,
            damage: GRUNT_DAMAGE,
            detectRange: GRUNT_DETECT_RANGE,
            attackRange: GRUNT_ATTACK_RANGE,
            attackCooldown: 1000,
            scoreValue: 100,
            patrolMin: patrolMin,
            patrolMax: patrolMax,
        });

        this.body.setSize(20, 44);
        this.body.setOffset(4, 4);

        // Group coordination
        this.flankOffset = 0;
    }

    updateChase(time, delta) {
        if (!this.target || this.target.isDead) {
            this.setState('PATROL');
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (dist > this.detectRange * 2.5) {
            this.setState('PATROL');
            return;
        }

        if (dist < this.attackRange) {
            this.setState('ATTACK');
            return;
        }

        // Check for other grunts nearby for flanking
        const nearbyGrunts = this.scene.enemies.getChildren().filter(e =>
            e !== this && e instanceof StrangerGrunt && !e.isDead &&
            Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) < 150
        );

        let targetX = this.target.x;
        if (nearbyGrunts.length > 0) {
            // Try to flank - go to opposite side of other grunts
            const otherSide = nearbyGrunts[0].x > this.target.x ? -1 : 1;
            targetX = this.target.x + otherSide * 50;
        }

        const dir = targetX > this.x ? 1 : -1;
        this.setVelocityX(this.speed * dir);
    }

    updateAttack(time, delta) {
        this.setVelocityX(0);
        this.stateTimer += delta;

        // Lunge forward slightly during attack
        if (this.stateTimer > 100 && this.stateTimer < 200) {
            const dir = this.target && this.target.x > this.x ? 1 : -1;
            this.setVelocityX(dir * 80);
        }

        if (this.stateTimer > 200 && this.stateTimer < 350) {
            if (this.target && !this.target.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < this.attackRange + 15) {
                    const knockDir = this.target.x > this.x ? 1 : -1;
                    this.target.takeDamage(this.damage, knockDir);
                    this.stateTimer = 500; // Skip to cooldown
                }
            }
        }

        if (this.stateTimer > this.attackCooldown) {
            this.setState('CHASE');
        }
    }
}
