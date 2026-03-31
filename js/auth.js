/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة والأمان ===== */
/* ================================================================== */

// ===== إعدادات المصادقة =====
const AUTH_CONFIG = {
    usersKey: 'nardoo_users',
    currentUserKey: 'current_admin_user',
    adminCode: 'NARDOO2024',
    // تخزين جلسات الدخول السريع
    quickLoginSessions: {}
};

// ===== دوال مساعدة =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(newContainer);
        container = newContainer;
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa'
    };
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: black;
        padding: 15px 25px;
        border-radius: 10px;
        margin-bottom: 10px;
        font-weight: bold;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        min-width: 250px;
        z-index: 10000;
    `;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== نظام التشفير =====
const SecuritySystem = {
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    sanitize(input) {
        if (!input) return '';
        return input.replace(/[<>]/g, '').trim();
    },
    
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    },
    
    failedAttempts: {},
    
    recordFailedAttempt(username) {
        const key = username.toLowerCase();
        this.failedAttempts[key] = (this.failedAttempts[key] || 0) + 1;
        if (this.failedAttempts[key] >= 5) {
            this.failedAttempts[key + '_locked'] = Date.now() + 30 * 60 * 1000;
        }
    },
    
    resetFailedAttempts(username) {
        const key = username.toLowerCase();
        delete this.failedAttempts[key];
        delete this.failedAttempts[key + '_locked'];
    },
    
    isUserLocked(user) {
        if (!user || !user.email) return false;
        const key = user.email.toLowerCase() + '_locked';
        const lockTime = this.failedAttempts[key];
        if (lockTime && Date.now() < lockTime) {
            return true;
        }
        if (lockTime && Date.now() >= lockTime) {
            delete this.failedAttempts[key];
            delete this.failedAttempts[user.email.toLowerCase()];
        }
        return false;
    }
};

// ===== نظام المعرفات =====
const IDSystem = {
    generateUserId(role) {
        const prefix = {
            'admin': 'ADM',
            'merchant': 'MER',
            'merchant_approved': 'MER',
            'merchant_pending': 'MER',
            'user': 'USR',
            'customer': 'CUS'
        };
        const pre = prefix[role] || 'USR';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${pre}_${timestamp}${random}`;
    }
};

