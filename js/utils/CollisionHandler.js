class CollisionHandler {
    constructor(scene) {
        this.scene = scene;
        this.setupCollisions();
    }

    setupCollisions() {
        const s = this.scene;

        // Player vs ground/platforms/walls
        s.physics.add.collider(s.player, s.groundGroup);
        // Platforms are one-way: solid on top, can jump through from below
        s.physics.add.collider(s.player, s.platformGroup, null, (player, platform) => {
            return player.body.velocity.y >= 0 && player.body.bottom <= platform.body.top + 10;
        });
        s.physics.add.collider(s.player, s.wallGroup);
        if (s.breakableGroup) s.physics.add.collider(s.player, s.breakableGroup);

        // One-way platforms (type 6)
        if (s.onewayGroup) {
            s.physics.add.collider(s.player, s.onewayGroup, null, (player, platform) => {
                return player.body.velocity.y >= 0 && player.body.bottom <= platform.body.top + 10;
            });
        }

        // Enemy vs ground/platforms
        s.physics.add.collider(s.enemies, s.groundGroup);
        s.physics.add.collider(s.enemies, s.platformGroup, null, (enemy, platform) => {
            return enemy.body.velocity.y >= 0 && enemy.body.bottom <= platform.body.top + 10;
        });
        s.physics.add.collider(s.enemies, s.wallGroup);

        // Player vs hazards
        s.physics.add.overlap(s.player, s.hazardGroup, (player) => {
            player.takeDamage(20, 0);
        });

        // Player vs collectibles
        s.physics.add.overlap(s.player, s.collectibles, (player, collectible) => {
            collectible.collect(player);
        });

        // Player touching enemies (contact damage)
        s.physics.add.overlap(s.player, s.enemies, (player, enemy) => {
            if (!enemy.isDead && !player.isInvincible && enemy.state === 'ATTACK') {
                // Contact damage only during enemy attack state is handled in enemy class
            }
        });
    }
}
