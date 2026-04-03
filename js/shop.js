// ==================================================================
// shop.js - نظام سلة متعدد التجار
// يعتمد على هيكل المنتج من نظام التلغرام الأصلي
// ==================================================================

// ===== [1] إعدادات تلغرام =====
const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [2] المتغيرات العامة =====
let cart = [];
let products = [];
let currentUser = null;

// ===== [3] تحميل السلة =====
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
    updateCartDisplay();
}

// ===== [4] حفظ السلة =====
function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

// ===== [5] تحديث عداد السلة =====
function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// ===== [6] تبديل عرض السلة =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) sidebar.classList.toggle('open');
    updateCartDisplay();
}

// ===== [7] عرض السلة (مع تجميع حسب التاجر) =====
function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!itemsDiv) return;

    if (cart.length === 0) {
        itemsDiv.innerHTML = `<div style="text-align:center;padding:60px">🛒 السلة فارغة</div>`;
        if (totalSpan) totalSpan.textContent = '0 دج';
        return;
    }

    // تجميع حسب التاجر (merchantName)
    const grouped = {};
    cart.forEach(item => {
        const key = item.merchantName;
        if (!grouped[key]) {
            grouped[key] = { merchantName: key, items: [], subtotal: 0 };
        }
        grouped[key].items.push(item);
        grouped[key].subtotal += item.price * item.quantity;
    });

    let grandTotal = 0;
    itemsDiv.innerHTML = Object.values(grouped).map(group => {
        grandTotal += group.subtotal;
        return `
            <div style="border:1px solid rgba(255,215,0,0.2);border-radius:15px;margin-bottom:20px;overflow:hidden">
                <div style="background:rgba(255,215,0,0.1);padding:12px;display:flex;justify-content:space-between">
                    <span><i class="fas fa-store"></i> 🏪 ${group.merchantName}</span>
                    <span>${group.subtotal.toLocaleString()} دج</span>
                </div>
                <div style="padding:10px">
                    ${group.items.map(item => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1)">
                            <div style="flex:2"><strong>${item.name}</strong><br><small>${item.price} دج/قطعة</small></div>
                            <div style="display:flex;gap:8px;align-items:center">
                                <button onclick="updateCartItem(${item.productId}, ${item.quantity - 1})" style="background:#333;border:1px solid gold;color:gold;width:28px;height:28px;border-radius:6px">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="updateCartItem(${item.productId}, ${item.quantity + 1})" style="background:#333;border:1px solid gold;color:gold;width:28px;height:28px;border-radius:6px">+</button>
                                <button onclick="removeFromCart(${item.productId})" style="background:#f87171;border:none;color:white;width:28px;height:28px;border-radius:6px"><i class="fas fa-trash"></i></button>
                            </div>
                            <div style="min-width:80px;text-align:left">${(item.price * item.quantity).toLocaleString()} دج</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    if (totalSpan) totalSpan.textContent = `${grandTotal.toLocaleString()} دج`;
}

// ===== [8] إضافة منتج إلى السلة =====
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) { showNotification('المنتج غير موجود', 'error'); return; }
    if (product.stock <= 0) { showNotification('المنتج غير متوفر', 'error'); return; }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showNotification('الكمية غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            merchantName: product.merchantName,  // من بطاقة المنتج
            merchantId: product.merchantId || null,
            telegramLink: product.telegramLink || null
        });
    }
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification(`✅ تم إضافة ${product.name}`, 'success');
}

// ===== [9] تحديث كمية منتج =====
function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    if (!item) return;
    const product = products.find(p => p.id == productId);
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    if (product && newQuantity > product.stock) {
        showNotification(`الحد الأقصى ${product.stock}`, 'warning');
        return;
    }
    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

// ===== [10] إزالة منتج =====
function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإزالة', 'info');
}

// ===== [11] تجميع الطلبات حسب التاجر وإرسالها =====
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

    // تجميع الطلبات حسب التاجر
    const ordersByMerchant = {};
    cart.forEach(item => {
        const merchant = item.merchantName;
        if (!ordersByMerchant[merchant]) {
            ordersByMerchant[merchant] = [];
        }
        ordersByMerchant[merchant].push(item);
    });

    showNotification('📤 جاري إرسال الطلبات إلى التجار...', 'info');

    // إرسال طلب لكل تاجر على حدة
    for (const [merchantName, items] of Object.entries(ordersByMerchant)) {
        const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        
        const message = `🛍️ *طلب جديد من العميل*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${currentUser.name}
📞 *الهاتف:* ${customerPhone}
📍 *العنوان:* ${customerAddress}
🏪 *التاجر:* ${merchantName}
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتجات:*
${items.map(i => `• ${i.name} x${i.quantity} = ${(i.price * i.quantity).toLocaleString()} دج`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💰 *إجمالي الطلب:* ${subtotal.toLocaleString()} دج
📅 ${new Date().toLocaleString('ar-EG')}

✅ يرجى التواصل مع العميل لتأكيد الطلب`;

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
            console.log(`✅ تم إرسال طلب إلى التاجر: ${merchantName}`);
        } catch (error) {
            console.error(`❌ فشل إرسال طلب إلى ${merchantName}:`, error);
        }
    }

    // تفريغ السلة
    cart = [];
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    toggleCart();
    showNotification('✅ تم إرسال طلباتك إلى التجار بنجاح', 'success');
}

// ===== [12] دالة الإشعارات =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px`;
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
    toast.style.cssText = `background:${colors[type]};color:${type === 'warning' ? 'black' : 'white'};padding:12px 20px;border-radius:12px;font-weight:bold;animation:slideInRight 0.3s ease;direction:rtl`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ===== [13] ربط المنتجات =====
function setProducts(productsArray) {
    products = productsArray;
}

// ===== [14] تصدير الدوال =====
window.loadCart = loadCart;
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.checkoutCart = checkoutCart;
window.setProducts = setProducts;
window.showNotification = showNotification;

// ===== [15] إضافة الأنيميشن =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    .cart-sidebar { position: fixed; top: 0; left: -400px; width: 400px; height: 100vh; background: var(--bg-primary); z-index: 1000; transition: left 0.3s; display: flex; flex-direction: column; }
    .cart-sidebar.open { left: 0; }
    @media (max-width: 480px) { .cart-sidebar { width: 100%; left: -100%; } }
`;
document.head.appendChild(style);

// ===== [16] التهيئة =====
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    console.log('🛒 shop.js جاهز - يدعم فصل طلبات التجار');
});
