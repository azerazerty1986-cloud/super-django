// ===== ملف تجريبي لاختبار السلة مع نظام تلغرام =====

// 1. إعدادات بسيطة
const CONFIG = {
    currency: 'دج',
    shipping: 800,
    phone: '2135622448',
    defaultImage: 'https://via.placeholder.com/300x300?text=No+Image'
};

// 2. منتجات تجريبية
window.products = [
    {
        id: 1,
        name: 'قهوة عربية',
        price: 150,
        stock: 20,
        merchantName: 'ناردو برو',
        image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=قهوة'
    },
    {
        id: 2,
        name: 'زعفران',
        price: 300,
        stock: 10,
        merchantName: 'ناردو برو',
        image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=زعفران'
    },
    {
        id: 3,
        name: 'عسل جبلي',
        price: 500,
        stock: 5,
        merchantName: 'ناردو برو',
        image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=عسل'
    }
];

// 3. نظام السلة المتكامل (مأخوذ من كود تلغرام)
const Cart = {
    items: [],
    
    init() {
        this.load();
        this.updateDisplay();
        this.createUI();
        console.log('✅ السلة جاهزة');
    },
    
    load() {
        const saved = localStorage.getItem('nardoo_cart');
        this.items = saved ? JSON.parse(saved) : [];
    },
    
    save() {
        localStorage.setItem('nardoo_cart', JSON.stringify(this.items));
        this.updateDisplay();
    },
    
    add(productId) {
        const product = window.products.find(p => p.id == productId);
        if (!product) {
            this.showMessage('المنتج غير موجود', 'error');
            return;
        }
        
        if (product.stock <= 0) {
            this.showMessage('المنتج غير متوفر', 'error');
            return;
        }
        
        const existing = this.items.find(i => i.id == productId);
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
                this.showMessage(`✓ تم زيادة كمية ${product.name}`, 'success');
            } else {
                this.showMessage('الكمية غير متوفرة', 'warning');
                return;
            }
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantName: product.merchantName,
                image: product.image
            });
            this.showMessage(`✓ تم إضافة ${product.name} للسلة`, 'success');
        }
        
        this.save();
        this.showCart();
    },
    
    remove(id) {
        this.items = this.items.filter(i => i.id != id);
        this.save();
        this.showMessage('✓ تم حذف المنتج', 'info');
        this.updateDisplay();
    },
    
    update(id, newQty) {
        const item = this.items.find(i => i.id == id);
        if (item) {
            if (newQty <= 0) {
                this.remove(id);
            } else {
                const product = window.products.find(p => p.id == id);
                if (newQty <= (product?.stock || 999)) {
                    item.quantity = newQty;
                    this.save();
                } else {
                    this.showMessage('الكمية غير متوفرة', 'warning');
                }
            }
        }
    },
    
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },
    
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    updateDisplay() {
        const container = document.getElementById('cartItems');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <i class="fas fa-shopping-cart" style="font-size:60px;color:#2c5e4f;opacity:0.5;margin-bottom:20px;"></i>
                    <p style="color:#888;">سلة التسوق فارغة</p>
                </div>
            `;
            document.getElementById('cartSubtotal').textContent = '0 دج';
            document.getElementById('cartShipping').textContent = `${CONFIG.shipping} دج`;
            document.getElementById('cartTotalAmount').textContent = `${CONFIG.shipping} دج`;
            document.getElementById('cartCount').textContent = '0';
            this.updateFloatCount();
            return;
        }
        
        let html = '';
        let subtotal = 0;
        
        this.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            html += `
                <div style="display:flex;gap:15px;padding:15px;border-bottom:1px solid #eee;align-items:center;">
                    <img src="${item.image}" style="width:60px;height:60px;border-radius:12px;object-fit:cover;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;margin-bottom:5px;">${item.name}</div>
                        <div style="font-size:12px;color:#888;">${item.merchantName}</div>
                        <div style="color:#2c5e4f;font-weight:bold;">${item.price.toLocaleString()} دج</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button onclick="Cart.update(${item.id}, ${item.quantity - 1})" 
                                style="width:28px;height:28px;border-radius:6px;background:#f0f0f0;border:none;cursor:pointer;">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span style="min-width:30px;text-align:center;font-weight:bold;">${item.quantity}</span>
                            <button onclick="Cart.update(${item.id}, ${item.quantity + 1})" 
                                style="width:28px;height:28px;border-radius:6px;background:#f0f0f0;border:none;cursor:pointer;">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button onclick="Cart.remove(${item.id})" 
                                style="width:28px;height:28px;border-radius:6px;background:#ff4444;border:none;color:white;cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div style="font-weight:bold;">${itemTotal.toLocaleString()} دج</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        const total = subtotal + CONFIG.shipping;
        
        document.getElementById('cartSubtotal').textContent = `${subtotal.toLocaleString()} دج`;
        document.getElementById('cartShipping').textContent = `${CONFIG.shipping} دج`;
        document.getElementById('cartTotalAmount').textContent = `${total.toLocaleString()} دج`;
        document.getElementById('cartCount').textContent = this.getCount();
        
        this.updateFloatCount();
    },
    
    updateFloatCount() {
        const floatCount = document.getElementById('floatCartCount');
        if (floatCount) floatCount.textContent = this.getCount();
    },
    
    createUI() {
        if (document.getElementById('testCartSidebar')) return;
        
        // إضافة أنماط FontAwesome إذا لم تكن موجودة
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }
        
        const html = `
            <div id="testCartSidebar" style="
                position: fixed;
                top: 0;
                right: -420px;
                width: 420px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                z-index: 10000;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
            ">
                <div style="padding:20px; background:#2c5e4f; color:white; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">
                        <i class="fas fa-shopping-cart"></i> سلة التسوق 
                        <span id="cartCount" style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:20px; margin-left:8px;">0</span>
                    </h3>
                    <button onclick="Cart.close()" style="background:none;border:none;color:white;font-size:28px;cursor:pointer;">&times;</button>
                </div>
                
                <div id="cartItems" style="flex:1; overflow-y:auto; padding:15px;"></div>
                
                <div style="padding:20px; border-top:1px solid #ddd; background:#f9f9f9;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="color:#666;">المجموع الفرعي:</span>
                        <span id="cartSubtotal" style="font-weight:bold;">0 دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="color:#666;">الشحن:</span>
                        <span id="cartShipping">${CONFIG.shipping} دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-top:12px; padding-top:12px; border-top:2px solid #2c5e4f;">
                        <span>الإجمالي:</span>
                        <span id="cartTotalAmount" style="color:#2c5e4f;">0 دج</span>
                    </div>
                    
                    <button onclick="Cart.checkout()" style="
                        width:100%; 
                        padding:14px; 
                        background:#2c5e4f; 
                        color:white; 
                        border:none; 
                        border-radius:10px; 
                        margin-top:15px; 
                        cursor:pointer;
                        font-size:16px;
                        font-weight:bold;
                        transition:all 0.3s;
                    " onmouseover="this.style.background='#1e453a'" onmouseout="this.style.background='#2c5e4f'">
                        <i class="fas fa-check-circle"></i> إتمام الطلب
                    </button>
                </div>
            </div>
            
            <div id="testCartOverlay" onclick="Cart.close()" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: none;
            "></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        // إضافة زر عائم
        const floatBtn = document.createElement('div');
        floatBtn.innerHTML = `
            <button onclick="Cart.toggle()" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #2c5e4f;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 9998;
                transition: all 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🛒 <span id="floatCartCount" style="
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ff4444;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">0</span>
            </button>
        `;
        document.body.appendChild(floatBtn);
        
        this.updateDisplay();
    },
    
    toggle() {
        const sidebar = document.getElementById('testCartSidebar');
        const overlay = document.getElementById('testCartOverlay');
        if (sidebar.style.right === '0px') {
            this.close();
        } else {
            this.show();
        }
    },
    
    show() {
        document.getElementById('testCartSidebar').style.right = '0';
        document.getElementById('testCartOverlay').style.display = 'block';
        this.updateDisplay();
    },
    
    close() {
        document.getElementById('testCartSidebar').style.right = '-420px';
        document.getElementById('testCartOverlay').style.display = 'none';
    },
    
    showCart() {
        this.show();
    },
    
    showMessage(msg, type) {
        // إنشاء حاوية الإشعارات إذا لم تكن موجودة
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
            color: ${type === 'warning' ? 'black' : 'white'};
            padding: 12px 20px;
            border-radius: 10px;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            direction: rtl;
        `;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${msg}`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },
    
    checkout() {
        if (this.items.length === 0) {
            this.showMessage('السلة فارغة', 'warning');
            return;
        }
        
        const subtotal = this.getTotal();
        const total = subtotal + CONFIG.shipping;
        
        // بناء رسالة الطلب
        let orderMessage = `🛍️ طلب جديد\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        this.items.forEach(item => {
            orderMessage += `📦 ${item.name} x${item.quantity} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        });
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        orderMessage += `💰 المجموع: ${subtotal.toLocaleString()} دج\n`;
        orderMessage += `🚚 الشحن: ${CONFIG.shipping} دج\n`;
        orderMessage += `💎 الإجمالي: ${total.toLocaleString()} دج\n`;
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        orderMessage += `📅 ${new Date().toLocaleString('ar-EG')}`;
        
        // فتح واتساب لإرسال الطلب
        const whatsappUrl = `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(orderMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        this.showMessage(`✅ تم إرسال الطلب! الإجمالي: ${total.toLocaleString()} دج`, 'success');
        
        // تفريغ السلة
        this.items = [];
        this.save();
        this.close();
    }
};

// 4. إضافة أزرار للمنتجات في الصفحة
function createProductButtons() {
    const container = document.getElementById('productsContainer');
    
    const productsHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:25px;padding:20px;max-width:1200px;margin:0 auto;">
            ${window.products.map(p => `
                <div style="
                    border:1px solid #eee;
                    border-radius:16px;
                    padding:20px;
                    text-align:center;
                    transition:transform 0.3s,box-shadow 0.3s;
                    background:white;
                " onmouseover="this.style.transform='translateY(-5px)';this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'" 
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    <img src="${p.image}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;">
                    <h3 style="margin:15px 0 10px;font-size:20px;">${p.name}</h3>
                    <div style="color:#2c5e4f;font-size:24px;font-weight:bold;">${p.price.toLocaleString()} <small style="font-size:14px;">دج</small></div>
                    <div style="font-size:12px;color:#888;margin:8px 0;">
                        ${p.stock > 0 ? `<span style="color:#4ade80;">✓ متوفر (${p.stock})</span>` : '<span style="color:#f87171;">✗ غير متوفر</span>'}
                    </div>
                    <button onclick="Cart.add(${p.id})" 
                        style="
                            margin-top:15px;
                            padding:12px 25px;
                            background:#2c5e4f;
                            color:white;
                            border:none;
                            border-radius:25px;
                            cursor:pointer;
                            font-size:16px;
                            font-weight:bold;
                            transition:all 0.3s;
                            width:100%;
                        " 
                        onmouseover="this.style.background='#1e453a'"
                        onmouseout="this.style.background='#2c5e4f'"
                        ${p.stock <= 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                        🛒 إضافة للسلة
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    if (container) {
        container.innerHTML = productsHTML;
    } else {
        // إذا لم يوجد حاوية، ننشئها
        const wrapper = document.createElement('div');
        wrapper.id = 'productsContainer';
        wrapper.innerHTML = productsHTML;
        document.body.insertBefore(wrapper, document.body.firstChild);
    }
}

// 5. إضافة أنماط CSS
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes fadeOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Cairo', 'Tajawal', sans-serif;
            background: #f5f5f5;
            direction: rtl;
        }
        
        /* تخصيص شريط التمرير */
        #cartItems::-webkit-scrollbar {
            width: 6px;
        }
        
        #cartItems::-webkit-scrollbar-track {
            background: #f0f0f0;
        }
        
        #cartItems::-webkit-scrollbar-thumb {
            background: #2c5e4f;
            border-radius: 10px;
        }
        
        /* تأثيرات للأزرار */
        button {
            cursor: pointer;
            transition: all 0.3s;
        }
        
        button:active {
            transform: scale(0.95);
        }
    `;
    document.head.appendChild(style);
}

// 6. إضافة عنوان للصفحة
function addHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #2c5e4f 0%, #1e453a 100%);
        color: white;
        padding: 40px 20px;
        text-align: center;
    `;
    header.innerHTML = `
        <h1 style="margin:0;font-size:36px;">🛍️ ناردو برو</h1>
        <p style="margin:10px 0 0;opacity:0.9;">أفضل المنتجات بأفضل الأسعار</p>
    `;
    document.body.insertBefore(header, document.body.firstChild);
}

// 7. تشغيل السلة
Cart.init();
addStyles();
addHeader();
createProductButtons();

console.log('✅ نظام السلة المتكامل جاهز!');
console.log('📦 تم تحميل', window.products.length, 'منتج');
