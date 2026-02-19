class CameraEffects {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
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
}
