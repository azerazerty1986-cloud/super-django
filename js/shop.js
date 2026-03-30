/* ================================================================== */
/* ===== [03] الملف: 03-shop.js - نظام المتجر والمنتجات ===== */
/* ================================================================== */

// ===== [3.1] نظام المنتجات =====
const ShopSystem = {
    products: [],
    currentFilter: 'all',
    searchTerm: '',
    sortBy: 'newest',
    
    // تحميل المنتجات
    async loadProducts() {
        // محاولة جلب من تلغرام أولاً
        if (window.Telegram) {
            this.products = await Telegram.fetchProducts();
        } else {
            this.products = Utils.load('nardoo_products', []);
        }
        
        // إذا لم توجد منتجات، أنشئ منتجات افتراضية
        if (this.products.length === 0) {
            this.createDefaultProducts();
        }
        
        this.displayProducts();
        return this.products;
    },
    
    // إنشاء منتجات افتراضية
    createDefaultProducts() {
        const merchantId = 'MER_001001';
        
        this.products = [
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'زعتر فلسطيني',
                price: 500,
                category: 'spices',
                stock: 50,
                minStock: 10,
                maxStock: 100,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'زعتر فلسطيني أصلي 100%',
                images: [CONFIG.defaultImage],
                rating: 4.5,
                soldCount: 150,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            },
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'كريم ترطيب',
                price: 1200,
                category: 'cosmetic',
                stock: 30,
                minStock: 5,
                maxStock: 50,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'كريم ترطيب للبشرة',
                images: [CONFIG.defaultImage],
                rating: 4.3,
                soldCount: 75,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            },
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'بخور عود',
                price: 1500,
                category: 'other',
                stock: 15,
                minStock: 3,
                maxStock: 30,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'بخور عود فاخر',
                images: [CONFIG.defaultImage],
                rating: 4.8,
                soldCount: 45,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            }
        ];
        
        this.saveProducts();
    },
    
    // حفظ المنتجات
    saveProducts() {
        Utils.save('nardoo_products', this.products);
    },
    
    // عرض المنتجات
    displayProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        let filtered = this.filterProducts();
        filtered = this.sortProducts(filtered);
        
        if (filtered.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        container.innerHTML = filtered.map(p => this.getProductCardHTML(p)).join('');
    },
    
    // تصفية المنتجات
    filterProducts() {
        let filtered = this.products.filter(p => p.stock > 0);
        
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(p => p.category === this.currentFilter);
        }
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }
        
        return filtered;
    },
    
    // ترتيب المنتجات
    sortProducts(products) {
        const sorts = {
            'newest': (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            'price_low': (a, b) => a.price - b.price,
            'price_high': (a, b) => b.price - a.price,
            'name': (a, b) => a.name.localeCompare(b.name),
            'rating': (a, b) => (b.rating || 0) - (a.rating || 0)
        };
        
        return products.sort(sorts[this.sortBy] || sorts.newest);
    },
    
    // HTML لبطاقة المنتج
    getProductCardHTML(product) {
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : CONFIG.defaultImage;
        const categoryName = this.getCategoryName(product.category);
        const stockClass = this.getStockClass(product.stock);
        const stockText = this.getStockText(product.stock);
        
        return `
        <div class="product-card" onclick="App.showProductDetail('${product.id}')">
            <div class="product-time-badge">
                <i class="far fa-clock"></i> ${product.dateStr || Utils.getTimeAgo(product.createdAt)}
            </div>
            <div class="product-gallery">
                <img src="${mainImage}" alt="${product.name}" onerror="this.src='${CONFIG.defaultImage}'">
                ${product.images && product.images.length > 1 ? 
                    `<span class="image-counter"><i class="fas fa-images"></i> ${product.images.length}</span>` : ''}
            </div>
            <div class="product-info">
                <span class="product-category">${categoryName}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-merchant-info">
                    <i class="fas fa-store"></i> ${product.merchantName}
                    <small>(${product.merchantId})</small>
                </div>
                <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                <div class="product-stock ${stockClass}">${stockText}</div>
                <div class="product-actions">
                    <button class="add-to-cart" 
                            onclick="event.stopPropagation(); App.addToCart('${product.id}')"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        </div>`;
    },
    
    // HTML للحالة الفارغة
    getEmptyStateHTML() {
        const canAdd = Auth.currentUser && 
                       (Auth.currentUser.role === 'admin' || Auth.currentUser.role === 'merchant');
        
        return `
            <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                <i class="fas fa-box-open" style="font-size:80px; color:var(--gold); margin-bottom:20px;"></i>
                <h3 style="color:var(--gold);">لا توجد منتجات</h3>
                ${canAdd ? 
                    '<button class="btn-gold" onclick="App.openAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>' : 
                    '<p style="color:var(--text-secondary);">سجل دخول كتاجر لإضافة منتجات</p>'}
            </div>
        `;
    },
    
    // اسم القسم
    getCategoryName(cat) {
        const names = {
            promo: 'برموسيو',
            spices: 'توابل',
            cosmetic: 'كوسمتيك',
            other: 'أخرى'
        };
        return names[cat] || cat;
    },
    
    // كلاس المخزون
    getStockClass(stock) {
        if (stock <= 0) return 'out-of-stock';
        if (stock < 5) return 'low-stock';
        return 'in-stock';
    },
    
    // نص المخزون
    getStockText(stock) {
        if (stock <= 0) return 'غير متوفر';
        if (stock < 5) return `كمية محدودة (${stock})`;
        return `متوفر (${stock})`;
    },
    
    // تغيير التصفية
    filter(category) {
        this.currentFilter = category;
        this.displayProducts();
    },
    
    // بحث
    search(term) {
        this.searchTerm = term;
        this.displayProducts();
    },
    
    // تغيير الترتيب
    setSort(sortBy) {
        this.sortBy = sortBy;
        this.displayProducts();
    },
    
    // الحصول على منتج
    getProduct(productId) {
        return this.products.find(p => p.id === productId || p.productId === productId);
    }
};

