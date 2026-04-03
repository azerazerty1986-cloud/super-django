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
    
    // ===== [3.4] تنظيف السلة =====
    cleanCart() {
        if (typeof products !== 'undefined' && products.length > 0) {
            this.cart = this.cart.filter(cartItem => {
                const productExists = products.some(p => p.id == cartItem.id);
                if (!productExists) return false;
                
                const product = products.find(p => p.id == cartItem.id);
                if (product && product.stock < cartItem.quantity) {
                    cartItem.quantity = product.stock;
                }
                return product && product.stock > 0;
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
                stock: product.stock,
                image: product.image || (product.images ? product.images[0] : null)
            });
        }
        
        this.saveCart();
        this.showNotification(`✅ تم إضافة ${product.name} إلى السلة`, 'success');
        
        // تأثير اهتزاز لأيقونة السلة
        const cartIcon = document.querySelector('.action-btn .fa-shopping-cart');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => { cartIcon.style.transform = ''; }, 300);
        }
        
        return true;
    },
    
    // ===== [3.7] إزالة منتج من السلة =====
    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.cart[index];
            this.cart.splice(index, 1);
            this.saveCart();
            this.showNotification(`❌ تم إزالة ${removed.name} من السلة`, 'info');
        }
    },
    
    // ===== [3.8] تحديث كمية منتج =====
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
        }
    },
    
    // ===== [3.9] حساب المجموع الفرعي =====
    calculateSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // ===== [3.10] حساب الخصم =====
    calculateDiscount() {
        if (!this.appliedCoupon) return 0;
        
        const subtotal = this.calculateSubtotal();
        const coupon = this.coupons[this.appliedCoupon];
        
        if (!coupon) return 0;
        
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
    
    // ===== [3.11] حساب الشحن =====
    calculateShipping() {
        const subtotal = this.calculateSubtotal();
        return subtotal >= 5000 ? 0 : 500;
    },
    
    // ===== [3.12] حساب المجموع الكلي =====
    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const discount = this.calculateDiscount();
        const shipping = this.calculateShipping();
        return subtotal - discount + shipping;
    },
    
    // ===== [3.13] تطبيق كوبون =====
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
    
    // ===== [3.14] إزالة الكوبون =====
    removeCoupon() {
        this.appliedCoupon = null;
        this.showNotification('تم إزالة الكوبون', 'info');
        this.updateCartUI();
    },
    
    // ===== [3.15] عرض السلة في الـ Sidebar =====
    displayCart() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-shopping-basket" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                    <p style="color: var(--text-secondary);">سلة التسوق فارغة</p>
                    <button class="btn-gold" onclick="toggleCart()" style="margin-top: 20px; padding: 10px 25px;">
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
            <div class="cart-items-list" style="flex: 1; overflow-y: auto; padding: 10px;">
                ${this.cart.map(item => `
                    <div class="cart-item" style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div class="cart-item-image" style="width: 60px; height: 60px; border-radius: 10px; overflow: hidden;">
                            <img src="${item.image || 'https://via.placeholder.com/60'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/60'">
                        </div>
                        <div class="cart-item-info" style="flex: 1;">
                            <div class="cart-item-name" style="font-weight: bold; margin-bottom: 4px;">${this.escapeHtml(item.name)}</div>
                            <div class="cart-item-price" style="color: var(--gold); font-size: 14px;">${item.price.toLocaleString()} دج</div>
                        </div>
                        <div class="cart-item-actions" style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div class="quantity-control" style="display: flex; gap: 8px; align-items: center;">
                                <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity - 1})" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--gold); background: transparent; color: var(--gold); cursor: pointer;">-</button>
                                <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                                <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity + 1})" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--gold); background: transparent; color: var(--gold); cursor: pointer;">+</button>
                            </div>
                            <button onclick="CartSystem.removeFromCart(${item.id})" style="background: none; border: none; color: #f87171; cursor: pointer;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary" style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                ${this.appliedCoupon ? `
                    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>الكوبون (${this.appliedCoupon})</span>
                        <span style="color: #4ade80;">-${discount.toLocaleString()} دج</span>
                        <button onclick="CartSystem.removeCoupon()" style="background: none; border: none; color: #f87171; cursor: pointer;">✕</button>
                    </div>
                ` : `
                    <div class="coupon-input" style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="text" id="couponCode" placeholder="كود الخصم" style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.3); background: var(--bg-secondary); color: white;">
                        <button onclick="CartSystem.applyCoupon(document.getElementById('couponCode').value)" style="padding: 8px 15px; border-radius: 8px; border: none; background: var(--gold); color: black; cursor: pointer;">تطبيق</button>
                    </div>
                `}
                
                <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>المجموع الفرعي</span>
                    <span>${subtotal.toLocaleString()} دج</span>
                </div>
                <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>الشحن</span>
                    <span>${shipping === 0 ? 'مجاني' : shipping.toLocaleString() + ' دج'}</span>
                </div>
                <div class="summary-row total" style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--gold); font-size: 18px; font-weight: bold; color: var(--gold);">
                    <span>المجموع الكلي</span>
                    <span>${total.toLocaleString()} دج</span>
                </div>
            </div>
        `;
        
        this.updateCartCounter();
    },
    
    // ===== [3.16] تحديث عداد السلة =====
    updateCartCounter() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCounter = document.getElementById('cartCounter');
        const fixedCartCounter = document.getElementById('fixedCartCounter');
        
        if (cartCounter) {
            cartCounter.textContent = totalItems;
            cartCounter.style.display = totalItems > 0 ? 'inline-flex' : 'none';
        }
        
        if (fixedCartCounter) {
            fixedCartCounter.textContent = totalItems;
            fixedCartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    },
    
    // ===== [3.17] تحديث واجهة السلة =====
    updateCartUI() {
        this.displayCart();
        this.updateCartCounter();
    },
    
    // ===== [3.18] فتح نافذة إتمام الطلب =====
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
        
        this.showNotification('جاري تجهيز الطلب...', 'info');
        
        // تجميع الطلبات حسب التاجر
        const merchantGroups = this.groupByMerchant();
        const total = this.calculateTotal();
        
        // إنشاء نافذة الدفع
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'checkoutModal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto; background: var(--bg-primary); border-radius: 20px; padding: 20px;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: var(--gold);"><i class="fas fa-shopping-cart"></i> إتمام الطلب</h2>
                    <button class="close-btn" onclick="closeModal('checkoutModal')" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-secondary);">&times;</button>
                </div>
                
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
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>المجموع الكلي</span>
                            <span style="font-size: 24px; color: var(--gold); font-weight: bold;">${total.toLocaleString()} دج</span>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label><i class="fas fa-map-marker-alt"></i> عنوان التوصيل</label>
                        <input type="text" class="form-control" id="shippingAddress" placeholder="أدخل عنوانك كاملاً" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,215,0,0.3); background: var(--bg-secondary); color: white;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label><i class="fas fa-sticky-note"></i> ملاحظات إضافية</label>
                        <textarea class="form-control" id="orderNote" rows="3" placeholder="أي ملاحظات للبائع..." style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,215,0,0.3); background: var(--bg-secondary); color: white;"></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label><i class="fas fa-credit-card"></i> طريقة الدفع</label>
                        <select class="form-control" id="paymentMethod" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,215,0,0.3); background: var(--bg-secondary); color: white;">
                            <option value="cash">الدفع عند الاستلام</option>
                            <option value="cih">تحويل CIH</option>
                            <option value="baridimob">بريدى موب</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button class="btn-gold" onclick="CartSystem.submitOrder()" style="flex: 1; padding: 12px; background: var(--gold); color: black; border: none; border-radius: 10px; cursor: pointer;">
                        <i class="fas fa-check-circle"></i> تأكيد الطلب
                    </button>
                    <button class="btn-outline-gold" onclick="closeModal('checkoutModal')" style="flex: 0.5; padding: 12px; background: transparent; border: 1px solid var(--gold); color: var(--gold); border-radius: 10px; cursor: pointer;">
                        إلغاء
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // ===== [3.19] تجميع المنتجات حسب التاجر =====
    groupByMerchant() {
        const groups = {};
        
        this.cart.forEach(item => {
            const merchant = item.merchantName;
            if (!groups[merchant]) {
                groups[merchant] = {
                    merchantName: merchant,
                    items: [],
                    subtotal: 0
                };
            }
            groups[merchant].items.push(item);
            groups[merchant].subtotal += item.price * item.quantity;
        });
        
        return Object.values(groups);
    },
    
    // ===== [3.20] تقديم الطلب =====
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
        
        // حفظ الطلب
        const order = {
            orderId: orderId,
            userId: currentUser?.id,
            userName: currentUser?.name,
            userPhone: currentUser?.phone,
            userAddress: address,
            customerNote: note,
            paymentMethod: paymentMethod,
            ordersByMerchant: merchantGroups,
            totalAmount: this.calculateTotal(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        this.saveOrder(order);
        
        // إرسال إشعار للمشتري (إذا كان تلغرام متاحاً)
        if (typeof TELEGRAM !== 'undefined') {
            await this.sendCustomerConfirmation(order, customerInfo);
        }
        
        // تنظيف السلة
        this.clearCart();
        this.updateCartUI();
        
        // إغلاق النافذة
        closeModal('checkoutModal');
        
        // عرض رسالة نجاح
        this.showNotification('🎉 تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً', 'success');
        
        // عرض نافذة تأكيد
        this.showOrderConfirmation(order);
    },
    
    // ===== [3.21] إرسال إشعار للمشتري =====
    async sendCustomerConfirmation(order, customerInfo) {
        const message = `
✅ *تم استلام طلبك بنجاح #${order.orderId}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customerInfo.name}
📍 *العنوان:* ${customerInfo.address}

📦 *ملخص الطلب:*
${order.ordersByMerchant.map(m => 
    `🏪 ${m.merchantName}: ${m.items.reduce((sum, i) => sum + i.quantity, 0)} منتج - ${m.subtotal.toLocaleString()} دج`
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
    
    // ===== [3.22] توليد معرف طلب فريد =====
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
    
    // ===== [3.23] حفظ الطلب =====
    saveOrder(order) {
        const savedOrders = localStorage.getItem(this.ordersKey);
        let orders = [];
        if (savedOrders) {
            try {
                orders = JSON.parse(savedOrders);
            } catch(e) {}
        }
        orders.unshift(order);
        
        if (orders.length > 100) orders = orders.slice(0, 100);
        
        localStorage.setItem(this.ordersKey, JSON.stringify(orders));
    },
    
    // ===== [3.24] عرض نافذة تأكيد الطلب =====
    showOrderConfirmation(order) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'orderConfirmationModal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10002; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center; background: var(--bg-primary); border-radius: 20px; padding: 30px;">
                <div class="modal-header" style="margin-bottom: 20px;">
                    <h2 style="color: #4ade80;"><i class="fas fa-check-circle"></i> تم استلام طلبك</h2>
                </div>
                <div style="padding: 20px;">
                    <i class="fas fa-receipt" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                    <h3>رقم الطلب: #${order.orderId}</h3>
                    <p style="margin: 15px 0;">تم إرسال طلبك إلى ${order.ordersByMerchant.length} تاجر</p>
                    <div style="background: rgba(255,215,0,0.1); border-radius: 10px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 5px 0;">📧 سيصلك إشعار عبر تلغرام</p>
                        <p style="margin: 5px 0;">📞 سيتم التواصل معك لتأكيد الطلب</p>
                    </div>
                    <button class="btn-gold" onclick="closeModal('orderConfirmationModal')" style="padding: 10px 25px; background: var(--gold); color: black; border: none; border-radius: 10px; cursor: pointer;">
                        <i class="fas fa-check"></i> حسناً
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            if (document.getElementById('orderConfirmationModal')) {
                modal.remove();
            }
        }, 5000);
    },
    
    // ===== [3.25] تفريغ السلة =====
    clearCart() {
        this.cart = [];
        this.appliedCoupon = null;
        this.saveCart();
    },
    
    // ===== [3.26] إعداد مستمعي الأحداث =====
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('cartSidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !e.target.closest('.action-btn') && !e.target.closest('.fixed-cart')) {
                    this.closeCart();
                }
            }
        });
    },
    
    // ===== [3.27] فتح السلة =====
    openCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            this.displayCart();
        }
    },
    
    // ===== [3.28] إغلاق السلة =====
    closeCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    },
    
    // ===== [3.29] تبديل حالة السلة =====
    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
            if (sidebar.classList.contains('active')) {
                this.displayCart();
            }
        }
    },
    
    // ===== [3.30] عرض إشعار =====
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
                color: black;
                padding: 10px 20px;
                border-radius: 50px;
                z-index: 2000;
                font-weight: bold;
                white-space: nowrap;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    },
    
    // ===== [3.31] تنصيص النص =====
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== [3.32] دوال مساعدة للاستخدام العام =====
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

// ===== [3.33] تهيئة السلة =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CartSystem.init();
    });
} else {
    CartSystem.init();
}

// ===== [3.34] تصدير الدوال =====
window.CartSystem = CartSystem;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.updateCartUI = updateCartUI;

console.log('✅ نظام السلة المتطور جاهز');
