

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
let currentStore = null;      // المتجر الحالي المختار
let stores = [];              // قائمة المتاجر
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

// ===== [4.3] تحميل المستخدمين والمتاجر من localStorage =====
function loadUsers() {
    const savedUsers = localStorage.getItem('nardoo_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        console.log(`✅ تم تحميل ${users.length} مستخدم`);
    } else {
        users = [];
    }
}

function loadStores() {
    const savedStores = localStorage.getItem('nardoo_stores');
    if (savedStores) {
        stores = JSON.parse(savedStores);
        console.log(`✅ تم تحميل ${stores.length} متجر`);
    } else {
        // إنشاء متجر افتراضي إذا لم يكن موجوداً
        const defaultStore = {
            id: Date.now(),
            storeName: 'ناردو ماركت',
            storeFixedID: generateStoreID('ناردو ماركت'),
            ownerId: null,
            phone: '0555123456',
            address: 'الجزائر',
            createdAt: new Date().toISOString(),
            isActive: true
        };
        stores = [defaultStore];
        localStorage.setItem('nardoo_stores', JSON.stringify(stores));
    }
    
    // تحميل المتجر الحالي
    const savedCurrentStore = localStorage.getItem('current_store');
    if (savedCurrentStore) {
        currentStore = JSON.parse(savedCurrentStore);
    } else if (stores.length > 0) {
        currentStore = stores[0];
        localStorage.setItem('current_store', JSON.stringify(currentStore));
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
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
        color: ${type === 'success' || type === 'warning' ? 'black' : 'white'};
        padding: 15px 25px;
        border-radius: 10px;
        margin-bottom: 10px;
        font-weight: bold;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        min-width: 250px;
    `;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    
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
        'promo': 'بروموسيو',
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
    const fullStars = Math.floor(rating || 4.5);
    const hasHalfStar = (rating || 4.5) % 1 >= 0.5;
    
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

// ===== [4.14] نظام ID الثابت للمتجر (اسم المتجر + رقم ثابت) =====
function generateStoreID(storeName, phoneNumber = null) {
    let cleanName = storeName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
    if (cleanName.length === 0) cleanName = 'متجر';
    
    let namePart = cleanName.substring(0, 6).toUpperCase();
    while (namePart.length < 3 && cleanName.length > 0) {
        namePart = cleanName.substring(0, Math.min(6, cleanName.length)).toUpperCase();
    }
    if (namePart.length < 3) namePart = 'STR';
    
    let fixedNumber;
    if (phoneNumber && phoneNumber.length >= 4) {
        const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
        fixedNumber = digitsOnly.slice(-6);
        if (fixedNumber.length < 4) fixedNumber = Math.floor(Math.random() * 900000 + 100000).toString();
    } else {
        fixedNumber = Math.floor(Math.random() * 900000 + 100000).toString();
    }
    
    const storeID = `${namePart}-${fixedNumber}`;
    console.log(`✅ تم إنشاء معرف المتجر: ${storeID}`);
    return storeID;
}

function getOrCreateStoreID(store) {
    if (store.storeFixedID) return store.storeFixedID;
    
    const storeName = store.storeName || store.name || 'متجر ناردو';
    const phoneNumber = store.phone || '';
    const storeID = generateStoreID(storeName, phoneNumber);
    
    store.storeFixedID = storeID;
    store.storeIDCreatedAt = new Date().toISOString();
    store.storeIDSource = (phoneNumber && phoneNumber.length >= 4) ? 'phone' : 'random';
    
    const allStores = JSON.parse(localStorage.getItem('nardoo_stores') || '[]');
    const storeIndex = allStores.findIndex(s => s.id === store.id);
    if (storeIndex !== -1) {
        allStores[storeIndex].storeFixedID = storeID;
        allStores[storeIndex].storeIDCreatedAt = store.storeIDCreatedAt;
        allStores[storeIndex].storeIDSource = store.storeIDSource;
        localStorage.setItem('nardoo_stores', JSON.stringify(allStores));
    }
    
    sendStoreIDNotification(store, storeID);
    return storeID;
}

async function sendStoreIDNotification(store, storeID) {
    const sourceText = store.storeIDSource === 'phone' ? 'رقم الهاتف' : 'رقم عشوائي';
    const message = `🆔 *توليد معرف متجر ثابت*\n━━━━━━━━━━━━━━━━━━━━━━\n🏪 *المتجر:* ${store.storeName}\n👤 *المالك:* ${store.ownerName || 'غير محدد'}\n🆔 *المعرف:* \`${storeID}\`\n🔢 *المصدر:* ${sourceText}\n🕐 ${new Date().toLocaleString('ar-EG')}`;

    try {
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
        });
    } catch (e) { console.error('Error sending ID notification', e); }
}

