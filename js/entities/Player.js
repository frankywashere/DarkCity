class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'murdoch');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(20, 44);
        this.body.setOffset(4, 4);

        // State
        this.hp = PLAYER_MAX_HP;
        this.maxHp = PLAYER_MAX_HP;
        this.tuningEnergy = 0; // Starts at 0, unlocked later
        this.maxTuning = PLAYER_MAX_TUNING;
        this.lives = PLAYER_LIVES;
        this.score = 0;
        this.memoryFragments = 0;

        // Ability flags
        this.hasTuning = false;
        this.hasDoublejump = false;
        this.hasSword = false;
        this.hasFullTuning = false;

        // Movement state
        this.isRunning = false;
        this.isCrouching = false;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackType = null;
        this.facingRight = true;

        // Jump state
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        this.jumpHeld = false;
        this.jumpTimer = 0;
        this.maxJumpTime = 200; // ms of variable jump height

        // Combat state
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.isHurt = false;
        this.isDead = false;
        this.attackHitbox = null;

        // Tuning state
        this.isTuning = false;
        this.tuningTarget = null;

        // Checkpoint
        this.checkpointX = x;
        this.checkpointY = y;

        // Health regen
        this.lastDamageTime = 0;
        this.regenDelay = 5000; // 5s after last damage
        this.regenRate = 2; // HP per second

        // Input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = {
            shift: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
            z: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            x: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
            c: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
            a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            esc: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
        };

        // Flash tween for invincibility
        this.flashTween = null;

        // Current animation state tracking
        this.currentAnimState = null;

        // Set up spritesheet animations if the real sheet was loaded
        this.setupAnimations();
    }

    setupAnimations() {
        if (this.scene.textures.exists('murdoch_sheet')) {
            const anims = this.scene.anims;
            const cols = 2; // 2 good frames per row in the sprite sheet

            // Each row is one animation, 2 frames per row
            // Looping anims use yoyo for smooth ping-pong (0,1,0,1...)
            const animDefs = [
                { key: 'murdoch_idle', row: 0, rate: 4, repeat: -1, yoyo: true },
                { key: 'murdoch_walk', row: 1, rate: 6, repeat: -1, yoyo: true },
                { key: 'murdoch_run', row: 2, rate: 8, repeat: -1, yoyo: true },
                { key: 'murdoch_jump', row: 3, rate: 6, repeat: 0 },
                { key: 'murdoch_fall', row: 4, rate: 4, repeat: -1, yoyo: true },
                { key: 'murdoch_crouch', row: 5, rate: 4, repeat: 0 },
                { key: 'murdoch_punch', row: 6, rate: 10, repeat: 0 },
                { key: 'murdoch_kick', row: 7, rate: 10, repeat: 0 },
                { key: 'murdoch_sword', row: 8, rate: 8, repeat: 0 },
                { key: 'murdoch_tuning', row: 9, rate: 6, repeat: -1, yoyo: true },
                { key: 'murdoch_hurt', row: 10, rate: 6, repeat: 0 },
                { key: 'murdoch_death', row: 11, rate: 4, repeat: 0 },
            ];

            animDefs.forEach(def => {
                const start = def.row * cols;
                const end = start + cols - 1;
                anims.create({
                    key: def.key,
                    frames: anims.generateFrameNumbers('murdoch_sheet', { start, end }),
                    frameRate: def.rate,
                    repeat: def.repeat,
                    yoyo: def.yoyo || false,
                });
            });

            // Switch to the spritesheet texture and start idle
            this.setTexture('murdoch_sheet');
            this.play('murdoch_idle');
            this.currentAnimState = 'idle';
        }
    }

    update(time, delta) {
        if (this.isDead) return;

        this.handleMovement(time, delta);
        this.handleJumping(time, delta);
        this.handleCombat(time, delta);
        this.handleTuning(time, delta);
        this.handleInvincibility(time, delta);
        this.handleRegen(time, delta);
        this.handlePause();

        // Update facing
        if (this.body.velocity.x > 0) this.facingRight = true;
        else if (this.body.velocity.x < 0) this.facingRight = false;
        this.setFlipX(this.facingRight);

        // Update attack hitbox position
        this.updateAttackHitbox();

        // Update sprite animation based on current state
        this.updateAnimation();
    }

    updateAnimation() {
        // Only update if we have spritesheet animations
        if (!this.scene.textures.exists('murdoch_sheet')) return;

        let newState = null;

        if (this.isDead) {
            newState = 'death';
        } else if (this.isHurt) {
            newState = 'hurt';
        } else if (this.isAttacking) {
            // Use the specific attack type animation
            if (this.attackType === 'punch') {
                newState = 'punch';
            } else if (this.attackType === 'kick') {
                newState = 'kick';
            } else if (this.attackType === 'sword') {
                newState = 'sword';
            }
        } else if (this.isTuning) {
            newState = 'tuning';
        } else if (this.isCrouching) {
            newState = 'crouch';
        } else if (!this.body.onFloor()) {
            if (this.body.velocity.y < 0) {
                newState = 'jump';
            } else {
                newState = 'fall';
            }
        } else if (Math.abs(this.body.velocity.x) > 0) {
            if (this.isRunning) {
                newState = 'run';
            } else {
                newState = 'walk';
            }
        } else {
            newState = 'idle';
        }

        // Only change animation if the state actually changed
        if (newState && newState !== this.currentAnimState) {
            const animKey = 'murdoch_' + newState;
            if (this.scene.anims.exists(animKey)) {
                this.play(animKey, true);
                this.currentAnimState = newState;
            }
        }

        // Apply sprite transforms to compensate for weak pose differentiation
        if (newState === 'jump') {
            this.setRotation(-0.15);
            this.setScale(1, 1);
        } else if (newState === 'fall') {
            this.setRotation(0.1);
            this.setScale(1, 1);
        } else if (newState === 'crouch') {
            this.setRotation(0);
            this.setScale(1.1, 0.65); // Squish down to look crouched
        } else if (newState === 'death') {
            // Progressive rotation handled by die() tween
        } else {
            this.setRotation(0);
            this.setScale(1, 1);
        }
    }

    handleMovement(time, delta) {
        if (this.isAttacking || this.isHurt) return;

        const onGround = this.body.onFloor();

        // Crouch
        if (this.cursors.down.isDown && onGround) {
            this.isCrouching = true;
            this.body.setSize(20, 30);
            this.body.setOffset(4, 18);
            // Allow slow movement while crouching (crawl under obstacles)
            const crouchSpeed = PLAYER_WALK_SPEED * 0.4;
            if (this.cursors.left.isDown) {
                this.setVelocityX(-crouchSpeed);
            } else if (this.cursors.right.isDown) {
                this.setVelocityX(crouchSpeed);
            } else {
                this.setVelocityX(0);
            }
            return;
        } else if (this.isCrouching) {
            this.isCrouching = false;
            this.body.setSize(20, 44);
            this.body.setOffset(4, 4);
        }

        // Horizontal movement
        this.isRunning = this.keys.shift.isDown;
        const speed = this.isRunning ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;

        if (this.cursors.left.isDown) {
            this.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.setVelocityX(speed);
        } else {
            this.setVelocityX(0);
        }
    }

    handleJumping(time, delta) {
        if (this.isHurt) return;
        const onGround = this.body.onFloor();

        // Reset double jump when landing
        if (onGround) {
            this.hasDoubleJumped = false;
            this.canDoubleJump = true;
        }

        // Jump initiation
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
            if (onGround) {
                this.setVelocityY(PLAYER_JUMP_VELOCITY);
                this.jumpHeld = true;
                this.jumpTimer = 0;
                this.scene.events.emit('playerJump');
            } else if (this.hasDoublejump && this.canDoubleJump && !this.hasDoubleJumped) {
                this.setVelocityY(PLAYER_DOUBLE_JUMP_VELOCITY);
                this.hasDoubleJumped = true;
                this.jumpHeld = true;
                this.jumpTimer = 0;
                this.scene.events.emit('playerDoubleJump');
            }
        }

        // Variable jump height
        if (this.jumpHeld && (this.cursors.up.isDown || this.cursors.space.isDown)) {
            this.jumpTimer += delta;
            if (this.jumpTimer < this.maxJumpTime) {
                this.setVelocityY(Math.max(this.body.velocity.y, PLAYER_JUMP_VELOCITY));
            } else {
                this.jumpHeld = false;
            }
        } else {
            this.jumpHeld = false;
        }
    }

    handleCombat(time, delta) {
        if (this.isAttacking) {
            this.attackTimer -= delta;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.attackType = null;
                this.destroyAttackHitbox();
            }
            return;
        }

        // Punch (Z)
        if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
            this.attack('punch', PUNCH_DAMAGE, 300, 30, 20);
        }
        // Kick (X)
        else if (Phaser.Input.Keyboard.JustDown(this.keys.x)) {
            this.attack('kick', KICK_DAMAGE, 450, 40, 24);
        }
        // Sword (C) - only if unlocked
        else if (Phaser.Input.Keyboard.JustDown(this.keys.c) && this.hasSword) {
            this.attack('sword', SWORD_DAMAGE, 400, 45, 30);
        }
    }

    attack(type, damage, duration, rangeX, rangeY) {
        this.isAttacking = true;
        this.attackType = type;
        this.attackTimer = duration;
        this.setVelocityX(0);

        // Create hitbox
        this.createAttackHitbox(damage, rangeX, rangeY);
        this.scene.events.emit('playerAttack', type);
    }

    createAttackHitbox(damage, rangeX, rangeY) {
        this.destroyAttackHitbox();

        const offsetX = this.facingRight ? rangeX / 2 + 10 : -(rangeX / 2 + 10);
        this.attackHitbox = this.scene.add.zone(
            this.x + offsetX,
            this.y,
            rangeX,
            rangeY
        );
        this.scene.physics.add.existing(this.attackHitbox, false);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.damage = damage;
        this.attackHitbox.attackType = this.attackType;
        this.attackHitbox.owner = this;

        // Register with combat system
        if (this.scene.combatSystem) {
            this.scene.combatSystem.registerPlayerAttack(this.attackHitbox);
        }
    }

    updateAttackHitbox() {
        if (this.attackHitbox) {
            const rangeX = this.attackHitbox.width;
            const offsetX = this.facingRight ? rangeX / 2 + 10 : -(rangeX / 2 + 10);
            this.attackHitbox.setPosition(this.x + offsetX, this.y);
        }
    }

    destroyAttackHitbox() {
        if (this.attackHitbox) {
            this.attackHitbox.destroy();
            this.attackHitbox = null;
        }
    }

    handleTuning(time, delta) {
        if (!this.hasTuning) return;

        if (this.keys.a.isDown && this.tuningEnergy > 0) {
            this.isTuning = true;
            this.tuningEnergy = Math.max(0, this.tuningEnergy - TUNING_DRAIN_RATE * (delta / 1000));

            // Tuning push/pull based on direction
            if (Phaser.Input.Keyboard.JustDown(this.keys.a)) {
                if (this.cursors.up.isDown && !this.body.onFloor() && this.hasFullTuning) {
                    // Create platform
                    this.scene.events.emit('tuningPlatform', this.x, this.y + 30);
                    this.tuningEnergy -= TUNING_PLATFORM_COST;
                }
            }

            this.scene.events.emit('tuningActive', this.x, this.y, this.facingRight);
        } else {
            if (this.isTuning) {
                this.isTuning = false;
                this.scene.events.emit('tuningDeactivate');
            }
            // Recharge tuning
            if (this.hasTuning) {
                this.tuningEnergy = Math.min(this.maxTuning,
                    this.tuningEnergy + TUNING_RECHARGE_RATE * (delta / 1000));
            }
        }

        // Tuning deflect (tap A)
        if (Phaser.Input.Keyboard.JustDown(this.keys.a) && this.tuningEnergy >= TUNING_DEFLECT_COST) {
            this.scene.events.emit('tuningDeflect', this.x, this.y, this.facingRight);
        }
    }

    handleInvincibility(time, delta) {
        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            // Flash effect
            this.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.setAlpha(1);
            }
        }
    }

    handleRegen(time, delta) {
        if (this.hp < this.maxHp && time - this.lastDamageTime > this.regenDelay) {
            this.hp = Math.min(this.maxHp, this.hp + this.regenRate * (delta / 1000));
        }
    }

    handlePause() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this.scene.scene.launch('PauseScene', { parentScene: this.scene.scene.key });
            this.scene.scene.pause();
        }
    }

    takeDamage(amount, knockbackDir) {
        if (this.isInvincible || this.isDead) return;

        this.hp -= amount;
        this.lastDamageTime = this.scene.time.now;
        this.isHurt = true;
        this.isInvincible = true;
        this.invincibleTimer = PLAYER_INVINCIBILITY_TIME;

        // Knockback
        const kbX = knockbackDir ? knockbackDir * KNOCKBACK_FORCE : 0;
        this.setVelocity(kbX, -200);

        this.scene.events.emit('playerHurt', this.hp, this.maxHp);

        // Recover from hurt after brief delay
        this.scene.time.delayedCall(300, () => {
            this.isHurt = false;
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.lives--;
        this.setVelocity(0, -300);
        this.scene.events.emit('playerDeath');

        // Death rotation tween to compensate for weak death pose
        this.scene.tweens.add({
            targets: this,
            rotation: Math.PI / 2,
            duration: 800,
            ease: 'Power2',
        });

        this.scene.time.delayedCall(1500, () => {
            if (this.lives > 0) {
                this.respawn();
            } else {
                this.scene.scene.start('GameOverScene', {
                    score: this.score,
                    level: this.scene.scene.key
                });
            }
        });
    }

    respawn() {
        this.isDead = false;
        this.hp = this.maxHp;
        this.isInvincible = true;
        this.invincibleTimer = PLAYER_INVINCIBILITY_TIME * 2;
        this.setPosition(this.checkpointX, this.checkpointY);
        this.setRotation(0);
        this.setVelocity(0, 0);
        this.setAlpha(1);
        this.scene.events.emit('playerRespawn', this.hp, this.maxHp, this.lives);
    }

    setCheckpoint(x, y) {
        this.checkpointX = x;
        this.checkpointY = y;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.scene.events.emit('playerHeal', this.hp, this.maxHp);
    }

    addTuningEnergy(amount) {
        this.tuningEnergy = Math.min(this.maxTuning, this.tuningEnergy + amount);
    }

    addScore(points) {
        this.score += points;
        this.scene.events.emit('scoreChange', this.score);
    }

    unlockTuning() {
        this.hasTuning = true;
        this.tuningEnergy = this.maxTuning;
    }

    unlockDoublejump() {
        this.hasDoublejump = true;
    }

    unlockSword() {
        this.hasSword = true;
    }

    unlockFullTuning() {
        this.hasFullTuning = true;
    }
}
