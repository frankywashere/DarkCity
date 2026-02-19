class MidnightTuning {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
    }

    trigger(shiftablePlatforms) {
        if (this.isActive) return;
        this.isActive = true;

        // Screen flash
        if (this.scene.cameraEffects) {
            this.scene.cameraEffects.flash(500, 0x4444ff);
            this.scene.cameraEffects.shake(2000, 0.01);
        }

        // Show "MIDNIGHT" text
        const midnightText = this.scene.add.text(
            this.scene.cameras.main.scrollX + GAME_WIDTH / 2,
            this.scene.cameras.main.scrollY + GAME_HEIGHT / 2,
            'M I D N I G H T',
            {
                fontFamily: 'monospace',
                fontSize: '32px',
                color: '#4488ff',
                stroke: '#000000',
                strokeThickness: 4,
            }
        ).setOrigin(0.5).setDepth(200);

        this.scene.tweens.add({
            targets: midnightText,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 2000,
            onComplete: () => midnightText.destroy()
        });

        // Particle effects
        if (this.scene.particleEffects) {
            this.scene.particleEffects.midnightFlash(
                this.scene.cameras.main.scrollX + GAME_WIDTH / 2,
                this.scene.cameras.main.scrollY + GAME_HEIGHT / 2
            );
        }

        // Shift platforms
        this.scene.time.delayedCall(1000, () => {
            if (!shiftablePlatforms) return;

            // Find matching platform sprites and tween them
            const allPlatforms = [
                ...this.scene.platformGroup.getChildren(),
                ...this.scene.groundGroup.getChildren(),
            ];

            shiftablePlatforms.forEach(sp => {
                // Find closest platform to shift position
                let closest = null;
                let closestDist = Infinity;

                allPlatforms.forEach(p => {
                    const dist = Phaser.Math.Distance.Between(p.x, p.y, sp.x, sp.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = p;
                    }
                });

                if (closest && closestDist < TILE_SIZE * 2) {
                    this.scene.tweens.add({
                        targets: closest,
                        x: sp.newX,
                        y: sp.newY,
                        duration: 2000,
                        ease: 'Power2',
                        onComplete: () => {
                            closest.refreshBody();
                        }
                    });
                }
            });
        });

        // Reset active state
        this.scene.time.delayedCall(4000, () => {
            this.isActive = false;
        });
    }
}
