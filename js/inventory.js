/* ================================================================== */
/* ===== [07] الملف: 07-inventory.js - نظام إدارة المخزون ===== */
/* ================================================================== */

const InventorySystem = {
    warehouses: {},
    movements: [],
    
    // التهيئة
    init() {
        this.warehouses = Utils.load('inventory_warehouses', {});
        this.movements = Utils.load('inventory_movements', []);
        console.log('📦 نظام المخزون جاهز');
    },
    
    // إنشاء مستودع للتاجر
    createWarehouse(merchant) {
        const merchantId = merchant.userId || merchant.id;
        
        if (this.warehouses[merchantId]) {
            return this.warehouses[merchantId];
        }
        
        const warehouse = {
            id: `WH_${merchantId}`,
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
        
        return warehouse;
    },
    
    // إضافة منتج للمستودع
    addProduct(merchantId, product) {
        if (!this.warehouses[merchantId]) {
            return false;
        }
        
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
        
        this.updateStats(merchantId);
        this.save();
        
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
    
    // تحديث المخزون
    updateStock(merchantId, productId, newStock, reason = 'update') {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const oldStock = warehouse.products[productId].stock;
        
        warehouse.products[productId].stock = newStock;
        warehouse.products[productId].lastUpdated = new Date().toISOString();
        
        this.updateStats(merchantId);
        this.save();
        
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
        
        // تنبيه إذا أصبح المخزون منخفضاً
        if (newStock > 0 && newStock < warehouse.settings.lowStockThreshold) {
            this.notifyLowStock(merchantId, productId);
        }
        
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
    
    // تحديث الإحصائيات
    updateStats(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return;
        
        const products = Object.values(warehouse.products);
        const threshold = warehouse.settings.lowStockThreshold;
        
        warehouse.stats = {
            totalProducts: products.length,
            totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
            lowStock: products.filter(p => p.stock > 0 && p.stock < threshold).length,
            outOfStock: products.filter(p => p.stock <= 0).length
        };
        
        warehouse.lastUpdated = new Date().toISOString();
    },
    
    // الحصول على المنتجات منخفضة المخزون
    getLowStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        const threshold = warehouse.settings.lowStockThreshold;
        return Object.values(warehouse.products).filter(p => 
            p.stock > 0 && p.stock < threshold
        );
    },
    
    // الحصول على المنتجات المنتهية
    getOutOfStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        return Object.values(warehouse.products).filter(p => p.stock <= 0);
    },
    
    // تسجيل حركة
    logMovement(movement) {
        movement.id = `MOV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.movements.unshift(movement);
        
        // الاحتفاظ بآخر 500 حركة فقط
        if (this.movements.length > 500) {
            this.movements = this.movements.slice(0, 500);
        }
        
        Utils.save('inventory_movements', this.movements);
    },
    
    // الحصول على حركات التاجر
    getMerchantMovements(merchantId, limit = 50) {
        return this.movements
            .filter(m => m.merchantId === merchantId)
            .slice(0, limit);
    },
    
    // تنبيه المخزون المنخفض
    notifyLowStock(merchantId, productId) {
        const warehouse = this.warehouses[merchantId];
        const product = warehouse?.products[productId];
        if (!product) return;
        
        // إشعار محلي
        Utils.showNotification(`⚠️ المخزون منخفض: ${product.name} (${product.stock} قطعة)`, 'warning');
        
        // إشعار للتلغرام
        if (window.Telegram) {
            Telegram.sendMessage(`
⚠️ *تنبيه: مخزون منخفض*
━━━━━━━━━━━━━━━━━━━━━━
🏪 التاجر: ${warehouse.merchantName}
📦 المنتج: ${product.name}
📊 المتبقي: ${product.stock} قطعة
⚠️ الحد الأدنى: ${warehouse.settings.lowStockThreshold}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
        }
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
            this.updateStats(merchantId);
            this.save();
            
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
        Utils.save('inventory_warehouses', this.warehouses);
    },
    
    // عرض لوحة المخزون للتاجر
    showMerchantInventory() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول', 'error');
            return;
        }
        
        const merchantId = Auth.currentUser.userId || Auth.currentUser.id;
        
        if (!Roles.hasPermission(Auth.currentUser, 'manage_inventory')) {
            Utils.showNotification('غير مصرح لك', 'error');
            return;
        }
        
        // التأكد من وجود مستودع
        if (!this.warehouses[merchantId]) {
            this.createWarehouse(Auth.currentUser);
        }
        
        const warehouse = this.warehouses[merchantId];
        const lowStock = this.getLowStockProducts(merchantId);
        const outOfStock = this.getOutOfStockProducts(merchantId);
        const products = Object.values(warehouse.products);
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-lg" style="max-width: 800px;">
                <div class="modal-header">
                    <h2><i class="fas fa-boxes"></i> إدارة المخزون</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                        <div style="background: var(--glass); padding: 15px; border-radius: 12px; text-align: center;">
                            <i class="fas fa-box" style="font-size: 24px;"></i>
                            <h3>${products.length}</h3>
                            <small>إجمالي المنتجات</small>
                        </div>
                        <div style="background: var(--glass); padding: 15px; border-radius: 12px; text-align: center;">
                            <i class="fas fa-coins" style="font-size: 24px;"></i>
                            <h3>${warehouse.stats.totalValue.toLocaleString()} دج</h3>
                            <small>قيمة المخزون</small>
                        </div>
                        <div style="background: rgba(251,191,36,0.1); padding: 15px; border-radius: 12px; text-align: center;">
                            <i class="fas fa-exclamation-triangle" style="color: #fbbf24;"></i>
                            <h3 style="color: #fbbf24;">${lowStock.length}</h3>
                            <small>مخزون منخفض</small>
                        </div>
                        <div style="background: rgba(248,113,113,0.1); padding: 15px; border-radius: 12px; text-align: center;">
                            <i class="fas fa-times-circle" style="color: #f87171;"></i>
                            <h3 style="color: #f87171;">${outOfStock.length}</h3>
                            <small>منتهي</small>
                        </div>
                    </div>
                    
                    ${lowStock.length > 0 ? `
                        <div style="background: rgba(251,191,36,0.1); border: 1px solid #fbbf24; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                            <h4 style="color: #fbbf24;">⚠️ منتجات منخفضة المخزون</h4>
                            ${lowStock.map(p => `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                                    <span>${p.name}</span>
                                    <span style="color: #fbbf24;">${p.stock} / ${p.minStock}</span>
                                    <button class="btn-gold" onclick="Inventory.reorderProduct('${merchantId}', '${p.id}')" style="padding: 5px 12px;">إعادة طلب</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <h4>قائمة المنتجات</h4>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: var(--glass); position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 10px;">المنتج</th>
                                    <th style="padding: 10px;">السعر</th>
                                    <th style="padding: 10px;">المخزون</th>
                                    <th style="padding: 10px;">الحد الأدنى</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(p => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <td style="padding: 10px;">${p.name}</td>
                                        <td style="padding: 10px;">${p.price} دج</td>
                                        <td style="padding: 10px; color: ${p.stock <= 0 ? '#f87171' : p.stock < p.minStock ? '#fbbf24' : '#4ade80'};">${p.stock}</td>
                                        <td style="padding: 10px;">${p.minStock}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // إعادة طلب منتج
    reorderProduct(merchantId, productId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return;
        
        const product = warehouse.products[productId];
        const orderQuantity = (product.maxStock || 100) - product.stock;
        
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

// تهيئة النظام
InventorySystem.init();

// تصدير
window.Inventory = InventorySystem;
console.log('✅ نظام المخزون جاهز');
