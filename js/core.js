/* ================================================================== */
/* ===== [01] الملف: 01-core.js - الأساسيات ونظام المعرفات ===== */
/* ================================================================== */

// ===== [1.1] إعدادات المشروع =====
const CONFIG = {
    appName: 'ناردو برو',
    version: '3.0.0',
    
    // إعدادات تلغرام
    telegram: {
        botToken: '8576673096:AAECPDHWRTVQ_juq68hxM9PIdacnqevGRb4',
        channelId: '-1003822964890',
        adminId: '7461896689',
        apiUrl: 'https://api.telegram.org/bot'
    },
    
    // إعدادات المدفوعات
    phone: '05687111113666',
    currency: 'دج',
    shipping: 800,
    platformFee: 0.05,
    minWithdraw: 1000,
    
    // الصور الافتراضية
    defaultImage: 'https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300',
    defaultAvatar: 'https://i.pravatar.cc/150?u='
};

// ===== [1.2] نظام المعرفات الفريدة =====
const IDSystem = {
    // عدادات لكل نوع
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
    
    // بادئات المعرفات
    prefixes: {
        admin: 'ADM',
        merchant: 'MER',
        distributor: 'DIS',
        delivery: 'DEL',
        content_creator: 'CRE',
        customer: 'CUS',
        product: 'PRD'
    },
    
    // تحميل العدادات
    loadCounters() {
        const saved = Utils.load('id_counters');
        if (saved) {
            this.counters = { ...this.counters, ...saved };
        }
    },
    
    // حفظ العدادات
    saveCounters() {
        Utils.save('id_counters', this.counters);
    },
    
    // إنشاء معرف فريد
    generateId(type, options = {}) {
        this.counters[type] = (this.counters[type] || 0) + 1;
        const prefix = this.prefixes[type] || 'GEN';
        const number = this.counters[type].toString().padStart(4, '0');
        this.saveCounters();
        return `${prefix}_${number}`;
    },
    
    // ===== [جديد] إنشاء معرف للمستخدم عند التسجيل =====
    generateUserId(role) {
        switch(role) {
            case 'admin':
                return this.generateId('admin');
            case 'merchant':
                return this.generateId('merchant');
            case 'distributor':
                return this.generateId('distributor');
            case 'delivery':
                return this.generateId('delivery');
            case 'content_creator':
                return this.generateId('content_creator');
            default:
                return this.generateId('customer');
        }
    },
    
    // ===== [جديد] إنشاء معرف للمنتج = معرف صاحبه + رقم تسلسلي =====
    generateProductId(ownerId) {
        this.counters.product++;
        const productNum = this.counters.product.toString().padStart(6, '0');
        this.saveCounters();
        
        // إزالة أي مسافات أو رموز غير مرغوب فيها من ownerId
        const cleanOwnerId = ownerId.replace(/[^A-Za-z0-9_]/g, '');
        
        // المنتج يأخذ معرف صاحبه + رقم تسلسلي
        return `${cleanOwnerId}_PRD_${productNum}`;
    },
    
    // ===== [جديد] استخراج معرف صاحب المنتج من معرف المنتج =====
    extractOwnerId(productId) {
        if (!productId) return null;
        const parts = productId.split('_PRD_');
        return parts[0];
    },
    
    // تحليل المعرف
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
        
        return {
            id: id,
            prefix: prefix,
            type: type,
            parts: parts
        };
    }
};

// ===== [1.3] نظام البصمة الرقمية =====
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

// ===== [1.4] دوال مساعدة =====
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
        document.getElementById(modalId)?.classList.add('show');
    },
    
    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('show');
    },
    
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
};

// ===== [1.5] تهيئة الأنظمة =====
window.CONFIG = CONFIG;
window.IDSystem = IDSystem;
window.Fingerprint = FingerprintSystem;
window.Utils = Utils;

Fingerprint.init();
IDSystem.loadCounters();

console.log('✅ نظام المعرفات جاهز - كل مستخدم له معرف، وكل منتج يحمل معرف صاحبه');
