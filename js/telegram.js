/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== مع دعم الصور والفيديو والأزرار التفاعلية ===== */
/* ===== المعدل النهائي - بدون سلة + مصادقة azer/123456 ===== */
/* ================================================================== */

// ===== [4.1] إعدادات تلغرام الأساسية =====
const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [4.2] المتغيرات العامة =====
let products = [];
let currentUser = null;
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let isLoading = false;
let isAuthenticated = false;

// بيانات الدخول
const ADMIN_USERNAME = 'azer';
const ADMIN_PASSWORD = '123456';

// ===== [4.3] التحقق من بيانات الدخول =====
function checkLogin(username, password) {
    return (username === ADMIN_USERNAME && password === ADMIN_PASSWORD);
}

// ===== [4.4] تسجيل الدخول =====
function doLogin(username, password) {
    if (checkLogin(username, password)) {
        isAuthenticated = true;
        
        currentUser = {
            id: 1,
            name: 'مدير النظام',
            username: 'azer',
            email: 'admin@nardoo.com',
            role: 'admin',
            phone: '0000000000',
            storeName: 'ناردو برو',
            merchantLevel: '5',
            status: 'approved',
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        localStorage.setItem('nardoo_auth', 'true');
        
        const savedUsers = localStorage.getItem('nardoo_users');
        if (savedUsers) {
            users = JSON.parse(savedUsers);
            const adminExists = users.find(u => u.role === 'admin');
            if (!adminExists) {
                users.unshift(currentUser);
                localStorage.setItem('nardoo_users', JSON.stringify(users));
            }
        } else {
            users = [currentUser];
            localStorage.setItem('nardoo_users', JSON.stringify(users));
        }
        
        showNotification('✅ مرحباً بك مدير النظام', 'success');
        closeModal('loginModal');
        updateUIAfterLogin();
        
        return true;
    } else {
        showNotification('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        return false;
    }
}

// ===== [4.5] تسجيل الخروج =====
function doLogout() {
    isAuthenticated = false;
    currentUser = null;
    localStorage.removeItem('current_user');
    localStorage.removeItem('nardoo_auth');
    hideAdminElements();
    showNotification('🔒 تم تسجيل الخروج', 'info');
    setTimeout(() => {
        openLoginModal();
    }, 500);
}

// ===== [4.6] إخفاء عناصر المدير =====
function hideAdminElements() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = 'none');
    
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'none';
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const adminAddBtn = document.getElementById('adminAddProductBtn');
    if (adminAddBtn) adminAddBtn.style.display = 'none';
    
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = '<i class="fas fa-user"></i><span>تسجيل الدخول</span>';
        userBtn.setAttribute('onclick', 'openLoginModal()');
        userBtn.classList.remove('admin-only');
    }
}

// ===== [4.7] إظهار عناصر المدير =====
function showAdminElements() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = 'flex');
    
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'flex';
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) merchantPanel.style.display = 'block';
}

// ===== [4.8] تحديث الواجهة بعد تسجيل الدخول =====
function updateUIAfterLogin() {
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = '<i class="fas fa-crown"></i><span>مدير النظام</span>';
        userBtn.setAttribute('onclick', 'doLogout()');
        userBtn.classList.add('admin-only');
    }
    
    showAdminElements();
    
    const navMenu = document.getElementById('mainNav');
    if (navMenu && !document.getElementById('adminAddProductBtn')) {
        const addBtn = document.createElement('a');
        addBtn.className = 'nav-link admin-only';
        addBtn.id = 'adminAddProductBtn';
        addBtn.setAttribute('onclick', 'showAddProductModal()');
        addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
        navMenu.appendChild(addBtn);
    }
    
    showAdminPanel();
    loadProducts();
}

// ===== [4.9] عرض لوحة المدير =====
function showAdminPanel() {
    if (!currentUser || !isAuthenticated) return;
    
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.stock > 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.innerHTML = `
        <div style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 30px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <i class="fas fa-crown" style="font-size: 50px; color: var(--gold);"></i>
                <div style="flex: 1;">
                    <h2 style="color: var(--gold); margin: 0;">ناردو برو</h2>
                    <p style="color: var(--text-secondary);">✅ مرحباً مدير النظام (azer) - صلاحيات كاملة</p>
                </div>
                <button onclick="doLogout()" style="background: rgba(255,100,100,0.2); border: 1px solid #ff6b6b; padding: 8px 15px; border-radius: 8px; cursor: pointer; color: #ff6b6b;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل خروج
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${totalProducts}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${availableProducts}</div>
                    <div>المنتجات المتاحة</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${totalValue.toLocaleString()} دج</div>
                    <div>قيمة المخزون</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-gold" onclick="showAddProductModal()">
                    <i class="fas fa-plus"></i> إضافة منتج جديد
                </button>
                <button class="btn-outline-gold" onclick="filterProducts('all')">
                    <i class="fas fa-box"></i> عرض كل المنتجات
                </button>
                <button class="btn-outline-gold" onclick="openDashboard()">
                    <i class="fas fa-chart-line"></i> لوحة التحكم
                </button>
            </div>
        </div>
    `;
}

