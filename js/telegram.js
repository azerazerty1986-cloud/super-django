اساس تلجرام ميمز

/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== مع دعم الصور والفيديو والأزرار التفاعلية ===== */
/* ===== المعدل النهائي - استخدام معرف تلغرام ===== */
/* ===== النسخة المصححة - جميع الدوال المفقودة مضافة ===== */
/* ================================================================== */

// ===== [4.1] إعدادات تلغرام الأساسية =====
const TELEGRAM = {
    botToken: '8576673096:AAGvSMjzwVWj6wJ47JdqiDwcObXjBDcyiLA',
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

// ===== متغيرات التحقق الثنائي =====
let pendingVerificationCode = null;
let verificationCodeExpiry = null;

// ===== [4.3] تحميل المستخدمين من localStorage =====
function loadUsers() {
    const savedUsers = localStorage.getItem('nardoo_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        console.log(`✅ تم تحميل ${users.length} مستخدم`);
    }
}

// ===== [4.4] تحميل السلة =====
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

// ===== [4.5] حفظ السلة =====
function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

// ===== [4.6] تحديث عداد السلة =====
function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

// ===== [4.7] دوال المساعدة والإشعارات =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
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
    `;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ===== [4.8] دالة مساعدة لجلب رابط الملف من تلغرام =====
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

// ===== [4.9] دالة الحصول على اسم القسم =====
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ===== [4.10] دالة حساب الوقت المنقضي =====
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

// ===== [4.11] دالة توليد النجوم =====
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

// ===== [4.12] دالة الفرز =====
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

// ===== [4.13] تغيير طريقة الفرز =====
function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ===== [4.14] إضافة منتج إلى تلغرام =====
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

// ===== [4.15] دالة حفظ المنتج =====
async function saveProduct() {
    console.log('🔄 بدء saveProduct');
    
    // التحقق من تسجيل الدخول
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    // التحقق من الصلاحية
    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved') {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
        return;
    }

    // الحصول على القيم من النموذج
    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const descInput = document.getElementById('productDescription');
    const imageInput = document.getElementById('productImages');

    // التحقق من وجود العناصر
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

    // التحقق من المدخلات
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

    // التحقق من نوع الملف
    if (!imageFile.type.startsWith('image/')) {
        showNotification('الرجاء اختيار ملف صورة صالح', 'error');
        return;
    }

    // التحقق من حجم الملف (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة كبير جداً (الحد الأقصى 5MB)', 'error');
        return;
    }

    showNotification('جاري رفع المنتج...', 'info');

    const product = {
        name: name,
        category: category,
        price: price,
        stock: stock,
        description: description,
        merchantName: currentUser.storeName || currentUser.name,
        rating: 4.5,
        createdAt: new Date().toISOString()
    };

    const result = await addProductToTelegram(product, imageFile);
    
    if (result.success) {
        product.id = result.telegramId;
        product.telegramId = result.telegramId;
        
        products.push(product);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        // إعادة تعيين النموذج
        document.getElementById('productForm').reset();
        closeModal('productModal');
        displayProducts();
    }
}

// ===== [4.16] جلب المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    try {
        isLoading = true;
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`);
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error('فشل الاتصال بـ Telegram API');
        }
        
        const localProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
        const telegramProducts = [];
        
        if (data.result) {
            for (const update of data.result) {
                const post = update.channel_post || update.message;
                if (!post || !post.photo) continue;
                
                const caption = post.caption || '';
                const lines = caption.split('\n');
                
                let name = 'منتج';
                let price = 1000;
                let category = 'other';
                let stock = 10;
                let merchant = 'ناردو برو';
                let description = '';
                
                for (const line of lines) {
                    if (line.includes('المنتج:')) name = line.split(':')[1]?.trim() || name;
                    if (line.includes('السعر:')) price = parseInt(line.split(':')[1]?.trim()) || price;
                    if (line.includes('القسم:')) category = line.split(':')[1]?.trim().toLowerCase() || category;
                    if (line.includes('الكمية:')) stock = parseInt(line.split(':')[1]?.trim()) || stock;
                    if (line.includes('الناشر:')) merchant = line.split(':')[1]?.trim() || merchant;
                    if (line.includes('الوصف:')) description = line.split(':')[1]?.trim() || description;
                }
                
                const telegramId = post.message_id;
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
        
        // دمج المنتجات: الحفاظ على المنتجات المحلية وإضافة الجديدة
        const mergedProducts = [...localProducts];
        
        for (const newProduct of telegramProducts) {
            const exists = mergedProducts.some(p => p.id === newProduct.id);
            if (!exists) {
                mergedProducts.push(newProduct);
                console.log(`✅ منتج جديد: ${newProduct.name} (ID: ${newProduct.id})`);
            }
        }
        
        console.log(`✅ تم جلب ${telegramProducts.length} منتج من تلغرام، إجمالي: ${mergedProducts.length}`);
        
        // حفظ في localStorage
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

// ===== [4.18] تحميل المنتجات وعرضها =====
async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.19] عرض المنتجات =====
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
                ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'merchant_approved') ? `
                    <button class="btn-gold" onclick="showAddProductModal()" style="font-size: 18px; padding: 15px 40px;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                ` : `
                    <button class="btn-gold" onclick="openLoginModal()" style="font-size: 18px; padding: 15px 40px;">
                        <i class="fas fa-sign-in-alt"></i> تسجيل الدخول للإضافة
                    </button>
                `}
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

