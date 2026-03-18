
/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة والمستخدمين ===== */
/* ================================================================== */
// ===== تهيئة المستخدمين بشكل إجباري =====
(function() {
    // المستخدمين الافتراضيين
    const defaultUsers = [{
        id: 1,
        name: 'مدير النظام',
        email: 'admin@nardoo.com',
        password: 'admin123',
        role: 'admin',
        phone: '0562243648',
        merchantId: 'ADMIN_001'
    }];
    
    // حفظ في localStorage
    localStorage.setItem('nardoo_users', JSON.stringify(defaultUsers));
    
    // تسجيل الدخول تلقائياً
    localStorage.setItem('current_user', JSON.stringify(defaultUsers[0]));
    
    console.log('✅ تم تهيئة المدير تلقائياً');
})();
// ===== [2.1] نظام المستخدمين =====
const AuthSystem = {
    users: [],
    currentUser: null,
    pendingRequests: [],
    
    // قائمة الأدوار المتاحة
    availableRoles: [
        { id: 'merchant', name: 'تاجر', icon: '🏪', description: 'بيع المنتجات وإدارة المتجر' },
        { id: 'distributor', name: 'موزع', icon: '🚚', description: 'توزيع المنتجات على التجار' },
        { id: 'delivery_company', name: 'شركة توصيل', icon: '🚛', description: 'إدارة أسطول توصيل' },
        { id: 'delivery_person', name: 'مندوب توصيل', icon: '🛵', description: 'توصيل الطلبات للعملاء' },
        { id: 'content_creator', name: 'صانع محتوى', icon: '🎬', description: 'إنشاء ريلز ومحتوى ترويجي' },
        { id: 'entertainer', name: 'ترفيه', icon: '🎪', description: 'بث مباشر وتفاعل مع الجمهور' },
        { id: 'customer', name: 'مشتري', icon: '👤', description: 'شراء المنتجات فقط' }
    ],
    
    // التهيئة
    init() {
        this.users = Utils.load('nardoo_users', []);
        this.pendingRequests = Utils.load('role_requests', []);
        
        // إنشاء مستخدم افتراضي إذا لم يوجد
        if (this.users.length === 0) {
            this.createDefaultUsers();
        }
        
        // استعادة المستخدم الحالي
        const saved = Utils.load('current_user');
        if (saved) {
            this.currentUser = saved;
        }
        
        console.log('👥 نظام المستخدمين جاهز');
    },
    
    // إنشاء مستخدمين افتراضيين
    createDefaultUsers() {
        const adminId = IDSystem.generateId('admin', { includeDate: true });
        
        this.users = [
            {
                id: 1,
                userId: adminId,
                name: 'مدير النظام',
                email: 'admin@nardoo.com',
                password: 'admin123',
                role: 'admin',
                roleName: 'مدير النظام',
                phone: CONFIG.phone,
                avatar: `${CONFIG.defaultAvatar}admin`,
                fingerprint: Fingerprint.fingerprint,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                status: 'active',
                permissions: ['all']
            }
        ];
        
        this.save();
    },
    
    // حفظ المستخدمين
    save() {
        Utils.save('nardoo_users', this.users);
    },
    
    // حفظ الطلبات
    saveRequests() {
        Utils.save('role_requests', this.pendingRequests);
    },
    
    // تسجيل الدخول
    login(email, password) {
        const user = this.users.find(u => 
            (u.email === email || u.name === email) && u.password === password
        );
        
        if (user) {
            this.currentUser = user;
            user.lastLogin = new Date().toISOString();
            user.fingerprint = Fingerprint.fingerprint;
            Utils.save('current_user', user);
            this.save();
            
            return { success: true, user };
        }
        
        return { success: false, message: '❌ بيانات الدخول غير صحيحة' };
    },
    
    // تسجيل الخروج
    logout() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
        Utils.showNotification('👋 تم تسجيل الخروج', 'info');
        
        // إعادة تحميل الصفحة
        setTimeout(() => location.reload(), 500);
    },
    
    // تسجيل مستخدم جديد
    register(userData) {
        // التحقق من وجود البريد
        if (this.users.find(u => u.email === userData.email)) {
            return { success: false, message: '❌ البريد الإلكتروني مستخدم بالفعل' };
        }
        
        // إنشاء معرف جديد
        const userId = IDSystem.generateId('customer', { includeDate: true });
        
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: userData.name,
            email: userData.email,
            password: userData.password,
            phone: userData.phone || '',
            role: 'customer',
            roleName: 'مشتري',
            avatar: `${CONFIG.defaultAvatar}${userId}`,
            fingerprint: Fingerprint.fingerprint,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            status: 'active',
            stats: {
                orders: 0,
                spent: 0,
                reviews: 0
            }
        };
        
        this.users.push(newUser);
        this.save();
        
        return { success: true, user: newUser };
    },
    
    // تقديم طلب دور
    submitRoleRequest(userId, requestedRole, roleData = {}) {
        const user = this.users.find(u => u.userId === userId || u.id == userId);
        if (!user) {
            return { success: false, message: 'المستخدم غير موجود' };
        }
        
        // التحقق من وجود طلب سابق
        const existing = this.pendingRequests.find(r => 
            r.userId === user.userId && r.requestedRole === requestedRole && r.status === 'pending'
        );
        
        if (existing) {
            return { success: false, message: 'لديك طلب قيد الانتظار لهذا الدور' };
        }
        
        // إنشاء معرف للطلب
        const requestId = IDSystem.generateId('request', { includeDate: true });
        
        const request = {
            id: requestId,
            requestNumber: this.pendingRequests.length + 1,
            userId: user.userId,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            currentRole: user.role,
            requestedRole: requestedRole,
            requestedRoleName: this.getRoleName(requestedRole),
            status: 'pending',
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            notes: '',
            data: roleData
        };
        
        this.pendingRequests.push(request);
        this.saveRequests();
        
        // إشعار المدير عبر تلغرام
        this.notifyAdmin(request);
        
        return { success: true, request };
    },
    
    // إشعار المدير
    notifyAdmin(request) {
        if (window.Telegram) {
            const message = `🔵 *طلب دور جديد*\n👤 ${request.userName}\n🎯 ${request.requestedRoleName}\n🆔 ${request.id}`;
            Telegram.sendMessage(message);
        }
    },
    
    // الحصول على اسم الدور
    getRoleName(roleId) {
        const role = this.availableRoles.find(r => r.id === roleId);
        return role ? role.name : roleId;
    },
    
    // الموافقة على طلب
    approveRequest(requestId) {
        const request = this.pendingRequests.find(r => r.id === requestId);
        if (!request) return false;
        
        request.status = 'approved';
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = this.currentUser?.userId || 'system';
        
        // تحديث دور المستخدم
        const user = this.users.find(u => u.userId === request.userId);
        if (user) {
            user.role = request.requestedRole;
            user.roleName = request.requestedRoleName;
            user.approvedAt = new Date().toISOString();
            
            // إنشاء مستودع للتاجر إذا كان الدور تاجر
            if (request.requestedRole === 'merchant' && window.Inventory) {
                Inventory.createMerchantWarehouse(user);
            }
        }
        
        this.saveRequests();
        this.save();
        
        return true;
    },
    
    // رفض الطلب
    rejectRequest(requestId, reason = '') {
        const request = this.pendingRequests.find(r => r.id === requestId);
        if (!request) return false;
        
        request.status = 'rejected';
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = this.currentUser?.userId || 'system';
        request.rejectionReason = reason;
        
        this.saveRequests();
        return true;
    },
    
    // الحصول على طلبات pending
    getPendingRequests() {
        return this.pendingRequests.filter(r => r.status === 'pending');
    },
    
    // التحقق من الصلاحية
    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'admin') return true;
        
        // يمكن إضافة نظام صلاحيات متقدم هنا
        return false;
    },
    
    // تحديث واجهة المستخدم
    updateUI() {
        const userBtn = document.getElementById('userBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const adminAppsNav = document.getElementById('adminAppsNav');
        
        if (this.currentUser) {
            // تغيير أيقونة المستخدم
            if (this.currentUser.role === 'admin') {
                userBtn.innerHTML = '<i class="fas fa-crown"></i>';
                if (dashboardBtn) dashboardBtn.style.display = 'flex';
                if (adminAppsNav) adminAppsNav.style.display = 'flex';
            } else if (this.currentUser.role === 'merchant') {
                userBtn.innerHTML = '<i class="fas fa-store"></i>';
            } else {
                userBtn.innerHTML = '<i class="fas fa-user-check"></i>';
            }
        } else {
            userBtn.innerHTML = '<i class="far fa-user"></i>';
        }
    },
    
    // إحصائيات المستخدمين
    getStats() {
        return {
            total: this.users.length,
            admins: this.users.filter(u => u.role === 'admin').length,
            merchants: this.users.filter(u => u.role === 'merchant').length,
            pending: this.users.filter(u => u.role === 'pending').length,
            customers: this.users.filter(u => u.role === 'customer').length,
            delivery: this.users.filter(u => ['delivery_company', 'delivery_person'].includes(u.role)).length,
            creators: this.users.filter(u => ['content_creator', 'entertainer'].includes(u.role)).length
        };
    }
};

// ===== [2.2] تهيئة النظام =====
window.Auth = AuthSystem;
AuthSystem.init();

console.log('✅ نظام المصادقة جاهز');
