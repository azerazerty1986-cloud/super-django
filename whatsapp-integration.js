/**
 * نظام الواتساب المتقدم - WhatsApp Integration 2026
 * نكهة وجمال | ناردو برو
 * 
 * يوفر نظام متكامل لإدارة الطلبات عبر الواتساب مع تتبع الطلبات والتأكيدات
 */

class WhatsAppIntegration {
    constructor() {
        this.storePhone = '213562243648'; // رقم الواتساب الرئيسي للمتجر
        this.orderHistory = this.loadOrderHistory();
        this.pendingOrders = [];
    }

    /**
     * تحميل سجل الطلبات من التخزين المحلي
     */
    loadOrderHistory() {
        const saved = localStorage.getItem('nardoo_order_history');
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * حفظ سجل الطلبات
     */
    saveOrderHistory() {
        localStorage.setItem('nardoo_order_history', JSON.stringify(this.orderHistory));
    }

    /**
     * إنشاء رسالة طلب احترافية
     * @param {Object} orderData - بيانات الطلب
     * @returns {string} رسالة مُنسقة
     */
    formatOrderMessage(orderData) {
        const {
            items = [],
            customerName = '',
            customerPhone = '',
            customerAddress = '',
            totalPrice = 0,
            paymentMethod = 'الواتساب',
            notes = '',
            orderId = '',
            timestamp = new Date()
        } = orderData;

        let message = '🛍️ *طلب جديد من نكهة وجمال | ناردو برو*\n';
        message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        // معلومات العميل
        message += '👤 *معلومات العميل:*\n';
        message += `  • الاسم: ${customerName}\n`;
        message += `  • الهاتف: ${customerPhone}\n`;
        message += `  • العنوان: ${customerAddress}\n\n`;

        // تفاصيل المنتجات
        message += '📦 *المنتجات:*\n';
        items.forEach((item, index) => {
            const subtotal = item.price * item.quantity;
            message += `  ${index + 1}. ${item.name}\n`;
            message += `     • السعر: ${item.price.toLocaleString()} دج\n`;
            message += `     • الكمية: ${item.quantity}\n`;
            message += `     • المجموع: ${subtotal.toLocaleString()} دج\n`;
        });

        message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        // الملخص المالي
        message += '💰 *الملخص المالي:*\n';
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.09); // ضريبة 9%
        const shipping = this.calculateShipping(customerAddress);
        const finalTotal = subtotal + tax + shipping;

        message += `  • المجموع الفرعي: ${subtotal.toLocaleString()} دج\n`;
        message += `  • الضريبة (9%): ${tax.toLocaleString()} دج\n`;
        message += `  • الشحن: ${shipping.toLocaleString()} دج\n`;
        message += `  • *الإجمالي: ${finalTotal.toLocaleString()} دج*\n\n`;

        // طريقة الدفع
        message += `💳 *طريقة الدفع:* ${paymentMethod}\n`;

        // ملاحظات إضافية
        if (notes) {
            message += `📝 *ملاحظات:* ${notes}\n`;
        }

        // معرّف الطلب
        if (orderId) {
            message += `\n🔔 *معرّف الطلب:* #${orderId}\n`;
        }

        message += `⏰ *التاريخ والوقت:* ${this.formatDateTime(timestamp)}\n`;
        message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        message += '✅ شكراً لطلبك! سيتم التواصل معك قريباً.';

        return message;
    }

    /**
     * حساب تكلفة الشحن بناءً على المنطقة
     * @param {string} address - عنوان التوصيل
     * @returns {number} تكلفة الشحن
     */
    calculateShipping(address) {
        // يمكن تحسين هذا النظام لاحقاً بناءً على المناطق الفعلية
        const shippingRates = {
            'الجزائر العاصمة': 500,
            'الجزائر': 500,
            'وهران': 700,
            'قسنطينة': 800,
            'تلمسان': 750,
            'الشلف': 600,
            'الأغواط': 900,
            'تيارت': 700,
            'تيزي وزو': 650,
            'الجزائر الوسطى': 700,
            'الجزائر الشرقية': 900,
            'الجزائر الغربية': 800,
            'الجنوب': 1200
        };

        // البحث عن المنطقة في العنوان
        for (const [region, cost] of Object.entries(shippingRates)) {
            if (address.includes(region)) {
                return cost;
            }
        }

        // الشحن الافتراضي
        return 800;
    }