// ===== نظام تلغرام للدخول السريع =====
const TelegramQuickLogin = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    
    // إنشاء زر دخول سريع للمدير
    async sendQuickLoginButton(adminEmail) {
        try {
            const adminUser = Auth.users.find(u => u.email === adminEmail && u.role === 'admin');
            if (!adminUser) {
                return { success: false, message: 'المستخدم غير موجود أو ليس مديراً' };
            }
            
            // إنشاء جلسة دخول سريع
            const sessionId = SecuritySystem.generateSessionId();
            AUTH_CONFIG.quickLoginSessions[sessionId] = {
                userId: adminUser.userId,
                email: adminUser.email,
                name: adminUser.name,
                createdAt: Date.now(),
                expiresAt: Date.now() + 30 * 60 * 1000, // صالح 30 دقيقة
                used: false
            };
            
            // رابط الدخول السريع (عند الضغط يتم تنفيذ الدخول فوراً)
            const loginUrl = `${window.location.origin}${window.location.pathname}?quick_login=${sessionId}`;
            
            // رسالة مع زر تفاعلي
            const message = `🔐 *دخول سريع إلى لوحة التحكم*
━━━━━━━━━━━━━━━━━━━━━━
👤 *المدير:* ${adminUser.name}
📧 *البريد:* ${adminUser.email}

🎯 *اضغط على الزر أدناه للدخول مباشرة إلى لوحة التحكم*

[🚀 **دخول فوري إلى لوحة المدير**](${loginUrl})

⏰ *الرابط صالح لمدة 30 دقيقة*
🔒 *هذا الرابط خاص بك، لا تشاركه*

━━━━━━━━━━━━━━━━━━━━━━
✨ *ناردو برو - نظام الإدارة المتكامل*`;

            // إرسال الرسالة مع زر مدمج
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.adminId,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: "🚀 دخول فوري إلى لوحة المدير",
                                url: loginUrl
                            }
                        ]]
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                showNotification('✅ تم إرسال زر الدخول السريع إلى تلغرام', 'success');
                return { success: true, message: 'تم إرسال زر الدخول السريع' };
            }
            return { success: false, message: 'فشل إرسال الزر' };
        } catch (error) {
            console.error('خطأ:', error);
            return { success: false, message: 'حدث خطأ' };
        }
    },
    
    // إرسال زر دخول سريع لجميع المديرين
    async sendQuickLoginToAllAdmins() {
        const admins = Auth.users.filter(u => u.role === 'admin');
        let successCount = 0;
        
        for (const admin of admins) {
            const result = await this.sendQuickLoginButton(admin.email);
            if (result.success) successCount++;
        }
        
        showNotification(`✅ تم إرسال ${successCount} زر دخول سريع للمديرين`, 'success');
        return { success: true, count: successCount };
    },
    
    // التحقق من جلسة الدخول السريع
    verifyQuickLogin(sessionId) {
        const session = AUTH_CONFIG.quickLoginSessions[sessionId];
        
        if (!session) {
            return { success: false, message: 'جلسة غير صالحة' };
        }
        
        if (session.used) {
            delete AUTH_CONFIG.quickLoginSessions[sessionId];
            return { success: false, message: 'تم استخدام هذه الجلسة مسبقاً' };
        }
        
        if (Date.now() > session.expiresAt) {
            delete AUTH_CONFIG.quickLoginSessions[sessionId];
            return { success: false, message: 'انتهت صلاحية الجلسة' };
        }
        
        const user = Auth.users.find(u => u.userId === session.userId);
        if (!user) {
            return { success: false, message: 'المستخدم غير موجود' };
        }
        
        // تسجيل الدخول المباشر
        Auth.currentUser = {
            id: user.id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            storeName: user.storeName,
            loginTime: new Date().toISOString(),
            quickLogin: true
        };
        
        Auth.saveCurrentUser();
        session.used = true;
        delete AUTH_CONFIG.quickLoginSessions[sessionId];
        
        showNotification(`✅ مرحباً ${user.name} - تم الدخول عبر الزر السريع`, 'success');
        Auth.updateUI();
        
        // تحديث الصفحة لإظهار لوحة التحكم
        setTimeout(() => {
            location.reload();
        }, 500);
        
        return { success: true, user: Auth.currentUser };
    },
    
    // إرسال زر دخول سريع للمدير المحدد (يمكن استدعاؤها من وحدة التحكم)
    async sendToAdmin(adminName) {
        const admin = Auth.users.find(u => u.name === adminName && u.role === 'admin');
        if (!admin) {
            showNotification(`❌ لا يوجد مدير باسم ${adminName}`, 'error');
            return false;
        }
        return await this.sendQuickLoginButton(admin.email);
    }
};

