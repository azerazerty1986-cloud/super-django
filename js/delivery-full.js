/* ================================================================== */
/* ===== [08] الملف: 08-delivery-full.js - نظام التوصيل المتكامل ===== */
/* ================================================================== */

// ===== [8.1] نظام التوصيل الأساسي =====
const DeliverySystem = {
    companies: [],
    drivers: [],
    deliveries: [],
    zones: [],
    
    init() {
        this.companies = this.loadData('delivery_companies', []);
        this.drivers = this.loadData('delivery_drivers', []);
        this.deliveries = this.loadData('deliveries', []);
        this.zones = this.loadData('delivery_zones', [
            { id: 'ZN001', name: 'الجزائر وسط', price: 500, estimatedDays: '1-2 أيام' },
            { id: 'ZN002', name: 'الجزائر شرق', price: 600, estimatedDays: '1-2 أيام' },
            { id: 'ZN003', name: 'الجزائر غرب', price: 600, estimatedDays: '1-2 أيام' },
            { id: 'ZN004', name: 'وهران', price: 800, estimatedDays: '2-3 أيام' },
            { id: 'ZN005', name: 'قسنطينة', price: 800, estimatedDays: '2-3 أيام' },
            { id: 'ZN006', name: 'عنابة', price: 700, estimatedDays: '2-3 أيام' },
            { id: 'ZN007', name: 'باقي الولايات', price: 1000, estimatedDays: '3-5 أيام' }
        ]);
        
        console.log('🚚 نظام التوصيل جاهز');
        return this;
    },
    
    loadData(key, defaultValue) {
        try {
            const saved = localStorage.getItem(`nardoo_${key}`);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch(e) {
            return defaultValue;
        }
    },
    
    saveData(key, data) {
        localStorage.setItem(`nardoo_${key}`, JSON.stringify(data));
    },
    
    save() {
        this.saveData('delivery_companies', this.companies);
        this.saveData('delivery_drivers', this.drivers);
        this.saveData('deliveries', this.deliveries);
        this.saveData('delivery_zones', this.zones);
    },
    
    addCompany(companyData) {
        const companyId = `COMP_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const company = {
            id: companyId,
            name: companyData.name,
            ownerName: companyData.ownerName,
            phone: companyData.phone,
            email: companyData.email,
            address: companyData.address,
            zones: companyData.zones || this.zones.map(z => z.name),
            drivers: [],
            stats: { totalDeliveries: 0, completedDeliveries: 0, rating: 5 },
            createdAt: new Date().toISOString(),
            status: 'approved'
        };
        this.companies.push(company);
        this.save();
        return company;
    },
    
    addDriver(driverData) {
        const driverId = `DRIVER_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const driver = {
            id: driverId,
            companyId: driverData.companyId,
            name: driverData.name,
            phone: driverData.phone,
            vehicleType: driverData.vehicleType || 'دراجة نارية',
            licenseNumber: driverData.licenseNumber,
            workZones: driverData.workZones || this.zones.map(z => z.name),
            status: 'available',
            stats: { deliveries: 0, rating: 5, earnings: 0 },
            currentLocation: null,
            joinedAt: new Date().toISOString()
        };
        this.drivers.push(driver);
        const company = this.companies.find(c => c.id === driverData.companyId);
        if (company) company.drivers.push(driverId);
        this.save();
        return driver;
    },
    
    createDelivery(orderData) {
        const deliveryId = `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const zoneInfo = this.getZoneInfo(orderData.zone);
        
        const delivery = {
            id: deliveryId,
            orderId: orderData.orderId,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            zone: orderData.zone,
            zonePrice: zoneInfo.price,
            estimatedDays: zoneInfo.estimatedDays,
            deliveryTime: orderData.deliveryTime || 'asap',
            items: orderData.items || [],
            total: orderData.total,
            deliveryPrice: zoneInfo.price,
            status: 'pending',
            assignedTo: null,
            assignedAt: null,
            pickedUpAt: null,
            deliveredAt: null,
            timeline: [{ status: 'pending', timestamp: new Date().toISOString(), note: 'تم إنشاء التوصيلة' }],
            createdAt: new Date().toISOString()
        };
        
        this.deliveries.push(delivery);
        this.save();
        this.autoAssignDriver(delivery.id);
        return delivery;
    },
    
    getZoneInfo(zoneName) {
        const zone = this.zones.find(z => z.name === zoneName);
        return zone || { price: 1000, estimatedDays: '3-5 أيام', name: 'أخرى' };
    },
    
    autoAssignDriver(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery || delivery.assignedTo) return false;
        const availableDriver = this.drivers.find(d => d.status === 'available' && d.workZones.includes(delivery.zone));
        if (availableDriver) return this.assignDriver(deliveryId, availableDriver.id);
        return false;
    },
    
    assignDriver(deliveryId, driverId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        const driver = this.drivers.find(d => d.id === driverId);
        if (!delivery || !driver) return false;
        
        delivery.assignedTo = driverId;
        delivery.assignedAt = new Date().toISOString();
        delivery.status = 'assigned';
        delivery.timeline.push({ status: 'assigned', timestamp: new Date().toISOString(), note: `تم التعيين للمندوب ${driver.name}` });
        driver.status = 'busy';
        this.save();
        return true;
    },
    
    updateDeliveryStatus(deliveryId, status, note = '') {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return false;
        
        const oldStatus = delivery.status;
        delivery.status = status;
        
        if (status === 'picked_up') {
            delivery.pickedUpAt = new Date().toISOString();
        } else if (status === 'delivered') {
            delivery.deliveredAt = new Date().toISOString();
            const driver = this.drivers.find(d => d.id === delivery.assignedTo);
            if (driver) {
                driver.stats.deliveries++;
                driver.stats.earnings += delivery.deliveryPrice;
                driver.status = 'available';
            }
        } else if (status === 'cancelled') {
            const driver = this.drivers.find(d => d.id === delivery.assignedTo);
            if (driver) driver.status = 'available';
        }
        
        delivery.timeline.push({ status: status, timestamp: new Date().toISOString(), note: note || `تغيير الحالة من ${oldStatus} إلى ${status}` });
        this.save();
        return true;
    },
    
    getActiveDeliveries() {
        return this.deliveries.filter(d => ['pending', 'assigned', 'picked_up'].includes(d.status));
    },
    
    getStats() {
        const total = this.deliveries.length;
        const completed = this.deliveries.filter(d => d.status === 'delivered').length;
        const pending = this.deliveries.filter(d => d.status === 'pending').length;
        const assigned = this.deliveries.filter(d => d.status === 'assigned').length;
        const totalEarnings = this.deliveries.filter(d => d.status === 'delivered').reduce((sum, d) => sum + (d.deliveryPrice || 0), 0);
        return { total, completed, pending, assigned, totalEarnings, companies: this.companies.length, drivers: this.drivers.length };
    },
    
    getZonesForSelect() {
        return this.zones.map(zone => ({
            name: zone.name,
            price: zone.price,
            estimatedDays: zone.estimatedDays,
            html: `<option value="${zone.name}" data-price="${zone.price}" data-days="${zone.estimatedDays}">${zone.name} - ${zone.price.toLocaleString()} دج (${zone.estimatedDays})</option>`
        }));
    }
};

// تهيئة النظام
DeliverySystem.init();

// ===== [8.2] التحقق من وجود الدوال الأساسية =====
// التأكد من وجود showNotification
if (typeof window.showNotification !== 'function') {
    window.showNotification = function(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        alert(message);
    };
}

// التأكد من وجود sendTelegramMessage
if (typeof window.sendTelegramMessage !== 'function') {
    window.sendTelegramMessage = async function(message, parseMode = 'HTML') {
        console.log('إرسال رسالة:', message);
        return { ok: true };
    };
}

// التأكد من وجود saveOrderToHistory
if (typeof window.saveOrderToHistory !== 'function') {
    window.saveOrderToHistory = function(orderId, orderData) {
        const ordersHistory = JSON.parse(localStorage.getItem('nardoo_orders_history') || '[]');
        ordersHistory.unshift(orderData);
        localStorage.setItem('nardoo_orders_history', JSON.stringify(ordersHistory.slice(0, 50)));
    };
}

// ===== [8.3] دالة عرض نافذة الطلب مع زر التوصيل =====
window.showOrderModalWithDelivery = function() {
    return new Promise((resolve) => {
        // حساب إجمالي المنتجات
        const subtotal = window.cart ? window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
        const zonesOptions = DeliverySystem.getZonesForSelect();
        const currentUser = window.currentUser || {};
        
        const modal = document.createElement('div');
        modal.id = 'deliveryOrderModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            z-index: 20000; display: flex; justify-content: center; align-items: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary, #1a1a2e); border-radius: 30px; padding: 30px;
                        max-width: 550px; width: 90%; max-height: 85vh; overflow-y: auto;
                        border: 2px solid var(--gold, #ffd700); box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        animation: slideUp 0.3s ease;">
                
                <h2 style="color: var(--gold, #ffd700); text-align: center; margin-bottom: 25px;">
                    <i class="fas fa-shopping-cart"></i> إتمام الطلب
                </h2>
                
                <!-- معلومات العميل -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-user"></i> الاسم الكامل <span style="color: red;">*</span>
                    </label>
                    <input type="text" id="customerName" value="${currentUser.name || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                  background: var(--bg-primary, #16213e); color: var(--text, #fff);">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-phone"></i> رقم الهاتف <span style="color: red;">*</span>
                    </label>
                    <input type="tel" id="customerPhone" value="${currentUser.phone || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                  background: var(--bg-primary, #16213e); color: var(--text, #fff);">
                </div>
                
                <!-- منطقة التوصيل - زر التوصيل الأول -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-truck"></i> منطقة التوصيل <span style="color: red;">*</span>
                    </label>
                    <select id="deliveryZone" 
                            style="width: 100%; padding: 12px; border-radius: 10px; 
                                   border: 1px solid var(--gold, #ffd700); background: var(--bg-primary, #16213e); color: var(--text, #fff);">
                        ${zonesOptions.map(z => z.html).join('')}
                    </select>
                </div>
                
                <!-- العنوان التفصيلي -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-location-dot"></i> العنوان التفصيلي <span style="color: red;">*</span>
                    </label>
                    <textarea id="customerAddress" rows="3" 
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                     background: var(--bg-primary, #16213e); color: var(--text, #fff);"
                              placeholder="الشارع، رقم البناء، الطابق..."></textarea>
                </div>
                
                <!-- وقت التوصيل -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-clock"></i> وقت التوصيل المفضل
                    </label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="asap" checked> في أقرب وقت
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="morning"> الصباح
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="afternoon"> بعد الظهر
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="evening"> المساء
                        </label>
                    </div>
                </div>
                
                <!-- ملاحظات -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #fff);">
                        <i class="fas fa-sticky-note"></i> ملاحظات إضافية
                    </label>
                    <textarea id="orderNotes" rows="2" 
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                     background: var(--bg-primary, #16213e); color: var(--text, #fff);"
                              placeholder="تعليمات التوصيل..."></textarea>
                </div>
                
                <!-- ملخص الطلب -->
                <div id="deliverySummary" style="background: rgba(255,215,0,0.15); padding: 20px; border-radius: 15px; margin: 20px 0;">
                    <div style="text-align: center; color: var(--gold, #ffd700);">جاري تحميل الملخص...</div>
                </div>
                
                <!-- أزرار الإجراء - زر التوصيل الرئيسي هنا -->
                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button onclick="this.closest('#deliveryOrderModal').remove()" 
                            style="flex: 1; padding: 15px; background: #f87171; color: white;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                    <button id="confirmOrderWithDeliveryBtn" 
                            style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffb700); color: #000;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-truck"></i> 🚚 تأكيد الطلب والتوصيل
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // تحديث ملخص الطلب
        const updateSummary = () => {
            const zoneSelect = modal.querySelector('#deliveryZone');
            const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
            const zonePrice = parseInt(selectedOption.dataset.price) || 1000;
            const estimatedDays = selectedOption.dataset.days || '3-5 أيام';
            const total = subtotal + zonePrice;
            
            const summaryDiv = modal.querySelector('#deliverySummary');
            summaryDiv.innerHTML = `
                <h4 style="color: var(--gold, #ffd700); margin-bottom: 15px; text-align: center;">📊 ملخص الطلب</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🛍️ إجمالي المنتجات:</span>
                    <span><strong>${subtotal.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🚚 رسوم التوصيل:</span>
                    <span><strong>${zonePrice.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>⏰ المدة المتوقعة:</span>
                    <span><strong>${estimatedDays}</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid var(--gold, #ffd700);">
                    <span style="font-size: 18px;">💎 الإجمالي النهائي:</span>
                    <span style="font-size: 22px; color: var(--gold, #ffd700); font-weight: bold;">${total.toLocaleString()} دج</span>
                </div>
            `;
        };
        
        const zoneSelect = modal.querySelector('#deliveryZone');
        if (zoneSelect) {
            zoneSelect.addEventListener('change', updateSummary);
        }
        updateSummary();
        
        // زر تأكيد الطلب مع التوصيل
        const confirmBtn = modal.querySelector('#confirmOrderWithDeliveryBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const customerName = modal.querySelector('#customerName').value;
                const customerPhone = modal.querySelector('#customerPhone').value;
                const customerAddress = modal.querySelector('#customerAddress').value;
                const deliveryZone = modal.querySelector('#deliveryZone').value;
                const deliveryTime = modal.querySelector('input[name="deliveryTime"]:checked')?.value || 'asap';
                const notes = modal.querySelector('#orderNotes').value;
                
                if (!customerName || !customerPhone || !customerAddress) {
                    showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                    return;
                }
                
                const selectedOption = modal.querySelector('#deliveryZone').options[modal.querySelector('#deliveryZone').selectedIndex];
                const shipping = parseInt(selectedOption.dataset.price) || 1000;
                const estimatedDays = selectedOption.dataset.days || '3-5 أيام';
                
                modal.remove();
                resolve({ customerName, customerPhone, customerAddress, deliveryZone, deliveryTime, notes, shipping, estimatedDays });
            };
        }
    });
};

// ===== [8.4] تعديل دالة إتمام الطلب =====
const originalCheckoutCart = window.checkoutCart;

window.checkoutCart = async function() {
    console.log('🔄 بدء عملية الشراء مع نظام التوصيل');
    
    // التحقق من السلة
    if (!window.cart || window.cart.length === 0) {
        showNotification('🛒 السلة فارغة! أضف بعض المنتجات أولاً', 'warning');
        return;
    }

    if (!window.currentUser) {
        showNotification('🔐 يرجى تسجيل الدخول أولاً لإتمام عملية الشراء', 'warning');
        if (typeof window.openLoginModal === 'function') window.openLoginModal();
        return;
    }

    // فتح نافذة الطلب مع زر التوصيل
    const orderData = await window.showOrderModalWithDelivery();
    if (!orderData) return;

    const {
        customerName, customerPhone, customerAddress,
        deliveryZone, deliveryTime, notes, shipping, estimatedDays
    } = orderData;

    // إنشاء رقم طلب فريد
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const orderDate = new Date().toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // حساب تفاصيل الطلب
    const subtotal = window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + shipping;

    // إنشاء توصيلة
    const delivery = DeliverySystem.createDelivery({
        orderId: orderId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        zone: deliveryZone,
        deliveryTime: deliveryTime,
        items: window.cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            merchantName: item.merchantName
        })),
        total: total
    });

    // تجميع المنتجات حسب التاجر
    const merchantOrders = {};
    for (const item of window.cart) {
        const merchantName = item.merchantName;
        if (!merchantOrders[merchantName]) {
            merchantOrders[merchantName] = { items: [], subtotal: 0 };
        }
        merchantOrders[merchantName].items.push(item);
        merchantOrders[merchantName].subtotal += item.price * item.quantity;
    }

    const merchantCount = Object.keys(merchantOrders).length;
    const shippingPerMerchant = merchantCount > 0 ? shipping / merchantCount : 0;

    // إنشاء تقرير الطلب
    const orderReport = generateOrderReportWithDelivery(
        orderId, orderDate, { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime },
        subtotal, shipping, total, merchantOrders, shippingPerMerchant, delivery.id, estimatedDays
    );

    // إرسال التقارير
    if (typeof window.sendTelegramMessage === 'function') {
        await window.sendTelegramMessage(orderReport, 'HTML');
        
        for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
            const merchantTotal = orderData.subtotal + shippingPerMerchant;
            const merchantMessage = generateMerchantMessageWithDelivery(
                orderId, merchantName, orderData.items,
                orderData.subtotal, merchantTotal, { customerName, customerPhone, customerAddress, notes },
                estimatedDays, delivery.id
            );
            await window.sendTelegramMessage(merchantMessage, 'HTML');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const customerConfirmation = generateCustomerConfirmationWithTracking(
            orderId, orderDate, window.cart, total, estimatedDays, customerAddress, delivery.id
        );
        await window.sendTelegramMessage(customerConfirmation, 'HTML');
    }

    // حفظ الطلب
    if (typeof window.saveOrderToHistory === 'function') {
        window.saveOrderToHistory(orderId, {
            orderId, orderDate,
            customerInfo: { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime },
            items: [...window.cart], subtotal, shipping, total,
            deliveryId: delivery.id, status: 'pending', merchantOrders
        });
    }

    // تفريغ السلة
    window.cart = [];
    if (typeof window.saveCart === 'function') window.saveCart();
    if (typeof window.updateCartCounter === 'function') window.updateCartCounter();
    if (typeof window.toggleCart === 'function') window.toggleCart();

    // عرض نافذة النجاح
    showOrderSuccessModalWithTracking(orderId, total, estimatedDays, delivery.id);

    console.log(`✅ تم إرسال الطلب - رقم: ${orderId} - توصيلة: ${delivery.id}`);
    showNotification(`✅ تم إرسال طلبك بنجاح! رقم الطلب: ${orderId}`, 'success');
};

// ===== [8.5] دوال إنشاء التقارير =====
function generateOrderReportWithDelivery(orderId, orderDate, customerInfo, subtotal, shipping, total, merchantOrders, shippingPerMerchant, deliveryId, estimatedDays) {
    const { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime } = customerInfo;
    
    let merchantsDetails = '';
    for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
        merchantsDetails += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🏪 ${merchantName}
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        for (const item of orderData.items) {
            merchantsDetails += `
┃ 📦 ${item.name}
┃    ├ الكمية: ${item.quantity}
┃    └ السعر: ${(item.price * item.quantity).toLocaleString()} دج`;
        }
        merchantsDetails += `
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 💰 إجمالي المنتجات: ${orderData.subtotal.toLocaleString()} دج
┃ 🚚 حصة التوصيل: ${Math.round(shippingPerMerchant).toLocaleString()} دج
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    const timeText = deliveryTime === 'asap' ? 'في أقرب وقت' : 
                     deliveryTime === 'morning' ? 'الصباح' :
                     deliveryTime === 'afternoon' ? 'بعد الظهر' : 'المساء';

    return `
╔══════════════════════════════════════════════════════════╗
║           🧾 طلب جديد - ناردو برو                         ║
╠══════════════════════════════════════════════════════════╣
║ 📋 رقم الطلب: ${orderId}
║ 🆔 رقم التوصيلة: ${deliveryId}
║ 🕐 تاريخ الطلب: ${orderDate}
╠══════════════════════════════════════════════════════════╣
║                      👤 معلومات العميل                    ║
╠══════════════════════════════════════════════════════════╣
║ 👨 الاسم: ${customerName}
║ 📞 الهاتف: ${customerPhone}
║ 📍 العنوان: ${customerAddress}
║ 🗺️ المنطقة: ${deliveryZone}
║ ⏰ وقت التوصيل: ${timeText}
║ 📝 ملاحظات: ${notes || 'لا توجد'}
╠══════════════════════════════════════════════════════════╣
║                      📊 تفاصيل الطلب                       ║
╠══════════════════════════════════════════════════════════╣
${merchantsDetails}
╠══════════════════════════════════════════════════════════╣
║                      💰 إجماليات الطلب                     ║
╠══════════════════════════════════════════════════════════╣
║ 💵 إجمالي المنتجات: ${subtotal.toLocaleString()} دج
║ 🚚 رسوم التوصيل: ${shipping.toLocaleString()} دج
╠══════════════════════════════════════════════════════════╣
║ 💎 الإجمالي النهائي: ${total.toLocaleString()} دج
║ ⏰ الوقت المتوقع: ${estimatedDays}
╚══════════════════════════════════════════════════════════╝
    `;
}

function generateMerchantMessageWithDelivery(orderId, merchantName, items, subtotal, total, customerInfo, estimatedDays, deliveryId) {
    const itemsList = items.map((item, index) => 
        `${index + 1}️⃣ ${item.name}\n   الكمية: ${item.quantity}\n   السعر: ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n\n');
    
    return `
🟢 طلب جديد - ${merchantName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 رقم الطلب: ${orderId}
🆔 رقم التوصيلة: ${deliveryId}

👤 معلومات الزبون:
┌─────────────────────────
├ 👨 الاسم: ${customerInfo.customerName}
├ 📞 الهاتف: ${customerInfo.customerPhone}
├ 📍 العنوان: ${customerInfo.customerAddress}
└ 📝 ملاحظات: ${customerInfo.notes || 'لا توجد'}

📦 المنتجات المطلوبة:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 إجمالي المنتجات: ${subtotal.toLocaleString()} دج
🚚 حصة التوصيل: ${Math.round(total - subtotal).toLocaleString()} دج
💎 الإجمالي: ${Math.round(total).toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ الوقت المتوقع: ${estimatedDays}

✅ يرجى تجهيز المنتج
    `;
}

function generateCustomerConfirmationWithTracking(orderId, orderDate, items, total, estimatedDays, address, deliveryId) {
    const itemsSummary = items.map(item => 
        `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} دج = ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n');
    
    return `
🟢 تم استلام طلبك بنجاح!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 رقم الطلب: ${orderId}
🚚 رقم التوصيلة: ${deliveryId}
📅 تاريخ الطلب: ${orderDate}

📦 المنتجات المطلوبة:
${itemsSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 الإجمالي النهائي: ${total.toLocaleString()} دج
🚚 عنوان التوصيل: ${address}
⏰ الوقت المتوقع: ${estimatedDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ شكراً لتسوقك من ناردو برو ✨
    `;
}

function showOrderSuccessModalWithTracking(orderId, total, estimatedDays, deliveryId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
        z-index: 20001; display: flex; justify-content: center; align-items: center;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 30px; padding: 40px; text-align: center;
                    border: 2px solid #ffd700; animation: slideUp 0.3s ease; max-width: 450px;">
            <div style="font-size: 70px; margin-bottom: 15px;">🎉🚚</div>
            <h2 style="color: #ffd700; margin-bottom: 15px;">تم استلام طلبك بنجاح!</h2>
            <p style="color: #fff; margin-bottom: 10px;">
                <strong>رقم الطلب:</strong><br>
                <code style="font-size: 16px; background: rgba(255,215,0,0.1); padding: 8px 12px; border-radius: 8px;">${orderId}</code>
            </p>
            <p style="color: #fff; margin-bottom: 10px;">
                <strong>رقم التوصيلة:</strong><br>
                <code style="font-size: 14px; background: rgba(255,215,0,0.1); padding: 5px 10px; border-radius: 8px;">${deliveryId}</code>
            </p>
            <p style="color: #fff; margin-bottom: 10px;">
                <strong>الإجمالي:</strong> ${total.toLocaleString()} دج
            </p>
            <p style="color: #fff; margin-bottom: 20px;">
                <strong>الوقت المتوقع:</strong> ${estimatedDays}
            </p>
            <button onclick="this.closest('div').parentElement.remove()" 
                    style="background: #ffd700; color: #000; padding: 12px 30px;
                           border: none; border-radius: 30px; font-weight: bold;
                           cursor: pointer; font-size: 16px; margin-top: 10px;">
                <i class="fas fa-check"></i> حسناً
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => { if (modal.parentElement) modal.remove(); }, 5000);
}

// ===== [8.6] لوحة تحكم التوصيل للمدير =====
window.showDeliveryDashboard = function() {
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        if (typeof showNotification === 'function') {
            showNotification('غير مصرح - هذه اللوحة للمدير فقط', 'error');
        }
        return;
    }

    const content = document.getElementById('dashboardContent');
    if (!content) return;

    const stats = DeliverySystem.getStats();
    
    content.innerHTML = `
        <div class="delivery-dashboard">
            <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px;">
                <i class="fas fa-truck"></i> نظام التوصيل - لوحة التحكم
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0;">
                <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-box" style="font-size: 30px; color: var(--gold, #ffd700);"></i>
                    <h4>${stats.total}</h4>
                    <small>إجمالي التوصيلات</small>
                </div>
                <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 30px; color: #4ade80;"></i>
                    <h4>${stats.completed}</h4>
                    <small>مكتمل</small>
                </div>
                <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-clock" style="font-size: 30px; color: #fbbf24;"></i>
                    <h4>${stats.pending + stats.assigned}</h4>
                    <small>قيد التنفيذ</small>
                </div>
                <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-money-bill" style="font-size: 30px; color: #4ade80;"></i>
                    <h4>${stats.totalEarnings.toLocaleString()} دج</h4>
                    <small>إجمالي الأرباح</small>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                <button class="btn-gold" onclick="showActiveDeliveries()">
                    <i class="fas fa-truck-moving"></i> التوصيلات النشطة
                </button>
                <button class="btn-gold" onclick="showDeliveryCompanies()">
                    <i class="fas fa-building"></i> شركات التوصيل
                </button>
                <button class="btn-gold" onclick="showDeliveryDrivers()">
                    <i class="fas fa-motorcycle"></i> المندوبون
                </button>
                <button class="btn-outline-gold" onclick="if(window.showDashboardOverview) window.showDashboardOverview()">
                    <i class="fas fa-arrow-left"></i> رجوع
                </button>
            </div>
        </div>
    `;
};

window.showActiveDeliveries = function() {
    const activeDeliveries = DeliverySystem.getActiveDeliveries();
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    if (activeDeliveries.length === 0) {
        content.innerHTML = `
            <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px;">التوصيلات النشطة</h3>
            <p style="color: var(--text-secondary, #888);">لا توجد توصيلات نشطة حالياً</p>
            <button class="btn-outline-gold" onclick="showDeliveryDashboard()">رجوع</button>
        `;
        return;
    }
    
    content.innerHTML = `
        <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px;">
            <i class="fas fa-truck-moving"></i> التوصيلات النشطة (${activeDeliveries.length})
        </h3>
        ${activeDeliveries.map(delivery => `
            <div style="background: var(--glass, rgba(255,255,255,0.1)); border: 1px solid var(--gold, #ffd700); border-radius: 15px; padding: 20px; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
                    <div>
                        <h4 style="color: var(--gold, #ffd700); margin: 0 0 10px 0;">${delivery.id}</h4>
                        <p><i class="fas fa-user"></i> ${delivery.customerName}</p>
                        <p><i class="fas fa-phone"></i> ${delivery.customerPhone}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${delivery.customerAddress}</p>
                        <p><i class="fas fa-tag"></i> المنطقة: ${delivery.zone}</p>
                        <p><i class="fas fa-chart-line"></i> الحالة: ${getDeliveryStatusText(delivery.status)}</p>
                    </div>
                    <div style="text-align: left;">
                        <p><strong>💰 ${delivery.deliveryPrice.toLocaleString()} دج</strong></p>
                        <select id="status_${delivery.id}" style="padding: 8px; border-radius: 8px;">
                            <option value="pending" ${delivery.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
                            <option value="assigned" ${delivery.status === 'assigned' ? 'selected' : ''}>🔄 تم التعيين</option>
                            <option value="picked_up" ${delivery.status === 'picked_up' ? 'selected' : ''}>📦 تم الاستلام</option>
                            <option value="delivered" ${delivery.status === 'delivered' ? 'selected' : ''}>✅ تم التوصيل</option>
                        </select>
                        <button class="btn-gold" style="margin-top: 10px; padding: 8px 15px;" onclick="updateDeliveryStatus('${delivery.id}')">
                            <i class="fas fa-save"></i> تحديث
                        </button>
                    </div>
                </div>
            </div>
        `).join('')}
        <button class="btn-outline-gold" onclick="showDeliveryDashboard()">رجوع للوحة الرئيسية</button>
    `;
};

window.showDeliveryCompanies = function() {
    const companies = DeliverySystem.companies;
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px;">
            <i class="fas fa-building"></i> شركات التوصيل (${companies.length})
        </h3>
        <button class="btn-gold" onclick="showAddCompanyModal()" style="margin-bottom: 20px;">
            <i class="fas fa-plus"></i> إضافة شركة توصيل
        </button>
        ${companies.map(company => `
            <div style="background: var(--glass, rgba(255,255,255,0.1)); border-radius: 15px; padding: 20px; margin: 15px 0;">
                <h4 style="color: var(--gold, #ffd700);">${company.name}</h4>
                <p><i class="fas fa-user-tie"></i> المالك: ${company.ownerName}</p>
                <p><i class="fas fa-phone"></i> ${company.phone}</p>
                <p><i class="fas fa-envelope"></i> ${company.email}</p>
                <p><i class="fas fa-motorcycle"></i> عدد المندوبين: ${company.drivers.length}</p>
            </div>
        `).join('')}
        <button class="btn-outline-gold" onclick="showDeliveryDashboard()">رجوع</button>
    `;
};

window.showDeliveryDrivers = function() {
    const drivers = DeliverySystem.drivers;
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px;">
            <i class="fas fa-motorcycle"></i> مندوبو التوصيل (${drivers.length})
        </h3>
        <button class="btn-gold" onclick="showAddDriverModal()" style="margin-bottom: 20px;">
            <i class="fas fa-plus"></i> إضافة مندوب
        </button>
        ${drivers.map(driver => {
            const company = DeliverySystem.companies.find(c => c.id === driver.companyId);
            return `
                <div style="background: var(--glass, rgba(255,255,255,0.1)); border-radius: 15px; padding: 20px; margin: 15px 0;">
                    <h4 style="color: var(--gold, #ffd700);">${driver.name}</h4>
                    <p><i class="fas fa-building"></i> الشركة: ${company?.name || 'غير محدد'}</p>
                    <p><i class="fas fa-phone"></i> ${driver.phone}</p>
                    <p><i class="fas fa-motorcycle"></i> المركبة: ${driver.vehicleType}</p>
                    <p><i class="fas fa-chart-line"></i> الحالة: ${driver.status === 'available' ? '✅ متاح' : '🔄 مشغول'}</p>
                    <p><i class="fas fa-star"></i> التقييم: ${driver.stats.rating} ⭐</p>
                    <p><i class="fas fa-box"></i> توصيلات: ${driver.stats.deliveries}</p>
                    <p><i class="fas fa-money-bill"></i> الأرباح: ${driver.stats.earnings.toLocaleString()} دج</p>
                </div>
            `;
        }).join('')}
        <button class="btn-outline-gold" onclick="showDeliveryDashboard()">رجوع</button>
    `;
};

window.updateDeliveryStatus = function(deliveryId) {
    const select = document.getElementById(`status_${deliveryId}`);
    if (!select) return;
    
    const newStatus = select.value;
    DeliverySystem.updateDeliveryStatus(deliveryId, newStatus, 'تم التحديث بواسطة المدير');
    if (typeof showNotification === 'function') {
        showNotification(`✅ تم تحديث حالة التوصيلة إلى: ${getDeliveryStatusText(newStatus)}`, 'success');
    }
    setTimeout(() => showActiveDeliveries(), 1000);
};

window.showAddCompanyModal = function() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
        z-index: 20002; display: flex; justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-secondary, #1a1a2e); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
            <h2 style="color: var(--gold, #ffd700); text-align: center;">➕ إضافة شركة توصيل</h2>
            <div style="margin: 15px 0;"><input type="text" id="companyName" placeholder="اسم الشركة" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="text" id="ownerName" placeholder="اسم المالك" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="tel" id="companyPhone" placeholder="رقم الهاتف" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="email" id="companyEmail" placeholder="البريد الإلكتروني" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="text" id="companyAddress" placeholder="العنوان" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button onclick="this.closest('div').parentElement.remove()" style="flex:1; padding: 12px; background: #f87171; border-radius: 10px;">إلغاء</button>
                <button id="saveCompanyBtn" style="flex:1; padding: 12px; background: var(--gold, #ffd700); border-radius: 10px;">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('saveCompanyBtn').onclick = () => {
        const companyData = {
            name: document.getElementById('companyName').value,
            ownerName: document.getElementById('ownerName').value,
            phone: document.getElementById('companyPhone').value,
            email: document.getElementById('companyEmail').value,
            address: document.getElementById('companyAddress').value
        };
        
        if (!companyData.name || !companyData.ownerName) {
            if (typeof showNotification === 'function') showNotification('يرجى إدخال اسم الشركة والمالك', 'error');
            return;
        }
        
        DeliverySystem.addCompany(companyData);
        if (typeof showNotification === 'function') showNotification('✅ تمت إضافة الشركة بنجاح', 'success');
        modal.remove();
        showDeliveryCompanies();
    };
};

window.showAddDriverModal = function() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
        z-index: 20002; display: flex; justify-content: center; align-items: center;
    `;
    
    const companies = DeliverySystem.companies;
    
    modal.innerHTML = `
        <div style="background: var(--bg-secondary, #1a1a2e); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
            <h2 style="color: var(--gold, #ffd700); text-align: center;">➕ إضافة مندوب توصيل</h2>
            <div style="margin: 15px 0;">
                <select id="driverCompany" style="width: 100%; padding: 12px; border-radius: 10px;">
                    <option value="">اختر الشركة</option>
                    ${companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div style="margin: 15px 0;"><input type="text" id="driverName" placeholder="الاسم الكامل" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="tel" id="driverPhone" placeholder="رقم الهاتف" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;">
                <select id="vehicleType" style="width: 100%; padding: 12px; border-radius: 10px;">
                    <option value="دراجة نارية">دراجة نارية</option>
                    <option value="سيارة">سيارة</option>
                    <option value="شاحنة صغيرة">شاحنة صغيرة</option>
                </select>
            </div>
            <div style="margin: 15px 0;"><input type="text" id="licenseNumber" placeholder="رقم الرخصة" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button onclick="this.closest('div').parentElement.remove()" style="flex:1; padding: 12px; background: #f87171; border-radius: 10px;">إلغاء</button>
                <button id="saveDriverBtn" style="flex:1; padding: 12px; background: var(--gold, #ffd700); border-radius: 10px;">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('saveDriverBtn').onclick = () => {
        const companyId = document.getElementById('driverCompany').value;
        const driverData = {
            companyId: companyId,
            name: document.getElementById('driverName').value,
            phone: document.getElementById('driverPhone').value,
            vehicleType: document.getElementById('vehicleType').value,
            licenseNumber: document.getElementById('licenseNumber').value
        };
        
        if (!driverData.companyId || !driverData.name || !driverData.phone) {
            if (typeof showNotification === 'function') showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        DeliverySystem.addDriver(driverData);
        if (typeof showNotification === 'function') showNotification('✅ تمت إضافة المندوب بنجاح', 'success');
        modal.remove();
        showDeliveryDrivers();
    };
};

function getDeliveryStatusText(status) {
    const statusMap = {
        'pending': '⏳ قيد الانتظار',
        'assigned': '🔄 تم التعيين',
        'picked_up': '📦 تم الاستلام',
        'delivered': '✅ تم التوصيل',
        'cancelled': '❌ ملغي'
    };
    return statusMap[status] || status;
}

// ===== [8.7] إضافة زر التوصيل في القائمة =====
function addDeliveryButtonToNav() {
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn && !document.getElementById('deliveryDashboardBtn')) {
        const deliveryBtn = document.createElement('a');
        deliveryBtn.id = 'deliveryDashboardBtn';
        deliveryBtn.className = 'nav-link';
        deliveryBtn.setAttribute('onclick', 'showDeliveryDashboard()');
        deliveryBtn.setAttribute('href', 'javascript:void(0)');
        deliveryBtn.innerHTML = '<i class="fas fa-truck"></i><span>التوصيل</span>';
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu) {
            navMenu.appendChild(deliveryBtn);
            console.log('✅ تم إضافة زر التوصيل في القائمة');
        }
    }
}

// ربط إضافة الزر عند تحديث الواجهة
if (typeof window.updateUIBasedOnRole === 'function') {
    const originalUpdateUI = window.updateUIBasedOnRole;
    window.updateUIBasedOnRole = function() {
        originalUpdateUI();
        if (window.currentUser && window.currentUser.role === 'admin') {
            addDeliveryButtonToNav();
        }
    };
} else {
    // إذا كانت الدالة غير موجودة، نضيفها
    window.updateUIBasedOnRole = function() {
        if (window.currentUser && window.currentUser.role === 'admin') {
            addDeliveryButtonToNav();
        }
    };
}

// ===== [8.8] إضافة زر التوصيل في نافذة السلة =====
function addDeliveryButtonToCart() {
    // البحث عن زر إتمام الطلب الحالي
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        // تغيير نص الزر ليشمل التوصيل
        checkoutBtn.innerHTML = '<i class="fas fa-truck"></i> إتمام الطلب مع التوصيل';
        checkoutBtn.style.background = 'linear-gradient(135deg, #ffd700, #ffb700)';
        console.log('✅ تم تحديث زر إتمام الطلب ليشمل التوصيل');
    }
}

// مراقبة إضافة زر السلة
const observer = new MutationObserver(function(mutations) {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn && checkoutBtn.innerHTML.indexOf('التوصيل') === -1) {
        checkoutBtn.innerHTML = '<i class="fas fa-truck"></i> إتمام الطلب مع التوصيل';
        checkoutBtn.style.background = 'linear-gradient(135deg, #ffd700, #ffb700)';
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚚 نظام التوصيل المتكامل جاهز');
    console.log('📦 زر التوصيل موجود في نافذة إتمام الطلب');
    
    // تحديث زر إتمام الطلب إذا كان موجوداً
    setTimeout(() => {
        addDeliveryButtonToCart();
    }, 1000);
});

// تصدير النظام
window.DeliverySystem = DeliverySystem;

console.log('✅ نظام التوصيل المتكامل جاهز - زر التوصيل مضاف');
