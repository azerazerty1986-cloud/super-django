// ==========================================
// نظام تلغرام المبسط - ناردو برو
// ==========================================

// إعدادات تلغرام
const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// المتغيرات العامة
let products = [];
let currentUser = null;
let cart = [];

// ===== تحميل البيانات من localStorage =====
function loadData() {
    // تحميل المستخدمين
    const savedUsers = localStorage.getItem('nardoo_users');
    if (!savedUsers) {
        const defaultUsers = [
            { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin', phone: '0555000000' },
            { id: 2, name: 'تاجر', email: 'merchant@test.com', password: 'm123', role: 'merchant_approved', phone: '0555111111', storeName: 'متجر تجريبي' }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(defaultUsers));
    }
    
    // تحميل المنتجات
    const savedProducts = localStorage.getItem('nardoo_products');
    if (!savedProducts) {
        const defaultProducts = [
            { id: 1, name: "زعتر فلسطيني", category: "spices", price: 450, stock: 50, description: "زعتر بلدي أصلي", rating: 4.5 },
            { id: 2, name: "كريم ترطيب", category: "cosmetic", price: 1200, stock: 30, description: "كريم طبيعي للبشرة", rating: 4.8 },
            { id: 3, name: "زيت زيتون", category: "promo", price: 800, stock: 100, description: "زيت زيتون بكر ممتاز", rating: 4.9 },
            { id: 4, name: "بهارات مشكلة", category: "spices", price: 350, stock: 75, description: "مزيج من أجود البهارات", rating: 4.6 },
            { id: 5, name: "ماسك للوجه", category: "cosmetic", price: 650, stock: 40, description: "ماسك طبيعي للبشرة", rating: 4.7 }
        ];
        localStorage.setItem('nardoo_products', JSON.stringify(defaultProducts));
    }
    
    products = JSON.parse(localStorage.getItem('nardoo_products'));
    
    // تحميل المستخدم الحالي
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    // تحميل السلة
    const savedCart = localStorage.getItem('nardoo_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// ===== حفظ السلة =====
function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

// ===== تحديث عداد السلة =====
function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// ===== عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px;">لا توجد منتجات</div>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="viewProduct(${product.id})">
            <div class="product-image">
                <i class="fas fa-box-open"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${product.price.toLocaleString()} دج</div>
                <div class="product-stock">المتبقي: ${product.stock} قطعة</div>
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> أضف للسلة
                </button>
            </div>
        </div>
    `).join('');
}

// ===== إضافة للسلة =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showNotification('الكمية غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCounter();
    showNotification('تمت الإضافة للسلة', 'success');
}

// ===== عرض السلة =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        updateCartDisplay();
    }
}

// ===== تحديث عرض السلة =====
function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    
    if (!itemsDiv) return;
    
    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align:center; padding:40px;">السلة فارغة</div>';
        if (totalSpan) totalSpan.textContent = '0 دج';
        return;
    }
    
    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div style="border-bottom:1px solid rgba(255,215,0,0.3); padding:15px;">
                <div><strong>${item.name}</strong></div>
                <div>${item.price.toLocaleString()} دج × ${item.quantity}</div>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="updateQuantity(${item.id}, -1)" style="background:#ffd700; border:none; padding:5px 10px; border-radius:5px;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" style="background:#ffd700; border:none; padding:5px 10px; border-radius:5px;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="background:#ff4444; border:none; padding:5px 10px; border-radius:5px;">حذف</button>
                </div>
            </div>
        `;
    }).join('');
    
    if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}

// ===== تحديث الكمية =====
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    const product = products.find(p => p.id === productId);
    
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (newQuantity <= product.stock) {
            item.quantity = newQuantity;
            saveCart();
            updateCartCounter();
            updateCartDisplay();
        } else {
            showNotification('الكمية غير متوفرة', 'warning');
        }
    }
}

// ===== إزالة من السلة =====
function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإزالة', 'info');
}

