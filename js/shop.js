
/* ================================================================== */
/* ===== [05] shop.js - نظام المتجر المتكامل (النسخة النهائية) ===== */
/* ================================================================== */

// ===== نظام السلة المتقدم =====
const CartSystem = {
    items: [],
    
    init() {
        const saved = localStorage.getItem('nardoo_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        this.updateUI();
        console.log('🛒 CartSystem initialized with', this.items.length, 'items');
        return this;
    },
    
    add(product, quantity = 1) {
        if (!product) {
            this.showMessage('⚠️ المنتج غير موجود', 'error');
            return false;
        }
        
        const existing = this.items.find(item => item.id === product.id);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.images?.[0] || null,
                merchantName: product.merchantName || 'ناردو برو'
            });
        }
        
        this.save();
        this.showMessage(`✅ تم إضافة ${product.name} إلى السلة`, 'success');
        return true;
    },
    
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            this.showMessage(`🗑️ تم إزالة ${removed.name} من السلة`, 'info');
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
        if (this.items.length > 0 && confirm('⚠️ هل أنت متأكد من تفريغ السلة بالكامل؟')) {
            this.items = [];
            this.save();
            this.updateUI();
            this.showMessage('🛒 تم تفريغ السلة', 'info');
        }
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
        
        function escapeHtml(text) {
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
    
    toggleSidebar() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },
    
    showMessage(msg, type = 'info') {
        const oldToast = document.querySelector('.custom-toast');
        if (oldToast) oldToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.textContent = msg;
        
        let bgColor = '#4ade80';
        if (type === 'error') bgColor = '#f87171';
        else if (type === 'info') bgColor = '#60a5fa';
        else if (type === 'warning') bgColor = '#fbbf24';
        
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColor};
            color: black;
            padding: 12px 24px;
            border-radius: 50px;
            z-index: 10000;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },
    
    checkout() {
        if (this.items.length === 0) {
            this.showMessage('🛒 سلة التسوق فارغة', 'warning');
            return;
        }
        
        let message = '🛒 طلب جديد:\n━━━━━━━━━━━━━━━━\n';
        let total = 0;
        
        this.items.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            message += `${index + 1}. ${item.name}\n   ${item.quantity} × ${item.price} = ${itemTotal} دج\n`;
        });
        
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `💰 الإجمالي: ${total.toLocaleString()} دج\n`;
        message += `━━━━━━━━━━━━━━━━\n`;
        message += `📞 للطلب: 0562243648\n`;
        message += `📧 البريد: info@nardoo.com`;
        
        const whatsappMsg = encodeURIComponent(`مرحباً، أريد طلب:\n${this.items.map(i => `${i.name} × ${i.quantity}`).join('\n')}\nالإجمالي: ${total} دج`);
        const whatsappUrl = `https://wa.me/213562243648?text=${whatsappMsg}`;
        
        if (confirm(`${message}\n\n✅ هل تريد تأكيد الطلب والتواصل عبر واتساب؟`)) {
            window.open(whatsappUrl, '_blank');
            this.clear();
        }
    }
};

// ===== نظام المفضلة =====
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
            CartSystem.showMessage(`${product.name} موجود بالفعل في المفضلة`, 'info');
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
        CartSystem.showMessage(`❤️ تم إضافة ${product.name} إلى المفضلة`, 'success');
        return true;
    },
    
    remove(productId) {
        const index = this.items.findIndex(item => item.id == productId);
        if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            this.save();
            CartSystem.showMessage(`💔 تم إزالة ${removed.name} من المفضلة`, 'info');
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
            CartSystem.showMessage('❤️ لا توجد منتجات في المفضلة', 'info');
            return;
        }
        
        let message = '❤️ قائمة المفضلة:\n━━━━━━━━━━━━━━━━\n';
        this.items.forEach((item, i) => {
            message += `${i+1}. ${item.name}\n   ${item.price.toLocaleString()} دج\n`;
        });
        message += `━━━━━━━━━━━━━━━━\n📌 اضغط موافق للشراء`;
        
        if (confirm(message)) {
            const choice = prompt(`🔢 أدخل رقم المنتج للشراء (1-${this.items.length}):`);
            
            if (choice && !isNaN(choice) && choice >= 1 && choice <= this.items.length) {
                const selected = this.items[choice - 1];
                if (typeof products !== 'undefined' && products) {
                    const product = products.find(p => p.id == selected.id);
                    if (product) {
                        CartSystem.add(product, 1);
                    }
                }
            }
        }
    }
};

// ===== دوال عامة =====
window.toggleCart = function() {
    CartSystem.toggleSidebar();
};

window.addToCart = function(product) {
    CartSystem.add(product, 1);
};

window.addToCartFromProduct = function(productId) {
    if (typeof products !== 'undefined' && products) {
        const product = products.find(p => p.id == productId);
        if (product) {
            CartSystem.add(product, 1);
        } else {
            CartSystem.showMessage('⚠️ المنتج غير موجود', 'error');
        }
    } else {
        CartSystem.showMessage('⚠️ جاري تحميل المنتجات...', 'warning');
    }
};

window.showWishlist = function() {
    WishlistSystem.showWishlist();
};

window.toggleWishlist = function(product) {
    WishlistSystem.toggle(product);
};

// ===== إضافة زر المفضلة في الهيدر =====
function addWishlistButton() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('wishlistBtn')) {
        const wishlistBtn = document.createElement('button');
        wishlistBtn.id = 'wishlistBtn';
        wishlistBtn.className = 'action-btn';
        wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
        wishlistBtn.title = 'المفضلة';
        wishlistBtn.style.cursor = 'pointer';
        wishlistBtn.onclick = () => WishlistSystem.showWishlist();
        headerActions.appendChild(wishlistBtn);
        console.log('✅ تم إضافة زر المفضلة');
    }
}

// ===== إضافة أنماط CSS =====
function addCartStyles() {
    if (document.getElementById('cart-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'cart-styles';
    styles.textContent = `
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
        
        .cart-sidebar.open { left: 0; }
        
        .cart-sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid rgba(255,215,0,0.3);
            background: rgba(0,0,0,0.3);
        }
        
        .cart-sidebar-header h3 { color: gold; margin: 0; }
        
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
        
        .cart-item-info { flex: 1; }
        .cart-item-title { font-weight: bold; margin-bottom: 5px; }
        .cart-item-price { color: gold; font-size: 14px; }
        .cart-item-merchant { font-size: 11px; color: #aaa; }
        
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
        
        .cart-total .total-amount { color: gold; }
        
        .empty-cart {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-cart i {
            font-size: 60px;
            color: rgba(255,215,0,0.3);
            margin-bottom: 20px;
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        @media (max-width: 480px) {
            .cart-sidebar { width: 100%; left: -100%; }
        }
    `;
    document.head.appendChild(styles);
}

// ===== تهيئة النظام =====
document.addEventListener('DOMContentLoaded', function() {
    CartSystem.init();
    WishlistSystem.init();
    addWishlistButton();
    addCartStyles();
    console.log('✅ shop.js جاهز - نظام السلة والمفضلة يعمل');
});