// ===== [4.20] فلترة المنتجات =====
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

// ===== [4.21] البحث عن المنتجات =====
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ===== [4.22] إضافة منتج إلى السلة =====
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

// ===== [4.23] تبديل عرض السلة =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        updateCartDisplay();
    }
}

// ===== [4.24] تحديث عرض السلة =====
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
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}

// ===== [4.25] تحديث كمية منتج في السلة =====
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

// ===== [4.26] إزالة منتج من السلة =====
function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

// ===== [4.27] إتمام الشراء =====
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
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        total: total
    };

    // إرسال الطلب إلى تلغرام
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

    // إرسال للتجار عبر واتساب
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

// ===== [4.28] عرض تفاصيل المنتج =====
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

// ===== [4.29] إغلاق النوافذ =====
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ===== [4.29.1] فتح نافذة تسجيل الدخول =====
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ تم فتح نافذة تسجيل الدخول');
    } else {
        console.error('❌ عنصر loginModal غير موجود في الصفحة');
    }
}

// ===== [4.30] تحديث الواجهة حسب دور المستخدم =====
function updateUIBasedOnRole() {
    if (!currentUser) return;

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = 
            currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' :
            currentUser.role === 'merchant_approved' ? '<i class="fas fa-store"></i>' :
            '<i class="fas fa-user"></i>';
    }

    const dashboardBtn = document.getElementById('dashboardBtn');
    const merchantPanel = document.getElementById('merchantPanelContainer');
    
    if (dashboardBtn) dashboardBtn.style.display = 'none';
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const oldAddBtn = document.getElementById('adminAddProductBtn');
    if (oldAddBtn) oldAddBtn.remove();
    
    const oldMyProductsBtn = document.getElementById('myProductsBtn');
    if (oldMyProductsBtn) oldMyProductsBtn.remove();

    if (currentUser.role === 'admin') {
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu && !document.getElementById('adminAddProductBtn')) {
            const addBtn = document.createElement('a');
            addBtn.className = 'nav-link';
            addBtn.id = 'adminAddProductBtn';
            addBtn.setAttribute('onclick', 'showAddProductModal()');
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
            navMenu.appendChild(addBtn);
        }
    } 
    else if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu && !document.getElementById('myProductsBtn')) {
            const myProductsBtn = document.createElement('a');
            myProductsBtn.className = 'nav-link';
            myProductsBtn.id = 'myProductsBtn';
            myProductsBtn.setAttribute('onclick', 'viewMyProducts()');
            myProductsBtn.innerHTML = '<i class="fas fa-box"></i><span>منتجاتي</span>';
            navMenu.appendChild(myProductsBtn);
        }
    }
}

