// ========== 1. النظام الأساسي ==========
// المتغيرات العامة
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';

// ========== 2. نظام إدارة الطلبات (مع واتساب) ==========
class OrderManagementSystem {
    constructor() {
        this.orders = this.loadOrders();
        this.orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    }

    loadOrders() {
        const saved = localStorage.getItem('nardoo_orders_management');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrders() {
        localStorage.setItem('nardoo_orders_management', JSON.stringify(this.orders));
    }

    generateOrderId() {
        return `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    createOrder(orderData) {
        const order = {
            id: this.generateOrderId(),
            customerId: orderData.customerId || null,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items || [],
            subtotal: 0,
            tax: 0,
            shipping: orderData.shipping || 0,
            discount: orderData.discount || 0,
            total: 0,
            paymentMethod: orderData.paymentMethod || 'الواتساب',
            notes: orderData.notes || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [{
                status: 'pending',
                timestamp: new Date().toISOString(),
                message: 'تم إنشاء الطلب'
            }]
        };

        order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        order.tax = Math.round(order.subtotal * 0.09);
        order.total = order.subtotal + order.tax + order.shipping - order.discount;

        this.orders.push(order);
        this.saveOrders();
        return order;
    }

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    getCustomerOrders(customerId) {
        return this.orders.filter(o => o.customerId === customerId);
    }

    updateOrderStatus(orderId, newStatus, message = '') {
        const order = this.getOrder(orderId);
        if (!order) return false;

        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        order.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: message || this.getStatusMessage(newStatus)
        });

        this.saveOrders();
        return true;
    }

    getStatusMessage(status) {
        const messages = {
            'pending': 'في انتظار التأكيد',
            'confirmed': 'تم تأكيد الطلب',
            'processing': 'جاري المعالجة',
            'shipped': 'تم الشحن',
            'delivered': 'تم التسليم',
            'cancelled': 'تم الإلغاء'
        };
        return messages[status] || 'تحديث الطلب';
    }

    getOrderStatistics() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: 0,
            averageOrderValue: 0,
            ordersByStatus: {},
            recentOrders: []
        };

        this.orderStatuses.forEach(s => stats.ordersByStatus[s] = 0);

        this.orders.forEach(order => {
            stats.totalRevenue += order.total;
            stats.ordersByStatus[order.status]++;
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
        stats.recentOrders = this.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        return stats;
    }

    searchOrders(filters = {}) {
        return this.orders.filter(order => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.customerId && order.customerId !== filters.customerId) return false;
            if (filters.search) {
                const term = filters.search.toLowerCase();
                return order.id.toLowerCase().includes(term) ||
                       order.customerName.toLowerCase().includes(term) ||
                       order.customerPhone.includes(term);
            }
            return true;
        });
    }
}

// ========== 3. نظام الواتساب (معدل) ==========
class WhatsAppIntegration {
    constructor() {
        this.storePhone = '213562243648';
        this.orderHistory = this.loadOrderHistory();
    }

    loadOrderHistory() {
        const saved = localStorage.getItem('nardoo_order_history');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrderHistory() {
        localStorage.setItem('nardoo_order_history', JSON.stringify(this.orderHistory));
    }

    formatOrderMessage(orderData) {
        const {
            items = [],
            customerName = currentUser?.name || 'عميل',
            customerPhone = '',
            customerAddress = '',
            paymentMethod = 'الواتساب',
            notes = '',
            orderId = ''
        } = orderData;

        let message = '🛍️ *طلب جديد من نكهة وجمال*\n';
        message += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

        message += '👤 *العميل:*\n';
        message += `  • الاسم: ${customerName}\n`;
        message += `  • الهاتف: ${customerPhone || 'غير متوفر'}\n`;
        message += `  • العنوان: ${customerAddress || 'غير محدد'}\n\n`;

        message += '📦 *المنتجات:*\n';
        items.forEach((item, i) => {
            message += `  ${i+1}. ${item.name}\n`;
            message += `     • ${item.price.toLocaleString()} دج × ${item.quantity}\n`;
        });

        const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const shipping = this.calculateShipping(customerAddress);
        const total = subtotal + shipping;

        message += '\n💰 *المجموع:*\n';
        message += `  • المجموع الفرعي: ${subtotal.toLocaleString()} دج\n`;
        message += `  • الشحن: ${shipping} دج\n`;
        message += `  • *الإجمالي: ${total.toLocaleString()} دج*\n\n`;

        message += `💳 *الدفع:* ${paymentMethod}\n`;
        if (notes) message += `📝 *ملاحظات:* ${notes}\n`;
        if (orderId) message += `🔔 *معرّف الطلب:* #${orderId}\n`;

        return message;
    }

    calculateShipping(address) {
        if (!address) return 800;
        const rates = {
            'الجزائر': 500,
            'وهران': 700,
            'قسنطينة': 800,
            'الجنوب': 1200
        };

        for (const [region, cost] of Object.entries(rates)) {
            if (address.includes(region)) return cost;
        }
        return 800;
    }

    sendOrder(orderData, recipientPhone = null) {
        const message = this.formatOrderMessage(orderData);
        const phone = recipientPhone || this.storePhone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

        const order = {
            id: `WH${Date.now()}`,
            ...orderData,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };
        this.orderHistory.push(order);
        this.saveOrderHistory();

        return order.id;
    }

    getOrderHistory() {
        return this.orderHistory;
    }

    getSalesStatistics() {
        const stats = {
            totalOrders: this.orderHistory.length,
            totalRevenue: 0,
            averageOrderValue: 0
        };

        this.orderHistory.forEach(order => {
            const total = order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
            stats.totalRevenue += total;
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
        return stats;
    }
}

// ========== 4. نظام التحليلات (للمدير فقط) ==========
class AnalyticsSystem {
    constructor() {
        this.events = this.loadEvents();
        this.pageViews = this.loadPageViews();
        this.userSessions = this.loadUserSessions();
    }

    loadEvents() {
        const saved = localStorage.getItem('nardoo_analytics_events');
        return saved ? JSON.parse(saved) : [];
    }

    loadPageViews() {
        const saved = localStorage.getItem('nardoo_page_views');
        return saved ? JSON.parse(saved) : [];
    }

    loadUserSessions() {
        const saved = localStorage.getItem('nardoo_user_sessions');
        return saved ? JSON.parse(saved) : [];
    }

    saveEvents() {
        localStorage.setItem('nardoo_analytics_events', JSON.stringify(this.events));
    }

    savePageViews() {
        localStorage.setItem('nardoo_page_views', JSON.stringify(this.pageViews));
    }

    saveUserSessions() {
        localStorage.setItem('nardoo_user_sessions', JSON.stringify(this.userSessions));
    }

    trackEvent(eventType, eventData = {}) {
        const event = {
            id: `EVT${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        this.events.push(event);
        this.saveEvents();
    }

    trackPageView(pageName) {
        this.pageViews.push({
            id: `PV${Date.now()}`,
            pageName,
            timestamp: new Date().toISOString(),
            referrer: document.referrer
        });
        this.savePageViews();
    }

    getVisitStatistics() {
        return {
            totalPageViews: this.pageViews.length,
            uniquePages: new Set(this.pageViews.map(p => p.pageName)).size,
            totalEvents: this.events.length
        };
    }

    getConversionRate() {
        const cartEvents = this.events.filter(e => e.type === 'addToCart').length;
        const purchaseEvents = this.events.filter(e => e.type === 'purchase').length;
        return cartEvents > 0 ? ((purchaseEvents / cartEvents) * 100).toFixed(2) : 0;
    }

    generateComprehensiveReport() {
        return {
            visits: this.getVisitStatistics(),
            conversionRate: this.getConversionRate(),
            eventsByType: this.events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// ========== إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== إعداد حساب المدير ==========
function setupAdminAccount() {
    try {
        let users = JSON.parse(localStorage.getItem('nardoo_users') || '[]');
        const adminExists = users.some(u => u.name === 'azer' || u.email === 'azer@admin.com');
        
        if (!adminExists) {
            const adminUser = {
                id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                name: 'azer',
                email: 'azer@admin.com',
                password: '123456',
                role: 'admin',
                createdAt: new Date().toISOString()
            };
            
            users.push(adminUser);
            localStorage.setItem('nardoo_users', JSON.stringify(users));
            console.log('✅ تم إنشاء حساب المدير: azer / 123456');
        }
    } catch(e) {
        console.log('خطأ في إعداد المدير:', e);
    }
}

setupAdminAccount();

// ========== دوال المساعدة ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    toggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i><span>ليلي</span>' : 
        '<i class="fas fa-sun"></i><span>نهاري</span>';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== إدارة المنتجات ==========
function loadProducts() {
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        products = JSON.parse(saved);
    } else {
        // منتجات افتراضية
        products = [
            { 
                id: 1, 
                name: "عرض رمضان - طقم بهارات كامل", 
                category: "promo", 
                price: 3500, 
                stock: 20, 
                rating: 5.0,
                images: [
                    "https://via.placeholder.com/300/ff6b6b/ffffff?text=عرض+رمضان",
                    "https://via.placeholder.com/300/ff8787/ffffff?text=Ramadan+Offer"
                ],
                merchantId: null
            },
            { 
                id: 2, 
                name: "بهارات برياني أصلية - خلطة خاصة", 
                category: "spices", 
                price: 4500, 
                stock: 15, 
                rating: 4.5,
                images: [
                    "https://via.placeholder.com/300/ffd93d/000000?text=برياني",
                    "https://via.placeholder.com/300/ffd700/000000?text=برياني+2"
                ],
                merchantId: null
            },
            { 
                id: 3, 
                name: "زعفران أصلي - درجة أولى", 
                category: "spices", 
                price: 12000, 
                stock: 25, 
                rating: 5.0,
                images: [
                    "https://via.placeholder.com/300/8b0000/ffffff?text=زعفران",
                    "https://via.placeholder.com/300/a52a2a/ffffff?text=Saffron"
                ],
                merchantId: null
            },
            { 
                id: 4, 
                name: "زيت أرغان للشعر - عضوي 100%", 
                category: "cosmetic", 
                price: 3500, 
                stock: 8, 
                rating: 4.8,
                images: [
                    "https://via.placeholder.com/300/ff9f9f/000000?text=أرغان",
                    "https://via.placeholder.com/300/ffb6c1/000000?text=Argan"
                ],
                merchantId: null
            },
            { 
                id: 5, 
                name: "ماسك طين طبيعي - للبشرة", 
                category: "cosmetic", 
                price: 2500, 
                stock: 3, 
                rating: 4.3,
                images: [
                    "https://via.placeholder.com/300/228b22/ffffff?text=طين"
                ],
                merchantId: null
            },
            { 
                id: 6, 
                name: "كريم ترطيب للوجه - بزبدة الشيا", 
                category: "cosmetic", 
                price: 2800, 
                stock: 12, 
                rating: 4.4,
                images: [
                    "https://via.placeholder.com/300/8fbc8f/ffffff?text=كريم"
                ],
                merchantId: null
            },
            { 
                id: 7, 
                name: "سماعات بلوتوث لاسلكية", 
                category: "other", 
                price: 6500, 
                stock: 9, 
                rating: 4.6,
                images: [
                    "https://via.placeholder.com/300/4682b4/ffffff?text=سماعات"
                ],
                merchantId: null
            },
            { 
                id: 8, 
                name: "هاتف ذكي - شاشة 6.5 بوصة", 
                category: "other", 
                price: 45000, 
                stock: 5, 
                rating: 4.7,
                images: [
                    "https://via.placeholder.com/300/000000/ffffff?text=هاتف"
                ],
                merchantId: null
            },
            { 
                id: 9, 
                name: "قميص رجالي قطني", 
                category: "other", 
                price: 3200, 
                stock: 4, 
                rating: 4.2,
                images: [
                    "https://via.placeholder.com/300/556b2f/ffffff?text=قميص"
                ],
                merchantId: null
            }
        ];
    }
    saveProducts();
    displayProducts();
}

function saveProducts() {
    localStorage.setItem('nardoo_products', JSON.stringify(products));
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    // إذا كان التاجر يشاهد منتجاته فقط
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantId === currentUser.id);
    }
    // التصفية حسب التصنيف العادي
    else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <i class="fas fa-box-open" style="font-size: 60px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold);">لا توجد منتجات</h3>
                <p>لا توجد منتجات في هذا القسم</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;

        const images = product.images && product.images.length > 0 ? product.images : [
            "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"
        ];

        const slides = images.map((img, idx) => `
            <div class="swiper-slide">
                <img src="${img}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=صورة+غير+متوفرة'; this.onerror=null;">
            </div>
        `).join('');

        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';
        else if (product.category === 'other') categoryIcon = 'fas fa-gem';

        const merchant = users.find(u => u.id === product.merchantId);

        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-badge">${product.rating} ⭐</div>
                ${product.merchantId ? `<div class="merchant-badge"><i class="fas fa-store"></i> ${merchant?.name || 'تاجر'}</div>` : ''}
                
                <div class="product-gallery">
                    <div class="swiper product-swiper-${product.id}">
                        <div class="swiper-wrapper">
                            ${slides}
                        </div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="wishlist-btn" onclick="viewProductDetails(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        filtered.forEach(product => {
            if (document.querySelector(`.product-swiper-${product.id}`)) {
                new Swiper(`.product-swiper-${product.id}`, {
                    pagination: { el: '.swiper-pagination', clickable: true },
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                    loop: product.images?.length > 1,
                    autoplay: product.images?.length > 1 ? {
                        delay: 3000,
                        disableOnInteraction: false,
                    } : false,
                });
            }
        });
    }, 200);

    analyticsManager.trackPageView('products');
}

function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function filterProducts(category) {
    currentFilter = category;
    
    document.querySelectorAll('.nav-link, .category-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll(`[onclick*="'${category}'"]`).forEach(el => {
        el.classList.add('active');
    });
    
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
    analyticsManager.trackEvent('search', { searchTerm });
    
    // إظهار تأثير عند البحث
    const searchBox = document.querySelector('.search-box');
    searchBox.style.animation = 'pulse 0.5s';
    setTimeout(() => {
        searchBox.style.animation = '';
    }, 500);
    
    // إظهار مؤشر البحث
    showSearchIndicator(searchTerm);
}

// إظهار مؤشر البحث
function showSearchIndicator(term) {
    if (!term) return;
    
    const searchWrapper = document.querySelector('.search-wrapper');
    let indicator = document.querySelector('.search-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'search-indicator';
        searchWrapper.appendChild(indicator);
    }
    
    indicator.innerHTML = `🔍 جاري البحث عن: "${term}"`;
    
    // إخفاء المؤشر بعد 3 ثواني
    setTimeout(() => {
        if (indicator) {
            indicator.remove();
        }
    }, 3000);
}

// ========== إدارة السلة ==========
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCounter').textContent = count;
    updateFixedCartCounter(); // تحديث العداد الثابت
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showAdvancedNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showAdvancedNotification('الكمية المتوفرة غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.images?.[0] || ''
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showAdvancedNotification('تمت الإضافة إلى السلة', 'success', 'تم بنجاح');
    analyticsManager.trackEvent('addToCart', { productId });
    
    // تأثير اهتزاز للسلة الثابتة
    const fixedCart = document.getElementById('fixedCart');
    fixedCart.style.animation = 'shake 0.5s';
    setTimeout(() => {
        fixedCart.style.animation = 'pulse 2s infinite';
    }, 500);
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">السلة فارغة</div>';
        totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171; color: white;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    totalSpan.textContent = `${total.toLocaleString()} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId === productId);
    const product = products.find(p => p.id === productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        showAdvancedNotification('الكمية غير متوفرة', 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId !== productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showAdvancedNotification('تمت إزالة المنتج من السلة', 'info', 'تم');
}

function checkoutCart() {
    if (cart.length === 0) {
        showAdvancedNotification('السلة فارغة', 'warning');
        return;
    }

    const orderData = {
        items: cart,
        customerName: currentUser?.name || 'عميل',
        customerPhone: '',
        customerAddress: '',
        paymentMethod: 'الواتساب'
    };

    const order = orderManager.createOrder({
        ...orderData,
        customerId: currentUser?.id
    });

    whatsappManager.sendOrder({
        ...orderData,
        orderId: order.id
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();

    showAdvancedNotification('تم إرسال الطلب عبر واتساب بنجاح', 'success', 'طلب جديد');
    analyticsManager.trackEvent('checkout', { orderId: order.id });
}

// ========== دوال التمرير والصعود والهبوط ==========
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function scrollToBottom() {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
    });
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// إظهار/إخفاء زر العودة للأعلى
function toggleQuickTopButton() {
    const quickTopBtn = document.getElementById('quickTopBtn');
    if (!quickTopBtn) return;
    
    if (window.scrollY > 300) {
        quickTopBtn.classList.add('show');
    } else {
        quickTopBtn.classList.remove('show');
    }
}

// تحديث عداد السلة الثابت
function updateFixedCartCounter() {
    const fixedCounter = document.getElementById('fixedCartCounter');
    if (fixedCounter) {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        fixedCounter.textContent = count;
    }
}

// إضافة تأثيرات التمرير للعناصر
function addScrollAnimations() {
    const elements = document.querySelectorAll('.product-card, .feature-card, .marquee-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

// ========== عداد تنازلي متحرك ==========
function updateCountdown() {
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const marqueeHours = document.getElementById('marqueeHours');
    const marqueeMinutes = document.getElementById('marqueeMinutes');
    const marqueeSeconds = document.getElementById('marqueeSeconds');
    
    if (!hoursElement || !minutesElement || !secondsElement) return;
    
    let hours = 12;
    let minutes = 30;
    let seconds = 45;
    
    // تحديث العداد كل ثانية
    const interval = setInterval(() => {
        seconds--;
        
        if (seconds < 0) {
            seconds = 59;
            minutes--;
            
            if (minutes < 0) {
                minutes = 59;
                hours--;
                
                if (hours < 0) {
                    hours = 12;
                    minutes = 30;
                    seconds = 45;
                }
            }
        }
        
        // تحديث العرض مع تأثير حركي
        const displayValue = (num) => num.toString().padStart(2, '0');
        
        hoursElement.textContent = displayValue(hours);
        minutesElement.textContent = displayValue(minutes);
        secondsElement.textContent = displayValue(seconds);
        
        if (marqueeHours) marqueeHours.textContent = displayValue(hours);
        if (marqueeMinutes) marqueeMinutes.textContent = displayValue(minutes);
        if (marqueeSeconds) marqueeSeconds.textContent = displayValue(seconds);
        
    }, 1000);
    
    return interval;
}

// ========== تحديث أشرطة التقدم ==========
function updateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill, .marquee-progress-fill');
    
    setInterval(() => {
        progressFills.forEach(fill => {
            const randomWidth = Math.floor(Math.random() * 50) + 50;
            fill.style.width = randomWidth + '%';
        });
    }, 5000);
}

// ========== عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <div style="display: grid; gap: 10px;">
                    ${images}
                </div>
            </div>
            <div>
                <div style="margin-bottom: 20px;">
                    <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">${getCategoryName(product.category)}</span>
                </div>
                <p style="margin-bottom: 20px; color: var(--text-secondary);">${product.description || 'منتج عالي الجودة من نكهة وجمال'}</p>
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: 800; color: var(--gold);">${product.price.toLocaleString()}</span>
                    <small style="color: var(--gold-light);"> دج</small>
                </div>
                <div style="margin-bottom: 20px;">
                    <span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}" style="padding: 8px 15px;">
                        ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                    </span>
                </div>
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" style="flex: 2;" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                    <button class="btn-outline-gold" style="flex: 1;" onclick="closeModal('productDetailModal')">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== إدارة المستخدمين والصلاحيات ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        return JSON.parse(saved);
    }
    return [
        { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin' }
    ];
}

let users = loadUsers();

function saveUsers() {
    localStorage.setItem('nardoo_users', JSON.stringify(users));
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const buttons = document.querySelectorAll('#loginModal .btn-gold, #loginModal .btn-outline-gold');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        buttons[0].className = 'btn-gold';
        buttons[1].className = 'btn-outline-gold';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        buttons[0].className = 'btn-outline-gold';
        buttons[1].className = 'btn-gold';
    }
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant').checked;
    document.getElementById('merchantFields').style.display = isMerchant ? 'block' : 'none';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        
        // تحديث الواجهة حسب الدور
        updateUIBasedOnRole();
        
        showAdvancedNotification(`مرحباً ${user.name}`, 'success', 'تسجيل دخول ناجح');
        analyticsManager.trackEvent('login', { userId: user.id, role: user.role });
    } else {
        showAdvancedNotification('بيانات الدخول غير صحيحة', 'error', 'خطأ');
    }
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    // إخفاء كل العناصر أولاً
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // إخفاء لوحة التاجر
    document.getElementById('merchantPanelContainer').style.display = 'none';
    
    // إزالة زر "منتجاتي" إذا كان موجوداً
    const myProductsBtn = document.getElementById('myProductsBtn');
    if (myProductsBtn) myProductsBtn.remove();

    if (currentUser.role === 'admin') {
        // المدير: يظهر زر لوحة التحكم
        document.getElementById('dashboardBtn').style.display = 'flex';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-crown"></i>';
        
        // إظهار العناصر الخاصة بالمدير
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });
        
        showAdvancedNotification('مرحباً بك يا مدير - لديك صلاحيات كاملة', 'success', 'مدير');
    } 
    else if (currentUser.role === 'merchant_approved') {
        // التاجر: لا يرى لوحة التحكم، يرى لوحة التاجر
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-store"></i>';
        
        // إضافة زر "منتجاتي" في القائمة
        addMerchantMenuButton();
        
        // عرض لوحة التاجر
        showMerchantPanel();
        
        showAdvancedNotification('مرحباً أيها التاجر - يمكنك إدارة منتجاتك فقط', 'info', 'تاجر');
    } 
    else {
        // عميل عادي
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-user"></i>';
    }
}

// إضافة زر للتاجر لعرض منتجاته
function addMerchantMenuButton() {
    const navMenu = document.getElementById('mainNav');
    if (navMenu && !document.getElementById('myProductsBtn')) {
        const btn = document.createElement('a');
        btn.className = 'nav-link';
        btn.id = 'myProductsBtn';
        btn.setAttribute('onclick', 'viewMyProducts()');
        btn.innerHTML = '<i class="fas fa-box"></i><span>منتجاتي</span>';
        navMenu.appendChild(btn);
    }
}

// عرض منتجات التاجر فقط
function viewMyProducts() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    currentFilter = 'my_products';
    
    document.querySelectorAll('.nav-link, .category-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById('myProductsBtn').classList.add('active');
    displayProducts();
}

// عرض لوحة التاجر
function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantId === currentUser.id);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    const panelContainer = document.getElementById('merchantPanelContainer');
    panelContainer.style.display = 'block';
    