// ===== إتمام الشراء =====
function checkout() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }
    
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }
    
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const message = `🛍️ طلب جديد من ${currentUser.name}\n\n` +
        cart.map(i => `• ${i.name} x${i.quantity} = ${i.price * i.quantity} دج`).join('\n') +
        `\n\n💰 الإجمالي: ${total} دج`;
    
    window.open(`https://wa.me/2135622448?text=${encodeURIComponent(message)}`, '_blank');
    showNotification('تم إرسال الطلب', 'success');
}

// ===== عرض تفاصيل المنتج =====
function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    alert(`📦 ${product.name}\n💰 السعر: ${product.price} دج\n📝 ${product.description}\n📊 المتبقي: ${product.stock} قطعة`);
}

// ===== تسجيل الدخول =====
function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('nardoo_users'));
    const user = users.find(u => (u.name === username || u.email === username) && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIForUser();
        showNotification(`مرحباً ${user.name}`, 'success');
    } else {
        showNotification('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
    }
}

// ===== تحديث الواجهة حسب المستخدم =====
function updateUIForUser() {
    const userBtn = document.getElementById('userBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    
    if (!currentUser) return;
    
    if (currentUser.role === 'admin') {
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-crown" style="color: gold;"></i>';
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        
        // إضافة زر إضافة منتج
        const navMenu = document.getElementById('mainNav');
        if (navMenu && !document.getElementById('addProductBtn')) {
            const addBtn = document.createElement('a');
            addBtn.id = 'addProductBtn';
            addBtn.className = 'nav-link';
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة منتج';
            addBtn.onclick = addProduct;
            navMenu.appendChild(addBtn);
        }
    } else if (currentUser.role === 'merchant_approved') {
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-store"></i>';
    } else {
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-user"></i>';
    }
}

// ===== إضافة منتج (للمدير فقط) =====
function addProduct() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('فقط المدير يمكنه إضافة منتجات', 'error');
        return;
    }
    
    const name = prompt('📦 اسم المنتج:');
    if (!name) return;
    
    const price = parseInt(prompt('💰 السعر (دج):', '500'));
    if (!price) return;
    
    const category = prompt('🏷️ القسم (spices/cosmetic/promo/other):', 'other');
    const stock = parseInt(prompt('📊 الكمية:', '100'));
    
    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        category: category,
        stock: stock,
        description: 'منتج جديد',
        rating: 4.5
    };
    
    products.push(newProduct);
    localStorage.setItem('nardoo_products', JSON.stringify(products));
    displayProducts();
    showNotification('✅ تم إضافة المنتج', 'success');
}

// ===== فتح لوحة المدير =====
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('غير مصرح - فقط المدير', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('nardoo_users'));
    const pending = users.filter(u => u.role === 'merchant_pending');
    
    alert(`📊 لوحة التحكم\n\n👥 المستخدمين: ${users.length}\n📦 المنتجات: ${products.length}\n⏳ تجار منتظرين: ${pending.length}\n\n👑 المدير: ${currentUser.name}`);
}

// ===== إشعارات =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(newContainer);
    }
    
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type]}; color:#1a1a2e; padding:12px 20px; border-radius:10px; font-weight:bold; animation:slideIn 0.3s ease;`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== فتح نافذة تسجيل الدخول =====
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

// ===== إغلاق النافذة =====
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ===== تبديل الوضع =====
function toggleTheme() {
    document.body.classList.toggle('light-mode');
}

// ===== التمرير =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== تهيئة الصفحة =====
window.onload = function() {
    loadData();
    displayProducts();
    updateCartCounter();
    updateUIForUser();
    
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 500);
    
    console.log('✅ النظام جاهز');
    console.log('👑 حساب المدير: azer / 123456');
};

// تصدير الدوال
window.handleLogin = handleLogin;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.toggleCart = toggleCart;
window.toggleTheme = toggleTheme;
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.checkout = checkout;
window.viewProduct = viewProduct;
window.openDashboard = openDashboard;
window.scrollToTop = scrollToTop;
window.displayProducts = displayProducts;
