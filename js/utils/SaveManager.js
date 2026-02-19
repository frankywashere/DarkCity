class SaveManager {
    static SAVE_KEY = 'darkcity_save';

    static save(data) {
        try {
            localStorage.setItem(SaveManager.SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    }

    static load() {
        try {
            const data = localStorage.getItem(SaveManager.SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Load failed:', e);
            return null;
        }
    }

    static hasSave() {
        return localStorage.getItem(SaveManager.SAVE_KEY) !== null;
    }

    static clear() {
        localStorage.removeItem(SaveManager.SAVE_KEY);
    }
}
