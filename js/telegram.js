/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
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
let adminData = null;
let isLoading = false;

// ===== [4.3] بيانات المدير الثابتة =====
const FIXED_ADMIN = {
    id: 19862,
    name: 'azer',
    email: 'azer@admin.com',
    password: '19862',
    role: 'admin',
    phone: '',
    createdAt: new Date().toISOString()
};

// ===== [4.3.1] تحميل المستخدمين العاديين من localStorage =====
function loadLocalUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
        console.log(`📦 تم تحميل ${users.length} مستخدم من localStorage`);
    } else {
        users = [
            { 
                id: 1, 
                name: 'تاجر تجريبي', 
                email: 'merchant@nardoo.com', 
                password: 'm123', 
                role: 'merchant_approved',
                phone: '0555111111',
                storeName: 'متجر التجريبي',
                merchantLevel: '2',
                status: 'approved',
                createdAt: new Date().toISOString()
            },
            { 
                id: 2, 
                name: 'مشتري تجريبي', 
                email: 'customer@nardoo.com', 
                password: 'c123', 
                role: 'customer',
                phone: '0555222222',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}

// ===== [4.3.2] إرسال المدير إلى القناة =====
async function sendAdminToChannel() {
    const adminMessage = `#admin_registration 👑 *تسجيل مدير النظام*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *المعرف:* 19862
👤 *الاسم:* azer
📧 *البريد:* azer@admin.com
🔑 *كلمة السر:* 19862
👑 *الدور:* مدير
📞 *الهاتف:* غير محدد
📅 *تاريخ التسجيل:* ${new Date().toLocaleString('ar-EG')}

✅ *حالة الحساب:* معتمد
━━━━━━━━━━━━━━━━━━━━━━
🔐 هذا الحساب لديه صلاحيات كاملة في النظام`;

    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: adminMessage,
                parse_mode: 'Markdown'
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            console.log(`✅ تم إرسال المدير إلى القناة - معرف الرسالة: ${data.result.message_id}`);
            return { success: true };
        } else {
            console.error('❌ فشل إرسال المدير:', data.description);
            return { success: false, error: data.description };
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال المدير:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.3.3] جلب المدير من القناة =====
async function fetchAdminFromChannel() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=50`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                const message = update.channel_post || update.message;
                if (!message) continue;
                
                const text = message.caption || message.text || '';
                if (text.includes('#admin_registration') && text.includes('19862')) {
                    const nameMatch = text.match(/الاسم:\s*([^\n]+)/);
                    const emailMatch = text.match(/البريد:\s*([^\n]+)/);
                    const passMatch = text.match(/كلمة السر:\s*([^\n]+)/);
                    
                    return {
                        id: 19862,
                        name: nameMatch ? nameMatch[1].replace(/[*_]/g, '').trim() : 'azer',
                        email: emailMatch ? emailMatch[1].replace(/[*_]/g, '').trim() : 'azer@admin.com',
                        password: passMatch ? passMatch[1].replace(/[*_]/g, '').trim() : '19862',
                        role: 'admin'
                    };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في جلب المدير:', error);
        return null;
    }
}

// ===== [4.3.4] تسجيل الدخول الموحد =====
async function loginUser(email, password) {
    // 1️⃣ التحقق من المدير عبر تلغرام أولاً
    const adminFromTelegram = await fetchAdminFromChannel();
    
    if (adminFromTelegram && (email === adminFromTelegram.email || email === adminFromTelegram.name) && password === adminFromTelegram.password) {
        currentUser = adminFromTelegram;
        adminData = adminFromTelegram;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        localStorage.setItem('admin_data', JSON.stringify(adminData));
        updateUIBasedOnRole();
        showWelcomePopup(currentUser);
        showNotification(`👑 مرحباً أيها المدير ${currentUser.name}`, 'success');
        closeModal('loginModal');
        return true;
    }
    
    // 2️⃣ التحقق من المدير الثابت (احتياطي)
    if ((email === 'azer' || email === 'azer@admin.com') && password === '19862') {
        currentUser = FIXED_ADMIN;
        adminData = FIXED_ADMIN;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        localStorage.setItem('admin_data', JSON.stringify(adminData));
        updateUIBasedOnRole();
        showWelcomePopup(currentUser);
        showNotification(`👑 مرحباً أيها المدير ${currentUser.name}`, 'success');
        closeModal('loginModal');
        await sendAdminToChannel();
        return true;
    }
    
    // 3️⃣ التحقق من المستخدمين العاديين
    const localUser = users.find(u => (u.email === email || u.name === email) && u.password === password);
    
    if (localUser) {
        if (localUser.role === 'merchant_pending') {
            showNotification('⏳ حسابك قيد المراجعة من قبل المدير', 'warning');
            return false;
        }
        
        currentUser = localUser;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        updateUIBasedOnRole();
        showWelcomePopup(currentUser);
        
        if (localUser.role === 'merchant_approved') {
            showNotification(`🏪 مرحباً أيها التاجر ${localUser.name}`, 'success');
        } else {
            showNotification(`مرحباً ${localUser.name}`, 'success');
        }
        
        closeModal('loginModal');
        return true;
    }
    
    showNotification('❌ البريد أو كلمة السر غير صحيحة', 'error');
    return false;
}

// ===== [4.3.5] تحديث الواجهة حسب الدور (مع أيقونة المدير) =====
function updateUIBasedOnRole() {
    const userBtn = document.getElementById('userBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const merchantPanel = document.getElementById('merchantPanelContainer');
    
    if (!currentUser) {
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-user"></i><span>حسابي</span>';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (merchantPanel) merchantPanel.style.display = 'none';
        return;
    }
    
    // تحديث أيقونة المستخدم حسب الدور
    if (userBtn) {
        if (currentUser.role === 'admin') {
            userBtn.innerHTML = '<i class="fas fa-crown" style="color: #ffd700;"></i><span>المدير</span>';
        } else if (currentUser.role === 'merchant_approved') {
            userBtn.innerHTML = '<i class="fas fa-store" style="color: #ffd700;"></i><span>التاجر</span>';
        } else {
            userBtn.innerHTML = '<i class="fas fa-user"></i><span>حسابي</span>';
        }
    }
    
    // إظهار لوحة التحكم للمدير
    if (currentUser.role === 'admin') {
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) dashboardSection.style.display = 'block';
        showDashboardOverview();
    } else {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }
    
    // إظهار لوحة التاجر
    if (currentUser.role === 'merchant_approved') {
        if (merchantPanel) merchantPanel.style.display = 'block';
        showMerchantPanel();
    } else {
        if (merchantPanel) merchantPanel.style.display = 'none';
    }
    
    // إضافة زر إضافة منتج في القائمة إذا كان مدير أو تاجر
    const navMenu = document.getElementById('mainNav');
    if (navMenu) {
        let addBtn = document.getElementById('adminAddProductBtn');
        if (!addBtn && (currentUser.role === 'admin' || currentUser.role === 'merchant_approved')) {
            addBtn = document.createElement('a');
            addBtn.id = 'adminAddProductBtn';
            addBtn.className = 'nav-link';
            addBtn.setAttribute('onclick', 'showAddProductModal()');
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
            navMenu.appendChild(addBtn);
        } else if (addBtn && currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved') {
            addBtn.remove();
        }
    }
}

// ===== [4.3.6] تسجيل مستخدم جديد =====
async function registerLocalUser(userData) {
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
        showNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
        return false;
    }
    
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 3;
    
    const newUser = {
        id: newId,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.isMerchant ? 'merchant_pending' : 'customer',
        phone: userData.phone || '',
        status: userData.isMerchant ? 'pending' : 'active',
        createdAt: new Date().toISOString()
    };
    
    if (userData.isMerchant) {
        newUser.storeName = userData.storeName;
        newUser.merchantLevel = userData.merchantLevel;
    }
    
    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    showNotification('✅ تم التسجيل بنجاح', 'success');
    
    if (userData.isMerchant) {
        await sendMerchantRequestToTelegram(newUser);
        showNotification('📋 تم إرسال طلب الموافقة للمدير', 'info');
    }
    
    return true;
}

// ===== [4.3.7] تسجيل خروج =====
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('current_user');
    updateUIBasedOnRole();
    showNotification('👋 تم تسجيل الخروج بنجاح', 'info');
    currentFilter = 'all';
    displayProducts();
}

// ===== [4.4] تحميل السلة =====
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
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// ===== [4.5] الإشعارات =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa'
    };
    
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: black;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        min-width: 250px;
    `;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ===== [4.6] دوال المساعدة =====
function getCategoryName(category) {
    const names = {
        'promo': 'بروموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return 'منذ وقت';
}

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

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ===== [4.7] إضافة منتج إلى تلغرام =====
async function addProductToTelegram(product, imageFile) {
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
        
        if (data.ok) {
            showNotification(`✅ تم إرسال المنتج بنجاح`, 'success');
            return { success: true, messageId: data.result.message_id };
        }
        showNotification('❌ فشل الإرسال: ' + data.description, 'error');
        return { success: false, error: data.description };
    } catch (error) {
        console.error('❌ خطأ:', error);
        showNotification('❌ خطأ في الاتصال', 'error');
        return { success: false, error: error.message };
    }
}

// ===== [4.8] حفظ المنتج =====
async function saveProduct() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved') {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
        return;
    }

    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImages');

    const name = nameInput?.value.trim();
    const category = categorySelect?.value;
    const price = parseInt(priceInput?.value);
    const stock = parseInt(stockInput?.value);
    const description = descInput?.value || '';
    const imageFile = imageInput?.files[0];

    if (!name) return showNotification('الرجاء إدخال اسم المنتج', 'error');
    if (!price || price <= 0) return showNotification('الرجاء إدخال سعر صحيح', 'error');
    if (!stock || stock <= 0) return showNotification('الرجاء إدخال كمية صحيحة', 'error');
    if (!imageFile) return showNotification('الرجاء اختيار صورة للمنتج', 'error');

    showNotification('جاري رفع المنتج...', 'info');

    const product = {
        name, price, category, stock,
        merchantName: currentUser.storeName || currentUser.name,
        description
    };

    const result = await addProductToTelegram(product, imageFile);

    if (result.success) {
        showNotification('✅ تم إضافة المنتج بنجاح', 'success');
        if (nameInput) nameInput.value = '';
        if (categorySelect) categorySelect.value = 'promo';
        if (priceInput) priceInput.value = '';
        if (stockInput) stockInput.value = '';
        if (descInput) descInput.value = '';
        if (imageInput) imageInput.value = '';
        
        const preview = document.getElementById('imagePreview');
        if (preview) preview.innerHTML = '';
        
        closeModal('productModal');
        await loadProducts();
    }
}

