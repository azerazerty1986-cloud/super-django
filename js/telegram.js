/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== مع دعم الصور والفيديو والأزرار التفاعلية ===== */
/* ===== المعدل النهائي - مصادقة باسم azer وكلمة 123456 ===== */
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
let cart = [];
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

// ===== [4.3] تعطيل المصادقة - تعيين مستخدم مدير تلقائياً بعد التحقق =====
function initDefaultUser() {
    if (!isAuthenticated) return;
    
    currentUser = {
        id: 1,
        name: 'مدير النظام',
        email: 'admin@nardoo.com',
        role: 'admin',
        phone: '0000000000',
        storeName: 'ناردو برو',
        merchantLevel: '5',
        status: 'approved',
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
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
    
    console.log('✅ تم تفعيل وضع المدير');
}

// ===== [4.4] دالة تسجيل الدخول =====
function login(username, password) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        initDefaultUser();
        localStorage.setItem('nardoo_auth', 'true');
        showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
        closeModal('loginModal');
        updateUIBasedOnRole();
        return true;
    } else {
        showNotification('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        return false;
    }
}

// ===== [4.5] دالة تسجيل الخروج =====
function logout() {
    isAuthenticated = false;
    currentUser = null;
    localStorage.removeItem('current_user');
    localStorage.removeItem('nardoo_auth');
    
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
    
    showNotification('🔒 تم تسجيل الخروج', 'info');
    openLoginModal();
}

// ===== [4.6] تحميل المستخدمين من localStorage =====
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'مدير النظام', 
                email: 'admin@nardoo.com', 
                password: '', 
                role: 'admin',
                phone: '0000000000',
                storeName: 'ناردو برو',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ===== [4.7] تحميل السلة =====
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

// ===== [4.8] حفظ السلة =====
function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

// ===== [4.9] تحديث عداد السلة =====
function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// ===== [4.10] دوال المساعدة والإشعارات =====
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
    toast.className = `toast ${type}`;
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
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ===== [4.11] دالة مساعدة لجلب رابط الملف من تلغرام =====
async function getTelegramFileUrl(fileId) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
        );
        const data = await response.json();
        
        if (data.ok && data.result) {
            return `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${data.result.file_path}`;
        }
    } catch (error) {
        console.error('❌ خطأ في جلب رابط الملف:', error);
    }
    return null;
}

// ===== [4.12] دالة الحصول على اسم القسم =====
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ===== [4.13] دالة حساب الوقت المنقضي =====
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

// ===== [4.14] دالة توليد النجوم =====
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

// ===== [4.15] دالة الفرز =====
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

// ===== [4.16] تغيير طريقة الفرز =====
function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ===== [4.17] إضافة منتج إلى تلغرام =====
async function addProductToTelegram(product, imageFile) {
    if (!isAuthenticated) {
        showNotification('الرجاء تسجيل الدخول أولاً', 'error');
        return { success: false, error: 'غير مصرح' };
    }
    
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

// ===== [4.18] دالة حفظ المنتج =====
async function saveProduct() {
    if (!isAuthenticated) {
        showNotification('الرجاء تسجيل الدخول أولاً', 'error');
        return;
    }
    
    console.log('🔄 بدء saveProduct');
    
    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImages');

    if (!nameInput || !categorySelect || !priceInput || !stockInput || !imageInput) {
        console.error('❌ بعض حقول النموذج غير موجودة');
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

    if (!category) {
        showNotification('الرجاء اختيار القسم', 'error');
        categorySelect.focus();
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
        showNotification(`✅ تم إضافة المنتج بنجاح - المعرف: ${result.messageId}`, 'success');
        
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
        }, 2000);
    }
}

// ===== [4.19] معالجة رفع الصور =====
function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    
    if (!preview) {
        console.error('❌ عنصر المعاينة غير موجود');
        return;
    }
    
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
    
    if (files.length > 0) {
        showNotification(`تم اختيار ${files.length} صورة`, 'success');
    }
}