// ===== [4.15] إضافة منتج جديد وإرساله لتلغرام =====
async function addProductToTelegram(product, imageFile) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM.channelId);
    
    const caption = `📦 *منتج جديد في المنصة*\n━━━━━━━━━━━━━━━━━━━━━━\n🔹 *المنتج:* ${product.name}\n💰 *السعر:* ${product.price.toLocaleString()} دج\n📂 *القسم:* ${getCategoryName(product.category)}\n📦 *الكمية:* ${product.stock} قطعة\n🏪 *المتجر:* ${product.storeName}\n🆔 *معرف المتجر:* ${product.storeID}\n🆔 *معرف المنتج:* ${product.productCompositeID}\n📝 *الوصف:* ${product.description}\n━━━━━━━━━━━━━━━━━━━━━━\n🛒 تسوق الآن عبر منصة نكهة وجمال`;
    
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    
    if (imageFile) {
        formData.append('photo', imageFile);
    }

    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return { success: data.ok, telegramId: data.result?.message_id };
    } catch (error) {
        console.error('❌ خطأ في إرسال المنتج لتلغرام:', error);
        return { success: false };
    }
}

async function saveProduct(event) {
    event.preventDefault();
    if (!currentUser) return showNotification('يجب تسجيل الدخول أولاً', 'error');

    const name = document.getElementById('productName').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value;
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription').value;
    const imageFile = document.getElementById('productImage').files[0];

    if (!imageFile) return showNotification('يرجى اختيار صورة للمنتج', 'warning');

    const storeID = currentUser.storeFixedID || currentUser.storeID || 'NARDO-000000';
    const productNumber = String(Date.now()).slice(-4);
    const productCompositeID = `${storeID}-${productNumber}`;

    const product = {
        name, price, category, stock, description,
        storeName: currentUser.storeName || 'متجر ناردو',
        storeID: storeID,
        productCompositeID: productCompositeID,
        serialNumber: productNumber,
        rating: 4.5,
        createdAt: new Date().toISOString(),
        merchantName: currentUser.storeName || currentUser.name
    };

    showNotification('🔄 جاري إضافة المنتج...', 'info');
    const result = await addProductToTelegram(product, imageFile);
    
    if (result.success) {
        product.id = result.telegramId;
        product.telegramId = result.telegramId;
        products.push(product);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        document.getElementById('productForm')?.reset();
        const preview = document.getElementById('imagePreview');
        if (preview) preview.innerHTML = '';
        
        closeModal('productModal');
        displayProducts();
        showNotification('✅ تم إضافة المنتج بنجاح', 'success');
    }
}