// ===== [4.9] جلب المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    
    try {
        const saved = localStorage.getItem('nardoo_products');
        if (saved) {
            products = JSON.parse(saved);
            displayProducts();
        }
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`);
        const data = await response.json();
        const telegramProducts = [];
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                const post = update.channel_post;
                if (!post || !post.photo) continue;
                
                const caption = post.caption || '';
                if (!caption.includes('🟣') && !caption.includes('منتج جديد')) continue;
                
                const lines = caption.split('\n');
                let name = 'منتج', price = 0, category = 'promo', stock = 0, merchant = 'المتجر', description = '';
                
                for (const line of lines) {
                    if (line.includes('المنتج:')) name = line.replace('المنتج:', '').replace(/[*🟣]/g, '').trim();
                    if (line.includes('السعر:')) { const match = line.match(/\d+/); if (match) price = parseInt(match[0]); }
                    if (line.includes('القسم:')) { const cat = line.replace('القسم:', '').toLowerCase();
                        if (cat.includes('promo')) category = 'promo';
                        else if (cat.includes('spices')) category = 'spices';
                        else if (cat.includes('cosmetic')) category = 'cosmetic';
                        else category = 'other';
                    }
                    if (line.includes('الكمية:')) { const match = line.match(/\d+/); if (match) stock = parseInt(match[0]); }
                    if (line.includes('الناشر:')) merchant = line.replace('الناشر:', '').trim();
                    if (line.includes('الوصف:')) description = line.replace('الوصف:', '').trim();
                }
                
                const fileId = post.photo[post.photo.length - 1].file_id;
                const fileResponse = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
                const fileData = await fileResponse.json();
                
                if (fileData.ok) {
                    telegramProducts.push({
                        id: post.message_id,
                        name, price, category, stock, merchantName: merchant, description,
                        rating: 4.5,
                        image: `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`,
                        images: [`https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`],
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                }
            }
        }
        
        const mergedProducts = [...products];
        for (const newProduct of telegramProducts) {
            if (!mergedProducts.some(p => p.id === newProduct.id)) {
                mergedProducts.push(newProduct);
            }
        }
        
        localStorage.setItem('nardoo_products', JSON.stringify(mergedProducts));
        products = mergedProducts;
        displayProducts();
        
        return mergedProducts;
    } catch (error) {
        console.error('❌ خطأ:', error);
        return products;
    } finally {
        isLoading = false;
    }
}

async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.10] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'merchant_approved') ? 
                    '<button class="btn-gold" onclick="showAddProductModal()">➕ إضافة منتج جديد</button>' : 
                    '<button class="btn-gold" onclick="openLoginModal()">🔐 تسجيل الدخول للإضافة</button>'}
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="viewProductDetails(${product.id})">
            <div class="product-time-badge"><i class="far fa-clock"></i> ${getTimeAgo(product.createdAt)}</div>
            <div style="position:absolute; top:15px; left:15px; background:var(--gold); color:black; padding:5px 10px; border-radius:20px; font-size:12px;">🆔 ${product.id}</div>
            <img src="${product.image || 'https://via.placeholder.com/300'}" style="width:100%; height:250px; object-fit:cover;">
            <div class="product-info">
                <div class="product-category"><i class="fas fa-tag"></i> ${getCategoryName(product.category)}</div>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-merchant-info"><i class="fas fa-store"></i> ${product.merchantName}</div>
                <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                <div class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">
                    ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                </div>
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterProducts(category) { currentFilter = category; displayProducts(); }
function searchProducts() { searchTerm = document.getElementById('searchInput')?.value || ''; displayProducts(); }

// ===== [4.11] السلة =====
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) return showNotification('المنتج غير متوفر', 'error');

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) existing.quantity++;
        else return showNotification('الكمية غير كافية', 'warning');
    } else {
        cart.push({ productId, name: product.name, price: product.price, quantity: 1, merchantName: product.merchantName });
    }

    saveCart();
    updateCartCounter();
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
        itemsDiv.innerHTML = '<div style="text-align:center;padding:40px;">السلة فارغة</div>';
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
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background:#f87171;">🗑️</button>
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
    if (newQuantity <= 0) return removeFromCart(productId);
    if (newQuantity > product.stock) return showNotification('الكمية غير متوفرة', 'warning');
    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

// ===== [4.12] إتمام الشراء =====
async function checkoutCart() {
    if (cart.length === 0) return showNotification('السلة فارغة', 'warning');
    if (!currentUser) {
        showNotification('يرجى تسجيل الدخول أولاً', 'warning');
        return openLoginModal();
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = `ORD-${Date.now()}`;
    
    const message = `🛒 *طلب جديد*
━━━━━━━━━━━━━━━━
📋 *رقم الطلب:* ${orderId}
👤 *العميل:* ${currentUser.name}
📞 *الهاتف:* ${currentUser.phone || 'غير مدخل'}
💰 *الإجمالي:* ${total.toLocaleString()} دج

📦 *المنتجات:*
${cart.map(item => `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} دج`).join('\n')}
━━━━━━━━━━━━━━━━
✅ سيتم التواصل معك قريباً`;

    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    showNotification(`✅ تم إرسال طلبك رقم ${orderId}`, 'success');
}

// ===== [4.13] عرض تفاصيل المنتج =====
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    if (!modal || !content) return;

    content.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px;">
            <h2 style="color: var(--gold);">${product.name}</h2>
            <img src="${product.image}" style="width:100%; max-height:300px; object-fit:cover; border-radius:15px; margin:15px 0;">
            <p><strong>السعر:</strong> ${product.price.toLocaleString()} دج</p>
            <p><strong>التاجر:</strong> ${product.merchantName}</p>
            <p><strong>الوصف:</strong> ${product.description || 'منتج ممتاز'}</p>
            <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">➕ أضف للسلة</button>
            <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">إغلاق</button>
        </div>
    `;
    modal.style.display = 'flex';
}

