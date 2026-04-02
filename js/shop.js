/* ================================================================== */
/* ===== ملف: shop.js - منطق المتجر الرئيسي (بدون تلغرام) ===== */
/* ================================================================== */

// ==================== المتغيرات العامة ====================
let products = [];
let currentUser = null;
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let cart = [];

// ==================== إعدادات عامة ====================
const CONFIG = {
    storageKey: 'nardoo_cart',
    shippingCost: 800,
    usersKey: 'nardoo_users'
};

// ==================== تحميل المستخدمين ====================
function loadUsers() {
    const saved = localStorage.getItem(CONFIG.usersKey);
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin', phone: '', createdAt: new Date().toISOString() },
            { id: 2, name: 'تاجر تجريبي', email: 'merchant@nardoo.com', password: 'm123', role: 'merchant_approved', phone: '0555111111', storeName: 'متجر التجريبي', status: 'approved', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem(CONFIG.usersKey, JSON.stringify(users));
    }
}

// ==================== نظام السلة ====================
function loadCart() {
    const saved = localStorage.getItem(CONFIG.storageKey);
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

function saveCart() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart));
    updateCartCounter();
}

function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showNotification('الكمية غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({ productId, name: product.name, price: product.price, quantity: 1, merchantName: product.merchantName });
    }

    saveCart();
    updateCartDisplay();
    showNotification('تمت الإضافة إلى السلة', 'success');
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) sidebar.classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!itemsDiv) return;

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">السلة فارغة</div>';
        if (totalSpan) totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171; color: white;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    if (newQuantity > product.stock) {
        showNotification('الكمية غير متوفرة', 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

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

    const customerPhone = prompt('رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    const customerAddress = prompt('عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = CONFIG.shippingCost;
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

    // استخدام دالة تلغرام إذا كانت موجودة
    if (typeof sendOrderToTelegram === 'function') {
        await sendOrderToTelegram(order);
    } else {
        console.log('طلب جديد:', order);
        showNotification('تم إرسال الطلب بنجاح', 'success');
    }

    cart = [];
    saveCart();
    toggleCart();
    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
}

// ==================== عرض المنتجات ====================
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;"><i class="fas fa-box-open" style="font-size: 80px; color: var(--gold);"></i><h3>لا توجد منتجات</h3></div>`;
        return;
    }

    container.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="viewProductDetails(${product.id})">
            <img src="${product.image || 'https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'}" style="width:100%; height:250px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'">
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-price">${product.price.toLocaleString()} دج</div>
                <div class="product-stock">${product.stock} قطعة</div>
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})"><i class="fas fa-shopping-cart"></i> أضف للسلة</button>
            </div>
        </div>
    `).join('');
}

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    content.innerHTML = `
        <div style="padding: 20px;">
            <h2>${product.name}</h2>
            <img src="${product.image}" style="width:100%; max-height:300px; object-fit:cover; border-radius:15px;">
            <p><strong>السعر:</strong> ${product.price.toLocaleString()} دج</p>
            <p><strong>المتاح:</strong> ${product.stock} قطعة</p>
            <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">أضف للسلة</button>
            <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">إغلاق</button>
        </div>
    `;
    modal.style.display = 'flex';
}

// ==================== المصادقة ====================
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant');
    const merchantFields = document.getElementById('merchantFields');
    if (isMerchant && merchantFields) {
        merchantFields.style.display = isMerchant.checked ? 'block' : 'none';
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        showWelcomePopup(user);
        showNotification(`مرحباً ${user.name}`, 'success');
    } else {
        showNotification('بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';

    if (!name || !email || !password) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }
    if (users.find(u => u.email === email)) {
        showNotification('البريد مستخدم بالفعل', 'error');
        return;
    }

    const newUser = { id: users.length + 1, name, email, password, phone, role: 'customer', createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem(CONFIG.usersKey, JSON.stringify(users));
    showNotification('✅ تم التسجيل بنجاح', 'success');
    switchAuthTab('login');
}

function showAddProductModal() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }
    if (currentUser.role === 'admin' || currentUser.role === 'merchant_approved') {
        document.getElementById('productModal').style.display = 'flex';
    } else {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
}

function handleImageUpload(event) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = '';
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:100px; height:100px; object-fit:cover; border-radius:10px; margin:5px;';
            preview.appendChild(img);
        };
        reader.readAsDataURL(files[i]);
    }
}

async function saveProduct() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved')) {
        showNotification('غير مصرح', 'error');
        return;
    }

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription')?.value || '';
    const imageFile = document.getElementById('productImages').files[0];

    if (!name || !price || !stock || !imageFile) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    const product = { name, price, category, stock, merchantName: currentUser.storeName || currentUser.name, description };

    // استخدام دالة تلغرام إذا كانت موجودة
    if (typeof addProductToTelegram === 'function') {
        const result = await addProductToTelegram(product, imageFile);
        if (result.success) {
            showNotification('✅ تم إضافة المنتج', 'success');
            closeModal('productModal');
            document.getElementById('productForm')?.reset();
            document.getElementById('imagePreview').innerHTML = '';
            if (typeof fetchProductsFromTelegram === 'function') await fetchProductsFromTelegram();
        }
    } else {
        // منتج تجريبي بدون تلغرام
        const newProduct = { id: Date.now(), ...product, image: URL.createObjectURL(imageFile), rating: 4.5, createdAt: new Date().toISOString() };
        products.push(newProduct);
        displayProducts();
        showNotification('✅ تم إضافة المنتج تجريبياً', 'success');
        closeModal('productModal');
    }
}

// ==================== واجهة المستخدم ====================
function updateUIBasedOnRole() {
    if (!currentUser) return;
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    if (currentUser.role === 'admin') {
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) dashboardSection.style.display = 'block';
    }
}

function showWelcomePopup(user) {
    const popup = document.createElement('div');
    popup.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:linear-gradient(135deg,#1a1a2e,#16213e); border:2px solid gold; border-radius:30px; padding:30px 40px; text-align:center; z-index:10000; min-width:300px;`;
    popup.innerHTML = `<div style="font-size:60px;">👋</div><h2 style="color:gold;">مرحباً ${user.name}!</h2><p>أهلاً بك في ناردو برو</p><button onclick="this.parentElement.remove()" style="background:gold; border:none; padding:10px 30px; border-radius:25px; margin-top:20px; cursor:pointer;">تسوق الآن</button>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
}

function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999;';
        document.body.appendChild(container);
    }
    const colors = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type]}; color:${type === 'warning' ? 'black' : 'white'}; padding:12px 20px; border-radius:10px; margin-bottom:10px; animation:slideIn 0.3s ease;`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function openDashboard() { document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth' }); }

// ==================== تحميل منتجات تجريبية ====================
function loadDemoProducts() {
    if (products.length === 0) {
        products = [
            { id: 1, name: 'زعتر فلسطيني', price: 1500, category: 'spices', stock: 50, merchantName: 'متجر فلسطين', image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=زعتر', rating: 4.5, createdAt: new Date().toISOString() },
            { id: 2, name: 'كريم طبيعي', price: 2500, category: 'cosmetic', stock: 30, merchantName: 'متجر الجمال', image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=كريم', rating: 4.8, createdAt: new Date().toISOString() },
            { id: 3, name: 'عرض رمضان', price: 999, category: 'promo', stock: 100, merchantName: 'ناردو برو', image: 'https://via.placeholder.com/300/2c5e4f/ffffff?text=عرض', rating: 4.9, createdAt: new Date().toISOString() }
        ];
        displayProducts();
    }
}

// ==================== التهيئة ====================
window.onload = function() {
    loadUsers();
    loadCart();
    loadDemoProducts();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
        setTimeout(() => showWelcomePopup(currentUser), 500);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
    }

    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 1000);

    console.log('✅ متجر ناردو برو جاهز');
};

// تصدير الدوال للنطاق العام
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.checkoutCart = checkoutCart;
window.displayProducts = displayProducts;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.viewProductDetails = viewProductDetails;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.switchAuthTab = switchAuthTab;
window.toggleMerchantFields = toggleMerchantFields;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showAddProductModal = showAddProductModal;
window.handleImageUpload = handleImageUpload;
window.saveProduct = saveProduct;
window.toggleTheme = toggleTheme;
window.scrollToTop = scrollToTop;
window.openDashboard = openDashboard;
window.showNotification = showNotification;
