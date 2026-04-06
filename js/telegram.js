/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
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
let pendingVerificationCode = null;
let verificationCodeExpiry = null;

// ===== [4.3] تحميل السلة =====
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

// ===== [4.4] دوال المساعدة والإشعارات =====
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

// ===== [4.5] دالة مساعدة لجلب رابط الملف من تلغرام =====
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

// ===== [4.6] دالة الحصول على اسم القسم =====
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ===== [4.7] دالة حساب الوقت المنقضي =====
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

// ===== [4.8] دالة توليد النجوم =====
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

// ===== [4.9] دالة الفرز =====
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

// ===== [4.10] إضافة منتج إلى تلغرام =====
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
🏷️ *القسم:* ${getCategoryName(product.category)}
📊 *الكمية:* ${product.stock}
👤 *الناشر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
📅 ${new Date().toLocaleString('ar-EG')}

🔑 NARD-SERIAL: NARD-${Date.now()}-${Math.floor(Math.random() * 10000)}

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
            return { success: true, messageId: messageId };
        }
        showNotification('❌ فشل الإرسال: ' + data.description, 'error');
        return { success: false, error: data.description };
    } catch (error) {
        console.error('❌ خطأ:', error);
        showNotification('❌ خطأ في الاتصال', 'error');
        return { success: false, error: error.message };
    }
}

// ===== [4.11] دالة حفظ المنتج =====
async function saveProduct() {
    console.log('🔄 بدء saveProduct');
    
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        showNotification('❌ الرجاء تسجيل الدخول أولاً', 'error');
        openLoginModal();
        return;
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant') {
        showNotification('❌ ليس لديك صلاحية لإضافة منتجات', 'error');
        return;
    }

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
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.userId,
        description: description
    };

    console.log('📦 المنتج:', product);
    console.log('🖼️ الصورة:', imageFile.name, imageFile.type, imageFile.size);

    const result = await addProductToTelegram(product, imageFile);

    if (result.success) {
        showNotification(`✅ تم إضافة المنتج بنجاح - المعرف: ${result.messageId}`, 'success');
        
        nameInput.value = '';
        categorySelect.value = 'promo';
        priceInput.value = '';
        stockInput.value = '';
        if (descInput) descInput.value = '';
        imageInput.value = '';
        
        const preview = document.getElementById('imagePreview');
        if (preview) preview.innerHTML = '';
        
        closeModal('productModal');
        
        await loadProducts();
    }
}

// ===== [4.12] معالجة رفع الصور =====
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

// ===== [4.13] جلب جميع المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    
    try {
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        const oldProducts = [...products];
        
        const saved = localStorage.getItem('nardoo_products');
        if (saved && oldProducts.length === 0) {
            products = JSON.parse(saved);
            displayProducts();
            console.log(`⚡ عرض سريع: ${products.length} منتج من التخزين`);
        }
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`);
        
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
                
                const lines = caption.split('\n');
                
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                let merchantId = null;
                let description = 'منتج ممتاز';
                let productId = post.message_id;
                let serialNumber = null;
                
                const serialMatch = caption.match(/NARD-SERIAL:\s*(NARD-[A-Z0-9-]+)/i);
                if (serialMatch) serialNumber = serialMatch[1];
                
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
                        id: productId,
                        telegramId: post.message_id,
                        name: name,
                        price: price || 1000,
                        category: category,
                        stock: stock || 10,
                        merchantName: merchant,
                        merchantId: merchantId,
                        description: description,
                        rating: 4.5,
                        image: mediaUrl,
                        images: images,
                        serialNumber: serialNumber,
                        telegramLink: `https://t.me/c/${TELEGRAM.channelId.replace('-100', '')}/${post.message_id}`,
                        createdAt: new Date(post.date * 1000).toISOString(),
                        dateStr: getTimeAgo(post.date)
                    });
                }
            }
        }
        
        console.log(`✅ تم جلب ${telegramProducts.length} منتج من تلغرام`);
        
        const mergedProducts = [...oldProducts];
        
        for (const newProduct of telegramProducts) {
            const exists = mergedProducts.some(p => p.id === newProduct.id);
            if (!exists) {
                mergedProducts.push(newProduct);
                console.log(`➕ منتج جديد: ${newProduct.name} (ID: ${newProduct.id})`);
            }
        }
        
        localStorage.setItem('nardoo_products', JSON.stringify(mergedProducts));
        
        products = mergedProducts;
        displayProducts();
        
        console.log(`📦 إجمالي المنتجات: ${products.length}`);
        
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

