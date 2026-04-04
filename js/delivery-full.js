/* ================================================================== */
/* ===== [08] الملف: 08-delivery-full.js - نظام التوصيل المتكامل ===== */
/* ================================================================== */

// ===== [8.1] نظام التوصيل الأساسي =====
const DeliverySystem = {
    companies: [],
    drivers: [],
    deliveries: [],
    zones: [],
    
    // التهيئة
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
            { id: 'ZN007', name: 'تلمسان', price: 900, estimatedDays: '3-4 أيام' },
            { id: 'ZN008', name: 'باقي الولايات', price: 1000, estimatedDays: '3-5 أيام' }
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
    
    // إضافة شركة توصيل
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
            stats: {
                totalDeliveries: 0,
                completedDeliveries: 0,
                rating: 5
            },
            createdAt: new Date().toISOString(),
            status: 'approved'
        };
        
        this.companies.push(company);
        this.save();
        return company;
    },
    
    // إضافة مندوب توصيل
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
            stats: {
                deliveries: 0,
                rating: 5,
                earnings: 0
            },
            currentLocation: null,
            joinedAt: new Date().toISOString()
        };
        
        this.drivers.push(driver);
        
        const company = this.companies.find(c => c.id === driverData.companyId);
        if (company) {
            company.drivers.push(driverId);
        }
        
        this.save();
        return driver;
    },
    
    // إنشاء توصيلة جديدة
    createDelivery(orderData) {
        const deliveryId = `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // حساب سعر التوصيل
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
            timeline: [
                {
                    status: 'pending',
                    timestamp: new Date().toISOString(),
                    note: 'تم إنشاء التوصيلة'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        this.deliveries.push(delivery);
        this.save();
        
        // محاولة تعيين مندوب تلقائياً
        this.autoAssignDriver(delivery.id);
        
        return delivery;
    },
    
    // الحصول على معلومات المنطقة
    getZoneInfo(zoneName) {
        const zone = this.zones.find(z => z.name === zoneName);
        return zone || { price: 1000, estimatedDays: '3-5 أيام', name: 'أخرى' };
    },
    
    // تعيين مندوب تلقائياً
    autoAssignDriver(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery || delivery.assignedTo) return false;
        
        const availableDriver = this.drivers.find(d => 
            d.status === 'available' && 
            d.workZones.includes(delivery.zone)
        );
        
        if (availableDriver) {
            return this.assignDriver(deliveryId, availableDriver.id);
        }
        
        return false;
    },
    
    // تعيين مندوب
    assignDriver(deliveryId, driverId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        const driver = this.drivers.find(d => d.id === driverId);
        
        if (!delivery || !driver) return false;
        
        delivery.assignedTo = driverId;
        delivery.assignedAt = new Date().toISOString();
        delivery.status = 'assigned';
        delivery.timeline.push({
            status: 'assigned',
            timestamp: new Date().toISOString(),
            note: `تم التعيين للمندوب ${driver.name}`
        });
        
        driver.status = 'busy';
        this.save();
        
        return true;
    },
    
    // تحديث حالة التوصيلة
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
        
        delivery.timeline.push({
            status: status,
            timestamp: new Date().toISOString(),
            note: note || `تغيير الحالة من ${oldStatus} إلى ${status}`
        });
        
        this.save();
        return true;
    },
    
    // الحصول على توصيلات المندوب
    getDriverDeliveries(driverId) {
        return this.deliveries.filter(d => d.assignedTo === driverId);
    },
    
    // الحصول على التوصيلات النشطة
    getActiveDeliveries() {
        return this.deliveries.filter(d => 
            ['pending', 'assigned', 'picked_up'].includes(d.status)
        );
    },
    
    // إحصائيات التوصيل
    getStats() {
        const total = this.deliveries.length;
        const completed = this.deliveries.filter(d => d.status === 'delivered').length;
        const pending = this.deliveries.filter(d => d.status === 'pending').length;
        const assigned = this.deliveries.filter(d => d.status === 'assigned').length;
        
        const totalEarnings = this.deliveries
            .filter(d => d.status === 'delivered')
            .reduce((sum, d) => sum + (d.deliveryPrice || 0), 0);
        
        return {
            total, completed, pending, assigned, totalEarnings,
            companies: this.companies.length,
            drivers: this.drivers.length
        };
    },
    
    // الحصول على مناطق التوصيل للعرض
    getZonesForSelect() {
        return this.zones.map(zone => ({
            name: zone.name,
            price: zone.price,
            estimatedDays: zone.estimatedDays,
            html: `<option value="${zone.name}" data-price="${zone.price}" data-days="${zone.estimatedDays}">
                      ${zone.name} - ${zone.price.toLocaleString()} دج (${zone.estimatedDays})
                   </option>`
        }));
    }
};

// تهيئة النظام
DeliverySystem.init();

// ===== [8.2] تعديل دالة إتمام الطلب مع نظام التوصيل =====
// حفظ الدالة الأصلية
const originalCheckoutCart = window.checkoutCart;

// الدالة الجديدة المدمجة
window.checkoutCart = async function() {
    // التحقق من السلة
    if (!cart || cart.length === 0) {
        showNotification('🛒 السلة فارغة! أضف بعض المنتجات أولاً', 'warning');
        return;
    }

    if (!currentUser) {
        showNotification('🔐 يرجى تسجيل الدخول أولاً لإتمام عملية الشراء', 'warning');
        openLoginModal();
        return;
    }

    // فتح نافذة الطلب مع خيارات التوصيل
    const orderData = await showOrderModalWithDelivery();
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
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + shipping;

    // إنشاء توصيلة في نظام التوصيل
    const delivery = DeliverySystem.createDelivery({
        orderId: orderId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        zone: deliveryZone,
        deliveryTime: deliveryTime,
        items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            merchantName: item.merchantName
        })),
        total: total
    });

    // تجميع المنتجات حسب التاجر
    const merchantOrders = {};
    for (const item of cart) {
        const merchantName = item.merchantName;
        if (!merchantOrders[merchantName]) {
            merchantOrders[merchantName] = { items: [], subtotal: 0 };
        }
        merchantOrders[merchantName].items.push(item);
        merchantOrders[merchantName].subtotal += item.price * item.quantity;
    }

    const merchantCount = Object.keys(merchantOrders).length;
    const shippingPerMerchant = shipping / merchantCount;

    // إنشاء تقرير الطلب
    const orderReport = generateOrderReportWithDelivery(
        orderId, orderDate, { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime },
        subtotal, shipping, total, merchantOrders, shippingPerMerchant, delivery.id, estimatedDays
    );

    // إرسال التقرير للقناة
    await sendTelegramMessage(orderReport, 'HTML');

    // إرسال إشعارات للتجار
    for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
        const merchantTotal = orderData.subtotal + shippingPerMerchant;
        const merchantMessage = generateMerchantMessageWithDelivery(
            orderId, merchantName, orderData.items,
            orderData.subtotal, merchantTotal, { customerName, customerPhone, customerAddress, notes },
            estimatedDays, delivery.id
        );
        await sendTelegramMessage(merchantMessage, 'HTML');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // إرسال رسالة تأكيد للعميل
    const customerConfirmation = generateCustomerConfirmationWithTracking(
        orderId, orderDate, cart, total, estimatedDays, customerAddress, delivery.id
    );
    await sendTelegramMessage(customerConfirmation, 'HTML');

    // حفظ الطلب
    saveOrderToHistory(orderId, {
        orderId, orderDate,
        customerInfo: { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime },
        items: [...cart], subtotal, shipping, total,
        deliveryId: delivery.id, status: 'pending', merchantOrders
    });

    // تفريغ السلة
    cart = [];
    saveCart();
    updateCartCounter();
    if (typeof toggleCart === 'function') toggleCart();

    // عرض نافذة النجاح
    showOrderSuccessModalWithTracking(orderId, total, estimatedDays, delivery.id);

    console.log(`✅ تم إرسال الطلب - رقم: ${orderId} - توصيلة: ${delivery.id}`);
};

// ===== [8.3] نافذة الطلب مع خيارات التوصيل =====
async function showOrderModalWithDelivery() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            z-index: 20000; display: flex; justify-content: center; align-items: center;
            animation: fadeIn 0.3s ease;
        `;

        // حساب إجمالي المنتجات
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // الحصول على مناطق التوصيل
        const zonesOptions = DeliverySystem.getZonesForSelect();
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary); border-radius: 30px; padding: 30px;
                        max-width: 550px; width: 90%; max-height: 85vh; overflow-y: auto;
                        border: 2px solid var(--gold); box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        animation: slideUp 0.3s ease;">
                
                <h2 style="color: var(--gold); text-align: center; margin-bottom: 25px;">
                    <i class="fas fa-shopping-cart"></i> إتمام الطلب
                </h2>
                
                <!-- معلومات العميل -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-user"></i> الاسم الكامل <span style="color: red;">*</span>
                    </label>
                    <input type="text" id="customerName" value="${currentUser?.name || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                  background: var(--bg-primary); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-phone"></i> رقم الهاتف <span style="color: red;">*</span>
                    </label>
                    <input type="tel" id="customerPhone" value="${currentUser?.phone || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                  background: var(--bg-primary); color: var(--text);">
                </div>
                
                <!-- منطقة التوصيل -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-map-marker-alt"></i> منطقة التوصيل <span style="color: red;">*</span>
                    </label>
                    <select id="deliveryZone" 
                            style="width: 100%; padding: 12px; border-radius: 10px; 
                                   border: 1px solid var(--gold); background: var(--bg-primary); color: var(--text);">
                        ${zonesOptions.map(z => z.html).join('')}
                    </select>
                </div>
                
                <!-- العنوان التفصيلي -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-location-dot"></i> العنوان التفصيلي <span style="color: red;">*</span>
                    </label>
                    <textarea id="customerAddress" rows="3" 
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                     background: var(--bg-primary); color: var(--text);"
                              placeholder="الشارع، رقم البناء، الطابق، معلم قريب..."></textarea>
                </div>
                
                <!-- وقت التوصيل -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-clock"></i> وقت التوصيل المفضل
                    </label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="asap" checked> في أقرب وقت
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="morning"> الصباح (8ص-12م)
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="afternoon"> بعد الظهر (12م-4م)
                        </label>
                        <label style="flex: 1; text-align: center; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="evening"> المساء (4م-8م)
                        </label>
                    </div>
                </div>
                
                <!-- ملاحظات -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-sticky-note"></i> ملاحظات إضافية
                    </label>
                    <textarea id="orderNotes" rows="2" 
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                     background: var(--bg-primary); color: var(--text);"
                              placeholder="تعليمات التوصيل..."></textarea>
                </div>
                
                <!-- ملخص الطلب مع التوصيل -->
                <div id="deliverySummary" style="background: rgba(255,215,0,0.15); padding: 20px; border-radius: 15px; margin: 20px 0;">
                    <!-- سيتم التحديث تلقائياً -->
                </div>
                
                <!-- أزرار الإجراء -->
                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="flex: 1; padding: 12px; background: #f87171; color: white;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                    <button id="submitOrderBtn" 
                            style="flex: 1; padding: 12px; background: var(--gold); color: black;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-truck"></i> تأكيد الطلب والتوصيل
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
                <h4 style="color: var(--gold); margin-bottom: 15px; text-align: center;">📊 ملخص الطلب</h4>
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
                <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid var(--gold);">
                    <span style="font-size: 18px;">💎 الإجمالي النهائي:</span>
                    <span style="font-size: 22px; color: var(--gold); font-weight: bold;">${total.toLocaleString()} دج</span>
                </div>
            `;
        };
        
        modal.querySelector('#deliveryZone').addEventListener('change', updateSummary);
        updateSummary();
        
        // معالجة التأكيد
        modal.querySelector('#submitOrderBtn').onclick = () => {
            const customerName = modal.querySelector('#customerName').value;
            const customerPhone = modal.querySelector('#customerPhone').value;
            const customerAddress = modal.querySelector('#customerAddress').value;
            const deliveryZone = modal.querySelector('#deliveryZone').value;
            const deliveryTime = modal.querySelector('input[name="deliveryTime"]:checked').value;
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
    });
}

// ===== [8.4] دوال إنشاء التقارير =====
function generateOrderReportWithDelivery(orderId, orderDate, customerInfo, subtotal, shipping, total, merchantOrders, shippingPerMerchant, deliveryId, estimatedDays) {
    const { customerName, customerPhone, customerAddress, notes, deliveryZone, deliveryTime } = customerInfo;
    
    let merchantsDetails = '';
    for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
        merchantsDetails += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🏪 <b>${merchantName}</b>
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        for (const item of orderData.items) {
            merchantsDetails += `