// ===== [3.2] نظام السلة المتطور مع نافذة إتمام الطلب =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = Utils.load('nardoo_cart', []);
        this.updateCounter();
        this.addCheckoutModal();
    },
    
    // إضافة للسلة
    add(productId) {
        const product = ShopSystem.getProduct(productId);
        if (!product || product.stock <= 0) {
            Utils.showNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const existing = this.items.find(i => i.productId === productId);
        
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
            } else {
                Utils.showNotification('الكمية غير متوفرة', 'warning');
                return false;
            }
        } else {
            this.items.push({
                productId: productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantId: product.merchantId,
                merchantName: product.merchantName,
                image: product.images ? product.images[0] : product.image
            });
        }
        
        this.save();
        Utils.showNotification('✅ تمت الإضافة للسلة');
        return true;
    },
    
    // تحديث الكمية
    update(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.remove(productId);
            return;
        }
        
        const item = this.items.find(i => i.productId === productId);
        const product = ShopSystem.getProduct(productId);
        
        if (item && product && newQuantity <= product.stock) {
            item.quantity = newQuantity;
            this.save();
        } else {
            Utils.showNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // حذف من السلة
    remove(productId) {
        this.items = this.items.filter(i => i.productId !== productId);
        this.save();
        Utils.showNotification('🗑️ تم الحذف من السلة', 'info');
    },
    
    // حفظ السلة
    save() {
        Utils.save('nardoo_cart', this.items);
        this.updateCounter();
        this.display();
    },
    
    // تحديث العداد
    updateCounter() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        
        // تحديث عداد السلة في الشريط العلوي
        const cartCounter = document.getElementById('cartCounter');
        if (cartCounter) cartCounter.textContent = count;
        
        // تحديث العداد الثابت
        const fixedCartCounter = document.getElementById('fixedCartCounter');
        if (fixedCartCounter) fixedCartCounter.textContent = count;
    },
    
    // عرض السلة في الشريط الجانبي
    display() {
        const container = document.getElementById('cartItems');
        const totalSpan = document.getElementById('cartTotal');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px;">🛒 السلة فارغة</div>';
            if (totalSpan) totalSpan.textContent = `0 ${CONFIG.currency}`;
            return;
        }
        
        let total = 0;
        container.innerHTML = this.items.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image || CONFIG.defaultImage}" alt="${item.name}" onerror="this.src='${CONFIG.defaultImage}'">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="App.updateCartItem('${item.productId}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="App.updateCartItem('${item.productId}', ${item.quantity + 1})">+</button>
                            <button class="quantity-btn btn-remove" onclick="App.removeFromCart('${item.productId}')">×</button>
                        </div>
                    </div>
                    <div class="cart-item-total">
                        ${itemTotal.toLocaleString()} دج
                    </div>
                </div>
            `;
        }).join('');
        
        if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} ${CONFIG.currency}`;
        return total;
    },
    
    // إضافة نافذة إتمام الطلب إلى الصفحة
    addCheckoutModal() {
        // التحقق من وجود النافذة مسبقاً
        if (document.getElementById('checkoutModal')) return;
        
        const modalHTML = `
        <div id="checkoutModal" class="checkout-modal" style="display: none;">
            <div class="checkout-overlay" onclick="CartSystem.closeCheckout()"></div>
            <div class="checkout-container">
                <div class="checkout-header">
                    <div class="checkout-header-icon">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h2>إتمام الطلب</h2>
                    <button class="checkout-close" onclick="CartSystem.closeCheckout()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="checkout-content">
                    <!-- ملخص الطلب -->
                    <div class="checkout-section order-summary">
                        <div class="section-title">
                            <i class="fas fa-receipt"></i>
                            <h3>ملخص الطلب</h3>
                        </div>
                        <div class="order-items-list" id="checkoutItemsList"></div>
                        <div class="order-total-details">
                            <div class="total-row">
                                <span>المجموع الفرعي:</span>
                                <span id="checkoutSubtotal">0 دج</span>
                            </div>
                            <div class="total-row">
                                <span>رسوم التوصيل:</span>
                                <span id="checkoutShipping">0 دج</span>
                            </div>
                            <div class="total-row grand-total">
                                <span>الإجمالي:</span>
                                <span id="checkoutTotal">0 دج</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- معلومات العميل -->
                    <div class="checkout-section customer-info">
                        <div class="section-title">
                            <i class="fas fa-user-circle"></i>
                            <h3>معلومات العميل</h3>
                        </div>
                        
                        <div id="loginRequiredMsg" class="login-required" style="display: none;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>يرجى <a href="#" onclick="App.showLoginModal(); return false;">تسجيل الدخول</a> لإكمال الطلب</p>
                        </div>
                        
                        <div id="customerFormFields">
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-user"></i>
                                    <span>الاسم الكامل</span>
                                </label>
                                <input type="text" id="customerName" 
                                       placeholder="أدخل اسمك الكامل" 
                                       class="form-control"
                                       autocomplete="name">
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>رقم الهاتف</span>
                                </label>
                                <input type="tel" id="customerPhone" 
                                       placeholder="أدخل رقم هاتفك" 
                                       class="form-control"
                                       autocomplete="tel">
                                <small class="form-hint">مثال: 05XXXXXXXX</small>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>عنوان التوصيل</span>
                                </label>
                                <textarea id="customerAddress" 
                                          rows="3" 
                                          placeholder="أدخل عنوان التوصيل بالتفصيل (الولاية، البلدية، الحي، الشارع، رقم البيت)"
                                          class="form-control"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-sticky-note"></i>
                                    <span>ملاحظات إضافية (اختياري)</span>
                                </label>
                                <textarea id="orderNotes" 
                                          rows="2" 
                                          placeholder="أي ملاحظات إضافية للطلب (مثل: وقت التوصيل المناسب، تعليمات خاصة)"
                                          class="form-control"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- طريقة الدفع -->
                    <div class="checkout-section payment-methods">
                        <div class="section-title">
                            <i class="fas fa-credit-card"></i>
                            <h3>طريقة الدفع</h3>
                        </div>
                        
                        <div class="payment-options">
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="cash" checked>
                                <div class="payment-option-content">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <div>
                                        <strong>الدفع عند الاستلام</strong>
                                        <small>ادفع نقداً عند استلام الطلب</small>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="cib">
                                <div class="payment-option-content">
                                    <i class="fas fa-credit-card"></i>
                                    <div>
                                        <strong>الدفع عبر CIB</strong>
                                        <small>تحويل بنكي أو بطاقة ائتمان</small>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="edahabia">
                                <div class="payment-option-content">
                                    <i class="fas fa-mobile-alt"></i>
                                    <div>
                                        <strong>الدفع عبر Edahabia</strong>
                                        <small>بطاقة الذهب الإلكترونية</small>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-actions">
                    <button class="btn-cancel" onclick="CartSystem.closeCheckout()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                    <button class="btn-complete" onclick="CartSystem.completeOrder()">
                        <i class="fas fa-check-circle"></i>
                        تأكيد الطلب
                    </button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.addCheckoutStyles();
    },
    
    // إضافة أنماط CSS للنافذة
    addCheckoutStyles() {
        if (document.getElementById('checkout-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'checkout-modal-styles';
        styles.textContent = `
        /* ===== نافذة إتمام الطلب ===== */
        .checkout-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .checkout-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }
        
        .checkout-container {
            position: relative;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            background: #fff;
            border-radius: 25px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            animation: slideUp 0.3s ease;
            display: flex;
            flex-direction: column;
        }
        
        [data-theme="dark"] .checkout-container {
            background: #1a1a2e;
        }
        
        .checkout-header {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            padding: 20px 25px;
            position: relative;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .checkout-header-icon {
            width: 45px;
            height: 45px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }
        
        .checkout-header h2 {
            color: white;
            margin: 0;
            font-size: 24px;
            flex: 1;
        }
        
        .checkout-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .checkout-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
        
        .checkout-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .checkout-section {
            background: #f9f9f9;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        [data-theme="dark"] .checkout-section {
            background: #2a2a3e;
        }
        
        .section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #D4AF37;
        }
        
        .section-title i {
            color: #D4AF37;
            font-size: 20px;
        }
        
        .section-title h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        [data-theme="dark"] .section-title h3 {
            color: #fff;
        }
        
        .order-items-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .checkout-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .checkout-item:last-child {
            border-bottom: none;
        }
        
        .checkout-item-image {
            width: 60px;
            height: 60px;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .checkout-item-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .checkout-item-details {
            flex: 1;
        }
        
        .checkout-item-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .checkout-item-price {
            font-size: 12px;
            color: #666;
        }
        
        .checkout-item-total {
            font-weight: 700;
            color: #D4AF37;
        }
        
        .order-total-details {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px dashed rgba(0, 0, 0, 0.1);
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        
        .grand-total {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #D4AF37;
            font-size: 20px;
            font-weight: 800;
            color: #D4AF37;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        [data-theme="dark"] .form-group label {
            color: #fff;
        }
        
        .form-group label i {
            color: #D4AF37;
            width: 20px;
        }
        
        .form-control {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: #fff;
        }
        
        [data-theme="dark"] .form-control {
            background: #1a1a2e;
            border-color: #444;
            color: #fff;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #D4AF37;
            box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        
        .form-hint {
            display: block;
            margin-top: 5px;
            font-size: 12px;
            color: #666;
        }
        
        .payment-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .payment-option {
            display: block;
            cursor: pointer;
        }
        
        .payment-option input {
            display: none;
        }
        
        .payment-option-content {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            transition: all 0.3s ease;
            background: #fff;
        }
        
        [data-theme="dark"] .payment-option-content {
            background: #1a1a2e;
            border-color: #444;
        }
        
        .payment-option input:checked + .payment-option-content {
            border-color: #D4AF37;
            background: rgba(212, 175, 55, 0.05);
        }
        
        .payment-option-content i {
            font-size: 28px;
            color: #D4AF37;
        }
        
        .payment-option-content strong {
            display: block;
            margin-bottom: 4px;
        }
        
        .payment-option-content small {
            font-size: 12px;
            color: #666;
        }
        
        .login-required {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px;
            background: rgba(212, 175, 55, 0.1);
            border-radius: 12px;
            border-right: 4px solid #D4AF37;
        }
        
        .login-required i {
            font-size: 24px;
            color: #D4AF37;
        }
        
        .login-required a {
            color: #D4AF37;
            text-decoration: none;
            font-weight: 600;
        }
        
        .checkout-actions {
            display: flex;
            gap: 15px;
            padding: 20px;
            background: #f9f9f9;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        [data-theme="dark"] .checkout-actions {
            background: #2a2a3e;
        }
        
        .btn-cancel, .btn-complete {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-cancel {
            background: #f0f0f0;
            color: #666;
        }
        
        [data-theme="dark"] .btn-cancel {
            background: #3a3a4e;
            color: #aaa;
        }
        
        .btn-cancel:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
        }
        
        .btn-complete {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            color: white;
        }
        
        .btn-complete:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            .checkout-container {
                width: 95%;
                max-height: 95vh;
            }
            
            .checkout-header h2 {
                font-size: 20px;
            }
            
            .checkout-item {
                flex-wrap: wrap;
            }
            
            .checkout-item-total {
                width: 100%;
                text-align: left;
                padding-top: 5px;
            }
            
            .checkout-actions {
                flex-direction: column;
            }
        }
        `;
        
        document.head.appendChild(styles);
    },
    
    // فتح نافذة إتمام الطلب
    openCheckout() {
        if (this.items.length === 0) {
            Utils.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateCheckoutModal();
        }
    },
    
    // تعبئة بيانات نافذة إتمام الطلب
    populateCheckoutModal() {
        // حساب المجاميع
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = (CONFIG.shipping !== undefined) ? CONFIG.shipping : 200;
        const total = subtotal + shipping;
        
        // عرض المنتجات في الملخص
        const itemsList = document.getElementById('checkoutItemsList');
        if (itemsList) {
            itemsList.innerHTML = this.items.map(item => `
                <div class="checkout-item">
                    <div class="checkout-item-image">
                        <img src="${item.image || CONFIG.defaultImage}" alt="${item.name}" onerror="this.src='${CONFIG.defaultImage}'">
                    </div>
                    <div class="checkout-item-details">
                        <div class="checkout-item-name">${item.name}</div>
                        <div class="checkout-item-price">${item.price.toLocaleString()} دج × ${item.quantity}</div>
                    </div>
                    <div class="checkout-item-total">
                        ${(item.price * item.quantity).toLocaleString()} دج
                    </div>
                </div>
            `).join('');
        }
        
        // تحديث المجاميع
        const subtotalEl = document.getElementById('checkoutSubtotal');
        const shippingEl = document.getElementById('checkoutShipping');
        const totalEl = document.getElementById('checkoutTotal');
        
        if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} دج`;
        if (shippingEl) shippingEl.textContent = `${shipping.toLocaleString()} دج`;
        if (totalEl) totalEl.textContent = `${total.toLocaleString()} دج`;
        
        // تعبئة بيانات المستخدم إذا كان مسجلاً
        const isLoggedIn = Auth.currentUser && Auth.currentUser.userId;
        
        if (isLoggedIn) {
            const nameInput = document.getElementById('customerName');
            const phoneInput = document.getElementById('customerPhone');
            
            if (nameInput) nameInput.value = Auth.currentUser.name || '';
            if (phoneInput) phoneInput.value = Auth.currentUser.phone || '';
            
            const loginRequiredMsg = document.getElementById('loginRequiredMsg');
            const customerFormFields = document.getElementById('customerFormFields');
            
            if (loginRequiredMsg) loginRequiredMsg.style.display = 'none';
            if (customerFormFields) customerFormFields.style.display = 'block';
        } else {
            const loginRequiredMsg = document.getElementById('loginRequiredMsg');
            const customerFormFields = document.getElementById('customerFormFields');
            
            if (loginRequiredMsg) loginRequiredMsg.style.display = 'flex';
            if (customerFormFields) customerFormFields.style.display = 'none';
        }
    },
    
    // إتمام الطلب
    completeOrder() {
        // التحقق من تسجيل الدخول
        if (!Auth.currentUser || !Auth.currentUser.userId) {
            Utils.showNotification('يرجى تسجيل الدخول أولاً', 'warning');
            this.closeCheckout();
            if (typeof openLoginModal === 'function') {
                openLoginModal();
            }
            return;
        }
        
        // الحصول على بيانات النموذج
        const customerName = document.getElementById('customerName')?.value.trim();
        const customerPhone = document.getElementById('customerPhone')?.value.trim();
        const customerAddress = document.getElementById('customerAddress')?.value.trim();
        const orderNotes = document.getElementById('orderNotes')?.value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        
        // التحقق من صحة البيانات
        if (!customerName || !customerPhone || !customerAddress) {
            Utils.showNotification('يرجى تعبئة جميع البيانات المطلوبة', 'error');
            return;
        }
        
        // التحقق من صحة رقم الهاتف الجزائري
        const phoneRegex = /^0[567]\d{8}$/;
        if (!phoneRegex.test(customerPhone)) {
            Utils.showNotification('رقم الهاتف غير صحيح (مثال: 05XXXXXXXX أو 06XXXXXXXX أو 07XXXXXXXX)', 'error');
            return;
        }
        
        // حساب المجاميع
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = (CONFIG.shipping !== undefined) ? CONFIG.shipping : 200;
        const total = subtotal + shipping;
        
        // إنشاء رسالة الطلب
        let message = '🛍️ *طلب جديد - ناردو برو* 🛍️\n\n';
        message += `👤 *العميل:* ${customerName}\n`;
        message += `📞 *الهاتف:* ${customerPhone}\n`;
        message += `📍 *العنوان:* ${customerAddress}\n`;
        message += `💳 *طريقة الدفع:* ${this.getPaymentMethodName(paymentMethod)}\n\n`;
        message += `📦 *المنتجات:*\n`;
        message += `────────────────\n`;
        
        this.items.forEach(item => {
            message += `• ${item.name}\n`;
            message += `  الكمية: ${item.quantity} × ${item.price.toLocaleString()} دج\n`;
            message += `  المجموع: ${(item.price * item.quantity).toLocaleString()} دج\n`;
            message += `────────────────\n`;
        });
        
        message += `\n💰 *المجموع الفرعي:* ${subtotal.toLocaleString()} دج\n`;
        message += `🚚 *رسوم التوصيل:* ${shipping.toLocaleString()} دج\n`;
        message += `💵 *الإجمالي:* ${total.toLocaleString()} دج\n`;
        
        if (orderNotes) {
            message += `\n📝 *ملاحظات:*\n${orderNotes}\n`;
        }
        
        message += `\n⏰ *تاريخ الطلب:* ${new Date().toLocaleString('ar-DZ')}\n`;
        message += `🆔 *رقم الطلب:* ${this.generateOrderNumber()}\n`;
        
        // الحصول على رقم الهاتف من CONFIG
        const phoneNumber = (CONFIG.phone) ? CONFIG.phone.replace(/[^0-9]/g, '') : '2135622448';
        
        // فتح واتساب
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
        
        // إرسال للتلغرام إذا كان متاحاً
        if (window.Telegram && Telegram.sendOrder) {
            Telegram.sendOrder({
                customer: customerName,
                phone: customerPhone,
                address: customerAddress,
                items: this.items,
                subtotal: subtotal,
                shipping: shipping,
                total: total,
                notes: orderNotes,
                paymentMethod: paymentMethod
            });
        }
        
        // حفظ الطلب في سجل الطلبات
        this.saveOrder({
            orderNumber: this.generateOrderNumber(),
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            items: JSON.parse(JSON.stringify(this.items)),
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            notes: orderNotes,
            paymentMethod: paymentMethod,
            date: new Date().toISOString(),
            status: 'pending'
        });
        
        // تفريغ السلة
        this.clear();
        
        // إغلاق النافذة
        this.closeCheckout();
        
        // عرض رسالة نجاح
        Utils.showNotification('✅ تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
    },
    
    // الحصول على اسم طريقة الدفع
    getPaymentMethodName(method) {
        const methods = {
            'cash': 'الدفع عند الاستلام',
            'cib': 'الدفع عبر CIB',
            'edahabia': 'الدفع عبر Edahabia'
        };
        return methods[method] || method;
    },
    
    // إنشاء رقم طلب
    generateOrderNumber() {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `NARD-${timestamp}-${random}`;
    },
    
    // حفظ الطلب
    saveOrder(order) {
        const orders = Utils.load('nardoo_orders', []);
        orders.unshift(order);
        // الاحتفاظ بآخر 100 طلب فقط
        if (orders.length > 100) orders.pop();
        Utils.save('nardoo_orders', orders);
    },
    
    // إغلاق نافذة إتمام الطلب
    closeCheckout() {
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // تفريغ السلة
    clear() {
        this.items = [];
        this.save();
    }
};

// ===== [3.3] تهيئة الأنظمة =====
window.Shop = ShopSystem;
window.Cart = CartSystem;

// تهيئة السلة
CartSystem.init();

console.log('✅ نظام المتجر جاهز مع نافذة إتمام الطلب المتطورة');