    panelContainer.innerHTML = `
        <div class="merchant-panel">
            <h3>
                <i class="fas fa-store"></i>
                لوحة التاجر - ${currentUser.name}
            </h3>
            <div class="stats">
                <div class="stat-item">
                    <div class="number">${merchantProducts.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div class="stat-item">
                    <div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>المنتجات المتاحة</div>
                </div>
                <div class="stat-item">
                    <div class="number">${totalSales.toLocaleString()} دج</div>
                    <div>إجمالي المبيعات</div>
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()">
                    <i class="fas fa-plus"></i> إضافة منتج جديد
                </button>
                <button class="btn-outline-gold" onclick="viewMyProducts()">
                    <i class="fas fa-box"></i> عرض منتجاتي
                </button>
            </div>
        </div>
    `;
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error', 'خطأ');
        return;
    }

    if (users.find(u => u.email === email)) {
        showAdvancedNotification('البريد الإلكتروني مستخدم بالفعل', 'error', 'خطأ');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        role: isMerchant ? 'merchant_pending' : 'customer',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.merchantDesc = document.getElementById('merchantDesc').value;
    }

    users.push(newUser);
    saveUsers();
    showAdvancedNotification('تم التسجيل بنجاح' + (isMerchant ? '، طلبك قيد المراجعة' : ''), 'success', 'مرحباً بك');
    switchAuthTab('login');
}