// ===== [4.14] تحميل المنتجات وعرضها =====
async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.15] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    const currentUser = Auth.getCurrentUser();
    
    let filtered = products.filter(p => p.stock > 0);
    
    if (currentUser && currentUser.role === 'merchant' && currentFilter === 'my_products') {
        filtered = filtered.filter(p => p.merchantId === currentUser.userId || p.merchantName === currentUser.storeName);
    }
    
    if (currentFilter !== 'all' && currentFilter !== 'my_products') {
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
                ${(currentUser && (currentUser.role === 'admin' || currentUser.role === 'merchant')) ? 
                    '<button class="btn-gold" onclick="showAddProductModal()" style="font-size: 18px; padding: 15px 40px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>' : 
                    '<p style="color: var(--text-secondary);">للإضافة، يجب تسجيل الدخول كتاجر أو مدير</p>'}
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
        
        const isSpecial = product.serialNumber && product.serialNumber.startsWith('NARD-');

        return `
            <div class="product-card ${isSpecial ? 'special-product' : ''}" onclick="viewProductDetails(${product.id})">
                ${isSpecial ? '<div class="special-badge"><i class="fas fa-crown"></i> مميز</div>' : ''}
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

// ===== [4.16] فلترة المنتجات =====
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

// ===== [4.17] البحث عن المنتجات =====
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ===== [4.18] إضافة منتج إلى السلة =====
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
            merchantName: product.merchantName,
            merchantId: product.merchantId
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإضافة إلى السلة', 'success');
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        updateCartDisplay();
    }
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

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

// ===== [4.19] إتمام الشراء =====
async function checkoutCart() {
    if (cart.length === 0) {
        showNotification('🛒 السلة فارغة! أضف بعض المنتجات أولاً', 'warning');
        return;
    }

    const currentUser = Auth.getCurrentUser();
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const orderDate = new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    showNotification('📝 جاري تجهيز نموذج الطلب...', 'info');
    
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return;

    const { customerName, customerPhone, customerAddress, notes, deliveryType } = customerInfo;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let shipping = 800;
    let estimatedDays = '2-3 أيام';
    if (deliveryType === 'express') {
        shipping = 1500;
        estimatedDays = '24 ساعة';
    } else if (customerAddress.includes('دبي') || customerAddress.includes('أبوظبي')) {
        shipping = 500;
        estimatedDays = '1-2 أيام';
    }
    
    const tax = subtotal * 0.00;
    const discount = 0;
    const total = subtotal + shipping + tax - discount;

    const merchantOrders = {};
    for (const item of cart) {
        const merchantName = item.merchantName;
        if (!merchantOrders[merchantName]) {
            merchantOrders[merchantName] = {
                items: [],
                subtotal: 0
            };
        }
        merchantOrders[merchantName].items.push(item);
        merchantOrders[merchantName].subtotal += item.price * item.quantity;
    }

    const merchantCount = Object.keys(merchantOrders).length;
    const shippingPerMerchant = shipping / merchantCount;

    const orderReport = generateOrderReport(orderId, orderDate, customerInfo, {
        subtotal, shipping, tax, discount, total,
        merchantOrders, shippingPerMerchant, estimatedDays
    });

    showNotification('📤 جاري إرسال الطلبات للتجار...', 'info');
    
    for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
        const merchantTotal = orderData.subtotal + shippingPerMerchant;
        
        const merchantMessage = generateMerchantMessage(
            orderId, merchantName, orderData.items, 
            orderData.subtotal, merchantTotal, customerInfo, estimatedDays
        );
        
        await sendTelegramMessage(merchantMessage, 'Markdown');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    await sendTelegramMessage(orderReport, 'HTML');
    
    const customerConfirmation = generateCustomerConfirmation(
        orderId, orderDate, cart, total, estimatedDays, customerAddress
    );
    await sendTelegramMessage(customerConfirmation, 'Markdown');

    saveOrderToHistory(orderId, {
        orderId, orderDate, customerInfo,
        userId: currentUser ? currentUser.userId : null,
        userName: currentUser ? currentUser.name : 'زائر',
        items: [...cart],
        subtotal, shipping, tax, discount, total,
        status: 'pending',
        merchantOrders: merchantOrders
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showOrderSuccessModal(orderId, total, estimatedDays);
    
    console.log(`✅ تم إرسال الطلب بنجاح - رقم الطلب: ${orderId}`);
}

async function getCustomerInfo() {
    return new Promise((resolve) => {
        const currentUser = Auth.getCurrentUser();
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-secondary);
                        border-radius: 30px;
                        padding: 30px;
                        max-width: 500px;
                        width: 90%;
                        border: 2px solid var(--gold);
                        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        animation: slideUp 0.3s ease;">
                <h2 style="color: var(--gold); text-align: center; margin-bottom: 25px;">
                    <i class="fas fa-shopping-cart"></i> إتمام الطلب
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-user"></i> الاسم الكامل
                    </label>
                    <input type="text" id="customerName" placeholder="أدخل اسمك الكامل" value="${currentUser ? currentUser.name : ''}"
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                  background: var(--bg-primary); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-phone"></i> رقم الهاتف
                    </label>
                    <input type="tel" id="customerPhone" placeholder="أدخل رقم هاتفك" value="${currentUser ? currentUser.phone || '' : ''}"
                           style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                  background: var(--bg-primary); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-map-marker-alt"></i> عنوان التوصيل
                    </label>
                    <textarea id="customerAddress" rows="3" placeholder="أدخل عنوانك بالكامل"
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                     background: var(--bg-primary); color: var(--text);"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-truck"></i> طريقة التوصيل
                    </label>
                    <select id="deliveryType" style="width: 100%; padding: 12px; border-radius: 10px; 
                            border: 1px solid var(--gold); background: var(--bg-primary); color: var(--text);">
                        <option value="standard">🚚 عادي (800 دج - 2-3 أيام)</option>
                        <option value="express">⚡ سريع (1500 دج - 24 ساعة)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text);">
                        <i class="fas fa-sticky-note"></i> ملاحظات إضافية (اختياري)
                    </label>
                    <textarea id="orderNotes" rows="2" 
                              style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--gold);
                                     background: var(--bg-primary); color: var(--text);"
                              placeholder="أي ملاحظات تود إضافتها..."></textarea>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="flex: 1; padding: 12px; background: #f87171; color: white;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                    <button id="submitOrderBtn" 
                            style="flex: 1; padding: 12px; background: var(--gold); color: black;
                                   border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-check"></i> تأكيد الطلب
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('submitOrderBtn').onclick = () => {
            const customerName = document.getElementById('customerName').value;
            const customerPhone = document.getElementById('customerPhone').value;
            const customerAddress = document.getElementById('customerAddress').value;
            const deliveryType = document.getElementById('deliveryType').value;
            const notes = document.getElementById('orderNotes').value;
            
            if (!customerName || !customerPhone || !customerAddress) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            modal.remove();
            resolve({ customerName, customerPhone, customerAddress, notes, deliveryType });
        };
    });
}

function generateOrderReport(orderId, orderDate, customerInfo, totals) {
    const { customerName, customerPhone, customerAddress, notes, deliveryType } = customerInfo;
    const { subtotal, shipping, tax, discount, total, merchantOrders, shippingPerMerchant, estimatedDays } = totals;
    
    let merchantsDetails = '';
    for (const [merchantName, orderData] of Object.entries(merchantOrders)) {
        merchantsDetails += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🏪 <b>${merchantName}</b>
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        for (const item of orderData.items) {
            merchantsDetails += `
┃ 📦 ${item.name}
┃    ├ الكمية: ${item.quantity}
┃    ├ السعر: ${item.price.toLocaleString()} دج
┃    └ الإجمالي: ${(item.price * item.quantity).toLocaleString()} دج`;
        }
        merchantsDetails += `
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 💰 إجمالي المنتجات: ${orderData.subtotal.toLocaleString()} دج
┃ 🚚 حصة التوصيل: ${Math.round(shippingPerMerchant).toLocaleString()} دج
┃ ✨ إجمالي الطلب: ${Math.round(orderData.subtotal + shippingPerMerchant).toLocaleString()} دج
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }
    
    return `
╔══════════════════════════════════════════════════════════╗
║                    🧾 <b>تقرير الطلب الجديد</b>                    ║
╠══════════════════════════════════════════════════════════╣
║ 📋 <b>رقم الطلب:</b> <code>${orderId}</code>
║ 🕐 <b>تاريخ الطلب:</b> ${orderDate}
╠══════════════════════════════════════════════════════════╣
║                      👤 <b>معلومات العميل</b>                       ║
╠══════════════════════════════════════════════════════════╣
║ 👨 <b>الاسم:</b> ${customerName}
║ 📞 <b>الهاتف:</b> ${customerPhone}
║ 📍 <b>العنوان:</b> ${customerAddress}
║ 📝 <b>ملاحظات:</b> ${notes || 'لا توجد ملاحظات'}
╠══════════════════════════════════════════════════════════╣
║                      📊 <b>تفاصيل الطلب</b>                       ║
╠══════════════════════════════════════════════════════════╣
${merchantsDetails}
╠══════════════════════════════════════════════════════════╣
║                      💰 <b>إجماليات الطلب</b>                      ║
╠══════════════════════════════════════════════════════════╣
║ 💵 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
║ 🚚 <b>رسوم التوصيل:</b> ${shipping.toLocaleString()} دج
║ 🧾 <b>الضريبة:</b> ${tax.toLocaleString()} دج
║ 🎁 <b>الخصم:</b> ${discount.toLocaleString()} دج
╠══════════════════════════════════════════════════════════╣
║ 💎 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
║ 🚚 <b>طريقة التوصيل:</b> ${deliveryType === 'express' ? 'سريع ⚡' : 'عادي 🚚'}
║ 📅 <b>الوقت المتوقع:</b> ${estimatedDays}
╚══════════════════════════════════════════════════════════╝
    `;
}