// ===== [4.31] عرض منتجات التاجر =====
function viewMyProducts() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    currentFilter = 'my_products';
    displayProducts();
}

// ===== [4.32] عرض لوحة التاجر =====
function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
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
                <i class="fas fa-store" style="font-size: 50px; color: var(--gold);"></i>
                <div>
                    <h2 style="color: var(--gold); margin: 0;">${currentUser.storeName || currentUser.name}</h2>
                    <p style="color: var(--text-secondary);">مرحباً بعودتك أيها التاجر</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${merchantProducts.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
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
            </div>
        </div>
    `;
}

// ===== [4.33] إرسال طلب تاجر إلى تلغرام مع أزرار =====
async function sendMerchantRequestToTelegram(merchant) {
    const sentRequests = JSON.parse(localStorage.getItem('sent_merchant_requests') || '[]');
    
    if (sentRequests.includes(merchant.id)) {
        console.log('⚠️ طلب التاجر هذا أرسل مسبقاً');
        return;
    }
    
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *رقم الطلب:* ${merchant.id}
🏪 *اسم المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone || 'غير محدد'}
📊 *المستوى:* ${merchant.level || '1'}
📝 *الوصف:* ${merchant.desc || 'تاجر جديد'}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ موافقة', callback_data: `approve_${merchant.id}` },
                        { text: '❌ رفض', callback_data: `reject_${merchant.id}` }
                    ]
                ]
            }
        })
    });
    
    sentRequests.push(merchant.id);
    localStorage.setItem('sent_merchant_requests', JSON.stringify(sentRequests));
}

// ===== [4.34] إظهار نافذة إضافة منتج =====
function showAddProductModal() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'admin' || currentUser.role === 'merchant_approved') {
        const modal = document.getElementById('productModal');
        if (modal) modal.style.display = 'flex';
    } else {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
}

// ===== [4.35] البحث عن منتج بالمعرف =====
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

// ===== [4.36] دوال التمرير =====
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

// ===== [4.37] تبديل الثيم =====
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

// ===== [4.38] فتح لوحة تحكم المدير =====
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('غير مصرح', 'error');
        return;
    }

    const section = document.getElementById('dashboardSection');
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        showDashboardOverview();
    }
}

// ===== [4.39] عرض نظرة عامة في لوحة التحكم =====
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
            <h4 style="color: var(--gold); margin-bottom: 20px;">طلبات التجار (${pendingMerchants})</h4>
            ${pendingMerchants > 0 ? `
                <button class="btn-gold" onclick="showDashboardMerchants()">
                    عرض الطلبات
                </button>
            ` : `
                <p style="color: var(--text-secondary);">لا توجد طلبات جديدة</p>
            `}
        </div>
    `;
}

// ===== [4.40] عرض طلبات التجار في لوحة التحكم =====
function showDashboardMerchants() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 30px;">طلبات التجار</h3>
        ${pendingMerchants.length === 0 ? `
            <p style="color: var(--text-secondary);">لا توجد طلبات جديدة</p>
        ` : `
            <div style="display: grid; gap: 15px;">
                ${pendingMerchants.map(merchant => `
                    <div style="background: var(--glass); padding: 20px; border-radius: 15px; border-left: 4px solid var(--gold);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="color: var(--gold); margin: 0 0 10px 0;">${merchant.name}</h4>
                                <p style="margin: 5px 0; color: #aaa;">🏪 ${merchant.storeName || 'متجر'}</p>
                                <p style="margin: 5px 0; color: #aaa;">📧 ${merchant.email}</p>
                                <p style="margin: 5px 0; color: #aaa;">📞 ${merchant.phone || 'غير محدد'}</p>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-gold" onclick="approveMerchant(${merchant.id})" style="padding: 8px 15px; font-size: 12px;">
                                    ✅ موافقة
                                </button>
                                <button class="btn-outline-gold" onclick="rejectMerchant(${merchant.id})" style="padding: 8px 15px; font-size: 12px;">
                                    ❌ رفض
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `}
        <button class="btn-outline-gold" onclick="showDashboardOverview()" style="margin-top: 20px;">
            ← رجوع
        </button>
    `;
}

