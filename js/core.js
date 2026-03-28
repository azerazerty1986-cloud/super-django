/* ================================================================== */
/* ===== [01] الملف: 01-core.js - الأساسيات ===== */
/* ================================================================== */

const CONFIG = {
    appName: 'ناردو برو',
    version: '3.0.0',
    
    telegram: {
        botToken: '8576673096:AAECPDHWRTVQ_juq68hxM9PIdacnqevGRb4',
        channelId: '-1003822964890',
        adminId: '7461896689',
        apiUrl: 'https://api.telegram.org/bot'
    },
    
    phone: '05687111113666',
    currency: 'دج',
    shipping: 800,
    platformFee: 0.05,
    minWithdraw: 1000,
    
    defaultImage: 'https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300',
    defaultAvatar: 'https://i.pravatar.cc/150?u='
};

const IDSystem = {
    counters: {
        admin: 1,
        merchant: 1000,
        distributor: 2000,
        delivery: 3000,
        content_creator: 4000,
        customer: 5000,
        product: 1,
        order: 1,
        reel: 1
    },
    
    prefixes: {
        admin: 'ADM',
        merchant: 'MER',
        distributor: 'DIS',
        delivery: 'DEL',
        content_creator: 'CRE',
        customer: 'CUS',
        product: 'PRD'
    },
    
    loadCounters() {
        const saved = Utils.load('id_counters');
        if (saved) {
            this.counters = { ...this.counters, ...saved };
        }
    },
    
    saveCounters() {
        Utils.save('id_counters', this.counters);
    },
    
    generateId(type, options = {}) {
        this.counters[type] = (this.counters[type] || 0) + 1;
        const prefix = this.prefixes[type] || 'GEN';
        const number = this.counters[type].toString().padStart(4, '0');
        this.saveCounters();
        return `${prefix}_${number}`;
    },
    
    generateUserId(role) {
        switch(role) {
            case 'admin': return this.generateId('admin');
            case 'merchant': return this.generateId('merchant');
            case 'distributor': return this.generateId('distributor');
            case 'delivery': return this.generateId('delivery');
            case 'content_creator': return this.generateId('content_creator');
            default: return this.generateId('customer');
        }
    },
    
    generateProductId(ownerId) {
        this.counters.product++;
        const productNum = this.counters.product.toString().padStart(6, '0');
        this.saveCounters();
        const cleanOwnerId = ownerId.replace(/[^A-Za-z0-9_]/g, '');
        return `${cleanOwnerId}_PRD_${productNum}`;
    },
    
    extractOwnerId(productId) {
        if (!productId) return null;
        const parts = productId.split('_PRD_');
        return parts[0];
    },
    
    parseId(id) {
        const parts = id.split('_');
        const prefix = parts[0];
        let type = 'unknown';
        for (const [key, value] of Object.entries(this.prefixes)) {
            if (value === prefix) {
                type = key;
                break;
            }
        }
        return { id, prefix, type, parts };
    }
};

const FingerprintSystem = {
    fingerprint: null,
    
    generate() {
        const components = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.language,
            Date.now()
        ];
        const hash = this.hashString(components.join('###'));
        this.fingerprint = `FP_${hash.slice(0, 8)}`;
        return this.fingerprint;
    },
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).toUpperCase();
    },
    
    init() {
        this.fingerprint = this.generate();
        console.log('🆔 بصمة الجهاز:', this.fingerprint);
    }
};

const Utils = {
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp * 1000);
        const seconds = Math.floor((now - past) / 1000);
        if (seconds < 60) return `منذ ${seconds} ثانية`;
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        return `منذ ${Math.floor(seconds / 86400)} يوم`;
    },
    
    showNotification(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let icon = '✅';
        if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'info') icon = 'ℹ️';
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${icon} ${message}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('خطأ في الحفظ:', e);
            return false;
        }
    },
    
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    },
    
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.CONFIG = CONFIG;
window.IDSystem = IDSystem;
window.Fingerprint = FingerprintSystem;
window.Utils = Utils;

Fingerprint.init();
IDSystem.loadCounters();

console.log('✅ نظام الأساسيات جاهز');