function generateMerchantMessage(orderId, merchantName, items, subtotal, total, customerInfo, estimatedDays) {
    const itemsList = items.map((item, index) => 
        `${index + 1}️⃣ ${item.name}\n   ├ الكمية: ${item.quantity}\n   └ السعر: ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n\n');
    
    return `
🟢 <b>طلب جديد - ${merchantName}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>رقم الطلب:</b> <code>${orderId}</code>

👤 <b>معلومات الزبون:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerInfo.customerName}
├ 📞 <b>الهاتف:</b> ${customerInfo.customerPhone}
├ 📍 <b>العنوان:</b> ${customerInfo.customerAddress}
└ 📝 <b>ملاحظات:</b> ${customerInfo.notes || 'لا توجد'}

📦 <b>المنتجات المطلوبة:</b>
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
🚚 <b>رسوم التوصيل:</b> ${Math.round(total - subtotal).toLocaleString()} دج
💎 <b>الإجمالي النهائي:</b> ${Math.round(total).toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ <b>الوقت المتوقع للتوصيل:</b> ${estimatedDays}

✅ يرجى التواصل مع الزبون لتأكيد الطلب
📅 ${new Date().toLocaleString('ar-EG')}
    `;
}

function generateCustomerConfirmation(orderId, orderDate, items, total, estimatedDays, address) {
    const itemsSummary = items.map(item => 
        `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} دج = ${(item.price * item.quantity).toLocaleString()} دج`
    ).join('\n');
    
    return `
🟢 <b>تم استلام طلبك بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>رقم الطلب:</b> <code>${orderId}</code>
📅 <b>تاريخ الطلب:</b> ${orderDate}

📦 <b>المنتجات المطلوبة:</b>
${itemsSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
🚚 <b>عنوان التوصيل:</b> ${address}
⏰ <b>الوقت المتوقع:</b> ${estimatedDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ شكراً لتسوقك من <b>ناردو برو</b> ✨

📞 سيتم التواصل معك قريباً لتأكيد الطلب
    `;
}

async function sendTelegramMessage(message, parseMode = 'HTML') {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: parseMode
            })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
    }
}

function saveOrderToHistory(orderId, orderData) {
    const ordersHistory = JSON.parse(localStorage.getItem('nardoo_orders_history') || '[]');
    ordersHistory.unshift(orderData);
    localStorage.setItem('nardoo_orders_history', JSON.stringify(ordersHistory.slice(0, 50)));
}

function showOrderSuccessModal(orderId, total, estimatedDays) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        z-index: 20001;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
                    border-radius: 30px;
                    padding: 40px;
                    text-align: center;
                    border: 2px solid var(--gold);
                    animation: slideUp 0.3s ease;
                    max-width: 400px;">
            <div style="font-size: 80px; margin-bottom: 20px;">🎉</div>
            <h2 style="color: var(--gold); margin-bottom: 15px;">تم استلام طلبك بنجاح!</h2>
            <p style="color: var(--text); margin-bottom: 10px;">
                <strong>رقم الطلب:</strong><br>
                <code style="font-size: 18px; background: rgba(255,215,0,0.1); padding: 5px 10px; border-radius: 8px;">${orderId}</code>
            </p>
            <p style="color: var(--text); margin-bottom: 10px;">
                <strong>الإجمالي:</strong> ${total.toLocaleString()} دج
            </p>
            <p style="color: var(--text); margin-bottom: 20px;">
                <strong>الوقت المتوقع:</strong> ${estimatedDays}
            </p>
            <button onclick="this.closest('div').parentElement.remove()" 
                    style="background: var(--gold); color: black; padding: 12px 30px;
                           border: none; border-radius: 30px; font-weight: bold;
                           cursor: pointer; font-size: 16px;">
                <i class="fas fa-check"></i> حسناً
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        if (modal.parentElement) modal.remove();
    }, 5000);
}

// ===== [4.20] عرض تفاصيل المنتج =====
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
                    ${product.serialNumber ? `<p style="color: gold; margin-bottom: 10px;">🔑 الرقم التسلسلي: ${product.serialNumber}</p>` : ''}
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

// ===== [4.21] دوال تسجيل دخول المدير عبر التلغرام =====

async function sendVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingVerificationCode = code;
    verificationCodeExpiry = Date.now() + 300000;
    
    const message = `🔐 *رمز التحقق الخاص بك*

📱 \`${code}\`

⏰ صالح لمدة 5 دقائق

🔒 لا تشارك هذا الرمز مع أي شخص

🆔 معرف المدير: ${TELEGRAM.adminId}`;
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showNotification('✅ تم إرسال رمز التحقق إلى قناة التلغرام', 'success');
            closeModal('loginModal');
            openModal('verify2FAModal');
        } else {
            console.error('خطأ:', result);
            showNotification('❌ فشل الإرسال: ' + result.description, 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('❌ خطأ في الاتصال بالتلغرام', 'error');
    }
}

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
        let users = Auth.getUsers();
        let admin = users.find(u => u.role === 'admin');
        
        if (!admin) {
            admin = {
                userId: Auth.generateUserId(),
                name: 'مدير النظام',
                email: 'admin@nardoo.com',
                password: Auth.hashPassword('admin123'),
                role: 'admin',
                isVerified: true,
                createdAt: new Date().toISOString(),
                telegramId: TELEGRAM.adminId
            };
            users.push(admin);
            Auth.saveUsers(users);
        }
        
        localStorage.setItem('currentUserId', admin.userId);
        Auth.updateUI();
        updateUIBasedOnRole();
        closeModal('verify2FAModal');
        showNotification('✅ تم تسجيل الدخول كمدير بنجاح', 'success');
        
        setTimeout(() => location.reload(), 500);
    } else {
        showNotification('❌ رمز غير صحيح', 'error');
    }
}

