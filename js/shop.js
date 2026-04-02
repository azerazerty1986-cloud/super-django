/* ================================================================== */
/* ===== [03] الملف: 03-shop.js - نظام المتجر والمنتجات ===== */
/* ===== مع سلة تسوق متكاملة ومتقدمة ===== */
/* ================================================================== */

// ===== [3.1] نظام المنتجات =====
const ShopSystem = {
    products: [],
    currentFilter: 'all',
    searchTerm: '',
    sortBy: 'newest',
    
    // تحميل المنتجات
    async loadProducts() {
        // محاولة جلب من تلغرام أولاً
        if (window.Telegram && Telegram.fetchProducts) {
            this.products = await Telegram.fetchProducts();
        } else {
            this.products = Utils.load('nardoo_products', []);
        }
        
        // إذا لم توجد منتجات، أنشئ منتجات افتراضية
        if (this.products.length === 0) {
            this.createDefaultProducts();
        }
        
        this.displayProducts();
        return this.products;
    },
    
    // إنشاء منتجات افتراضية
    createDefaultProducts() {
        const merchantId = 'MER_001001';
        
        this.products = [
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'زعتر فلسطيني',
                price: 500,
                category: 'spices',
                stock: 50,
                minStock: 10,
                maxStock: 100,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'زعتر فلسطيني أصلي 100%',
                images: [CONFIG.defaultImage],
                rating: 4.5,
                soldCount: 150,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            },
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'كريم ترطيب',
                price: 1200,
                category: 'cosmetic',
                stock: 30,
                minStock: 5,
                maxStock: 50,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'كريم ترطيب للبشرة',
                images: [CONFIG.defaultImage],
                rating: 4.3,
                soldCount: 75,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            },
            {
                id: IDSystem.generateProductId(merchantId),
                productId: IDSystem.generateProductId(merchantId),
                name: 'بخور عود',
                price: 1500,
                category: 'other',
                stock: 15,
                minStock: 3,
                maxStock: 30,
                merchantId: merchantId,
                merchantName: 'المتجر الرئيسي',
                description: 'بخور عود فاخر',
                images: [CONFIG.defaultImage],
                rating: 4.8,
                soldCount: 45,
                createdAt: new Date().toISOString(),
                dateStr: 'الآن'
            }
        ];
        
        this.saveProducts();
    },
    
    // حفظ المنتجات
    saveProducts() {
        Utils.save('nardoo_products', this.products);
    },
    
    // عرض المنتجات
    displayProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        let filtered = this.filterProducts();
        filtered = this.sortProducts(filtered);
        
        if (filtered.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        container.innerHTML = filtered.map(p => this.getProductCardHTML(p)).join('');
    },
    
    // تصفية المنتجات
    filterProducts() {
        let filtered = this.products.filter(p => p.stock > 0);
        
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(p => p.category === this.currentFilter);
        }
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }
        
        return filtered;
    },
    
    // ترتيب المنتجات
    sortProducts(products) {
        const sorts = {
            'newest': (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            'price_low': (a, b) => a.price - b.price,
            'price_high': (a, b) => b.price - a.price,
            'name': (a, b) => a.name.localeCompare(b.name),
            'rating': (a, b) => (b.rating || 0) - (a.rating || 0)
        };
        
        return products.sort(sorts[this.sortBy] || sorts.newest);
    },
    
    // HTML لبطاقة المنتج
    getProductCardHTML(product) {
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : CONFIG.defaultImage;
        const categoryName = this.getCategoryName(product.category);
        const stockClass = this.getStockClass(product.stock);
        const stockText = this.getStockText(product.stock);
        
        return `
        <div class="product-card" onclick="App.showProductDetail('${product.id}')">
            <div class="product-time-badge">
                <i class="far fa-clock"></i> ${product.dateStr || Utils.getTimeAgo(product.createdAt)}
            </div>
            <div class="product-gallery">
                <img src="${mainImage}" alt="${product.name}" onerror="this.src='${CONFIG.defaultImage}'">
                ${product.images && product.images.length > 1 ? 
                    `<span class="image-counter"><i class="fas fa-images"></i> ${product.images.length}</span>` : ''}
            </div>
            <div class="product-info">
                <span class="product-category">${categoryName}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-merchant-info">
                    <i class="fas fa-store"></i> ${product.merchantName}
                    <small>(${product.merchantId})</small>
                </div>
                <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                <div class="product-stock ${stockClass}">${stockText}</div>
                <div class="product-actions">
                    <button class="add-to-cart" 
                            onclick="event.stopPropagation(); App.addToCart('${product.id}')"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        </div>`;
    },
    
    // HTML للحالة الفارغة
    getEmptyStateHTML() {
        const canAdd = Auth.currentUser && 
                       (Auth.currentUser.role === 'admin' || Auth.currentUser.role === 'merchant');
        
        return `
            <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                <i class="fas fa-box-open" style="font-size:80px; color:var(--gold); margin-bottom:20px;"></i>
                <h3 style="color:var(--gold);">لا توجد منتجات</h3>
                ${canAdd ? 
                    '<button class="btn-gold" onclick="App.openAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>' : 
                    '<p style="color:var(--text-secondary);">سجل دخول كتاجر لإضافة منتجات</p>'}
            </div>
        `;
    },
    
    // اسم القسم
    getCategoryName(cat) {
        const names = {
            promo: 'برموسيو',
            spices: 'توابل',
            cosmetic: 'كوسمتيك',
            other: 'أخرى'
        };
        return names[cat] || cat;
    },
    
    // كلاس المخزون
    getStockClass(stock) {
        if (stock <= 0) return 'out-of-stock';
        if (stock < 5) return 'low-stock';
        return 'in-stock';
    },
    
    // نص المخزون
    getStockText(stock) {
        if (stock <= 0) return 'غير متوفر';
        if (stock < 5) return `كمية محدودة (${stock})`;
        return `متوفر (${stock})`;
    },
    
    // تغيير التصفية
    filter(category) {
        this.currentFilter = category;
        this.displayProducts();
    },
    
    // بحث
    search(term) {
        this.searchTerm = term;
        this.displayProducts();
    },
    
    // تغيير الترتيب
    setSort(sortBy) {
        this.sortBy = sortBy;
        this.displayProducts();
    },
    
    // الحصول على منتج
    getProduct(productId) {
        return this.products.find(p => p.id === productId || p.productId === productId);
    }
};

