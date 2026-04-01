/* ================================================================== */
/* ===== [03] shop.js - نظام السلة المتكامل (نسخة كاملة) ===== */
/* ===== مع زر إضافة للسلة على المنتجات ===== */
/* ================================================================== */

// ===== التأكد من وجود CONFIG =====
if (typeof CONFIG === 'undefined') {
    window.CONFIG = {
        currency: 'دج',
        shipping: 800,
        phone: '2135622448',
        defaultImage: 'https://via.placeholder.com/300x300?text=No+Image'
    };
}

// ===== نظام السلة المتكامل =====
const CartSystem = {
    items: [],
    
    // ===== التهيئة =====
    init() {
        this.items = this.loadCart();
        this.updateCounter();
        this.createCartSidebar();
        this.createCheckoutModal();
        this.addCartStyles();
        this.setupEventListeners();
        this.addCartButtonToNav();
        console.log('✅ نظام السلة جاهز مع زر إضافة للسلة');
    },
    
    // ===== تحميل السلة =====
    loadCart() {
        const saved = localStorage.getItem('nardoo_cart');
        return saved ? JSON.parse(saved) : [];
    },
    
    // ===== حفظ السلة =====
    saveCart() {
        localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
        this.updateCounter();
        this.updateCartDisplay();
    },
    
    // ===== إضافة زر السلة في القائمة العلوية =====
    addCartButtonToNav() {
        let navMenu = document.getElementById('mainNav');
        
        if (!navMenu) {
            setTimeout(() => this.addCartButtonToNav(), 500);
            return;
        }
        
        if (document.getElementById('cartNavBtn')) return;
        
        const cartBtn = document.createElement('a');
        cartBtn.className = 'nav-link';
        cartBtn.id = 'cartNavBtn';
        cartBtn.setAttribute('onclick', 'CartSystem.showCartSidebar()');
        cartBtn.setAttribute('href', 'javascript:void(0)');
        cartBtn.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <span>السلة</span>
            <span id="cartCounter" class="cart-badge" style="
                background: var(--gold, #D4AF37);
                color: black;
                border-radius: 50%;
                padding: 2px 8px;
                font-size: 12px;
                margin-right: 5px;
                display: inline-block;
            ">0</span>
        `;
        
        navMenu.appendChild(cartBtn);
        this.updateCounter();
    },
    
    // ===== إضافة منتج للسلة (متوافق مع بيانات المنتج من تلغرام) =====
    add(product) {
        if (!product) {
            this.showNotification('المنتج غير موجود', 'error');
            return false;
        }
        
        if (product.stock <= 0) {
            this.showNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const productId = product.id || product.productId;
        const existing = this.items.find(i => i.productId === productId);
        
        if (existing) {
            if (existing.quantity < (product.stock || 999)) {
                existing.quantity++;
                this.showNotification(`✓ تم زيادة كمية ${product.name}`, 'success');
            } else {
                this.showNotification('الكمية غير متوفرة', 'warning');
                return false;
            }
        } else {
            this.items.push({
                productId: productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantId: product.merchantName || product.merchantId || 'ناردو برو',
                merchantName: product.merchantName || 'ناردو برو',
                merchantPhone: product.merchantPhone || null,
                image: product.image || (product.images && product.images[0]) || CONFIG.defaultImage,
                stock: product.stock || 999
            });
            this.showNotification(`✓ تم إضافة ${product.name} للسلة`, 'success');
        }
        
        this.saveCart();
        this.showCartSidebar();
        return true;
    },
    
    // ===== دالة مساعدة لإضافة منتج من نظام المنتجات الرئيسي =====
    addProduct(productData) {
        if (!productData) {
            this.showNotification('بيانات المنتج غير صحيحة', 'error');
            return false;
        }
        
        const cartProduct = {
            id: productData.id || productData.productId,
            name: productData.name,
            price: productData.price,
            stock: productData.stock,
            merchantName: productData.merchantName || productData.merchant,
            image: productData.image || (productData.images && productData.images[0]) || CONFIG.defaultImage
        };
        
        return this.add(cartProduct);
    },
    
    // ===== تحديث الكمية =====
    update(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.remove(productId);
            return;
        }
        
        const item = this.items.find(i => i.productId === productId);
        if (item && newQuantity <= (item.stock || 999)) {
            item.quantity = newQuantity;
            this.saveCart();
        } else {
            this.showNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // ===== حذف منتج =====
    remove(productId) {
        const item = this.items.find(i => i.productId === productId);
        if (item) {
            this.items = this.items.filter(i => i.productId !== productId);
            this.saveCart();
            this.showNotification(`✓ تم حذف ${item.name} من السلة`, 'info');
        }
    },
    
    // ===== تحديث العداد =====
    updateCounter() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        
        const cartCounter = document.getElementById('cartCounter');
        if (cartCounter) cartCounter.textContent = count;
        
        const sidebarCount = document.getElementById('cartSidebarCount');
        if (sidebarCount) sidebarCount.textContent = count;
        
        const footer = document.getElementById('cartFooter');
        if (footer) footer.style.display = count > 0 ? 'block' : 'none';
    },
    
    // ===== تجميع المنتجات حسب التاجر =====
    groupItemsByMerchant() {
        const groups = {};
        this.items.forEach(item => {
            const merchantId = item.merchantId || item.merchantName;
            const merchantName = item.merchantName || 'ناردو برو';
            
            if (!groups[merchantId]) {
                groups[merchantId] = {
                    merchantId: merchantId,
                    merchantName: merchantName,
                    merchantPhone: item.merchantPhone || null,
                    items: [],
                    subtotal: 0
                };
            }
            groups[merchantId].items.push(item);
            groups[merchantId].subtotal += item.price * item.quantity;
        });
        return groups;
    },
    
    // ===== عرض السلة مع تجميع حسب التجار =====
    updateCartDisplay() {
        const container = document.getElementById('cartItemsContainer');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h4>سلة فارغة</h4>
                    <p>أضف بعض المنتجات إلى سلتك</p>
                    <button class="btn-continue" onclick="CartSystem.closeCartSidebar()">مواصلة التسوق</button>
                </div>
            `;
            return;
        }
        
        const merchantGroups = this.groupItemsByMerchant();
        let subtotal = 0;
        
        let groupsHTML = '';
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            groupsHTML += `
                <div class="merchant-group">
                    <div class="merchant-header">
                        <i class="fas fa-store"></i>
                        <span>${this.escapeHtml(group.merchantName)}</span>
                        <span class="merchant-total">${group.subtotal.toLocaleString()} دج</span>
                    </div>
                    <div class="merchant-items">
            `;
            
            group.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                
                groupsHTML += `
                    <div class="cart-item">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='${CONFIG.defaultImage}'">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                            <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="quantity-control">
                                <button onclick="CartSystem.update(${item.productId}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="CartSystem.update(${item.productId}, ${item.quantity + 1})">+</button>
                            </div>
                            <div class="cart-item-total">${itemTotal.toLocaleString()} دج</div>
                            <button class="remove-btn" onclick="CartSystem.remove(${item.productId})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            groupsHTML += `
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = groupsHTML;
        
        const shipping = CONFIG.shipping || 800;
        const total = subtotal + shipping;
        
        const subtotalEl = document.getElementById('cartSubtotal');
        const shippingEl = document.getElementById('cartShipping');
        const totalEl = document.getElementById('cartTotalAmount');
        
        if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} دج`;
        if (shippingEl) shippingEl.textContent = `${shipping.toLocaleString()} دج`;
        if (totalEl) totalEl.textContent = `${total.toLocaleString()} دج`;
    },
    
    // ===== إنشاء السلة الجانبية =====
    createCartSidebar() {
        if (document.getElementById('cartSidebar')) return;
        
        const html = `
        <div id="cartSidebar" class="cart-sidebar">
            <div class="cart-header">
                <h3><i class="fas fa-shopping-bag"></i> سلة التسوق <span id="cartSidebarCount">0</span></h3>
                <button class="close-cart" onclick="CartSystem.closeCartSidebar()">&times;</button>
            </div>
            <div class="cart-content">
                <div id="cartItemsContainer"></div>
            </div>
            <div class="cart-footer" id="cartFooter" style="display: none;">
                <div class="cart-summary">
                    <div><span>المجموع الفرعي:</span><span id="cartSubtotal">0 دج</span></div>
                    <div><span>رسوم التوصيل:</span><span id="cartShipping">${CONFIG.shipping} دج</span></div>
                    <div class="total"><span>الإجمالي:</span><span id="cartTotalAmount">0 دج</span></div>
                </div>
                <button class="checkout-btn" onclick="CartSystem.openCheckout()">
                    <i class="fas fa-credit-card"></i> إتمام الطلب
                </button>
            </div>
        </div>
        <div id="cartOverlay" class="cart-overlay" onclick="CartSystem.closeCartSidebar()"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    // ===== إنشاء نافذة إتمام الطلب =====
    createCheckoutModal() {
        if (document.getElementById('checkoutModal')) return;
        
        const modalHTML = `
        <div id="checkoutModal" class="checkout-modal" style="display: none;">
            <div class="checkout-overlay" onclick="CartSystem.closeCheckout()"></div>
            <div class="checkout-container">
                <div class="checkout-header">
                    <h2><i class="fas fa-clipboard-list"></i> إتمام الطلب</h2>
                    <button class="checkout-close" onclick="CartSystem.closeCheckout()">&times;</button>
                </div>
                
                <div class="checkout-content">
                    <div class="checkout-section">
                        <h3><i class="fas fa-receipt"></i> ملخص الطلب</h3>
                        <div id="checkoutSummary"></div>
                    </div>
                    
                    <div class="checkout-section">
                        <h3><i class="fas fa-user-circle"></i> معلومات العميل</h3>
                        <div class="form-group">
                            <label>الاسم الكامل</label>
                            <input type="text" id="customerName" placeholder="أدخل اسمك الكامل" class="checkout-input">
                        </div>
                        <div class="form-group">
                            <label>رقم الهاتف</label>
                            <input type="tel" id="customerPhone" placeholder="05XXXXXXXX" class="checkout-input">
                            <small>مثال: 0555123456</small>
                        </div>
                        <div class="form-group">
                            <label>عنوان التوصيل</label>
                            <textarea id="customerAddress" rows="3" placeholder="الولاية، البلدية، الحي، الشارع، رقم البيت" class="checkout-input"></textarea>
                        </div>
                        <div class="form-group">
                            <label>ملاحظات إضافية</label>
                            <textarea id="orderNotes" rows="2" placeholder="أي ملاحظات للطلب" class="checkout-input"></textarea>
                        </div>
                    </div>
                    
                    <div class="checkout-section">
                        <h3><i class="fas fa-credit-card"></i> طريقة الدفع</h3>
                        <div class="payment-methods">
                            <label class="payment-method">
                                <input type="radio" name="paymentMethod" value="cash" checked>
                                <div class="payment-method-content">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <span>الدفع عند الاستلام</span>
                                </div>
                            </label>
                            <label class="payment-method">
                                <input type="radio" name="paymentMethod" value="cib">
                                <div class="payment-method-content">
                                    <i class="fas fa-credit-card"></i>
                                    <span>الدفع عبر CIB</span>
                                </div>
                            </label>
                            <label class="payment-method">
                                <input type="radio" name="paymentMethod" value="edahabia">
                                <div class="payment-method-content">
                                    <i class="fas fa-mobile-alt"></i>
                                    <span>الدفع عبر Edahabia</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-actions">
                    <button class="btn-cancel" onclick="CartSystem.closeCheckout()">إلغاء</button>
                    <button class="btn-confirm" onclick="CartSystem.completeOrder()">تأكيد الطلب</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // ===== فتح نافذة إتمام الطلب =====
    openCheckout() {
        if (this.items.length === 0) {
            this.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        if (typeof currentUser === 'undefined' || !currentUser) {
            this.showNotification('يرجى تسجيل الدخول أولاً', 'warning');
            if (typeof openLoginModal === 'function') openLoginModal();
            return;
        }
        
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            this.populateCheckoutSummary();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            const nameInput = document.getElementById('customerName');
            const phoneInput = document.getElementById('customerPhone');
            if (nameInput) nameInput.value = currentUser.name || '';
            if (phoneInput) phoneInput.value = currentUser.phone || '';
        }
    },
    
    // ===== تعبئة ملخص الطلب =====
    populateCheckoutSummary() {
        const container = document.getElementById('checkoutSummary');
        if (!container) return;
        
        const merchantGroups = this.groupItemsByMerchant();
        let subtotal = 0;
        
        let html = '';
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            html += `
                <div class="checkout-merchant-group">
                    <div class="checkout-merchant-header">
                        <i class="fas fa-store"></i>
                        <strong>${this.escapeHtml(group.merchantName)}</strong>
                    </div>
                    <div class="checkout-items">
            `;
            
            group.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                
                html += `
                    <div class="checkout-item">
                        <span>${this.escapeHtml(item.name)}</span>
                        <span>${item.quantity} × ${item.price.toLocaleString()} دج</span>
                        <span class="checkout-item-total">${itemTotal.toLocaleString()} دج</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <div class="checkout-merchant-total">
                        <span>مجموع التاجر:</span>
                        <span>${group.subtotal.toLocaleString()} دج</span>
                    </div>
                </div>
            `;
        }
        
        const shipping = CONFIG.shipping || 800;
        const total = subtotal + shipping;
        
        html += `
            <div class="checkout-total-summary">
                <div class="summary-line">
                    <span>المجموع الفرعي:</span>
                    <span>${subtotal.toLocaleString()} دج</span>
                </div>
                <div class="summary-line">
                    <span>رسوم التوصيل:</span>
                    <span>${shipping.toLocaleString()} دج</span>
                </div>
                <div class="summary-line total">
                    <span>الإجمالي:</span>
                    <span>${total.toLocaleString()} دج</span>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // ===== إتمام الطلب =====
    async completeOrder() {
        if (typeof currentUser === 'undefined' || !currentUser) {
            this.showNotification('يرجى تسجيل الدخول أولاً', 'warning');
            this.closeCheckout();
            if (typeof openLoginModal === 'function') openLoginModal();
            return;
        }
        
        const customerName = document.getElementById('customerName')?.value.trim();
        const customerPhone = document.getElementById('customerPhone')?.value.trim();
        const customerAddress = document.getElementById('customerAddress')?.value.trim();
        const orderNotes = document.getElementById('orderNotes')?.value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        
        if (!customerName || !customerPhone || !customerAddress) {
            this.showNotification('يرجى تعبئة جميع البيانات المطلوبة', 'error');
            return;
        }
        
        const phoneRegex = /^0[567]\d{8}$/;
        if (!phoneRegex.test(customerPhone)) {
            this.showNotification('رقم الهاتف غير صحيح (مثال: 0555123456)', 'error');
            return;
        }
        
        const merchantGroups = this.groupItemsByMerchant();
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = CONFIG.shipping || 800;
        const total = subtotal + shipping;
        const orderNumber = this.generateOrderNumber();
        
        this.showNotification('📦 جاري إرسال الطلب...', 'info');
        
        let merchantsNotified = 0;
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            const merchantMessage = this.generateMerchantOrderMessage({
                merchant: group,
                customer: { name: customerName, phone: customerPhone, address: customerAddress },
                orderNumber: `${orderNumber}-${merchantId.slice(-4)}`,
                paymentMethod: paymentMethod,
                notes: orderNotes,
                shippingPrice: shipping
            });
            
            let merchantPhone = null;
            
            if (typeof users !== 'undefined' && users) {
                const merchantUser = users.find(u => 
                    u.name === group.merchantName || 
                    u.storeName === group.merchantName ||
                    u.id == merchantId
                );
                if (merchantUser && merchantUser.phone) {
                    merchantPhone = merchantUser.phone.replace(/[^0-9]/g, '');
                }
            }
            
            if (!merchantPhone && group.merchantPhone) {
                merchantPhone = group.merchantPhone.replace(/[^0-9]/g, '');
            }
            
            if (merchantPhone) {
                window.open(`https://wa.me/${merchantPhone}?text=${encodeURIComponent(merchantMessage)}`, '_blank');
                merchantsNotified++;
                await this.sleep(500);
            }
        }
        
        const adminMessage = this.generateAdminOrderMessage({
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            orderNumber: orderNumber,
            paymentMethod: paymentMethod,
            notes: orderNotes,
            merchantGroups: merchantGroups,
            subtotal: subtotal,
            shipping: shipping,
            total: total
        });
        
        const adminPhone = CONFIG.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`, '_blank');
        
        this.saveOrder({
            orderNumber: orderNumber,
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            merchantGroups: merchantGroups,
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            notes: orderNotes,
            paymentMethod: paymentMethod,
            date: new Date().toISOString(),
            status: 'pending'
        });
        
        this.items = [];
        this.saveCart();
        this.closeCheckout();
        this.closeCartSidebar();
        
        this.showNotification(`✅ تم إرسال طلبك بنجاح!\nرقم الطلب: ${orderNumber}`, 'success');
    },
    
    // ===== إنشاء رسالة للتاجر =====
    generateMerchantOrderMessage(data) {
        const { merchant, customer, orderNumber, paymentMethod, notes, shippingPrice } = data;
        
        const paymentMethodName = {
            'cash': 'الدفع عند الاستلام',
            'cib': 'الدفع عبر CIB',
            'edahabia': 'الدفع عبر Edahabia'
        }[paymentMethod] || paymentMethod;
        
        let message = `🛍️ *طلب جديد - ناردو برو* 🛍️\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📦 *طلب للتاجر:* ${merchant.merchantName}\n`;
        message += `🆔 *رقم الطلب:* ${orderNumber}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *معلومات العميل:*\n`;
        message += `   📛 الاسم: ${customer.name}\n`;
        message += `   📞 الهاتف: ${customer.phone}\n`;
        message += `   📍 العنوان: ${customer.address}\n`;
        message += `   💳 الدفع: ${paymentMethodName}\n\n`;
        message += `📦 *المنتجات المطلوبة:*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        merchant.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            message += `• ${item.name}\n`;
            message += `  الكمية: ${item.quantity} × ${item.price.toLocaleString()} دج\n`;
            message += `  المجموع: ${itemTotal.toLocaleString()} دج\n`;
            message += `────────────────\n`;
        });
        
        message += `\n💰 *المجموع الفرعي:* ${merchant.subtotal.toLocaleString()} دج\n`;
        if (notes) message += `\n📝 *ملاحظات:*\n${notes}\n`;
        message += `\n⏰ *تاريخ الطلب:* ${new Date().toLocaleString('ar-DZ')}\n`;
        message += `✨ *ناردو برو* ✨`;
        
        return message;
    },
    
    // ===== إنشاء رسالة للإدارة =====
    generateAdminOrderMessage(data) {
        const { customer, orderNumber, paymentMethod, notes, merchantGroups, subtotal, shipping, total } = data;
        
        const paymentMethodName = {
            'cash': 'الدفع عند الاستلام',
            'cib': 'الدفع عبر CIB',
            'edahabia': 'الدفع عبر Edahabia'
        }[paymentMethod] || paymentMethod;
        
        let message = `🏪 *طلب جديد - نظام إدارة الطلبات* 🏪\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🆔 *رقم الطلب:* ${orderNumber}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *معلومات العميل:*\n`;
        message += `   📛 ${customer.name}\n`;
        message += `   📞 ${customer.phone}\n`;
        message += `   📍 ${customer.address}\n`;
        message += `   💳 ${paymentMethodName}\n\n`;
        message += `📦 *تفاصيل الطلب:*\n`;
        
        let merchantIndex = 1;
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            message += `\n🏪 التاجر ${merchantIndex}: ${group.merchantName}\n`;
            group.items.forEach(item => {
                message += `   • ${item.name} (${item.quantity} × ${item.price.toLocaleString()} دج)\n`;
            });
            message += `   💰 المجموع: ${group.subtotal.toLocaleString()} دج\n`;
            merchantIndex++;
        }
        
        message += `\n💰 *المجموع:* ${subtotal.toLocaleString()} دج + ${shipping.toLocaleString()} دج = ${total.toLocaleString()} دج\n`;
        if (notes) message += `\n📝 ملاحظات: ${notes}\n`;
        message += `\n⏰ ${new Date().toLocaleString('ar-DZ')}\n`;
        message += `✨ ناردو برو ✨`;
        
        return message;
    },
    
    // ===== إنشاء رقم طلب =====
    generateOrderNumber() {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `NARD-${timestamp}-${random}`;
    },
    
    // ===== حفظ الطلب =====
    saveOrder(order) {
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        orders.unshift(order);
        if (orders.length > 100) orders.pop();
        localStorage.setItem('nardoo_orders', JSON.stringify(orders));
    },
    
    // ===== فتح السلة =====
    showCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
            this.updateCartDisplay();
        }
    },
    
    // ===== إغلاق السلة =====
    closeCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    },
    
    // ===== إغلاق نافذة الدفع =====
    closeCheckout() {
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },
    
    // ===== إشعار =====
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // ===== إضافة أنماط CSS =====
    addCartStyles() {
        if (document.getElementById('cart-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cart-styles';
        styles.textContent = `
            .cart-sidebar {
                position: fixed;
                top: 0;
                right: -450px;
                width: 450px;
                height: 100vh;
                background: var(--bg-primary, #0f0f1a);
                z-index: 10001;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
                box-shadow: -5px 0 20px rgba(0,0,0,0.3);
            }
            .cart-sidebar.open { right: 0; }
            .cart-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .cart-overlay.show { opacity: 1; visibility: visible; }
            .cart-header {
                padding: 20px;
                background: var(--bg-secondary, #1a1a2e);
                border-bottom: 1px solid var(--gold, #D4AF37);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cart-header h3 {
                margin: 0;
                color: var(--gold, #D4AF37);
            }
            .close-cart {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--text-secondary, #888);
            }
            .cart-content { flex: 1; overflow-y: auto; padding: 20px; }
            .merchant-group {
                background: rgba(255,255,255,0.05);
                border-radius: 16px;
                margin-bottom: 20px;
                overflow: hidden;
            }
            .merchant-header {
                background: rgba(212,175,55,0.1);
                padding: 12px 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid rgba(212,175,55,0.3);
                font-weight: bold;
            }
            .merchant-header i { color: var(--gold, #D4AF37); }
            .merchant-header span:first-of-type { flex: 1; }
            .merchant-total { color: var(--gold, #D4AF37); }
            .merchant-items { padding: 10px; }
            .cart-item {
                display: flex;
                gap: 15px;
                padding: 12px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                margin-bottom: 10px;
            }
            .cart-item img {
                width: 70px;
                height: 70px;
                object-fit: cover;
                border-radius: 10px;
            }
            .cart-item-info { flex: 1; }
            .cart-item-name { font-weight: bold; margin-bottom: 5px; }
            .cart-item-price { font-size: 13px; color: var(--text-secondary, #888); }
            .cart-item-actions { text-align: right; }
            .quantity-control {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            .quantity-control button {
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 6px;
                background: var(--gold, #D4AF37);
                cursor: pointer;
                font-weight: bold;
            }
            .cart-item-total {
                font-weight: bold;
                color: var(--gold, #D4AF37);
                margin-bottom: 8px;
                font-size: 14px;
            }
            .remove-btn {
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                font-size: 14px;
            }
            .cart-footer {
                padding: 20px;
                border-top: 1px solid rgba(255,255,255,0.1);
                background: var(--bg-secondary, #1a1a2e);
            }
            .cart-summary > div {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
            }
            .cart-summary .total {
                font-size: 18px;
                font-weight: bold;
                color: var(--gold, #D4AF37);
                border-top: 1px solid rgba(255,255,255,0.1);
                margin-top: 8px;
                padding-top: 12px;
            }
            .checkout-btn {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #D4AF37, #B8860B);
                border: none;
                border-radius: 10px;
                color: white;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
            }
            .empty-cart {
                text-align: center;
                padding: 60px 20px;
            }
            .empty-cart i {
                font-size: 60px;
                color: var(--gold, #D4AF37);
                opacity: 0.5;
                margin-bottom: 20px;
            }
            .btn-continue {
                background: rgba(212,175,55,0.2);
                border: 1px solid var(--gold, #D4AF37);
                padding: 10px 24px;
                border-radius: 30px;
                color: var(--gold, #D4AF37);
                cursor: pointer;
            }
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
            }
            .checkout-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(8px);
            }
            .checkout-container {
                position: relative;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                background: var(--bg-primary, #0f0f1a);
                border-radius: 24px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                border: 1px solid rgba(212,175,55,0.3);
                z-index: 1;
            }
            .checkout-header {
                padding: 20px;
                background: var(--bg-secondary, #1a1a2e);
                border-bottom: 1px solid rgba(212,175,55,0.3);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .checkout-header h2 {
                margin: 0;
                color: var(--gold, #D4AF37);
                font-size: 20px;
            }
            .checkout-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--text-secondary, #888);
            }
            .checkout-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            .checkout-section {
                background: rgba(255,255,255,0.05);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .checkout-section h3 {
                margin: 0 0 15px 0;
                color: var(--gold, #D4AF37);
                font-size: 16px;
            }
            .checkout-merchant-group {
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 15px;
            }
            .checkout-merchant-header {
                font-size: 16px;
                margin-bottom: 10px;
                color: var(--gold, #D4AF37);
            }
            .checkout-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
            }
            .checkout-item-total { color: var(--gold, #D4AF37); }
            .checkout-merchant-total {
                display: flex;
                justify-content: space-between;
                padding-top: 10px;
                margin-top: 10px;
                border-top: 1px dashed rgba(255,255,255,0.1);
                font-weight: bold;
            }
            .checkout-total-summary {
                background: rgba(212,175,55,0.1);
                border-radius: 12px;
                padding: 15px;
                margin-top: 15px;
            }
            .summary-line {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
            }
            .summary-line.total {
                font-size: 18px;
                font-weight: bold;
                color: var(--gold, #D4AF37);
                border-top: 1px solid rgba(212,175,55,0.3);
                margin-top: 8px;
                padding-top: 12px;
            }
            .form-group { margin-bottom: 15px; }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                color: var(--text-secondary, #888);
            }
            .checkout-input {
                width: 100%;
                padding: 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 10px;
                color: var(--text-primary, #fff);
                font-size: 14px;
            }
            .payment-methods { display: flex; flex-direction: column; gap: 10px; }
            .payment-method { cursor: pointer; }
            .payment-method input { display: none; }
            .payment-method-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 15px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
            }
            .payment-method input:checked + .payment-method-content {
                border-color: var(--gold, #D4AF37);
                background: rgba(212,175,55,0.1);
            }
            .payment-method-content i {
                font-size: 20px;
                color: var(--gold, #D4AF37);
            }
            .checkout-actions {
                display: flex;
                gap: 15px;
                padding: 20px;
                border-top: 1px solid rgba(212,175,55,0.3);
            }
            .btn-cancel, .btn-confirm {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
            }
            .btn-cancel {
                background: rgba(255,255,255,0.1);
                color: var(--text-secondary, #888);
            }
            .btn-confirm {
                background: linear-gradient(135deg, #D4AF37, #B8860B);
                color: white;
            }
            .cart-notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: var(--bg-secondary, #1a1a2e);
                border-right: 4px solid var(--gold, #D4AF37);
                padding: 12px 20px;
                border-radius: 10px;
                z-index: 10002;
                animation: slideUp 0.3s ease;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .cart-notification.success i { color: #4ade80; }
            .cart-notification.error i { color: #f87171; }
            .cart-notification.fade-out { animation: fadeOut 0.3s ease forwards; }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOut {
                to { opacity: 0; transform: translateY(-20px); }
            }
            @media (max-width: 768px) {
                .cart-sidebar { width: 100%; right: -100%; }
                .checkout-container { width: 95%; max-height: 95vh; }
                .checkout-actions { flex-direction: column; }
            }
        `;
        
        document.head.appendChild(styles);
    },
    
    // ===== إعداد مستمعات الأحداث =====
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCartSidebar();
                this.closeCheckout();
            }
        });
    },
    
    // ===== الحصول على عدد المنتجات =====
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    // ===== الحصول على المجموع =====
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },
    
    // ===== تنظيف النص =====
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ===== تأخير =====
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ===== تصدير الدوال للاستخدام العام =====
window.Cart = CartSystem;
window.toggleCart = () => CartSystem.showCartSidebar();
window.addToCart = (product) => CartSystem.addProduct(product);

// ===== تهيئة السلة =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartSystem.init());
} else {
    CartSystem.init();
}

console.log('✅ نظام السلة المتكامل جاهز مع زر إضافة للسلة');