// ===== [4.14] إدارة المستخدمين =====
function openLoginModal() { const modal = document.getElementById('loginModal'); if (modal) modal.style.display = 'flex'; }
function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant');
    const merchantFields = document.getElementById('merchantFields');
    if (isMerchant && merchantFields) merchantFields.style.display = isMerchant.checked ? 'block' : 'none';
}

function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    if (email && password) loginUser(email, password);
}

async function handleRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant')?.checked;

    if (!name || !email || !password) return showNotification('املأ جميع الحقول', 'error');

    if (isMerchant) {
        const storeName = document.getElementById('storeName')?.value;
        const merchantLevel = document.getElementById('merchantLevel')?.value;
        await registerLocalUser({ name, email, password, phone, isMerchant: true, storeName, merchantLevel });
        switchAuthTab('login');
    } else {
        await registerLocalUser({ name, email, password, phone, isMerchant: false });
        switchAuthTab('login');
    }
}

// ===== [4.15] لوحة التاجر =====
function showMerchantPanel() {
    const merchantProducts = products.filter(p => p.merchantName === currentUser?.storeName || p.merchantName === currentUser?.name);
    const totalValue = merchantProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.innerHTML = `
        <div style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 30px; margin: 20px 0;">
            <h2 style="color: var(--gold);">🏪 ${currentUser.storeName || currentUser.name}</h2>
            <div style="display: grid; grid-template-columns: repeat(3,1fr); gap:20px; margin:20px 0;">
                <div style="text-align:center; background:rgba(255,215,0,0.1); padding:20px; border-radius:15px;">
                    <div style="font-size:40px; color:var(--gold);">${merchantProducts.length}</div>
                    <div>المنتجات</div>
                </div>
                <div style="text-align:center; background:rgba(255,215,0,0.1); padding:20px; border-radius:15px;">
                    <div style="font-size:40px; color:var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>المتاحة</div>
                </div>
                <div style="text-align:center; background:rgba(255,215,0,0.1); padding:20px; border-radius:15px;">
                    <div style="font-size:40px; color:var(--gold);">${totalValue.toLocaleString()} دج</div>
                    <div>قيمة المخزون</div>
                </div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()">➕ إضافة منتج</button>
        </div>
    `;
}

