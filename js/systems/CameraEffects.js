class CameraEffects {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.baseZoom = 1;
    }

    shake(duration, intensity) {
        this.camera.shake(duration, intensity);
    }

    flash(duration, color) {
        const r = ((color || 0xffffff) >> 16) & 0xff;
        const g = ((color || 0xffffff) >> 8) & 0xff;
        const b = (color || 0xffffff) & 0xff;
        this.camera.flash(duration, r, g, b);
    }

    fadeOut(duration, color, callback) {
        const r = ((color || 0x000000) >> 16) & 0xff;
        const g = ((color || 0x000000) >> 8) & 0xff;
        const b = (color || 0x000000) & 0xff;
        this.camera.fadeOut(duration, r, g, b);
        if (callback) {
            this.camera.once('camerafadeoutcomplete', callback);
        }
    }

    fadeIn(duration, color) {
        const r = ((color || 0x000000) >> 16) & 0xff;
        const g = ((color || 0x000000) >> 8) & 0xff;
        const b = (color || 0x000000) & 0xff;
        this.camera.fadeIn(duration, r, g, b);
    }

    zoomTo(zoom, duration) {
        this.camera.zoomTo(zoom, duration);
    }

    pan(x, y, duration, callback) {
        this.camera.pan(x, y, duration);
        if (callback) {
            this.camera.once('camerapancomplete', callback);
        }
    }

    slowMo(duration) {
        this.scene.time.timeScale = 0.3;
        this.scene.time.delayedCall(duration * 0.3, () => {
            this.scene.time.timeScale = 1;
        });
    }

    koFlash() {
        // Brief zoom in + flash + slowmo on killing blow (Neo Geo style)
        this.camera.zoomTo(1.3, 200, 'Power2');
        this.flash(100, 0xffffff);

        // Slowmo for dramatic effect
        this.scene.time.timeScale = 0.3;

        // Snap back to base zoom (1.15x during boss fights, 1x otherwise)
        this.scene.time.delayedCall(200 * 0.3, () => {
            this.camera.zoomTo(this.baseZoom, 300, 'Power2');
            this.scene.time.timeScale = 1;
        });
    }

    bossZoom(zoomLevel) {
        this.baseZoom = zoomLevel || 1.15;
        this.camera.zoomTo(this.baseZoom, 1000, 'Power2');
    }

    bossZoomReset() {
        this.baseZoom = 1;
        this.camera.zoomTo(1, 500, 'Power2');
    }

    hitFreeze(duration) {
        this.scene.physics.pause();
        this.scene.time.delayedCall(duration, () => {
            this.scene.physics.resume();
        });
    }

    cinematicPan(targetX, targetY, duration, callback) {
        // Disable player input during pan
        if (this.scene.player) {
            this.scene.player.setVelocity(0, 0);
        }
        this.scene.input.keyboard.enabled = false;

        this.camera.pan(targetX, targetY, duration || 1000, 'Power2');
        this.camera.once('camerapancomplete', () => {
            if (callback) callback();
        });
    }
}
