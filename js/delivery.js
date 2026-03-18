/* ================================================================== */
/* ===== [08] الملف: 08-delivery.js - نظام التوصيل ===== */
/* ================================================================== */

// ===== [8.1] نظام التوصيل =====
const DeliverySystem = {
    companies: [],
    drivers: [],
    deliveries: [],
    zones: [],
    
    // التهيئة
    init() {
        this.companies = Utils.load('delivery_companies', []);
        this.drivers = Utils.load('delivery_drivers', []);
        this.deliveries = Utils.load('deliveries', []);
        this.zones = Utils.load('delivery_zones', [
            { id: 'ZN001', name: 'الجزائر وسط', price: 500 },
            { id: 'ZN002', name: 'الجزائر شرق', price: 600 },
            { id: 'ZN003', name: 'الجزائر غرب', price: 600 },
            { id: 'ZN004', name: 'وهران', price: 800 },
            { id: 'ZN005', name: 'قسنطينة', price: 800 },
            { id: 'ZN006', name: 'عنابة', price: 700 },
            { id: 'ZN007', name: 'باقي الولايات', price: 1000 }
        ]);
        
        console.log('🚚 نظام التوصيل جاهز');
    },
    
    // إضافة شركة توصيل
    addCompany(companyData) {
        const companyId = IDSystem.generateId('delivery_company', { includeDate: true });
        
        const company = {
            id: companyId,
            name: companyData.name,
            ownerName: companyData.ownerName,
            phone: companyData.phone,
            email: companyData.email,
            address: companyData.address,
            zones: companyData.zones || [],
            drivers: [],
            stats: {
                totalDeliveries: 0,
                completedDeliveries: 0,
                rating: 5
            },
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        
        this.companies.push(company);
        this.save();
        
        return company;
    },
    
    // إضافة مندوب توصيل
    addDriver(driverData) {
        const driverId = IDSystem.generateId('delivery_person', { includeDate: true });
        
        const driver = {
            id: driverId,
            companyId: driverData.companyId,
            name: driverData.name,
            phone: driverData.phone,
            vehicleType: driverData.vehicleType || 'دراجة نارية',
            licenseNumber: driverData.licenseNumber,
            workZones: driverData.workZones || [],
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
        
        // إضافة المندوب للشركة
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
        
        const delivery = {
            id: deliveryId,
            orderId: orderData.orderId,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            zone: orderData.zone,
            items: orderData.items || [],
            total: orderData.total,
            deliveryPrice: this.getZonePrice(orderData.zone),
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
    
    // تعيين مندوب تلقائياً
    autoAssignDriver(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery || delivery.assignedTo) return false;
        
        // البحث عن مندوب متاح في نفس المنطقة
        const availableDriver = this.drivers.find(d => 
            d.status === 'available' && 
            d.workZones.includes(delivery.zone)
        );
        
        if (availableDriver) {
            return this.assignDriver(deliveryId, availableDriver.id);
        }
        
        return false;
    },
    
    // تعيين مندوب لتوصيلة
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
        
        // إرسال إشعار للمندوب
        if (window.Telegram) {
            Telegram.sendMessage(`
🟢 *توصيلة جديدة*
👤 المندوب: ${driver.name}
📍 العنوان: ${delivery.customerAddress}
💰 التوصيل: ${delivery.deliveryPrice} دج
            `);
        }
        
        return true;
    },
    
    // تحديث حالة التوصيلة
    updateDeliveryStatus(deliveryId, status, note = '') {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return false;
        
        const oldStatus = delivery.status;
        delivery.status = status;
        
        // تحديث التوقيت حسب الحالة
        if (status === 'picked_up') {
            delivery.pickedUpAt = new Date().toISOString();
        } else if (status === 'delivered') {
            delivery.deliveredAt = new Date().toISOString();
            
            // تحديث إحصائيات المندوب
            const driver = this.drivers.find(d => d.id === delivery.assignedTo);
            if (driver) {
                driver.stats.deliveries++;
                driver.stats.earnings += delivery.deliveryPrice;
                driver.status = 'available';
            }
        }
        
        delivery.timeline.push({
            status: status,
            timestamp: new Date().toISOString(),
            note: note || `تغيير الحالة من ${oldStatus} إلى ${status}`
        });
        
        this.save();
        
        return true;
    },
    
    // الحصول على سعر التوصيل للمنطقة
    getZonePrice(zoneName) {
        const zone = this.zones.find(z => 
            z.name === zoneName || zoneName.includes(z.name)
        );
        return zone ? zone.price : 1000;
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
            total,
            completed,
            pending,
            assigned,
            totalEarnings,
            companies: this.companies.length,
            drivers: this.drivers.length
        };
    },
    
    // حفظ البيانات
    save() {
        Utils.save('delivery_companies', this.companies);
        Utils.save('delivery_drivers', this.drivers);
        Utils.save('deliveries', this.deliveries);
        Utils.save('delivery_zones', this.zones);
    },
    
    // عرض لوحة التوصيل للمدير
    getAdminDashboardHTML() {
        const stats = this.getStats();
        
        return `
            <div class="delivery-dashboard">
                <h3><i class="fas fa-truck"></i> نظام التوصيل</h3>
                
                <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:15px; margin:20px 0;">
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <h4>${stats.total}</h4>
                        <small>إجمالي التوصيلات</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <h4>${stats.completed}</h4>
                        <small>مكتمل</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <h4>${stats.pending}</h4>
                        <small>قيد الانتظار</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <h4>${stats.assigned}</h4>
                        <small>قيد التنفيذ</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <h4>${stats.totalEarnings.toLocaleString()} دج</h4>
                        <small>إجمالي الأرباح</small>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div>
                        <h4>شركات التوصيل</h4>
                        ${this.companies.map(c => `
                            <div style="background:var(--glass); padding:10px; margin:5px 0; border-radius:10px;">
                                <strong>${c.name}</strong> - ${c.drivers.length} مندوب
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <h4>المندوبون</h4>
                        ${this.drivers.map(d => `
                            <div style="background:var(--glass); padding:10px; margin:5px 0; border-radius:10px;">
                                <strong>${d.name}</strong> - ${d.status === 'available' ? '✅ متاح' : '🔄 مشغول'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};

// ===== [8.2] تهيئة النظام =====
window.Delivery = DeliverySystem;
DeliverySystem.init();

console.log('✅ نظام التوصيل جاهز');