// ===== [4.10] التحقق من الصلاحية =====
function requireAuth() {
    if (!isAuthenticated) {
        showNotification('❌ الرجاء تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return false;
    }
    return true;
}

// ===== [4.11] إنشاء نافذة تسجيل الدخول =====
function createLoginModal() {
    const oldModal = document.getElementById('loginModal');
    if (oldModal) oldModal.remove();
    
    const modalHTML = `
        <div id="loginModal" class="modal" style="display: flex; z-index: 10000;">
            <div class="modal-content" style="max-width: 400px; background: var(--bg-primary); border-radius: 20px;">
                <div class="modal-header" style="border-bottom: 1px solid var(--border); padding: 20px; text-align: center;">
                    <i class="fas fa-crown" style="font-size: 50px; color: var(--gold);"></i>
                    <h2 style="margin: 10px 0 0; color: var(--gold);">ناردو برو</h2>
                    <button class="modal-close" onclick="closeModal('loginModal')" style="position: absolute; left: 20px; top: 20px;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <p style="text-align: center; margin-bottom: 25px; color: var(--text-secondary);">
                        أدخل بيانات الدخول للوصول إلى لوحة التحكم
                    </p>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold;">اسم المستخدم:</label>
                        <input type="text" id="loginUsername" placeholder="أدخل اسم المستخدم" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text); font-size: 16px;">
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold;">كلمة المرور:</label>
                        <input type="password" id="loginPassword" placeholder="أدخل كلمة المرور" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text); font-size: 16px;">
                    </div>
                    
                    <button onclick="submitLogin()" class="btn-gold" style="width: 100%; padding: 12px; font-size: 18px;">
                        <i class="fas fa-sign-in-alt"></i> دخول
                    </button>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255,215,0,0.1); border-radius: 10px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: var(--gold);">
                            <i class="fas fa-key"></i> بيانات الدخول:
                        </p>
                        <p style="margin: 5px 0 0; font-size: 16px; font-weight: bold;">
                            اسم المستخدم: <span style="color: var(--gold);">azer</span> | 
                            كلمة المرور: <span style="color: var(--gold);">123456</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') submitLogin();
        });
    }
    
    const usernameInput = document.getElementById('loginUsername');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') submitLogin();
        });
    }
}

// ===== [4.12] تنفيذ تسجيل الدخول =====
function submitLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (doLogin(username, password)) {
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    }
}

// ===== [4.13] فتح نافذة تسجيل الدخول =====
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        const usernameInput = document.getElementById('loginUsername');
        if (usernameInput) {
            usernameInput.value = '';
            usernameInput.focus();
        }
        const passwordInput = document.getElementById('loginPassword');
        if (passwordInput) passwordInput.value = '';
    } else {
        createLoginModal();
    }
}

// ===== [4.14] التحقق من حالة تسجيل الدخول عند التحميل =====
function checkAuthOnLoad() {
    const savedAuth = localStorage.getItem('nardoo_auth');
    const savedUser = localStorage.getItem('current_user');
    
    if (savedAuth === 'true' && savedUser) {
        isAuthenticated = true;
        currentUser = JSON.parse(savedUser);
        updateUIAfterLogin();
        return true;
    }
    return false;
}

// ===== [4.15] دوال المساعدة والإشعارات =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(newContainer);
        container = newContainer;
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
        color: black;
        padding: 15px 25px;
        border-radius: 10px;
        margin-bottom: 10px;
        font-weight: bold;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        min-width: 250px;
        z-index: 10000;
    `;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== [4.16] دالة الحصول على اسم القسم =====
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ===== [4.17] دالة حساب الوقت المنقضي =====
function getTimeAgo(dateString) {
    if (!dateString) return '';
    
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} دقيقة`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ساعة`;
    }
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `منذ ${days} يوم`;
    }
    return 'منذ وقت';
}

