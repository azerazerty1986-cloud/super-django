
/* ================================================================== */
/* ===== [03] الملف: 03-shop.js - نظام المتجر والمنتجات ===== */
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
        if (window.Telegram) {
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

// ===== [3.2] نظام السلة =====
const CartSystem = {
    items: [],
    
    // التهيئة
    init() {
        this.items = Utils.load('nardoo_cart', []);
        this.updateCounter();
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
        }
        
        this.save();
        Utils.showNotification('✅ تمت الإضافة للسلة');
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
        this.items = this.items.filter(i => i.productId !== productId);
        this.save();
        Utils.showNotification('🗑️ تم الحذف من السلة', 'info');
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
        ['cartCounter', 'fixedCartCounter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        });
    },
    
    // عرض السلة
    display() {
        const container = document.getElementById('cartItems');
        const totalSpan = document.getElementById('cartTotal');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px;">السلة فارغة</div>';
            totalSpan.textContent = `0 ${CONFIG.currency}`;
            return;
        }
        
        let total = 0;
        container.innerHTML = this.items.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image || CONFIG.defaultImage}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="App.updateCartItem('${item.productId}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="App.updateCartItem('${item.productId}', ${item.quantity + 1})">+</button>
                            <button class="quantity-btn" onclick="App.removeFromCart('${item.productId}')" style="background:#f87171;">×</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        totalSpan.textContent = `${total.toLocaleString()} ${CONFIG.currency}`;
    },
    
    // إتمام الشراء
    checkout() {
        if (this.items.length === 0) {
            Utils.showNotification('السلة فارغة', 'warning');
            return;
        }
        
        const subtotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const total = subtotal + CONFIG.shipping;
        
        // إنشاء رسالة الطلب
        let message = '🛍️ *طلب جديد*\n\n';
        this.items.forEach(item => {
            message += `• ${item.name} (${item.quantity}) = ${item.price * item.quantity} دج\n`;
        });
        message += `\n💰 المجموع الفرعي: ${subtotal} دج`;
        message += `\n🚚 التوصيل: ${CONFIG.shipping} دج`;
        message += `\n💵 الإجمالي: ${total} دج`;
        
        if (Auth.currentUser) {
            message += `\n\n👤 العميل: ${Auth.currentUser.name}`;
            message += `\n📞 الهاتف: ${Auth.currentUser.phone}`;
        }
        
        // فتح واتساب
        window.open(`https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(message)}`, '_blank');
        
        // إرسال للتلغرام
        if (window.Telegram) {
            Telegram.sendOrder({
                customer: Auth.currentUser?.name || 'زائر',
                phone: Auth.currentUser?.phone || '',
                items: this.items,
                total: total
            });
        }
        
        Utils.showNotification('✅ تم التوجيه إلى واتساب', 'success');
    },
    
    // تفريغ السلة
    clear() {
        this.items = [];
        this.save();
    }
};

// ===== [3.3] تهيئة الأنظمة =====
window.Shop = ShopSystem;
window.Cart = CartSystem;

// تهيئة السلة
CartSystem.init();

console.log('✅ نظام المتجر جاهز');