// ===== [4.16] جلب المنتجات من قناة تلغرام =====
async function loadProductsFromTelegramChannel() {
    try {
        console.log('🔄 [جلب المنتجات] جاري تحميل المنتجات من تلغرام...');
        const url = `${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok && data.result) {
            const updates = [...data.result].reverse();
            let telegramProducts = [];
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                const caption = post.caption || post.text || '';
                const lines = caption.split('\n');
                
                let productData = {
                    id: post.message_id,
                    name: '',
                    price: 1000,
                    category: 'other',
                    stock: 10,
                    storeName: 'متجر ناردو',
                    storeID: 'NARDO-000000',
                    description: caption,
                    images: [],
                    createdAt: new Date(post.date * 1000).toISOString(),
                    rating: 4.5,
                    productCompositeID: ''
                };
                
                for (const line of lines) {
                    if (line.includes('المنتج:')) productData.name = line.split('المنتج:')[1]?.trim() || '';
                    if (line.includes('السعر:')) productData.price = parseInt(line.split('السعر:')[1]?.replace(/[^0-9]/g, '') || 1000);
                    if (line.includes('القسم:')) {
                        const catValue = line.split('القسم:')[1]?.trim().toLowerCase() || '';
                        if (catValue.includes('توابل')) productData.category = 'spices';
                        else if (catValue.includes('كوسمتيك')) productData.category = 'cosmetic';
                        else if (catValue.includes('بروموسيو')) productData.category = 'promo';
                    }
                    if (line.includes('الكمية:')) productData.stock = parseInt(line.split('الكمية:')[1]?.replace(/[^0-9]/g, '') || 10);
                    if (line.includes('المتجر:')) productData.storeName = line.split('المتجر:')[1]?.trim() || 'متجر ناردو';
                }
                
                if (post.photo && post.photo.length > 0) {
                    try {
                        const fileRes = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${post.photo[post.photo.length - 1].file_id}`);
                        const fileData = await fileRes.json();
                        if (fileData.ok) {
                            productData.images = [`https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`];
                        }
                    } catch (err) { console.log('خطأ في جلب الصورة:', err); }
                }
                
                if (!productData.name) productData.name = `منتج ناردو #${post.message_id}`;
                productData.productCompositeID = `${productData.storeID}-${String(post.message_id).slice(-3)}`;
                telegramProducts.push(productData);
            }
            
            const existingProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
            const uniqueProducts = Array.from(new Map([...telegramProducts, ...existingProducts].map(p => [p.id, p])).values());
            products = uniqueProducts;
            localStorage.setItem('nardoo_products', JSON.stringify(products));
            displayProducts();
            console.log(`✅ تم تحميل ${telegramProducts.length} منتج من تلغرام`);
        }
    } catch (error) { console.error('❌ خطأ في جلب المنتجات:', error); }
}

// ===== [4.17] عرض المنتجات في الواجهة =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    let filtered = products;
    if (currentFilter === 'my_products' && currentUser) {
        filtered = products.filter(p => p.storeID === (currentUser.storeFixedID || currentUser.storeID));
    } else if (currentFilter === 'current_store' && currentStore) {
        filtered = products.filter(p => p.storeID === currentStore.storeFixedID);
    } else if (currentFilter !== 'all') {
        filtered = products.filter(p => p.category === currentFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.productCompositeID && p.productCompositeID.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="no-products"><i class="fas fa-search"></i><p>لا توجد منتجات تطابق بحثك</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const imageUrl = product.images?.[0] || "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-badge">${getCategoryName(product.category)}</div>
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" onclick="viewProductDetails(${product.id})" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 onclick="viewProductDetails(${product.id})">${product.name}</h3>
                    <p class="store-name"><i class="fas fa-store"></i> ${product.storeName || 'متجر ناردو'}</p>
                    <div class="product-rating">${generateStars(product.rating)} <span class="rating-num">${(product.rating || 4.5).toFixed(1)}</span></div>
                    <div class="product-footer">
                        <div class="price-container">
                            <span class="price">${product.price.toLocaleString()} دج</span>
                        </div>
                        <button class="btn-add" onclick="addToCart(${product.id})" title="أضف للسلة">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== [4.18] البحث والتصفية =====
function filterProducts(category) {
    currentFilter = category;
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${category}'`)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    displayProducts();
}

function searchProducts(value) {
    searchTerm = value;
    displayProducts();
}

// ===== [4.19] إدارة السلة (إضافة، حذف، تحديث) =====
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
            showNotification('✅ تمت زيادة الكمية في السلة', 'success');
        } else {
            showNotification('⚠️ عذراً، الكمية المتوفرة قد نفدت', 'warning');
        }
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.images?.[0],
            storeName: product.storeName,
            storeID: product.storeID,
            productCompositeID: product.productCompositeID
        });
        showNotification('✅ تم إضافة المنتج للسلة', 'success');
    }
    saveCart();
    updateCartCounter();
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (product && newQuantity > product.stock) {
        showNotification('الكمية غير متوفرة', 'warning');
        return;
    }

    if (item) {
        item.quantity = newQuantity;
        saveCart();
        updateCartCounter();
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج من السلة', 'info');
}