// ===== [4.20] جلب جميع المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    
    try {
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        const cached = localStorage.getItem('nardoo_products');
        let localProducts = [];
        
        if (cached) {
            localProducts = JSON.parse(cached);
            if (localProducts.length > 0) {
                console.log(`📦 عرض ${localProducts.length} منتج من الذاكرة المحلية`);
                products = localProducts;
                displayProducts();
            }
        }
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        
        if (!response.ok) {
            throw new Error('فشل الاتصال بتلغرام');
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
                
                const telegramId = post.message_id;
                
                const lines = caption.split('\n');
                
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                let description = 'منتج ممتاز';
                
                lines.forEach(line => {
                    if (line.includes('المنتج:') || line.includes('📦 *المنتج:*')) {
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
                    else if (line.includes('الناشر:') || line.includes('التاجر:')) {
                        merchant = line.replace('الناشر:', '').replace('التاجر:', '').trim();
                    }
                    else if (line.includes('الوصف:')) {
                        description = line.replace('الوصف:', '').trim();
                    }
                });
                
                let mediaUrl = null;
                let images = [];
                
                if (post.photo) {
                    const fileId = post.photo[post.photo.length - 1].file_id;
                    const fileResponse = await fetch(
                        `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                    );
                    const fileData = await fileResponse.json();
                    
                    if (fileData.ok) {
                        mediaUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                        images = [mediaUrl];
                    }
                }
                
                if (images.length === 0) {
                    images = ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"];
                    mediaUrl = images[0];
                }
                
                if (mediaUrl) {
                    telegramProducts.push({
                        id: telegramId,
                        telegramId: telegramId,
                        name: name,
                        price: price || 1000,
                        category: category,
                        stock: stock || 10,
                        merchantName: merchant,
                        description: description,
                        rating: 4.5,
                        image: mediaUrl,
                        images: images,
                        telegramLink: `https://t.me/c/${TELEGRAM.channelId.replace('-100', '')}/${post.message_id}`,
                        createdAt: new Date(post.date * 1000).toISOString(),
                        dateStr: getTimeAgo(post.date)
                    });
                }
            }
        }
        
        const mergedProducts = [...localProducts];
        
        for (const newProduct of telegramProducts) {
            const exists = mergedProducts.some(p => p.id === newProduct.id);
            if (!exists) {
                mergedProducts.push(newProduct);
                console.log(`✅ منتج جديد: ${newProduct.name} (ID: ${newProduct.id})`);
            }
        }
        
        console.log(`✅ تم جلب ${telegramProducts.length} منتج من تلغرام، إجمالي: ${mergedProducts.length}`);
        
        localStorage.setItem('nardoo_products', JSON.stringify(mergedProducts));
        
        products = mergedProducts;
        displayProducts();
        
        return mergedProducts;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        showNotification('فشل الاتصال بتلغرام، عرض المنتجات المخزنة', 'warning');
        
        const saved = localStorage.getItem('nardoo_products');
        if (saved) {
            products = JSON.parse(saved);
            displayProducts();
            return products;
        }
        
        return [];
        
    } finally {
        isLoading = false;
    }
}

// ===== [4.21] تحميل المنتجات وعرضها =====
async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.22] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => 
            p.merchantName === currentUser.storeName || 
            p.merchantName === currentUser.name
        );
    }
    else if (currentFilter !== 'all') {
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
                <h3 style="color: var(--gold); font-size: 28px; margin-bottom: 15px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 30px;">أول منتج يضاف سيظهر هنا</p>
                ${isAuthenticated ? '<button class="btn-gold" onclick="showAddProductModal()" style="font-size: 18px; padding: 15px 40px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>' : '<p style="color: var(--text-secondary);">الرجاء تسجيل الدخول لإضافة المنتجات</p>'}
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;
        
        const imageUrl = product.images && product.images.length > 0 
            ? product.images[0] 
            : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";

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
                
                <div style="position:absolute; top:15px; left:15px; background:var(--gold); color:black; padding:5px 10px; border-radius:20px; font-size:12px; font-weight:bold; z-index:10;">
                    🆔 ${product.id}
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
                    
                    <div class="product-actions" onclick="event.stopPropagation()">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== [4.23] فلترة المنتجات =====
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

// ===== [4.24] البحث عن المنتجات =====
function searchProducts() {
    const input = document.getElementById('searchInput');
    searchTerm = input ? input.value : '';
    displayProducts();
}

// ===== [4.25] إضافة منتج إلى السلة =====
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
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            merchantName: product.merchantName
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإضافة إلى السلة', 'success');
}

// ===== [4.26] تبديل عرض السلة =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        updateCartDisplay();
    }
}

// ===== [4.27] تحديث عرض السلة =====
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
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171; color: white;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}

// ===== [4.28] تحديث كمية منتج في السلة =====
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
    updateCartCounter();
    updateCartDisplay();
}

// ===== [4.29] إزالة منتج من السلة =====
function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

