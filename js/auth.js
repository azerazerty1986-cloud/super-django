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
            },
            {
                id: 3,
                userId: 'CUS_5001',
                name: 'مستخدم عادي',
                email: 'user@example.com',
                password: 'user123',
                role: 'customer',
                status: 'approved',
                phone: '0777777777',
                createdAt: new Date().toISOString()
            }
        ];
    },
    
    // تهيئة النظام
    init() {
        this.loadUsers();
        this.loadCurrentUser();
        console.log('🔐 نظام المصادقة جاهز');
    },
    
    // تحميل المستخدمين من localStorage
    loadUsers() {
        this.users = Utils.load('nardoo_users', this.getDefaultUsers());
        
        // تحديث المستخدمين القدامى (إضافة userId إذا لم يكن موجوداً)
        let needsUpdate = false;
        this.users.forEach(user => {
            if (!user.userId) {
                user.userId = IDSystem.generateUserId(user.role);
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            this.saveUsers();
        }
    },
    
    // حفظ المستخدمين
    saveUsers() {
        Utils.save('nardoo_users', this.users);
    },
    
    // تحميل المستخدم الحالي
    loadCurrentUser() {
        const saved = Utils.load('current_user');
        if (saved) {
            this.currentUser = saved;
        }
    },
    
    // حفظ المستخدم الحالي
    saveCurrentUser() {
        if (this.currentUser) {
            Utils.save('current_user', this.currentUser);
        } else {
            localStorage.removeItem('current_user');
        }
    },
    
    // تسجيل الدخول
    login(username, password) {
        // البحث عن المستخدم
        const user = this.users.find(u => 
            (u.email === username || u.name === username) && 
            (u.password === password)
        );
        
        if (!user) {
            return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
        
        // التحقق من حالة المستخدم
        if (user.status === 'pending') {
            return { success: false, message: 'طلب التسجيل قيد المراجعة من قبل المدير' };
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
        
        // التحقق من المدخلات
        if (!name || !email || !password) {
            return { success: false, message: 'الرجاء ملء جميع الحقول المطلوبة' };
        }
        
        // التحقق من وجود البريد
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' };
        }
        
        // إنشاء معرف فريد
        const userId = IDSystem.generateUserId(role || 'customer');
        
        // إنشاء المستخدم
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: name,
            email: email,
            password: password,
            phone: phone || '',
            role: role || 'customer',
            status: (role && role !== 'customer') ? 'pending' : 'approved',
            ...roleData,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        // إذا كان طلب دور خاص، إرسال إشعار للمدير
        if (role && role !== 'customer') {
            this.notifyAdminNewRequest(newUser);
            return { 
                success: true, 
                message: 'تم إرسال طلب التسجيل، سيتم مراجعته من قبل المدير' 
            };
        }
        
        return { success: true, message: 'تم التسجيل بنجاح' };
    },
    
    // إشعار المدير بطلب جديد
    notifyAdminNewRequest(user) {
        if (window.Telegram) {
            const roleNames = {
                'merchant': 'تاجر',
                'distributor': 'موزع',
                'delivery': 'مندوب توصيل',
                'content_creator': 'صانع محتوى'
            };
            
            Telegram.sendMessage(`
📋 *طلب تسجيل جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${user.name}
🆔 المعرف: ${user.userId}
📧 البريد: ${user.email}
📞 الهاتف: ${user.phone || 'غير محدد'}
📊 الدور المطلوب: ${roleNames[user.role] || user.role}
📅 ${new Date().toLocaleString('ar-EG')}

✅ للموافقة: /approve_${user.id}
❌ للرفض: /reject_${user.id}
            `);
        }
    },
    
    // الموافقة على طلب تاجر (للمدير)
    approveRequest(userId) {
        const user = this.users.find(u => u.id == userId || u.userId == userId);
        if (!user) return { success: false, message: 'المستخدم غير موجود' };
        
        if (user.status === 'approved') {
            return { success: false, message: 'المستخدم معتمد بالفعل' };
        }
        
        user.status = 'approved';
        this.saveUsers();
        
        // إشعار للمستخدم
        if (window.Telegram) {
            Telegram.sendMessage(`
✅ *تمت الموافقة على طلبك*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${user.name}
🆔 المعرف: ${user.userId}
📊 الدور: ${user.role}
🎉 يمكنك الآن الدخول إلى المتجر
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
        }
        
        return { success: true, message: 'تمت الموافقة على الطلب' };
    },
    
    // رفض طلب تاجر
    rejectRequest(userId) {
        const user = this.users.find(u => u.id == userId || u.userId == userId);
        if (!user) return { success: false, message: 'المستخدم غير موجود' };
        
        user.status = 'rejected';
        this.saveUsers();
        
        // إشعار للمستخدم
        if (window.Telegram) {
            Telegram.sendMessage(`
❌ *تم رفض طلبك*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${user.name}
🆔 المعرف: ${user.userId}
📊 الدور المطلوب: ${user.role}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
        }
        
        return { success: true, message: 'تم رفض الطلب' };
    },
    
    // الحصول على طلبات التجار المعلقة
    getPendingRequests() {
        return this.users.filter(u => u.status === 'pending');
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
                    userBtn.title = 'المدير - ' + this.currentUser.name;
                } else if (this.currentUser.role === 'merchant') {
                    userBtn.innerHTML = '<i class="fas fa-store"></i>';
                    userBtn.title = 'تاجر - ' + this.currentUser.name;
                } else {
                    userBtn.innerHTML = '<i class="fas fa-user-check"></i>';
                    userBtn.title = this.currentUser.name;
                }
            }
            
            // إظهار زر لوحة التحكم للمدير
            if (dashboardBtn && this.currentUser.role === 'admin') {
                dashboardBtn.style.display = 'flex';
            }
        } else {
            if (userBtn) {
                userBtn.innerHTML = '<i class="fas fa-user"></i>';
                userBtn.title = 'تسجيل الدخول';
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
        if (this.currentUser.role === 'merchant') {
            const merchantPermissions = [
                'view_products', 'add_product', 'edit_product', 'delete_product',
                'view_orders', 'manage_inventory', 'view_sales', 'view_earnings'
            ];
            return merchantPermissions.includes(permission);
        }
        
        // صلاحيات المستخدم العادي
        if (this.currentUser.role === 'customer') {
            const customerPermissions = [
                'browse_products', 'place_orders', 'track_orders', 'write_reviews'
            ];
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
    
    // الحصول على معرف المستخدم
    getUserId() {
        return this.currentUser?.userId || null;
    },
    
    // التحقق من تسجيل الدخول
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    // الحصول على جميع المستخدمين (للمدير فقط)
    getAllUsers() {
        if (this.currentUser?.role !== 'admin') return [];
        return this.users;
    },
    
    // حذف مستخدم (للمدير فقط)
    deleteUser(userId) {
        if (this.currentUser?.role !== 'admin') return false;
        
        const index = this.users.findIndex(u => u.userId === userId || u.id == userId);
        if (index === -1) return false;
        
        // لا يمكن حذف المدير الحالي
        if (this.users[index].userId === this.currentUser.userId) return false;
        
        this.users.splice(index, 1);
        this.saveUsers();
        return true;
    }
};

// تصدير
window.Auth = Auth;

console.log('✅ نظام المصادقة جاهز');