// ========== لوحة التحكم (للمدير فقط) ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showAdvancedNotification('غير مصرح لك بالدخول - هذه الصفحة للمدير فقط', 'error', 'خطأ');
        return;
    }

    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth' });
    switchDashboardTab('overview');
}

function switchDashboardTab(tab) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const tabs = document.querySelectorAll('.dashboard-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    
    switch(tab) {
        case 'overview':
            showDashboardOverview(content);
            break;
        case 'orders':
            showDashboardOrders(content);
            break;
        case 'analytics':
            showDashboardAnalytics(content);
            break;
        case 'products':
            showDashboardProducts(content);
            break;
        case 'merchants':
            showDashboardMerchants(content);
            break;
    }
}

function showDashboardOverview(container) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const orderStats = orderManager.getOrderStatistics();
    const whatsappStats = whatsappManager.getSalesStatistics();
    const analytics = analyticsManager.generateComprehensiveReport();

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة على المتجر</h3>
        
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-shopping-cart"></i>
                <div class="stat-value">${orderStats.totalOrders}</div>
                <div class="stat-label">إجمالي الطلبات</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-coins"></i>
                <div class="stat-value">${orderStats.totalRevenue.toLocaleString()}</div>
                <div class="stat-label">الإيرادات (دج)</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-line"></i>
                <div class="stat-value">${orderStats.averageOrderValue.toFixed(0)}</div>
                <div class="stat-label">متوسط قيمة الطلب</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-percent"></i>
                <div class="stat-value">${analytics.conversionRate}%</div>
                <div class="stat-label">معدل التحويل</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="ordersChart"></canvas>
        </div>

        <h4 style="margin: 30px 0 20px; color: var(--gold);">الطلبات الأخيرة</h4>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>المجموع</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderStats.recentOrders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td style="color: var(--gold); font-weight: 700;">${order.total.toLocaleString()} دج</td>
                            <td>
                                <span style="background: ${order.status === 'delivered' ? '#4ade80' : order.status === 'cancelled' ? '#f87171' : '#fbbf24'}; 
                                             color: ${order.status === 'delivered' ? '#000' : '#fff'}; 
                                             padding: 5px 10px; border-radius: 20px; font-size: 12px;">
                                    ${orderManager.getStatusMessage(order.status)}
                                </span>
                            </td>
                            <td>${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('ordersChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'الطلبات',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(212, 175, 55, 0.1)' },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
                    }
                }
            }
        });
    }, 100);
}