// ===== [4.30] إتمام الشراء =====
async function checkoutCart() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }

    const customerPhone = prompt('رقم الهاتف:', currentUser?.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser?.name || 'زائر',
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        total: total
    };

    const message = `🟢 *طلب جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
📦 *المنتجات:*
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج`).join('\n')}
💰 *الإجمالي:* ${order.total} دج
📅 ${new Date().toLocaleString('ar-EG')}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });

    const merchants = {};
    cart.forEach(item => {
        const merchant = users.find(u => u.name === item.merchantName || u.storeName === item.merchantName);
        if (merchant?.phone) {
            if (!merchants[merchant.phone]) {
                merchants[merchant.phone] = [];
            }
            merchants[merchant.phone].push(item);
        }
    });

    Object.entries(merchants).forEach(([phone, items]) => {
        const msg = `🛍️ لديك طلب جديد من ${order.customerName}: ${items.map(i => i.name).join('، ')}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
}

// ===== [4.31] عرض تفاصيل المنتج =====
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 
        ? product.images[0] 
        : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";

    content.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
                </div>
                <div>
                    <p style="color: #888; margin-bottom: 10px;">🆔 المعرف: ${product.id}</p>
                    <p style="color: #888; margin-bottom: 10px;">👤 الناشر: ${product.merchantName}</p>
                    <p style="margin-bottom: 20px;">${product.description || 'منتج عالي الجودة'}</p>
                    
                    <div class="product-rating" style="margin-bottom: 20px;">
                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <span style="font-size: 32px; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <span>${product.stock} قطعة متوفرة</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px;">
                        <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                            أضف للسلة
                        </button>
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

// ===== [4.32] فتح نافذة تسجيل الدخول =====
function openLoginModal() {
    let modal = document.getElementById('loginModal');
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

// ===== [4.33] إنشاء نافذة تسجيل الدخول =====
function createLoginModal() {
    const modalHTML = `
        <div id="loginModal" class="modal" style="display: flex; z-index: 10000;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2><i class="fas fa-lock"></i> تسجيل الدخول</h2>
                    <button class="modal-close" onclick="closeModal('loginModal')">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <i class="fas fa-crown" style="font-size: 60px; color: var(--gold);"></i>
                        <h3 style="margin-top: 15px;">ناردو برو</h3>
                        <p style="color: var(--text-secondary);">أدخل بيانات الدخول للوصول إلى لوحة التحكم</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px;">اسم المستخدم:</label>
                        <input type="text" id="loginUsername" placeholder="أدخل اسم المستخدم" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; background: var(--bg-input); color: var(--text);">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px;">كلمة المرور:</label>
                        <input type="password" id="loginPassword" placeholder="أدخل كلمة المرور" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; background: var(--bg-input); color: var(--text);">
                    </div>
                    
                    <button onclick="handleFormLogin()" class="btn-gold" style="width: 100%; padding: 12px;">
                        <i class="fas fa-sign-in-alt"></i> دخول
                    </button>
                    
                    <div style="margin-top: 20px; text-align: center; font-size: 12px; color: var(--text-secondary);">
                        <i class="fas fa-shield-alt"></i> بيانات الدخول: azer / 123456
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (!document.getElementById('loginModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// ===== [4.34] معالجة تسجيل الدخول من النموذج =====
function handleFormLogin() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = usernameInput ? usernameInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    
    if (login(username, password)) {
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        loadProducts();
        updateUIBasedOnRole();
    } else {
        if (passwordInput) passwordInput.value = '';
        passwordInput.focus();
    }
}

// ===== [4.35] إغلاق النوافذ =====
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ===== [4.36] تبديل علامات التبويب في المصادقة =====
function switchAuthTab(tab) {
    showNotification('بيانات الدخول: azer / 123456', 'info');
}

// ===== [4.37] إظهار/إخفاء حقول التاجر =====
function toggleMerchantFields() {
    // معطل
}

// ===== [4.38] معالجة تسجيل الدخول القديم =====
function handleLogin() {
    openLoginModal();
}

// ===== [4.39] معالجة تسجيل التاجر =====
function handleMerchantRegister(merchantData) {
    showNotification('بيانات الدخول: azer / 123456', 'info');
    return false;
}

// ===== [4.40] معالجة تسجيل المستخدم العادي =====
function handleRegister() {
    showNotification('بيانات الدخول: azer / 123456', 'info');
}

// ===== [4.41] تحديث الواجهة حسب دور المستخدم =====
function updateUIBasedOnRole() {
    if (!currentUser || !isAuthenticated) return;

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = '<i class="fas fa-crown"></i><span>مدير النظام</span>';
        userBtn.setAttribute('onclick', 'logout()');
        userBtn.classList.add('admin-only');
    }

    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) {
        dashboardBtn.style.display = 'flex';
        dashboardBtn.classList.add('admin-only');
    }
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) {
        merchantPanel.style.display = 'block';
        merchantPanel.classList.add('admin-only');
    }
    
    const oldAddBtn = document.getElementById('adminAddProductBtn');
    if (oldAddBtn) oldAddBtn.remove();
    
    const oldMyProductsBtn = document.getElementById('myProductsBtn');
    if (oldMyProductsBtn) oldMyProductsBtn.remove();

    showMerchantPanel();
    
    const navMenu = document.getElementById('mainNav');
    if (navMenu && !document.getElementById('adminAddProductBtn')) {
        const addBtn = document.createElement('a');
        addBtn.className = 'nav-link admin-only';
        addBtn.id = 'adminAddProductBtn';
        addBtn.setAttribute('onclick', 'showAddProductModal()');
        addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
        navMenu.appendChild(addBtn);
    }
}

