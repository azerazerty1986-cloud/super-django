/* ================================================================== */
/* ===== ملف: shop.js - متجر ناردو برو المتكامل ===== */
/* ================================================================== */

// ==================== القسم 1: إعدادات تلغرام ====================

const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ==================== القسم 2: المتغيرات العامة ====================

let products = [];
let currentUser = null;
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let isLoading = false;

// ==================== القسم 3: نظام السلة ====================

const CART_CONFIG = {
    storageKey: 'nardoo_cart',
    shippingCost: 800,
    maxQuantity: 99
};

let cart = [];

// تحميل السلة
function loadCart() {
    try {
        const saved = localStorage.getItem(CART_CONFIG.storageKey);
        cart = saved ? JSON.parse(saved) : [];
        updateCartCounter();
    } catch (error) {
        console.error('❌ خطأ في تحميل السلة:', error);
        cart = [];
    }
}

// حفظ السلة
function saveCart() {
    try {
        localStorage.setItem(CART_CONFIG.storageKey, JSON.stringify(cart));
        updateCartCounter();
    } catch (error) {
        console.error('❌ خطأ في حفظ السلة:', error);
    }
}

// تحديث عداد السلة
function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// إضافة منتج إلى السلة
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    
    if (!product) {
        showNotification('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    
    if (existing) {
        if (existing.quantity < product.stock && existing.quantity < CART_CONFIG.maxQuantity) {
            existing.quantity++;
            showNotification(`✅ تمت إضافة ${product.name}`, 'success');
        } else {
            showNotification('الكمية غير متوفرة', 'warning');
            return;
        }
    } else {
        cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            merchantName: product.merchantName
        });
        showNotification(`✅ تمت إضافة ${product.name} إلى السلة`, 'success');
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

// تبديل عرض السلة
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        updateCartDisplay();
    }
}

// تحديث عرض السلة
function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');

    if (!itemsDiv) return;

    if (cart.length === 0) {
        itemsDiv.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-shopping-cart" style="font-size: 60px; color: var(--gold); opacity: 0.5; margin-bottom: 20px;"></i>
                <p style="color: var(--text-secondary);">سلة التسوق فارغة</p>
                <button class="btn-outline-gold" onclick="toggleCart()" style="margin-top: 20px;">
                    <i class="fas fa-arrow-right"></i> مواصلة التسوق
                </button>
            </div>
        `;
        if (totalSpan) totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item" style="
                background: var(--glass);
                border-radius: 15px;
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid rgba(255,215,0,0.2);
            ">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div class="cart-item-title" style="font-weight: bold; margin-bottom: 8px;">${item.name}</div>
                        <div class="cart-item-price" style="color: var(--gold); margin-bottom: 10px;">${item.price.toLocaleString()} دج</div>
                        <div class="cart-item-quantity" style="display: flex; align-items: center; gap: 10px;">
                            <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})" style="
                                background: var(--bg-secondary);
                                border: 1px solid var(--gold);
                                color: var(--gold);
                                width: 30px;
                                height: 30px;
                                border-radius: 8px;
                                cursor: pointer;
                            ">-</button>
                            <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})" style="
                                background: var(--bg-secondary);
                                border: 1px solid var(--gold);
                                color: var(--gold);
                                width: 30px;
                                height: 30px;
                                border-radius: 8px;
                                cursor: pointer;
                            ">+</button>
                            <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="
                                background: #f87171;
                                border: none;
                                color: white;
                                width: 30px;
                                height: 30px;
                                border-radius: 8px;
                                cursor: pointer;
                                margin-left: 10px;
                            ">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="font-weight: bold; color: var(--gold);">
                        ${itemTotal.toLocaleString()} دج
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const shipping = cart.length > 0 ? CART_CONFIG.shippingCost : 0;
    const finalTotal = total + shipping;

    if (totalSpan) {
        totalSpan.innerHTML = `
            <div style="border-top: 1px solid rgba(255,215,0,0.2); padding-top: 15px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>المجموع:</span>
                    <span>${total.toLocaleString()} دج</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>الشحن:</span>
                    <span>${shipping.toLocaleString()} دج</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                    <span>الإجمالي:</span>
                    <span style="color: var(--gold);">${finalTotal.toLocaleString()} دج</span>
                </div>
            </div>
        `;
    }
}

// تحديث كمية منتج في السلة
function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        showNotification('الكمية غير متوفرة في المخزون', 'warning');
        return;
    }

    if (newQuantity > CART_CONFIG.maxQuantity) {
        showNotification(`الحد الأقصى ${CART_CONFIG.maxQuantity} قطعة`, 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    const product = cart.find(i => i.productId == productId);
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification(`✅ تمت إزالة ${product?.name || 'المنتج'} من السلة`, 'info');
}

// تفريغ السلة بالكامل
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('هل أنت متأكد من تفريغ السلة بالكامل؟')) {
        cart = [];
        saveCart();
        updateCartCounter();
        updateCartDisplay();
        showNotification('🗑️ تم تفريغ السلة', 'info');
    }
}

// إتمام الشراء
async function checkoutCart() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    const customerPhone = prompt('📞 رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('📍 عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = CART_CONFIG.shippingCost;
    const total = subtotal + shipping;

    const order = {
        orderId: Date.now(),
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        date: new Date().toISOString()
    };

    // إنشاء رسالة الطلب
    const message = `🟢 *طلب جديد #${order.orderId}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتجات:*
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${(i.price * i.quantity).toLocaleString()} دج`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💰 *المجموع:* ${subtotal.toLocaleString()} دج
🚚 *الشحن:* ${shipping.toLocaleString()} دج
💎 *الإجمالي:* ${total.toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleString('ar-EG')}`;

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

        // حفظ الطلب في localStorage
        const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
        orders.push(order);
        localStorage.setItem('nardoo_orders', JSON.stringify(orders));

        // تفريغ السلة
        cart = [];
        saveCart();
        updateCartCounter();
        toggleCart();
        
        showNotification('✅ تم إرسال الطلب بنجاح! سنتواصل معك قريباً', 'success');
        
        // عرض ملخص الطلب
        setTimeout(() => {
            alert(`🟢 تم استلام طلبك رقم #${order.orderId}\nالإجمالي: ${total.toLocaleString()} دج\nسيتم التواصل معك خلال 24 ساعة`);
        }, 500);
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        showNotification('❌ فشل إرسال الطلب، حاول مرة أخرى', 'error');
    }
}