// ===== [3.2] نظام السلة المتكامل (مدمج من الملف التجريبي) =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = Utils.load('nardoo_cart', []);
        this.updateCounter();
        this.createCartUI();
        console.log('✅ نظام السلة جاهز');
    },
    
    // إنشاء واجهة السلة
    createCartUI() {
        if (document.getElementById('mainCartSidebar')) return;
        
        // إضافة أنماط FontAwesome إذا لم تكن موجودة
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }
        
        const html = `
            <div id="mainCartSidebar" style="
                position: fixed;
                top: 0;
                right: -420px;
                width: 420px;
                height: 100vh;
                background: var(--bg-primary, white);
                box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                z-index: 10000;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
            ">
                <div style="padding:20px; background: var(--gold, #2c5e4f); color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0;">
                        <i class="fas fa-shopping-cart"></i> سلة التسوق 
                        <span id="mainCartCount" style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:20px; margin-left:8px;">0</span>
                    </h3>
                    <button onclick="CartSystem.close()" style="background:none;border:none;color:white;font-size:28px;cursor:pointer;">&times;</button>
                </div>
                
                <div id="mainCartItems" style="flex:1; overflow-y:auto; padding:15px;"></div>
                
                <div style="padding:20px; border-top:1px solid var(--border, #ddd); background: var(--bg-secondary, #f9f9f9);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="color: var(--text-secondary, #666);">المجموع الفرعي:</span>
                        <span id="cartSubtotal" style="font-weight:bold;">0 دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="color: var(--text-secondary, #666);">الشحن:</span>
                        <span id="cartShippingAmount">${CONFIG.shipping || 800} دج</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-top:12px; padding-top:12px; border-top:2px solid var(--gold, #2c5e4f);">
                        <span>الإجمالي:</span>
                        <span id="cartTotalAmount" style="color: var(--gold, #2c5e4f);">0 دج</span>
                    </div>
                    
                    <button onclick="CartSystem.checkout()" style="
                        width:100%; 
                        padding:14px; 
                        background: var(--gold, #2c5e4f); 
                        color: white; 
                        border: none; 
                        border-radius: 10px; 
                        margin-top: 15px; 
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                        transition: all 0.3s;
                    ">
                        <i class="fas fa-check-circle"></i> إتمام الطلب
                    </button>
                </div>
            </div>
            
            <div id="mainCartOverlay" onclick="CartSystem.close()" style="
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
        this.createFloatingButton();
    },
    
    // إنشاء الزر العائم
    createFloatingButton() {
        if (document.getElementById('floatingCartBtn')) return;
        
        const floatBtn = document.createElement('div');
        floatBtn.id = 'floatingCartBtn';
        floatBtn.innerHTML = `
            <button onclick="CartSystem.toggle()" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--gold, #2c5e4f);
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 9998;
                transition: all 0.3s;
            ">
                🛒 <span id="floatingCartCount" style="
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
    },
    
    // تبديل السلة
    toggle() {
        const sidebar = document.getElementById('mainCartSidebar');
        const overlay = document.getElementById('mainCartOverlay');
        if (sidebar.style.right === '0px') {
            this.close();
        } else {
            this.open();
        }
    },
    
    // فتح السلة
    open() {
        document.getElementById('mainCartSidebar').style.right = '0';
        document.getElementById('mainCartOverlay').style.display = 'block';
        this.display();
    },
    
    // إغلاق السلة
    close() {
        document.getElementById('mainCartSidebar').style.right = '-420px';
        document.getElementById('mainCartOverlay').style.display = 'none';
    },
    
    // إضافة للسلة
    add(productId) {
        const product = ShopSystem.getProduct(productId);
        if (!product || product.stock <= 0) {
            Utils.showNotification('المنتج غير متوفر', 'error');
            return false;
        }
        
        const existing = this.items.find(i => i.productId === productId);
        
        if (existing) {
            if (existing.quantity < product.stock) {
                existing.quantity++;
                Utils.showNotification(`✓ تم زيادة كمية ${product.name}`, 'success');
            } else {
                Utils.showNotification('الكمية غير متوفرة', 'warning');
                return false;
            }
        } else {
            this.items.push({
                productId: productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                merchantId: product.merchantId,
                merchantName: product.merchantName,
                image: product.images ? product.images[0] : product.image
            });
            Utils.showNotification(`✓ تم إضافة ${product.name} للسلة`, 'success');
        }
        
        this.save();
        this.open(); // فتح السلة تلقائياً عند الإضافة
        return true;
    },
    
    // تحديث الكمية
    update(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.remove(productId);
            return;
        }
        
        const item = this.items.find(i => i.productId === productId);
        const product = ShopSystem.getProduct(productId);
        
        if (item && product && newQuantity <= product.stock) {
            item.quantity = newQuantity;
            this.save();
        } else {
            Utils.showNotification('الكمية غير متوفرة', 'warning');
        }
    },
    
    // حذف من السلة
    remove(productId) {
        const item = this.items.find(i => i.productId === productId);
        this.items = this.items.filter(i => i.productId !== productId);
        this.save();
        Utils.showNotification(`✓ تم حذف ${item?.name || 'المنتج'} من السلة`, 'info');
    },
    
    // حفظ السلة
    save() {
        Utils.save('nardoo_cart', this.items);
        this.updateCounter();
        this.display();
    },
    
    // تحديث العداد
    updateCounter() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        
        // تحديث جميع أعداد السلة
        ['mainCartCount', 'cartCounter', 'fixedCartCounter', 'floatingCartCount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        });
        
        // تحديث عداد شريط التنقل إذا وجد
        const cartBtn = document.querySelector('.cart-btn .badge');
        if (cartBtn) cartBtn.textContent = count;
    },
    
    // عرض السلة
    display() {
        const container = document.getElementById('mainCartItems');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <i class="fas fa-shopping-cart" style="font-size:60px; color:var(--gold, #2c5e4f); opacity:0.5; margin-bottom:20px;"></i>
                    <p style="color: var(--text-secondary, #888);">سلة التسوق فارغة</p>
                    <button class="btn-outline-gold" onclick="CartSystem.close()" style="margin-top:20px;">
                        <i class="fas fa-arrow-right"></i> متابعة التسوق
                    </button>
                </div>
            `;
            document.getElementById('cartSubtotal').textContent = '0 دج';
            document.getElementById('cartTotalAmount').textContent = `${CONFIG.shipping || 800} دج`;
            return;
        }
        
        let subtotal = 0;
        let itemsHtml = '';
        
        this.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            itemsHtml += `
                <div class="cart-item" style="
                    display: flex;
                    gap: 15px;
                    padding: 15px;
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                    align-items: center;
                ">
                    <div style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="${item.image || CONFIG.defaultImage}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">${item.name}</div>
                        <div style="font-size: 12px; color: #888;">${item.merchantName || 'ناردو برو'}</div>
                        <div style="color: var(--gold, #2c5e4f); font-weight: bold;">${item.price.toLocaleString()} دج</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button onclick="CartSystem.update('${item.productId}', ${item.quantity - 1})" 
                                style="width: 28px; height: 28px; border-radius: 6px; background: #f0f0f0; border: none; cursor: pointer;">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span style="min-width: 30px; text-align: center; font-weight: bold;">${item.quantity}</span>
                            <button onclick="CartSystem.update('${item.productId}', ${item.quantity + 1})" 
                                style="width: 28px; height: 28px; border-radius: 6px; background: #f0f0f0; border: none; cursor: pointer;">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button onclick="CartSystem.remove('${item.productId}')" 
                                style="width: 28px; height: 28px; border-radius: 6px; background: #f87171; border: none; color: white; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div style="font-weight: bold;">${itemTotal.toLocaleString()} دج</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = itemsHtml;
        
        const shipping = CONFIG.shipping || 800;
        const total = subtotal + shipping;
        
        document.getElementById('cartSubtotal').textContent = `${subtotal.toLocaleString()} دج`;
        document.getElementById('cartShippingAmount').textContent = `${shipping} دج`;
        document.getElementById('cartTotalAmount').textContent = `${total.toLocaleString()} دج`;
    },
    
    // إتمام الشراء
    checkout() {
        if (this.items.length === 0) {
            Utils.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const shipping = CONFIG.shipping || 800;
        const total = subtotal + shipping;
        
        // بناء رسالة الطلب
        let orderMessage = `🛍️ *طلب جديد - ناردو برو*\n`;
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        this.items.forEach((item, index) => {
            orderMessage += `📦 ${index + 1}. ${item.name}\n`;
            orderMessage += `   الكمية: ${item.quantity}\n`;
            orderMessage += `   السعر: ${(item.price * item.quantity).toLocaleString()} دج\n\n`;
        });
        
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        orderMessage += `💰 المجموع الفرعي: ${subtotal.toLocaleString()} دج\n`;
        orderMessage += `🚚 الشحن: ${shipping} دج\n`;
        orderMessage += `💎 الإجمالي: ${total.toLocaleString()} دج\n`;
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (Auth.currentUser) {
            orderMessage += `\n👤 العميل: ${Auth.currentUser.name}\n`;
            orderMessage += `📞 الهاتف: ${Auth.currentUser.phone || 'غير مدخل'}\n`;
            orderMessage += `📧 البريد: ${Auth.currentUser.email || 'غير مدخل'}\n`;
        } else {
            const name = prompt('👤 أدخل اسمك:', '');
            const phone = prompt('📞 أدخل رقم هاتفك:', '');
            
            if (name && phone) {
                orderMessage += `\n👤 العميل: ${name}\n`;
                orderMessage += `📞 الهاتف: ${phone}\n`;
            } else {
                Utils.showNotification('يجب إدخال الاسم والهاتف', 'warning');
                return;
            }
        }
        
        orderMessage += `\n📅 التاريخ: ${new Date().toLocaleString('ar-EG')}\n`;
        orderMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        orderMessage += `شكراً لتسوقكم مع ناردو برو 🛍️`;
        
        // فتح واتساب لإرسال الطلب
        const whatsappUrl = `https://wa.me/${CONFIG.phone || '2135622448'}?text=${encodeURIComponent(orderMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        // إرسال للتلغرام إذا كان متاحاً
        if (window.Telegram && Telegram.sendOrder) {
            Telegram.sendOrder({
                customer: Auth.currentUser?.name || 'زائر',
                phone: Auth.currentUser?.phone || '',
                items: this.items,
                total: total
            });
        }
        
        Utils.showNotification(`✅ تم إرسال الطلب! الإجمالي: ${total.toLocaleString()} دج`, 'success');
        
        // تفريغ السلة بعد ثانيتين
        setTimeout(() => {
            this.items = [];
            this.save();
            this.close();
        }, 2000);
    },
    
    // تفريغ السلة
    clear() {
        this.items = [];
        this.save();
        Utils.showNotification('🗑️ تم تفريغ السلة', 'info');
    },
    
    // الحصول على عدد العناصر
    getCount() {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    
    // الحصول على المجموع
    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    }
};

// ===== [3.3] تهيئة الأنظمة =====
window.Shop = ShopSystem;
window.Cart = CartSystem;

// تهيئة السلة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    CartSystem.init();
});

console.log('✅ نظام المتجر مع السلة المتكاملة جاهز');
