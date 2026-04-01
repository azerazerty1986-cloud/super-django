// ==========================================
// ناردو برو - نظام متكامل مع صلاحيات المدير
// بدون نظام السلة - نسخة مبسطة
// ==========================================

// ===== إعدادات تلغرام =====
const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== المتغيرات العامة =====
let products = [];
let currentUser = null;
let currentFilter = 'all';
let searchTerm = '';

// ===== تحميل البيانات من localStorage =====
function loadData() {
    // تحميل المستخدمين مع صلاحيات المدير
    let users = localStorage.getItem('nardoo_users');
    if (!users) {
        const defaultUsers = [
            {
                id: 1,
                name: 'azer',
                email: 'azer@admin.com',
                password: '123456',
                role: 'admin',
                phone: '0555000000',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'تاجر تجريبي',
                email: 'merchant@nardoo.com',
                password: 'm123',
                role: 'merchant_approved',
                phone: '0555111111',
                storeName: 'متجر التجريبي',
                status: 'approved',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(defaultUsers));
    }
    
    // تحميل المنتجات
    let savedProducts = localStorage.getItem('nardoo_products');
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
    
    console.log('✅ تم تحميل البيانات');
    console.log(`📦 عدد المنتجات: ${products.length}`);
    console.log(`👑 المستخدم الحالي: ${currentUser ? currentUser.name : 'غير مسجل'}`);
}

// ===== عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    let filtered = products;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:80px 20px; grid-column:1/-1;">
                <i class="fas fa-box-open" style="font-size:80px; color:#ffd700; margin-bottom:20px;"></i>
                <h3 style="color:#ffd700;">لا توجد منتجات</h3>
                <p style="color:#888;">أضف منتج جديد للبدء</p>
                ${currentUser && currentUser.role === 'admin' ? `
                    <button onclick="addProduct()" style="background:#ffd700; color:#1a1a2e; border:none; padding:12px 30px; border-radius:25px; margin-top:20px; cursor:pointer; font-weight:bold;">
                        <i class="fas fa-plus"></i> إضافة منتج
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="viewProduct(${product.id})">
            <div class="product-image">
                <i class="fas fa-box-open"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                <div class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : ''}">
                    ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                </div>
                <button class="order-btn" onclick="event.stopPropagation(); orderProduct(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fab fa-whatsapp"></i> طلب عبر واتساب
                </button>
            </div>
        </div>
    `).join('');
}

// ===== طلب منتج عبر واتساب =====
function orderProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }
    
    const message = `🛍️ طلب منتج\n\n📦 المنتج: ${product.name}\n💰 السعر: ${product.price} دج\n👤 العميل: ${currentUser ? currentUser.name : 'زائر'}\n📞 للتواصل: يرجى الرد على هذا الرقم`;
    
    window.open(`https://wa.me/2135622448?text=${encodeURIComponent(message)}`, '_blank');
    showNotification('تم فتح واتساب للطلب', 'success');
}

// ===== فلترة المنتجات =====
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
    
    // تحديث الواجهة النشطة
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ===== البحث =====
function searchProducts() {
    searchTerm = document.getElementById('searchInput')?.value || '';
    displayProducts();
}

// ===== عرض تفاصيل المنتج =====
function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    
    if (modal && content) {
        content.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 20px; padding: 30px;">
                <h2 style="color: #ffd700; margin-bottom: 20px;">${product.name}</h2>
                <div style="margin-bottom: 20px;">
                    <p><strong>💰 السعر:</strong> ${product.price.toLocaleString()} دج</p>
                    <p><strong>📊 الكمية:</strong> ${product.stock} قطعة</p>
                    <p><strong>📝 الوصف:</strong> ${product.description || 'منتج عالي الجودة'}</p>
                    <p><strong>⭐ التقييم:</strong> ${product.rating || 4.5}/5</p>
                </div>
                <button onclick="orderProduct(${product.id})" style="background:#ffd700; color:#1a1a2e; border:none; padding:12px 20px; border-radius:25px; cursor:pointer; width:100%; font-weight:bold;">
                    <i class="fab fa-whatsapp"></i> طلب عبر واتساب
                </button>
                <button onclick="closeModal('productDetailModal')" style="background:transparent; border:1px solid #ffd700; color:#ffd700; padding:12px 20px; border-radius:25px; cursor:pointer; width:100%; margin-top:10px;">
                    إغلاق
                </button>
            </div>
        `;
        modal.style.display = 'flex';
    } else {
        alert(`📦 ${product.name}\n💰 السعر: ${product.price} دج\n📝 ${product.description || 'منتج عالي الجودة'}\n📊 المتبقي: ${product.stock} قطعة`);
    }
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
        displayProducts();
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
        if (userBtn) {
            userBtn.innerHTML = '<i class="fas fa-crown" style="color: gold;"></i>';
        }
        if (dashboardBtn) {
            dashboardBtn.style.display = 'flex';
        }
        
        // إضافة زر إضافة منتج في القائمة
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
        if (userBtn) {
            userBtn.innerHTML = '<i class="fas fa-store"></i>';
        }
    } else {
        if (userBtn) {
            userBtn.innerHTML = '<i class="fas fa-user"></i>';
        }
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
    const description = prompt('📝 وصف المنتج:', 'منتج جديد');
    
    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        category: category,
        stock: stock,
        description: description || 'منتج جديد',
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
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved');
    
    alert(`📊 لوحة التحكم\n━━━━━━━━━━━━━━━━━━\n👥 المستخدمين: ${users.length}\n📦 المنتجات: ${products.length}\n🏪 التجار المعتمدين: ${approvedMerchants.length}\n⏳ تجار منتظرين: ${pendingMerchants.length}\n━━━━━━━━━━━━━━━━━━\n👑 المدير: ${currentUser.name}`);
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
    toast.style.cssText = `background:${colors[type]}; color:#1a1a2e; padding:12px 20px; border-radius:10px; font-weight:bold; animation:slideIn 0.3s ease; box-shadow:0 5px 15px rgba(0,0,0,0.3);`;
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
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const isLight = document.body.classList.contains('light-mode');
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i><span>نهاري</span>' : '<i class="fas fa-moon"></i><span>ليلي</span>';
    }
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// ===== التمرير =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

// ===== تهيئة الصفحة =====
window.onload = function() {
    loadData();
    displayProducts();
    updateUIForUser();
    
    // استعادة الثيم
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 500);
    
    console.log('✅ النظام جاهز');
    console.log('👑 حساب المدير: azer / 123456');
    console.log('🏪 حساب تاجر: تاجر / m123');
};

// ===== تصدير الدوال =====
window.handleLogin = handleLogin;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.toggleTheme = toggleTheme;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.orderProduct = orderProduct;
window.viewProduct = viewProduct;
window.openDashboard = openDashboard;
window.addProduct = addProduct;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.displayProducts = displayProducts;
