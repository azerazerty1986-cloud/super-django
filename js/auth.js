/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة والأمان ===== */
/* ================================================================== */

// ===== إعدادات المصادقة =====
const AUTH_CONFIG = {
    usersKey: 'nardoo_users',
    currentUserKey: 'current_admin_user',
    adminCode: 'NARDOO2024'
};

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

// ===== نظام تلغرام للتوثيق =====
const TelegramAuth = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    
    async sendVerificationCode(userId, name, phone) {
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const message = `🔐 *رمز التحقق - ناردو برو*
━━━━━━━━━━━━━━━━━━━━━━
👤 *المستخدم:* ${name}
🆔 *المعرف:* ${userId}
📞 *الهاتف:* ${phone || 'غير مسجل'}

📱 *رمز التحقق الخاص بك:* 
\`\`\`
${code}
\`\`\`

⏰ *صالح لمدة 5 دقائق*

🔒 هذا الرمز سري ولا تشاركه مع أي شخص`;

            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                localStorage.setItem(`2fa_code_${userId}`, JSON.stringify({
                    code: code,
                    expiresAt: Date.now() + 5 * 60 * 1000
                }));
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            console.error('خطأ في إرسال رمز التحقق:', error);
            return { success: false };
        }
    },
    
    verifyCode(userId, code) {
        const stored = localStorage.getItem(`2fa_code_${userId}`);
        if (!stored) {
            return { success: false, message: 'لا يوجد رمز تحقق نشط' };
        }
        
        const data = JSON.parse(stored);
        if (Date.now() > data.expiresAt) {
            localStorage.removeItem(`2fa_code_${userId}`);
            return { success: false, message: 'انتهت صلاحية الرمز' };
        }
        
        if (data.code === code) {
            localStorage.removeItem(`2fa_code_${userId}`);
            return { success: true, message: 'تم التحقق بنجاح' };
        }
        
        return { success: false, message: 'رمز غير صحيح' };
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
            const user = JSON.parse(saved);
            if (!SecuritySystem.isUserLocked(user)) {
                this.currentUser = user;
            } else {
                this.currentUser = null;
                localStorage.removeItem(AUTH_CONFIG.currentUserKey);
                if (typeof showNotification === 'function') {
                    showNotification('⚠️ حسابك مقفل مؤقتاً بسبب محاولات دخول فاشلة', 'warning');
                }
            }
        }
    },
    
    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem(AUTH_CONFIG.currentUserKey, JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem(AUTH_CONFIG.currentUserKey);
        }
    },
    
    async login(username, password, skip2FA = false) {
        const cleanUsername = SecuritySystem.sanitize(username);
        
        const user = this.users.find(u => 
            (u.email === cleanUsername || u.name === cleanUsername) && 
            u.passwordHash === SecuritySystem.hashPassword(password)
        );
        
        if (!user) {
            SecuritySystem.recordFailedAttempt(cleanUsername);
            return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', require2FA: false };
        }
        
        if (SecuritySystem.isUserLocked(user)) {
            return { success: false, message: 'الحساب مقفل مؤقتاً، حاول بعد 30 دقيقة', require2FA: false };
        }
        
        // تخطي التحقق الثنائي للمطورين أو إذا كان skip2FA = true
        if (skip2FA || user.role === 'admin') {
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
            return { success: true, message: 'تم تسجيل الدخول بنجاح', user: this.currentUser, require2FA: false };
        }
        
        // إرسال رمز التحقق
        const result = await TelegramAuth.sendVerificationCode(user.userId, user.name, user.phone);
        
        if (result.success) {
            this.pending2FA = {
                userId: user.userId,
                expiresAt: Date.now() + 5 * 60 * 1000
            };
            return { 
                success: true, 
                message: 'تم إرسال رمز التحقق إلى قناة تلغرام', 
                require2FA: true,
                userId: user.userId
            };
        }
        
        return { success: false, message: 'فشل إرسال رمز التحقق', require2FA: false };
    },
    
    verify2FA(userId, code) {
        if (!this.pending2FA || this.pending2FA.userId !== userId) {
            return { success: false, message: 'لا يوجد طلب تحقق نشط' };
        }
        
        if (Date.now() > this.pending2FA.expiresAt) {
            this.pending2FA = null;
            return { success: false, message: 'انتهت صلاحية الرمز' };
        }
        
        const result = TelegramAuth.verifyCode(userId, code);
        
        if (result.success) {
            const user = this.users.find(u => u.userId === userId);
            if (user) {
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
                SecuritySystem.resetFailedAttempts(userId);
                this.pending2FA = null;
                return { success: true, message: 'تم تسجيل الدخول بنجاح', user: this.currentUser };
            }
        }
        
        return result;
    },
    
    register(userData) {
        const { name, email, password, phone, role, storeName, ...roleData } = userData;
        
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
            ...roleData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        if (userRole !== 'user') {
            // إرسال إشعار للمدير
            if (typeof Telegram !== 'undefined' && Telegram.sendMessage) {
                Telegram.sendMessage(`
🟢 *طلب تسجيل جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *المستخدم:* ${name}
🆔 *المعرف:* ${userId}
📧 *البريد:* ${email}
📞 *الهاتف:* ${phone}
🏪 *المتجر:* ${storeName || 'غير محدد'}
🎭 *الدور:* ${userRole}
📅 ${new Date().toLocaleString('ar-EG')}
                `);
            }
            return { success: true, message: 'تم إرسال طلب التسجيل، سيتم مراجعته من قبل المدير' };
        }
        
        return { success: true, message: 'تم التسجيل بنجاح، يمكنك تسجيل الدخول' };
    },
    
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        if (typeof showNotification === 'function') {
            showNotification('تم تسجيل الخروج بنجاح', 'success');
        }
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
            if (dashboardBtn && (this.currentUser.role === 'admin' || this.currentUser.role === 'merchant_approved')) {
                dashboardBtn.style.display = 'flex';
            }
            // إظهار رابط إضافة الريلز للتجار المعتمدين والمدير
            if (addReelLink && (this.currentUser.role === 'admin' || this.currentUser.role === 'merchant_approved')) {
                addReelLink.style.display = 'flex';
            } else if (addReelLink) {
                addReelLink.style.display = 'none';
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
    
    // دوال مساعدة للتوافق مع index.html
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

// ===== تهيئة النظام =====
Auth.init();

// ===== تصدير الدوال للنطاق العام =====
window.Auth = Auth;
window.SecuritySystem = SecuritySystem;
window.TelegramAuth = TelegramAuth;
window.IDSystem = IDSystem;

// دوال مساعدة للاستدعاء من HTML
window.login = async (email, password) => {
    const result = await Auth.login(email, password, true); // skip2FA = true للمطورين
    if (result.success) {
        Auth.updateUI();
    }
    return result;
};

window.register = async (userData) => {
    return Auth.register(userData);
};

window.logout = () => {
    Auth.logout();
};

window.getCurrentUser = () => {
    return Auth.getCurrentUser();
};

window.hasPermission = (role) => {
    return Auth.hasPermission(role);
};

window.updateAuthUI = () => {
    Auth.updateUI();
};

window.showLoginModal = () => {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

console.log('✅ نظام المصادقة مع التوثيق الثنائي جاهز');
console.log('👤 حسابات تجريبية:');
console.log('   مدير: azer@admin.com / 123456');
console.log('   تاجر: merchant@nardoo.com / m123');
console.log('   عميل: user@nardoo.com / user123');