// عرض طلباتي (للمستخدم)
function showMyOrders() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    const myOrders = orders.filter(o => o.customerName === currentUser.name || o.customerPhone === currentUser.phone);

    if (myOrders.length === 0) {
        showNotification('لا توجد طلبات سابقة', 'info');
        return;
    }

    let ordersText = '📋 *طلباتي السابقة*\n━━━━━━━━━━━━━━━━━━\n';
    myOrders.forEach(order => {
        ordersText += `\n🆔 #${order.orderId}\n📅 ${new Date(order.date).toLocaleDateString('ar-EG')}\n💰 ${order.total.toLocaleString()} دج\n`;
    });
    
    alert(ordersText.replace(/\*/g, ''));
}

// ==================== القسم 4: دوال المساعدة والإشعارات ====================

function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: ${type === 'warning' ? 'black' : 'white'};
        padding: 12px 20px;
        border-radius: 10px;
        margin-bottom: 10px;
        font-weight: bold;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        min-width: 250px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    toast.innerHTML = `${icons[type]} ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// إضافة أنماط الحركة
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);

// ==================== باقي دوال المتجر (مختصرة) ====================

// تحميل المستخدمين
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin', phone: '', createdAt: new Date().toISOString() },
            { id: 2, name: 'تاجر تجريبي', email: 'merchant@nardoo.com', password: 'm123', role: 'merchant_approved', phone: '0555111111', storeName: 'متجر التجريبي', merchantLevel: '2', status: 'approved', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}

// جلب المنتجات من تلغرام
async function fetchProductsFromTelegram() {
    // ... (نفس الكود الأصلي)
    console.log('جاري جلب المنتجات...');
    return [];
}

// عرض المنتجات
function displayProducts() {
    // ... (نفس الكود الأصلي)
    console.log('عرض المنتجات...');
}

// التهيئة
window.onload = async function() {
    loadUsers();
    loadCart();
    await fetchProductsFromTelegram();
    
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    console.log('✅ متجر ناردو برو جاهز');
};

// تصدير الدوال
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.checkoutCart = checkoutCart;
window.showMyOrders = showMyOrders;
window.showNotification = showNotification;