async function resendVerificationCode() {
    showNotification('🔄 جاري إعادة إرسال الرمز...', 'info');
    await sendVerificationCode();
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function showAddProductModal() {
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        showNotification('❌ الرجاء تسجيل الدخول أولاً', 'error');
        openLoginModal();
        return;
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant') {
        showNotification('❌ ليس لديك صلاحية لإضافة منتجات', 'error');
        return;
    }
    
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
}

function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج:');
    if (!id) return;
    
    const product = products.find(p => p.id == id);
    
    if (product) {
        alert(`
🔍 المنتج موجود:
المعرف: ${product.id}
الاسم: ${product.name}
السعر: ${product.price} دج
التاجر: ${product.merchantName}
${product.serialNumber ? `الرقم التسلسلي: ${product.serialNumber}` : ''}
        `);
        viewProductDetails(product.id);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

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

function updateUIBasedOnRole() {
    const currentUser = Auth.getCurrentUser();
    const inventoryBtn = document.getElementById('inventoryBtn');
    const deliveryBtn = document.getElementById('deliveryBtn');
    const analyticsBtn = document.getElementById('analyticsBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const addReelLink = document.getElementById('addReelLink');
    
    if (currentUser) {
        if (currentUser.role === 'admin') {
            if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
            if (inventoryBtn) inventoryBtn.style.display = 'inline-block';
            if (deliveryBtn) deliveryBtn.style.display = 'inline-block';
            if (analyticsBtn) analyticsBtn.style.display = 'inline-block';
            if (addReelLink) addReelLink.style.display = 'flex';
        } else if (currentUser.role === 'merchant') {
            if (inventoryBtn) inventoryBtn.style.display = 'inline-block';
            if (addReelLink) addReelLink.style.display = 'flex';
        }
    } else {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (inventoryBtn) inventoryBtn.style.display = 'none';
        if (deliveryBtn) deliveryBtn.style.display = 'none';
        if (analyticsBtn) analyticsBtn.style.display = 'none';
        if (addReelLink) addReelLink.style.display = 'none';
    }
}

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

// ===== [4.22] التهيئة عند تحميل الصفحة =====
window.onload = async function() {
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
        displayProducts();
        console.log(`📦 تم تحميل ${products.length} منتج من الذاكرة`);
    }
    
    await loadProducts();
    loadCart();
    
    updateUIBasedOnRole();

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
    
    console.log('✅ نظام تلغرام جاهز ومتوافق مع الملف الرئيسي');
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== [4.23] تصدير الدوال =====
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
window.showAddProductModal = showAddProductModal;
window.findProductById = findProductById;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.toggleTheme = toggleTheme;
window.updateUIBasedOnRole = updateUIBasedOnRole;
window.sendNotificationToTelegram = sendNotificationToTelegram;
window.sendVerificationCode = sendVerificationCode;
window.verify2FACode = verify2FACode;
window.resendVerificationCode = resendVerificationCode;
window.openLoginModal = openLoginModal;
window.openModal = openModal;

console.log('✅ نظام تلغرام جاهز - شامل دخول المدير عبر التلغرام');
