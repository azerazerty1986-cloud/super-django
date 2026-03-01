/**
 * نظام إدارة الطلبات المتقدم - Order Management System 2026
 * نكهة وجمال | ناردو برو
 * 
 * يوفر نظام متكامل لإدارة دورة حياة الطلب من الإنشاء إلى التسليم
 */

class OrderManagementSystem {
    constructor() {
        this.orders = this.loadOrders();
        this.paymentMethods = ['الواتساب', 'التحويل البنكي', 'الدفع عند الاستلام', 'بطاقة ائتمان'];
        this.orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    }

    /**
     * تحميل الطلبات من التخزين المحلي
     */
    loadOrders() {
        const saved = localStorage.getItem('nardoo_orders_management');
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * حفظ الطلبات
     */
    saveOrders() {
        localStorage.setItem('nardoo_orders_management', JSON.stringify(this.orders));
    }

    /**
     * إنشاء طلب جديد
     * @param {Object} orderData - بيانات الطلب
     * @returns {Object} الطلب المُنشأ
     */
    createOrder(orderData) {
        const order = {
            id: this.generateOrderId(),
            customerId: orderData.customerId || null,
            customerName: orderData.customerName,
            customerEmail: orderData.customerEmail || '',
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items || [],
            subtotal: this.calculateSubtotal(orderData.items),
            tax: 0,
            shipping: orderData.shipping || 0,
            discount: orderData.discount || 0,
            total: 0,
            paymentMethod: orderData.paymentMethod || 'الواتساب',
            notes: orderData.notes || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
                {
                    status: 'pending',
                    timestamp: new Date().toISOString(),
                    message: 'تم إنشاء الطلب'
                }
            ]
        };

        // حساب الضريبة والإجمالي
        order.tax = Math.round(order.subtotal * 0.09);
        order.total = order.subtotal + order.tax + order.shipping - order.discount;

        this.orders.push(order);
        this.saveOrders();

        return order;
    }

