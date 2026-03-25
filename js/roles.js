/* ================================================================== */
/* ===== [06] الملف: 06-roles.js - نظام الأدوار والصلاحيات ===== */
/* ================================================================== */

const RoleSystem = {
    // تعريف الأدوار
    roles: {
        admin: {
            id: 'admin',
            name: 'مدير النظام',
            level: 100,
            icon: '👑',
            color: '#d4af37',
            permissions: ['all']
        },
        
        merchant: {
            id: 'merchant',
            name: 'تاجر',
            level: 80,
            icon: '🏪',
            color: '#4ade80',
            permissions: [
                'view_products', 'add_product', 'edit_product', 'delete_product',
                'view_orders', 'manage_inventory', 'view_sales', 'view_earnings'
            ]
        },
        
        distributor: {
            id: 'distributor',
            name: 'موزع',
            level: 75,
            icon: '🚚',
            color: '#60a5fa',
            permissions: [
                'view_products', 'view_orders', 'manage_distribution', 'view_earnings'
            ]
        },
        
        delivery_company: {
            id: 'delivery_company',
            name: 'شركة توصيل',
            level: 70,
            icon: '🚛',
            color: '#fbbf24',
            permissions: [
                'view_deliveries', 'manage_drivers', 'track_orders', 'view_delivery_zones'
            ]
        },
        
        delivery_person: {
            id: 'delivery_person',
            name: 'مندوب توصيل',
            level: 60,
            icon: '🛵',
            color: '#f97316',
            permissions: [
                'view_assigned_orders', 'update_delivery_status', 'view_earnings'
            ]
        },
        
        content_creator: {
            id: 'content_creator',
            name: 'صانع محتوى',
            level: 50,
            icon: '🎬',
            color: '#c084fc',
            permissions: [
                'create_reels', 'view_analytics', 'manage_content', 'view_earnings'
            ]
        },
        
        customer: {
            id: 'customer',
            name: 'مشتري',
            level: 10,
            icon: '👤',
            color: '#94a3b8',
            permissions: [
                'browse_products', 'place_orders', 'track_orders', 'write_reviews'
            ]
        }
    },
    
    // وصف الصلاحيات
    permissions: {
        view_products: { name: 'مشاهدة المنتجات', desc: 'عرض قائمة المنتجات' },
        add_product: { name: 'إضافة منتج', desc: 'إضافة منتج جديد' },
        edit_product: { name: 'تعديل منتج', desc: 'تعديل بيانات المنتج' },
        delete_product: { name: 'حذف منتج', desc: 'حذف منتج' },
        view_orders: { name: 'مشاهدة الطلبات', desc: 'عرض الطلبات' },
        manage_inventory: { name: 'إدارة المخزون', desc: 'التحكم في المخزون' },
        view_sales: { name: 'مشاهدة المبيعات', desc: 'تقارير المبيعات' },
        view_earnings: { name: 'مشاهدة الأرباح', desc: 'عرض الأرباح' },
        manage_distribution: { name: 'إدارة التوزيع', desc: 'توزيع المنتجات' },
        view_deliveries: { name: 'مشاهدة التوصيلات', desc: 'عرض التوصيلات' },
        manage_drivers: { name: 'إدارة المندوبين', desc: 'إضافة وتعديل المندوبين' },
        track_orders: { name: 'تتبع الطلبات', desc: 'تتبع حالة الطلبات' },
        view_delivery_zones: { name: 'مناطق التوصيل', desc: 'عرض مناطق التوصيل' },
        view_assigned_orders: { name: 'الطلبات المخصصة', desc: 'عرض الطلبات المخصصة' },
        update_delivery_status: { name: 'تحديث حالة التوصيل', desc: 'تغيير حالة الطلب' },
        create_reels: { name: 'إنشاء ريلز', desc: 'إنشاء مقاطع فيديو قصيرة' },
        view_analytics: { name: 'مشاهدة التحليلات', desc: 'إحصائيات المحتوى' },
        manage_content: { name: 'إدارة المحتوى', desc: 'إدارة المحتويات' },
        browse_products: { name: 'تصفح المنتجات', desc: 'مشاهدة المنتجات' },
        place_orders: { name: 'تقديم الطلبات', desc: 'إنشاء طلبات شراء' },
        write_reviews: { name: 'كتابة تقييمات', desc: 'تقييم المنتجات' }
    },
    
    // التحقق من الصلاحية
    hasPermission(user, permission) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        const role = this.roles[user.role];
        if (!role) return false;
        
        return role.permissions.includes(permission) || role.permissions.includes('all');
    },
    
    // الحصول على معلومات الدور
    getRoleInfo(roleId) {
        return this.roles[roleId] || this.roles.customer;
    },
    
    getRoleName(roleId) {
        return this.roles[roleId]?.name || 'مشتري';
    },
    
    getRoleIcon(roleId) {
        return this.roles[roleId]?.icon || '👤';
    },
    
    getRoleColor(roleId) {
        return this.roles[roleId]?.color || '#94a3b8';
    },
    
    // الحصول على قائمة الأدوار المتاحة للتسجيل
    getAvailableRoles() {
        return Object.values(this.roles).filter(r => r.id !== 'admin');
    },
    
    // الحصول على صلاحيات الدور
    getRolePermissions(roleId) {
        const role = this.roles[roleId];
        if (!role) return [];
        if (role.permissions.includes('all')) return Object.keys(this.permissions);
        return role.permissions;
    },
    
    // ترقية مستخدم
    upgradeUser(userId, newRole) {
        const users = Utils.load('nardoo_users', []);
        const user = users.find(u => u.id == userId || u.userId == userId);
        
        if (!user) return { success: false, message: 'المستخدم غير موجود' };
        if (!this.roles[newRole]) return { success: false, message: 'الدور غير موجود' };
        
        const oldRole = user.role;
        user.role = newRole;
        
        Utils.save('nardoo_users', users);
        
        // إشعار للتلغرام
        if (window.Telegram) {
            Telegram.sendMessage(`
🟢 *ترقية مستخدم*
━━━━━━━━━━━━━━━━━━━━━━
👤 المستخدم: ${user.name}
🆔 المعرف: ${user.userId || user.id}
📊 من: ${this.getRoleName(oldRole)}
📈 إلى: ${this.getRoleName(newRole)}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
        }
        
        return { success: true, message: `تمت ترقية المستخدم إلى ${this.getRoleName(newRole)}` };
    },
    
    // عرض لوحة التحكم حسب الدور
    getDashboardByRole(user) {
        if (!user) return '<p>الرجاء تسجيل الدخول</p>';
        
        const role = this.roles[user.role];
        
        let dashboardHTML = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:48px;">${role.icon}</div>
                <h2>مرحباً ${user.name}</h2>
                <p>الدور: ${role.name}</p>
                <p>المستوى: ${role.level}</p>
            </div>
        `;
        
        // أزرار حسب الصلاحيات
        if (this.hasPermission(user, 'add_product')) {
            dashboardHTML += `
                <button class="btn-gold" onclick="App.openAddProductModal()">
                    <i class="fas fa-plus"></i> إضافة منتج
                </button>
            `;
        }
        
        if (this.hasPermission(user, 'manage_inventory')) {
            dashboardHTML += `
                <button class="btn-gold" onclick="Inventory.showMerchantInventory()">
                    <i class="fas fa-boxes"></i> إدارة المخزون
                </button>
            `;
        }
        
        if (this.hasPermission(user, 'view_sales')) {
            dashboardHTML += `
                <button class="btn-gold" onclick="Analytics.showSalesReport()">
                    <i class="fas fa-chart-line"></i> تقارير المبيعات
                </button>
            `;
        }
        
        return dashboardHTML;
    }
};

// تصدير
window.Roles = RoleSystem;
console.log('✅ نظام الأدوار جاهز');
