class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    init(data) {
        this.playerHP = data.hp || PLAYER_MAX_HP;
        this.playerMaxHP = data.maxHp || PLAYER_MAX_HP;
        this.playerTuning = data.tuning || 0;
        this.playerMaxTuning = data.maxTuning || PLAYER_MAX_TUNING;
        this.playerLives = data.lives || PLAYER_LIVES;
        this.playerScore = data.score || 0;
        this.levelName = data.level || '';
        this.hasTuning = data.hasTuning || false;
    }

    create() {
        // Portrait
        this.portrait = this.add.image(30, 30, 'portrait_murdoch').setOrigin(0, 0).setScale(1);

        // HP Bar
        this.add.text(85, 30, 'HP', { fontFamily: 'monospace', fontSize: '11px', color: '#44cc44' });
        this.hpBarBg = this.add.image(105, 36, 'hp_bar_bg').setOrigin(0, 0.5);
        this.hpBarFill = this.add.image(107, 36, 'hp_bar_fill').setOrigin(0, 0.5);
        this.hpText = this.add.text(210, 28, `${Math.ceil(this.playerHP)}`, {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
        });

        // Tuning Bar
        this.add.text(85, 50, 'TN', { fontFamily: 'monospace', fontSize: '11px', color: '#4488ff' });
        this.tuningBarBg = this.add.image(105, 56, 'hp_bar_bg').setOrigin(0, 0.5);
        this.tuningBarFill = this.add.image(107, 56, 'tuning_bar_fill').setOrigin(0, 0.5);
        this.tuningText = this.add.text(210, 48, `${Math.ceil(this.playerTuning)}`, {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
        });

        if (!this.hasTuning) {
            this.tuningBarBg.setAlpha(0.3);
            this.tuningBarFill.setAlpha(0.3);
            this.tuningText.setAlpha(0.3);
        }

        // Lives
        this.livesText = this.add.text(85, 68, `Lives: ${this.playerLives}`, {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
        });

        // Score
        this.scoreText = this.add.text(GAME_WIDTH - 20, 30, `Score: ${this.playerScore}`, {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffcc44'
        }).setOrigin(1, 0);

        // Level name (shows briefly)
        this.levelText = this.add.text(GAME_WIDTH / 2, 30, this.levelName, {
            fontFamily: 'monospace', fontSize: '16px', color: '#4488ff'
        }).setOrigin(0.5, 0).setAlpha(1);

        this.tweens.add({
            targets: this.levelText,
            alpha: 0,
            delay: 3000,
            duration: 1000,
        });

        // Boss HP bar (hidden by default)
        this.bossNameText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ff4444'
        }).setOrigin(0.5, 0.5).setAlpha(0);

        this.bossHPBg = this.add.graphics();
        this.bossHPBg.fillStyle(0x000000, 0.7);
        this.bossHPBg.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);
        this.bossHPBg.lineStyle(1, 0x666666);
        this.bossHPBg.strokeRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);
        this.bossHPBg.setAlpha(0);

        this.bossHPFill = this.add.graphics();
        this.bossHPFill.setAlpha(0);

        // Boss HP lag bar (orange, shrinks slower than main bar)
        this.bossHPLag = this.add.graphics();
        this.bossHPLag.setAlpha(0);
        this.bossCurrentRatio = 1.0;
        this.bossLagRatio = 1.0;

        // Combo counter display
        this.comboText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffcc44',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        this.comboSubText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 55, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ff8844',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        // Low HP warning reference
        this.lowHPWarning = null;
        this.lowHPPulse = null;
    }

    updateHP(hp, maxHp) {
        if (!this.hpBarFill || !this.hpText) return;
        this.playerHP = hp;
        this.playerMaxHP = maxHp;
        const ratio = Math.max(0, hp / maxHp);
        this.hpBarFill.setScale(ratio, 1);
        this.hpText.setText(`${Math.ceil(hp)}`);

        // Color change at low HP
        if (ratio < 0.3) {
            this.hpBarFill.setTint(0xff4444);
        } else if (ratio < 0.6) {
            this.hpBarFill.setTint(0xffaa44);
        } else {
            this.hpBarFill.clearTint();
        }

        // Low HP warning - pulsing red border
        if (ratio < 0.25) {
            if (!this.lowHPWarning) {
                this.lowHPWarning = this.add.graphics();
                this.lowHPWarning.lineStyle(3, 0xff0000, 0.5);
                this.lowHPWarning.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
                this.lowHPWarning.setDepth(50);
                this.lowHPPulse = this.tweens.add({
                    targets: this.lowHPWarning,
                    alpha: { from: 0.6, to: 0.1 },
                    yoyo: true,
                    repeat: -1,
                    duration: 600,
                });
            }
        } else if (this.lowHPWarning) {
            if (this.lowHPPulse) this.lowHPPulse.stop();
            this.lowHPWarning.destroy();
            this.lowHPWarning = null;
            this.lowHPPulse = null;
        }
    }

    updateTuning(tuning, maxTuning) {
        if (!this.tuningBarFill || !this.tuningText) return;
        this.playerTuning = tuning;
        this.playerMaxTuning = maxTuning;
        const ratio = Math.max(0, tuning / maxTuning);
        this.tuningBarFill.setScale(ratio, 1);
        this.tuningText.setText(`${Math.ceil(tuning)}`);

        // Show tuning bar when unlocked
        if (!this.hasTuning && tuning > 0) {
            this.hasTuning = true;
            this.tuningBarBg.setAlpha(1);
            this.tuningBarFill.setAlpha(1);
            this.tuningText.setAlpha(1);
        }
    }

    updateLives(lives) {
        if (!this.livesText) return;
        this.playerLives = lives;
        this.livesText.setText(`Lives: ${lives}`);
    }

    updateScore(score) {
        if (!this.scoreText) return;
        this.playerScore = score;
        this.scoreText.setText(`Score: ${score}`);
    }

    showBossName(name) {
        if (!this.bossNameText || !this.bossHPBg || !this.bossHPFill) return;
        this.bossNameText.setText(name);
        this.bossNameText.setAlpha(1);
        this.bossHPBg.setAlpha(1);
        this.bossHPFill.setAlpha(1);

        // Draw initial full HP
        this.bossHPFill.clear();
        this.bossHPFill.fillStyle(0xff4444, 1);
        this.bossHPFill.fillRect(GAME_WIDTH / 2 - 148, GAME_HEIGHT - 43, 296, 12);

        // Show lag bar and reset ratios
        this.bossHPLag.setAlpha(1);
        this.bossCurrentRatio = 1.0;
        this.bossLagRatio = 1.0;
    }

    updateBossHP(hp, maxHp) {
        if (!this.bossHPFill) return;
        const newRatio = Math.max(0, hp / maxHp);
        const oldRatio = this.bossCurrentRatio || 1.0;
        this.bossCurrentRatio = newRatio;

        // Lag bar (orange) - tween to new value slower
        if (this.bossLagTween) this.bossLagTween.stop();
        const lagTarget = { ratio: this.bossLagRatio };
        this.bossLagTween = this.tweens.add({
            targets: lagTarget,
            ratio: newRatio,
            duration: 600,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                this.bossLagRatio = lagTarget.ratio;
                this.bossHPLag.clear();
                this.bossHPLag.fillStyle(0xff8844, 0.7);
                this.bossHPLag.fillRect(GAME_WIDTH / 2 - 148, GAME_HEIGHT - 43, 296 * lagTarget.ratio, 12);
            }
        });

        // Main HP bar (red) - instant
        this.bossHPFill.clear();

        // Color based on health
        let barColor = 0xff4444;
        if (newRatio < 0.25) barColor = 0xff2222;
        else if (newRatio < 0.5) barColor = 0xff6644;

        this.bossHPFill.fillStyle(barColor, 1);
        this.bossHPFill.fillRect(GAME_WIDTH / 2 - 148, GAME_HEIGHT - 43, 296 * newRatio, 12);

        // Flash border on damage
        if (newRatio < oldRatio) {
            this.bossHPBg.clear();
            this.bossHPBg.fillStyle(0x000000, 0.7);
            this.bossHPBg.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);
            this.bossHPBg.lineStyle(2, 0xffffff);
            this.bossHPBg.strokeRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);

            this.time.delayedCall(100, () => {
                if (!this.bossHPBg) return;
                this.bossHPBg.clear();
                this.bossHPBg.fillStyle(0x000000, 0.7);
                this.bossHPBg.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);
                this.bossHPBg.lineStyle(1, 0x666666);
                this.bossHPBg.strokeRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 45, 300, 16);
            });
        }
    }

    hideBossHP() {
        if (!this.bossNameText || !this.bossHPBg || !this.bossHPFill) return;
        this.bossNameText.setAlpha(0);
        this.bossHPBg.setAlpha(0);
        this.bossHPFill.setAlpha(0);
        if (this.bossHPLag) this.bossHPLag.setAlpha(0);
    }

    showCombo(count) {
        if (!this.comboText || count < 2) return;

        this.comboText.setText(`${count} HIT`);
        this.comboText.setAlpha(1);
        this.comboText.setScale(1.5);

        // Color escalation
        if (count >= 5) {
            this.comboText.setColor('#ff4444');
            this.comboSubText.setText('AMAZING!');
        } else if (count >= 3) {
            this.comboText.setColor('#ff8844');
            this.comboSubText.setText('COMBO!');
        } else {
            this.comboText.setColor('#ffcc44');
            this.comboSubText.setText('');
        }
        this.comboSubText.setAlpha(1);

        // Scale punch animation
        if (this.comboTween) this.comboTween.stop();
        this.comboTween = this.tweens.add({
            targets: this.comboText,
            scale: 1,
            alpha: 0.9,
            duration: 200,
            ease: 'Back.easeOut',
        });
    }

    hideCombo() {
        if (!this.comboText) return;
        this.tweens.add({
            targets: [this.comboText, this.comboSubText],
            alpha: 0,
            duration: 300,
        });
    }

    showDamageNumber(worldX, worldY, damage, isCritical) {
        // Convert world position to screen position
        // HUD scene doesn't scroll, so we receive screen-relative coordinates from the caller
        const color = isCritical ? '#ff4444' : '#ffffff';
        const size = isCritical ? '16px' : '13px';

        const dmgText = this.add.text(worldX, worldY, `-${Math.ceil(damage)}`, {
            fontFamily: 'monospace',
            fontSize: size,
            color: color,
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: dmgText,
            y: worldY - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => dmgText.destroy(),
        });
    }

    showScorePopup(screenX, screenY, points) {
        const popup = this.add.text(screenX, screenY, `+${points}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffcc44',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: screenY - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }
}
