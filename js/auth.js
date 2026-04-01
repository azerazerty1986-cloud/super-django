
/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة والأمان ===== */
/* ================================================================== */

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
        console.log('?? نظام المصادقة جاهز');
    },
    
    loadUsers() {
        this.users = Utils.load('nardoo_users', this.getDefaultUsers());
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
            Utils.showNotification('?? حسابك مقفل مؤقتاً بسبب محاولات دخول فاشلة', 'warning');
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
                this.currentUser = user;
                this.saveCurrentUser();
                SecuritySystem.resetFailedAttempts(userId);
                this.pending2FA = null;
                return { success: true, message: 'تم تسجيل الدخول بنجاح', user: user };
            }
        }
        
        return result;
    },
    
    register(userData) {
        const { name, email, password, phone, role, ...roleData } = userData;
        
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' };
        }
        
        const userId = IDSystem.generateUserId(role);
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: SecuritySystem.sanitize(name),
            email: email,
            passwordHash: SecuritySystem.hashPassword(password),
            phone: phone || '',
            role: role || 'customer',
            status: role !== 'customer' ? 'pending' : 'approved',
            ...roleData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        if (role !== 'customer') {
            if (window.Telegram) {
                Telegram.sendMessage(`
?? *طلب تسجيل جديد*
??????????????????????
?? المستخدم: ${name}
?? المعرف: ${userId}
?? البريد: ${email}
?? الهاتف: ${phone}
?? الدور المطلوب: ${role}
?? ${new Date().toLocaleString('ar-EG')}
                `);
            }
            return { success: true, message: 'تم إرسال طلب التسجيل، سيتم مراجعته من قبل المدير' };
        }
        
        return { success: true, message: 'تم التسجيل بنجاح' };
    },
    
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        Utils.showNotification('تم تسجيل الخروج بنجاح', 'info');
        setTimeout(() => location.reload(), 500);
    },
    
    updateUI() {
        const userBtn = document.getElementById('userBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        
        if (this.currentUser) {
            if (userBtn) {
                userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
                userBtn.title = this.currentUser.name;
            }
            if (dashboardBtn && this.currentUser.role === 'admin') {
                dashboardBtn.style.display = 'flex';
            }
        } else {
            if (userBtn) {
                userBtn.innerHTML = `<i class="fas fa-user"></i>`;
            }
            if (dashboardBtn) {
                dashboardBtn.style.display = 'none';
            }
        }
    }
};

window.Auth = Auth;
console.log('? نظام المصادقة مع التوثيق الثنائي جاهز');