// ===== [4.20] إتمام الشراء وإرسال الطلب =====
async function checkoutCart() {
    if (cart.length === 0) return showNotification('السلة فارغة', 'warning');
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
        id: Date.now(),
        customerName: currentUser.name,
        customerPhone, customerAddress,
        items: [...cart],
        subtotal, shipping, total,
        date: new Date().toLocaleString('ar-EG'),
        timestamp: new Date().toISOString()
    };
    
    const savedOrders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    savedOrders.unshift(order);
    localStorage.setItem('nardoo_orders', JSON.stringify(savedOrders));

    const message = `🟢 *طلب جديد من ${order.customerName}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
📦 *المنتجات:*
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${(i.price * i.quantity).toLocaleString()} دج\n    🆔 معرف المنتج: ${i.productCompositeID || 'غير متوفر'}\n    🏪 المتجر: ${i.storeName || 'غير محدد'} (${i.storeID || '???'})`).join('\n')}
💰 *المجموع الفرعي:* ${subtotal.toLocaleString()} دج
🚚 *الشحن:* ${shipping.toLocaleString()} دج
💵 *الإجمالي:* ${total.toLocaleString()} دج
📅 ${order.date}`;

    try {
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
        });
        
        cart.forEach(item => {
            const p = products.find(p => p.id == item.productId);
            if (p) p.stock -= item.quantity;
        });
        localStorage.setItem('nardoo_products', JSON.stringify(products));

        cart = [];
        saveCart();
        updateCartCounter();
        if (typeof toggleCart === 'function') toggleCart();
        showNotification('✅ تم إرسال الطلب بنجاح', 'success');
    } catch (e) { showNotification('❌ حدث خطأ في إرسال الطلب', 'error'); }
}

// ===== [4.21] عرض تفاصيل المنتج =====
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    if (!modal || !content) return;

    const imageUrl = product.images?.[0] || "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    const storeID = product.storeID || 'غير محدد';
    const productCompositeID = product.productCompositeID || `${storeID}-${product.serialNumber || String(product.id).slice(-3)}`;

    content.innerHTML = `
        <div class="product-detail-view">
            <div class="detail-header">
                <h2 style="color: var(--gold); font-size: 24px; font-weight: 700;">
                    <i class="fas fa-box-open"></i> ${product.name}
                </h2>
            </div>
            <div class="detail-grid">
                <div class="detail-image">
                    <img src="${imageUrl}" style="width: 100%; border-radius: 20px;">
                </div>
                <div class="detail-info">
                    <p class="detail-store">🏪 المتجر: ${product.storeName || 'متجر ناردو'}</p>
                    <p class="detail-desc">${product.description || 'منتج عالي الجودة من منصة نكهة وجمال'}</p>
                    <div class="detail-rating">${generateStars(product.rating)} <span>${(product.rating || 4.5).toFixed(1)}</span></div>
                    <div class="detail-price">${product.price.toLocaleString()} دج</div>
                    <div class="detail-stock"><i class="fas fa-cubes"></i> متوفر: ${product.stock} قطعة</div>
                    <div class="detail-id"><i class="fas fa-hashtag"></i> معرف المنتج: <code>${productCompositeID}</code></div>
                    <div class="detail-actions">
                        <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">أضف للسلة</button>
                        <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// ===== [4.22] إدارة النوافذ المنبثقة (Modals) =====
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function showAddProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
}

