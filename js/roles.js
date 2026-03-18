/* ================================================================== */
/* ===== [07] الملف: 07-roles.js - نظام الأدوار والصلاحيات ===== */
/* ================================================================== */

// ===== [7.1] نظام الأدوار =====
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
                'view_products',
                'add_product',
                'edit_product',
                'delete_product',
                'view_orders',
                'manage_inventory',
                'view_sales'
            ]
        },
        
        distributor: {
            id: 'distributor',
            name: 'موزع',
            level: 75,
            icon: '🚚',
            color: '#60a5fa',
            permissions: [
                'view_products',
                'view_orders',
                'manage_distribution'
            ]
        },
        
        delivery_company: {
            id: 'delivery_company',
            name: 'شركة توصيل',
            level: 70,
            icon: '🚛',
            color: '#fbbf24',
            permissions: [
                'view_deliveries',
                'manage_drivers',
                'track_orders',
                'view_delivery_zones'
            ]
        },
        
        delivery_person: {
            id: 'delivery_person',
            name: 'مندوب توصيل',
            level: 60,
            icon: '🛵',
            color: '#f97316',
            permissions: [
                'view_assigned_orders',
                'update_delivery_status',
                'view_earnings'
            ]
        },
        
        content_creator: {
            id: 'content_creator',
            name: 'صانع محتوى',
            level: 50,
            icon: '🎬',
            color: '#c084fc',
            permissions: [
                'create_reels',
                'view_analytics',
                'manage_content',
                'view_earnings'
            ]
        },
        
        entertainer: {
            id: 'entertainer',
            name: 'ترفيه',
            level: 40,
            icon: '🎪',
            color: '#f472b6',
            permissions: [
                'create_live',
                'interact_with_fans',
                'view_engagement'
            ]
        },
        
        customer: {
            id: 'customer',
            name: 'مشتري',
            level: 10,
            icon: '👤',
            color: '#94a3b8',
            permissions: [
                'browse_products',
                'place_orders',
                'track_orders',
                'write_reviews'
            ]
        }
    },
    
    // وصف الصلاحيات
    permissions: {
        view_products: { name: 'مشاهدة المنتجات', description: 'عرض قائمة المنتجات' },
        add_product: { name: 'إضافة منتج', description: 'إضافة منتج جديد' },
        edit_product: { name: 'تعديل منتج', description: 'تعديل بيانات المنتج' },
        delete_product: { name: 'حذف منتج', description: 'حذف منتج' },
        view_orders: { name: 'مشاهدة الطلبات', description: 'عرض الطلبات' },
        manage_inventory: { name: 'إدارة المخزون', description: 'التحكم في المخزون' },
        view_sales: { name: 'مشاهدة المبيعات', description: 'تقارير المبيعات' },
        manage_distribution: { name: 'إدارة التوزيع', description: 'توزيع المنتجات' },
        view_deliveries: { name: 'مشاهدة التوصيلات', description: 'عرض التوصيلات' },
        manage_drivers: { name: 'إدارة المندوبين', description: 'إضافة وتعديل المندوبين' },
        track_orders: { name: 'تتبع الطلبات', description: 'تتبع حالة الطلبات' },
        view_delivery_zones: { name: 'مناطق التوصيل', description: 'عرض مناطق التوصيل' },
        view_assigned_orders: { name: 'الطلبات المخصصة', description: 'عرض الطلبات المخصصة' },
        update_delivery_status: { name: 'تحديث حالة التوصيل', description: 'تغيير حالة الطلب' },
        view_earnings: { name: 'مشاهدة الأرباح', description: 'عرض الأرباح' },
        create_reels: { name: 'إنشاء ريلز', description: 'إنشاء مقاطع فيديو قصيرة' },
        view_analytics: { name: 'مشاهدة التحليلات', description: 'إحصائيات المحتوى' },
        manage_content: { name: 'إدارة المحتوى', description: 'إدارة المحتويات' },
        create_live: { name: 'بث مباشر', description: 'إنشاء بث مباشر' },
        interact_with_fans: { name: 'التفاعل مع المعجبين', description: 'الرد على التعليقات' },
        view_engagement: { name: 'مشاهدة التفاعل', description: 'إحصائيات التفاعل' },
        browse_products: { name: 'تصفح المنتجات', description: 'مشاهدة المنتجات' },
        place_orders: { name: 'تقديم الطلبات', description: 'إنشاء طلبات شراء' },
        write_reviews: { name: 'كتابة تقييمات', description: 'تقييم المنتجات' }
    },
    
    // التحقق من الصلاحية
    hasPermission(user, permission) {
        if (!user) return false;
        
        // المدير لديه كل الصلاحيات
        if (user.role === 'admin') return true;
        
        // الحصول على صلاحيات الدور
        const role = this.roles[user.role];
        if (!role) return false;
        
        return role.permissions.includes(permission) || role.permissions.includes('all');
    },
    
    // الحصول على اسم الدور
    getRoleName(roleId) {
        return this.roles[roleId]?.name || roleId;
    },
    
    // الحصول على أيقونة الدور
    getRoleIcon(roleId) {
        return this.roles[roleId]?.icon || '👤';
    },
    
    // الحصول على لون الدور
    getRoleColor(roleId) {
        return this.roles[roleId]?.color || '#94a3b8';
    },
    
    // الحصول على قائمة الأدوات المتاحة
    getAvailableRoles() {
        return Object.values(this.roles).map(r => ({
            id: r.id,
            name: r.name,
            icon: r.icon,
            level: r.level
        }));
    },
    
    // الحصول على صلاحيات الدور
    getRolePermissions(roleId) {
        const role = this.roles[roleId];
        if (!role) return [];
        
        if (role.permissions.includes('all')) {
            return Object.keys(this.permissions);
        }
        
        return role.permissions;
    },
    
    // وصف الصلاحية
    getPermissionDescription(permission) {
        return this.permissions[permission]?.description || permission;
    }
};

// ===== [7.2] تهيئة النظام =====
window.Roles = RoleSystem;

console.log('✅ نظام الأدوار جاهز');
