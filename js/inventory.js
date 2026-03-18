/* ================================================================== */
/* ===== [06] الملف: 06-inventory.js - نظام المخزون والمستودعات ===== */
/* ================================================================== */

// ===== [6.1] نظام المخزون =====
const InventorySystem = {
    warehouses: {},
    movements: [],
    
    // التهيئة
    init() {
        this.warehouses = Utils.load('warehouses', {});
        this.movements = Utils.load('inventory_movements', []);
        console.log('📦 نظام المخزون جاهز');
    },
    
    // إنشاء مستودع للتاجر
    createMerchantWarehouse(merchant) {
        const merchantId = merchant.merchantId || merchant.userId;
        
        // التحقق من وجود المستودع
        if (this.warehouses[merchantId]) {
            return this.warehouses[merchantId];
        }
        
        // إنشاء معرف للمستودع
        const warehouseId = IDSystem.generateWarehouseId(merchantId);
        
        const warehouse = {
            id: warehouseId,
            merchantId: merchantId,
            merchantName: merchant.name,
            storeName: merchant.storeName || merchant.name,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            products: {},
            stats: {
                totalProducts: 0,
                totalValue: 0,
                lowStock: 0,
                outOfStock: 0
            },
            settings: {
                lowStockThreshold: 5,
                autoReorder: false
            }
        };
        
        this.warehouses[merchantId] = warehouse;
        this.save();
        
        console.log(`✅ تم إنشاء مستودع للتاجر ${merchant.name}: ${warehouseId}`);
        return warehouse;
    },
    
    // إضافة منتج للمستودع
    addProduct(merchantId, product) {
        // التأكد من وجود المستودع
        if (!this.warehouses[merchantId]) {
            const merchant = Auth.users.find(u => u.merchantId === merchantId || u.userId === merchantId);
            if (merchant) {
                this.createMerchantWarehouse(merchant);
            } else {
                return false;
            }
        }
        
        // إضافة المنتج
        this.warehouses[merchantId].products[product.id] = {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            minStock: product.minStock || 5,
            maxStock: product.maxStock || 100,
            addedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // تحديث الإحصائيات
        this.updateWarehouseStats(merchantId);
        this.save();
        
        // تسجيل الحركة
        this.logMovement({
            type: 'add',
            merchantId: merchantId,
            productId: product.id,
            productName: product.name,
            quantity: product.stock,
            date: new Date().toISOString()
        });
        
        return true;
    },
    
    // تحديث مخزون منتج
    updateStock(merchantId, productId, newStock, reason = 'update') {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const oldStock = warehouse.products[productId].stock;
        
        // تحديث المخزون
        warehouse.products[productId].stock = newStock;
        warehouse.products[productId].lastUpdated = new Date().toISOString();
        
        // تحديث إحصائيات المستودع
        this.updateWarehouseStats(merchantId);
        this.save();
        
        // تسجيل الحركة
        this.logMovement({
            type: 'update',
            merchantId: merchantId,
            productId: productId,
            productName: warehouse.products[productId].name,
            oldStock: oldStock,
            newStock: newStock,
            reason: reason,
            date: new Date().toISOString()
        });
        
        return true;
    },
    
    // خفض المخزون (بعد البيع)
    decreaseStock(merchantId, productId, quantity) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const currentStock = warehouse.products[productId].stock;
        if (currentStock < quantity) return false;
        
        return this.updateStock(merchantId, productId, currentStock - quantity, 'sale');
    },
    
    // زيادة المخزون (توريد)
    increaseStock(merchantId, productId, quantity) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const currentStock = warehouse.products[productId].stock;
        return this.updateStock(merchantId, productId, currentStock + quantity, 'restock');
    },
    
    // تحديث إحصائيات المستودع
    updateWarehouseStats(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return;
        
        const products = Object.values(warehouse.products);
        
        warehouse.stats = {
            totalProducts: products.length,
            totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
            lowStock: products.filter(p => p.stock > 0 && p.stock < (p.minStock || 5)).length,
            outOfStock: products.filter(p => p.stock <= 0).length
        };
        
        warehouse.lastUpdated = new Date().toISOString();
    },
    
    // الحصول على المنتجات منخفضة المخزون
    getLowStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        return Object.values(warehouse.products).filter(p => 
            p.stock > 0 && p.stock < (p.minStock || 5)
        );
    },
    
    // الحصول على المنتجات المنتهية
    getOutOfStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        return Object.values(warehouse.products).filter(p => p.stock <= 0);
    },
    
    // تسجيل حركة مخزون
    logMovement(movement) {
        movement.id = `MOV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.movements.push(movement);
        Utils.save('inventory_movements', this.movements);
    },
    
    // الحصول على حركات المخزون لتاجر
    getMerchantMovements(merchantId, limit = 50) {
        return this.movements
            .filter(m => m.merchantId === merchantId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    },
    
    // جرد المخزون
    async performInventory(merchantId, counts) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        const adjustments = [];
        
        for (const count of counts) {
            const product = warehouse.products[count.productId];
            if (product && product.stock !== count.actual) {
                adjustments.push({
                    productId: count.productId,
                    productName: product.name,
                    before: product.stock,
                    after: count.actual,
                    difference: count.actual - product.stock
                });
                
                product.stock = count.actual;
                product.lastInventory = new Date().toISOString();
            }
        }
        
        if (adjustments.length > 0) {
            this.updateWarehouseStats(merchantId);
            this.save();
            
            // تسجيل الجرد
            this.logMovement({
                type: 'inventory',
                merchantId: merchantId,
                adjustments: adjustments,
                date: new Date().toISOString()
            });
        }
        
        return adjustments;
    },
    
    // حفظ البيانات
    save() {
        Utils.save('warehouses', this.warehouses);
    },
    
    // عرض لوحة المخزون للتاجر
    getMerchantInventoryHTML(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return '<p>لا يوجد مستودع</p>';
        
        const lowStock = this.getLowStockProducts(merchantId);
        const outOfStock = this.getOutOfStockProducts(merchantId);
        const products = Object.values(warehouse.products);
        
        return `
            <div class="inventory-dashboard">
                <h3><i class="fas fa-warehouse"></i> ${warehouse.storeName}</h3>
                <p>معرف المستودع: ${warehouse.id}</p>
                
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:15px; margin:20px 0;">
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <i class="fas fa-box"></i>
                        <h4>${products.length}</h4>
                        <small>إجمالي المنتجات</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center;">
                        <i class="fas fa-coins"></i>
                        <h4>${warehouse.stats.totalValue.toLocaleString()} دج</h4>
                        <small>قيمة المخزون</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center; color:#fbbf24;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>${lowStock.length}</h4>
                        <small>مخزون منخفض</small>
                    </div>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; text-align:center; color:#f87171;">
                        <i class="fas fa-times-circle"></i>
                        <h4>${outOfStock.length}</h4>
                        <small>منتهي</small>
                    </div>
                </div>
                
                ${lowStock.length > 0 ? `
                    <div style="background:rgba(251,191,36,0.1); border:1px solid #fbbf24; border-radius:15px; padding:15px; margin:20px 0;">
                        <h4 style="color:#fbbf24;">⚠️ مخزون منخفض</h4>
                        ${lowStock.map(p => `
                            <div style="display:flex; justify-content:space-between; margin:10px 0;">
                                <span>${p.name}</span>
                                <span>${p.stock} / ${p.minStock || 5}</span>
                                <button class="btn-gold" onclick="Inventory.reorderProduct('${merchantId}', '${p.id}')">إعادة طلب</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <h4>المنتجات</h4>
                <table style="width:100%;">
                    <thead>
                        <tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>الحد الأدنى</th></tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.price} دج</td>
                                <td style="color:${p.stock <= 0 ? '#f87171' : p.stock < (p.minStock||5) ? '#fbbf24' : '#4ade80'};">${p.stock}</td>
                                <td>${p.minStock || 5}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    // إعادة طلب منتج
    reorderProduct(merchantId, productId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return;
        
        const product = warehouse.products[productId];
        const orderQuantity = (product.maxStock || 100) - product.stock;
        
        // إرسال إشعار للمدير
        if (window.Telegram) {
            Telegram.sendMessage(`
🟡 *طلب إعادة تموين*
━━━━━━━━━━━━━━━━━━━━━━
🏪 التاجر: ${warehouse.merchantName}
📦 المنتج: ${product.name}
📊 الكمية الحالية: ${product.stock}
⬆️ الكمية المطلوبة: ${orderQuantity}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
        }
        
        Utils.showNotification(`📦 تم إنشاء طلب إعادة تموين لـ ${product.name}`);
    }
};

// ===== [6.2] تهيئة النظام =====
window.Inventory = InventorySystem;
InventorySystem.init();

console.log('✅ نظام المستودعات جاهز');