function showDashboardOrders(container) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const orders = orderManager.orders;

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">إدارة الطلبات</h3>
        
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <input type="text" class="form-control" id="orderSearch" placeholder="بحث برقم الطلب أو اسم العميل..." style="width: 300px;">
            <button class="btn-gold" onclick="searchOrders()">بحث</button>
        </div>

        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>المجموع</th>
                        <th>الحالة</th>
                        <th>طريقة الدفع</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td style="color: var(--gold); font-weight: 700;">${order.total.toLocaleString()} دج</td>
                            <td>
                                <select class="form-control" onchange="updateOrderStatus('${order.id}', this.value)" style="width: 140px;">
                                    ${orderManager.orderStatuses.map(status => `
                                        <option value="${status}" ${order.status === status ? 'selected' : ''}>
                                            ${orderManager.getStatusMessage(status)}
                                        </option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>${order.paymentMethod}</td>
                            <td>
                                <button class="btn-outline-gold" onclick="viewOrderDetails('${order.id}')" style="padding: 5px 10px;">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function updateOrderStatus(orderId, status) {
    if (!currentUser || currentUser.role !== 'admin') return;
    orderManager.updateOrderStatus(orderId, status);
    showAdvancedNotification('تم تحديث حالة الطلب', 'success', 'نجاح');
}

function showDashboardAnalytics(container) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const analytics = analyticsManager.generateComprehensiveReport();
    const eventsByType = Object.entries(analytics.eventsByType).map(([type, count]) => ({ type, count }));

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">التحليلات والإحصائيات</h3>
        
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-eye"></i>
                <div class="stat-value">${analytics.visits.totalPageViews}</div>
                <div class="stat-label">مشاهدات الصفحات</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-bar"></i>
                <div class="stat-value">${analytics.visits.uniquePages}</div>
                <div class="stat-label">صفحات فريدة</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-bolt"></i>
                <div class="stat-value">${analytics.visits.totalEvents}</div>
                <div class="stat-label">إجمالي الأحداث</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-percent"></i>
                <div class="stat-value">${analytics.conversionRate}%</div>
                <div class="stat-label">معدل التحويل</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="eventsChart"></canvas>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('eventsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: eventsByType.map(e => e.type),
                datasets: [{
                    label: 'عدد الأحداث',
                    data: eventsByType.map(e => e.count),
                    backgroundColor: '#d4af37',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(212, 175, 55, 0.1)' },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
                    }
                }
            }
        });
    }, 100);
}

function showDashboardProducts(container) {
    if (!currentUser || currentUser.role !== 'admin') return;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <h3 style="color: var(--gold);">إدارة المنتجات</h3>
            <button class="btn-gold" onclick="showAddProductModal()">
                <i class="fas fa-plus"></i> إضافة منتج
            </button>
        </div>

        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>القسم</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>التاجر</th>
                        <th>التقييم</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => {
                        const merchant = users.find(u => u.id === product.merchantId);
                        return `
                            <tr>
                                <td>${product.name}</td>
                                <td>${getCategoryName(product.category)}</td>
                                <td style="color: var(--gold); font-weight: 700;">${product.price.toLocaleString()} دج</td>
                                <td>
                                    <span class="${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}" 
                                          style="padding: 3px 10px; border-radius: 20px; font-size: 12px;">
                                        ${product.stock}
                                    </span>
                                </td>
                                <td>${merchant ? merchant.name : 'منتج عام'}</td>
                                <td>${product.rating} ⭐</td>
                                <td>
                                    <button class="btn-outline-gold" onclick="editProduct(${product.id})" style="padding: 5px 10px; margin-left: 5px;">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-outline-gold" onclick="deleteProduct(${product.id})" style="padding: 5px 10px; background: #f87171; color: white;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardMerchants(container) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved');

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">إدارة التجار</h3>
        
        <h4 style="margin: 20px 0; color: var(--gold);">طلبات الانضمام (${pendingMerchants.length})</h4>
        ${pendingMerchants.map(merchant => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h5 style="color: var(--gold);">${merchant.name}</h5>
                        <p><i class="fas fa-envelope" style="color: var(--gold);"></i> ${merchant.email}</p>
                        <p><i class="fas fa-store" style="color: var(--gold);"></i> المستوى: ${merchant.merchantLevel} | ${merchant.merchantDesc}</p>
                    </div>
                    <div>
                        <button class="btn-gold" onclick="approveMerchant(${merchant.id})" style="margin-left: 10px;">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                        <button class="btn-outline-gold" onclick="rejectMerchant(${merchant.id})">
                            <i class="fas fa-times"></i> رفض
                        </button>
                    </div>
                </div>
            </div>
        `).join('')}

        <h4 style="margin: 30px 0 20px; color: var(--gold);">التجار المعتمدون (${approvedMerchants.length})</h4>
        ${approvedMerchants.map(merchant => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h5 style="color: var(--gold);">${merchant.name} <i class="fas fa-check-circle" style="color: #4ade80;"></i></h5>
                        <p><i class="fas fa-envelope" style="color: var(--gold);"></i> ${merchant.email}</p>
                        <p><i class="fas fa-store" style="color: var(--gold);"></i> المستوى: ${merchant.merchantLevel}</p>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function approveMerchant(userId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const user = users.find(u => u.id === userId);
    if (user) {
        user.role = 'merchant_approved';
        saveUsers();
        showAdvancedNotification('تمت الموافقة على التاجر', 'success', 'نجاح');
        openDashboard();
        switchDashboardTab('merchants');
    }
}

function rejectMerchant(userId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const user = users.find(u => u.id === userId);
    if (user) {
        user.role = 'customer';
        saveUsers();
        showAdvancedNotification('تم رفض طلب التاجر', 'info', 'تم');
        openDashboard();
        switchDashboardTab('merchants');
    }
}

// ========== إدارة المنتجات (مع صلاحيات) ==========
function showAddProductModal() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'warning', 'تنبيه');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'merchant_approved') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد (خاص بك)';
        
        // تعيين التاجر تلقائياً لمنتجاته
        const merchantSelect = document.getElementById('productMerchant');
        merchantSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name}</option>`;
        merchantSelect.disabled = true;
        
        showAdvancedNotification('يمكنك إضافة منتج خاص بك فقط', 'info', 'تاجر');
    } 
    else if (currentUser.role === 'admin') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
        
        // تعبئة قائمة التجار للمدير
        const merchantSelect = document.getElementById('productMerchant');
        merchantSelect.innerHTML = '<option value="">منتج عام</option>';
        users.filter(u => u.role === 'merchant_approved').forEach(m => {
            merchantSelect.innerHTML += `<option value="${m.id}">${m.name} (مستوى ${m.merchantLevel})</option>`;
        });
        merchantSelect.disabled = false;
    } 
    else {
        showAdvancedNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error', 'خطأ');
        return;
    }
    
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('editingProductId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productImagesData').value = '';

    document.getElementById('productModal').style.display = 'flex';
}

function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const imagesData = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function(e) {
            preview.innerHTML += `<img src="${e.target.result}" class="preview-image">`;
            imagesData.push(e.target.result);
            document.getElementById('productImagesData').value = JSON.stringify(imagesData);
        };

        reader.readAsDataURL(file);
    }
}

