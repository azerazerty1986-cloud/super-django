/* ================================================================== */
/* ===== [03] الملف: 03-shop.js - نظام السلة المتكامل ===== */
/* ================================================================== */

// ===== التأكد من وجود CONFIG =====
if (typeof CONFIG === 'undefined') {
    window.CONFIG = {
        currency: 'دج',
        shipping: 200,
        phone: '2135622448',
        defaultImage: 'https://via.placeholder.com/300x300?text=No+Image'
    };
}

// ===== نظام السلة المتطور =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = Utils.load('nardoo_cart', []);
        this.updateCounter();
        this.addCheckoutModal();
        this.addCartStyles();
        console.log('✅ نظام السلة جاهز');
    },
    
    // إضافة للسلة
    add(product) {
        // التأكد من وجود المنتج
        if (!product || product.stock <= 0) {
            Utils.showNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const existing = this.items.find(i => i.productId === product.id || i.productId === product.productId);
        
        // الحصول على الصورة بشكل صحيح
        const productImage = (product.images && product.images[0]) || product.image || CONFIG.defaultImage;
        
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
                Utils.showNotification(`✅ تم زيادة كمية ${product.name}`, 'success');
            } else {
                Utils.showNotification('الكمية غير متوفرة', 'warning');
                return false;
            }
        } else {
            this.items.push({
                productId: product.id || product.productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantId: product.merchantId,
                merchantName: product.merchantName,
                image: productImage,
                images: product.images,
                stock: product.stock
            });
            Utils.showNotification(`✅ تم إضافة ${product.name} للسلة`, 'success');
        }
        
        this.save();
        return true;
    },
    
    // تحديث الكمية
    update(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.remove(productId);
            return;
        }
        
        const item = this.items.find(i => i.productId === productId);
        
        if (item && newQuantity <= (item.stock || 999)) {
            item.quantity = newQuantity;
            this.save();
            Utils.showNotification('🔄 تم تحديث الكمية', 'info');
        } else {
            Utils.showNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // حذف من السلة
    remove(productId) {
        const item = this.items.find(i => i.productId === productId);
        if (item) {
            this.items = this.items.filter(i => i.productId !== productId);
            this.save();
            Utils.showNotification(`🗑️ تم حذف ${item.name} من السلة`, 'info');
        }
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
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <i class="fas fa-shopping-cart" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                    <p style="color: var(--text-secondary);">السلة فارغة</p>
                    <button onclick="toggleCart()" style="margin-top: 15px; background: var(--gold); border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer;">
                        مواصلة التسوق
                    </button>
                </div>
            `;
            if (totalSpan) totalSpan.textContent = `0 ${CONFIG.currency}`;
            return;
        }
        
        let total = 0;
        container.innerHTML = this.items.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const productImage = item.image || CONFIG.defaultImage;
            
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${productImage}" 
                             alt="${item.name}" 
                             onerror="this.src='${CONFIG.defaultImage}'; this.onerror=null;">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${this.escapeHtml(item.name)}</div>
                        <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="CartSystem.update('${item.productId}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="CartSystem.update('${item.productId}', ${item.quantity + 1})">+</button>
                            <button class="quantity-btn btn-remove" onclick="CartSystem.remove('${item.productId}')">×</button>
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
    
    // إضافة نافذة إتمام الطلب
    addCheckoutModal() {
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
                                <span id="checkoutShipping">${CONFIG.shipping} دج</span>
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
                            <p>يرجى <a href="#" onclick="if(typeof openLoginModal === 'function') openLoginModal(); else alert('يرجى تسجيل الدخول'); return false;">تسجيل الدخول</a> لإكمال الطلب</p>
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
                                          placeholder="أي ملاحظات إضافية للطلب"
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
    },
    
    // إضافة أنماط CSS للسلة
    addCartStyles() {
        if (document.getElementById('cart-system-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cart-system-styles';
        styles.textContent = `
        /* ===== السلة الجانبية ===== */
        .cart-sidebar {
            position: fixed;
            top: 0;
            left: -400px;
            width: 380px;
            height: 100vh;
            background: var(--bg-primary, #fff);
            box-shadow: -5px 0 25px rgba(0,0,0,0.2);
            z-index: 10001;
            transition: left 0.3s ease;
            display: flex;
            flex-direction: column;
            direction: rtl;
        }
        
        .cart-sidebar.active {
            left: 0;
        }
        
        .cart-header {
            padding: 20px;
            background: linear-gradient(135deg, #D4AF37, #B8860B);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .cart-header h3 {
            margin: 0;
            font-size: 20px;
        }
        
        .close-cart {
            cursor: pointer;
            font-size: 24px;
            transition: transform 0.3s;
        }
        
        .close-cart:hover {
            transform: rotate(90deg);
        }
        
        .cart-items {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        
        .cart-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            margin-bottom: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border: 1px solid rgba(212,175,55,0.2);
            align-items: center;
        }
        
        .cart-item-image {
            width: 70px;
            height: 70px;
            border-radius: 10px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f0f0f0;
        }
        
        .cart-item-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .cart-item-details {
            flex: 1;
        }
        
        .cart-item-title {
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .cart-item-price {
            color: #D4AF37;
            font-size: 13px;
            margin-bottom: 8px;
        }
        
        .cart-item-quantity {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .quantity-btn {
            background: rgba(212,175,55,0.2);
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            color: #D4AF37;
        }
        
        .quantity-btn:hover {
            background: #D4AF37;
            color: white;
        }
        
        .btn-remove {
            background: rgba(248,113,113,0.2);
            color: #f87171;
        }
        
        .btn-remove:hover {
            background: #f87171;
            color: white;
        }
        
        .cart-item-total {
            font-weight: bold;
            color: #D4AF37;
            min-width: 80px;
            text-align: left;
        }
        
        .cart-footer {
            padding: 20px;
            border-top: 1px solid rgba(212,175,55,0.3);
            background: var(--bg-secondary, #f9f9f9);
        }
        
        .cart-total {
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            color: #D4AF37;
        }
        
        .checkout-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #D4AF37, #B8860B);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .checkout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(212,175,55,0.3);
        }
        
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
            flex-shrink: 0;
            background: #f0f0f0;
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
            .cart-sidebar {
                width: 100%;
                left: -100%;
            }
            
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
            
            .cart-item {
                flex-wrap: wrap;
            }
            
            .cart-item-total {
                width: 100%;
                text-align: left;
                padding-top: 5px;
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
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = CONFIG.shipping || 200;
        const total = subtotal + shipping;
        
        const itemsList = document.getElementById('checkoutItemsList');
        if (itemsList) {
            itemsList.innerHTML = this.items.map(item => {
                const productImage = item.image || CONFIG.defaultImage;
                
                return `
                    <div class="checkout-item">
                        <div class="checkout-item-image">
                            <img src="${productImage}" 
                                 alt="${item.name}" 
                                 onerror="this.src='${CONFIG.defaultImage}'; this.onerror=null;">
                        </div>
                        <div class="checkout-item-details">
                            <div class="checkout-item-name">${this.escapeHtml(item.name)}</div>
                            <div class="checkout-item-price">${item.price.toLocaleString()} دج × ${item.quantity}</div>
                        </div>
                        <div class="checkout-item-total">
                            ${(item.price * item.quantity).toLocaleString()} دج
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        const subtotalEl = document.getElementById('checkoutSubtotal');
        const shippingEl = document.getElementById('checkoutShipping');
        const totalEl = document.getElementById('checkoutTotal');
        
        if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} دج`;
        if (shippingEl) shippingEl.textContent = `${shipping.toLocaleString()} دج`;
        if (totalEl) totalEl.textContent = `${total.toLocaleString()} دج`;
        
        // محاولة تعبئة بيانات المستخدم إذا كان مسجلاً
        try {
            if (typeof Auth !== 'undefined' && Auth.currentUser) {
                const nameInput = document.getElementById('customerName');
                const phoneInput = document.getElementById('customerPhone');
                
                if (nameInput) nameInput.value = Auth.currentUser.name || '';
                if (phoneInput) phoneInput.value = Auth.currentUser.phone || '';
                
                document.getElementById('loginRequiredMsg').style.display = 'none';
                document.getElementById('customerFormFields').style.display = 'block';
            } else {
                document.getElementById('loginRequiredMsg').style.display = 'flex';
                document.getElementById('customerFormFields').style.display = 'none';
            }
        } catch(e) {
            document.getElementById('loginRequiredMsg').style.display = 'flex';
            document.getElementById('customerFormFields').style.display = 'none';
        }
    },
    
    // إتمام الطلب
    completeOrder() {
        // التحقق من تسجيل الدخول
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.currentUser);
        
        if (!isLoggedIn) {
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
            Utils.showNotification('رقم الهاتف غير صحيح (مثال: 05XXXXXXXX)', 'error');
            return;
        }
        
        // حساب المجاميع
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = CONFIG.shipping || 200;
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
        
        // فتح واتساب
        const phoneNumber = CONFIG.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
        
        // حفظ الطلب
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
    },
    
    // الحصول على عدد العناصر
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    // الحصول على المجموع الكلي
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },
    
    // تفريغ النص من HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // الحصول على الوقت المنقضي
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'الآن';
        if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
        return `${Math.floor(diff / 86400)} يوم`;
    }
};

// ===== تهيئة النظام =====
window.Cart = CartSystem;

// تهيئة السلة عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartSystem.init());
} else {
    CartSystem.init();
}

console.log('✅ نظام السلة المتكامل جاهز');