// ===== [4.42] عرض منتجات التاجر =====
function viewMyProducts() {
    if (!isAuthenticated) {
        showNotification('الرجاء تسجيل الدخول أولاً', 'error');
        return;
    }
    currentFilter = 'my_products';
    displayProducts();
}

// ===== [4.43] عرض لوحة التاجر =====
function showMerchantPanel() {
    if (!currentUser || !isAuthenticated) return;
    
    const merchantProducts = products.filter(p => 
        p.merchantName === currentUser.storeName || 
        p.merchantName === currentUser.name
    );
    
    const totalValue = merchantProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.innerHTML = `
        <div style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 30px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                <i class="fas fa-crown" style="font-size: 50px; color: var(--gold);"></i>
                <div>
                    <h2 style="color: var(--gold); margin: 0;">${currentUser.storeName || currentUser.name}</h2>
                    <p style="color: var(--text-secondary);">✅ مرحباً مدير النظام - صلاحيات كاملة</p>
                </div>
                <button onclick="logout()" style="margin-right: auto; background: rgba(255,100,100,0.2); border: 1px solid #ff6b6b; padding: 8px 15px; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل خروج
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${products.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${products.filter(p => p.stock > 0).length}</div>
                    <div>المنتجات المتاحة</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${totalValue.toLocaleString()} دج</div>
                    <div>قيمة المخزون</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()">
                    <i class="fas fa-plus"></i> إضافة منتج جديد
                </button>
                <button class="btn-outline-gold" onclick="viewMyProducts()">
                    <i class="fas fa-box"></i> عرض منتجاتي
                </button>
                <button class="btn-outline-gold" onclick="openDashboard()">
                    <i class="fas fa-chart-line"></i> لوحة التحكم
                </button>
            </div>
        </div>
    `;
}

// ===== [4.44] إرسال طلب تاجر إلى تلغرام =====
async function sendMerchantRequestToTelegram(merchant) {
    console.log('نظام المصادقة: azer / 123456');
}

// ===== [4.45] إظهار نافذة إضافة منتج =====
function showAddProductModal() {
    if (!isAuthenticated) {
        showNotification('الرجاء تسجيل الدخول أولاً', 'error');
        return;
    }
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
}

// ===== [4.46] البحث عن منتج بالمعرف =====
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج (من تلغرام):');
    if (!id) return;
    
    const product = products.find(p => p.id == id || p.telegramId == id);
    
    if (product) {
        alert(`
🔍 المنتج موجود:
المعرف: ${product.id}
الاسم: ${product.name}
السعر: ${product.price} دج
التاجر: ${product.merchantName}
        `);
        viewProductDetails(product.id);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ===== [4.47] دوال التمرير =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function toggleQuickTopButton() {
    const quickTopBtn = document.getElementById('quickTopBtn');
    if (!quickTopBtn) return;
    quickTopBtn.classList.toggle('show', window.scrollY > 300);
}

// ===== [4.48] تبديل الثيم =====
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ===== [4.49] فتح لوحة تحكم المدير =====
function openDashboard() {
    if (!isAuthenticated) {
        showNotification('الرجاء تسجيل الدخول أولاً', 'error');
        return;
    }
    const section = document.getElementById('dashboardSection');
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        showDashboardOverview();
    }
}