    /**
     * تنسيق التاريخ والوقت
     * @param {Date} date - التاريخ
     * @returns {string} تاريخ منسق
     */
    formatDateTime(date) {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Africa/Algiers'
        };
        return new Intl.DateTimeFormat('ar-DZ', options).format(date);
    }

    /**
     * إرسال الطلب عبر الواتساب
     * @param {Object} orderData - بيانات الطلب
     * @param {string} recipientPhone - رقم الواتساب المستقبل (اختياري)
     */
    sendOrder(orderData, recipientPhone = null) {
        const message = this.formatOrderMessage(orderData);
        const phone = recipientPhone || this.storePhone;
        const encodedMessage = encodeURIComponent(message);
        
        // فتح الواتساب
        const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        // حفظ الطلب في السجل
        this.saveOrderToHistory(orderData);
    }

    /**
     * حفظ الطلب في السجل التاريخي
     * @param {Object} orderData - بيانات الطلب
     */
    saveOrderToHistory(orderData) {
        const order = {
            id: this.generateOrderId(),
            ...orderData,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        this.orderHistory.push(order);
        this.saveOrderHistory();
        
        return order.id;
    }

    /**
     * توليد معرّف فريد للطلب
     * @returns {string} معرّف الطلب
     */
    generateOrderId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ND${timestamp}${random}`;
    }

    /**
     * الحصول على سجل الطلبات
     * @returns {Array} قائمة الطلبات
     */
    getOrderHistory() {
        return this.orderHistory;
    }

    /**
     * الحصول على تفاصيل طلب معين
     * @param {string} orderId - معرّف الطلب
     * @returns {Object|null} بيانات الطلب
     */
    getOrderDetails(orderId) {
        return this.orderHistory.find(order => order.id === orderId) || null;
    }

    /**
     * تحديث حالة الطلب
     * @param {string} orderId - معرّف الطلب
     * @param {string} status - الحالة الجديدة
     */
    updateOrderStatus(orderId, status) {
        const order = this.orderHistory.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            order.updatedAt = new Date().toISOString();
            this.saveOrderHistory();
        }
    }

    /**
     * حساب إحصائيات المبيعات
     * @returns {Object} الإحصائيات
     */
    getSalesStatistics() {
        const stats = {
            totalOrders: this.orderHistory.length,
            totalRevenue: 0,
            averageOrderValue: 0,
            pendingOrders: 0,
            completedOrders: 0,
            topProducts: {}
        };

        this.orderHistory.forEach(order => {
            const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            stats.totalRevenue += orderTotal;

            if (order.status === 'pending') stats.pendingOrders++;
            if (order.status === 'completed') stats.completedOrders++;

            order.items.forEach(item => {
                stats.topProducts[item.name] = (stats.topProducts[item.name] || 0) + item.quantity;
            });
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

        return stats;
    }

    /**
     * تصدير الطلبات كـ CSV
     * @returns {string} بيانات CSV
     */
    exportOrdersAsCSV() {
        let csv = 'معرّف الطلب,العميل,الهاتف,العنوان,المجموع,الحالة,التاريخ\n';

        this.orderHistory.forEach(order => {
            const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            csv += `${order.id},"${order.customerName}","${order.customerPhone}","${order.customerAddress}",${total},"${order.status}","${order.timestamp}"\n`;
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
}

// إنشاء نسخة عامة من الكائن
const whatsappManager = new WhatsAppIntegration();
// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppIntegration;
}
