/* ================================================================== */
/* ===== [03] shop.js - نظام السلة المتكامل (نسخة نهائية) ===== */
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

// ===== نظام السلة المتكامل =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = this.loadCart();
        this.updateCounter();
        this.createCartSidebar();
        this.addCartStyles();
        this.setupEventListeners();
        console.log('✅ نظام السلة جاهز');
    },
    
    // تحميل السلة
    loadCart() {
        const saved = localStorage.getItem('nardoo_cart');
        return saved ? JSON.parse(saved) : [];
    },
    
    // حفظ السلة
    saveCart() {
        localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
        this.updateCounter();
        this.updateCartDisplay();
    },
    
    // إضافة منتج للسلة
    add(product) {
        if (!product || product.stock <= 0) {
            this.showNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const existing = this.items.find(i => i.productId === product.id);
        
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
                this.showNotification(`✓ تم زيادة كمية ${product.name}`, 'success');
            } else {
                this.showNotification('الكمية غير متوفرة', 'warning');
                return false;
            }
        } else {
            this.items.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantName: product.merchantName,
                image: product.image || (product.images && product.images[0]) || CONFIG.defaultImage,
                stock: product.stock
            });
            this.showNotification(`✓ تم إضافة ${product.name} للسلة`, 'success');
        }
        
        this.saveCart();
        this.showCartSidebar();
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
            this.saveCart();
        } else {
            this.showNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // حذف منتج
    remove(productId) {
        const item = this.items.find(i => i.productId === productId);
        if (item) {
            this.items = this.items.filter(i => i.productId !== productId);
            this.saveCart();
            this.showNotification(`✓ تم حذف ${item.name} من السلة`, 'info');
        }
    },
    
    // تحديث العداد
    updateCounter() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        
        const counters = document.querySelectorAll('#cartCounter, #fixedCartCounter, #cartSidebarCount');
        counters.forEach(c => { if (c) c.textContent = count; });
        
        const footer = document.getElementById('cartFooter');
        if (footer) footer.style.display = count > 0 ? 'block' : 'none';
    },
    
    // عرض السلة
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
        
        let subtotal = 0;
        container.innerHTML = this.items.map(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            return `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='${CONFIG.defaultImage}'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                        <div class="cart-item-merchant">${this.escapeHtml(item.merchantName)}</div>
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
    
    // إنشاء السلة الجانبية
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
                    <div><span>المجموع:</span><span id="cartSubtotal">0 دج</span></div>
                    <div><span>التوصيل:</span><span id="cartShipping">${CONFIG.shipping} دج</span></div>
                    <div class="total"><span>الإجمالي:</span><span id="cartTotalAmount">0 دج</span></div>
                </div>
                <button class="checkout-btn" onclick="CartSystem.checkout()">
                    <i class="fas fa-credit-card"></i> إتمام الطلب
                </button>
            </div>
        </div>
        <div id="cartOverlay" class="cart-overlay" onclick="CartSystem.closeCartSidebar()"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    // فتح السلة
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
    
    // إغلاق السلة
    closeCartSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    },
    
    // إتمام الطلب
    async checkout() {
        if (this.items.length === 0) {
            this.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        if (!currentUser) {
            this.showNotification('يرجى تسجيل الدخول أولاً', 'warning');
            if (typeof openLoginModal === 'function') openLoginModal();
            return;
        }
        
        const name = currentUser.name;
        const phone = prompt('رقم الهاتف:', currentUser.phone || '');
        if (!phone) return;
        
        const address = prompt('عنوان التوصيل:', '');
        if (!address) return;
        
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = CONFIG.shipping || 200;
        const total = subtotal + shipping;
        
        // إنشاء رسالة الطلب
        let message = `🛍️ *طلب جديد - ناردو برو*\n━━━━━━━━━━━━━━━━━━\n`;
        message += `👤 *العميل:* ${name}\n`;
        message += `📞 *الهاتف:* ${phone}\n`;
        message += `📍 *العنوان:* ${address}\n━━━━━━━━━━━━━━━━━━\n`;
        message += `📦 *المنتجات:*\n`;
        
        this.items.forEach(item => {
            message += `• ${item.name} x${item.quantity} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        });
        
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `💰 *المجموع:* ${subtotal.toLocaleString()} دج\n`;
        message += `🚚 *التوصيل:* ${shipping.toLocaleString()} دج\n`;
        message += `💎 *الإجمالي:* ${total.toLocaleString()} دج\n`;
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `⏰ ${new Date().toLocaleString('ar-DZ')}`;
        
        // إرسال إلى تلغرام
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM?.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM?.channelId || CONFIG.telegramChannel,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            // إرسال للتجار عبر واتساب
            const merchants = {};
            this.items.forEach(item => {
                if (item.merchantName && !merchants[item.merchantName]) {
                    merchants[item.merchantName] = [];
                }
                if (merchants[item.merchantName]) {
                    merchants[item.merchantName].push(item);
                }
            });
            
            Object.entries(merchants).forEach(([merchant, items]) => {
                const msg = `🛍️ طلب جديد من ${name}: ${items.map(i => `${i.name} x${i.quantity}`).join('، ')}`;
                // يمكن إضافة واتساب للتاجر هنا
            });
            
            this.showNotification('✓ تم إرسال الطلب بنجاح', 'success');
            this.items = [];
            this.saveCart();
            this.closeCartSidebar();
            
        } catch (error) {
            this.showNotification('فشل إرسال الطلب', 'error');
        }
    },
    
    // إشعار
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    },
    
    // إضافة أنماط CSS
    addCartStyles() {
        if (document.getElementById('cart-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cart-styles';
        styles.textContent = `
            /* السلة الجانبية */
            .cart-sidebar {
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                height: 100vh;
                background: var(--bg-primary, #0f0f1a);
                z-index: 10001;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
                box-shadow: -5px 0 20px rgba(0,0,0,0.3);
            }
            
            .cart-sidebar.open {
                right: 0;
            }
            
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
            
            .cart-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
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
            
            .cart-header h3 i {
                margin-left: 10px;
            }
            
            .cart-header span {
                background: var(--gold, #D4AF37);
                color: #000;
                padding: 2px 8px;
                border-radius: 20px;
                font-size: 12px;
                margin-right: 10px;
            }
            
            .close-cart {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--text-secondary, #888);
            }
            
            .close-cart:hover {
                color: var(--gold, #D4AF37);
            }
            
            .cart-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .cart-item {
                display: flex;
                gap: 15px;
                padding: 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                margin-bottom: 15px;
            }
            
            .cart-item img {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 10px;
            }
            
            .cart-item-info {
                flex: 1;
            }
            
            .cart-item-name {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .cart-item-merchant {
                font-size: 12px;
                color: var(--gold, #D4AF37);
                margin-bottom: 5px;
            }
            
            .cart-item-price {
                font-size: 14px;
                color: var(--text-secondary, #888);
            }
            
            .cart-item-actions {
                text-align: right;
            }
            
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
            }
            
            .remove-btn {
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                font-size: 16px;
            }
            
            .cart-footer {
                padding: 20px;
                border-top: 1px solid rgba(255,255,255,0.1);
                background: var(--bg-secondary, #1a1a2e);
            }
            
            .cart-summary {
                margin-bottom: 20px;
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
                transition: all 0.3s;
            }
            
            .checkout-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(212,175,55,0.4);
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
            
            .empty-cart h4 {
                margin-bottom: 10px;
            }
            
            .empty-cart p {
                color: var(--text-secondary, #888);
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
            .cart-notification.warning i { color: #fbbf24; }
            
            .cart-notification.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                to { opacity: 0; transform: translateY(-20px); }
            }
            
            @media (max-width: 768px) {
                .cart-sidebar {
                    width: 100%;
                    right: -100%;
                }
            }
        `;
        
        document.head.appendChild(styles);
    },
    
    // إعداد مستمعات الأحداث
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCartSidebar();
            }
        });
    },
    
    // الحصول على عدد المنتجات
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    // الحصول على المجموع
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },
    
    // تنظيف النص
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== تصدير الدوال للاستخدام العام =====
window.Cart = CartSystem;
window.toggleCart = () => CartSystem.showCartSidebar();
window.addToCart = (product) => CartSystem.add(product);

// ===== تهيئة السلة =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartSystem.init());
} else {
    CartSystem.init();
}

console.log('✅ نظام السلة جاهز');
