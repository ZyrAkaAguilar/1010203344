// ZyrIsland Security Manager
const SecurityManager = {
    COOKIE_NAME: 'zyrisland_secure_token',

    generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            status: user.status,
            exp: Date.now() + (24 * 60 * 60 * 1000)
        };
        return `ZYR_SEC_${btoa(JSON.stringify(payload))}_HASH_${Date.now()}`;
    },

    setSessionCookie(user) {
        if (user.status !== 'active') return false;
        const token = this.generateToken(user);
        document.cookie = `${this.COOKIE_NAME}=${token}; path=/; max-age=86400; SameSite=Strict`;
        localStorage.setItem('zyrisland_user', JSON.stringify(user));
        return true;
    },

    getCookie() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${this.COOKIE_NAME}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },

    clearSession() {
        document.cookie = `${this.COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
        localStorage.removeItem('zyrisland_user');
    },

    async auditCurrentSession() {
        const stored = localStorage.getItem('zyrisland_user');
        const cookie = this.getCookie();

        if (!stored || !cookie) {
            this.clearSession();
            return null;
        }

        try {
            const user = JSON.parse(stored);
            const baseUrl = typeof ZYRISLAND_CONFIG !== 'undefined' ? ZYRISLAND_CONFIG.REMOTE_DATA_URL : './data';
            const res = await fetch(`${baseUrl}/users.json?t=${Date.now()}`);
            const data = await res.json();

            const freshUser = data.users.find(u => u.id === user.id);

            if (!freshUser || freshUser.status !== 'active') {
                this.clearSession();
                alert(`[SEGURIDAD ZYRISLAND] Tu cuenta (${user.username}) ha sido BANEADA o SUSPENDIDA.`);
                window.location.reload();
                return null;
            }

            return freshUser;
        } catch (e) {
            console.error('Audit Error:', e);
            return null;
        }
    }
};