/* ================================================================== */
/* ===== [02] الملف: 02-auth.js - نظام المصادقة مع المعرفات ===== */
/* ================================================================== */

const AuthSystem = {
    users: [],
    currentUser: null,
    
    init() {
        this.users = Utils.load('nardoo_users', []);
        if (this.users.length === 0) {
            this.createDefaultUsers();
        }
        
        const saved = Utils.load('current_user');
        if (saved) {
            this.currentUser = saved;
        }
    },
    
    createDefaultUsers() {
        // مدير النظام
        const adminId = IDSystem.generateUserId('admin');
        
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
                status: 'active',
                stats: {
                    products: 0,
                    followers: 0
                }
            },
            {
                id: 2,
                userId: 'MER_1001',
                name: 'تاجر تجريبي',
                email: 'merchant@nardoo.com',
                password: 'merchant123',
                role: 'merchant',
                roleName: 'تاجر',
                phone: '0555123456',
                storeName: 'متجر التجريبي',
                avatar: `${CONFIG.defaultAvatar}merchant`,
                fingerprint: 'FP_TEST',
                createdAt: new Date().toISOString(),
                status: 'active',
                stats: {
                    products: 5,
                    followers: 120
                }
            }
        ];
        
        this.save();
    },
    
    save() {
        Utils.save('nardoo_users', this.users);
    },
    
    // ===== [معدل] تسجيل مستخدم جديد مع معرف فوري =====
    register(userData) {
        if (this.users.find(u => u.email === userData.email)) {
            return { success: false, message: '❌ البريد مستخدم بالفعل' };
        }
        
        // تحديد الدور
        let role = userData.role || 'customer';
        let roleName = this.getRoleName(role);
        
        // إنشاء معرف فوري للمستخدم
        const userId = IDSystem.generateUserId(role);
        
        const newUser = {
            id: this.users.length + 1,
            userId: userId,
            name: userData.name,
            email: userData.email,
            password: userData.password,
            phone: userData.phone || '',
            role: role,
            roleName: roleName,
            avatar: `${CONFIG.defaultAvatar}${userId}`,
            fingerprint: Fingerprint.fingerprint,
            createdAt: new Date().toISOString(),
            status: role === 'customer' ? 'active' : 'pending',
            stats: {
                products: 0,
                followers: 0
            }
        };
        
        // إضافة حقول إضافية حسب الدور
        if (role === 'merchant') {
            newUser.storeName = userData.storeName || `متجر ${userData.name}`;
            newUser.specialization = userData.specialization || 'عام';
        } else if (role === 'distributor') {
            newUser.companyName = userData.companyName || `شركة ${userData.name}`;
            newUser.serviceArea = userData.serviceArea || 'الجزائر';
        } else if (role === 'delivery') {
            newUser.vehicleType = userData.vehicleType || 'دراجة نارية';
            newUser.workArea = userData.workArea || 'الجزائر';
        } else if (role === 'content_creator') {
            newUser.niche = userData.niche || 'عام';
            newUser.platforms = userData.platforms || ['instagram'];
        }
        
        this.users.push(newUser);
        this.save();
        
        return { 
            success: true, 
            user: newUser,
            message: `✅ تم التسجيل - معرفك: ${userId}`
        };
    },
    
    getRoleName(role) {
        const names = {
            'admin': 'مدير النظام',
            'merchant': 'تاجر',
            'distributor': 'موزع',
            'delivery': 'مندوب توصيل',
            'content_creator': 'صانع محتوى',
            'customer': 'مشتري'
        };
        return names[role] || role;
    },
    
    login(username, password) {
        const user = this.users.find(u => 
            (u.email === username || u.name === username || u.userId === username) && 
            u.password === password
        );
        
        if (user) {
            this.currentUser = user;
            user.lastLogin = new Date().toISOString();
            Utils.save('current_user', user);
            return { success: true, user };
        }
        
        return { success: false, message: '❌ بيانات غير صحيحة' };
    },
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
        Utils.showNotification('👋 تم تسجيل الخروج');
        setTimeout(() => location.reload(), 500);
    },
    
    updateUI() {
        const userBtn = document.getElementById('userBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const adminAppsNav = document.getElementById('adminAppsNav');
        
        if (this.currentUser) {
            // أيقونة حسب الدور
            const icons = {
                'admin': 'crown',
                'merchant': 'store',
                'distributor': 'truck',
                'delivery': 'motorcycle',
                'content_creator': 'video',
                'customer': 'user'
            };
            
            const icon = icons[this.currentUser.role] || 'user';
            userBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
            
            // إظهار زر dashboard للمدير فقط
            if (this.currentUser.role === 'admin') {
                if (dashboardBtn) dashboardBtn.style.display = 'flex';
                if (adminAppsNav) adminAppsNav.style.display = 'flex';
            }
            
            // إضافة معرف المستخدم في واجهة المستخدم (اختياري)
            this.showUserIdBadge();
        } else {
            userBtn.innerHTML = '<i class="far fa-user"></i>';
        }
    },
    
    showUserIdBadge() {
        // يمكن إضافة شارة صغيرة تظهر معرف المستخدم
        const existingBadge = document.getElementById('userIdBadge');
        if (existingBadge) existingBadge.remove();
        
        if (this.currentUser) {
            const badge = document.createElement('div');
            badge.id = 'userIdBadge';
            badge.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: var(--gold);
                color: black;
                padding: 5px 15px;
                border-radius: 30px;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                border: 2px solid white;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            `;
            badge.innerHTML = `🆔 ${this.currentUser.userId}`;
            document.body.appendChild(badge);
        }
    },
    
    getStats() {
        return {
            total: this.users.length,
            admins: this.users.filter(u => u.role === 'admin').length,
            merchants: this.users.filter(u => u.role === 'merchant').length,
            distributors: this.users.filter(u => u.role === 'distributor').length,
            delivery: this.users.filter(u => u.role === 'delivery').length,
            creators: this.users.filter(u => u.role === 'content_creator').length,
            customers: this.users.filter(u => u.role === 'customer').length,
            pending: this.users.filter(u => u.status === 'pending').length
        };
    }
};

window.Auth = AuthSystem;
AuthSystem.init();

console.log('✅ نظام المصادقة جاهز - كل مستخدم له معرف فوري');