function showAddProductModal() {
    if (!currentUser) return openLoginModal();
    if (currentUser.role === 'admin' || currentUser.role === 'merchant_approved') {
        const modal = document.getElementById('productModal');
        if (modal) modal.style.display = 'flex';
    } else {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
}

// ===== [4.16] لوحة تحكم المدير =====
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') return showNotification('غير مصرح', 'error');
    const section = document.getElementById('dashboardSection');
    if (section) section.style.display = 'block';
    showDashboardOverview();
}

function showDashboardOverview() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending').length;
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    content.innerHTML = `
        <h3 style="color: var(--gold);">📊 نظرة عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(3,1fr); gap:20px; margin:20px 0;">
            <div style="background:var(--glass); padding:25px; border-radius:15px; text-align:center;">
                <div style="font-size:36px;">${products.length}</div>
                <div>المنتجات</div>
            </div>
            <div style="background:var(--glass); padding:25px; border-radius:15px; text-align:center;">
                <div style="font-size:36px;">${users.length}</div>
                <div>المستخدمين</div>
            </div>
            <div style="background:var(--glass); padding:25px; border-radius:15px; text-align:center;">
                <div style="font-size:36px;">${users.filter(u => u.role === 'merchant_approved').length}</div>
                <div>التجار</div>
            </div>
        </div>
        ${pendingMerchants > 0 ? `<button class="btn-gold" onclick="showDashboardMerchants()">📋 طلبات التجار (${pendingMerchants})</button>` : '<p>لا توجد طلبات جديدة</p>'}
    `;
}

