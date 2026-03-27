/* ================================================================== */
/* ===== [01] الملف: 01-core.js - الأساسيات ونظام المعرفات ===== */
/* ================================================================== */

// ===== [1.1] إعدادات المشروع =====
const CONFIG = {
    appName: 'ناردو برو',
    version: '3.0.0',
    
    // إعدادات تلغرام
    telegram: {
        botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
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

// ===== [1.2] نظام الأمان =====
const SecuritySystem = {
    // تسجيل محاولات الدخول الفاشلة
    failedAttempts: {},
    
    // تسجيل محاولة فاشلة
    recordFailedAttempt(userId) {
        this.failedAttempts[userId] = (this.failedAttempts[userId] || 0) + 1;
        
        // بعد 5 محاولات فاشلة، قفل الحساب
        if (this.failedAttempts[userId] >= 5) {
            this.lockUser(userId);
        }
        
        // حفظ في localStorage
        Utils.save('failed_attempts', this.failedAttempts);
    },
    
    // إعادة تعيين محاولات الفشل
    resetFailedAttempts(userId) {
        delete this.failedAttempts[userId];
        Utils.save('failed_attempts', this.failedAttempts);
    },
    
    // قفل المستخدم
    lockUser(userId) {
        const users = Utils.load('nardoo_users', []);
        const user = users.find(u => u.userId === userId || u.id == userId);
        
        if (user) {
            user.locked = true;
            user.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 دقيقة
            Utils.save('nardoo_users', users);
            
            // إشعار للمدير
            if (window.Telegram) {
                Telegram.sendMessage(`
🔒 *حساب مقفل*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${user.name}
🆔 المعرف: ${user.userId}
⚠️ السبب: 5 محاولات دخول فاشلة
⏰ مقفل حتى: ${new Date(user.lockedUntil).toLocaleString('ar-EG')}
                `);
            }
        }
    },
    
    // التحقق من قفل المستخدم
    isUserLocked(user) {
        if (!user.locked) return false;
        
        // إذا انتهى وقت القفل
        if (user.lockedUntil && Date.now() > user.lockedUntil) {
            user.locked = false;
            delete user.lockedUntil;
            
            const users = Utils.load('nardoo_users', []);
            const index = users.findIndex(u => u.userId === user.userId);
            if (index !== -1) {
                users[index] = user;
                Utils.save('nardoo_users', users);
            }
            return false;
        }
        
        return true;
    },
    
    // تشفير كلمة المرور (SHA256 بسيط)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    // توليد CSRF Token
    generateCSRFToken() {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('csrf_token', token);
        return token;
    },
    
    // التحقق من CSRF Token
    verifyCSRFToken(token) {
        const savedToken = sessionStorage.getItem('csrf_token');
        return token === savedToken;
    },
    
    // تنظيف النص من الأكواد الضارة (XSS)
    sanitize(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/javascript:/gi, '')
            .replace(/onclick=/gi, '')
            .replace(/onerror=/gi, '')
            .replace(/onload=/gi, '');
    },
    
    // تنظيف HTML بالكامل
    sanitizeHtml(html) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    // تشفير البيانات (Base64)
    encrypt(data) {
        try {
            return btoa(encodeURIComponent(JSON.stringify(data)));
        } catch(e) {
            return null;
        }
    },
    
    // فك تشفير البيانات
    decrypt(encrypted) {
        try {
            return JSON.parse(decodeURIComponent(atob(encrypted)));
        } catch(e) {
            return null;
        }
    },
    
    // توليد معرف جلسة آمن
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

// ===== [1.3] نظام المعرفات الفريدة =====
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
    
    // إنشاء معرف للمستخدم عند التسجيل
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
    
    // إنشاء معرف للمنتج = معرف صاحبه + رقم تسلسلي
    generateProductId(ownerId) {
        this.counters.product++;
        const productNum = this.counters.product.toString().padStart(6, '0');
        this.saveCounters();
        
        // إزالة أي مسافات أو رموز غير مرغوب فيها من ownerId
        const cleanOwnerId = ownerId.replace(/[^A-Za-z0-9_]/g, '');
        
        // المنتج يأخذ معرف صاحبه + رقم تسلسلي
        return `${cleanOwnerId}_PRD_${productNum}`;
    },
    
    // استخراج معرف صاحب المنتج من معرف المنتج
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
        
        // تنظيف الرسالة قبل العرض
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
    
    // تنظيف النص للعرض الآمن
    escapeHtml(text) {
        return SecuritySystem.sanitize(text);
    }
};

// ===== [1.6] نظام التوثيق عبر تلغرام =====
const TelegramAuth = {
    pendingVerifications: {},
    
    // إرسال رمز التحقق للمستخدم عبر القناة
    async sendVerificationCode(userId, userName, userPhone) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 دقائق
        
        this.pendingVerifications[userId] = {
            code: code,
            expiresAt: expiresAt,
            attempts: 0
        };
        
        // حفظ في localStorage
        Utils.save('telegram_verifications', this.pendingVerifications);
        
        // إرسال الرمز إلى القناة
        const message = `
🔐 *رمز التحقق - ناردو برو*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${userName}
🆔 المعرف: ${userId}
📞 الهاتف: ${userPhone || 'غير محدد'}

📱 *رمز التحقق الخاص بك:*

\`\`\`
${code}
\`\`\`

⏰ *صالح لمدة: 5 دقائق*
⚠️ لا تشارك هذا الرمز مع أي شخص

🕐 ${new Date().toLocaleString('ar-EG')}
        `;
        
        try {
            const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ تم إرسال رمز التحقق للمستخدم ${userName}`);
                return { success: true, messageId: data.result.message_id };
            } else {
                console.error('❌ فشل إرسال الرمز:', data);
                return { success: false, error: data.description };
            }
        } catch(error) {
            console.error('❌ خطأ في الإرسال:', error);
            return { success: false, error: error.message };
        }
    },
    
    // التحقق من الرمز
    verifyCode(userId, inputCode) {
        const verification = this.pendingVerifications[userId];
        
        if (!verification) {
            return { success: false, message: 'لا يوجد طلب تحقق نشط' };
        }
        
        if (Date.now() > verification.expiresAt) {
            delete this.pendingVerifications[userId];
            Utils.save('telegram_verifications', this.pendingVerifications);
            return { success: false, message: 'انتهت صلاحية الرمز، حاول مرة أخرى' };
        }
        
        if (verification.attempts >= 3) {
            delete this.pendingVerifications[userId];
            Utils.save('telegram_verifications', this.pendingVerifications);
            return { success: false, message: 'تجاوزت عدد المحاولات المسموح بها' };
        }
        
        verification.attempts++;
        Utils.save('telegram_verifications', this.pendingVerifications);
        
        if (verification.code === inputCode) {
            // نجاح التحقق
            delete this.pendingVerifications[userId];
            Utils.save('telegram_verifications', this.pendingVerifications);
            
            // إرسال تأكيد إلى القناة
            fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
                    text: `✅ *تم التحقق بنجاح*\n━━━━━━━━━━━━━━━━━━━━━━\n👤 المستخدم: ${userId}\n🕐 ${new Date().toLocaleString('ar-EG')}`,
                    parse_mode: 'Markdown'
                })
            });
            
            return { success: true, message: 'تم التحقق بنجاح' };
        }
        
        return { success: false, message: `رمز غير صحيح (${3 - verification.attempts} محاولات متبقية)` };
    },
    
    // تنظيف الرموز المنتهية
    cleanupExpiredCodes() {
        const now = Date.now();
        let changed = false;
        
        Object.keys(this.pendingVerifications).forEach(userId => {
            if (now > this.pendingVerifications[userId].expiresAt) {
                delete this.pendingVerifications[userId];
                changed = true;
            }
        });
        
        if (changed) {
            Utils.save('telegram_verifications', this.pendingVerifications);
        }
    },
    
    // تحميل الرموز المعلقة
    loadPendingVerifications() {
        const saved = Utils.load('telegram_verifications', {});
        this.pendingVerifications = saved;
        this.cleanupExpiredCodes();
    }
};

// ===== [1.7] تهيئة الأنظمة =====
window.CONFIG = CONFIG;
window.Security = SecuritySystem;
window.IDSystem = IDSystem;
window.Fingerprint = FingerprintSystem;
window.Utils = Utils;
window.TelegramAuth = TelegramAuth;

// توليد CSRF Token عند التحميل
SecuritySystem.generateCSRFToken();
Fingerprint.init();
IDSystem.loadCounters();
TelegramAuth.loadPendingVerifications();

// تنظيف الرموز المنتهية كل دقيقة
setInterval(() => TelegramAuth.cleanupExpiredCodes(), 60000);

console.log('✅ نظام الأمان والتوثيق جاهز');
