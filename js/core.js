
/* ================================================================== */
/* ===== [01] الملف: 01-core.js - الأساسيات ونظام المعرفات ===== */
/* ================================================================== */

// ===== [1.1] إعدادات المشروع =====
const CONFIG = {
    appName: 'ناردو برو',
    version: '3.0.0',
    
    // إعدادات تلغرام
    telegram: {
        botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
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
        delivery_company: 2000,
        delivery_person: 3000,
        content_creator: 4000,
        entertainer: 5000,
        customer: 6000,
        product: 1,
        order: 1,
        warehouse: 1,
        reel: 1,
        request: 1
    },
    
    // بادئات المعرفات
    prefixes: {
        admin: 'ADM',
        merchant: 'MER',
        delivery_company: 'DLC',
        delivery_person: 'DLP',
        content_creator: 'CRC',
        entertainer: 'ENT',
        customer: 'CUS',
        product: 'PRD',
        order: 'ORD',
        warehouse: 'WRH',
        reel: 'REL',
        request: 'REQ'
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
        // زيادة العداد
        this.counters[type] = (this.counters[type] || 0) + 1;
        
        // الحصول على البادئة
        const prefix = this.prefixes[type] || 'GEN';
        
        // تنسيق الرقم (6 أرقام)
        const number = this.counters[type].toString().padStart(6, '0');
        
        // إضافة تاريخ إذا طلب
        const date = options.includeDate ? `_${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}` : '';
        
        // إضافة بصمة إذا طلب
        const fingerprint = options.includeFingerprint && window.Fingerprint ? `_${Fingerprint.fingerprint.slice(0, 4)}` : '';
        
        // المعرف النهائي
        const id = `${prefix}${date}${fingerprint}_${number}`;
        
        // حفظ العدادات
        this.saveCounters();
        
        return id;
    },
    
    // إنشاء معرف للتاجر
    generateMerchantId(merchantData) {
        return this.generateId('merchant', { includeDate: true, includeFingerprint: true });
    },
    
    // إنشاء معرف لمنتج (مرتبط بالتاجر)
    generateProductId(merchantId) {
        this.counters.product++;
        const productNum = this.counters.product.toString().padStart(6, '0');
        this.saveCounters();
        return `${merchantId}_PRD_${productNum}`;
    },
    
    // إنشاء معرف لمستودع
    generateWarehouseId(merchantId) {
        this.counters.warehouse++;
        const warehouseNum = this.counters.warehouse.toString().padStart(4, '0');
        this.saveCounters();
        return `WRH_${merchantId}_${warehouseNum}`;
    },
    
    // تحليل المعرف
    parseId(id) {
        const parts = id.split('_');
        const prefix = parts[0];
        
        // تحديد النوع من البادئة
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
    
    // إنشاء بصمة فريدة
    generate() {
        const components = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown',
            Date.now()
        ];
        
        const hash = this.hashString(components.join('###'));
        this.fingerprint = `FP_${hash.slice(0, 12)}`;
        return this.fingerprint;
    },
    
    // تحويل النص إلى hash
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).toUpperCase();
    },
    
    // التهيئة
    init() {
        this.fingerprint = this.generate();
        console.log('🆔 بصمة الجهاز:', this.fingerprint);
    }
};

// ===== [1.4] دوال مساعدة =====
const Utils = {
    // تنسيق الأرقام (1K, 1M)
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    // حساب الوقت المنقضي
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp * 1000);
        const seconds = Math.floor((now - past) / 1000);
        
        if (seconds < 60) return `منذ ${seconds} ثانية`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
        
        const years = Math.floor(days / 365);
        return `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`;
    },
    
    // إظهار إشعار
    showNotification(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('toastContainer غير موجود');
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // اختيار الأيقونة حسب النوع
        let icon = '✅';
        if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'info') icon = 'ℹ️';
        
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${icon} ${message}`;
        
        container.appendChild(toast);
        
        // إزالة الإشعار بعد 3 ثوان
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    },
    
    // حفظ في localStorage
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('خطأ في الحفظ:', e);
            return false;
        }
    },
    
    // تحميل من localStorage
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('خطأ في التحميل:', e);
            return defaultValue;
        }
    },
    
    // فتح نافذة
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    },
    
    // إغلاق نافذة
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    // التمرير للأعلى
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    // التمرير للأسفل
    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    
    // نسخ نص
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('تم النسخ', 'success');
        }).catch(() => {
            this.showNotification('فشل النسخ', 'error');
        });
    }
};

// ===== [1.5] تهيئة الأنظمة =====
window.CONFIG = CONFIG;
window.IDSystem = IDSystem;
window.Fingerprint = FingerprintSystem;
window.Utils = Utils;

// تهيئة البصمة
Fingerprint.init();
IDSystem.loadCounters();

console.log('✅ نظام المعرفات جاهز');
