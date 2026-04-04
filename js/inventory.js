/* ================================================================== */
/* ===== [07-inventory.js] - نظام إدارة المخزون المتكامل ===== */
/* ================================================================== */

// ===== [1] إعدادات نظام المخزون =====
const INVENTORY_CONFIG = {
    lowStockThreshold: 5,
    autoReorder: false,
    maxStockDefault: 100,
    notificationEnabled: true
};

// ===== [2] نظام المخزون الرئيسي =====
const InventorySystem = {
    warehouses: {},
    movements: [],
    
    // ===== [2.1] التهيئة =====
    init() {
        this.loadData();
        console.log('📦 نظام المخزون جاهز');
    },
    
    // ===== [2.2] تحميل البيانات =====
    loadData() {
        const savedWarehouses = localStorage.getItem('inventory_warehouses');
        if (savedWarehouses) {
            this.warehouses = JSON.parse(savedWarehouses);
        }
        
        const savedMovements = localStorage.getItem('inventory_movements');
        if (savedMovements) {
            this.movements = JSON.parse(savedMovements);
        }
    },
    
    // ===== [2.3] حفظ البيانات =====
    save() {
        localStorage.setItem('inventory_warehouses', JSON.stringify(this.warehouses));
        localStorage.setItem('inventory_movements', JSON.stringify(this.movements));
    },
    
    // ===== [2.4] إنشاء مستودع للتاجر =====
    createWarehouse(merchant) {
        const merchantId = merchant.id || merchant.userId;
        
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
                lowStockThreshold: INVENTORY_CONFIG.lowStockThreshold,
                autoReorder: INVENTORY_CONFIG.autoReorder
            }
        };
        
        this.warehouses[merchantId] = warehouse;
        this.save();
        
        return warehouse;
    },
    
    // ===== [2.5] مزامنة المنتجات من النظام الرئيسي =====
    syncProductsFromMain(merchantId) {
        if (!merchantId || !window.products) return false;
        
        // البحث عن منتجات التاجر
        const merchant = window.currentUser;
        if (!merchant || (merchant.role !== 'merchant_approved' && merchant.role !== 'admin')) return false;
        
        const merchantProducts = window.products.filter(p => 
            p.merchantName === merchant.storeName || 
            p.merchantName === merchant.name
        );
        
        // التأكد من وجود مستودع
        if (!this.warehouses[merchantId]) {
            this.createWarehouse(merchant);
        }
        
        const warehouse = this.warehouses[merchantId];
        let updated = false;
        
        for (const product of merchantProducts) {
            if (!warehouse.products[product.id]) {
                // منتج جديد
                warehouse.products[product.id] = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    stock: product.stock || 0,
                    minStock: INVENTORY_CONFIG.lowStockThreshold,
                    maxStock: INVENTORY_CONFIG.maxStockDefault,
                    addedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    telegramId: product.telegramId || product.id,
                    category: product.category
                };
                updated = true;
            } else {
                // تحديث منتج موجود
                const existing = warehouse.products[product.id];
                if (existing.stock !== (product.stock || 0)) {
                    existing.stock = product.stock || 0;
                    existing.lastUpdated = new Date().toISOString();
                    updated = true;
                }
                if (existing.price !== product.price) {
                    existing.price = product.price;
                    updated = true;
                }
                if (existing.name !== product.name) {
                    existing.name = product.name;
                    updated = true;
                }
            }
        }
        
        if (updated) {
            this.updateStats(merchantId);
            this.save();
        }
        
        return true;
    },
    
    // ===== [2.6] إضافة منتج للمستودع =====
    addProduct(merchantId, product) {
        if (!this.warehouses[merchantId]) {
            this.createWarehouse({ id: merchantId, name: 'التاجر', storeName: 'المتجر' });
        }
        
        this.warehouses[merchantId].products[product.id] = {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock || 0,
            minStock: product.minStock || INVENTORY_CONFIG.lowStockThreshold,
            maxStock: product.maxStock || INVENTORY_CONFIG.maxStockDefault,
            addedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            telegramId: product.telegramId || product.id,
            category: product.category
        };
        
        this.updateStats(merchantId);
        this.save();
        
        this.logMovement({
            type: 'add',
            merchantId: merchantId,
            productId: product.id,
            productName: product.name,
            quantity: product.stock || 0,
            date: new Date().toISOString()
        });
        
        return true;
    },
    
    // ===== [2.7] تحديث المخزون =====
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
        
        // تحديث المخزون في المنتجات الرئيسية
        if (window.products) {
            const mainProduct = window.products.find(p => p.id == productId);
            if (mainProduct) {
                mainProduct.stock = newStock;
                localStorage.setItem('nardoo_products', JSON.stringify(window.products));
            }
        }
        
        // تنبيه إذا أصبح المخزون منخفضاً
        if (newStock > 0 && newStock < warehouse.settings.lowStockThreshold) {
            this.notifyLowStock(merchantId, productId);
        }
        
        return true;
    },
    
    // ===== [2.8] خفض المخزون (بعد البيع) =====
    decreaseStock(merchantId, productId, quantity) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const currentStock = warehouse.products[productId].stock;
        if (currentStock < quantity) return false;
        
        return this.updateStock(merchantId, productId, currentStock - quantity, 'sale');
    },
    
    // ===== [2.9] زيادة المخزون (توريد) =====
    increaseStock(merchantId, productId, quantity) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return false;
        
        const currentStock = warehouse.products[productId].stock;
        return this.updateStock(merchantId, productId, currentStock + quantity, 'restock');
    },
    
    // ===== [2.10] تحديث الإحصائيات =====
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
    
    // ===== [2.11] الحصول على المنتجات منخفضة المخزون =====
    getLowStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        const threshold = warehouse.settings.lowStockThreshold;
        return Object.values(warehouse.products).filter(p => 
            p.stock > 0 && p.stock < threshold
        );
    },
    
    // ===== [2.12] الحصول على المنتجات المنتهية =====
    getOutOfStockProducts(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return [];
        
        return Object.values(warehouse.products).filter(p => p.stock <= 0);
    },
    
    // ===== [2.13] تسجيل حركة =====
    logMovement(movement) {
        movement.id = `MOV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.movements.unshift(movement);
        
        // الاحتفاظ بآخر 500 حركة فقط
        if (this.movements.length > 500) {
            this.movements = this.movements.slice(0, 500);
        }
        
        localStorage.setItem('inventory_movements', JSON.stringify(this.movements));
    },
    
    // ===== [2.14] الحصول على حركات التاجر =====
    getMerchantMovements(merchantId, limit = 50) {
        return this.movements
            .filter(m => m.merchantId === merchantId)
            .slice(0, limit);
    },
    
    // ===== [2.15] تنبيه المخزون المنخفض =====
    notifyLowStock(merchantId, productId) {
        const warehouse = this.warehouses[merchantId];
        const product = warehouse?.products[productId];
        if (!product) return;
        
        // إشعار محلي
        if (window.showNotification) {
            window.showNotification(`⚠️ المخزون منخفض: ${product.name} (${product.stock} قطعة)`, 'warning');
        }
        
        // إشعار للتلغرام
        if (window.TELEGRAM && window.TELEGRAM.channelId) {
            const message = `⚠️ *تنبيه: مخزون منخفض*
━━━━━━━━━━━━━━━━━━━━━━
🏪 التاجر: ${warehouse.merchantName}
📦 المنتج: ${product.name}
📊 المتبقي: ${product.stock} قطعة
⚠️ الحد الأدنى: ${warehouse.settings.lowStockThreshold}
🕐 ${new Date().toLocaleString('ar-EG')}`;
            
            fetch(`https://api.telegram.org/bot${window.TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: window.TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            }).catch(console.error);
        }
    },
    
    // ===== [2.16] عرض لوحة المخزون للتاجر =====
    showMerchantInventory() {
        if (!window.currentUser) {
            if (window.showNotification) window.showNotification('الرجاء تسجيل الدخول', 'error');
            if (window.openLoginModal) window.openLoginModal();
            return;
        }
        
        const merchantId = window.currentUser.id;
        const isMerchant = window.currentUser.role === 'merchant_approved';
        const isAdmin = window.currentUser.role === 'admin';
        
        if (!isMerchant && !isAdmin) {
            if (window.showNotification) window.showNotification('غير مصرح لك - هذه اللوحة للتجار فقط', 'error');
            return;
        }
        
        // مزامنة المنتجات أولاً
        this.syncProductsFromMain(merchantId);
        
        // التأكد من وجود مستودع
        if (!this.warehouses[merchantId]) {
            this.createWarehouse(window.currentUser);
            this.syncProductsFromMain(merchantId);
        }
        
        const warehouse = this.warehouses[merchantId];
        const lowStock = this.getLowStockProducts(merchantId);
        const outOfStock = this.getOutOfStockProducts(merchantId);
        const products = Object.values(warehouse.products);
        
        // إنشاء النافذة المنبثقة
        const modal = document.createElement('div');
        modal.className = 'inventory-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(10px);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary, #1a1a1a);
                        border-radius: 30px;
                        max-width: 900px;
                        width: 95%;
                        max-height: 85vh;
                        overflow-y: auto;
                        border: 2px solid var(--gold, #ffd700);
                        animation: slideUp 0.3s ease;">
                
                <div style="position: sticky; top: 0; background: var(--bg-secondary, #1a1a1a);
                            padding: 20px 25px; border-bottom: 2px solid var(--gold, #ffd700);
                            display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="color: var(--gold, #ffd700); margin: 0;">
                        <i class="fas fa-boxes"></i> إدارة المخزون
                    </h2>
                    <button onclick="this.closest('.inventory-modal').remove()" 
                            style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text, #fff);">
                        &times;
                    </button>
                </div>
                
                <div style="padding: 25px;">
                    <!-- بطاقات الإحصائيات -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                        <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 18px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-box" style="font-size: 28px; color: var(--gold, #ffd700);"></i>
                            <h3 style="margin: 10px 0 5px; font-size: 28px;">${products.length}</h3>
                            <small style="color: var(--text-secondary, #aaa);">إجمالي المنتجات</small>
                        </div>
                        <div style="background: var(--glass, rgba(255,255,255,0.1)); padding: 18px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-coins" style="font-size: 28px; color: var(--gold, #ffd700);"></i>
                            <h3 style="margin: 10px 0 5px; font-size: 28px;">${warehouse.stats.totalValue.toLocaleString()} دج</h3>
                            <small style="color: var(--text-secondary, #aaa);">قيمة المخزون</small>
                        </div>
                        <div style="background: rgba(251,191,36,0.15); padding: 18px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 28px; color: #fbbf24;"></i>
                            <h3 style="margin: 10px 0 5px; font-size: 28px; color: #fbbf24;">${lowStock.length}</h3>
                            <small style="color: var(--text-secondary, #aaa);">مخزون منخفض</small>
                        </div>
                        <div style="background: rgba(248,113,113,0.15); padding: 18px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-times-circle" style="font-size: 28px; color: #f87171;"></i>
                            <h3 style="margin: 10px 0 5px; font-size: 28px; color: #f87171;">${outOfStock.length}</h3>
                            <small style="color: var(--text-secondary, #aaa);">غير متوفر</small>
                        </div>
                    </div>
                    
                    ${lowStock.length > 0 ? `
                        <div style="background: rgba(251,191,36,0.1); border: 1px solid #fbbf24; border-radius: 15px; padding: 18px; margin-bottom: 25px;">
                            <h4 style="color: #fbbf24; margin: 0 0 15px 0;">
                                <i class="fas fa-exclamation-triangle"></i> منتجات منخفضة المخزون
                            </h4>
                            ${lowStock.map(p => `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                                    <div>
                                        <strong>${p.name}</strong>
                                        <div style="font-size: 12px; color: var(--text-secondary);">السعر: ${p.price} دج</div>
                                    </div>
                                    <div>
                                        <span style="color: #fbbf24; font-weight: bold;">${p.stock} / ${p.minStock}</span>
                                        <button class="inventory-reorder-btn" data-product-id="${p.id}" 
                                                style="background: var(--gold, #ffd700); color: black; border: none; 
                                                       padding: 8px 15px; border-radius: 20px; margin-left: 10px; cursor: pointer;">
                                            <i class="fas fa-truck"></i> إعادة طلب
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- جدول المنتجات -->
                    <h4 style="margin: 20px 0 15px; color: var(--gold, #ffd700);">
                        <i class="fas fa-list"></i> قائمة المنتجات
                    </h4>
                    <div style="max-height: 400px; overflow-y: auto; border-radius: 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: var(--glass, rgba(255,255,255,0.1)); position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 12px; text-align: right;">المنتج</th>
                                    <th style="padding: 12px; text-align: right;">السعر</th>
                                    <th style="padding: 12px; text-align: center;">المخزون</th>
                                    <th style="padding: 12px; text-align: center;">الحد الأدنى</th>
                                    <th style="padding: 12px; text-align: center;">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(p => {
                                    const stockClass = p.stock <= 0 ? 'out' : (p.stock < p.minStock ? 'low' : 'good');
                                    const stockColor = p.stock <= 0 ? '#f87171' : (p.stock < p.minStock ? '#fbbf24' : '#4ade80');
                                    return `
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                            <td style="padding: 12px;">
                                                <strong>${p.name}</strong>
                                                <div style="font-size: 11px; color: var(--text-secondary);">ID: ${p.id}</div>
                                            </td>
                                            <td style="padding: 12px;">${p.price.toLocaleString()} دج</td>
                                            <td style="padding: 12px; text-align: center;">
                                                <span style="color: ${stockColor}; font-weight: bold; padding: 4px 8px; border-radius: 20px; background: ${stockColor}20;">
                                                    ${p.stock}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; text-align: center;">${p.minStock}</td>
                                            <td style="padding: 12px; text-align: center;">
                                                <div style="display: flex; gap: 5px; justify-content: center;">
                                                    <button class="inventory-update-btn" data-product-id="${p.id}" 
                                                            style="background: #3b82f6; color: white; border: none; 
                                                                   padding: 5px 10px; border-radius: 8px; cursor: pointer;">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="inventory-restock-btn" data-product-id="${p.id}"
                                                            style="background: #10b981; color: white; border: none; 
                                                                   padding: 5px 10px; border-radius: 8px; cursor: pointer;">
                                                        <i class="fas fa-plus"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    ${products.length === 0 ? `
                        <div style="text-align: center; padding: 60px 20px;">
                            <i class="fas fa-box-open" style="font-size: 60px; color: var(--gold, #ffd700); opacity: 0.5;"></i>
                            <p style="margin-top: 15px;">لا توجد منتجات في المخزون</p>
                            <button onclick="window.showAddProductModal && window.showAddProductModal()" 
                                    style="background: var(--gold, #ffd700); color: black; border: none; 
                                           padding: 10px 20px; border-radius: 25px; margin-top: 15px; cursor: pointer;">
                                <i class="fas fa-plus"></i> إضافة منتج
                            </button>
                        </div>
                    ` : ''}
                    
                    <!-- أزرار الإجراءات -->
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <button id="inventoryRefreshBtn" style="background: var(--glass, rgba(255,255,255,0.1)); 
                                color: var(--text, #fff); border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> مزامنة
                        </button>
                        <button id="inventoryExportBtn" style="background: var(--glass, rgba(255,255,255,0.1)); 
                                color: var(--text, #fff); border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer;">
                            <i class="fas fa-download"></i> تصدير التقرير
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // إضافة الأحداث للأزرار
        modal.querySelectorAll('.inventory-update-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.showUpdateStockModal(merchantId, productId, modal);
            });
        });
        
        modal.querySelectorAll('.inventory-restock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.showRestockModal(merchantId, productId, modal);
            });
        });
        
        modal.querySelectorAll('.inventory-reorder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.reorderProduct(merchantId, productId);
            });
        });
        
        const refreshBtn = modal.querySelector('#inventoryRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.syncProductsFromMain(merchantId);
                modal.remove();
                this.showMerchantInventory();
                if (window.showNotification) window.showNotification('🔄 تمت المزامنة بنجاح', 'success');
            });
        }
        
        const exportBtn = modal.querySelector('#inventoryExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportInventoryReport(merchantId));
        }
    },
    
    // ===== [2.17] نافذة تحديث المخزون =====
    showUpdateStockModal(merchantId, productId, parentModal) {
        const warehouse = this.warehouses[merchantId];
        const product = warehouse?.products[productId];
        if (!product) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(10px);
            z-index: 20001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary, #1a1a1a);
                        border-radius: 25px;
                        padding: 30px;
                        max-width: 400px;
                        width: 90%;
                        border: 2px solid var(--gold, #ffd700);">
                <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px; text-align: center;">
                    <i class="fas fa-edit"></i> تحديث المخزون
                </h3>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px;">المنتج: <strong>${product.name}</strong></label>
                    <label style="display: block; margin-bottom: 8px;">المخزون الحالي: <strong>${product.stock}</strong></label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px;">المخزون الجديد:</label>
                    <input type="number" id="newStockValue" value="${product.stock}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                  background: var(--bg-primary, #0a0a0a); color: var(--text, #fff);">
                </div>
                <div style="display: flex; gap: 15px;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="flex: 1; padding: 12px; background: #f87171; color: white; border: none; border-radius: 10px; cursor: pointer;">
                        إلغاء
                    </button>
                    <button id="confirmUpdateStock" 
                            style="flex: 1; padding: 12px; background: var(--gold, #ffd700); color: black; border: none; border-radius: 10px; cursor: pointer;">
                        تحديث
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmUpdateStock').onclick = () => {
            const newStock = parseInt(document.getElementById('newStockValue').value);
            if (isNaN(newStock) || newStock < 0) {
                if (window.showNotification) window.showNotification('الرجاء إدخال كمية صحيحة', 'error');
                return;
            }
            
            this.updateStock(merchantId, productId, newStock, 'manual');
            modal.remove();
            parentModal?.remove();
            this.showMerchantInventory();
            if (window.showNotification) window.showNotification(`✅ تم تحديث مخزون ${product.name}`, 'success');
        };
    },
    
    // ===== [2.18] نافذة إعادة التموين =====
    showRestockModal(merchantId, productId, parentModal) {
        const warehouse = this.warehouses[merchantId];
        const product = warehouse?.products[productId];
        if (!product) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(10px);
            z-index: 20001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary, #1a1a1a);
                        border-radius: 25px;
                        padding: 30px;
                        max-width: 400px;
                        width: 90%;
                        border: 2px solid var(--gold, #ffd700);">
                <h3 style="color: var(--gold, #ffd700); margin-bottom: 20px; text-align: center;">
                    <i class="fas fa-truck"></i> إعادة تموين
                </h3>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px;">المنتج: <strong>${product.name}</strong></label>
                    <label style="display: block; margin-bottom: 8px;">المخزون الحالي: <strong>${product.stock}</strong></label>
                    <label style="display: block; margin-bottom: 8px;">الحد الأقصى: <strong>${product.maxStock}</strong></label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px;">كمية الإضافة:</label>
                    <input type="number" id="restockQuantity" value="${product.maxStock - product.stock}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold, #ffd700);
                                  background: var(--bg-primary, #0a0a0a); color: var(--text, #fff);">
                </div>
                <div style="display: flex; gap: 15px;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="flex: 1; padding: 12px; background: #f87171; color: white; border: none; border-radius: 10px; cursor: pointer;">
                        إلغاء
                    </button>
                    <button id="confirmRestock" 
                            style="flex: 1; padding: 12px; background: var(--gold, #ffd700); color: black; border: none; border-radius: 10px; cursor: pointer;">
                        إعادة تموين
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmRestock').onclick = () => {
            const quantity = parseInt(document.getElementById('restockQuantity').value);
            if (isNaN(quantity) || quantity <= 0) {
                if (window.showNotification) window.showNotification('الرجاء إدخال كمية صحيحة', 'error');
                return;
            }
            
            this.increaseStock(merchantId, productId, quantity);
            modal.remove();
            parentModal?.remove();
            this.showMerchantInventory();
            if (window.showNotification) window.showNotification(`✅ تم إضافة ${quantity} قطعة من ${product.name}`, 'success');
        };
    },
    
    // ===== [2.19] إعادة طلب منتج =====
    reorderProduct(merchantId, productId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse || !warehouse.products[productId]) return;
        
        const product = warehouse.products[productId];
        const orderQuantity = product.maxStock - product.stock;
        
        if (orderQuantity <= 0) {
            if (window.showNotification) window.showNotification('المخزون كافٍ، لا حاجة لإعادة طلب', 'info');
            return;
        }
        
        // إرسال طلب للتلغرام
        if (window.TELEGRAM && window.TELEGRAM.botToken) {
            const message = `🟡 *طلب إعادة تموين*
━━━━━━━━━━━━━━━━━━━━━━
🏪 التاجر: ${warehouse.merchantName}
📦 المنتج: ${product.name}
📊 الكمية الحالية: ${product.stock}
⬆️ الكمية المطلوبة: ${orderQuantity}
💰 التكلفة المتوقعة: ${(orderQuantity * product.price).toLocaleString()} دج
🕐 ${new Date().toLocaleString('ar-EG')}`;
            
            fetch(`https://api.telegram.org/bot${window.TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: window.TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            }).catch(console.error);
        }
        
        if (window.showNotification) {
            window.showNotification(`📦 تم إنشاء طلب إعادة تموين لـ ${product.name}`, 'success');
        }
    },
    
    // ===== [2.20] تصدير تقرير المخزون =====
    exportInventoryReport(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return;
        
        const products = Object.values(warehouse.products);
        const date = new Date().toLocaleString('ar-EG');
        
        let report = `تقرير المخزون - ${warehouse.storeName}\n`;
        report += `التاريخ: ${date}\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        report += `إجمالي المنتجات: ${products.length}\n`;
        report += `قيمة المخزون: ${warehouse.stats.totalValue.toLocaleString()} دج\n`;
        report += `منتجات منخفضة: ${warehouse.stats.lowStock}\n`;
        report += `منتجات غير متوفرة: ${warehouse.stats.outOfStock}\n\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `تفاصيل المنتجات:\n\n`;
        
        products.forEach(p => {
            report += `📦 ${p.name}\n`;
            report += `   السعر: ${p.price} دج\n`;
            report += `   المخزون: ${p.stock}\n`;
            report += `   الحالة: ${p.stock <= 0 ? 'غير متوفر' : (p.stock < p.minStock ? 'منخفض' : 'متوفر')}\n`;
            report += `   آخر تحديث: ${new Date(p.lastUpdated).toLocaleString('ar-EG')}\n\n`;
        });
        
        // تحميل الملف
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_report_${merchantId}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.showNotification) window.showNotification('📄 تم تصدير التقرير بنجاح', 'success');
    },
    
    // ===== [2.21] الحصول على إحصائيات المخزون =====
    getInventoryStats(merchantId) {
        const warehouse = this.warehouses[merchantId];
        if (!warehouse) return null;
        
        return {
            ...warehouse.stats,
            lastUpdated: warehouse.lastUpdated,
            storeName: warehouse.storeName
        };
    }
};

// ===== [3] ربط النظام بالواجهة =====
function showInventoryPanel() {
    InventorySystem.showMerchantInventory();
}

// ===== [4] إضافة زر المخزون في واجهة التاجر =====
function addInventoryButtonToMerchantPanel() {
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (!merchantPanel) return;
    
    // التحقق إذا كان الزر موجوداً مسبقاً
    if (document.getElementById('inventoryPanelBtn')) return;
    
    const inventoryBtn = document.createElement('button');
    inventoryBtn.id = 'inventoryPanelBtn';
    inventoryBtn.className = 'btn-outline-gold';
    inventoryBtn.style.cssText = 'margin-top: 10px; width: 100%;';
    inventoryBtn.innerHTML = '<i class="fas fa-boxes"></i> إدارة المخزون';
    inventoryBtn.onclick = () => InventorySystem.showMerchantInventory();
    
    const buttonsContainer = merchantPanel.querySelector('.btn-gold, .btn-outline-gold')?.parentElement;
    if (buttonsContainer) {
        buttonsContainer.appendChild(inventoryBtn);
    } else {
        merchantPanel.appendChild(inventoryBtn);
    }
}

// ===== [5] تهيئة النظام عند تحميل الصفحة =====
InventorySystem.init();

// مراقبة إضافة لوحة التاجر
const merchantObserver = new MutationObserver(() => {
    if (document.getElementById('merchantPanelContainer')) {
        setTimeout(addInventoryButtonToMerchantPanel, 500);
    }
});
merchantObserver.observe(document.body, { childList: true, subtree: true });

// ===== [6] تصدير الدوال =====
window.Inventory = InventorySystem;
window.showInventoryPanel = showInventoryPanel;

console.log('✅ [07-inventory.js] نظام إدارة المخزون جاهز ومتوافق مع تلغرام');