function showDashboardMerchants() {
    const pending = users.filter(u => u.role === 'merchant_pending');
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    if (pending.length === 0) {
        content.innerHTML = `<h3>طلبات التجار</h3><p>لا توجد طلبات جديدة</p><button class="btn-outline-gold" onclick="showDashboardOverview()">رجوع</button>`;
        return;
    }
    
    content.innerHTML = `
        <h3>📋 طلبات التجار (${pending.length})</h3>
        ${pending.map(m => `
            <div style="background:var(--glass); border:1px solid var(--gold); border-radius:10px; padding:20px; margin:15px 0;">
                <h4>🏪 ${m.storeName || m.name}</h4>
                <p>👤 ${m.name}</p>
                <p>📧 ${m.email}</p>
                <button class="btn-gold" onclick="approveMerchant(${m.id})">✅ موافقة</button>
                <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})">❌ رفض</button>
            </div>
        `).join('')}
        <button class="btn-outline-gold" onclick="showDashboardOverview()">رجوع</button>
    `;
}

function approveMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user && user.role !== 'merchant_approved') {
        user.role = 'merchant_approved';
        user.status = 'approved';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('✅ تمت الموافقة على التاجر', 'success');
        showDashboardMerchants();
        sendTelegramMessage(`✅ تمت الموافقة على تاجر: ${user.name}`);
    }
}

function rejectMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user) {
        user.role = 'customer';
        user.status = 'rejected';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('❌ تم رفض التاجر', 'info');
        showDashboardMerchants();
        sendTelegramMessage(`❌ تم رفض تاجر: ${user.name}`);
    }
}

async function sendMerchantRequestToTelegram(merchant) {
    const message = `🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: ${merchant.id}
🏪 المتجر: ${merchant.storeName}
👤 التاجر: ${merchant.name}
📧 البريد: ${merchant.email}
📞 الهاتف: ${merchant.phone || 'غير محدد'}`;

    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
    });
}

async function sendTelegramMessage(message) {
    try {
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
        });
    } catch (error) { console.error('خطأ:', error); }
}

// ===== [4.17] دوال إضافية =====
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج:');
    if (id) {
        const product = products.find(p => p.id == id);
        if (product) viewProductDetails(product.id);
        else alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function scrollToBottom() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function showWelcomePopup(user) {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background: var(--bg-primary); border:2px solid var(--gold); border-radius:30px;
        padding:30px; text-align:center; z-index:10000; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;
    popup.innerHTML = `
        <div style="font-size:70px;">${user.role === 'admin' ? '👑' : user.role === 'merchant_approved' ? '🏪' : '👤'}</div>
        <h2 style="color:var(--gold);">مرحباً ${user.name}!</h2>
        <button onclick="this.parentElement.remove()" style="background:var(--gold); padding:10px 20px; border:none; border-radius:20px; margin-top:15px;">✨ تفضل بالتسوق</button>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
}

// ===== [4.18] التهيئة النهائية =====
window.onload = async function() {
    // 1️⃣ إرسال المدير إلى القناة
    await sendAdminToChannel();
    
    // 2️⃣ تحميل المستخدمين
    loadLocalUsers();
    
    // 3️⃣ التحقق من المدير المخزن
    const savedAdmin = localStorage.getItem('admin_data');
    if (savedAdmin) adminData = JSON.parse(savedAdmin);
    
    // 4️⃣ تحميل المنتجات
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
        displayProducts();
    }
    
    await loadProducts();
    loadCart();

    // 5️⃣ استعادة جلسة المستخدم
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.id === 19862 && parsed.password === '19862') {
            currentUser = FIXED_ADMIN;
            adminData = FIXED_ADMIN;
            updateUIBasedOnRole();
        } else {
            const localUser = users.find(u => u.id === parsed.id);
            if (localUser) {
                currentUser = localUser;
                updateUIBasedOnRole();
            }
        }
    }

    // 6️⃣ استعادة الثيم
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
    }
    
    // 7️⃣ إخفاء اللودر
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 1000);
    
    console.log('✅ النظام جاهز - المدير: azer / 19862');
    console.log('👑 أيقونة المدير تظهر في زر حسابي');
};

// ===== [4.19] إغلاق النوافذ =====
window.onclick = function(event) {
    if (event.target.classList?.contains('modal')) event.target.style.display = 'none';
};

// ===== [4.20] تصدير الدوال =====
window.saveProduct = saveProduct;
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
window.logoutUser = logoutUser;
window.showWelcomePopup = showWelcomePopup;
window.sendAdminToChannel = sendAdminToChannel;
window.fetchAdminFromChannel = fetchAdminFromChannel;

console.log('✅ نظام تلغرام المتكامل جاهز');
console.log('👑 المدير: azer / 19862');
console.log('📌 أيقونة المدير 👑 تظهر في زر حسابي بعد تسجيل الدخول');