┃ 📦 ${item.name}
┃    ├ الكمية: ${item.quantity}
┃    ├ السعر: ${item.price.toLocaleString()} دج
┃    └ الإجمالي: ${(item.price * item.quantity).toLocaleString()} دج`;
        }
        merchantsDetails += `
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 💰 إجمالي المنتجات: ${orderData.subtotal.toLocaleString()} دج
┃ 🚚 حصة التوصيل: ${Math.round(shippingPerMerchant).toLocaleString()} دج
┃ ✨ إجمالي الطلب: ${Math.round(orderData.subtotal + shippingPerMerchant).toLocaleString()} دج
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    const timeText = deliveryTime === 'asap' ? 'في أقرب وقت' : 
                     deliveryTime === 'morning' ? 'الصباح' :
                     deliveryTime === 'afternoon' ? 'بعد الظهر' : 'المساء';

    return `
╔══════════════════════════════════════════════════════════╗
║           🧾 <b>طلب جديد - ناردو برو</b>                      ║
╠══════════════════════════════════════════════════════════╣
║ 📋 <b>رقم الطلب:</b> <code>${orderId}</code>
║ 🆔 <b>رقم التوصيلة:</b> <code>${deliveryId}</code>
║ 🕐 <b>تاريخ الطلب:</b> ${orderDate}
╠══════════════════════════════════════════════════════════╣
║                      👤 <b>معلومات العميل</b>                 ║
╠══════════════════════════════════════════════════════════╣
║ 👨 <b>الاسم:</b> ${customerName}
║ 📞 <b>الهاتف:</b> ${customerPhone}
║ 📍 <b>العنوان:</b> ${customerAddress}
║ 🗺️ <b>المنطقة:</b> ${deliveryZone}
║ ⏰ <b>وقت التوصيل:</b> ${timeText}
║ 📝 <b>ملاحظات:</b> ${notes || 'لا توجد'}
╠══════════════════════════════════════════════════════════╣
║                      📊 <b>تفاصيل الطلب</b>                   ║
╠══════════════════════════════════════════════════════════╣
${merchantsDetails}
╠══════════════════════════════════════════════════════════╣
║                      💰 <b>إجماليات الطلب</b>                  ║
╠══════════════════════════════════════════════════════════╣
║ 💵 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
║ 🚚 <b>رسوم التوصيل:</b> ${shipping.toLocaleString()} دج
╠══════════════════════════════════════════════════════════╣
║ 💎 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
║ ⏰ <b>الوقت المتوقع:</b> ${estimatedDays}
╚══════════════════════════════════════════════════════════╝

✅ تم إضافة الطلب إلى نظام التوصيل
🚚 سيتم تعيين مندوب توصيل قريباً
    `;
}