// ===== [4.18] دالة توليد النجوم =====
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star star filled" style="color: var(--gold);"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt star half" style="color: var(--gold);"></i>';
    }
    
    for (let i = 0; i < 5 - fullStars - (hasHalfStar ? 1 : 0); i++) {
        starsHTML += '<i class="far fa-star star" style="color: var(--gold);"></i>';
    }
    
    return starsHTML;
}

// ===== [4.19] دالة الفرز =====
function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest':
            return [...productsArray].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'price_low':
            return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high':
            return [...productsArray].sort((a, b) => b.price - a.price);
        case 'rating':
            return [...productsArray].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        default:
            return productsArray;
    }
}

// ===== [4.20] تغيير طريقة الفرز =====
function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ===== [4.21] إضافة منتج إلى تلغرام =====
async function addProductToTelegram(product, imageFile) {
    if (!requireAuth()) return { success: false, error: 'غير مصرح' };
    
    try {
        console.log('📤 جاري إرسال المنتج إلى تلغرام:', product);
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        formData.append('caption', `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *الناشر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
📅 ${new Date().toLocaleString('ar-EG')}

✅ للطلب: تواصل مع التاجر`);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('📥 رد تلغرام:', data);
        
        if (data.ok) {
            const messageId = data.result.message_id;
            showNotification(`✅ تم الإرسال - المعرف: ${messageId}`, 'success');
            return { success: true, messageId: messageId, telegramId: messageId };
        }
        showNotification('❌ فشل الإرسال: ' + data.description, 'error');
        return { success: false, error: data.description };
    } catch (error) {
        console.error('❌ خطأ:', error);
        showNotification('❌ خطأ في الاتصال', 'error');
        return { success: false, error: error.message };
    }
}

// ===== [4.22] دالة حفظ المنتج =====
async function saveProduct() {
    if (!requireAuth()) return;
    
    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImages');

    if (!nameInput || !categorySelect || !priceInput || !stockInput || !imageInput) {
        showNotification('خطأ في النموذج', 'error');
        return;
    }

    const name = nameInput.value.trim();
    const category = categorySelect.value;
    const price = parseInt(priceInput.value);
    const stock = parseInt(stockInput.value);
    const description = descInput ? descInput.value : '';
    const imageFile = imageInput.files[0];

    if (!name) {
        showNotification('الرجاء إدخال اسم المنتج', 'error');
        nameInput.focus();
        return;
    }

    if (!price || price <= 0) {
        showNotification('الرجاء إدخال سعر صحيح', 'error');
        priceInput.focus();
        return;
    }

    if (!stock || stock <= 0) {
        showNotification('الرجاء إدخال كمية صحيحة', 'error');
        stockInput.focus();
        return;
    }

    if (!imageFile) {
        showNotification('الرجاء اختيار صورة للمنتج', 'error');
        imageInput.focus();
        return;
    }

    if (!imageFile.type.startsWith('image/')) {
        showNotification('الرجاء اختيار ملف صورة صالح', 'error');
        return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة كبير جداً (الحد الأقصى 5MB)', 'error');
        return;
    }

    showNotification('جاري رفع المنتج...', 'info');

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser?.storeName || currentUser?.name || 'ناردو برو',
        description: description
    };

    const result = await addProductToTelegram(product, imageFile);

    if (result.success) {
        showNotification(`✅ تم إضافة المنتج بنجاح`, 'success');
        
        const localProduct = {
            id: result.messageId,
            telegramId: result.messageId,
            name: name,
            price: price,
            category: category,
            stock: stock,
            merchantName: currentUser?.storeName || currentUser?.name || 'ناردو برو',
            description: description,
            publisherId: currentUser?.id || 1,
            createdAt: new Date().toISOString(),
            rating: 4.5,
            images: []
        };
        
        const localProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
        localProducts.push(localProduct);
        localStorage.setItem('nardoo_products', JSON.stringify(localProducts));
        
        nameInput.value = '';
        categorySelect.value = 'promo';
        priceInput.value = '';
        stockInput.value = '';
        if (descInput) descInput.value = '';
        imageInput.value = '';
        
        const preview = document.getElementById('imagePreview');
        if (preview) preview.innerHTML = '';
        
        closeModal('productModal');
        
        setTimeout(async () => {
            await loadProducts();
            showAdminPanel();
        }, 2000);
    }
}