    /**
     * حساب المجموع الفرعي
     * @param {Array} items - المنتجات
     * @returns {number} المجموع الفرعي
     */
    calculateSubtotal(items) {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    /**
     * توليد معرّف فريد للطلب
     * @returns {string} معرّف الطلب
     */
    generateOrderId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ORD${timestamp}${random}`;
    }

    /**
     * الحصول على طلب معين
     * @param {string} orderId - معرّف الطلب
     * @returns {Object|null} بيانات الطلب
     */
    getOrder(orderId) {
        return this.orders.find(order => order.id === orderId) || null;
    }

    /**
     * الحصول على جميع طلبات العميل
     * @param {string} customerId - معرّف العميل
     * @returns {Array} قائمة الطلبات
     */
    getCustomerOrders(customerId) {
        return this.orders.filter(order => order.customerId === customerId);
    }

    /**
     * تحديث حالة الطلب
     * @param {string} orderId - معرّف الطلب
     * @param {string} newStatus - الحالة الجديدة
     * @param {string} message - رسالة التحديث
     */
    updateOrderStatus(orderId, newStatus, message = '') {
        const order = this.getOrder(orderId);
        if (!order) return false;

        if (!this.orderStatuses.includes(newStatus)) {
            console.error(`حالة غير صحيحة: ${newStatus}`);
            return false;
        }

        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        order.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: message || this.getStatusMessage(newStatus)
        });

        this.saveOrders();
        return true;
    }

    /**
     * الحصول على رسالة الحالة الافتراضية
     * @param {string} status - الحالة
     * @returns {string} الرسالة
     */
    getStatusMessage(status) {
        const messages = {
            'pending': 'في انتظار التأكيد',
            'confirmed': 'تم تأكيد الطلب',
            'processing': 'جاري معالجة الطلب',
            'shipped': 'تم شحن الطلب',
            'delivered': 'تم تسليم الطلب',
            'cancelled': 'تم إلغاء الطلب'
        };
        return messages[status] || 'تحديث الطلب';
    }

    /**
     * تطبيق كود خصم
     * @param {string} orderId - معرّف الطلب
     * @param {string} couponCode - كود الخصم
     * @returns {boolean} هل تم تطبيق الخصم بنجاح
     */
    applyCoupon(orderId, couponCode) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        // قاموس الكوبونات (يمكن توسيعه لاحقاً)
        const coupons = {
            'NARDOO10': { discount: 0.10, description: 'خصم 10%' },
            'NARDOO20': { discount: 0.20, description: 'خصم 20%' },
            'WELCOME': { discount: 0.15, description: 'خصم ترحيب 15%' },
            'SUMMER2026': { discount: 0.25, description: 'عرض صيفي 25%' }
        };

        const coupon = coupons[couponCode];
        if (!coupon) return false;

        const discountAmount = Math.round(order.subtotal * coupon.discount);
        order.discount = discountAmount;
        order.total = order.subtotal + order.tax + order.shipping - order.discount;
        order.couponCode = couponCode;
        order.couponDescription = coupon.description;

        this.saveOrders();
        return true;
    }

    /**
     * إضافة ملاحظة للطلب
     * @param {string} orderId - معرّف الطلب
     * @param {string} note - الملاحظة
     */
    addNote(orderId, note) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        if (!order.notes) order.notes = '';
        order.notes += `\n[${new Date().toLocaleString('ar-DZ')}]: ${note}`;
        order.updatedAt = new Date().toISOString();

        this.saveOrders();
        return true;
    }

    /**
     * حساب إحصائيات الطلبات
     * @returns {Object} الإحصائيات
     */
    getOrderStatistics() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: 0,
            averageOrderValue: 0,
            ordersByStatus: {},
            ordersByPaymentMethod: {},
            topCustomers: {},
            recentOrders: []
        };

        // تهيئة عدادات الحالات
        this.orderStatuses.forEach(status => {
            stats.ordersByStatus[status] = 0;
        });

        // تهيئة عدادات طرق الدفع
        this.paymentMethods.forEach(method => {
            stats.ordersByPaymentMethod[method] = 0;
        });

        // حساب الإحصائيات
        this.orders.forEach(order => {
            stats.totalRevenue += order.total;
            stats.ordersByStatus[order.status]++;
            stats.ordersByPaymentMethod[order.paymentMethod]++;

            // تتبع أفضل العملاء
            const customerKey = order.customerName;
            if (!stats.topCustomers[customerKey]) {
                stats.topCustomers[customerKey] = { count: 0, total: 0 };
            }
            stats.topCustomers[customerKey].count++;
            stats.topCustomers[customerKey].total += order.total;
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

        // الطلبات الأخيرة
        stats.recentOrders = this.orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);

        return stats;
    }

    /**
     * البحث عن الطلبات
     * @param {Object} filters - معايير البحث
     * @returns {Array} الطلبات المطابقة
     */
    searchOrders(filters = {}) {
        return this.orders.filter(order => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.customerId && order.customerId !== filters.customerId) return false;
            if (filters.paymentMethod && order.paymentMethod !== filters.paymentMethod) return false;
            if (filters.minTotal && order.total < filters.minTotal) return false;
            if (filters.maxTotal && order.total > filters.maxTotal) return false;
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                return (
                    order.id.toLowerCase().includes(searchTerm) ||
                    order.customerName.toLowerCase().includes(searchTerm) ||
                    order.customerPhone.includes(searchTerm)
                );
            }
            return true;
        });
    }

    /**
     * تصدير الطلبات كـ JSON
     * @returns {string} بيانات JSON
     */
    exportOrdersAsJSON() {
        return JSON.stringify(this.orders, null, 2);
    }

    /**
     * تصدير الطلبات كـ CSV
     * @returns {string} بيانات CSV
     */
    exportOrdersAsCSV() {
        let csv = 'معرّف الطلب,العميل,الهاتف,المجموع,طريقة الدفع,الحالة,التاريخ\n';

        this.orders.forEach(order => {
            csv += `"${order.id}","${order.customerName}","${order.customerPhone}",${order.total},"${order.paymentMethod}","${order.status}","${order.createdAt}"\n`;
        });

        return csv;
    }

    /**
     * تحميل ملف CSV للطلبات
     */
    downloadOrdersCSV() {
        const csv = this.exportOrdersAsCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `nardoo-orders-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * حذف طلب
     * @param {string} orderId - معرّف الطلب
     */
    deleteOrder(orderId) {
        const index = this.orders.findIndex(order => order.id === orderId);
        if (index > -1) {
            this.orders.splice(index, 1);
            this.saveOrders();
            return true;
        }
        return false;
    }

    /**
     * تنظيف الطلبات القديمة (أكثر من 6 أشهر)
     */
    cleanupOldOrders() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const initialCount = this.orders.length;
        this.orders = this.orders.filter(order => new Date(order.createdAt) > sixMonthsAgo);
        this.saveOrders();

        return initialCount - this.orders.length;
    }
}

// إنشاء نسخة عامة من الكائن
const orderManager = new OrderManagementSystem();
// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderManagementSystem;
}