// ===== [4.23] نظام المصادقة والأدوار =====
function updateUIBasedOnRole() {
    if (!currentUser) return;

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = 
            currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' :
            (currentUser.role.includes('merchant') || currentUser.role === 'store_owner') ? '<i class="fas fa-store"></i>' :
            '<i class="fas fa-user"></i>';
    }

    const dashboardBtn = document.getElementById('dashboardBtn');
    const merchantPanel = document.getElementById('merchantPanelContainer');
    
    if (dashboardBtn) dashboardBtn.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const navMenu = document.getElementById('mainNav');
    if (navMenu) {
        // تنظيف الأزرار القديمة
        const oldAdd = document.getElementById('adminAddProductBtn');
        const oldMy = document.getElementById('myProductsBtn');
        if (oldAdd) oldAdd.remove();
        if (oldMy) oldMy.remove();

        if (currentUser.role === 'admin') {
            const addBtn = document.createElement('a');
            addBtn.className = 'nav-link'; addBtn.id = 'adminAddProductBtn';
            addBtn.setAttribute('onclick', 'showAddProductModal()');
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
            navMenu.appendChild(addBtn);
        } else if (currentUser.role.includes('merchant') || currentUser.role === 'store_owner') {
            showStorePanel();
            const myBtn = document.createElement('a');
            myBtn.className = 'nav-link'; myBtn.id = 'myProductsBtn';
            myBtn.setAttribute('onclick', 'viewMyStoreProducts()');
            myBtn.innerHTML = '<i class="fas fa-box"></i><span>منتجات متجري</span>';
            navMenu.appendChild(myBtn);
        }
    }
}

function viewMyStoreProducts() {
    if (!currentUser || !currentUser.role.includes('store')) return;
    currentFilter = 'my_products';
    displayProducts();
}

function showStorePanel() {
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel || !currentUser) return;
    
    panel.style.display = 'block';
    const storeID = currentUser.storeFixedID || 'لم يتم إنشاؤه';
    const storeProducts = products.filter(p => p.storeID === storeID);
    const totalVal = storeProducts.reduce((s, p) => s + (p.price * p.stock), 0);
    
    panel.innerHTML = `
        <div class="store-panel-card">
            <div class="store-header">
                <h3><i class="fas fa-store"></i> لوحة تحكم المتجر: ${currentUser.storeName || 'متجري'}</h3>
                <span class="store-id-badge">ID: ${storeID}</span>
            </div>
            <div class="store-stats">
                <div class="stat-item"><span>${storeProducts.length}</span><p>منتج</p></div>
                <div class="stat-item"><span>${totalVal.toLocaleString()} دج</span><p>قيمة المخزون</p></div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
        </div>
    `;
}

// ===== [4.24] نظام التحقق الثنائي (2FA) للمدير =====
async function sendVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingVerificationCode = code;
    verificationCodeExpiry = Date.now() + 300000; // 5 mins
    
    const message = `🔐 *رمز التحقق الخاص بك:*\n\n📱 \`${code}\`\n\n⏰ صالح لمدة 5 دقائق\n🔒 لا تشارك هذا الرمز مع أي شخص`;
    
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' })
        });
        
        if ((await response.json()).ok) {
            showNotification('✅ تم إرسال رمز التحقق إلى القناة', 'success');
            closeModal('loginModal');
            const verifyModal = document.getElementById('verify2FAModal');
            if (verifyModal) verifyModal.style.display = 'flex';
        }
    } catch (e) { showNotification('❌ خطأ في الاتصال بالتلغرام', 'error'); }
}

async function verify2FACode() {
    const enteredCode = document.getElementById('verificationCode')?.value;
    if (!enteredCode || enteredCode.length !== 6) return showNotification('⚠️ أدخل رمزاً مكوناً من 6 أرقام', 'error');
    
    if (Date.now() > verificationCodeExpiry) {
        showNotification('❌ انتهت صلاحية الرمز', 'error');
        closeModal('verify2FAModal');
        return;
    }
    
    if (enteredCode === pendingVerificationCode) {
        let admin = users.find(u => u.role === 'admin') || {
            id: Date.now(), name: 'مدير النظام', email: 'admin@nardoo.com', role: 'admin', telegramId: TELEGRAM.adminId
        };
        if (!users.find(u => u.role === 'admin')) users.push(admin);
        
        currentUser = admin;
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        localStorage.setItem('current_user', JSON.stringify(admin));
        
        showNotification('✅ تم تسجيل دخول المدير بنجاح', 'success');
        setTimeout(() => location.reload(), 500);
    } else { showNotification('❌ رمز غير صحيح', 'error'); }
}