// ===== [4.50] عرض نظرة عامة في لوحة التحكم =====
function showDashboardOverview() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending').length;
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved').length;
    
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 30px;">نظرة عامة</h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-box" style="font-size: 40px; color: var(--gold); margin-bottom: 15px;"></i>
                <div style="font-size: 36px; font-weight: bold;">${products.length}</div>
                <div style="color: var(--text-secondary);">إجمالي المنتجات</div>
            </div>
            
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-users" style="font-size: 40px; color: var(--gold); margin-bottom: 15px;"></i>
                <div style="font-size: 36px; font-weight: bold;">${users.length}</div>
                <div style="color: var(--text-secondary);">إجمالي المستخدمين</div>
            </div>
            
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-store" style="font-size: 40px; color: var(--gold); margin-bottom: 15px;"></i>
                <div style="font-size: 36px; font-weight: bold;">${approvedMerchants}</div>
                <div style="color: var(--text-secondary);">التجار المعتمدين</div>
            </div>
        </div>
        
        <div style="background: var(--glass); padding: 25px; border-radius: 15px;">
            <h4 style="color: var(--gold); margin-bottom: 20px;">معلومات الدخول</h4>
            <p>✅ اسم المستخدم: <strong style="color: var(--gold);">azer</strong></p>
            <p>✅ كلمة المرور: <strong style="color: var(--gold);">123456</strong></p>
            <p>✅ يمكنك إضافة وحذف وتعديل المنتجات بعد تسجيل الدخول</p>
        </div>
    `;
}

// ===== [4.51] عرض طلبات التجار في لوحة التحكم =====
function showDashboardMerchants() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">طلبات التجار</h3>
        <p style="color: var(--text-secondary);">بيانات الدخول: azer / 123456</p>
        <button class="btn-outline-gold" onclick="showDashboardOverview()">رجوع</button>
    `;
}

// ===== [4.52] الموافقة على تاجر =====
function approveMerchant(id) {
    showNotification('نظام المصادقة: azer / 123456', 'info');
}

// ===== [4.53] رفض تاجر =====
function rejectMerchant(id) {
    showNotification('نظام المصادقة: azer / 123456', 'info');
}

// ===== [4.54] إرسال إشعار عام =====
async function sendNotificationToTelegram(text) {
    const message = `
🟡 *إشعار*
━━━━━━━━━━━━━━━━━━━━━━
${text}
🕐 ${new Date().toLocaleString('ar-EG')}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// ===== [4.55] تأثيرات الكتابة =====
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

// ===== [4.56] حفظ حالة المصادقة =====
function saveAuthStatus(status) {
    localStorage.setItem('nardoo_auth', status ? 'true' : 'false');
}

// ===== [4.57] التحقق من حالة المصادقة =====
function checkAuthStatus() {
    const savedAuth = localStorage.getItem('nardoo_auth');
    if (savedAuth === 'true') {
        isAuthenticated = true;
        initDefaultUser();
        updateUIBasedOnRole();
        return true;
    }
    return false;
}

// ===== [4.58] التهيئة عند تحميل الصفحة =====
window.onload = async function() {
    createLoginModal();
    
    const isLoggedIn = checkAuthStatus();
    
    if (isLoggedIn) {
        const savedProducts = localStorage.getItem('nardoo_products');
        if (savedProducts) {
            products = JSON.parse(savedProducts);
            displayProducts();
            console.log(`📦 تم تحميل ${products.length} منتج`);
        }
        
        await loadProducts();
        loadCart();
        updateUIBasedOnRole();
    } else {
        openLoginModal();
        
        const savedProducts = localStorage.getItem('nardoo_products');
        if (savedProducts) {
            products = JSON.parse(savedProducts);
            displayProducts();
        }
        await loadProducts();
        loadCart();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = isDarkMode ? 
                '<i class="fas fa-moon"></i><span>ليلي</span>' : 
                '<i class="fas fa-sun"></i><span>نهاري</span>';
        }
    }

    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1000);
    
    window.addEventListener('scroll', toggleQuickTopButton);
    
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

// ===== [4.59] إغلاق النوافذ عند الضغط خارجها =====
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== [4.60] تصدير الدوال =====
window.saveProduct = saveProduct;
window.addProductToTelegram = addProductToTelegram;
window.handleImageUpload = handleImageUpload;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.checkoutCart = checkoutCart;
window.viewProductDetails = viewProductDetails;
window.openLoginModal = openLoginModal;
window.switchAuthTab = switchAuthTab;
window.toggleMerchantFields = toggleMerchantFields;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showAddProductModal = showAddProductModal;
window.findProductById = findProductById;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.toggleTheme = toggleTheme;
window.openDashboard = openDashboard;
window.showDashboardOverview = showDashboardOverview;
window.showDashboardMerchants = showDashboardMerchants;
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.viewMyProducts = viewMyProducts;
window.handleFormLogin = handleFormLogin;
window.logout = logout;

console.log('✅ نظام تلغرام المتكامل جاهز - اسم المستخدم: azer | كلمة المرور: 123456');