function saveProduct() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error', 'خطأ');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const editingId = document.getElementById('editingProductId').value;
    const imagesData = document.getElementById('productImagesData').value;

    if (!name || !category || !price || !stock) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error', 'خطأ');
        return;
    }

    // تحديد merchantId حسب الدور
    let merchantId = null;
    if (currentUser.role === 'merchant_approved') {
        merchantId = currentUser.id;
    } else if (currentUser.role === 'admin') {
        merchantId = document.getElementById('productMerchant').value || null;
    }

    const images = imagesData ? JSON.parse(imagesData) : [];

    if (editingId) {
        const index = products.findIndex(p => p.id == editingId);
        if (index !== -1) {
            // التحقق من صلاحية التعديل
            if (currentUser.role === 'merchant_approved' && products[index].merchantId !== currentUser.id) {
                showAdvancedNotification('لا يمكنك تعديل منتجات الآخرين', 'error', 'خطأ');
                return;
            }
            
            products[index] = {
                ...products[index],
                name,
                category,
                price,
                stock,
                merchantId,
                images: images.length > 0 ? images : products[index].images
            };
        }
        showAdvancedNotification('تم تعديل المنتج', 'success', 'نجاح');
    } else {
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
            id: newId,
            name,
            category,
            price,
            stock,
            rating: 4.5,
            images: images.length > 0 ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
            merchantId
        });
        showAdvancedNotification('تم إضافة المنتج', 'success', 'نجاح');
    }

    saveProducts();
    displayProducts();
    closeModal('productModal');
    
    // تحديث لوحة التاجر إذا كان تاجر
    if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }
    
    analyticsManager.trackEvent('productAdded', { name, merchantId });
}