// ===== [4.25] معالجة تسجيل الدخول والتسجيل للمستخدمين =====
async function handleUserLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const user = users.find(u => u.email === email || u.name === email);
    
    if (!user) return showNotification('❌ المستخدم غير موجود', 'error');
    if (user.password && user.password !== password) return showNotification('❌ كلمة المرور غير صحيحة', 'error');
    
    currentUser = user;
    localStorage.setItem('current_user', JSON.stringify(user));
    showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
    setTimeout(() => location.reload(), 500);
}

async function handleStoreRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const storeName = document.getElementById('storeName')?.value;
    
    if (users.find(u => u.email === email)) return showNotification('❌ هذا البريد مسجل مسبقاً', 'error');
    
    const newStore = {
        id: Date.now(), storeName: storeName || `متجر ${name}`, ownerName: name, email, phone,
        status: 'pending', isActive: false, createdAt: new Date().toISOString()
    };
    
    const newUser = {
        id: newStore.id, name, email, password, phone, role: 'store_owner',
        storeName: newStore.storeName, isVerified: true, createdAt: new Date().toISOString()
    };
    
    stores.push(newStore);
    users.push(newUser);
    localStorage.setItem('nardoo_stores', JSON.stringify(stores));
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // إشعار للمدير
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: `🏪 *طلب متجر جديد*\n━━━━━━━━\n👤 المالك: ${name}\n🏪 المتجر: ${newStore.storeName}\n📧 ${email}`,
            parse_mode: 'Markdown'
        })
    });
    
    showNotification('✅ تم إرسال طلبك بنجاح، بانتظار الموافقة', 'success');
    closeModal('loginModal');
}

// ===== [4.26] أنيميشن الكتابة (Typing Animation) =====
class TypingAnimation {
    constructor(element, texts, speed = 100, delay = 2000) {
        this.element = element; this.texts = texts; this.speed = speed; this.delay = delay;
        this.currentIndex = 0; this.isDeleting = false; this.text = '';
    }
    start() { this.type(); }
    type() {
        const current = this.texts[this.currentIndex];
        this.text = this.isDeleting ? current.substring(0, this.text.length - 1) : current.substring(0, this.text.length + 1);
        if (this.element) this.element.innerHTML = this.text + '<span class="typing-cursor">|</span>';
        
        let typeSpeed = this.isDeleting ? this.speed / 2 : this.speed;
        if (!this.isDeleting && this.text === current) { typeSpeed = this.delay; this.isDeleting = true; }
        else if (this.isDeleting && this.text === '') { this.isDeleting = false; this.currentIndex = (this.currentIndex + 1) % this.texts.length; typeSpeed = 500; }
        setTimeout(() => this.type(), typeSpeed);
    }
}

// ===== [4.27] التهيئة عند تحميل الصفحة (OnLoad) =====
window.onload = async function() {
    loadUsers(); loadStores(); loadCart();
    
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) { products = JSON.parse(savedProducts); displayProducts(); }
    
    await loadProductsFromTelegramChannel();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) { currentUser = JSON.parse(savedUser); updateUIBasedOnRole(); }

    // إدارة الثيم (Dark/Light)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i><span>ليلي</span>' : '<i class="fas fa-sun"></i><span>نهاري</span>';
    }

    // إخفاء اللودر
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
    }, 1000);
    
    // تشغيل الأنيميشن
    const typingElement = document.getElementById('typing-text');
    if (typingElement) new TypingAnimation(typingElement, ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    
    console.log('✅ النظام جاهز بالكامل');
};

// ===== [4.28] تصدير الدوال للنطاق العام لضمان عمل أزرار HTML =====
Object.assign(window, {
    saveProduct, addProductToTelegram, closeModal, openLoginModal, showNotification, 
    displayProducts, filterProducts, searchProducts, addToCart, updateCartItem, 
    removeFromCart, checkoutCart, viewProductDetails, showAddProductModal, 
    viewMyStoreProducts, handleUserLogin, handleStoreRegister, sendVerificationCode, 
    verify2FACode, changeSort,
    switchAuthTab: (tab) => { /* منطق تبديل التبويبات */ },
    switchSubTab: (tab) => { /* منطق تبديل التبويبات الفرعية */ }
});

// إغلاق النوافذ عند الضغط خارجها
window.onclick = function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) event.target.style.display = 'none';
};
