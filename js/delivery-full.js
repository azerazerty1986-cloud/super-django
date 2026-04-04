<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ناردو برو - نظام متكامل</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f0f1a; color: white; font-family: 'Cairo', sans-serif; }
        .navbar { background: #000; padding: 15px 30px; display: flex; justify-content: space-between; border-bottom: 2px solid gold; position: sticky; top: 0; }
        .logo { color: gold; font-size: 24px; }
        .cart-btn { background: gold; color: black; padding: 8px 20px; border-radius: 30px; cursor: pointer; position: relative; }
        .cart-count { position: absolute; top: -8px; right: -8px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; display: flex; align-items: center; justify-content: center; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; padding: 40px; max-width: 1400px; margin: auto; }
        .product-card { background: rgba(255,255,255,0.05); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,215,0,0.3); cursor: pointer; transition: 0.3s; }
        .product-card:hover { transform: translateY(-5px); border-color: gold; }
        .product-img { width: 100%; height: 200px; object-fit: cover; background: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 60px; }
        .product-info { padding: 20px; }
        .product-name { font-size: 18px; font-weight: bold; }
        .merchant { color: gold; font-size: 13px; margin: 8px 0; display: flex; align-items: center; gap: 5px; }
        .price { font-size: 22px; color: gold; font-weight: bold; margin: 10px 0; }
        .add-to-cart { background: gold; color: black; border: none; padding: 10px; width: 100%; border-radius: 30px; font-weight: bold; cursor: pointer; }
        
        .cart-sidebar { position: fixed; top: 0; right: -400px; width: 400px; height: 100%; background: #1a1a2e; z-index: 1000; transition: 0.3s; padding: 20px; border-left: 2px solid gold; display: flex; flex-direction: column; }
        .cart-sidebar.open { right: 0; }
        .cart-items { flex: 1; overflow-y: auto; }
        .cart-item { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 10px; }
        .checkout-btn { background: gold; color: black; padding: 15px; border: none; border-radius: 30px; font-weight: bold; margin-top: 20px; cursor: pointer; width: 100%; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: none; justify-content: center; align-items: center; }
        .modal.active { display: flex; }
        .modal-content { background: #1a1a2e; padding: 30px; border-radius: 20px; width: 90%; max-width: 500px; border: 2px solid gold; }
        .form-group { margin-bottom: 15px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border-radius: 10px; background: #0f0f1a; color: white; border: 1px solid gold; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .btn-confirm { background: gold; color: black; padding: 12px; border: none; border-radius: 10px; flex: 1; cursor: pointer; }
        .btn-cancel { background: red; color: white; padding: 12px; border: none; border-radius: 10px; flex: 1; cursor: pointer; }
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 3000; }
        .toast { padding: 12px 20px; border-radius: 10px; margin-bottom: 10px; color: black; font-weight: bold; }
        .toast.success { background: #4ade80; }
        .toast.error { background: #f87171; color: white; }
    </style>
</head>
<body>

<nav class="navbar">
    <div class="logo"><i class="fas fa-crown"></i> ناردو برو</div>
    <div class="cart-btn" onclick="toggleCart()">
        <i class="fas fa-shopping-cart"></i> السلة
        <span class="cart-count" id="cartCount">0</span>
    </div>
</nav>

<div class="products-grid" id="productsGrid"></div>

<div class="cart-sidebar" id="cartSidebar">
    <div class="cart-header">
        <h3>🛒 سلة التسوق</h3>
        <button onclick="toggleCart()" style="background: none; border: none; color: white; font-size: 20px;">✕</button>
    </div>
    <div class="cart-items" id="cartItems"></div>
    <div class="cart-total" style="text-align: center; margin: 15px 0;">
        <strong>الإجمالي: <span id="cartTotal">0</span> دج</strong>
    </div>
    <button class="checkout-btn" onclick="showDeliveryModal()"><i class="fas fa-truck"></i> إتمام الطلب مع التوصيل</button>
</div>

<div class="modal" id="deliveryModal">
    <div class="modal-content">
        <h2 style="color: gold; text-align: center;">📦 توثيق الطلب</h2>
        <div class="form-group">
            <label>👤 الاسم الكامل</label>
            <input type="text" id="customerName" placeholder="أدخل اسمك">
        </div>
        <div class="form-group">
            <label>📞 رقم الهاتف</label>
            <input type="tel" id="customerPhone" placeholder="05xxxxxxxx">
        </div>
        <div class="form-group">
            <label>🚚 شركة التوصيل</label>
            <select id="deliveryCompany">
                <option value="0|ناردو إكسبرس|🚀">ناردو إكسبرس - 0 دج</option>
                <option value="-100|براقي برو|📮">براقي برو - خصم 100 دج</option>
                <option value="300|دليفري سريع|⚡">دليفري سريع +300 دج</option>
            </select>
        </div>
        <div class="form-group">
            <label>📍 العنوان الكامل</label>
            <textarea id="customerAddress" rows="2" placeholder="الشارع، المدينة، رقم البناء"></textarea>
        </div>
        <div class="form-group">
            <label>📝 ملاحظات</label>
            <textarea id="orderNotes" rows="2" placeholder="أي تعليمات إضافية"></textarea>
        </div>
        <div class="delivery-summary" id="deliverySummary" style="background: rgba(255,215,0,0.1); padding: 15px; border-radius: 10px; margin: 15px 0;"></div>
        <div class="modal-buttons">
            <button class="btn-cancel" onclick="closeDeliveryModal()">إلغاء</button>
            <button class="btn-confirm" onclick="confirmOrder()">توثيق الطلب</button>
        </div>
    </div>
</div>

<div class="toast-container" id="toastContainer"></div>

<script>
    // ========== إعدادات تلغرام من ملفك ==========
    const TELEGRAM = {
        botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
        channelId: '-1003822964890'
    };

    // ========== المنتجات والتجار من ملفك ==========
    let products = [];
    let cart = [];
    
    // جلب المنتجات من localStorage أو استخدام المنتجات الافتراضية
    function loadProductsFromStorage() {
        const saved = localStorage.getItem('nardoo_products');
        if (saved && JSON.parse(saved).length > 0) {
            products = JSON.parse(saved);
        } else {
            // منتجات تجريبية مع أسماء تجار حقيقية
            products = [
                { id: 1, name: "سماعة لاسلكية Pro", price: 2500, image: "🎧", merchant: "متجر الصوتيات", stock: 50, rating: 4.8 },
                { id: 2, name: "ساعة ذكية رياضية", price: 4800, image: "⌚", merchant: "تكنو وورلد", stock: 30, rating: 4.6 },
                { id: 3, name: "حقيبة ظهر عصرية", price: 3200, image: "🎒", merchant: "مودا ستور", stock: 40, rating: 4.7 },
                { id: 4, name: "سماعات أيربودز", price: 6900, image: "🎵", merchant: "أجهزة برو", stock: 20, rating: 4.9 },
                { id: 5, name: "باور بانك 20000mAh", price: 3500, image: "🔋", merchant: "إلكتروني الجزائر", stock: 60, rating: 4.5 },
                { id: 6, name: "مصباح LED ذكي", price: 1900, image: "💡", merchant: "ديور هوم", stock: 25, rating: 4.4 }
            ];
        }
        displayProducts();
    }
    
    function displayProducts() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        
        grid.innerHTML = products.map(p => `
            <div class="product-card">
                <div class="product-img">${p.image}</div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="merchant"><i class="fas fa-store"></i> ${p.merchant}</div>
                    <div class="price">${p.price.toLocaleString()} دج</div>
                    <button class="add-to-cart" onclick="addToCart(${p.id})"><i class="fas fa-shopping-cart"></i> أضف للسلة</button>
                </div>
            </div>
        `).join('');
    }
    
    // ========== السلة ==========
    function loadCart() {
        const saved = localStorage.getItem('nardoo_cart');
        cart = saved ? JSON.parse(saved) : [];
        updateCartUI();
    }
    
    function saveCart() {
        localStorage.setItem('nardoo_cart', JSON.stringify(cart));
    }
    
    function updateCartUI() {
        const count = cart.reduce((s, i) => s + i.quantity, 0);
        document.getElementById('cartCount').innerText = count;
        
        const container = document.getElementById('cartItems');
        const totalSpan = document.getElementById('cartTotal');
        
        if (cart.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">السلة فارغة 🛒</p>';
            totalSpan.innerText = '0';
            return;
        }
        
        let total = 0;
        container.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <div>
                        <strong>${item.name}</strong><br>
                        ${item.price.toLocaleString()} دج × ${item.quantity}
                    </div>
                    <div>
                        <button onclick="updateQty(${item.id}, ${item.quantity - 1})" style="background: gold; border: none; width: 25px; border-radius: 5px;">-</button>
                        <span style="margin: 0 8px;">${item.quantity}</span>
                        <button onclick="updateQty(${item.id}, ${item.quantity + 1})" style="background: gold; border: none; width: 25px; border-radius: 5px;">+</button>
                        <button onclick="removeFromCart(${item.id})" style="background: red; color: white; border: none; width: 25px; border-radius: 5px;">✕</button>
                    </div>
                </div>
            `;
        }).join('');
        totalSpan.innerText = total.toLocaleString();
    }
    
    function addToCart(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        const existing = cart.find(i => i.id === id);
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        saveCart();
        updateCartUI();
        showToast(`✅ تم إضافة ${product.name}`, 'success');
    }
    
    function updateQty(id, qty) {
        if (qty <= 0) {
            removeFromCart(id);
            return;
        }
        const item = cart.find(i => i.id === id);
        if (item) item.quantity = qty;
        saveCart();
        updateCartUI();
    }
    
    function removeFromCart(id) {
        cart = cart.filter(i => i.id !== id);
        saveCart();
        updateCartUI();
        showToast('🗑 تم إزالة المنتج', 'success');
    }
    
    function toggleCart() {
        document.getElementById('cartSidebar').classList.toggle('open');
    }
    
    // ========== التوصيل والتوثيق ==========
    function showDeliveryModal() {
        if (cart.length === 0) {
            showToast('⚠️ السلة فارغة، أضف منتجات أولاً', 'error');
            return;
        }
        document.getElementById('deliveryModal').classList.add('active');
        updateDeliverySummary();
        document.getElementById('deliveryCompany').onchange = updateDeliverySummary;
    }
    
    function updateDeliverySummary() {
        const company = document.getElementById('deliveryCompany').value.split('|');
        const companyPrice = parseInt(company[0]);
        const companyName = company[1];
        const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const total = subtotal + companyPrice;
        
        document.getElementById('deliverySummary').innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <span>🛍️ إجمالي المنتجات:</span>
                <span><strong>${subtotal.toLocaleString()} دج</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span>🚚 ${companyName}:</span>
                <span><strong>${companyPrice >= 0 ? '+' : ''}${companyPrice.toLocaleString()} دج</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid gold; padding-top: 10px;">
                <span style="font-size: 18px;">💎 الإجمالي:</span>
                <span style="font-size: 20px; color: gold;"><strong>${total.toLocaleString()} دج</strong></span>
            </div>
        `;
    }
    
    function closeDeliveryModal() {
        document.getElementById('deliveryModal').classList.remove('active');
    }
    
    async function sendToTelegram(message) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return response.ok;
        } catch(e) {
            console.error(e);
            return false;
        }
    }
    
    async function confirmOrder() {
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const address = document.getElementById('customerAddress').value;
        const notes = document.getElementById('orderNotes').value;
        
        if (!name || !phone || !address) {
            showToast('⚠️ يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const company = document.getElementById('deliveryCompany').value.split('|');
        const companyPrice = parseInt(company[0]);
        const companyName = company[1];
        const companyIcon = company[2];
        
        const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const total = subtotal + companyPrice;
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const orderDate = new Date().toLocaleString('ar-EG');
        
        // بناء رسالة المنتجات
        let productsText = '';
        for (const item of cart) {
            productsText += `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        }
        
        // رسالة المدير
        const adminMsg = `
👑 <b>#تقرير_مدير</b>
━━━━━━━━━━━━━━━━━━━━━━
📋 رقم الطلب: <code>${orderId}</code>
🕐 التاريخ: ${orderDate}

👤 العميل: ${name}
📞 الهاتف: ${phone}
📍 العنوان: ${address}

📦 المنتجات:
${productsText}
━━━━━━━━━━━━━━━━━━━━━━
${companyIcon} شركة التوصيل: ${companyName}
💰 رسوم التوصيل: ${companyPrice >= 0 ? '+' : ''}${companyPrice.toLocaleString()} دج
📝 ملاحظات: ${notes || 'لا توجد'}
━━━━━━━━━━━━━━━━━━━━━━
💎 الإجمالي النهائي: ${total.toLocaleString()} دج
        `;
        
        // رسالة المشتري
        const customerMsg = `
🛒 <b>#تأكيد_مشتري</b>
━━━━━━━━━━━━━━━━━━━━━━
✨ تم توثيق طلبك بنجاح!

📋 رقم الطلب: <code>${orderId}</code>
📅 التاريخ: ${orderDate}

💰 الإجمالي: ${total.toLocaleString()} دج
🚚 شركة التوصيل: ${companyName}
📍 العنوان: ${address}

✨ شكراً لتسوقك من <b>ناردو برو</b> ✨
        `;
        
        showToast('📤 جاري إرسال الطلب...', 'success');
        
        await sendToTelegram(adminMsg);
        await sendToTelegram(customerMsg);
        
        // تفريغ السلة
        cart = [];
        saveCart();
        updateCartUI();
        closeDeliveryModal();
        
        showToast(`✅ تم توثيق الطلب بنجاح! رقم: ${orderId}`, 'success');
        alert(`🎉 تم توثيق طلبك بنجاح!\n\n📋 رقم الطلب: ${orderId}\n💎 الإجمالي: ${total.toLocaleString()} دج\n\n✅ تم إرسال التفاصيل إلى المدير وإليك`);
    }
    
    function showToast(msg, type) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ========== التهيئة ==========
    loadProductsFromStorage();
    loadCart();
    console.log('✅ النظام جاهز - المنتجات مع أسماء التجار والتوصيل المتكامل');
</script>
</body>
</html>
