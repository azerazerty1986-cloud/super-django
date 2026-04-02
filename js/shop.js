// ===== ملف تجريبي لاختبار السلة =====

// 1. إعدادات بسيطة
const CONFIG = {
    currency: 'دج',
    shipping: 200,
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

// 3. نظام السلة البسيط
const Cart = {
    items: [],
    
    init() {
        this.load();
        this.updateDisplay();
        this.createUI();
        console.log('✅ السلة جاهزة');
    },
    
    load() {
        const saved = localStorage.getItem('test_cart');
        this.items = saved ? JSON.parse(saved) : [];
    },
    
    save() {
        localStorage.setItem('test_cart', JSON.stringify(this.items));
        this.updateDisplay();
    },
    
    add(productId) {
        const product = window.products.find(p => p.id == productId);
        if (!product) {
            alert('المنتج غير موجود');
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
            container.innerHTML = '<div style="text-align:center;padding:40px;">🛒 السلة فارغة</div>';
            document.getElementById('cartTotal').textContent = '0 دج';
            document.getElementById('cartCount').textContent = '0';
            return;
        }
        
        let html = '';
        let total = 0;
        
        this.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            html += `
                <div style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #eee;align-items:center;">
                    <img src="${item.image}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${item.name}</div>
                        <div style="font-size:12px;color:#888;">${item.price.toLocaleString()} دج</div>
                    </div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <button onclick="Cart.update(${item.id}, ${item.quantity - 1})" style="width:30px;height:30px;">-</button>
                        <span style="min-width:30px;text-align:center;">${item.quantity}</span>
                        <button onclick="Cart.update(${item.id}, ${item.quantity + 1})" style="width:30px;height:30px;">+</button>
                        <button onclick="Cart.remove(${item.id})" style="background:#ff4444;color:white;border:none;width:30px;height:30px;border-radius:5px;">🗑</button>
                    </div>
                    <div style="min-width:80px;text-align:right;font-weight:bold;">${itemTotal.toLocaleString()} دج</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        document.getElementById('cartTotal').textContent = `${total.toLocaleString()} دج`;
        document.getElementById('cartCount').textContent = this.getCount();
        
        const shipping = CONFIG.shipping;
        document.getElementById('cartGrandTotal').textContent = `${(total + shipping).toLocaleString()} دج`;
    },
    
    createUI() {
        if (document.getElementById('testCartSidebar')) return;
        
        const html = `
            <div id="testCartSidebar" style="
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                z-index: 10000;
                transition: right 0.3s;
                display: flex;
                flex-direction: column;
            ">
                <div style="padding:20px; background:#2c5e4f; color:white; display:flex; justify-content:space-between;">
                    <h3 style="margin:0;">🛒 سلة التسوق <span id="cartCount">0</span></h3>
                    <button onclick="Cart.close()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">&times;</button>
                </div>
                <div id="cartItems" style="flex:1; overflow-y:auto; padding:15px;"></div>
                <div style="padding:20px; border-top:1px solid #ddd; background:#f9f9f9;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span>المجموع:</span>
                        <span id="cartTotal">0 دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span>الشحن:</span>
                        <span>${CONFIG.shipping} دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-top:10px; padding-top:10px; border-top:1px solid #ddd;">
                        <span>الإجمالي:</span>
                        <span id="cartGrandTotal">0 دج</span>
                    </div>
                    <button onclick="Cart.checkout()" style="width:100%; padding:12px; background:#2c5e4f; color:white; border:none; border-radius:8px; margin-top:15px; cursor:pointer;">
                        إتمام الطلب
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
            <button onclick="Cart.show()" style="
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
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                z-index: 9998;
            ">
                🛒 <span id="floatCartCount" style="
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ff4444;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">0</span>
            </button>
        `;
        document.body.appendChild(floatBtn);
        
        // تحديث العداد العائم
        const updateFloatCount = () => {
            const floatCount = document.getElementById('floatCartCount');
            if (floatCount) floatCount.textContent = this.getCount();
        };
        
        // حفظ الدالة الأصلية
        const originalUpdate = this.updateDisplay;
        this.updateDisplay = function() {
            originalUpdate();
            updateFloatCount();
        };
        
        this.updateDisplay();
    },
    
    show() {
        document.getElementById('testCartSidebar').style.right = '0';
        document.getElementById('testCartOverlay').style.display = 'block';
        this.updateDisplay();
    },
    
    close() {
        document.getElementById('testCartSidebar').style.right = '-400px';
        document.getElementById('testCartOverlay').style.display = 'none';
    },
    
    showMessage(msg, type) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#fbbf24'};
            color: black;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 10001;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },
    
    checkout() {
        if (this.items.length === 0) {
            this.showMessage('السلة فارغة', 'warning');
            return;
        }
        
        const total = this.getTotal() + CONFIG.shipping;
        this.showMessage(`✅ تم إرسال الطلب! الإجمالي: ${total.toLocaleString()} دج`, 'success');
        this.items = [];
        this.save();
        this.close();
    }
};

// 4. إضافة أزرار للمنتجات في الصفحة
function createProductButtons() {
    const container = document.getElementById('productsContainer') || document.body;
    
    const productsHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px;padding:20px;margin-top:80px;">
            ${window.products.map(p => `
                <div style="border:1px solid #ddd;border-radius:12px;padding:15px;text-align:center;">
                    <img src="${p.image}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;">
                    <h3 style="margin:10px 0;">${p.name}</h3>
                    <div style="color:#2c5e4f;font-size:20px;font-weight:bold;">${p.price.toLocaleString()} دج</div>
                    <div style="font-size:12px;color:#888;">المتبقي: ${p.stock}</div>
                    <button onclick="Cart.add(${p.id})" style="margin-top:10px;padding:10px 20px;background:#2c5e4f;color:white;border:none;border-radius:8px;cursor:pointer;">
                        🛒 إضافة للسلة
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    if (container.id === 'productsContainer') {
        container.innerHTML = productsHTML;
    } else {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = productsHTML;
        document.body.insertBefore(wrapper, document.body.firstChild);
    }
}

// 5. تشغيل السلة
Cart.init();
createProductButtons();

// إضافة أنماط للرسوم المتحركة
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);

console.log('✅ نظام السلة التجريبي جاهز!');