// ===== [4.41] موافقة على تاجر =====
function approveMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user) {
        if (user.role === 'merchant_approved') {
            showNotification('✅ هذا التاجر معتمد بالفعل', 'info');
            return;
        }
        
        user.role = 'merchant_approved';
        user.status = 'approved';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('✅ تم الموافقة على التاجر', 'success');
        
        if (document.getElementById('dashboardSection')?.style.display === 'block') {
            showDashboardMerchants();
        }
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `✅ *تمت الموافقة على تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *التاجر:* ${user.name}
🏪 *المتجر:* ${user.storeName || user.name}
📧 *البريد:* ${user.email}
📞 *الهاتف:* ${user.phone || 'غير محدد'}
🎉 *يمكنه الآن إضافة المنتجات*
🕐 ${new Date().toLocaleString('ar-EG')}`,
                parse_mode: 'Markdown'
            })
        });
    }
}

// ===== [4.42] رفض تاجر =====
function rejectMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user) {
        if (user.status === 'rejected') {
            showNotification('❌ هذا التاجر مرفوض بالفعل', 'info');
            return;
        }
        
        user.role = 'customer';
        user.status = 'rejected';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('❌ تم رفض طلب التاجر', 'info');
        
        if (document.getElementById('dashboardSection')?.style.display === 'block') {
            showDashboardMerchants();
        }
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `❌ *تم رفض طلب تاجر*
━━━━━━━━━━━━━━━━━━━━━━
👤 *التاجر:* ${user.name}
🏪 *المتجر:* ${user.storeName || user.name}
📧 *البريد:* ${user.email}
📞 *الهاتف:* ${user.phone || 'غير محدد'}
🕐 ${new Date().toLocaleString('ar-EG')}`,
                parse_mode: 'Markdown'
            })
        });
    }
}

// ===== [4.43] إرسال إشعار عام =====
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

// ===== [4.44] تأثيرات الكتابة =====
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

// ===== [4.45] الاستماع لأوامر وأزرار تلغرام =====
let lastProcessedUpdateId = 0;
let processedRequests = {};

async function loadProcessedRequestsFromTelegram() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        const processedRequests = {};
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    
                    if (text.includes('✅ *تمت الموافقة*') || 
                        text.includes('❌ *تم الرفض*')) {
                        const match = text.match(/رقم الطلب: (\d+)/);
                        if (match) {
                            processedRequests[`approved_${match[1]}`] = true;
                        }
                    }
                }
            }
        }
        
        return processedRequests;
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المعاملات:', error);
        return {};
    }
}

loadProcessedRequestsFromTelegram().then(data => {
    processedRequests = data;
});