// ===== نظام المصادقة الرئيسي =====
const Auth = {
    currentUser: null,
    users: [],
    pending2FA: null,
    
    getDefaultUsers() {
        return [
            {
                id: 1,
                userId: 'ADM_0001',
                name: 'azer',
                email: 'azer@admin.com',
                passwordHash: SecuritySystem.hashPassword('123456'),
                role: 'admin',
                status: 'approved',
                phone: '0555000000',
                storeName: 'المتجر الرسمي',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                userId: 'MER_1000',
                name: 'تاجر تجريبي',
                email: 'merchant@nardoo.com',
                passwordHash: SecuritySystem.hashPassword('m123'),
                role: 'merchant_approved',
                status: 'approved',
                phone: '0555111111',
                storeName: 'متجر التجريبي',
                merchantLevel: '2',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                userId: 'USR_0001',
                name: 'عميل تجريبي',
                email: 'user@nardoo.com',
                passwordHash: SecuritySystem.hashPassword('user123'),
                role: 'user',
                status: 'approved',
                phone: '0555222222',
                createdAt: new Date().toISOString()
            }
        ];
    },
    
    init() {
        this.loadUsers();
        this.loadCurrentUser();
        
        // التحقق من وجود جلسة دخول سريع في URL
        const urlParams = new URLSearchParams(window.location.search);
        const quickSession = urlParams.get('quick_login');
        if (quickSession) {
            TelegramQuickLogin.verifyQuickLogin(quickSession);
            // إزالة المعامل من URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        this.updateUI();
        console.log('✅ نظام المصادقة جاهز');
        return this;
    },
    
    loadUsers() {
        const saved = localStorage.getItem(AUTH_CONFIG.usersKey);
        if (saved) {
            this.users = JSON.parse(saved);
        } else {
            this.users = this.getDefaultUsers();
            this.saveUsers();
        }
        
        let needsUpdate = false;
        this.users.forEach(user => {
            if (user.password && !user.passwordHash) {
                user.passwordHash = SecuritySystem.hashPassword(user.password);
                delete user.password;
                needsUpdate = true;
            }
        });
        if (needsUpdate) {
            this.saveUsers();
        }
    },
    
    saveUsers() {
        localStorage.setItem(AUTH_CONFIG.usersKey, JSON.stringify(this.users));
    },
    
    loadCurrentUser() {
        const saved = localStorage.getItem(AUTH_CONFIG.currentUserKey);
        if (saved) {
            this.currentUser = JSON.parse(saved);
        }
    },
    
    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem(AUTH_CONFIG.currentUserKey, JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem(AUTH_CONFIG.currentUserKey);
        }
    },
    
    async login(username, password) {
        const cleanUsername = SecuritySystem.sanitize(username);
        
        const user = this.users.find(u => 
            (u.email === cleanUsername || u.name === cleanUsername) && 
            u.passwordHash === SecuritySystem.hashPassword(password)
        );
        
        if (!user) {
            SecuritySystem.recordFailedAttempt(cleanUsername);
            showNotification('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
            return { success: false, message: 'بيانات غير صحيحة' };
        }
        
        if (SecuritySystem.isUserLocked(user)) {
            showNotification('⚠️ الحساب مقفل مؤقتاً، حاول بعد 30 دقيقة', 'warning');
            return { success: false, message: 'الحساب مقفل' };
        }
        
        this.currentUser = {
            id: user.id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            storeName: user.storeName,
            loginTime: new Date().toISOString()
        };
        this.saveCurrentUser();
        SecuritySystem.resetFailedAttempts(user.userId);
        
        showNotification(`✅ مرحباً ${user.name}`, 'success');
        this.updateUI();
        
        return { success: true, user: this.currentUser };
    },
    
    register(userData) {
        const { name, email, password, phone, role, storeName } = userData;
        
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' };
        }
        
        const userRole = role || 'user';
        const userId = IDSystem.generateUserId(userRole);
        
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: SecuritySystem.sanitize(name),
            email: email,
            passwordHash: SecuritySystem.hashPassword(password),
            phone: phone || '',
            role: userRole,
            status: userRole === 'user' ? 'approved' : 'pending',
            storeName: storeName || '',
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        if (userRole !== 'user') {
            showNotification('✅ تم إرسال طلب التسجيل، سيتم مراجعته من قبل المدير', 'success');
            return { success: true, message: 'تم إرسال الطلب' };
        }
        
        showNotification('✅ تم التسجيل بنجاح، يمكنك تسجيل الدخول', 'success');
        return { success: true, message: 'تم التسجيل' };
    },
    
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        setTimeout(() => location.reload(), 500);
    },
    
    updateUI() {
        const userBtn = document.getElementById('userBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const addReelLink = document.getElementById('addReelLink');
        
        if (this.currentUser) {
            if (userBtn) {
                userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
                userBtn.title = this.currentUser.name;
            }
            if (dashboardBtn && this.currentUser.role === 'admin') {
                dashboardBtn.style.display = 'flex';
            }
            if (addReelLink && (this.currentUser.role === 'admin' || this.currentUser.role === 'merchant_approved')) {
                addReelLink.style.display = 'flex';
            }
        } else {
            if (userBtn) {
                userBtn.innerHTML = `<i class="fas fa-user"></i>`;
                userBtn.title = 'تسجيل الدخول';
            }
            if (dashboardBtn) {
                dashboardBtn.style.display = 'none';
            }
            if (addReelLink) {
                addReelLink.style.display = 'none';
            }
        }
    },
    
    getCurrentUser() {
        return this.currentUser;
    },
    
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        if (requiredRole === 'admin') {
            return this.currentUser.role === 'admin';
        }
        if (requiredRole === 'merchant') {
            return this.currentUser.role === 'admin' || this.currentUser.role === 'merchant_approved';
        }
        return true;
    }
};

// ===== دوال للاستدعاء من وحدة التحكم أو HTML =====
window.Auth = Auth;
window.TelegramQuickLogin = TelegramQuickLogin;

// دوال مساعدة للاستدعاء
window.sendQuickLoginToAdmin = async (adminName) => {
    return await TelegramQuickLogin.sendToAdmin(adminName);
};

window.sendQuickLoginToAllAdmins = async () => {
    return await TelegramQuickLogin.sendQuickLoginToAllAdmins();
};

// تهيئة النظام
Auth.init();

console.log('✅ نظام المصادقة مع الدخول السريع عبر الزر جاهز');
console.log('👤 حسابات تجريبية:');
console.log('   مدير: azer@admin.com / 123456');
console.log('   تاجر: merchant@nardoo.com / m123');
console.log('   عميل: user@nardoo.com / user123');
console.log('📱 لإرسال زر دخول سريع للمدير: sendQuickLoginToAdmin("azer")');
