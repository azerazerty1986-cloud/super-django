/* ================================================================== */
/* ===== [01] الملف: 01-core.js - الأساسيات ونظام المعرفات ===== */
/* ================================================================== */

// ===== [1.1] إعدادات المشروع =====
const CONFIG = {
    appName: 'ناردو برو',
    version: '3.0.0',
    
    telegram: {
        botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
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

// ===== [1.2] نظام الأمان =====


// ===== [1.3] نظام المعرفات الفريدة =====
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

// ===== [1.4] نظام البصمة الرقمية =====
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

// ===== [1.5] دوال مساعدة =====
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
        const cleanMessage = SecuritySystem.sanitize(message);
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let icon = '✅';
        if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'info') icon = 'ℹ️';
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${icon} ${cleanMessage}`;
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
    },
    
    escapeHtml(text) {
        return SecuritySystem.sanitize(text);
    }
};

// ===== [1.6] نظام التوثيق عبر تلغرام =====
 
// ===== [1.7] تهيئة الأنظمة =====
window.CONFIG = CONFIG;
window.Security = SecuritySystem;
window.IDSystem = IDSystem;
window.Fingerprint = FingerprintSystem;
window.Utils = Utils;
window.TelegramAuth = TelegramAuth;

SecuritySystem.generateCSRFToken();
Fingerprint.init();
IDSystem.loadCounters();
TelegramAuth.loadPendingVerifications();
setInterval(() => TelegramAuth.cleanupExpiredCodes(), 60000);

// ===== نظام البيانات الموحدة (GlobalData) =====
const GlobalData = {
    products: null,
    reels: null,
    lastFetch: 0,
    fetching: false,
    
    // تحميل فوري من sessionStorage
    loadFromSession() {
        const savedProducts = sessionStorage.getItem('global_products');
        const savedReels = sessionStorage.getItem('global_reels');
        
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
            console.log(`📦 تحميل فوري: ${this.products.length} منتج`);
        }
        
        if (savedReels) {
            this.reels = JSON.parse(savedReels);
            console.log(`🎬 تحميل فوري: ${this.reels.length} ريلز`);
        }
        
        return { products: this.products, reels: this.reels };
    },
    
    // جلب الكل من تلغرام
    async fetchAll() {
        if (this.fetching) {
            while (this.fetching) await new Promise(r => setTimeout(r, 100));
            return { products: this.products, reels: this.reels };
        }
        
        this.fetching = true;
        
        try {
            const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/getUpdates?limit=100`;
            const response = await fetch(url);
            const data = await response.json();
            
            const products = [];
            const reels = [];
            
            for (const update of (data.result || []).reverse()) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                const text = post.caption || '';
                
                // المنتجات
                if (post.photo && (text.includes('🟣') || text.includes('منتج'))) {
                    let name = 'منتج', price = 1000, merchant = 'المتجر';
                    const lines = text.split('\n');
                    for (let line of lines) {
                        if (line.includes('المنتج:')) name = line.split(':')[1]?.trim() || name;
                        if (line.includes('السعر:')) price = parseInt(line.match(/\d+/)?.[0]) || price;
                        if (line.includes('التاجر:') || line.includes('الناشر:')) merchant = line.split(':')[1]?.trim() || merchant;
                    }
                    
                    let image = null;
                    if (post.photo) {
                        const fileId = post.photo[post.photo.length-1].file_id;
                        const fileRes = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/getFile?file_id=${fileId}`);
                        const fileData = await fileRes.json();
                        if (fileData.ok) {
                            image = `https://api.telegram.org/file/bot${CONFIG.telegram.botToken}/${fileData.result.file_path}`;
                        }
                    }
                    
                    products.push({
                        id: post.message_id,
                        name: SecuritySystem.sanitize(name),
                        price: price,
                        merchant: SecuritySystem.sanitize(merchant),
                        image: image || CONFIG.defaultImage,
                        stock: 10,
                        category: 'promo',
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                }
                
                // الريلز
                else if (post.video) {
                    let title = 'ريلز', publisher = 'ناردو برو';
                    const lines = text.split('\n');
                    for (let line of lines) {
                        if (line.includes('🎬')) title = line.replace('🎬', '').trim() || title;
                        if (line.includes('👤')) publisher = line.replace('👤', '').trim() || publisher;
                    }
                    
                    let videoUrl = null;
                    if (post.video) {
                        const fileRes = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/getFile?file_id=${post.video.file_id}`);
                        const fileData = await fileRes.json();
                        if (fileData.ok) {
                            videoUrl = `https://api.telegram.org/file/bot${CONFIG.telegram.botToken}/${fileData.result.file_path}`;
                        }
                    }
                    
                    reels.push({
                        id: post.message_id,
                        title: SecuritySystem.sanitize(title),
                        videoUrl: videoUrl,
                        publisher: SecuritySystem.sanitize(publisher),
                        serialNumber: text.match(/NARD-[A-Z0-9-]+/i)?.[0] || null,
                        date: new Date(post.date * 1000).toISOString()
                    });
                }
            }
            
            this.products = products;
            this.reels = reels;
            this.lastFetch = Date.now();
            
            // حفظ في sessionStorage
            sessionStorage.setItem('global_products', JSON.stringify(products));
            sessionStorage.setItem('global_reels', JSON.stringify(reels));
            
            console.log(`✅ جلب جديد: ${products.length} منتج, ${reels.length} ريلز`);
            return { products, reels };
            
        } catch(error) {
            console.error('❌ خطأ في الجلب:', error);
            return { products: this.products || [], reels: this.reels || [] };
        } finally {
            this.fetching = false;
        }
    },
    
    // الحصول على المنتجات (مع عرض فوري)
    async getProducts() {
        if (this.products) {
            return this.products;
        }
        
        const saved = sessionStorage.getItem('global_products');
        if (saved) {
            this.products = JSON.parse(saved);
            return this.products;
        }
        
        if (!this.fetching) {
            this.fetchAll();
        }
        
        await new Promise(r => setTimeout(r, 500));
        return this.products || [];
    },
    
    // الحصول على الريلز (مع عرض فوري)
    async getReels() {
        if (this.reels) {
            return this.reels;
        }
        
        const saved = sessionStorage.getItem('global_reels');
        if (saved) {
            this.reels = JSON.parse(saved);
            return this.reels;
        }
        
        if (!this.fetching) {
            this.fetchAll();
        }
        
        await new Promise(r => setTimeout(r, 500));
        return this.reels || [];
    },
    
    // تحديث يدوي
    async refresh() {
        sessionStorage.removeItem('global_products');
        sessionStorage.removeItem('global_reels');
        this.products = null;
        this.reels = null;
        return await this.fetchAll();
    }
};

// تهيئة فورية
GlobalData.loadFromSession();

// حفظ قبل إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    if (GlobalData.products) {
        sessionStorage.setItem('global_products', JSON.stringify(GlobalData.products));
    }
    if (GlobalData.reels) {
        sessionStorage.setItem('global_reels', JSON.stringify(GlobalData.reels));
    }
});

window.GlobalData = GlobalData;
console.log('✅ نظام الأمان والتوثيق جاهز');
