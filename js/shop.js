/* ================================================================== */
/* ===== [05] shop.js - نظام المتجر المتكامل ===== */
/* ===== مع دعم السلة، الطلبات، الدفع، والتواصل ===== */
/* ===== متوافق مع telegram.js ونظام الريلز ===== */
/* ================================================================== */

// ===== [5.1] نظام السلة المتقدم =====
const CartSystem = {
    items: [],
    
    // تهيئة السلة
    init() {
        const saved = localStorage.getItem('nardoo_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        this.updateUI();
        return this;
    },
    
    // إضافة منتج للسلة
    add(product, quantity = 1) {
        if (!product) return false;
        
        // التحقق من الكمية المتوفرة
        if (product.stock && product.stock < quantity) {
            showNotification(`⚠️ الكمية المتوفرة من ${product.name} هي ${product.stock} فقط`, 'warning');
            return false;
        }
        
        const existing = this.items.find(item => item.id === product.id);
        
        if (existing) {
            const newQty = existing.quantity + quantity;
            if (product.stock && product.stock < newQty) {
                showNotification(`⚠️ لا يمكن إضافة كمية أكبر من المتوفرة (${product.stock})`, 'warning');
                return false;
            }
            existing.quantity = newQty;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.images?.[0] || null,
                merchantName: product.merchantName || 'ناردو برو',
                maxStock: product.stock || 999
            });
        }
        
        this.save();
        showNotification(`✅ تم إضافة ${product.name} إلى السلة`, 'success');
        return true;
    },
    
    // إزالة منتج من السلة
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            showNotification(`🗑️ تم إزالة ${removed.name} من السلة`, 'info');
            this.updateUI();
            return true;
        }
        return false;
    },
    
    // تحديث كمية منتج
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id == productId);
        if (item) {
            if (quantity <= 0) {
                return this.remove(productId);
            }
            
            // التحقق من الحد الأقصى
            if (item.maxStock && quantity > item.maxStock) {
                showNotification(`⚠️ الكمية المتوفرة من ${item.name} هي ${item.maxStock} فقط`, 'warning');
                quantity = item.maxStock;
            }
            
            item.quantity = quantity;
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    },
    
    // حساب الإجمالي
    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // حساب عدد العناصر
    getItemCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    // تفريغ السلة
    clear() {
        this.items = [];
        this.save();
        this.updateUI();
        showNotification('🛒 تم تفريغ السلة', 'info');
    },
    
    // حفظ السلة
    save() {
        localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
        this.updateCounters();
    },
    
    // تحديث العدادات في الواجهة
    updateCounters() {
        const count = this.getItemCount();
        const cartCounter = document.getElementById('cartCounter');
        const fixedCartCounter = document.getElementById('fixedCartCounter');
        
        if (cartCounter) cartCounter.textContent = count;
        if (fixedCartCounter) fixedCartCounter.textContent = count;
    },
    
    // تحديث واجهة السلة المنبثقة
    updateUI() {
        this.updateCounters();
        this.renderCartSidebar();
    },
    
    // عرض السلة الجانبية
    renderCartSidebar() {
        let sidebar = document.getElementById('cartSidebar');
        
        if (!sidebar) {
            sidebar = document.createElement('div');
            sidebar.id = 'cartSidebar';
            sidebar.className = 'cart-sidebar';
            sidebar.innerHTML = `
                <div class="cart-sidebar-header">
                    <h3><i class="fas fa-shopping-cart"></i> سلة التسوق</h3>
                    <button class="cart-close" onclick="CartSystem.toggleSidebar()">&times;</button>
                </div>
                <div class="cart-sidebar-items"></div>
                <div class="cart-sidebar-footer">
                    <div class="cart-total">
                        <span>المجموع:</span>
                        <span class="total-amount">0 دج</span>
                    </div>
                    <button class="btn-gold checkout-btn" onclick="CartSystem.checkout()">
                        <i class="fas fa-credit-card"></i> إتمام الشراء
                    </button>
                    <button class="btn-outline-gold" onclick="CartSystem.clear()">
                        <i class="fas fa-trash"></i> تفريغ السلة
                    </button>
                </div>
            `;
            document.body.appendChild(sidebar);
        }
        
        const itemsContainer = sidebar.querySelector('.cart-sidebar-items');
        const totalSpan = sidebar.querySelector('.total-amount');
        
        if (this.items.length === 0) {
            itemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket"></i>
                    <p>سلة التسوق فارغة</p>
                    <small>أضف بعض المنتجات الرائعة!</small>
                </div>
            `;
            totalSpan.textContent = '0 دج';
            return;
        }
        
        itemsContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image ? `<img src="${item.image}" onerror="this.src='https://via.placeholder.com/60/2c5e4f/ffffff?text=نكهة'">` : '<i class="fas fa-box"></i>'}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                    <div class="cart-item-merchant"><i class="fas fa-store"></i> ${escapeHtml(item.merchantName)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="CartSystem.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="cart-remove" onclick="CartSystem.remove(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        totalSpan.textContent = this.getTotal().toLocaleString() + ' دج';
    },
    
    // تبديل عرض السلة الجانبية
    toggleSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },
    
    // إتمام عملية الشراء
    async checkout() {
        if (this.items.length === 0) {
            showNotification('🛒 سلة التسوق فارغة', 'warning');
            return;
        }
        
        // التحقق من تسجيل الدخول
        if (!isAuthenticated && typeof isAuthenticated !== 'undefined') {
            showNotification('🔐 الرجاء تسجيل الدخول لإتمام الشراء', 'warning');
            openLoginModal();
            return;
        }
        
        // فتح نافذة الطلب
        this.showCheckoutModal();
    },
    
    // عرض نافذة إتمام الطلب
    showCheckoutModal() {
        let modal = document.getElementById('checkoutModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'checkoutModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-list"></i> إتمام الطلب</h2>
                        <button class="close-btn" onclick="closeModal('checkoutModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="checkoutForm" onsubmit="event.preventDefault(); CartSystem.submitOrder();">
                            <div class="form-group">
                                <label><i class="fas fa-user"></i> الاسم الكامل</label>
                                <input type="text" class="form-control" id="customerName" required placeholder="أدخل اسمك الكامل">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-phone"></i> رقم الهاتف</label>
                                <input type="tel" class="form-control" id="customerPhone" required placeholder="05XXXXXXXX">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-map-marker-alt"></i> عنوان التوصيل</label>
                                <textarea class="form-control" id="customerAddress" rows="3" required placeholder="العنوان الكامل، الولاية، البلدية..."></textarea>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-comment"></i> ملاحظات إضافية (اختياري)</label>
                                <textarea class="form-control" id="orderNotes" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
                            </div>
                            
                            <div class="order-summary">
                                <h4>ملخص الطلب</h4>
                                <div id="orderSummaryItems"></div>
                                <div class="order-total">
                                    <strong>الإجمالي:</strong>
                                    <strong id="orderTotalAmount">0 دج</strong>
                                </div>
                            </div>
                            
                            <div class="payment-methods">
                                <h4>طريقة الدفع</h4>
                                <label class="payment-method">
                                    <input type="radio" name="paymentMethod" value="cash" checked>
                                    <i class="fas fa-money-bill-wave"></i> الدفع عند الاستلام
                                </label>
                                <label class="payment-method">
                                    <input type="radio" name="paymentMethod" value="card">
                                    <i class="fas fa-credit-card"></i> بطاقة ائتمان
                                </label>
                                <label class="payment-method">
                                    <input type="radio" name="paymentMethod" value="cib">
                                    <i class="fas fa-building-columns"></i> تحويل بنكي (CIB)
                                </label>
                            </div>
                            
                            <button type="submit" class="btn-gold" style="width: 100%; margin-top: 20px;">
                                <i class="fas fa-check-circle"></i> تأكيد الطلب
                            </button>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // تحديث ملخص الطلب
        const summaryContainer = document.getElementById('orderSummaryItems');
        const totalSpan = document.getElementById('orderTotalAmount');
        
        if (summaryContainer) {
            summaryContainer.innerHTML = this.items.map(item => `
                <div class="order-item">
                    <span>${escapeHtml(item.name)} × ${item.quantity}</span>
                    <span>${(item.price * item.quantity).toLocaleString()} دج</span>
                </div>
            `).join('');
        }
        
        if (totalSpan) {
            totalSpan.textContent = this.getTotal().toLocaleString() + ' دج';
        }
        
        modal.style.display = 'flex';
    },
    
    // تقديم الطلب
    async submitOrder() {
        const name = document.getElementById('customerName')?.value.trim();
        const phone = document.getElementById('customerPhone')?.value.trim();
        const address = document.getElementById('customerAddress')?.value.trim();
        const notes = document.getElementById('orderNotes')?.value.trim() || '';
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
        
        if (!name || !phone || !address) {
            showNotification('❌ الرجاء تعبئة جميع الحقول المطلوبة', 'error');
            return;
        }
        
        // التحقق من رقم الهاتف
        const phoneRegex = /^(05|06|07)[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            showNotification('❌ رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05، 06، أو 07)', 'error');
            return;
        }
        
        const order = {
            id: 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            customer: { name, phone, address, notes },
            items: [...this.items],
            total: this.getTotal(),
            paymentMethod: paymentMethod,
            status: 'pending',
            createdAt: new Date().toISOString(),
            statusHistory: [{ status: 'pending', date: new Date().toISOString(), note: 'تم استلام الطلب' }]
        };
        
        // حفظ الطلب محلياً
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        orders.unshift(order);
        localStorage.setItem('nardoo_orders', JSON.stringify(orders));
        
        // إرسال الطلب إلى تليجرام
        await this.sendOrderToTelegram(order);
        
        // تفريغ السلة
        this.clear();
        
        // إغلاق النوافذ
        closeModal('checkoutModal');
        this.toggleSidebar();
        
        // عرض رسالة نجاح
        showNotification(`✅ تم استلام طلبك رقم ${order.id} بنجاح! سنتواصل معك قريباً`, 'success');
        
        // إعادة توجيه إلى صفحة الطلبات (اختياري)
        setTimeout(() => {
            if (confirm('هل تريد عرض تفاصيل طلبك؟')) {
                this.showOrderDetails(order.id);
            }
        }, 1000);
    },
    
    // إرسال الطلب إلى تليجرام
    async sendOrderToTelegram(order) {
        if (typeof TELEGRAM === 'undefined') {
            console.log('⚠️ نظام تليجرام غير متاح');
            return;
        }
        
        try {
            const itemsList = order.items.map(item => 
                `📦 ${item.name} × ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} دج`
            ).join('\n');
            
            const message = `🛒 *طلب جديد #${order.id}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${order.customer.name}
📞 *الهاتف:* ${order.customer.phone}
📍 *العنوان:* ${order.customer.address}
${order.customer.notes ? `📝 *ملاحظات:* ${order.customer.notes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━
*المنتجات:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
💰 *الإجمالي:* ${order.total.toLocaleString()} دج
💳 *طريقة الدفع:* ${this.getPaymentMethodName(order.paymentMethod)}
📅 *التاريخ:* ${new Date(order.createdAt).toLocaleString('ar-EG')}
━━━━━━━━━━━━━━━━━━━━━━
✅ يرجى التواصل مع العميل لتأكيد الطلب`;
            
            const url = `${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`;
            const response = await fetch(url, {
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
                console.log('✅ تم إرسال الطلب إلى تليجرام');
            }
        } catch (error) {
            console.error('❌ فشل إرسال الطلب إلى تليجرام:', error);
        }
    },
    
    // الحصول على اسم طريقة الدفع
    getPaymentMethodName(method) {
        const methods = {
            'cash': 'الدفع عند الاستلام',
            'card': 'بطاقة ائتمان',
            'cib': 'تحويل بنكي CIB'
        };
        return methods[method] || method;
    },
    
    // عرض تفاصيل الطلب
    showOrderDetails(orderId) {
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        const order = orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        let modal = document.getElementById('orderDetailModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'orderDetailModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const statusColors = {
            pending: '#fbbf24',
            processing: '#60a5fa',
            shipped: '#8b5cf6',
            delivered: '#4ade80',
            cancelled: '#f87171'
        };
        
        const statusNames = {
            pending: 'قيد الانتظار',
            processing: 'قيد المعالجة',
            shipped: 'تم الشحن',
            delivered: 'تم التوصيل',
            cancelled: 'ملغي'
        };
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-receipt"></i> تفاصيل الطلب #${order.id}</h2>
                    <button class="close-btn" onclick="closeModal('orderDetailModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-status-badge" style="background: ${statusColors[order.status]};">
                        ${statusNames[order.status]}
                    </div>
                    
                    <div class="order-info-section">
                        <h4><i class="fas fa-user"></i> معلومات العميل</h4>
                        <p><strong>الاسم:</strong> ${escapeHtml(order.customer.name)}</p>
                        <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                        <p><strong>العنوان:</strong> ${escapeHtml(order.customer.address)}</p>
                        ${order.customer.notes ? `<p><strong>ملاحظات:</strong> ${escapeHtml(order.customer.notes)}</p>` : ''}
                    </div>
                    
                    <div class="order-info-section">
                        <h4><i class="fas fa-box"></i> المنتجات</h4>
                        ${order.items.map(item => `
                            <div class="order-item-detail">
                                <span>${escapeHtml(item.name)} × ${item.quantity}</span>
                                <span>${(item.price * item.quantity).toLocaleString()} دج</span>
                            </div>
                        `).join('')}
                        <div class="order-total-detail">
                            <strong>الإجمالي:</strong>
                            <strong>${order.total.toLocaleString()} دج</strong>
                        </div>
                    </div>
                    
                    <div class="order-info-section">
                        <h4><i class="fas fa-credit-card"></i> طريقة الدفع</h4>
                        <p>${this.getPaymentMethodName(order.paymentMethod)}</p>
                    </div>
                    
                    <div class="order-info-section">
                        <h4><i class="fas fa-history"></i> سجل الحالة</h4>
                        ${order.statusHistory.map(h => `
                            <div class="status-history-item">
                                <span class="status-date">${new Date(h.date).toLocaleString('ar-EG')}</span>
                                <span class="status-note">${h.note}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn-gold" onclick="closeModal('orderDetailModal')" style="width: 100%;">
                        <i class="fas fa-check"></i> إغلاق
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    },
    
    // عرض جميع الطلبات (للمدير)
    showAllOrders() {
        if (!isAuthenticated && typeof isAuthenticated !== 'undefined') {
            showNotification('🔐 هذه الصفحة للمدير فقط', 'warning');
            return;
        }
        
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        
        if (orders.length === 0) {
            showNotification('📭 لا توجد طلبات حتى الآن', 'info');
            return;
        }
        
        let modal = document.getElementById('allOrdersModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'allOrdersModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content modal-lg" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-clipboard-list"></i> جميع الطلبات</h2>
                    <button class="close-btn" onclick="closeModal('allOrdersModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${orders.map(order => `
                        <div class="order-card" onclick="CartSystem.showOrderDetails('${order.id}')" style="cursor: pointer;">
                            <div class="order-card-header">
                                <span class="order-id">#${order.id}</span>
                                <span class="order-date">${new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                            </div>
                            <div class="order-card-body">
                                <div><i class="fas fa-user"></i> ${escapeHtml(order.customer.name)}</div>
                                <div><i class="fas fa-phone"></i> ${order.customer.phone}</div>
                                <div><i class="fas fa-box"></i> ${order.items.length} منتج</div>
                                <div><i class="fas fa-money-bill"></i> ${order.total.toLocaleString()} دج</div>
                            </div>
                            <div class="order-card-footer">
                                <span class="order-status">${this.getOrderStatusName(order.status)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    },
    
    // الحصول على اسم حالة الطلب
    getOrderStatusName(status) {
        const names = {
            pending: 'قيد الانتظار',
            processing: 'قيد المعالجة',
            shipped: 'تم الشحن',
            delivered: 'تم التوصيل',
            cancelled: 'ملغي'
        };
        return names[status] || status;
    }
};

// ===== [5.2] نظام المفضلة =====
const WishlistSystem = {
    items: [],
    
    init() {
        const saved = localStorage.getItem('nardoo_wishlist');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        return this;
    },
    
    add(product) {
        if (this.items.some(item => item.id === product.id)) {
            showNotification(`${product.name} موجود بالفعل في المفضلة`, 'info');
            return false;
        }
        
        this.items.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || null,
            merchantName: product.merchantName
        });
        
        this.save();
        showNotification(`❤️ تم إضافة ${product.name} إلى المفضلة`, 'success');
        return true;
    },
    
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            showNotification(`💔 تم إزالة ${removed.name} من المفضلة`, 'info');
            return true;
        }
        return false;
    },
    
    toggle(product) {
        if (this.items.some(item => item.id === product.id)) {
            this.remove(product.id);
            return false;
        } else {
            this.add(product);
            return true;
        }
    },
    
    isInWishlist(productId) {
        return this.items.some(item => item.id == productId);
    },
    
    save() {
        localStorage.setItem('nardoo_wishlist', JSON.stringify(this.items));
    },
    
    showWishlist() {
        if (this.items.length === 0) {
            showNotification('❤️ لا توجد منتجات في المفضلة', 'info');
            return;
        }
        
        let modal = document.getElementById('wishlistModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wishlistModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-heart"></i> قائمة المفضلة</h2>
                    <button class="close-btn" onclick="closeModal('wishlistModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.items.map(item => `
                        <div class="wishlist-item">
                            <div class="wishlist-item-image">
                                ${item.image ? `<img src="${item.image}" onerror="this.src='https://via.placeholder.com/60/2c5e4f/ffffff?text=نكهة'">` : '<i class="fas fa-box"></i>'}
                            </div>
                            <div class="wishlist-item-info">
                                <div class="wishlist-item-title">${escapeHtml(item.name)}</div>
                                <div class="wishlist-item-price">${item.price.toLocaleString()} دج</div>
                                <div class="wishlist-item-merchant"><i class="fas fa-store"></i> ${escapeHtml(item.merchantName)}</div>
                            </div>
                            <div class="wishlist-item-actions">
                                <button class="btn-gold-small" onclick="viewProductDetails(${item.id}); closeModal('wishlistModal')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-danger-small" onclick="WishlistSystem.remove(${item.id}); this.closest('.wishlist-item').remove(); if(WishlistSystem.items.length===0) closeModal('wishlistModal')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
};

// ===== [5.3] نظام التقييمات والمراجعات =====
const ReviewSystem = {
    // إضافة تقييم
    addReview(productId, rating, comment, userName) {
        if (!rating || rating < 1 || rating > 5) {
            showNotification('❌ الرجاء اختيار تقييم من 1 إلى 5 نجوم', 'error');
            return false;
        }
        
        const reviews = this.getProductReviews(productId);
        
        const newReview = {
            id: Date.now(),
            productId: productId,
            rating: rating,
            comment: comment || '',
            userName: userName || 'مستخدم',
            date: new Date().toISOString(),
            helpful: 0
        };
        
        reviews.push(newReview);
        localStorage.setItem(`nardoo_reviews_${productId}`, JSON.stringify(reviews));
        
        // تحديث متوسط التقييم للمنتج
        this.updateProductRating(productId);
        
        showNotification('⭐ تم إضافة تقييمك بنجاح!', 'success');
        return true;
    },
    
    // الحصول على تقييمات المنتج
    getProductReviews(productId) {
        const saved = localStorage.getItem(`nardoo_reviews_${productId}`);
        return saved ? JSON.parse(saved) : [];
    },
    
    // حساب متوسط التقييم
    getAverageRating(productId) {
        const reviews = this.getProductReviews(productId);
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return sum / reviews.length;
    },
    
    // تحديث تقييم المنتج في localStorage
    updateProductRating(productId) {
        const avg = this.getAverageRating(productId);
        if (avg > 0 && products && products.length > 0) {
            const productIndex = products.findIndex(p => p.id == productId);
            if (productIndex !== -1) {
                products[productIndex].rating = avg;
                localStorage.setItem('nardoo_products', JSON.stringify(products));
                displayProducts();
            }
        }
    },
    
    // عرض نافذة التقييم
    showReviewModal(product) {
        let modal = document.getElementById('reviewModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reviewModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-star"></i> تقييم المنتج</h2>
                        <button class="close-btn" onclick="closeModal('reviewModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h3 id="reviewProductName"></h3>
                        <div class="rating-input">
                            <label>تقييمك:</label>
                            <div class="stars-input" id="starsInput">
                                ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}" onclick="ReviewSystem.setRating(${i})"></i>`).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label>تعليقك (اختياري):</label>
                            <textarea id="reviewComment" class="form-control" rows="3" placeholder="شاركنا رأيك بالمنتج..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>اسمك:</label>
                            <input type="text" id="reviewerName" class="form-control" placeholder="اسمك (اختياري)">
                        </div>
                        <button class="btn-gold" onclick="ReviewSystem.submitReview(${product.id})" style="width: 100%;">
                            <i class="fas fa-paper-plane"></i> إرسال التقييم
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        document.getElementById('reviewProductName').textContent = product.name;
        document.getElementById('reviewComment').value = '';
        document.getElementById('reviewerName').value = '';
        this.currentRating = 0;
        this.updateStarsDisplay();
        
        modal.style.display = 'flex';
    },
    
    currentRating: 0,
    
    setRating(rating) {
        this.currentRating = rating;
        this.updateStarsDisplay();
    },
    
    updateStarsDisplay() {
        const stars = document.querySelectorAll('#starsInput i');
        stars.forEach((star, index) => {
            if (index < this.currentRating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    },
    
    submitReview(productId) {
        if (this.currentRating === 0) {
            showNotification('❌ الرجاء اختيار عدد النجوم', 'error');
            return;
        }
        
        const comment = document.getElementById('reviewComment')?.value || '';
        const userName = document.getElementById('reviewerName')?.value || 'مستخدم';
        
        this.addReview(productId, this.currentRating, comment, userName);
        closeModal('reviewModal');
        
        // عرض التقييمات بعد الإضافة
        this.showProductReviews(productId);
    },
    
    // عرض تقييمات المنتج
    showProductReviews(productId) {
        const product = products?.find(p => p.id == productId);
        if (!product) return;
        
        const reviews = this.getProductReviews(productId);
        
        let modal = document.getElementById('reviewsModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reviewsModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const avgRating = this.getAverageRating(productId);
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-star"></i> تقييمات ${escapeHtml(product.name)}</h2>
                    <button class="close-btn" onclick="closeModal('reviewsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="reviews-summary">
                        <div class="average-rating">
                            <span class="avg-value">${avgRating.toFixed(1)}</span>
                            <div class="stars">${generateStars(avgRating)}</div>
                            <span class="review-count">(${reviews.length} تقييم)</span>
                        </div>
                    </div>
                    
                    <div class="reviews-list">
                        ${reviews.length === 0 ? '<p class="no-reviews">لا توجد تقييمات بعد. كن أول من يقيم هذا المنتج!</p>' : 
                            reviews.slice().reverse().map(review => `
                                <div class="review-item">
                                    <div class="review-header">
                                        <strong>${escapeHtml(review.userName)}</strong>
                                        <div class="review-stars">${generateStars(review.rating)}</div>
                                        <span class="review-date">${new Date(review.date).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                    ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ''}
                                </div>
                            `).join('')
                        }
                    </div>
                    
                    <button class="btn-gold" onclick="ReviewSystem.showReviewModal(${productId}); closeModal('reviewsModal')" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-plus"></i> أضف تقييمك
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
};

// ===== [5.4] تحديث واجهة المنتج لإضافة أزرار جديدة =====
// تعديل دالة displayProducts الأصلية لإضافة أزرار المفضلة والتقييم
const originalDisplayProducts = displayProducts;
window.displayProducts = function() {
    if (originalDisplayProducts) {
        originalDisplayProducts();
    }
    
    // إضافة مستمعي الأحداث لأزرار المفضلة بعد عرض المنتجات
    setTimeout(() => {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.removeEventListener('click', handleWishlistClick);
            btn.addEventListener('click', handleWishlistClick);
        });
        
        document.querySelectorAll('.review-btn').forEach(btn => {
            btn.removeEventListener('click', handleReviewClick);
            btn.addEventListener('click', handleReviewClick);
        });
    }, 100);
};

function handleWishlistClick(e) {
    e.stopPropagation();
    const productId = this.dataset.id;
    const product = products?.find(p => p.id == productId);
    if (product) {
        WishlistSystem.toggle(product);
        // تحديث مظهر الزر
        const icon = this.querySelector('i');
        if (WishlistSystem.isInWishlist(productId)) {
            icon.className = 'fas fa-heart';
            this.style.color = 'var(--gold)';
        } else {
            icon.className = 'far fa-heart';
            this.style.color = '';
        }
    }
}

function handleReviewClick(e) {
    e.stopPropagation();
    const productId = this.dataset.id;
    const product = products?.find(p => p.id == productId);
    if (product) {
        ReviewSystem.showReviewModal(product);
    }
}

// تعديل دالة عرض المنتج لتشمل الأزرار الجديدة
const originalViewProductDetails = viewProductDetails;
window.viewProductDetails = function(productId) {
    const product = products?.find(p => p.id == productId);
    if (!product) return;
    
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    const isInWishlist = WishlistSystem.isInWishlist(productId);
    const avgRating = ReviewSystem.getAverageRating(productId);
    const reviewCount = ReviewSystem.getProductReviews(productId).length;
    
    content.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${escapeHtml(product.name)}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; flex-wrap: wrap;">
                <div>
                    <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
                </div>
                <div>
                    <p>🆔 المعرف: ${product.id}</p>
                    <p>👤 الناشر: ${escapeHtml(product.merchantName)}</p>
                    <p>${product.description || 'منتج عالي الجودة'}</p>
                    
                    <div class="product-rating" style="margin: 20px 0;">
                        <div class="stars-container">${generateStars(avgRating || 4.5)}</div>
                        <span>${(avgRating || 4.5).toFixed(1)}</span>
                        <span style="font-size: 12px;">(${reviewCount} تقييم)</span>
                        <button class="review-link-btn" onclick="ReviewSystem.showProductReviews(${product.id}); event.stopPropagation();" style="background: none; border: none; color: var(--gold); cursor: pointer; font-size: 12px;">
                            <i class="fas fa-comment"></i> قراءة التقييمات
                        </button>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <span style="font-size: 32px; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <button class="btn-gold" onclick="CartSystem.add(products.find(p => p.id == ${product.id}), 1); closeModal('productDetailModal')">
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="btn-outline-gold" onclick="WishlistSystem.toggle(products.find(p => p.id == ${product.id})); closeModal('productDetailModal')">
                            <i class="fas fa-heart ${isInWishlist ? 'fas' : 'far'}"></i> ${isInWishlist ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
                        </button>
                        <button class="btn-outline-gold" onclick="ReviewSystem.showReviewModal(products.find(p => p.id == ${product.id})); closeModal('productDetailModal')">
                            <i class="fas fa-star"></i> قيم المنتج
                        </button>
                        <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

// ===== [5.5] دوال مساعدة إضافية =====
function toggleCart() {
    CartSystem.toggleSidebar();
}

function addToCart(product) {
    CartSystem.add(product, 1);
}

// عرض جميع الطلبات (للمدير)
function showAllOrders() {
    CartSystem.showAllOrders();
}

// عرض المفضلة
function showWishlist() {
    WishlistSystem.showWishlist();
}

// ===== [5.6] تهيئة النظام عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    CartSystem.init();
    WishlistSystem.init();
    
    // إضافة أيقونة المفضلة في الهيدر
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('wishlistBtn')) {
        const wishlistBtn = document.createElement('button');
        wishlistBtn.id = 'wishlistBtn';
        wishlistBtn.className = 'action-btn';
        wishlistBtn.setAttribute('onclick', 'showWishlist()');
        wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
        wishlistBtn.title = 'المفضلة';
        headerActions.insertBefore(wishlistBtn, headerActions.children[1]);
    }
    
    // إضافة زر الطلبات للمدير
    if (isAuthenticated && typeof isAuthenticated !== 'undefined') {
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn && dashboardBtn.parentElement && !document.getElementById('ordersBtn')) {
            const ordersBtn = document.createElement('button');
            ordersBtn.id = 'ordersBtn';
            ordersBtn.className = 'action-btn admin-only';
            ordersBtn.setAttribute('onclick', 'showAllOrders()');
            ordersBtn.innerHTML = '<i class="fas fa-clipboard-list"></i>';
            ordersBtn.title = 'الطلبات';
            dashboardBtn.parentElement.insertBefore(ordersBtn, dashboardBtn);
        }
    }
});

console.log('✅ نظام المتجر المتكامل (shop.js) جاهز');
console.log('📦 الميزات: سلة متقدمة | مفضلة | تقييمات | طلبات | دفع');
