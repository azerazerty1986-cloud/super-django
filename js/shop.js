/* ================================================================== */
/* ===== [03] الملف: 03-shop.js - نظام السلة المتكامل (واجهة احترافية) ===== */
/* ================================================================== */

// ===== التأكد من وجود CONFIG =====
if (typeof CONFIG === 'undefined') {
    window.CONFIG = {
        currency: 'دج',
        shipping: 200,
        phone: '213555552448',
        defaultImage: 'https://via.placeholder.com/300x300?text=No+Image'
    };
}

// ===== نظام السلة المتطور بواجهة احترافية =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = Utils.load('nardoo_cart', []);
        this.updateCounter();
        this.addCheckoutModal();
        this.addCartStyles();
        this.initCartSidebar();
        console.log('✅ نظام السلة الجاهز بواجهة احترافية');
    },
    
    // تهيئة السلة الجانبية
    initCartSidebar() {
        // البحث عن السلة الجانبية الموجودة أو إنشاؤها
        let cartSidebar = document.getElementById('cartSidebar');
        if (!cartSidebar) {
            this.createCartSidebar();
        }
    },
    
    // إنشاء السلة الجانبية بتصميم احترافي
    createCartSidebar() {
        const sidebarHTML = `
        <div id="cartSidebar" class="cart-sidebar-modern">
            <div class="cart-sidebar-header">
                <div class="cart-header-title">
                    <div class="cart-icon-wrapper">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="cart-badge" id="cartSidebarCount">0</span>
                    </div>
                    <h3>سلة التسوق</h3>
                </div>
                <button class="cart-close-btn" onclick="toggleCart()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="cart-sidebar-content">
                <div class="cart-items-container" id="cartItems">
                    <div class="empty-cart-modern">
                        <div class="empty-cart-animation">
                            <i class="fas fa-shopping-cart"></i>
                            <div class="empty-cart-pulse"></div>
                        </div>
                        <h4>سلة فارغة</h4>
                        <p>أضف بعض المنتجات الرائعة إلى سلتك</p>
                        <button class="btn-continue-shopping" onclick="toggleCart()">
                            <i class="fas fa-arrow-right"></i>
                            مواصلة التسوق
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="cart-sidebar-footer" id="cartFooter" style="display: none;">
                <div class="cart-summary-modern">
                    <div class="summary-row">
                        <span>المجموع الفرعي</span>
                        <span id="cartSubtotal">0 دج</span>
                    </div>
                    <div class="summary-row">
                        <span>رسوم التوصيل</span>
                        <span id="cartShipping">${CONFIG.shipping} دج</span>
                    </div>
                    <div class="summary-row total-row-modern">
                        <span>الإجمالي</span>
                        <span id="cartTotalAmount">0 دج</span>
                    </div>
                </div>
                <button class="btn-checkout-modern" onclick="CartSystem.openCheckout()">
                    <i class="fas fa-credit-card"></i>
                    إتمام الطلب
                    <span class="btn-checkout-arrow">→</span>
                </button>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    },
    
    // إضافة للسلة مع تأثير
    add(product) {
        if (!product || product.stock <= 0) {
            this.showFloatingNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const existing = this.items.find(i => i.productId === product.id || i.productId === product.productId);
        const productImage = (product.images && product.images[0]) || product.image || CONFIG.defaultImage;
        
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
                this.showFloatingNotification(`تم زيادة كمية ${product.name}`, 'success');
                this.animateCartIcon();
            } else {
                this.showFloatingNotification('الكمية غير متوفرة', 'warning');
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
                stock: product.stock,
                category: product.category
            });
            this.showFloatingNotification(`تم إضافة ${product.name} للسلة`, 'success');
            this.animateAddToCart(productImage);
        }
        
        this.save();
        this.showCartSidebar();
        return true;
    },
    
    // تأثير عند الإضافة للسلة
    animateAddToCart(imageUrl) {
        const flyingItem = document.createElement('div');
        flyingItem.className = 'flying-item';
        flyingItem.innerHTML = `<img src="${imageUrl}" alt="product">`;
        document.body.appendChild(flyingItem);
        
        const startPos = { x: window.event?.clientX || window.innerWidth / 2, y: window.event?.clientY || window.innerHeight / 2 };
        const cartIcon = document.querySelector('.fixed-cart, .action-btn .fa-shopping-cart')?.closest('button');
        
        if (cartIcon) {
            const endPos = cartIcon.getBoundingClientRect();
            flyingItem.style.left = startPos.x + 'px';
            flyingItem.style.top = startPos.y + 'px';
            flyingItem.style.transform = `translate(${endPos.left - startPos.x}px, ${endPos.top - startPos.y}px) scale(0.2)`;
            
            setTimeout(() => flyingItem.remove(), 500);
        } else {
            flyingItem.remove();
        }
    },
    
    // تأثير أيقونة السلة
    animateCartIcon() {
        const cartIcon = document.querySelector('.fixed-cart, .action-btn .fa-shopping-cart');
        if (cartIcon) {
            cartIcon.classList.add('cart-bump');
            setTimeout(() => cartIcon.classList.remove('cart-bump'), 300);
        }
    },
    
    // إشعار عائم
    showFloatingNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `floating-notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
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
        } else {
            this.showFloatingNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // حذف من السلة مع تأثير
    remove(productId) {
        const item = this.items.find(i => i.productId === productId);
        if (item) {
            const itemElement = document.querySelector(`.cart-item-modern[data-id="${productId}"]`);
            if (itemElement) {
                itemElement.classList.add('removing');
                setTimeout(() => {
                    this.items = this.items.filter(i => i.productId !== productId);
                    this.save();
                    this.showFloatingNotification(`تم حذف ${item.name} من السلة`, 'info');
                }, 300);
            } else {
                this.items = this.items.filter(i => i.productId !== productId);
                this.save();
                this.showFloatingNotification(`تم حذف ${item.name} من السلة`, 'info');
            }
        }
    },
    
    // حفظ السلة
    save() {
        Utils.save('nardoo_cart', this.items);
        this.updateCounter();
        this.displayModernCart();
    },
    
    // تحديث العداد
    updateCounter() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        
        const cartCounters = document.querySelectorAll('#cartCounter, #fixedCartCounter, #cartSidebarCount');
        cartCounters.forEach(counter => {
            if (counter) counter.textContent = count;
        });
        
        // تحديث ظهور الفوتر
        const cartFooter = document.getElementById('cartFooter');
        if (cartFooter) {
            cartFooter.style.display = count > 0 ? 'block' : 'none';
        }
    },
    
    // عرض السلة بتصميم حديث
    displayModernCart() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-modern">
                    <div class="empty-cart-animation">
                        <i class="fas fa-shopping-cart"></i>
                        <div class="empty-cart-pulse"></div>
                    </div>
                    <h4>سلة فارغة</h4>
                    <p>أضف بعض المنتجات الرائعة إلى سلتك</p>
                    <button class="btn-continue-shopping" onclick="toggleCart()">
                        <i class="fas fa-arrow-right"></i>
                        مواصلة التسوق
                    </button>
                </div>
            `;
            return;
        }
        
        let subtotal = 0;
        container.innerHTML = this.items.map(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            const productImage = item.image || CONFIG.defaultImage;
            
            return `
                <div class="cart-item-modern" data-id="${item.productId}">
                    <div class="cart-item-image-modern">
                        <img src="${productImage}" alt="${item.name}" 
                             onerror="this.src='${CONFIG.defaultImage}'">
                    </div>
                    <div class="cart-item-info-modern">
                        <div class="cart-item-name-modern">${this.escapeHtml(item.name)}</div>
                        <div class="cart-item-merchant-modern">
                            <i class="fas fa-store"></i> ${this.escapeHtml(item.merchantName)}
                        </div>
                        <div class="cart-item-price-modern">${item.price.toLocaleString()} دج</div>
                    </div>
                    <div class="cart-item-actions-modern">
                        <div class="quantity-control-modern">
                            <button class="qty-btn qty-minus" onclick="CartSystem.update('${item.productId}', ${item.quantity - 1})">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn qty-plus" onclick="CartSystem.update('${item.productId}', ${item.quantity + 1})">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="cart-item-total-modern">${itemTotal.toLocaleString()} دج</div>
                        <button class="cart-item-remove-modern" onclick="CartSystem.remove('${item.productId}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        const shipping = CONFIG.shipping || 200;
        const total = subtotal + shipping;
        
        const subtotalEl = document.getElementById('cartSubtotal');
        const shippingEl = document.getElementById('cartShipping');
        const totalEl = document.getElementById('cartTotalAmount');
        
        if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} دج`;
        if (shippingEl) shippingEl.textContent = `${shipping.toLocaleString()} دج`;
        if (totalEl) totalEl.textContent = `${total.toLocaleString()} دج`;
    },
    
    // تجميع المنتجات حسب التاجر
    groupItemsByMerchant() {
        const groups = {};
        this.items.forEach(item => {
            const merchantId = item.merchantId || 'default';
            const merchantName = item.merchantName || 'ناردو برو';
            if (!groups[merchantId]) {
                groups[merchantId] = {
                    merchantId: merchantId,
                    merchantName: merchantName,
                    items: [],
                    subtotal: 0
                };
            }
            groups[merchantId].items.push(item);
            groups[merchantId].subtotal += item.price * item.quantity;
        });
        return groups;
    },
    
    // تحديد منطقة التوصيل
    detectZone(address) {
        const zones = {
            'الجزائر': ['الجزائر', 'الجزائر العاصمة', 'Alger', 'Algiers'],
            'وهران': ['وهران', 'Oran'],
            'قسنطينة': ['قسنطينة', 'Constantine'],
            'عنابة': ['عنابة', 'Annaba']
        };
        for (const [zone, keywords] of Object.entries(zones)) {
            for (const keyword of keywords) {
                if (address.includes(keyword)) return zone;
            }
        }
        return 'باقي الولايات';
    },
    
    // إضافة نافذة إتمام الطلب بتصميم احترافي
    addCheckoutModal() {
        if (document.getElementById('checkoutModal')) return;
        
        const modalHTML = `
        <div id="checkoutModal" class="checkout-modal-modern" style="display: none;">
            <div class="checkout-overlay-modern" onclick="CartSystem.closeCheckout()"></div>
            <div class="checkout-container-modern">
                <div class="checkout-header-modern">
                    <div class="checkout-header-icon-modern">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <h2>إتمام الطلب</h2>
                    <button class="checkout-close-modern" onclick="CartSystem.closeCheckout()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="checkout-content-modern">
                    <!-- ملخص الطلب -->
                    <div class="checkout-card">
                        <div class="card-header">
                            <i class="fas fa-receipt"></i>
                            <h3>ملخص الطلب</h3>
                        </div>
                        <div class="order-items-list-modern" id="checkoutItemsList"></div>
                        <div class="order-total-modern">
                            <div class="total-line">
                                <span>المجموع الفرعي</span>
                                <span id="checkoutSubtotal">0 دج</span>
                            </div>
                            <div class="total-line">
                                <span>رسوم التوصيل</span>
                                <span id="checkoutShipping">0 دج</span>
                            </div>
                            <div class="total-line grand-total-modern">
                                <span>الإجمالي</span>
                                <span id="checkoutTotal">0 دج</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- معلومات العميل -->
                    <div class="checkout-card">
                        <div class="card-header">
                            <i class="fas fa-user-circle"></i>
                            <h3>معلومات العميل</h3>
                        </div>
                        
                        <div id="loginRequiredMsg" class="login-required-modern" style="display: none;">
                            <i class="fas fa-lock"></i>
                            <div>
                                <strong>تسجيل الدخول مطلوب</strong>
                                <p>يرجى <a href="#" onclick="App.openLoginModal(); return false;">تسجيل الدخول</a> لإكمال الطلب</p>
                            </div>
                        </div>
                        
                        <div id="customerFormFields">
                            <div class="form-group-modern">
                                <label>
                                    <i class="fas fa-user"></i>
                                    <span>الاسم الكامل</span>
                                </label>
                                <input type="text" id="customerName" placeholder="أدخل اسمك الكامل" class="input-modern">
                            </div>
                            
                            <div class="form-group-modern">
                                <label>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>رقم الهاتف</span>
                                </label>
                                <input type="tel" id="customerPhone" placeholder="05XXXXXXXX" class="input-modern">
                                <small>مثال: 05XXXXXXXX</small>
                            </div>
                            
                            <div class="form-group-modern">
                                <label>
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>عنوان التوصيل</span>
                                </label>
                                <textarea id="customerAddress" rows="3" placeholder="الولاية، البلدية، الحي، الشارع، رقم البيت" class="input-modern" onchange="CartSystem.updateShippingPrice()"></textarea>
                            </div>
                            
                            <div class="form-group-modern">
                                <label>
                                    <i class="fas fa-sticky-note"></i>
                                    <span>ملاحظات إضافية</span>
                                </label>
                                <textarea id="orderNotes" rows="2" placeholder="أي ملاحظات إضافية للطلب" class="input-modern"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- طريقة الدفع -->
                    <div class="checkout-card">
                        <div class="card-header">
                            <i class="fas fa-credit-card"></i>
                            <h3>طريقة الدفع</h3>
                        </div>
                        
                        <div class="payment-methods-modern">
                            <label class="payment-method-modern">
                                <input type="radio" name="paymentMethod" value="cash" checked>
                                <div class="payment-method-content">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <div>
                                        <strong>الدفع عند الاستلام</strong>
                                        <small>ادفع نقداً عند استلام الطلب</small>
                                    </div>
                                    <i class="fas fa-check-circle check-icon"></i>
                                </div>
                            </label>
                            
                            <label class="payment-method-modern">
                                <input type="radio" name="paymentMethod" value="cib">
                                <div class="payment-method-content">
                                    <i class="fas fa-credit-card"></i>
                                    <div>
                                        <strong>الدفع عبر CIB</strong>
                                        <small>تحويل بنكي أو بطاقة ائتمان</small>
                                    </div>
                                    <i class="fas fa-check-circle check-icon"></i>
                                </div>
                            </label>
                            
                            <label class="payment-method-modern">
                                <input type="radio" name="paymentMethod" value="edahabia">
                                <div class="payment-method-content">
                                    <i class="fas fa-mobile-alt"></i>
                                    <div>
                                        <strong>الدفع عبر Edahabia</strong>
                                        <small>بطاقة الذهب الإلكترونية</small>
                                    </div>
                                    <i class="fas fa-check-circle check-icon"></i>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-actions-modern">
                    <button class="btn-cancel-modern" onclick="CartSystem.closeCheckout()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                    <button class="btn-complete-modern" onclick="CartSystem.completeOrder()">
                        <i class="fas fa-check-circle"></i>
                        تأكيد الطلب
                    </button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // تحديث سعر التوصيل
    updateShippingPrice() {
        const address = document.getElementById('customerAddress')?.value;
        if (!address) return;
        
        const zone = this.detectZone(address);
        let shippingPrice = CONFIG.shipping || 200;
        
        if (zone === 'الجزائر') shippingPrice = 300;
        else if (zone === 'وهران' || zone === 'قسنطينة') shippingPrice = 400;
        else if (zone === 'عنابة') shippingPrice = 350;
        else shippingPrice = 500;
        
        const shippingEl = document.getElementById('checkoutShipping');
        if (shippingEl) shippingEl.textContent = `${shippingPrice} دج`;
        
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const totalEl = document.getElementById('checkoutTotal');
        if (totalEl) totalEl.textContent = `${(subtotal + shippingPrice).toLocaleString()} دج`;
        
        return shippingPrice;
    },
    
    // إضافة أنماط CSS احترافية
    addCartStyles() {
        if (document.getElementById('cart-system-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cart-system-styles';
        styles.textContent = `
            /* السلة الجانبية الحديثة */
            .cart-sidebar-modern {
                position: fixed;
                top: 0;
                right: -450px;
                width: 450px;
                height: 100vh;
                background: var(--bg-primary, #0f0f1a);
                z-index: 10001;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.3);
                border-left: 1px solid rgba(212, 175, 55, 0.3);
            }
            
            .cart-sidebar-modern.open {
                right: 0;
            }
            
            .cart-sidebar-header {
                padding: 20px 25px;
                background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
                border-bottom: 1px solid rgba(212, 175, 55, 0.3);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .cart-header-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .cart-icon-wrapper {
                position: relative;
                width: 40px;
                height: 40px;
                background: rgba(212, 175, 55, 0.2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .cart-icon-wrapper i {
                font-size: 20px;
                color: #D4AF37;
            }
            
            .cart-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #D4AF37;
                color: #000;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 20px;
                min-width: 18px;
                text-align: center;
            }
            
            .cart-header-title h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .cart-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                width: 35px;
                height: 35px;
                border-radius: 10px;
                cursor: pointer;
                color: var(--text-secondary);
                transition: all 0.3s;
            }
            
            .cart-close-btn:hover {
                background: rgba(212, 175, 55, 0.2);
                color: #D4AF37;
                transform: rotate(90deg);
            }
            
            .cart-sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            /* عنصر السلة الحديث */
            .cart-item-modern {
                display: flex;
                gap: 15px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                margin-bottom: 12px;
                transition: all 0.3s;
                animation: slideIn 0.3s ease;
            }
            
            .cart-item-modern.removing {
                animation: slideOut 0.3s ease forwards;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOut {
                to {
                    opacity: 0;
                    transform: translateX(20px);
                }
            }
            
            .cart-item-image-modern {
                width: 80px;
                height: 80px;
                border-radius: 12px;
                overflow: hidden;
                flex-shrink: 0;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .cart-item-image-modern img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .cart-item-info-modern {
                flex: 1;
            }
            
            .cart-item-name-modern {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
                color: var(--text-primary);
            }
            
            .cart-item-merchant-modern {
                font-size: 11px;
                color: #D4AF37;
                margin-bottom: 6px;
            }
            
            .cart-item-merchant-modern i {
                font-size: 10px;
            }
            
            .cart-item-price-modern {
                font-size: 13px;
                color: var(--text-secondary);
            }
            
            .cart-item-actions-modern {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }
            
            .quantity-control-modern {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 30px;
                padding: 4px;
            }
            
            .qty-btn {
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                background: rgba(212, 175, 55, 0.2);
                color: #D4AF37;
                transition: all 0.3s;
            }
            
            .qty-btn:hover {
                background: #D4AF37;
                color: #000;
            }
            
            .qty-value {
                font-size: 14px;
                font-weight: 600;
                min-width: 30px;
                text-align: center;
            }
            
            .cart-item-total-modern {
                font-weight: 700;
                color: #D4AF37;
                font-size: 14px;
            }
            
            .cart-item-remove-modern {
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
                transition: all 0.3s;
            }
            
            .cart-item-remove-modern:hover {
                transform: scale(1.1);
                color: #ff4444;
            }
            
            /* السلة الفارغة */
            .empty-cart-modern {
                text-align: center;
                padding: 60px 20px;
            }
            
            .empty-cart-animation {
                position: relative;
                width: 100px;
                height: 100px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .empty-cart-animation i {
                font-size: 60px;
                color: #D4AF37;
                opacity: 0.5;
            }
            
            .empty-cart-pulse {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(212, 175, 55, 0.2);
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(0.8);
                    opacity: 0.5;
                }
                100% {
                    transform: scale(1.2);
                    opacity: 0;
                }
            }
            
            .empty-cart-modern h4 {
                margin: 0 0 8px;
                font-size: 18px;
                color: var(--text-primary);
            }
            
            .empty-cart-modern p {
                color: var(--text-secondary);
                margin-bottom: 20px;
            }
            
            .btn-continue-shopping {
                background: rgba(212, 175, 55, 0.2);
                border: 1px solid #D4AF37;
                padding: 10px 24px;
                border-radius: 30px;
                color: #D4AF37;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-continue-shopping:hover {
                background: #D4AF37;
                color: #000;
            }
            
            /* خالص السلة */
            .cart-sidebar-footer {
                padding: 20px;
                border-top: 1px solid rgba(212, 175, 55, 0.3);
                background: rgba(0, 0, 0, 0.3);
            }
            
            .cart-summary-modern {
                margin-bottom: 20px;
            }
            
            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
                color: var(--text-secondary);
            }
            
            .total-row-modern {
                font-size: 18px;
                font-weight: 700;
                color: #D4AF37;
                border-top: 1px solid rgba(212, 175, 55, 0.3);
                margin-top: 8px;
                padding-top: 12px;
            }
            
            .btn-checkout-modern {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #D4AF37, #B8860B);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s;
            }
            
            .btn-checkout-modern:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(212, 175, 55, 0.4);
            }
            
            .btn-checkout-arrow {
                transition: transform 0.3s;
            }
            
            .btn-checkout-modern:hover .btn-checkout-arrow {
                transform: translateX(5px);
            }
            
            /* الإشعار العائم */
            .floating-notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: #1a1a2e;
                border-right: 4px solid #D4AF37;
                padding: 12px 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10002;
                animation: slideUp 0.3s ease;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            }
            
            .floating-notification.success i {
                color: #4ade80;
            }
            
            .floating-notification.error i {
                color: #f87171;
            }
            
            .floating-notification.warning i {
                color: #fbbf24;
            }
            
            .floating-notification.info i {
                color: #60a5fa;
            }
            
            .floating-notification.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            }
            
            /* العنصر الطائر */
            .flying-item {
                position: fixed;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                overflow: hidden;
                z-index: 10003;
                pointer-events: none;
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .flying-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            /* تأثير ارتداد السلة */
            .cart-bump {
                animation: bump 0.3s ease;
            }
            
            @keyframes bump {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            
            /* نافذة إتمام الطلب الحديثة */
            .checkout-modal-modern {
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
            
            .checkout-overlay-modern {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
            }
            
            .checkout-container-modern {
                position: relative;
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                background: var(--bg-primary, #0f0f1a);
                border-radius: 24px;
                overflow: hidden;
                animation: modalSlideUp 0.3s ease;
                display: flex;
                flex-direction: column;
                border: 1px solid rgba(212, 175, 55, 0.3);
            }
            
            @keyframes modalSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .checkout-header-modern {
                background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
                padding: 20px 25px;
                display: flex;
                align-items: center;
                gap: 15px;
                border-bottom: 1px solid rgba(212, 175, 55, 0.3);
            }
            
            .checkout-header-icon-modern {
                width: 45px;
                height: 45px;
                background: rgba(212, 175, 55, 0.2);
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: #D4AF37;
            }
            
            .checkout-header-modern h2 {
                flex: 1;
                margin: 0;
                font-size: 22px;
                color: var(--text-primary);
            }
            
            .checkout-close-modern {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                width: 35px;
                height: 35px;
                border-radius: 10px;
                cursor: pointer;
                color: var(--text-secondary);
                transition: all 0.3s;
            }
            
            .checkout-close-modern:hover {
                background: rgba(212, 175, 55, 0.2);
                color: #D4AF37;
                transform: rotate(90deg);
            }
            
            .checkout-content-modern {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .checkout-card {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                overflow: hidden;
            }
            
            .card-header {
                padding: 15px 20px;
                background: rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid rgba(212, 175, 55, 0.2);
            }
            
            .card-header i {
                color: #D4AF37;
                font-size: 18px;
            }
            
            .card-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .order-items-list-modern {
                padding: 15px;
                max-height: 250px;
                overflow-y: auto;
            }
            
            .checkout-item-modern {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .checkout-item-modern:last-child {
                border-bottom: none;
            }
            
            .checkout-item-image-modern {
                width: 50px;
                height: 50px;
                border-radius: 10px;
                overflow: hidden;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .checkout-item-image-modern img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .checkout-item-details-modern {
                flex: 1;
            }
            
            .checkout-item-name-modern {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .checkout-item-price-modern {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .checkout-item-merchant-modern {
                font-size: 11px;
                color: #D4AF37;
                margin-top: 3px;
            }
            
            .checkout-item-total-modern {
                font-weight: 700;
                color: #D4AF37;
            }
            
            .order-total-modern {
                padding: 15px;
                border-top: 1px solid rgba(212, 175, 55, 0.2);
                background: rgba(0, 0, 0, 0.2);
            }
            
            .total-line {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
            }
            
            .grand-total-modern {
                font-size: 18px;
                font-weight: 700;
                color: #D4AF37;
                border-top: 1px solid rgba(212, 175, 55, 0.3);
                margin-top: 8px;
                padding-top: 12px;
            }
            
            .form-group-modern {
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .form-group-modern:last-child {
                border-bottom: none;
            }
            
            .form-group-modern label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-secondary);
            }
            
            .form-group-modern label i {
                color: #D4AF37;
                width: 18px;
            }
            
            .input-modern {
                width: 100%;
                padding: 12px 15px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                color: var(--text-primary);
                font-size: 14px;
                transition: all 0.3s;
            }
            
            .input-modern:focus {
                outline: none;
                border-color: #D4AF37;
                background: rgba(255, 255, 255, 0.15);
            }
            
            .form-group-modern small {
                display: block;
                margin-top: 5px;
                font-size: 11px;
                color: var(--text-secondary);
            }
            
            .payment-methods-modern {
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .payment-method-modern {
                display: block;
                cursor: pointer;
            }
            
            .payment-method-modern input {
                display: none;
            }
            
            .payment-method-content {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px 15px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                transition: all 0.3s;
                position: relative;
            }
            
            .payment-method-modern input:checked + .payment-method-content {
                border-color: #D4AF37;
                background: rgba(212, 175, 55, 0.1);
            }
            
            .payment-method-content i:first-child {
                font-size: 24px;
                color: #D4AF37;
            }
            
            .payment-method-content strong {
                display: block;
                margin-bottom: 2px;
                font-size: 14px;
            }
            
            .payment-method-content small {
                font-size: 11px;
                color: var(--text-secondary);
            }
            
            .check-icon {
                margin-right: auto;
                opacity: 0;
                transition: all 0.3s;
                color: #D4AF37;
            }
            
            .payment-method-modern input:checked + .payment-method-content .check-icon {
                opacity: 1;
            }
            
            .login-required-modern {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                background: rgba(212, 175, 55, 0.1);
                border-radius: 12px;
                margin: 15px;
            }
            
            .login-required-modern i {
                font-size: 28px;
                color: #D4AF37;
            }
            
            .login-required-modern strong {
                display: block;
                margin-bottom: 4px;
            }
            
            .login-required-modern p {
                margin: 0;
                font-size: 13px;
                color: var(--text-secondary);
            }
            
            .login-required-modern a {
                color: #D4AF37;
                text-decoration: none;
                font-weight: 600;
            }
            
            .checkout-actions-modern {
                display: flex;
                gap: 15px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(212, 175, 55, 0.3);
            }
            
            .btn-cancel-modern, .btn-complete-modern {
                flex: 1;
                padding: 14px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .btn-cancel-modern {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-secondary);
            }
            
            .btn-cancel-modern:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .btn-complete-modern {
                background: linear-gradient(135deg, #D4AF37, #B8860B);
                color: white;
            }
            
            .btn-complete-modern:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(212, 175, 55, 0.4);
            }
            
            @media (max-width: 768px) {
                .cart-sidebar-modern {
                    width: 100%;
                    right: -100%;
                }
                
                .checkout-container-modern {
                    width: 95%;
                    max-height: 95vh;
                }
                
                .checkout-item-modern {
                    flex-wrap: wrap;
                }
                
                .checkout-item-total-modern {
                    width: 100%;
                    text-align: left;
                    padding-top: 5px;
                }
                
                .checkout-actions-modern {
                    flex-direction: column;
                }
                
                .cart-item-modern {
                    flex-direction: column;
                }
                
                .cart-item-actions-modern {
                    flex-direction: row;
                    justify-content: space-between;
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(styles);
    },
    
    // فتح السلة الجانبية
    showCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.add('open');
        }
    },
    
    // فتح نافذة إتمام الطلب
    openCheckout() {
        if (this.items.length === 0) {
            this.showFloatingNotification('السلة فارغة', 'warning');
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
        
        const itemsList = document.getElementById('checkoutItemsList');
        if (itemsList) {
            itemsList.innerHTML = this.items.map(item => {
                const productImage = item.image || CONFIG.defaultImage;
                return `
                    <div class="checkout-item-modern">
                        <div class="checkout-item-image-modern">
                            <img src="${productImage}" alt="${item.name}" onerror="this.src='${CONFIG.defaultImage}'">
                        </div>
                        <div class="checkout-item-details-modern">
                            <div class="checkout-item-name-modern">${this.escapeHtml(item.name)}</div>
                            <div class="checkout-item-price-modern">${item.price.toLocaleString()} دج × ${item.quantity}</div>
                            <div class="checkout-item-merchant-modern">
                                <i class="fas fa-store"></i> ${this.escapeHtml(item.merchantName)}
                            </div>
                        </div>
                        <div class="checkout-item-total-modern">
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
        if (totalEl) totalEl.textContent = `${(subtotal + shipping).toLocaleString()} دج`;
        
        // تعبئة بيانات المستخدم
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
    async completeOrder() {
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.currentUser);
        
        if (!isLoggedIn) {
            this.showFloatingNotification('يرجى تسجيل الدخول أولاً', 'warning');
            this.closeCheckout();
            if (typeof App !== 'undefined' && App.openLoginModal) {
                App.openLoginModal();
            }
            return;
        }
        
        const customerName = document.getElementById('customerName')?.value.trim();
        const customerPhone = document.getElementById('customerPhone')?.value.trim();
        const customerAddress = document.getElementById('customerAddress')?.value.trim();
        const orderNotes = document.getElementById('orderNotes')?.value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        
        if (!customerName || !customerPhone || !customerAddress) {
            this.showFloatingNotification('يرجى تعبئة جميع البيانات المطلوبة', 'error');
            return;
        }
        
        const phoneRegex = /^0[567]\d{8}$/;
        if (!phoneRegex.test(customerPhone)) {
            this.showFloatingNotification('رقم الهاتف غير صحيح (مثال: 05XXXXXXXX)', 'error');
            return;
        }
        
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shippingPrice = this.updateShippingPrice() || CONFIG.shipping || 200;
        const total = subtotal + shippingPrice;
        const zone = this.detectZone(customerAddress);
        const merchantGroups = this.groupItemsByMerchant();
        const mainOrderNumber = this.generateOrderNumber();
        
        this.showFloatingNotification('📦 جاري إرسال الطلب...', 'info');
        
        // إنشاء طلب في نظام التوصيل
        let deliveryId = null;
        if (typeof Delivery !== 'undefined' && Delivery.createDelivery) {
            try {
                const delivery = Delivery.createDelivery({
                    orderId: mainOrderNumber,
                    customerName: customerName,
                    customerPhone: customerPhone,
                    customerAddress: customerAddress,
                    zone: zone,
                    items: this.items.map(i => ({
                        name: i.name,
                        quantity: i.quantity,
                        price: i.price,
                        merchantId: i.merchantId,
                        merchantName: i.merchantName
                    })),
                    total: total
                });
                deliveryId = delivery.id;
            } catch(e) {
                console.warn('⚠️ فشل إنشاء طلب في نظام التوصيل:', e);
            }
        }
        
        // إرسال رسائل للتجار
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            if (typeof Inventory !== 'undefined' && Inventory.decreaseStock) {
                for (const item of group.items) {
                    try {
                        Inventory.decreaseStock(merchantId, item.productId, item.quantity);
                    } catch(e) {}
                }
            }
            
            const merchantMessage = this.generateMerchantOrderMessage({
                merchant: group,
                customer: { name: customerName, phone: customerPhone, address: customerAddress },
                orderNumber: `${mainOrderNumber}-${merchantId.slice(-4)}`,
                paymentMethod: paymentMethod,
                notes: orderNotes,
                deliveryId: deliveryId,
                zone: zone,
                shippingPrice: shippingPrice
            });
            
            const merchantPhone = this.getMerchantPhoneFromId(merchantId);
            if (merchantPhone) {
                window.open(`https://wa.me/${merchantPhone}?text=${encodeURIComponent(merchantMessage)}`, '_blank');
                await this.sleep(300);
            }
        }
        
        // رسالة للإدارة
        const mainMessage = this.generateMainOrderMessage({
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            orderNumber: mainOrderNumber,
            paymentMethod: paymentMethod,
            notes: orderNotes,
            merchantGroups: merchantGroups,
            subtotal: subtotal,
            shipping: shippingPrice,
            total: total,
            zone: zone,
            deliveryId: deliveryId
        });
        
        const mainPhone = CONFIG.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${mainPhone}?text=${encodeURIComponent(mainMessage)}`, '_blank');
        
        // حفظ الطلب
        this.saveOrder({
            orderNumber: mainOrderNumber,
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            merchantGroups: merchantGroups,
            subtotal: subtotal,
            shipping: shippingPrice,
            total: total,
            notes: orderNotes,
            paymentMethod: paymentMethod,
            zone: zone,
            deliveryId: deliveryId,
            date: new Date().toISOString(),
            status: 'pending'
        });
        
        this.clear();
        this.closeCheckout();
        this.showFloatingNotification(`✅ تم إرسال طلبك بنجاح! رقم الطلب: ${mainOrderNumber}`, 'success');
    },
    
    getMerchantPhoneFromId(merchantId) {
        if (typeof Auth !== 'undefined' && Auth.users) {
            const merchant = Auth.users.find(u => u.userId === merchantId);
            if (merchant && merchant.phone) {
                return merchant.phone.replace(/[^0-9]/g, '');
            }
        }
        return CONFIG.phone.replace(/[^0-9]/g, '');
    },
    
    generateMerchantOrderMessage(data) {
        const { merchant, customer, orderNumber, paymentMethod, notes, deliveryId, zone, shippingPrice } = data;
        
        let message = `🛍️ *طلب جديد - ناردو برو* 🛍️\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📦 *طلب للتاجر:* ${merchant.merchantName}\n`;
        message += `🆔 *رقم الطلب:* ${orderNumber}\n`;
        if (deliveryId) message += `🚚 *رقم التوصيل:* ${deliveryId}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *معلومات العميل:*\n`;
        message += `   📛 الاسم: ${customer.name}\n`;
        message += `   📞 الهاتف: ${customer.phone}\n`;
        message += `   📍 العنوان: ${customer.address}\n`;
        if (zone) message += `   🗺️ المنطقة: ${zone}\n`;
        message += `   💳 الدفع: ${this.getPaymentMethodName(paymentMethod)}\n\n`;
        message += `📦 *المنتجات المطلوبة:*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        merchant.items.forEach(item => {
            message += `• ${item.name}\n`;
            message += `  الكمية: ${item.quantity} × ${item.price.toLocaleString()} دج\n`;
            message += `  المجموع: ${(item.price * item.quantity).toLocaleString()} دج\n`;
            message += `────────────────\n`;
        });
        
        message += `\n💰 *المجموع الفرعي:* ${merchant.subtotal.toLocaleString()} دج\n`;
        if (notes) message += `\n📝 *ملاحظات:*\n${notes}\n`;
        message += `\n⏰ *تاريخ الطلب:* ${new Date().toLocaleString('ar-DZ')}\n`;
        message += `✨ *ناردو برو* ✨`;
        
        return message;
    },
    
    generateMainOrderMessage(data) {
        const { customer, orderNumber, paymentMethod, notes, merchantGroups, subtotal, shipping, total, zone, deliveryId } = data;
        
        let message = `🏪 *طلب جديد - نظام إدارة الطلبات* 🏪\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🆔 *رقم الطلب:* ${orderNumber}\n`;
        if (deliveryId) message += `🚚 *رقم التوصيل:* ${deliveryId}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *معلومات العميل:*\n`;
        message += `   📛 ${customer.name}\n`;
        message += `   📞 ${customer.phone}\n`;
        message += `   📍 ${customer.address}\n`;
        if (zone) message += `   🗺️ ${zone}\n`;
        message += `   💳 ${this.getPaymentMethodName(paymentMethod)}\n\n`;
        message += `📦 *تفاصيل الطلب:*\n`;
        
        let merchantIndex = 1;
        for (const [merchantId, group] of Object.entries(merchantGroups)) {
            message += `\n🏪 التاجر ${merchantIndex}: ${group.merchantName}\n`;
            group.items.forEach(item => {
                message += `   • ${item.name} (${item.quantity} × ${item.price} دج)\n`;
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
    
    getPaymentMethodName(method) {
        const methods = {
            'cash': 'الدفع عند الاستلام',
            'cib': 'الدفع عبر CIB',
            'edahabia': 'الدفع عبر Edahabia'
        };
        return methods[method] || method;
    },
    
    generateOrderNumber() {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `NARD-${timestamp}-${random}`;
    },
    
    saveOrder(order) {
        const orders = Utils.load('nardoo_orders', []);
        orders.unshift(order);
        if (orders.length > 100) orders.pop();
        Utils.save('nardoo_orders', orders);
    },
    
    closeCheckout() {
        const modal = document.getElementById('checkoutModal');
        if (modal) modal.style.display = 'none';
    },
    
    clear() {
        this.items = [];
        this.save();
    },
    
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ===== تهيئة النظام =====
window.Cart = CartSystem;

// دالة toggleCart للاستخدام العام
window.toggleCart = function() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
};

// تهيئة السلة عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartSystem.init());
} else {
    CartSystem.init();
}

console.log('✅ نظام السلة المتكامل بواجهة احترافية جاهز');
النوافذ غير مرتبة 
