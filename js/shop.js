/* ================================================================== */
/* ===== [05] shop.js - نظام المتجر المتكامل (نسخة منقحة) ===== */
/* ===== متوافق تماماً مع telegram.js دون تداخل ===== */
/* ================================================================== */

// التحقق من وجود الدوال قبل تعريفها لتجنب التداخل
if (typeof CartSystem === 'undefined') {

// ===== [5.1] نظام السلة المتقدم =====
const CartSystem = {
    items: [],
    
    init() {
        const saved = localStorage.getItem('nardoo_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        this.updateUI();
        return this;
    },
    
    add(product, quantity = 1) {
        if (!product) return false;
        
        if (product.stock && product.stock < quantity) {
            if (window.showNotification) showNotification(`⚠️ الكمية المتوفرة من ${product.name} هي ${product.stock} فقط`, 'warning');
            return false;
        }
        
        const existing = this.items.find(item => item.id === product.id);
        
        if (existing) {
            const newQty = existing.quantity + quantity;
            if (product.stock && product.stock < newQty) {
                if (window.showNotification) showNotification(`⚠️ لا يمكن إضافة كمية أكبر من المتوفرة (${product.stock})`, 'warning');
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
        if (window.showNotification) showNotification(`✅ تم إضافة ${product.name} إلى السلة`, 'success');
        return true;
    },
    
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            if (window.showNotification) showNotification(`🗑️ تم إزالة ${removed.name} من السلة`, 'info');
            this.updateUI();
            return true;
        }
        return false;
    },
    
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id == productId);
        if (item) {
            if (quantity <= 0) {
                return this.remove(productId);
            }
            
            if (item.maxStock && quantity > item.maxStock) {
                if (window.showNotification) showNotification(`⚠️ الكمية المتوفرة من ${item.name} هي ${item.maxStock} فقط`, 'warning');
                quantity = item.maxStock;
            }
            
            item.quantity = quantity;
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    },
    
    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    getItemCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    clear() {
        this.items = [];
        this.save();
        this.updateUI();
        if (window.showNotification) showNotification('🛒 تم تفريغ السلة', 'info');
    },
    
    save() {
        localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
        this.updateCounters();
    },
    
    updateCounters() {
        const count = this.getItemCount();
        const cartCounter = document.getElementById('cartCounter');
        const fixedCartCounter = document.getElementById('fixedCartCounter');
        
        if (cartCounter) cartCounter.textContent = count;
        if (fixedCartCounter) fixedCartCounter.textContent = count;
    },
    
    updateUI() {
        this.updateCounters();
        this.renderCartSidebar();
    },
    
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
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        itemsContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image ? `<img src="${item.image}" onerror="this.src='https://via.placeholder.com/60/2c5e4f/ffffff?text=نكهة'">` : '<i class="fas fa-box"></i>'}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${escapeHtmlShop(item.name)}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                    <div class="cart-item-merchant"><i class="fas fa-store"></i> ${escapeHtmlShop(item.merchantName)}</div>
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
    
    toggleSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },
    
    async checkout() {
        if (this.items.length === 0) {
            if (window.showNotification) showNotification('🛒 سلة التسوق فارغة', 'warning');
            return;
        }
        
        if (typeof isAuthenticated !== 'undefined' && !isAuthenticated) {
            if (window.showNotification) showNotification('🔐 الرجاء تسجيل الدخول لإتمام الشراء', 'warning');
            if (window.openLoginModal) openLoginModal();
            return;
        }
        
        this.showCheckoutModal();
    },
    
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
        
        const summaryContainer = document.getElementById('orderSummaryItems');
        const totalSpan = document.getElementById('orderTotalAmount');
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        if (summaryContainer) {
            summaryContainer.innerHTML = this.items.map(item => `
                <div class="order-item">
                    <span>${escapeHtmlShop(item.name)} × ${item.quantity}</span>
                    <span>${(item.price * item.quantity).toLocaleString()} دج</span>
                </div>
            `).join('');
        }
        
        if (totalSpan) {
            totalSpan.textContent = this.getTotal().toLocaleString() + ' دج';
        }
        
        modal.style.display = 'flex';
    },
    
    async submitOrder() {
        const name = document.getElementById('customerName')?.value.trim();
        const phone = document.getElementById('customerPhone')?.value.trim();
        const address = document.getElementById('customerAddress')?.value.trim();
        const notes = document.getElementById('orderNotes')?.value.trim() || '';
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
        
        if (!name || !phone || !address) {
            if (window.showNotification) showNotification('❌ الرجاء تعبئة جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const phoneRegex = /^(05|06|07)[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            if (window.showNotification) showNotification('❌ رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05، 06، أو 07)', 'error');
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
        
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        orders.unshift(order);
        localStorage.setItem('nardoo_orders', JSON.stringify(orders));
        
        await this.sendOrderToTelegram(order);
        
        this.clear();
        
        if (window.closeModal) closeModal('checkoutModal');
        this.toggleSidebar();
        
        if (window.showNotification) showNotification(`✅ تم استلام طلبك رقم ${order.id} بنجاح! سنتواصل معك قريباً`, 'success');
        
        setTimeout(() => {
            if (confirm('هل تريد عرض تفاصيل طلبك؟')) {
                this.showOrderDetails(order.id);
            }
        }, 1000);
    },
    
    async sendOrderToTelegram(order) {
        if (typeof TELEGRAM === 'undefined' || !TELEGRAM.botToken) {
            console.log('⚠️ نظام تليجرام غير متاح');
            return;
        }
        
        try {
            function escapeMarkdown(text) {
                if (!text) return '';
                return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
            }
            
            const itemsList = order.items.map(item => 
                `📦 ${escapeMarkdown(item.name)} × ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} دج`
            ).join('\n');
            
            const paymentNames = { 'cash': 'الدفع عند الاستلام', 'card': 'بطاقة ائتمان', 'cib': 'تحويل بنكي CIB' };
            
            const message = `🛒 *طلب جديد #${order.id}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${escapeMarkdown(order.customer.name)}
📞 *الهاتف:* ${order.customer.phone}
📍 *العنوان:* ${escapeMarkdown(order.customer.address)}
${order.customer.notes ? `📝 *ملاحظات:* ${escapeMarkdown(order.customer.notes)}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━
*المنتجات:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
💰 *الإجمالي:* ${order.total.toLocaleString()} دج
💳 *طريقة الدفع:* ${paymentNames[order.paymentMethod] || order.paymentMethod}
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
    
    getPaymentMethodName(method) {
        const methods = { 'cash': 'الدفع عند الاستلام', 'card': 'بطاقة ائتمان', 'cib': 'تحويل بنكي CIB' };
        return methods[method] || method;
    },
    
    getOrderStatusName(status) {
        const names = { 'pending': 'قيد الانتظار', 'processing': 'قيد المعالجة', 'shipped': 'تم الشحن', 'delivered': 'تم التوصيل', 'cancelled': 'ملغي' };
        return names[status] || status;
    },
    
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
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        const statusColors = { pending: '#fbbf24', processing: '#60a5fa', shipped: '#8b5cf6', delivered: '#4ade80', cancelled: '#f87171' };
        const statusNames = { pending: 'قيد الانتظار', processing: 'قيد المعالجة', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-receipt"></i> تفاصيل الطلب #${order.id}</h2>
                    <button class="close-btn" onclick="closeModal('orderDetailModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-status-badge" style="background: ${statusColors[order.status]}; padding: 8px 16px; border-radius: 20px; text-align: center; color: black; font-weight: bold;">
                        ${statusNames[order.status]}
                    </div>
                    
                    <div class="order-info-section" style="margin-top: 20px;">
                        <h4><i class="fas fa-user"></i> معلومات العميل</h4>
                        <p><strong>الاسم:</strong> ${escapeHtmlShop(order.customer.name)}</p>
                        <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                        <p><strong>العنوان:</strong> ${escapeHtmlShop(order.customer.address)}</p>
                        ${order.customer.notes ? `<p><strong>ملاحظات:</strong> ${escapeHtmlShop(order.customer.notes)}</p>` : ''}
                    </div>
                    
                    <div class="order-info-section" style="margin-top: 20px;">
                        <h4><i class="fas fa-box"></i> المنتجات</h4>
                        ${order.items.map(item => `
                            <div class="order-item-detail" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                                <span>${escapeHtmlShop(item.name)} × ${item.quantity}</span>
                                <span>${(item.price * item.quantity).toLocaleString()} دج</span>
                            </div>
                        `).join('')}
                        <div class="order-total-detail" style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold;">
                            <strong>الإجمالي:</strong>
                            <strong>${order.total.toLocaleString()} دج</strong>
                        </div>
                    </div>
                    
                    <div class="order-info-section" style="margin-top: 20px;">
                        <h4><i class="fas fa-credit-card"></i> طريقة الدفع</h4>
                        <p>${this.getPaymentMethodName(order.paymentMethod)}</p>
                    </div>
                    
                    <button class="btn-gold" onclick="closeModal('orderDetailModal')" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-check"></i> إغلاق
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    },
    
    showAllOrders() {
        if (typeof isAuthenticated !== 'undefined' && !isAuthenticated) {
            if (window.showNotification) showNotification('🔐 هذه الصفحة للمدير فقط', 'warning');
            return;
        }
        
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        
        if (orders.length === 0) {
            if (window.showNotification) showNotification('📭 لا توجد طلبات حتى الآن', 'info');
            return;
        }
        
        let modal = document.getElementById('allOrdersModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'allOrdersModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        modal.innerHTML = `
            <div class="modal-content modal-lg" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-clipboard-list"></i> جميع الطلبات</h2>
                    <button class="close-btn" onclick="closeModal('allOrdersModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${orders.map(order => `
                        <div class="order-card" onclick="CartSystem.showOrderDetails('${order.id}')" style="cursor: pointer; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255,215,0,0.3);">
                            <div class="order-card-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span class="order-id" style="color: gold; font-weight: bold;">#${order.id}</span>
                                <span class="order-date" style="font-size: 12px;">${new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                            </div>
                            <div class="order-card-body" style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
                                <div><i class="fas fa-user"></i> ${escapeHtmlShop(order.customer.name)}</div>
                                <div><i class="fas fa-phone"></i> ${order.customer.phone}</div>
                                <div><i class="fas fa-box"></i> ${order.items.length} منتج</div>
                                <div><i class="fas fa-money-bill"></i> ${order.total.toLocaleString()} دج</div>
                            </div>
                            <div class="order-card-footer">
                                <span class="order-status" style="background: #fbbf24; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${this.getOrderStatusName(order.status)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
};

} // نهاية التحقق من وجود CartSystem

// ===== [5.2] دوال مساعدة للسلة (بدون تداخل مع telegram.js) =====
if (typeof toggleCart === 'undefined') {
    window.toggleCart = function() {
        if (CartSystem) CartSystem.toggleSidebar();
    };
}

if (typeof addToCart === 'undefined') {
    window.addToCart = function(product) {
        if (CartSystem) CartSystem.add(product, 1);
    };
}

if (typeof addToCartFromProduct === 'undefined') {
    window.addToCartFromProduct = function(productId) {
        if (typeof products !== 'undefined' && products && CartSystem) {
            const product = products.find(p => p.id == productId);
            if (product) {
                CartSystem.add(product, 1);
            }
        }
    };
}

if (typeof showAllOrders === 'undefined') {
    window.showAllOrders = function() {
        if (CartSystem) CartSystem.showAllOrders();
    };
}

// ===== [5.3] نظام المفضلة =====
if (typeof WishlistSystem === 'undefined') {

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
            if (window.showNotification) showNotification(`${product.name} موجود بالفعل في المفضلة`, 'info');
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
        if (window.showNotification) showNotification(`❤️ تم إضافة ${product.name} إلى المفضلة`, 'success');
        return true;
    },
    
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            if (window.showNotification) showNotification(`💔 تم إزالة ${removed.name} من المفضلة`, 'info');
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
            if (window.showNotification) showNotification('❤️ لا توجد منتجات في المفضلة', 'info');
            return;
        }
        
        let modal = document.getElementById('wishlistModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wishlistModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-heart"></i> قائمة المفضلة</h2>
                    <button class="close-btn" onclick="closeModal('wishlistModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.items.map(item => `
                        <div class="wishlist-item" style="display: flex; gap: 15px; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div class="wishlist-item-image" style="width: 60px; height: 60px; background: rgba(255,215,0,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" onerror="this.src='https://via.placeholder.com/60/2c5e4f/ffffff?text=نكهة'">` : '<i class="fas fa-box" style="font-size: 24px;"></i>'}
                            </div>
                            <div class="wishlist-item-info" style="flex: 1;">
                                <div class="wishlist-item-title" style="font-weight: bold;">${escapeHtmlShop(item.name)}</div>
                                <div class="wishlist-item-price" style="color: gold;">${item.price.toLocaleString()} دج</div>
                                <div class="wishlist-item-merchant" style="font-size: 12px;"><i class="fas fa-store"></i> ${escapeHtmlShop(item.merchantName)}</div>
                            </div>
                            <div class="wishlist-item-actions" style="display: flex; gap: 10px;">
                                <button class="btn-gold-small" onclick="viewProductDetails(${item.id}); closeModal('wishlistModal')" style="padding: 8px 12px; border-radius: 8px;">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-danger-small" onclick="WishlistSystem.remove(${item.id}); this.closest('.wishlist-item').remove(); if(WishlistSystem.items.length===0) closeModal('wishlistModal')" style="padding: 8px 12px; border-radius: 8px; background: rgba(255,100,100,0.2); border: none; color: #ff6b6b; cursor: pointer;">
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

}

if (typeof showWishlist === 'undefined') {
    window.showWishlist = function() {
        if (WishlistSystem) WishlistSystem.showWishlist();
    };
}

// ===== [5.4] نظام التقييمات =====
if (typeof ReviewSystem === 'undefined') {

const ReviewSystem = {
    currentRating: 0,
    
    addReview(productId, rating, comment, userName) {
        if (!rating || rating < 1 || rating > 5) {
            if (window.showNotification) showNotification('❌ الرجاء اختيار تقييم من 1 إلى 5 نجوم', 'error');
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
        
        this.updateProductRating(productId);
        
        if (window.showNotification) showNotification('⭐ تم إضافة تقييمك بنجاح!', 'success');
        return true;
    },
    
    getProductReviews(productId) {
        const saved = localStorage.getItem(`nardoo_reviews_${productId}`);
        return saved ? JSON.parse(saved) : [];
    },
    
    getAverageRating(productId) {
        const reviews = this.getProductReviews(productId);
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return sum / reviews.length;
    },
    
    updateProductRating(productId) {
        const avg = this.getAverageRating(productId);
        if (avg > 0 && typeof products !== 'undefined' && products && products.length > 0) {
            const productIndex = products.findIndex(p => p.id == productId);
            if (productIndex !== -1) {
                products[productIndex].rating = avg;
                localStorage.setItem('nardoo_products', JSON.stringify(products));
                if (window.displayProducts) displayProducts();
            }
        }
    },
    
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
                        <h3 id="reviewProductName" style="color: gold;"></h3>
                        <div class="rating-input" style="margin: 20px 0;">
                            <label>تقييمك:</label>
                            <div class="stars-input" id="starsInput" style="display: flex; gap: 10px; margin-top: 10px;">
                                ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}" onclick="ReviewSystem.setRating(${i})" style="font-size: 30px; cursor: pointer;"></i>`).join('')}
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
        
        const nameElement = document.getElementById('reviewProductName');
        if (nameElement) nameElement.textContent = product.name;
        
        const commentElement = document.getElementById('reviewComment');
        if (commentElement) commentElement.value = '';
        
        const nameInput = document.getElementById('reviewerName');
        if (nameInput) nameInput.value = '';
        
        this.currentRating = 0;
        this.updateStarsDisplay();
        
        modal.style.display = 'flex';
    },
    
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
            if (window.showNotification) showNotification('❌ الرجاء اختيار عدد النجوم', 'error');
            return;
        }
        
        const comment = document.getElementById('reviewComment')?.value || '';
        const userName = document.getElementById('reviewerName')?.value || 'مستخدم';
        
        this.addReview(productId, this.currentRating, comment, userName);
        if (window.closeModal) closeModal('reviewModal');
        
        this.showProductReviews(productId);
    },
    
    showProductReviews(productId) {
        let product = null;
        if (typeof products !== 'undefined' && products) {
            product = products.find(p => p.id == productId);
        }
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
        
        function escapeHtmlShop(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function generateStarsForReviews(rating) {
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            let starsHTML = '';
            for (let i = 0; i < fullStars; i++) {
                starsHTML += '<i class="fas fa-star" style="color: gold;"></i>';
            }
            if (hasHalfStar) {
                starsHTML += '<i class="fas fa-star-half-alt" style="color: gold;"></i>';
            }
            for (let i = 0; i < 5 - fullStars - (hasHalfStar ? 1 : 0); i++) {
                starsHTML += '<i class="far fa-star" style="color: gold;"></i>';
            }
            return starsHTML;
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-star"></i> تقييمات ${escapeHtmlShop(product.name)}</h2>
                    <button class="close-btn" onclick="closeModal('reviewsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="reviews-summary" style="text-align: center; padding: 20px; background: rgba(255,215,0,0.1); border-radius: 15px; margin-bottom: 20px;">
                        <div class="average-rating">
                            <span class="avg-value" style="font-size: 48px; font-weight: bold; color: gold;">${avgRating.toFixed(1)}</span>
                            <div class="stars" style="margin: 10px 0;">${generateStarsForReviews(avgRating)}</div>
                            <span class="review-count">(${reviews.length} تقييم)</span>
                        </div>
                    </div>
                    
                    <div class="reviews-list">
                        ${reviews.length === 0 ? '<p class="no-reviews" style="text-align: center; padding: 40px;">لا توجد تقييمات بعد. كن أول من يقيم هذا المنتج!</p>' : 
                            reviews.slice().reverse().map(review => `
                                <div class="review-item" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 15px;">
                                    <div class="review-header" style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px;">
                                        <strong>${escapeHtmlShop(review.userName)}</strong>
                                        <div class="review-stars">${generateStarsForReviews(review.rating)}</div>
                                        <span class="review-date" style="font-size: 12px;">${new Date(review.date).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                    ${review.comment ? `<p class="review-comment" style="margin-top: 10px;">${escapeHtmlShop(review.comment)}</p>` : ''}
                                </div>
                            `).join('')
                        }
                    </div>
                    
                    <button class="btn-gold" onclick="ReviewSystem.showReviewModal(products.find(p => p.id == ${productId})); closeModal('reviewsModal')" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-plus"></i> أضف تقييمك
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
};

}

// ===== [5.5] إضافة أزرار إضافية للواجهة =====
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة السلة
    if (CartSystem) CartSystem.init();
    
    // تهيئة المفضلة
    if (WishlistSystem) WishlistSystem.init();
    
    // إضافة أيقونة المفضلة في الهيدر (إذا لم تكن موجودة)
    setTimeout(() => {
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
        if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
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
    }, 500);
});

// إضافة أنماط CSS للسلة والمفضلة
const shopStyles = document.createElement('style');
shopStyles.textContent = `
    /* أنماط السلة الجانبية */
    .cart-sidebar {
        position: fixed;
        top: 0;
        left: -400px;
        width: 400px;
        height: 100vh;
        background: var(--bg-primary, #1a1a2e);
        z-index: 10001;
        transition: left 0.3s ease;
        box-shadow: -5px 0 30px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(255,215,0,0.3);
    }
    
    .cart-sidebar.open {
        left: 0;
    }
    
    .cart-sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255,215,0,0.3);
        background: rgba(0,0,0,0.3);
    }
    
    .cart-sidebar-header h3 {
        color: gold;
        margin: 0;
    }
    
    .cart-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: white;
    }
    
    .cart-sidebar-items {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
    }
    
    .cart-item {
        display: flex;
        gap: 15px;
        padding: 15px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 10px;
    }
    
    .cart-item-image {
        width: 70px;
        height: 70px;
        background: rgba(255,215,0,0.1);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
    
    .cart-item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .cart-item-info {
        flex: 1;
    }
    
    .cart-item-title {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .cart-item-price {
        color: gold;
        font-size: 14px;
    }
    
    .cart-item-merchant {
        font-size: 11px;
        color: #aaa;
    }
    
    .cart-item-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
    }
    
    .quantity-control {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .quantity-control button {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid rgba(255,215,0,0.3);
        background: rgba(255,255,255,0.1);
        cursor: pointer;
        color: white;
    }
    
    .cart-remove {
        background: rgba(255,100,100,0.2);
        border: none;
        padding: 5px 10px;
        border-radius: 8px;
        cursor: pointer;
        color: #ff6b6b;
    }
    
    .cart-sidebar-footer {
        padding: 20px;
        border-top: 1px solid rgba(255,215,0,0.3);
        background: rgba(0,0,0,0.3);
    }
    
    .cart-total {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
    }
    
    .cart-total .total-amount {
        color: gold;
    }
    
    .empty-cart {
        text-align: center;
        padding: 60px 20px;
    }
    
    .empty-cart i {
        font-size: 60px;
        color: rgba(255,215,0,0.3);
        margin-bottom: 20px;
    }
    
    /* أنماط الطلبات */
    .order-summary {
        background: rgba(255,215,0,0.1);
        padding: 15px;
        border-radius: 12px;
        margin: 20px 0;
    }
    
    .order-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .order-total {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        font-size: 18px;
        border-top: 2px solid gold;
        margin-top: 10px;
    }
    
    .payment-methods {
        margin: 20px 0;
    }
    
    .payment-method {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        margin-bottom: 10px;
        cursor: pointer;
    }
    
    /* أنماط المفضلة */
    .wishlist-item-actions button:hover {
        transform: scale(1.05);
    }
    
    @media (max-width: 480px) {
        .cart-sidebar {
            width: 100%;
            left: -100%;
        }
    }
`;

document.head.appendChild(shopStyles);

console.log('✅ shop.js (النسخة المنقحة) جاهز - متوافق تماماً مع telegram.js');
