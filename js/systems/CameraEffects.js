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
        // Use gentle zoom: baseZoom + 0.1 (not a hard 1.3x)
        const targetZoom = this.baseZoom + 0.1;
        this.camera.zoomTo(targetZoom, 150, 'Sine.easeOut');
        this.flash(80, 0xffffff);

        // Slowmo for dramatic effect
        this.scene.time.timeScale = 0.3;

        // Snap back smoothly - use real-time delay (not scaled by slowmo)
        // delayedCall uses scene time, so multiply by timeScale to get real ms
        this.scene.time.delayedCall(150, () => {
            this.camera.zoomTo(this.baseZoom, 400, 'Sine.easeInOut');
            this.scene.time.timeScale = 1;
        });
    }

    bossZoom(zoomLevel) {
        this.baseZoom = zoomLevel || 1.1;
        this.camera.zoomTo(this.baseZoom, 1500, 'Sine.easeInOut');
    }

    bossZoomReset() {
        this.baseZoom = 1;
        this.camera.zoomTo(1, 1200, 'Sine.easeInOut');
    }

    hitFreeze(duration) {
        this.scene.physics.pause();
        this.scene.time.delayedCall(duration, () => {
            this.scene.physics.resume();
        });
    }

    cinematicPan(targetX, targetY, duration, callback) {
        // Register listener BEFORE starting pan to avoid race condition
        this.camera.once('camerapancomplete', () => {
            if (callback) callback();
        });
        this.camera.pan(targetX, targetY, duration || 1000, 'Power2');
    }
}