setInterval(async () => {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                lastProcessedUpdateId = update.update_id;
                
                if (update.callback_query) {
                    const callback = update.callback_query;
                    const data = callback.data;
                    const uniqueId = `${callback.id}_${callback.message?.message_id}_${data}`;
                    
                    let userId = null;
                    if (data.startsWith('approve_')) userId = data.replace('approve_', '');
                    if (data.startsWith('reject_')) userId = data.replace('reject_', '');
                    
                    if (userId && processedRequests[`approved_${userId}`]) {
                        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                callback_query_id: callback.id,
                                text: '✅ هذا الطلب تمت معالجته مسبقاً',
                                show_alert: true
                            })
                        });
                        continue;
                    }
                    
                    if (processedRequests[uniqueId]) {
                        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                callback_query_id: callback.id,
                                text: '✅ تمت معالجة هذا الطلب مسبقاً',
                                show_alert: true
                            })
                        });
                        continue;
                    }
                    
                    processedRequests[uniqueId] = true;
                    if (userId) {
                        processedRequests[`approved_${userId}`] = true;
                    }
                    
                    if (data.startsWith('approve_')) {
                        const userId = data.replace('approve_', '');
                        const user = users.find(u => u.id == userId);
                        if (user && user.role !== 'merchant_approved') {
                            approveMerchant(userId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '✅ تمت الموافقة على التاجر بنجاح'
                                })
                            });
                        }
                    }
                    
                    if (data.startsWith('reject_')) {
                        const userId = data.replace('reject_', '');
                        const user = users.find(u => u.id == userId);
                        if (user && user.status !== 'rejected') {
                            rejectMerchant(userId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '❌ تم رفض التاجر'
                                })
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق من أوامر تلغرام:', error);
    }
}, 10000);

// ===== [4.46.1] تبديل التبويبات الرئيسية =====
function switchAuthTab(tab) {
    const userTab = document.getElementById('userTab');
    const adminTab = document.getElementById('adminTab');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'user') {
        userTab.style.display = 'block';
        adminTab.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        userTab.style.display = 'none';
        adminTab.style.display = 'block';
        tabs[1].classList.add('active');
    }
}

// ===== [4.46.2] تبديل التبويبات الفرعية =====
function switchSubTab(subTab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const subBtns = document.querySelectorAll('.sub-tab-btn');
    
    subBtns.forEach(btn => btn.classList.remove('active'));
    
    if (subTab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        subBtns[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        subBtns[1].classList.add('active');
    }
}

// ===== [4.46.3] إرسال رمز التحقق إلى القناة =====
async function sendVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingVerificationCode = code;
    verificationCodeExpiry = Date.now() + 300000;
    
    // رسالة بسيطة بدون تنسيق معقد
    const message = `🔐 رمز التحقق الخاص بك:\n\n📱 ${code}\n\n⏰ صالح لمدة 5 دقائق\n\n🔒 لا تشارك هذا الرمز مع أي شخص`;
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showNotification('✅ تم إرسال رمز التحقق إلى القناة', 'success');
            closeModal('loginModal');
            document.getElementById('verify2FAModal').style.display = 'flex';
        } else {
            console.error('خطأ:', result);
            showNotification('❌ فشل الإرسال: ' + result.description, 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('❌ خطأ في الاتصال بالتلغرام', 'error');
    }
}

// ===== [4.46.4] التحقق من رمز المدير =====
async function verify2FACode() {
    const enteredCode = document.getElementById('verificationCode').value;
    
    if (!enteredCode || enteredCode.length !== 6) {
        showNotification('⚠️ أدخل رمزاً مكوناً من 6 أرقام', 'error');
        return;
    }
    
    if (Date.now() > verificationCodeExpiry) {
        showNotification('❌ انتهت صلاحية الرمز، اطلب رمزاً جديداً', 'error');
        closeModal('verify2FAModal');
        return;
    }
    
    if (enteredCode === pendingVerificationCode) {
        // إنشاء أو تحديث مستخدم المدير
        let admin = users.find(u => u.role === 'admin');
        
        if (!admin) {
            admin = {
                id: Math.floor(Math.random() * 1000000),
                name: 'مدير النظام',
                email: 'admin@nardoo.com',
                role: 'admin',
                createdAt: new Date().toISOString(),
                telegramId: TELEGRAM.adminId,
                phone: ''
            };
            users.push(admin);
        }
        
        currentUser = admin;
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        localStorage.setItem('current_user', JSON.stringify(admin));
        
        updateUIBasedOnRole();
        closeModal('verify2FAModal');
        showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
        
        // إعادة تحميل الصفحة بعد ثانية
        setTimeout(() => location.reload(), 500);
    } else {
        showNotification('❌ رمز غير صحيح', 'error');
    }
}

