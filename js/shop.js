
/* ================================================================== */
/* ===== [03] ملف: shop.js - نظام السلة المتكامل ===== */
/* ================================================================== */

// ===== [3.1] نظام السلة المتقدم =====
const CartSystem = {
    // السلة الرئيسية
    cart: [],
    
    // مفتاح التخزين المحلي
    storageKey: 'nardoo_cart',
    
    // مفتاح الطلبات
    ordersKey: 'nardoo_orders',
    
    // كوبونات الخصم
    coupons: {
        'WELCOME10': { discount: 10, type: 'percent', maxDiscount: 500 },
        'NARDOO20': { discount: 20, type: 'percent', maxDiscount: 1000 },
        'VIP50': { discount: 500, type: 'fixed', minAmount: 2000 }
    },
    
    // الكوبون المطبق حالياً
    appliedCoupon: null,
    
    // ===== [3.2] تهيئة السلة =====
    init() {
        this.loadCart();
        this.updateCartUI();
        this.setupEventListeners();
        console.log('🛒 نظام السلة جاهز');
    },
    
    // ===== [3.3] تحميل السلة =====
    loadCart() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                this.cart = JSON.parse(saved);
                this.cleanCart();
            } catch(e) {
                this.cart = [];
            }
        } else {
            this.cart = [];
        }
        this.saveCart();
    },
    
    // ===== [3.4] تنظيف السلة (إزالة المنتجات غير المتوفرة) =====
    cleanCart() {
        if (typeof products !== 'undefined' && products.length > 0) {
            this.cart = this.cart.filter(cartItem => {
                const productExists = products.some(p => p.id == cartItem.id);
                if (!productExists) return false;
                
                const product = products.find(p => p.id == cartItem.id);
                if (product.stock < cartItem.quantity) {
                    cartItem.quantity = product.stock;
                }
                return product.stock > 0;
            });
            this.saveCart();
        }
    },
    
    // ===== [3.5] حفظ السلة =====
    saveCart() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
        this.updateCartUI();
    },
    
    // ===== [3.6] إضافة منتج إلى السلة =====
    addToCart(productId, quantity = 1) {
        if (typeof products === 'undefined') {
            this.showNotification('المنتجات غير متوفرة حالياً', 'error');
            return false;
        }
        
        const product = products.find(p => p.id == productId);
        if (!product) {
            this.showNotification('المنتج غير موجود', 'error');
            return false;
        }
        
        if (product.stock <= 0) {
            this.showNotification('المنتج غير متوفر حالياً', 'error');
            return false;
        }
        
        const existingItem = this.cart.find(item => item.id == productId);
        
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                this.showNotification(`الكمية المطلوبة غير متوفرة. المتوفر: ${product.stock}`, 'warning');
                return false;
            }
            existingItem.quantity = newQuantity;
        } else {
            if (quantity > product.stock) {
                this.showNotification(`الكمية المطلوبة غير متوفرة. المتوفر: ${product.stock}`, 'warning');
                return false;
            }
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                merchantName: product.merchantName,
                merchantId: product.merchantId || this.getMerchantIdByName(product.merchantName),
                stock: product.stock,
                image: product.image || product.images?.[0],
                category: product.category
            });
        }
        
        this.saveCart();
        this.showNotification(`✅ تم إضافة ${product.name} إلى السلة`, 'success');
        this.updateCartUI();
        
        // تأثير اهتزاز لأيقونة السلة
        const cartIcon = document.querySelector('.fixed-cart, .action-btn .fa-shopping-cart');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => { cartIcon.style.transform = ''; }, 300);
        }
        
        return true;
    },
    
    // ===== [3.7] الحصول على معرف التاجر من الاسم =====
    getMerchantIdByName(merchantName) {
        if (typeof users !== 'undefined') {
            const merchant = users.find(u => 
                u.storeName === merchantName || 
                u.name === merchantName
            );
            return merchant ? merchant.id : null;
        }
        return null;
    },
    
    // ===== [3.8] إزالة منتج من السلة =====
    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.cart[index];
            this.cart.splice(index, 1);
            this.saveCart();
            this.showNotification(`❌ تم إزالة ${removed.name} من السلة`, 'info');
            this.updateCartUI();
        }
    },
    
    // ===== [3.9] تحديث كمية منتج =====
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id == productId);
        if (!item) return;
        
        if (typeof products !== 'undefined') {
            const product = products.find(p => p.id == productId);
            if (product && quantity > product.stock) {
                this.showNotification(`الكمية المطلوبة غير متوفرة. المتوفر: ${product.stock}`, 'warning');
                quantity = product.stock;
            }
        }
        
        if (quantity <= 0) {
            this.removeFromCart(productId);
        } else {
            item.quantity = quantity;
            this.saveCart();
            this.updateCartUI();
        }
    },
    
    // ===== [3.10] حساب المجموع الفرعي =====
    calculateSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // ===== [3.11] حساب الخصم =====
    calculateDiscount() {
        if (!this.appliedCoupon) return 0;
        
        const subtotal = this.calculateSubtotal();
        const coupon = this.coupons[this.appliedCoupon];
        
        if (!coupon) return 0;
        
        // التحقق من الحد الأدنى
        if (coupon.minAmount && subtotal < coupon.minAmount) {
            this.appliedCoupon = null;
            this.showNotification(`الكوبون يتطلب حد أدنى ${coupon.minAmount} دج`, 'warning');
            return 0;
        }
        
        let discount = 0;
        if (coupon.type === 'percent') {
            discount = (subtotal * coupon.discount) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else if (coupon.type === 'fixed') {
            discount = Math.min(coupon.discount, subtotal);
        }
        
        return discount;
    },
    
    // ===== [3.12] حساب الشحن =====
    calculateShipping() {
        const subtotal = this.calculateSubtotal();
        // شحن مجاني للطلبات فوق 5000 دج
        return subtotal >= 5000 ? 0 : 500;
    },
    
    // ===== [3.13] حساب المجموع الكلي =====
    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const discount = this.calculateDiscount();
        const shipping = this.calculateShipping();
        return subtotal - discount + shipping;
    },
    
    // ===== [3.14] تطبيق كوبون =====
    applyCoupon(code) {
        const coupon = this.coupons[code.toUpperCase()];
        if (!coupon) {
            this.showNotification('❌ كوبون غير صالح', 'error');
            return false;
        }
        
        const subtotal = this.calculateSubtotal();
        if (coupon.minAmount && subtotal < coupon.minAmount) {
            this.showNotification(`الكوبون يتطلب حد أدنى ${coupon.minAmount} دج`, 'warning');
            return false;
        }
        
        this.appliedCoupon = code.toUpperCase();
        this.showNotification(`✅ تم تطبيق الكوبون بنجاح`, 'success');
        this.updateCartUI();
        return true;
    },
    
    // ===== [3.15] إزالة الكوبون =====
    removeCoupon() {
        this.appliedCoupon = null;
        this.showNotification('تم إزالة الكوبون', 'info');
        this.updateCartUI();
    },
    
    // ===== [3.16] تجميع المنتجات حسب التاجر =====
    groupByMerchant() {
        const groups = {};
        
        this.cart.forEach(item => {
            const merchant = item.merchantName;
            if (!groups[merchant]) {
                groups[merchant] = {
                    merchantName: merchant,
                    merchantId: item.merchantId,
                    items: [],
                    subtotal: 0
                };
            }
            groups[merchant].items.push(item);
            groups[merchant].subtotal += item.price * item.quantity;
        });
        
        return Object.values(groups);
    },
    
    // ===== [3.17] عرض السلة في الـ Sidebar =====
    displayCart() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                    <p>سلة التسوق فارغة</p>
                    <button class="btn-gold" onclick="toggleCart()" style="margin-top: 20px;">
                        <i class="fas fa-store"></i> تسوق الآن
                    </button>
                </div>
            `;
            return;
        }
        
        const subtotal = this.calculateSubtotal();
        const discount = this.calculateDiscount();
        const shipping = this.calculateShipping();
        const total = this.calculateTotal();
        
        container.innerHTML = `
            <div class="cart-items-list">
                ${this.cart.map(item => `
                    <div class="cart-item" data-id="${item.id}">
                        <div class="cart-item-image">
                            <img src="${item.image || 'https://via.placeholder.com/60'}" onerror="this.src='https://via.placeholder.com/60'">
                        </div>
                        <div class="cart-item-info">
                            <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                            <div class="cart-item-merchant">
                                <i class="fas fa-store"></i> ${this.escapeHtml(item.merchantName)}
                            </div>
                            <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="quantity-control">
                                <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                                <span>${item.quantity}</span>
                                <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                            <button class="remove-item" onclick="CartSystem.removeFromCart(${item.id})">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                ${this.appliedCoupon ? `
                    <div class="summary-row">
                        <span>الكوبون (${this.appliedCoupon})</span>
                        <span style="color: #4ade80;">-${discount.toLocaleString()} دج</span>
                        <button onclick="CartSystem.removeCoupon()" class="remove-coupon-btn">✕</button>
                    </div>
                ` : `
                    <div class="coupon-input">
                        <input type="text" id="couponCode" placeholder="كود الخصم">
                        <button onclick="CartSystem.applyCoupon(document.getElementById('couponCode').value)">تطبيق</button>
                    </div>
                `}
                
                <div class="summary-row">
                    <span>المجموع الفرعي</span>
                    <span>${subtotal.toLocaleString()} دج</span>
                </div>
                <div class="summary-row">
                    <span>الشحن</span>
                    <span>${shipping === 0 ? 'مجاني' : shipping.toLocaleString() + ' دج'}</span>
                </div>
                <div class="summary-row total">
                    <span>المجموع الكلي</span>
                    <span>${total.toLocaleString()} دج</span>
                </div>
            </div>
        `;
        
        this.updateCartCounter();
    },
    
    // ===== [3.18] تحديث عداد السلة =====
    updateCartCounter() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCounter = document.getElementById('cartCounter');
        const fixedCartCounter = document.getElementById('fixedCartCounter');
        
        if (cartCounter) {
            cartCounter.textContent = totalItems;
            cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        if (fixedCartCounter) {
            fixedCartCounter.textContent = totalItems;
            fixedCartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    },
    
    // ===== [3.19] تحديث واجهة السلة =====
    updateCartUI() {
        this.displayCart();
        this.updateCartCounter();
    },
    
    // ===== [3.20] فتح نافذة إتمام الطلب =====
    openCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('السلة فارغة! أضف منتجات أولاً', 'warning');
            return;
        }
        
        if (typeof currentUser === 'undefined' || !currentUser) {
            this.showNotification('يرجى تسجيل الدخول أولاً', 'warning');
            if (typeof openLoginModal === 'function') {
                openLoginModal();
            }
            return;
        }
        
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            this.populateCheckoutModal();
            modal.style.display = 'flex';
        } else {
            this.createCheckoutModal();
        }
    },
    
    // ===== [3.21] تعبئة نافذة الدفع =====
    populateCheckoutModal() {
        const container = document.getElementById('checkoutContent');
        if (!container) return;
        
        const merchantGroups = this.groupByMerchant();
        const total = this.calculateTotal();
        
        container.innerHTML = `
            <div style="max-height: 60vh; overflow-y: auto; padding: 10px;">
                <h3 style="color: var(--gold); margin-bottom: 20px;">📦 ملخص الطلب</h3>
                
                ${merchantGroups.map(group => `
                    <div style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 15px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,215,0,0.3); padding-bottom: 10px;">
                            <i class="fas fa-store" style="color: var(--gold);"></i>
                            <h4 style="color: var(--gold); margin: 0;">${this.escapeHtml(group.merchantName)}</h4>
                        </div>
                        ${group.items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span>${this.escapeHtml(item.name)} × ${item.quantity}</span>
                                <span style="color: var(--gold);">${(item.price * item.quantity).toLocaleString()} دج</span>
                            </div>
                        `).join('')}
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                            <strong>مجموع ${this.escapeHtml(group.merchantName)}</strong>
                            <strong style="color: var(--gold);">${group.subtotal.toLocaleString()} دج</strong>
                        </div>
                    </div>
                `).join('')}
                
                <div style="background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05)); border-radius: 15px; padding: 15px; margin: 20px 0;">
                    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>المجموع الكلي</span>
                        <span style="font-size: 24px; color: var(--gold); font-weight: bold;">${total.toLocaleString()} دج</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-map-marker-alt"></i> عنوان التوصيل</label>
                    <input type="text" class="form-control" id="shippingAddress" placeholder="أدخل عنوانك كاملاً" value="${currentUser?.address || ''}">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> ملاحظات إضافية</label>
                    <textarea class="form-control" id="orderNote" rows="3" placeholder="أي ملاحظات للبائع..."></textarea>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-credit-card"></i> طريقة الدفع</label>
                    <select class="form-control" id="paymentMethod">
                        <option value="cash">الدفع عند الاستلام</option>
                        <option value="cih">تحويل CIH</option>
                        <option value="baridimob">بريدى موب</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button class="btn-gold" onclick="CartSystem.submitOrder()" style="flex: 1;">
                    <i class="fas fa-check-circle"></i> تأكيد الطلب
                </button>
                <button class="btn-outline-gold" onclick="closeModal('checkoutModal')" style="flex: 0.5;">
                    إلغاء
                </button>
            </div>
        `;
    },
    
    // ===== [3.22] إنشاء نافذة الدفع إذا لم تكن موجودة =====
    createCheckoutModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'checkoutModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-shopping-cart"></i> إتمام الطلب</h2>
                    <button class="close-btn" onclick="closeModal('checkoutModal')">&times;</button>
                </div>
                <div id="checkoutContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
        this.populateCheckoutModal();
        modal.style.display = 'flex';
    },
    
    // ===== [3.23] تقديم الطلب =====
    async submitOrder() {
        if (this.cart.length === 0) {
            this.showNotification('السلة فارغة', 'error');
            return;
        }
        
        const address = document.getElementById('shippingAddress')?.value || '';
        const note = document.getElementById('orderNote')?.value || '';
        const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';
        
        if (!address) {
            this.showNotification('يرجى إدخال عنوان التوصيل', 'warning');
            return;
        }
        
        this.showNotification('جاري معالجة الطلب...', 'info');
        
        // تجميع الطلبات حسب التاجر
        const merchantGroups = this.groupByMerchant();
        const orderId = this.generateOrderId();
        const customerInfo = {
            name: currentUser?.name || 'عميل',
            phone: currentUser?.phone || '',
            address: address,
            note: note,
            paymentMethod: paymentMethod
        };
        
        const ordersByMerchant = [];
        let allSuccess = true;
        
        // إرسال طلب لكل تاجر على حدة
        for (const group of merchantGroups) {
            const result = await this.sendMerchantOrderToTelegram(group, customerInfo, orderId);
            ordersByMerchant.push({
                merchantName: group.merchantName,
                merchantId: group.merchantId,
                items: group.items,
                total: group.subtotal,
                telegramSent: result.success,
                telegramMessageId: result.messageId
            });
            if (!result.success) allSuccess = false;
        }
        
        // حفظ الطلب
        const order = {
            orderId: orderId,
            userId: currentUser?.id,
            userName: currentUser?.name,
            userPhone: currentUser?.phone,
            userAddress: address,
            customerNote: note,
            paymentMethod: paymentMethod,
            ordersByMerchant: ordersByMerchant,
            totalAmount: this.calculateTotal(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        this.saveOrder(order);
        
        // إرسال إشعار للمشتري
        await this.sendCustomerConfirmation(order, customerInfo);
        
        // تنظيف السلة
        this.clearCart();
        this.updateCartUI();
        
        // إغلاق النافذة
        closeModal('checkoutModal');
        
        // عرض رسالة نجاح
        if (allSuccess) {
            this.showNotification('🎉 تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً', 'success');
        } else {
            this.showNotification('⚠️ تم إرسال الطلب جزئياً، يرجى متابعة حالة طلبك', 'warning');
        }
        
        // عرض نافذة تأكيد
        this.showOrderConfirmation(order);
    },
    
    // ===== [3.24] إرسال طلب تاجر إلى تلغرام =====
    async sendMerchantOrderToTelegram(merchantGroup, customerInfo, orderId) {
        if (typeof TELEGRAM === 'undefined') {
            console.warn('⚠️ تلغرام غير متوفر');
            return { success: false, messageId: null };
        }
        
        const message = this.formatOrderMessage(merchantGroup, customerInfo, orderId);
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ تم إرسال طلب إلى التاجر ${merchantGroup.merchantName}`);
                return { success: true, messageId: data.result.message_id };
            } else {
                console.error('❌ فشل الإرسال:', data);
                return { success: false, messageId: null };
            }
        } catch (error) {
            console.error('❌ خطأ في الإرسال:', error);
            return { success: false, messageId: null };
        }
    },
    
    // ===== [3.25] تنسيق رسالة الطلب =====
    formatOrderMessage(merchantGroup, customerInfo, orderId) {
        const itemsList = merchantGroup.items.map((item, index) => {
            return `${index + 1}. *${this.escapeMarkdown(item.name)}* × ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} دج`;
        }).join('\n');
        
        const paymentMethodText = {
            'cash': 'الدفع عند الاستلام',
            'cih': 'تحويل CIH',
            'baridimob': 'بريدى موب'
        }[customerInfo.paymentMethod] || 'الدفع عند الاستلام';
        
        return `
🛒 *طلب جديد #${orderId}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${this.escapeMarkdown(customerInfo.name)}
📞 *الهاتف:* ${customerInfo.phone || 'غير محدد'}
📍 *العنوان:* ${this.escapeMarkdown(customerInfo.address)}
💳 *الدفع:* ${paymentMethodText}

📦 *المنتجات المطلوبة:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
💰 *المجموع:* ${merchantGroup.subtotal.toLocaleString()} دج

📝 *ملاحظات:* ${customerInfo.note || 'لا توجد ملاحظات'}
━━━━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ar-EG')}

✅ يرجى تأكيد الطلب
        `;
    },
    
    // ===== [3.26] إرسال إشعار للمشتري =====
    async sendCustomerConfirmation(order, customerInfo) {
        if (typeof TELEGRAM === 'undefined') return;
        
        const message = `
✅ *تم استلام طلبك بنجاح #${order.orderId}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customerInfo.name}
📍 *العنوان:* ${customerInfo.address}

📦 *ملخص الطلب:*
${order.ordersByMerchant.map(m => 
    `🏪 ${m.merchantName}: ${m.items.reduce((sum, i) => sum + i.quantity, 0)} منتج - ${m.total.toLocaleString()} دج`
).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💰 *الإجمالي:* ${order.totalAmount.toLocaleString()} دج

📞 *سيتم التواصل معك قريباً لتأكيد الطلب*
🕐 ${new Date().toLocaleString('ar-EG')}

شكراً لتسوقك مع ناردو برو 🌟
        `;
        
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        } catch(e) {
            console.error('فشل إرسال إشعار للمشتري:', e);
        }
    },
    
    // ===== [3.27] توليد معرف طلب فريد =====
    generateOrderId() {
        const date = new Date();
        const timestamp = date.getFullYear().toString().slice(-2) +
                         (date.getMonth() + 1).toString().padStart(2, '0') +
                         date.getDate().toString().padStart(2, '0') +
                         date.getHours().toString().padStart(2, '0') +
                         date.getMinutes().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD${timestamp}${random}`;
    },
    
    // ===== [3.28] حفظ الطلب =====
    saveOrder(order) {
        const savedOrders = localStorage.getItem(this.ordersKey);
        let orders = [];
        if (savedOrders) {
            try {
                orders = JSON.parse(savedOrders);
            } catch(e) {}
        }
        orders.unshift(order);
        
        // الاحتفاظ بآخر 100 طلب فقط
        if (orders.length > 100) orders = orders.slice(0, 100);
        
        localStorage.setItem(this.ordersKey, JSON.stringify(orders));
    },
    
    // ===== [3.29] الحصول على طلبات المستخدم =====
    getUserOrders() {
        const savedOrders = localStorage.getItem(this.ordersKey);
        if (!savedOrders) return [];
        
        try {
            const orders = JSON.parse(savedOrders);
            if (currentUser) {
                return orders.filter(o => o.userId === currentUser.id);
            }
            return [];
        } catch(e) {
            return [];
        }
    },
    
    // ===== [3.30] عرض طلبات المستخدم =====
    displayUserOrders() {
        const orders = this.getUserOrders();
        const container = document.getElementById('userOrdersContainer');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 60px; color: var(--gold);"></i>
                    <p>لا توجد طلبات سابقة</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <span style="color: var(--gold); font-weight: bold;">#${order.orderId}</span>
                        <span style="font-size: 12px; color: #888; margin-right: 10px;">${new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                    <span style="background: ${this.getStatusColor(order.status)}; padding: 5px 10px; border-radius: 20px; font-size: 12px;">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div>
                    ${order.ordersByMerchant.map(m => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                            <span>🏪 ${m.merchantName}</span>
                            <span>${m.items.reduce((s, i) => s + i.quantity, 0)} منتج</span>
                            <span style="color: var(--gold);">${m.total.toLocaleString()} دج</span>
                        </div>
                    `).join('')}
                </div>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 10px; padding-top: 10px; text-align: left;">
                    <strong>الإجمالي: ${order.totalAmount.toLocaleString()} دج</strong>
                </div>
            </div>
        `).join('');
    },
    
    // ===== [3.31] الحصول على لون الحالة =====
    getStatusColor(status) {
        const colors = {
            'pending': '#fbbf24',
            'confirmed': '#4ade80',
            'shipped': '#60a5fa',
            'delivered': '#10b981',
            'cancelled': '#ef4444'
        };
        return colors[status] || '#888';
    },
    
    // ===== [3.32] الحصول على نص الحالة =====
    getStatusText(status) {
        const texts = {
            'pending': 'قيد المعالجة',
            'confirmed': 'تم التأكيد',
            'shipped': 'تم الشحن',
            'delivered': 'تم التوصيل',
            'cancelled': 'ملغي'
        };
        return texts[status] || status;
    },
    
    // ===== [3.33] عرض نافذة تأكيد الطلب =====
    showOrderConfirmation(order) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'orderConfirmationModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center;">
                <div class="modal-header">
                    <h2><i class="fas fa-check-circle" style="color: #4ade80;"></i> تم استلام طلبك</h2>
                    <button class="close-btn" onclick="closeModal('orderConfirmationModal')">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <i class="fas fa-receipt" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                    <h3>رقم الطلب: #${order.orderId}</h3>
                    <p style="margin: 15px 0;">تم إرسال طلبك إلى ${order.ordersByMerchant.length} تاجر</p>
                    <div style="background: rgba(255,215,0,0.1); border-radius: 10px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 5px 0;">📧 سيصلك إشعار عبر تلغرام</p>
                        <p style="margin: 5px 0;">📞 سيتم التواصل معك لتأكيد الطلب</p>
                    </div>
                    <button class="btn-gold" onclick="closeModal('orderConfirmationModal'); CartSystem.displayUserOrders();">
                        <i class="fas fa-list"></i> تتبع طلبي
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        setTimeout(() => {
            if (document.getElementById('orderConfirmationModal')) {
                closeModal('orderConfirmationModal');
            }
        }, 5000);
    },
    
    // ===== [3.34] تفريغ السلة =====
    clearCart() {
        this.cart = [];
        this.appliedCoupon = null;
        this.saveCart();
        this.updateCartUI();
    },
    
    // ===== [3.35] إعداد مستمعي الأحداث =====
    setupEventListeners() {
        // إغلاق السلة عند الضغط خارجها
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('cartSidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !e.target.closest('.action-btn') && !e.target.closest('.fixed-cart')) {
                    this.closeCart();
                }
            }
        });
    },
    
    // ===== [3.36] فتح السلة =====
    openCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            this.displayCart();
        }
    },
    
    // ===== [3.37] إغلاق السلة =====
    closeCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    },
    
    // ===== [3.38] تبديل حالة السلة =====
    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
            if (sidebar.classList.contains('active')) {
                this.displayCart();
            }
        }
    },
    
    // ===== [3.39] عرض إشعار =====
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
            alert(message);
        }
    },
    
    // ===== [3.40] تنصيص النص لمنع XSS =====
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ===== [3.41] تنصيص للنص Markdown =====
    escapeMarkdown(text) {
        if (!text) return '';
        return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
    }
};

// ===== [3.42] دوال مساعدة للاستخدام العام =====
function addToCart(productId, quantity = 1) {
    return CartSystem.addToCart(productId, quantity);
}

function toggleCart() {
    CartSystem.toggleCart();
}

function openCart() {
    CartSystem.openCart();
}

function closeCart() {
    CartSystem.closeCart();
}

function updateCartUI() {
    CartSystem.updateCartUI();
}

// ===== [3.43] تهيئة السلة عند تحميل الصفحة =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CartSystem.init();
    });
} else {
    CartSystem.init();
}

// ===== [3.44] تصدير الدوال إلى النطاق العام =====
window.CartSystem = CartSystem;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.updateCartUI = updateCartUI;

console.log('✅ نظام السلة المتطور جاهز - يدعم تقسيم الطلبات حسب التاجر');
