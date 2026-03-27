
/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة والأمان ===== */
/* ================================================================== */

const Auth = {
    currentUser: null,
    users: [],
    pending2FA: null,
    
    // المستخدمين الافتراضيين (مع كلمات مرور مشفرة)
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
                phone: '',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                userId: 'MER_1000',
                name: 'تاجر تجريبي',
                email: 'merchant@nardoo.com',
                passwordHash: SecuritySystem.hashPassword('m123'),
                role: 'merchant',
                status: 'approved',
                phone: '0555111111',
                storeName: 'متجر التجريبي',
                merchantLevel: '2',
                createdAt: new Date().toISOString()
            }
        ];
    },
    
    init() {
        this.loadUsers();
        this.loadCurrentUser();
        console.log('🔐 نظام المصادقة جاهز');
    },
    
    loadUsers() {
        this.users = Utils.load('nardoo_users', this.getDefaultUsers());
        
        // ترقية المستخدمين القدامى (إضافة passwordHash إذا لم توجد)
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
        Utils.save('nardoo_users', this.users);
    },
    
    loadCurrentUser() {
        const saved = Utils.load('current_user');
        if (saved && !SecuritySystem.isUserLocked(saved)) {
            this.currentUser = saved;
        } else if (saved && SecuritySystem.isUserLocked(saved)) {
            Utils.showNotification('⚠️ حسابك مقفل مؤقتاً بسبب محاولات دخول فاشلة', 'warning');
            this.currentUser = null;
        }
    },
    
    saveCurrentUser() {
        if (this.currentUser) {
            Utils.save('current_user', this.currentUser);
        } else {
            localStorage.removeItem('current_user');
        }
    },
    
    // تسجيل الدخول مع التحقق الثنائي
    async login(username, password) {
        const cleanUsername = SecuritySystem.sanitize(username);
        
        const user = this.users.find(u => 
            (u.email === cleanUsername || u.name === cleanUsername) && 
            u.passwordHash === SecuritySystem.hashPassword(password)
        );
        
        if (!user) {
            SecuritySystem.recordFailedAttempt(cleanUsername);
            return { success: false, message: 'بيانات غير صحيحة', require2FA: false };
        }
        
        if (SecuritySystem.isUserLocked(user)) {
            return { success: false, message: 'الحساب مقفل مؤقتاً، حاول بعد 30 دقيقة', require2FA: false };
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
                userId: user.userId,
                user: user
            };
        }
        
        return { success: false, message: 'فشل إرسال رمز التحقق', require2FA: false };
    },
    
    // التحقق من رمز 2FA
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
                this.currentUser = user;
                this.saveCurrentUser();
                SecuritySystem.resetFailedAttempts(userId);
                this.pending2FA = null;
                return { success: true, message: 'تم تسجيل الدخول بنجاح', user: user };
            }
        }
        
        return result;
    },
    
    // تسجيل مستخدم جديد
    register(userData) {
        const { name, email, password, phone, role, ...roleData } = userData;
        
        // التحقق من وجود البريد
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' };
        }
        
        // إنشاء معرف فريد للمستخدم
        const userId = IDSystem.generateUserId(role);
        
        // تشفير كلمة المرور
        const passwordHash = SecuritySystem.hashPassword(password);
        
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: SecuritySystem.sanitize(name),
            email: email,
            passwordHash: passwordHash,
            phone: phone || '',
            role: role || 'customer',
            status: role !== 'customer' ? 'pending' : 'approved',
            ...roleData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        // إذا كان المستخدم يطلب دوراً غير customer (تاجر، موزع، إلخ)
        if (role !== 'customer') {
            // إرسال إشعار للمدير
            if (window.Telegram) {
                Telegram.sendMessage(`
📋 *طلب تسجيل جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${name}
🆔 المعرف: ${userId}
📧 البريد: ${email}
📞 الهاتف: ${phone}
📊 الدور المطلوب: ${role}
🕐 ${new Date().toLocaleString('ar-EG')}
                `);
            }
            return { success: true, message: 'تم إرسال طلب التسجيل، سيتم مراجعته من قبل المدير' };
        }
        
        return { success: true, message: 'تم التسجيل بنجاح' };
    },
    
    // تسجيل الخروج
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        Utils.showNotification('تم تسجيل الخروج بنجاح', 'info');
        setTimeout(() => location.reload(), 500);
    },
    
    // تحديث واجهة المستخدم حسب الدور
    updateUI() {
        const userBtn = document.getElementById('userBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        
        if (this.currentUser) {
            if (userBtn) {
                if (this.currentUser.role === 'admin') {
                    userBtn.innerHTML = '<i class="fas fa-crown"></i>';
                } else if (this.currentUser.role === 'merchant' || this.currentUser.role === 'merchant_approved') {
                    userBtn.innerHTML = '<i class="fas fa-store"></i>';
                } else {
                    userBtn.innerHTML = '<i class="fas fa-user-check"></i>';
                }
                userBtn.title = this.currentUser.name;
            }
            
            if (dashboardBtn && this.currentUser.role === 'admin') {
                dashboardBtn.style.display = 'flex';
            } else if (dashboardBtn) {
                dashboardBtn.style.display = 'none';
            }
        } else {
            if (userBtn) {
                userBtn.innerHTML = '<i class="fas fa-user"></i>';
            }
            if (dashboardBtn) {
                dashboardBtn.style.display = 'none';
            }
        }
    },
    
    // الحصول على مستخدم بالمعرف
    getUser(userId) {
        return this.users.find(u => u.userId === userId || u.id == userId);
    },
    
    // تحديث بيانات المستخدم
    updateUser(userId, updates) {
        const index = this.users.findIndex(u => u.userId === userId || u.id == userId);
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...updates };
            this.saveUsers();
            
            // إذا كان المستخدم المحدث هو المستخدم الحالي
            if (this.currentUser && (this.currentUser.userId === userId || this.currentUser.id == userId)) {
                this.currentUser = this.users[index];
                this.saveCurrentUser();
            }
            
            return { success: true, message: 'تم تحديث البيانات' };
        }
        return { success: false, message: 'المستخدم غير موجود' };
    },
    
    // حذف مستخدم
    deleteUser(userId) {
        const index = this.users.findIndex(u => u.userId === userId || u.id == userId);
        if (index !== -1) {
            const deletedUser = this.users[index];
            this.users.splice(index, 1);
            this.saveUsers();
            
            // إذا كان المستخدم المحذوف هو المستخدم الحالي
            if (this.currentUser && (this.currentUser.userId === userId || this.currentUser.id == userId)) {
                this.logout();
            }
            
            return { success: true, message: `تم حذف المستخدم ${deletedUser.name}` };
        }
        return { success: false, message: 'المستخدم غير موجود' };
    },
    
    // الحصول على قائمة المستخدمين حسب الدور
    getUsersByRole(role) {
        return this.users.filter(u => u.role === role);
    },
    
    // الحصول على المستخدمين المعلقين (في انتظار الموافقة)
    getPendingUsers() {
        return this.users.filter(u => u.status === 'pending');
    },
    
    // الموافقة على مستخدم (تاجر، موزع، إلخ)
    approveUser(userId) {
        const user = this.getUser(userId);
        if (user && user.status === 'pending') {
            user.status = 'approved';
            this.saveUsers();
            return { success: true, message: `تمت الموافقة على ${user.name}` };
        }
        return { success: false, message: 'المستخدم غير موجود أو تمت الموافقة مسبقاً' };
    },
    
    // رفض مستخدم
    rejectUser(userId) {
        const user = this.getUser(userId);
        if (user && user.status === 'pending') {
            user.status = 'rejected';
            this.saveUsers();
            return { success: true, message: `تم رفض ${user.name}` };
        }
        return { success: false, message: 'المستخدم غير موجود' };
    }
};

// تصدير
window.Auth = Auth;

console.log('✅ نظام المصادقة مع التوثيق الثنائي جاهز');