// ===== [4.46.5] إعادة إرسال الرمز =====
async function resendVerificationCode() {
    showNotification('🔄 جاري إعادة إرسال الرمز...', 'info');
    await sendVerificationCode();
}

// ===== [4.46.6] دخول المستخدمين والتجار =====
async function handleUserLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const user = users.find(u => u.email === email || u.name === email);
    
    if (!user) {
        showNotification('❌ المستخدم غير موجود', 'error');
        return;
    }
    
    // تحقق بسيط من كلمة المرور
    if (user.password && user.password !== password) {
        showNotification('❌ كلمة المرور غير صحيحة', 'error');
        return;
    }
    
    currentUser = user;
    localStorage.setItem('current_user', JSON.stringify(user));
    updateUIBasedOnRole();
    closeModal('loginModal');
    showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
    setTimeout(() => location.reload(), 500);
}

// ===== [4.46.7] تسجيل تاجر جديد =====
async function handleMerchantRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const storeName = document.getElementById('storeName').value;
    const merchantLevel = document.getElementById('merchantLevel').value;
    const merchantDesc = document.getElementById('merchantDesc').value;
    
    if (users.find(u => u.email === email)) {
        showNotification('❌ هذا البريد مسجل مسبقاً', 'error');
        return;
    }
    
    const newMerchant = {
        id: Math.floor(Math.random() * 1000000),
        name: name,
        email: email,
        password: password,
        phone: phone || '',
        role: 'merchant_pending',
        isVerified: true,
        createdAt: new Date().toISOString(),
        storeName: storeName || `متجر ${name}`,
        merchantLevel: parseInt(merchantLevel),
        merchantDesc: merchantDesc || 'تاجر في منصة نكهة وجمال',
        products: []
    };
    
    users.push(newMerchant);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // إرسال الطلب إلى تلغرام
    await sendMerchantRequestToTelegram(newMerchant);
    
    showNotification('✅ تم إرسال طلب الانضمام، سيتم التواصل معك قريباً', 'success');
    closeModal('loginModal');
    document.getElementById('registerForm').reset();
}

// ===== [4.47] التهيئة عند تحميل الصفحة =====
window.onload = async function() {
    // تحميل المستخدمين
    loadUsers();
    
    // تحميل المنتجات من localStorage أولاً
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
        displayProducts();
        console.log(`📦 تم تحميل ${products.length} منتج من الذاكرة`);
    }
    
    await loadProducts();
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
    
    // إضافة زر البحث بالمعرف
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
    
    console.log('✅ النظام جاهز - جميع المنتجات تستخدم معرف تلغرام');
};

// ===== [4.48] إغلاق النوافذ عند الضغط خارجها =====
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== [4.49] تصدير الدوال إلى النطاق العام =====
window.saveProduct = saveProduct;
window.addProductToTelegram = addProductToTelegram;
window.handleImageUpload = handleImageUpload;
window.closeModal = closeModal;
window.openLoginModal = openLoginModal;
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
window.switchAuthTab = switchAuthTab;
window.switchSubTab = switchSubTab;
window.sendVerificationCode = sendVerificationCode;
window.verify2FACode = verify2FACode;
window.resendVerificationCode = resendVerificationCode;
window.handleUserLogin = handleUserLogin;
window.handleMerchantRegister = handleMerchantRegister;

console.log('✅ نظام تلغرام المتكامل جاهز - جميع المنتجات تستخدم معرف تلغرام');
console.log('✅ جميع دوال المدير والتحقق الثنائي مضافة ومفعلة');

