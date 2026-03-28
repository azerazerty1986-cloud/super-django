/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة ===== */
/* ================================================================== */

const Auth = {
    currentUser: null,
    users: [],
    
    // المستخدمين الافتراضيين
    getDefaultUsers() {
        return [
            {
                id: 1,
                userId: 'ADM_0001',
                name: 'azer',
                email: 'azer@admin.com',
                password: '123456',
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
                password: 'm123',
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
        
        // تحديث المستخدمين القدامى
        let needsUpdate = false;
        this.users.forEach(user => {
            if (user.password && !user.passwordHash) {
                user.passwordHash = this.hashPassword(user.password);
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
        if (saved) {
            this.currentUser = saved;
        }
    },
    
    saveCurrentUser() {
        if (this.currentUser) {
            Utils.save('current_user', this.currentUser);
        } else {
            localStorage.removeItem('current_user');
        }
    },
    
    // تشفير بسيط (اختياري)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    // تسجيل الدخول
    login(username, password) {
        const cleanUsername = username;
        
        const user = this.users.find(u => 
            (u.email === cleanUsername || u.name === cleanUsername) && 
            (u.password === password || u.passwordHash === this.hashPassword(password))
        );
        
        if (!user) {
            return { success: false, message: 'بيانات غير صحيحة' };
        }
        
        // التحقق من حالة المستخدم
        if (user.status === 'pending') {
            return { success: false, message: 'طلب التسجيل قيد المراجعة' };
        }
        
        if (user.status === 'rejected') {
            return { success: false, message: 'تم رفض طلب التسجيل' };
        }
        
        // تسجيل الدخول
        this.currentUser = user;
        this.saveCurrentUser();
        
        return { success: true, message: 'تم تسجيل الدخول بنجاح', user: user };
    },
    
    // تسجيل مستخدم جديد
    register(userData) {
        const { name, email, password, phone, role, ...roleData } = userData;
        
        // التحقق من وجود البريد
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' };
        }
        
        // إنشاء معرف فريد
        const userId = IDSystem.generateUserId(role);
        
        // إنشاء المستخدم
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: name,
            email: email,
            password: password,
            phone: phone || '',
            role: role || 'customer',
            status: role !== 'customer' ? 'pending' : 'approved',
            ...roleData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        // إشعار للمدير (إذا كان هناك طلب دور)
        if (role !== 'customer' && window.Telegram) {
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
            // تحديث أيقونة المستخدم
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
            
            // إظهار زر لوحة التحكم للمدير
            if (dashboardBtn && this.currentUser.role === 'admin') {
                dashboardBtn.style.display = 'flex';
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
    
    // التحقق من الصلاحية
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // المدير لديه كل الصلاحيات
        if (this.currentUser.role === 'admin') return true;
        
        // صلاحيات التاجر
        if (this.currentUser.role === 'merchant' || this.currentUser.role === 'merchant_approved') {
            const merchantPermissions = [
                'view_products', 'add_product', 'edit_product', 'delete_product',
                'view_orders', 'manage_inventory', 'view_sales'
            ];
            return merchantPermissions.includes(permission);
        }
        
        // صلاحيات المستخدم العادي
        if (this.currentUser.role === 'customer') {
            const customerPermissions = ['view_products', 'place_orders'];
            return customerPermissions.includes(permission);
        }
        
        return false;
    },
    
    // الحصول على اسم المستخدم
    getUserName() {
        return this.currentUser?.name || 'زائر';
    },
    
    // الحصول على دور المستخدم
    getUserRole() {
        return this.currentUser?.role || 'guest';
    },
    
    // التحقق من تسجيل الدخول
    isLoggedIn() {
        return this.currentUser !== null;
    }
};

// تصدير
window.Auth = Auth;

console.log('✅ نظام المصادقة جاهز');