// ===== [4.23] معالجة رفع الصور =====
function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    
    preview.innerHTML = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
            showNotification('الملف ' + file.name + ' ليس صورة', 'warning');
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '10px';
            img.style.margin = '5px';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// ===== [4.24] جلب جميع المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    
    try {
        const cached = localStorage.getItem('nardoo_products');
        if (cached) {
            products = JSON.parse(cached);
            displayProducts();
        }
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        
        if (!response.ok) {
            throw new Error('فشل الاتصال');
        }
        
        const data = await response.json();
        const telegramProducts = [];
        
        if (data.ok && data.result) {
            const updates = data.result.slice(-200).reverse();
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                if (!post.photo && !post.video) continue;
                
                const caption = post.caption || '';
                if (!caption.includes('🟣') && !caption.includes('منتج جديد')) continue;
                
                const lines = caption.split('\n');
                
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                let description = 'منتج ممتاز';
                
                lines.forEach(line => {
                    if (line.includes('المنتج:')) {
                        name = line.replace('المنتج:', '').replace('📦 *المنتج:*', '').replace(/[*🟣]/g, '').trim();
                    }
                    else if (line.includes('السعر:')) {
                        const match = line.match(/\d+/);
                        if (match) price = parseInt(match[0]);
                    }
                    else if (line.includes('القسم:')) {
                        const cat = line.replace('القسم:', '').toLowerCase();
                        if (cat.includes('promo')) category = 'promo';
                        else if (cat.includes('spices')) category = 'spices';
                        else if (cat.includes('cosmetic')) category = 'cosmetic';
                        else category = 'other';
                    }
                    else if (line.includes('الكمية:')) {
                        const match = line.match(/\d+/);
                        if (match) stock = parseInt(match[0]);
                    }
                    else if (line.includes('الناشر:')) {
                        merchant = line.replace('الناشر:', '').trim();
                    }
                });
                
                let images = ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"];
                
                if (post.photo) {
                    const fileId = post.photo[post.photo.length - 1].file_id;
                    const fileResponse = await fetch(
                        `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                    );
                    const fileData = await fileResponse.json();
                    
                    if (fileData.ok) {
                        images = [`https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`];
                    }
                }
                
                telegramProducts.push({
                    id: post.message_id,
                    telegramId: post.message_id,
                    name: name,
                    price: price || 1000,
                    category: category,
                    stock: stock || 10,
                    merchantName: merchant,
                    description: description,
                    rating: 4.5,
                    images: images,
                    createdAt: new Date(post.date * 1000).toISOString()
                });
            }
        }
        
        const mergedProducts = [...products];
        
        for (const newProduct of telegramProducts) {
            const exists = mergedProducts.some(p => p.id === newProduct.id);
            if (!exists) {
                mergedProducts.push(newProduct);
            }
        }
        
        localStorage.setItem('nardoo_products', JSON.stringify(mergedProducts));
        products = mergedProducts;
        displayProducts();
        
        return mergedProducts;
        
    } catch (error) {
        console.error('خطأ:', error);
        return products;
        
    } finally {
        isLoading = false;
    }
}

// ===== [4.25] تحميل المنتجات =====
async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.26] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary);">أول منتج يضاف سيظهر هنا</p>
                ${isAuthenticated ? '<button class="btn-gold" onclick="showAddProductModal()">إضافة منتج جديد</button>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;
        
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";

        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

        const timeAgo = getTimeAgo(product.createdAt);

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div class="product-gallery">
                    <img src="${imageUrl}" style="width: 100%; height: 250px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-merchant-info">
                        <i class="fas fa-store"></i> ${product.merchantName}
                    </div>
                    
                    <div class="product-rating">
                        <div class="stars-container">
                            ${generateStars(product.rating || 4.5)}
                        </div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    
                    <div class="product-actions">
                        <button class="btn-outline-gold" onclick="event.stopPropagation(); viewProductDetails(${product.id})">
                            <i class="fas fa-eye"></i> تفاصيل
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== [4.27] فلترة المنتجات =====
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

// ===== [4.28] البحث عن المنتجات =====
function searchProducts() {
    const input = document.getElementById('searchInput');
    searchTerm = input ? input.value : '';
    displayProducts();
}

// ===== [4.29] عرض تفاصيل المنتج =====
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";

    content.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
                </div>
                <div>
                    <p>🆔 المعرف: ${product.id}</p>
                    <p>👤 الناشر: ${product.merchantName}</p>
                    <p>${product.description || 'منتج عالي الجودة'}</p>
                    
                    <div class="product-rating" style="margin: 20px 0;">
                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                        <span>${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <span style="font-size: 32px; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <span class="${product.stock <= 0 ? 'out-of-stock' : 'in-stock'}">${product.stock <= 0 ? 'غير متوفر' : 'متوفر: ' + product.stock + ' قطعة'}</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px;">
                        <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ===== [4.30] إغلاق النوافذ =====
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ===== [4.31] إظهار نافذة إضافة منتج =====
function showAddProductModal() {
    if (!requireAuth()) return;
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
}

// ===== [4.32] البحث عن منتج بالمعرف =====
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج:');
    if (!id) return;
    
    const product = products.find(p => p.id == id || p.telegramId == id);
    
    if (product) {
        alert(`المنتج: ${product.name}\nالسعر: ${product.price} دج`);
        viewProductDetails(product.id);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ===== [4.33] دوال التمرير =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

// ===== [4.34] تبديل الثيم =====
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i><span>ليلي</span>' : '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ===== [4.35] فتح لوحة التحكم =====
function openDashboard() {
    if (!requireAuth()) return;
    const section = document.getElementById('dashboardSection');
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        showDashboardOverview();
    }
}

// ===== [4.36] عرض نظرة عامة =====
function showDashboardOverview() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.stock > 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 30px;">نظرة عامة</h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-box" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 36px; font-weight: bold;">${totalProducts}</div>
                <div>إجمالي المنتجات</div>
            </div>
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 36px; font-weight: bold;">${availableProducts}</div>
                <div>المنتجات المتاحة</div>
            </div>
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-dollar-sign" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 36px; font-weight: bold;">${totalValue.toLocaleString()} دج</div>
                <div>قيمة المخزون</div>
            </div>
        </div>
        
        <div style="background: var(--glass); padding: 25px; border-radius: 15px;">
            <h4 style="color: var(--gold);">معلومات الدخول</h4>
            <p>✅ اسم المستخدم: <strong style="color: var(--gold);">azer</strong></p>
            <p>✅ كلمة المرور: <strong style="color: var(--gold);">123456</strong></p>
            <p>✅ يمكنك إضافة وحذف وتعديل المنتجات بعد تسجيل الدخول</p>
        </div>
    `;
}

// ===== [4.37] تأثيرات الكتابة =====
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

        if (this.element) {
            this.element.innerHTML = this.text + '<span class="typing-cursor">|</span>';
        }

        let typeSpeed = this.speed;
        if (this.isDeleting) typeSpeed /= 2;

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

// ===== [4.38] التهيئة عند تحميل الصفحة =====
window.onload = async function() {
    createLoginModal();
    
    const isLoggedIn = checkAuthOnLoad();
    
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
        displayProducts();
    }
    
    await loadProducts();
    
    if (!isLoggedIn) {
        setTimeout(() => {
            openLoginModal();
        }, 500);
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i><span>ليلي</span>' : '<i class="fas fa-sun"></i><span>نهاري</span>';
        }
    }
    
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1000);
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    }
    
    setTimeout(() => {
        const nav = document.getElementById('mainNav');
        if (nav && !document.getElementById('searchByIdBtn')) {
            const searchBtn = document.createElement('a');
            searchBtn.className = 'nav-link';
            searchBtn.id = 'searchByIdBtn';
            searchBtn.setAttribute('onclick', 'findProductById()');
            searchBtn.innerHTML = '<i class="fas fa-search"></i><span>بحث بالمعرف</span>';
            nav.appendChild(searchBtn);
        }
    }, 1000);
    
    console.log('✅ النظام جاهز - اسم المستخدم: azer | كلمة المرور: 123456');
};

// ===== [4.39] إغلاق النوافذ عند الضغط خارجها =====
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== [4.40] تصدير الدوال =====
window.saveProduct = saveProduct;
window.addProductToTelegram = addProductToTelegram;
window.handleImageUpload = handleImageUpload;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.viewProductDetails = viewProductDetails;
window.openLoginModal = openLoginModal;
window.showAddProductModal = showAddProductModal;
window.findProductById = findProductById;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.toggleTheme = toggleTheme;
window.openDashboard = openDashboard;
window.showDashboardOverview = showDashboardOverview;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.submitLogin = submitLogin;
window.changeSort = changeSort;

console.log('✅ نظام تلغرام المتكامل جاهز - بدون سلة | بيانات الدخول: azer / 123456');