function editProduct(id) {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error', 'خطأ');
        return;
    }

    const product = products.find(p => p.id === id);
    if (!product) return;

    // التحقق من صلاحية التعديل
    if (currentUser.role === 'merchant_approved' && product.merchantId !== currentUser.id) {
        showAdvancedNotification('لا يمكنك تعديل منتجات الآخرين', 'error', 'خطأ');
        return;
    }

    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('editingProductId').value = id;

    // تعطيل/تمكين حقل التاجر حسب الدور
    const merchantSelect = document.getElementById('productMerchant');
    if (currentUser.role === 'merchant_approved') {
        merchantSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name}</option>`;
        merchantSelect.disabled = true;
    } else if (currentUser.role === 'admin') {
        merchantSelect.innerHTML = '<option value="">منتج عام</option>';
        users.filter(u => u.role === 'merchant_approved').forEach(m => {
            merchantSelect.innerHTML += `<option value="${m.id}" ${product.merchantId === m.id ? 'selected' : ''}>${m.name}</option>`;
        });
        merchantSelect.disabled = false;
    }

    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    if (product.images) {
        product.images.forEach(img => {
            preview.innerHTML += `<img src="${img}" class="preview-image">`;
        });
    }

    document.getElementById('productModal').style.display = 'flex';
}

function deleteProduct(id) {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error', 'خطأ');
        return;
    }

    const product = products.find(p => p.id === id);
    
    // التحقق من صلاحية الحذف
    if (currentUser.role === 'merchant_approved' && product.merchantId !== currentUser.id) {
        showAdvancedNotification('لا يمكنك حذف منتجات الآخرين', 'error', 'خطأ');
        return;
    }
    
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        displayProducts();
        showAdvancedNotification('تم حذف المنتج', 'info', 'تم');
        
        // تحديث لوحة التاجر إذا كان تاجر
        if (currentUser.role === 'merchant_approved') {
            showMerchantPanel();
        }
        
        analyticsManager.trackEvent('productDeleted', { productId: id });
    }
}

// ========== نظام الإشعارات المتقدم ==========
function showAdvancedNotification(message, type = 'info', title = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const titles = {
        success: 'نجاح',
        error: 'خطأ',
        warning: 'تنبيه',
        info: 'معلومات'
    };
    
    toast.innerHTML = `
        <div class="toast-icon ${type}">
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : type === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ========== تأثيرات الكتابة ==========
class TypingAnimation {
    constructor(element, texts, speed = 100, delay = 2000) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.delay = delay;
        this.currentIndex = 0;
        this.isDeleting = false;
        this.text = '';
    }

    start() {
        this.type();
    }

    type() {
        const current = this.texts[this.currentIndex];
        
        if (this.isDeleting) {
            this.text = current.substring(0, this.text.length - 1);
        } else {
            this.text = current.substring(0, this.text.length + 1);
        }

        this.element.innerHTML = this.text;

        let typeSpeed = this.speed;

        if (this.isDeleting) {
            typeSpeed /= 2;
        }

        if (!this.isDeleting && this.text === current) {
            typeSpeed = this.delay;
            this.isDeleting = true;
        } else if (this.isDeleting && this.text === '') {
            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            typeSpeed = 500;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

// ========== نظام المقارنة ==========
class ProductComparator {
    constructor() {
        this.compareList = JSON.parse(localStorage.getItem('compare_list')) || [];
    }

    addToCompare(product) {
        if (this.compareList.length >= 4) {
            showAdvancedNotification('لا يمكن مقارنة أكثر من 4 منتجات', 'warning', 'تنبيه');
            return false;
        }
        
        if (!this.compareList.find(p => p.id === product.id)) {
            this.compareList.push(product);
            localStorage.setItem('compare_list', JSON.stringify(this.compareList));
            showAdvancedNotification('تمت الإضافة للمقارنة', 'success', 'نجاح');
            return true;
        }
        return false;
    }

    removeFromCompare(productId) {
        this.compareList = this.compareList.filter(p => p.id !== productId);
        localStorage.setItem('compare_list', JSON.stringify(this.compareList));
    }

    getCompareList() {
        return this.compareList;
    }

    clearCompare() {
        this.compareList = [];
        localStorage.setItem('compare_list', JSON.stringify(this.compareList));
    }
}

const comparator = new ProductComparator();

// ========== تأثيرات الماوس ==========
function initMouseEffects() {
    const cursor = document.createElement('div');
    cursor.className = 'mouse-effect';
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'mouse-effect-dot';
    
    document.body.appendChild(cursor);
    document.body.appendChild(cursorDot);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        cursorDot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
    });
    
    document.querySelectorAll('a, button, .product-card').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ========== شريط تقدم التمرير ==========
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// ========== جسيمات متحركة ==========
function initParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// ========== دوال إضافية ==========
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ========== التهيئة ==========
window.onload = function() {
    loadProducts();
    loadCart();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        toggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }

    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 500);
    }, 1000);

    analyticsManager.trackPageView('home');
    
    // ===== تفعيل التحسينات الجديدة =====
    updateFixedCartCounter();
    window.addEventListener('scroll', toggleQuickTopButton);
    addScrollAnimations();
    updateCountdown();
    updateProgressBars();
    initMouseEffects();
    initScrollProgress();
    initParticles();
    
    // تفعيل تأثير الكتابة إذا وجد العنصر
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const typing = new TypingAnimation(
            typingElement,
            ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'],
            100,
            2000
        );
        typing.start();
    }
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
