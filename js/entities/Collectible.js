class Collectible extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        const textureMap = {
            'health': 'health_pickup',
            'tuning': 'tuning_pickup',
            'memory': 'memory_fragment',
        };

        super(scene, x, y, textureMap[type] || 'memory_fragment');
        scene.add.existing(this);
        scene.physics.add.existing(this, false);

        this.collectType = type;
        this.body.setAllowGravity(false);
        this.collected = false;

        // Bob animation
        this.startY = y;
        this.bobSpeed = 2 + Math.random();
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update(time, delta) {
        if (this.collected) return;
        // Gentle bob
        this.y = this.startY + Math.sin(time * 0.003 * this.bobSpeed + this.bobOffset) * 5;
    }

    collect(player) {
        if (this.collected) return;
        this.collected = true;

        switch (this.collectType) {
            case 'health':
                player.heal(25);
                break;
            case 'tuning':
                player.addTuningEnergy(30);
                break;
            case 'memory':
                player.memoryFragments++;
                player.addScore(200);
                break;
        }

        this.scene.events.emit('collectiblePickup', this.collectType);

        // Collection effect
        if (this.scene.particleEffects) {
            const color = this.collectType === 'health' ? 'particle_red' :
                          this.collectType === 'tuning' ? 'particle_blue' : 'particle_yellow';
            this.scene.particleEffects.collect(this.x, this.y, color);
        }

        // Animate and destroy
        this.scene.tweens.add({
            targets: this,
            y: this.y - 30,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: () => this.destroy()
        });
    }
}