function generateMerchantMessageWithDelivery(orderId, merchantName, items, subtotal, total, customerInfo, estimatedDays, deliveryId) {
    const itemsList = items.map((item, index) => 
        `${index + 1}️⃣ ${item.name}\n   ├ الكمية: ${item.quantity}\n   └ السعر: ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n\n');
    
    return `
🟢 <b>طلب جديد - ${merchantName}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>رقم الطلب:</b> <code>${orderId}</code>
🆔 <b>رقم التوصيلة:</b> <code>${deliveryId}</code>

👤 <b>معلومات الزبون:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerInfo.customerName}
├ 📞 <b>الهاتف:</b> ${customerInfo.customerPhone}
├ 📍 <b>العنوان:</b> ${customerInfo.customerAddress}
└ 📝 <b>ملاحظات:</b> ${customerInfo.notes || 'لا توجد'}

📦 <b>المنتجات المطلوبة:</b>
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
🚚 <b>حصة التوصيل:</b> ${Math.round(total - subtotal).toLocaleString()} دج
💎 <b>الإجمالي:</b> ${Math.round(total).toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ <b>الوقت المتوقع للتوصيل:</b> ${estimatedDays}

✅ يرجى تجهيز المنتج
📅 ${new Date().toLocaleString('ar-EG')}
    `;
}

function generateCustomerConfirmationWithTracking(orderId, orderDate, items, total, estimatedDays, address, deliveryId) {
    const itemsSummary = items.map(item => 
        `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} دج = ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n');
    
    return `
🟢 <b>تم استلام طلبك بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>رقم الطلب:</b> <code>${orderId}</code>
🚚 <b>رقم التوصيلة:</b> <code>${deliveryId}</code>
📅 <b>تاريخ الطلب:</b> ${orderDate}

📦 <b>المنتجات المطلوبة:</b>
${itemsSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
🚚 <b>عنوان التوصيل:</b> ${address}
⏰ <b>الوقت المتوقع:</b> ${estimatedDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ شكراً لتسوقك من <b>ناردو برو</b> ✨

📞 سيتم التواصل معك قريباً من قبل مندوب التوصيل
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
        <div style="background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
                    border-radius: 30px; padding: 40px; text-align: center;
                    border: 2px solid var(--gold); animation: slideUp 0.3s ease;
                    max-width: 450px;">
            <div style="font-size: 70px; margin-bottom: 15px;">🎉🚚</div>
            <h2 style="color: var(--gold); margin-bottom: 15px;">تم استلام طلبك بنجاح!</h2>
            <p style="color: var(--text); margin-bottom: 10px;">
                <strong>رقم الطلب:</strong><br>
                <code style="font-size: 16px; background: rgba(255,215,0,0.1); padding: 8px 12px; border-radius: 8px;">${orderId}</code>
            </p>
            <p style="color: var(--text); margin-bottom: 10px;">
                <strong>رقم التوصيلة:</strong><br>
                <code style="font-size: 14px; background: rgba(255,215,0,0.1); padding: 5px 10px; border-radius: 8px;">${deliveryId}</code>
            </p>
            <p style="color: var(--text); margin-bottom: 10px;">
                <strong>الإجمالي:</strong> ${total.toLocaleString()} دج
            </p>
            <p style="color: var(--text); margin-bottom: 20px;">
                <strong>الوقت المتوقع:</strong> ${estimatedDays}
            </p>
            <div style="background: rgba(255,215,0,0.15); border-radius: 15px; padding: 15px; margin: 15px 0;">
                <p style="margin: 5px 0;">📱 <strong>لتتبع طلبك:</strong></p>
                <p style="margin: 5px 0; font-size: 12px;">سيتم إعلامك عند تعيين مندوب التوصيل</p>
            </div>
            <button onclick="this.closest('div').parentElement.remove()" 
                    style="background: var(--gold); color: black; padding: 12px 30px;
                           border: none; border-radius: 30px; font-weight: bold;
                           cursor: pointer; font-size: 16px; margin-top: 10px;">
                <i class="fas fa-check"></i> حسناً
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => { if (modal.parentElement) modal.remove(); }, 6000);
}

// ===== [8.5] لوحة تحكم التوصيل للمدير =====
window.showDeliveryDashboard = function() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('غير مصرح - هذه اللوحة للمدير فقط', 'error');
        return;
    }

    const content = document.getElementById('dashboardContent');
    if (!content) return;

    const stats = DeliverySystem.getStats();
    
    content.innerHTML = `
        <div class="delivery-dashboard">
            <h3 style="color: var(--gold); margin-bottom: 20px;">
                <i class="fas fa-truck"></i> نظام التوصيل - لوحة التحكم
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0;">
                <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-box" style="font-size: 30px; color: var(--gold);"></i>
                    <h4>${stats.total}</h4>
                    <small>إجمالي التوصيلات</small>
                </div>
                <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 30px; color: #4ade80;"></i>
                    <h4>${stats.completed}</h4>
                    <small>مكتمل</small>
                </div>
                <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-clock" style="font-size: 30px; color: #fbbf24;"></i>
                    <h4>${stats.pending + stats.assigned}</h4>
                    <small>قيد التنفيذ</small>
                </div>
                <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
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
                <button class="btn-outline-gold" onclick="showDashboardOverview()">
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
            <h3 style="color: var(--gold); margin-bottom: 20px;">التوصيلات النشطة</h3>
            <p style="color: var(--text-secondary);">لا توجد توصيلات نشطة حالياً</p>
            <button class="btn-outline-gold" onclick="showDeliveryDashboard()">رجوع</button>
        `;
        return;
    }
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">
            <i class="fas fa-truck-moving"></i> التوصيلات النشطة (${activeDeliveries.length})
        </h3>
        ${activeDeliveries.map(delivery => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 15px; padding: 20px; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
                    <div>
                        <h4 style="color: var(--gold); margin: 0 0 10px 0;">${delivery.id}</h4>
                        <p><i class="fas fa-user"></i> ${delivery.customerName}</p>
                        <p><i class="fas fa-phone"></i> ${delivery.customerPhone}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${delivery.customerAddress}</p>
                        <p><i class="fas fa-tag"></i> المنطقة: ${delivery.zone}</p>
                        <p><i class="fas fa-chart-line"></i> الحالة: ${getDeliveryStatusText(delivery.status)}</p>
                    </div>
                    <div style="text-align: left;">
                        <p><strong>💰 ${delivery.deliveryPrice.toLocaleString()} دج</strong></p>
                        <select id="status_${delivery.id}" style="padding: 8px; border-radius: 8px; background: var(--bg-primary); color: var(--text);">
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
        <h3 style="color: var(--gold); margin-bottom: 20px;">
            <i class="fas fa-building"></i> شركات التوصيل (${companies.length})
        </h3>
        <button class="btn-gold" onclick="showAddCompanyModal()" style="margin-bottom: 20px;">
            <i class="fas fa-plus"></i> إضافة شركة توصيل
        </button>
        ${companies.map(company => `
            <div style="background: var(--glass); border-radius: 15px; padding: 20px; margin: 15px 0;">
                <h4 style="color: var(--gold);">${company.name}</h4>
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
        <h3 style="color: var(--gold); margin-bottom: 20px;">
            <i class="fas fa-motorcycle"></i> مندوبو التوصيل (${drivers.length})
        </h3>
        <button class="btn-gold" onclick="showAddDriverModal()" style="margin-bottom: 20px;">
            <i class="fas fa-plus"></i> إضافة مندوب
        </button>
        ${drivers.map(driver => {
            const company = DeliverySystem.companies.find(c => c.id === driver.companyId);
            return `
                <div style="background: var(--glass); border-radius: 15px; padding: 20px; margin: 15px 0;">
                    <h4 style="color: var(--gold);">${driver.name}</h4>
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
    showNotification(`✅ تم تحديث حالة التوصيلة إلى: ${getDeliveryStatusText(newStatus)}`, 'success');
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
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
            <h2 style="color: var(--gold); text-align: center;">➕ إضافة شركة توصيل</h2>
            <div style="margin: 15px 0;"><input type="text" id="companyName" placeholder="اسم الشركة" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="text" id="ownerName" placeholder="اسم المالك" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="tel" id="companyPhone" placeholder="رقم الهاتف" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="email" id="companyEmail" placeholder="البريد الإلكتروني" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="margin: 15px 0;"><input type="text" id="companyAddress" placeholder="العنوان" style="width: 100%; padding: 12px; border-radius: 10px;"></div>
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button onclick="this.closest('div').parentElement.remove()" style="flex:1; padding: 12px; background: #f87171; border-radius: 10px;">إلغاء</button>
                <button id="saveCompanyBtn" style="flex:1; padding: 12px; background: var(--gold); border-radius: 10px;">حفظ</button>
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
            showNotification('يرجى إدخال اسم الشركة والمالك', 'error');
            return;
        }
        
        DeliverySystem.addCompany(companyData);
        showNotification('✅ تمت إضافة الشركة بنجاح', 'success');
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
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
            <h2 style="color: var(--gold); text-align: center;">➕ إضافة مندوب توصيل</h2>
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
                <button id="saveDriverBtn" style="flex:1; padding: 12px; background: var(--gold); border-radius: 10px;">حفظ</button>
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
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        DeliverySystem.addDriver(driverData);
        showNotification('✅ تمت إضافة المندوب بنجاح', 'success');
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

// ===== [8.6] إضافة زر التوصيل في قائمة المدير =====
const addDeliveryButtonToNav = function() {
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn && !document.getElementById('deliveryDashboardBtn')) {
        const deliveryBtn = document.createElement('a');
        deliveryBtn.id = 'deliveryDashboardBtn';
        deliveryBtn.className = 'nav-link';
        deliveryBtn.setAttribute('onclick', 'showDeliveryDashboard()');
        deliveryBtn.innerHTML = '<i class="fas fa-truck"></i><span>التوصيل</span>';
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu) navMenu.appendChild(deliveryBtn);
    }
};

// ربط إضافة الزر عند تحديث الواجهة
const originalUpdateUI = window.updateUIBasedOnRole;
if (originalUpdateUI) {
    window.updateUIBasedOnRole = function() {
        originalUpdateUI();
        if (currentUser && currentUser.role === 'admin') {
            addDeliveryButtonToNav();
        }
    };
}

// تصدير النظام
window.DeliverySystem = DeliverySystem;

console.log('✅ نظام التوصيل المتكامل جاهز');
console.log('📦 الميزات: مناطق التوصيل | شركات ومندوبين | تتبع الطلبات | تحديث الحالات');
