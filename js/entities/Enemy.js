class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, config = {}) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        // Stats
        this.hp = config.hp || 30;
        this.maxHp = this.hp;
        this.speed = config.speed || 100;
        this.damage = config.damage || 10;
        this.detectRange = config.detectRange || 200;
        this.attackRange = config.attackRange || 40;
        this.attackCooldown = config.attackCooldown || 1000;
        this.lastAttackTime = 0;
        this.scoreValue = config.scoreValue || 100;
        this.isBoss = config.isBoss || false;

        // Patrol
        this.patrolMin = config.patrolMin || x - 100;
        this.patrolMax = config.patrolMax || x + 100;
        this.patrolDir = 1;

        // State machine
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.facingRight = false;
        this.isHurt = false;
        this.isDead = false;
        this.target = null;

        // Knockback
        this.knockbackResist = config.knockbackResist || 1;

        // Water weakness
        this.waterWeakness = WATER_DAMAGE_MULTIPLIER;

        // HP bar (for bosses)
        if (this.isBoss) {
            this.hpBar = null; // Created by HUD
        }

        // Set up spritesheet animations if available
        this.enemyAnimState = null;
        this.setupEnemyAnimations(texture);
    }

    setupEnemyAnimations(textureKey) {
        const sheetKey = textureKey + '_sheet';
        if (!this.scene.textures.exists(sheetKey)) return;

        // Read JSON metadata if available, otherwise use defaults
        const sheetData = this.scene.cache.json.get(sheetKey);
        const cols = (sheetData && sheetData.columns) || 2;
        const anims = this.scene.anims;
        const animList = (sheetData && sheetData.animations) || [];

        // Looping animation names (use yoyo for smooth ping-pong with 2 frames)
        const loopAnims = ['idle', 'walk', 'move', 'hover_idle'];

        if (animList.length > 0) {
            animList.forEach(a => {
                const key = textureKey + '_' + a.name;
                if (!anims.exists(key)) {
                    const start = a.row * cols;
                    const end = start + a.frameCount - 1;
                    const isLoop = loopAnims.includes(a.name);
                    anims.create({
                        key: key,
                        frames: anims.generateFrameNumbers(sheetKey, { start, end }),
                        frameRate: a.frameRate || 6,
                        repeat: isLoop ? -1 : 0,
                        yoyo: isLoop,
                    });
                }
            });
        }

        this.setTexture(sheetKey);
        const idleKey = textureKey + '_idle';
        const hoverKey = textureKey + '_hover_idle';
        if (anims.exists(idleKey)) {
            this.play(idleKey);
            this.enemyAnimState = 'idle';
        } else if (anims.exists(hoverKey)) {
            this.play(hoverKey);
            this.enemyAnimState = 'hover_idle';
        }
    }

    playEnemyAnim(animName) {
        if (!this.enemyAnimState && this.enemyAnimState !== null) return;
        const key = this.texture.key.replace('_sheet', '') + '_' + animName;
        if (this.scene.anims.exists(key) && this.enemyAnimState !== animName) {
            this.enemyAnimState = animName;
            this.play(key);
        }
    }

    update(time, delta) {
        if (this.isDead) return;

        // Get reference to player
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
                this.updateChase(time, delta);
                break;
            case 'ATTACK':
                this.updateAttack(time, delta);
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

    setState(newState) {
        this.state = newState;
        this.stateTimer = 0;

        // Play matching animation
        switch (newState) {
            case 'IDLE': this.playEnemyAnim('idle'); break;
            case 'PATROL': this.playEnemyAnim('walk'); break;
            case 'CHASE': this.playEnemyAnim('walk'); break;
            case 'ATTACK': this.playEnemyAnim('attack'); break;
            case 'HURT': this.playEnemyAnim('hurt'); break;
        }
    }

    updateIdle(time, delta) {
        this.setVelocityX(0);
        this.stateTimer += delta;

        // Check for player
        if (this.canSeePlayer()) {
            this.setState('ALERT');
            return;
        }

        // After idle period, start patrolling
        if (this.stateTimer > 1000 + Math.random() * 1000) {
            this.setState('PATROL');
        }
    }

    updatePatrol(time, delta) {
        // Move in patrol direction
        this.setVelocityX(this.speed * this.patrolDir * 0.6);

        // Reverse at patrol bounds
        if (this.x >= this.patrolMax) {
            this.patrolDir = -1;
        } else if (this.x <= this.patrolMin) {
            this.patrolDir = 1;
        }

        // Check for player
        if (this.canSeePlayer()) {
            this.setState('ALERT');
        }
    }

    updateAlert(time, delta) {
        this.setVelocityX(0);
        this.stateTimer += delta;

        // Brief alert pause then chase
        if (this.stateTimer > 300) {
            this.setState('CHASE');
        }
    }

    updateChase(time, delta) {
        if (!this.target || this.target.isDead) {
            this.setState('PATROL');
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Lost player
        if (dist > this.detectRange * 2) {
            this.setState('PATROL');
            return;
        }

        // Close enough to attack
        if (dist < this.attackRange) {
            this.setState('ATTACK');
            return;
        }

        // Move toward player
        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(this.speed * dir);
    }

    updateAttack(time, delta) {
        this.setVelocityX(0);
        this.stateTimer += delta;

        if (this.stateTimer > 200 && this.stateTimer < 400) {
            // Attack frame - deal damage
            if (this.target && !this.target.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < this.attackRange + 10) {
                    // Crouching dodges melee attacks at medium+ range (ducking under swings)
                    if (this.target.isCrouching && dist > this.attackRange * 0.4) {
                        // Attack swings overhead - miss
                    } else {
                        const knockDir = this.target.x > this.x ? 1 : -1;
                        this.target.takeDamage(this.damage, knockDir);
                    }
                }
            }
        }

        if (this.stateTimer > this.attackCooldown) {
            this.setState('CHASE');
        }
    }

    updateHurt(time, delta) {
        this.stateTimer += delta;
        if (this.stateTimer > 300) {
            this.isHurt = false;
            this.setState('CHASE');
        }
    }

    canSeePlayer() {
        if (!this.target || this.target.isDead) return false;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        return dist < this.detectRange;
    }

    takeDamage(amount, knockbackDir) {
        if (this.isDead) return;

        this.hp -= amount;
        this.isHurt = true;
        this.setState('HURT');

        // Knockback
        const kbForce = KNOCKBACK_FORCE / this.knockbackResist;
        this.setVelocity(knockbackDir * kbForce, -150);

        // Flash red
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => {
            if (!this.isDead) this.clearTint();
        });

        // Particle effect
        if (this.scene.particleEffects) {
            this.scene.particleEffects.hit(this.x, this.y);
        }

        // Update boss HP bar
        if (this.isBoss && this.scene.scene.get('HUDScene')) {
            this.scene.scene.get('HUDScene').updateBossHP(this.hp, this.maxHp);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.setVelocity(0, -200);
        this.playEnemyAnim('death');

        // Death effect
        if (this.scene.particleEffects) {
            this.scene.particleEffects.death(this.x, this.y);
        }

        // Score
        if (this.scene.player) {
            this.scene.player.addScore(this.scoreValue);
        }

        // Emit defeated event for bosses
        if (this.isBoss) {
            this.emit('defeated');
        }

        // Fade and destroy
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y - 30,
            duration: 800,
            onComplete: () => {
                this.destroy();
            }
        });
    }
}
