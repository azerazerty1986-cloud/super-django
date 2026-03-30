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
    cartSidebar: null,
    isCartOpen: false,
    
    // التهيئة
    init() {
        try {
            // تحميل السلة من التخزين المحلي
            const saved = localStorage.getItem('nardoo_cart');
            if (saved) {
                this.items = JSON.parse(saved);
            } else {
                this.items = [];
            }
            
            // إنشاء واجهة السلة
            this.createCartSidebar();
            this.updateCounter();
            this.addCheckoutModal();
            this.addCartStyles();
            this.attachEventListeners();
            
            console.log('✅ نظام السلة جاهز، عدد العناصر:', this.items.length);
        } catch(e) {
            console.error('خطأ في تهيئة السلة:', e);
            this.items = [];
        }
    },
    
    // إنشاء شريط السلة الجانبي
    createCartSidebar() {
        if (document.getElementById('cartSidebar')) return;
        
        const sidebarHTML = `
        <div id="cartSidebar" class="cart-sidebar">
            <div class="cart-header">
                <div class="cart-header-info">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>سلة التسوق</h3>
                </div>
                <div class="cart-header-actions">
                    <span id="cartItemsCount" class="cart-items-badge">0</span>
                    <button class="close-cart" onclick="CartSystem.toggleCart()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="cart-items" id="cartItems">
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>سلة التسوق فارغة</p>
                    <button class="continue-shopping-btn" onclick="CartSystem.toggleCart()">
                        مواصلة التسوق
                    </button>
                </div>
            </div>
            <div class="cart-footer" style="display: none;">
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>المجموع الفرعي:</span>
                        <span id="cartSubtotal">0 دج</span>
                    </div>
                    <div class="summary-row">
                        <span>رسوم التوصيل:</span>
                        <span id="cartShipping">${CONFIG.shipping} دج</span>
                    </div>
                    <div class="summary-row total">
                        <span>الإجمالي:</span>
                        <span id="cartTotal">0 دج</span>
                    </div>
                </div>
                <button class="checkout-btn" onclick="CartSystem.openCheckout()">
                    <i class="fas fa-credit-card"></i>
                    إتمام الطلب
                </button>
                <button class="clear-cart-btn" onclick="CartSystem.clearCart()">
                    <i class="fas fa-trash-alt"></i>
                    تفريغ السلة
                </button>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
        this.cartSidebar = document.getElementById('cartSidebar');
    },
    
    // تبديل عرض السلة
    toggleCart() {
        if (this.cartSidebar) {
            this.isCartOpen = !this.isCartOpen;
            this.cartSidebar.classList.toggle('active', this.isCartOpen);
            
            if (this.isCartOpen) {
                document.body.style.overflow = 'hidden';
                this.display();
            } else {
                document.body.style.overflow = '';
            }
        }
    },
    
    // إغلاق السلة
    closeCart() {
        if (this.cartSidebar && this.isCartOpen) {
            this.isCartOpen = false;
            this.cartSidebar.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    // إضافة مستمعات الأحداث
    attachEventListeners() {
        // إغلاق السلة عند الضغط على ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isCartOpen) {
                this.closeCart();
            }
        });
        
        // إغلاق السلة عند الضغط خارجها
        document.addEventListener('click', (e) => {
            if (this.isCartOpen && this.cartSidebar && !this.cartSidebar.contains(e.target)) {
                const cartButton = document.getElementById('cartButton');
                if (cartButton && !cartButton.contains(e.target)) {
                    this.closeCart();
                }
            }
        });
        
        // تحديث واجهة السلة عند تغيير البيانات
        window.addEventListener('storage', (e) => {
            if (e.key === 'nardoo_cart') {
                const saved = localStorage.getItem('nardoo_cart');
                this.items = saved ? JSON.parse(saved) : [];
                this.updateCounter();
                this.display();
            }
        });
    },
    
    // إضافة للسلة
    add(product) {
        try {
            // التأكد من وجود المنتج
            if (!product) {
                this.showMessage('المنتج غير موجود', 'error');
                return false;
            }
            
            // التحقق من المخزون
            if (product.stock !== undefined && product.stock <= 0) {
                this.showMessage('المنتج غير متوفر حالياً', 'error');
                return false;
            }
            
            // الحصول على معرف المنتج
            const productId = product.id || product.productId;
            if (!productId) {
                this.showMessage('معرف المنتج غير صالح', 'error');
                return false;
            }
            
            // البحث عن المنتج في السلة
            const existing = this.items.find(i => i.productId === productId);
            
            // الحصول على الصورة
            const productImage = (product.images && product.images[0]) || 
                                product.image || 
                                CONFIG.defaultImage;
            
            if (existing) {
                // زيادة الكمية
                const maxQuantity = product.stock || 999;
                if (existing.quantity < maxQuantity) {
                    existing.quantity++;
                    this.save();
                    this.animateCartIcon();
                    this.showMessage(`✅ تم زيادة كمية ${product.name}`, 'success');
                    return true;
                } else {
                    this.showMessage(`عذراً، الكمية المتاحة ${maxQuantity} فقط`, 'warning');
                    return false;
                }
            } else {
                // إضافة منتج جديد
                this.items.push({
                    productId: productId,
                    name: product.name || 'منتج',
                    price: product.price || 0,
                    quantity: 1,
                    merchantId: product.merchantId || 'unknown',
                    merchantName: product.merchantName || 'المتجر',
                    image: productImage,
                    stock: product.stock || 999,
                    addedAt: Date.now()
                });
                
                this.save();
                this.animateCartIcon();
                this.showMessage(`✅ تم إضافة ${product.name} للسلة`, 'success');
                return true;
            }
        } catch(e) {
            console.error('خطأ في الإضافة:', e);
            this.showMessage('حدث خطأ أثناء الإضافة', 'error');
            return false;
        }
    },
    
    // إضافة منتج من زر في الصفحة
    addFromButton(button) {
        try {
            // البحث عن عنصر المنتج
            const productCard = button.closest('.product-card, .product-item, [data-product-id]');
            if (!productCard) {
                this.showMessage('المنتج غير موجود', 'error');
                return;
            }
            
            // استخراج بيانات المنتج
            const product = {
                id: productCard.dataset.productId || productCard.getAttribute('data-id'),
                name: productCard.querySelector('.product-title, .product-name, h3')?.textContent?.trim(),
                price: this.extractPrice(productCard),
                image: productCard.querySelector('img')?.src,
                stock: productCard.dataset.stock ? parseInt(productCard.dataset.stock) : undefined
            };
            
            if (!product.id) {
                this.showMessage('معرف المنتج غير موجود', 'error');
                return;
            }
            
            this.add(product);
        } catch(e) {
            console.error('خطأ في الإضافة من الزر:', e);
            this.showMessage('حدث خطأ', 'error');
        }
    },
    
    // استخراج السعر من البطاقة
    extractPrice(productCard) {
        const priceElement = productCard.querySelector('.price, .product-price, [data-price]');
        if (priceElement) {
            let price = priceElement.textContent || priceElement.dataset.price;
            price = price.replace(/[^0-9]/g, '');
            return parseInt(price) || 0;
        }
        return 0;
    },
    
    // تحديث الكمية
    update(productId, newQuantity) {
        try {
            if (newQuantity <= 0) {
                this.remove(productId);
                return;
            }
            
            const item = this.items.find(i => i.productId === productId);
            if (item) {
                if (newQuantity <= (item.stock || 999)) {
                    item.quantity = newQuantity;
                    this.save();
                    this.showMessage('🔄 تم تحديث الكمية', 'info');
                } else {
                    this.showMessage(`الكمية المتاحة ${item.stock} فقط`, 'warning');
                }
            }
        } catch(e) {
            console.error('خطأ في التحديث:', e);
        }
    },
    
    // حذف من السلة
    remove(productId) {
        try {
            const item = this.items.find(i => i.productId === productId);
            if (item) {
                this.items = this.items.filter(i => i.productId !== productId);
                this.save();
                this.showMessage(`🗑️ تم حذف ${item.name} من السلة`, 'info');
            }
        } catch(e) {
            console.error('خطأ في الحذف:', e);
        }
    },
    
    // حفظ السلة
    save() {
        try {
            localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
            this.updateCounter();
            this.display();
            
            // تحديث أيقونة السلة في الشريط العلوي
            this.updateCartIcon();
        } catch(e) {
            console.error('خطأ في الحفظ:', e);
        }
    },
    
    // تحديث العداد
    updateCounter() {
        try {
            const totalItems = this.items.reduce((sum, i) => sum + i.quantity, 0);
            
            // تحديث عداد السلة في الشريط العلوي
            const cartCounter = document.getElementById('cartCounter');
            if (cartCounter) {
                cartCounter.textContent = totalItems;
                cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
            }
            
            // تحديث العداد الثابت
            const fixedCartCounter = document.getElementById('fixedCartCounter');
            if (fixedCartCounter) {
                fixedCartCounter.textContent = totalItems;
                fixedCartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
            }
            
            // تحديث العداد في شريط السلة
            const cartItemsCount = document.getElementById('cartItemsCount');
            if (cartItemsCount) {
                cartItemsCount.textContent = totalItems;
            }
        } catch(e) {
            console.error('خطأ في تحديث العداد:', e);
        }
    },
    
    // عرض السلة
    display() {
        try {
            const container = document.getElementById('cartItems');
            const footer = document.querySelector('.cart-footer');
            const emptyCartDiv = container?.querySelector('.empty-cart');
            
            if (!container) return;
            
            if (this.items.length === 0) {
                // عرض رسالة السلة فارغة
                if (emptyCartDiv) {
                    emptyCartDiv.style.display = 'flex';
                } else {
                    container.innerHTML = `
                        <div class="empty-cart">
                            <i class="fas fa-shopping-cart"></i>
                            <p>سلة التسوق فارغة</p>
                            <button class="continue-shopping-btn" onclick="CartSystem.toggleCart()">
                                مواصلة التسوق
                            </button>
                        </div>
                    `;
                }
                
                if (footer) footer.style.display = 'none';
                return;
            }
            
            // إخفاء رسالة السلة فارغة
            if (emptyCartDiv) emptyCartDiv.style.display = 'none';
            
            let subtotal = 0;
            container.innerHTML = this.items.map(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                const productImage = item.image || CONFIG.defaultImage;
                
                return `
                    <div class="cart-item" data-product-id="${item.productId}">
                        <div class="cart-item-image">
                            <img src="${productImage}" 
                                 alt="${this.escapeHtml(item.name)}" 
                                 loading="lazy"
                                 onerror="this.src='${CONFIG.defaultImage}'; this.onerror=null;">
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-title">${this.escapeHtml(item.name)}</div>
                            <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn" onclick="CartSystem.update('${item.productId}', ${item.quantity - 1})">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span>${item.quantity}</span>
                                <button class="quantity-btn" onclick="CartSystem.update('${item.productId}', ${item.quantity + 1})">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="quantity-btn remove-btn" onclick="CartSystem.remove('${item.productId}')">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="cart-item-total">
                            ${itemTotal.toLocaleString()} دج
                        </div>
                    </div>
                `;
            }).join('');
            
            // تحديث المجاميع
            const shipping = CONFIG.shipping || 200;
            const total = subtotal + shipping;
            
            const subtotalEl = document.getElementById('cartSubtotal');
            const totalEl = document.getElementById('cartTotal');
            
            if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()} دج`;
            if (totalEl) totalEl.textContent = `${total.toLocaleString()} دج`;
            
            // عرض الفوتر
            if (footer) footer.style.display = 'block';
        } catch(e) {
            console.error('خطأ في عرض السلة:', e);
        }
    },
    
    // تفريغ السلة
    clearCart() {
        if (confirm('هل أنت متأكد من تفريغ السلة بالكامل؟')) {
            this.items = [];
            this.save();
            this.showMessage('🗑️ تم تفريغ السلة', 'info');
        }
    },
    
    // تحديث أيقونة السلة
    updateCartIcon() {
        const totalItems = this.items.reduce((sum, i) => sum + i.quantity, 0);
        const cartIcon = document.querySelector('.cart-icon, .shopping-cart-icon');
        
        if (cartIcon && totalItems > 0) {
            cartIcon.classList.add('has-items');
        } else if (cartIcon) {
            cartIcon.classList.remove('has-items');
        }
    },
    
    // تحريك أيقونة السلة
    animateCartIcon() {
        const cartIcon = document.querySelector('.cart-icon, .shopping-cart-icon, #cartButton');
        if (cartIcon) {
            cartIcon.classList.add('cart-bump');
            setTimeout(() => {
                cartIcon.classList.remove('cart-bump');
            }, 300);
        }
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
                            <p>يرجى <a href="#" onclick="CartSystem.showLogin(); return false;">تسجيل الدخول</a> لإكمال الطلب</p>
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
                                       autocomplete="name"
                                       required>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-phone-alt"></i>
                                    <span>رقم الهاتف</span>
                                </label>
                                <input type="tel" id="customerPhone" 
                                       placeholder="أدخل رقم هاتفك" 
                                       class="form-control"
                                       autocomplete="tel"
                                       required>
                                <small class="form-hint">مثال: 05XXXXXXXX أو 06XXXXXXXX</small>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>عنوان التوصيل</span>
                                </label>
                                <textarea id="customerAddress" 
                                          rows="3" 
                                          placeholder="أدخل عنوان التوصيل بالتفصيل (الولاية، البلدية، الحي، الشارع، رقم البيت)"
                                          class="form-control"
                                          required></textarea>
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
    
    // فتح نافذة تسجيل الدخول
    showLogin() {
        this.closeCheckout();
        if (typeof openLoginModal === 'function') {
            openLoginModal();
        } else {
            this.showMessage('يرجى تسجيل الدخول أولاً', 'warning');
        }
    },
    
    // فتح نافذة إتمام الطلب
    openCheckout() {
        try {
            if (this.items.length === 0) {
                this.showMessage('السلة فارغة، أضف منتجات أولاً', 'warning');
                return;
            }
            
            const modal = document.getElementById('checkoutModal');
            if (modal) {
                modal.style.display = 'flex';
                this.populateCheckoutModal();
            } else {
                this.showMessage('نافذة الطلب غير متاحة', 'error');
            }
        } catch(e) {
            console.error('خطأ في فتح النافذة:', e);
            this.showMessage('حدث خطأ', 'error');
        }
    },
    
    // تعبئة بيانات نافذة إتمام الطلب
    populateCheckoutModal() {
        try {
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
                                     alt="${this.escapeHtml(item.name)}" 
                                     loading="lazy"
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
            
            // التحقق من تسجيل الدخول
            const isLoggedIn = (typeof Auth !== 'undefined' && Auth.currentUser);
            
            const loginRequiredMsg = document.getElementById('loginRequiredMsg');
            const customerFormFields = document.getElementById('customerFormFields');
            
            if (isLoggedIn && Auth.currentUser) {
                const nameInput = document.getElementById('customerName');
                const phoneInput = document.getElementById('customerPhone');
                
                if (nameInput) nameInput.value = Auth.currentUser.name || '';
                if (phoneInput) phoneInput.value = Auth.currentUser.phone || '';
                
                if (loginRequiredMsg) loginRequiredMsg.style.display = 'none';
                if (customerFormFields) customerFormFields.style.display = 'block';
            } else {
                if (loginRequiredMsg) loginRequiredMsg.style.display = 'flex';
                if (customerFormFields) customerFormFields.style.display = 'none';
            }
        } catch(e) {
            console.error('خطأ في تعبئة النافذة:', e);
        }
    },
    
    // إتمام الطلب
    completeOrder() {
        try {
            // التحقق من تسجيل الدخول
            const isLoggedIn = (typeof Auth !== 'undefined' && Auth.currentUser);
            
            if (!isLoggedIn) {
                this.showMessage('يرجى تسجيل الدخول أولاً', 'warning');
                this.closeCheckout();
                this.showLogin();
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
                this.showMessage('يرجى تعبئة جميع البيانات المطلوبة', 'error');
                return;
            }
            
            // التحقق من صحة رقم الهاتف
            const phoneRegex = /^0[567]\d{8}$/;
            if (!phoneRegex.test(customerPhone)) {
                this.showMessage('رقم الهاتف غير صحيح (مثال: 05XXXXXXXX أو 06XXXXXXXX)', 'error');
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
            
            const orderNumber = this.generateOrderNumber();
            message += `\n⏰ *تاريخ الطلب:* ${new Date().toLocaleString('ar-DZ')}\n`;
            message += `🆔 *رقم الطلب:* ${orderNumber}\n`;
            
            // فتح واتساب
            const phoneNumber = CONFIG.phone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            
            // حفظ الطلب
            this.saveOrder({
                orderNumber: orderNumber,
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
            this.closeCart();
            
            // عرض رسالة نجاح
            this.showMessage('✅ تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
            
        } catch(e) {
            console.error('خطأ في إتمام الطلب:', e);
            this.showMessage('حدث خطأ أثناء إرسال الطلب', 'error');
        }
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
        try {
            const orders = localStorage.getItem('nardoo_orders');
            const ordersList = orders ? JSON.parse(orders) : [];
            ordersList.unshift(order);
            if (ordersList.length > 100) ordersList.pop();
            localStorage.setItem('nardoo_orders', JSON.stringify(ordersList));
        } catch(e) {
            console.error('خطأ في حفظ الطلب:', e);
        }
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
    
    // عرض رسالة
    showMessage(message, type = 'info') {
        try {
            // استخدام نظام الإشعارات العالمي إذا وجد
            if (typeof window.showNotification === 'function') {
                window.showNotification(message, type);
                return;
            }
            
            // إنشاء رسالة منبثقة مخصصة
            const toast = document.createElement('div');
            toast.className = `custom-toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="fas ${this.getToastIcon(type)}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#ff9800'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 1000000;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease;
                direction: rtl;
            `;
            
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        } catch(e) {
            console.log(message);
        }
    },
    
    // الحصول على أيقونة الإشعار
    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    },
    
    // إضافة أنماط CSS
    addCartStyles() {
        if (document.getElementById('cart-system-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cart-system-styles';
        styles.textContent = `
        /* أنماط السلة الجانبية */
        .cart-sidebar {
            position: fixed;
            top: 0;
            left: -400px;
            width: 380px;
            height: 100vh;
            background: var(--bg-primary, #fff);
            box-shadow: -5px 0 25px rgba(0,0,0,0.2);
            z-index: 10001;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
        
        .cart-header-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .cart-header-info i {
            font-size: 24px;
        }
        
        .cart-header-info h3 {
            margin: 0;
            font-size: 20px;
        }
        
        .cart-header-actions {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .cart-items-badge {
            background: rgba(255,255,255,0.2);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 14px;
        }
        
        .close-cart {
            cursor: pointer;
            font-size: 20px;
            transition: transform 0.3s;
            background: none;
            border: none;
            color: white;
        }
        
        .close-cart:hover {
            transform: rotate(90deg);
        }
        
        .cart-items {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        
        .empty-cart {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-cart i {
            font-size: 60px;
            color: var(--gold, #D4AF37);
            margin-bottom: 20px;
        }
        
        .empty-cart p {
            color: var(--text-secondary, #666);
            margin-bottom: 20px;
        }
        
        .continue-shopping-btn {
            background: var(--gold, #D4AF37);
            border: none;
            padding: 10px 25px;
            border-radius: 25px;
            cursor: pointer;
            color: white;
            transition: all 0.3s;
        }
        
        .continue-shopping-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(212,175,55,0.3);
        }
        
        .cart-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            margin-bottom: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border: 1px solid rgba(212,175,55,0.2);
            transition: all 0.3s;
        }
        
        .cart-item:hover {
            transform: translateX(-5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        .quantity-btn:hover {
            background: #D4AF37;
            color: white;
            transform: scale(1.05);
        }
        
        .remove-btn {
            background: rgba(248,113,113,0.2);
            color: #f87171;
        }
        
        .remove-btn:hover {
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
        
        .cart-summary {
            margin-bottom: 20px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        
        .summary-row.total {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #D4AF37;
            font-size: 18px;
            font-weight: 700;
            color: #D4AF37;
        }
        
        .checkout-btn, .clear-cart-btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .checkout-btn {
            background: linear-gradient(135deg, #D4AF37, #B8860B);
            color: white;
        }
        
        .checkout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(212,175,55,0.3);
        }
        
        .clear-cart-btn {
            background: #f0f0f0;
            color: #666;
        }
        
        .clear-cart-btn:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
        }
        
        /* تحريك أيقونة السلة */
        @keyframes cartBump {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        
        .cart-bump {
            animation: cartBump 0.3s ease;
        }
        
        /* أنماط النافذة المنبثقة */
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        /* أنماط نافذة إتمام الطلب (مستمرة) */
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
            font-family: inherit;
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
            cursor: pointer;
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
    
    // تفريغ النص من HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== تهيئة النظام =====
window.Cart = CartSystem;

// تهيئة السلة عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CartSystem.init();
        console.log('✅ نظام السلة متكامل وجاهز للعمل');
    });
} else {
    CartSystem.init();
    console.log('✅ نظام السلة متكامل وجاهز للعمل');
}

// إضافة دوال مساعدة للوصول من أي مكان
window.addToCart = function(product) {
    return CartSystem.add(product);
};

window.openCart = function() {
    CartSystem.toggleCart();
};

window.closeCart = function() {
    CartSystem.closeCart();
};

// تفعيل أزرار الإضافة التلقائية
document.addEventListener('DOMContentLoaded', () => {
    // إضافة مستمعات لأزرار الإضافة
    const addButtons = document.querySelectorAll('.add-to-cart-btn, [data-add-to-cart]');
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            CartSystem.addFromButton(button);
        });
    });
});
