
/* ===== مع دعم الصور والفيديو والأزرار التفاعلية ===== */
/* ===== المعدل النهائي - مع ID ثابت للمتجر (اسم المتجر + رقم ثابت) ===== */
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

// ===== [4.50] نظام ID الثابت للمتجر (اسم المتجر + رقم ثابت) =====

// دالة إنشاء ID فريد للمتجر (يعتمد على اسم المتجر + رقم ثابت)
function generateStoreID(storeName, phoneNumber = null) {
    // تنظيف الاسم من الرموز الخاصة وأخذ أول 6 أحرف
    let cleanName = storeName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
    
    // إذا كان الاسم فارغاً، استخدم "متجر"
    if (cleanName.length === 0) cleanName = 'متجر';
    
    // أخذ أول 6 أحرف من الاسم (أو أقل)
    let namePart = cleanName.substring(0, 6).toUpperCase();
    // التأكد من أن اسم المتجر يحتوي على 6 أحرف على الأقل
    while (namePart.length < 3 && cleanName.length > 0) {
        namePart = cleanName.substring(0, Math.min(6, cleanName.length)).toUpperCase();
    }
    if (namePart.length < 3) namePart = 'STR';
    
    // استخدام رقم ثابت (رقم الهاتف إن وجد، وإلا استخدم رقم عشوائي)
    let fixedNumber;
    if (phoneNumber && phoneNumber.length >= 4) {
        // أخذ آخر 6 أرقام من رقم الهاتف
        const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
        fixedNumber = digitsOnly.slice(-6);
        if (fixedNumber.length < 4) fixedNumber = Math.floor(Math.random() * 900000 + 100000).toString();
    } else {
        // استخدام رقم عشوائي مكون من 6 أرقام
        fixedNumber = Math.floor(Math.random() * 900000 + 100000).toString();
    }
    
    // المعرف النهائي: اسم_المتجر-الرقم_الثابت
    const storeID = `${namePart}-${fixedNumber}`;
    
    console.log(`✅ تم إنشاء معرف المتجر: ${storeID} (الاسم: ${namePart}, الرقم: ${fixedNumber})`);
    
    return storeID;
}

// دالة الحصول على ID المتجر أو إنشاؤه (مع دعم الرقم الثابت)
function getOrCreateStoreID(store) {
    // إذا كان المعرف موجوداً مسبقاً، أعده مباشرة
    if (store.storeFixedID) {
        return store.storeFixedID;
    }
    
    // الحصول على اسم المتجر
    const storeName = store.storeName || store.name || 'متجر ناردو';
    
    // الحصول على رقم الهاتف الثابت (إن وجد)
    const phoneNumber = store.phone || '';
    
    // إنشاء معرف جديد
    const storeID = generateStoreID(storeName, phoneNumber);
    
    // حفظ المعرف في كائن المتجر
    store.storeFixedID = storeID;
    store.storeIDCreatedAt = new Date().toISOString();
    store.storeIDSource = (phoneNumber && phoneNumber.length >= 4) ? 'phone' : 'random';
    
    // حفظ في localStorage
    const allStores = JSON.parse(localStorage.getItem('nardoo_stores') || '[]');
    const storeIndex = allStores.findIndex(s => s.id === store.id);
    if (storeIndex !== -1) {
        allStores[storeIndex].storeFixedID = storeID;
        allStores[storeIndex].storeIDCreatedAt = new Date().toISOString();
        allStores[storeIndex].storeIDSource = store.storeIDSource;
        localStorage.setItem('nardoo_stores', JSON.stringify(allStores));
    }
    
    // إرسال إشعار للمدير
    sendStoreIDNotification(store, storeID);
    
    return storeID;
}

// إرسال إشعار ID المتجر إلى تلغرام
async function sendStoreIDNotification(store, storeID) {
    const sourceText = store.storeIDSource === 'phone' ? 'رقم الهاتف' : 'رقم عشوائي';
    const parts = storeID.split('-');
    
    const message = `🏪 *تم إنشاء معرف متجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏬 *اسم المتجر:* ${store.storeName || store.name}
👤 *المالك:* ${store.ownerName || 'غير محدد'}
📞 *الرقم الثابت:* ${store.phone || 'غير محدد'}
🔗 *مصدر الرقم:* ${sourceText}

🆔 *المعرف الثابت للمتجر:*
\`${storeID}\`

📊 *تقسيم المعرف:*
▫️ *الاسم:* ${parts[0] || '???'}
▫️ *الرقم:* ${parts[1] || '???'}

📅 *تاريخ الإنشاء:* ${new Date().toLocaleString('ar-EG')}

🔒 هذا المعرف خاص بالمتجر ويظهر على كل منتجاته
📌 صيغة المعرف: [اسم_المتجر]-[رقم_ثابت]`;

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

// عرض معرف المتجر بشكل منسق
function formatStoreID(storeID) {
    if (!storeID) return 'غير متوفر';
    const parts = storeID.split('-');
    if (parts.length === 2) {
        return `${parts[0]}-${parts[1]}`;
    }
    return storeID;
}

// الحصول على الرقم التسلسلي التالي للمنتج في المتجر
function getNextProductSerial(storeID) {
    const storeProducts = products.filter(p => p.storeID === storeID);
    const nextNumber = storeProducts.length + 1;
    return nextNumber.toString().padStart(3, '0');
}

// توليد معرف المنتج المركب: [معرف_المتجر]-[رقم_تسلسلي]
function generateProductCompositeID(storeID, serialNumber) {
    return `${storeID}-${serialNumber}`;
}



// ===== [4.15] دالة حفظ المنتج =====
async function saveProduct() {
    console.log('🔄 بدء saveProduct');
    
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved' && currentUser.role !== 'store_owner') {
        showNotification('فقط المدير وأصحاب المتاجر يمكنهم إضافة منتجات', 'error');
        return;
    }

    // التأكد من وجود متجر نشط
    if (!currentStore) {
        showNotification('الرجاء اختيار متجر أولاً', 'warning');
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

    // الحصول على معرف المتجر الثابت
    const storeFixedID = getOrCreateStoreID(currentStore);
    
    showNotification('جاري رفع المنتج...', 'info');

    // إنشاء رقم منتج تسلسلي للمتجر
    const storeProducts = products.filter(p => p.storeID === storeFixedID);
    const productNumber = String(storeProducts.length + 1).padStart(3, '0');
    const productCompositeID = generateProductCompositeID(storeFixedID, productNumber);

    const product = {
        name: name,
        category: category,
        price: price,
        stock: stock,
        description: description,
        storeName: currentStore.storeName,
        storeID: storeFixedID,
        productCompositeID: productCompositeID,
        serialNumber: productNumber,
        rating: 4.5,
        createdAt: new Date().toISOString(),
        merchantName: currentUser.storeName || currentUser.name,
        merchantID: currentUser.merchantFixedID || null  // للتوافق مع الإصدارات السابقة
    };

    // تم حذف إرسال المنتج إلى تلغرام بناءً على طلب المستخدم
    const result = { success: true, telegramId: Date.now().toString() };
    
    if (result.success) {
        product.id = result.telegramId;
        product.telegramId = result.telegramId;
        
        products.push(product);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        // إعادة تعيين النموذج
        const productForm = document.getElementById('productForm');
        if (productForm) productForm.reset();
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) imagePreview.innerHTML = '';
        
        closeModal('productModal');
        displayProducts();
        showNotification(`✅ تم إضافة المنتج - المعرف: ${productCompositeID}`, 'success');
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
                let storeName = 'ناردو برو';
                let storeID = '';
                let productCompositeID = '';
                let description = '';
                
                for (const line of lines) {
                    if (line.includes('المنتج:')) name = line.split(':')[1]?.trim() || name;
                    if (line.includes('السعر:')) price = parseInt(line.split(':')[1]?.trim()) || price;
                    if (line.includes('القسم:')) {
                        const catValue = line.split(':')[1]?.trim().toLowerCase() || category;
                        if (catValue === 'توابل') category = 'spices';
                        else if (catValue === 'كوسمتيك') category = 'cosmetic';
                        else if (catValue === 'بروموسيو') category = 'promo';
                        else category = catValue;
                    }
                    if (line.includes('الكمية:')) stock = parseInt(line.split(':')[1]?.trim()) || stock;
                    if (line.includes('المتجر:')) storeName = line.split(':')[1]?.trim() || storeName;
                    if (line.includes('معرف المتجر:')) storeID = line.split(':')[1]?.trim() || storeID;
                    if (line.includes('معرف المنتج:')) productCompositeID = line.split(':')[1]?.trim() || productCompositeID;
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
                    // استخراج الرقم التسلسلي من المعرف المركب
                    let serialNumber = '';
                    let extractedStoreID = storeID;
                    if (productCompositeID) {
                        const parts = productCompositeID.split('-');
                        if (parts.length >= 3) {
                            extractedStoreID = `${parts[0]}-${parts[1]}`;
                            serialNumber = parts[2];
                        } else if (parts.length === 2) {
                            extractedStoreID = productCompositeID;
                            serialNumber = '001';
                        }
                    }
                    
                    telegramProducts.push({
                        id: telegramId,
                        telegramId: telegramId,
                        name: name,
                        price: price || 1000,
                        category: category,
                        stock: stock || 10,
                        storeName: storeName,
                        storeID: extractedStoreID || storeID,
                        productCompositeID: productCompositeID || `${extractedStoreID || storeID}-001`,
                        serialNumber: serialNumber || '001',
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
            const exists = mergedProducts.some(p => p.id === newProduct.id || p.telegramId === newProduct.telegramId);
            if (!exists) {
                mergedProducts.push(newProduct);
                console.log(`✅ منتج جديد: ${newProduct.name} (ID: ${newProduct.productCompositeID})`);
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

// ===== [4.18] تحميل المنتجات وعرضها =====
async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ===== [4.19] عرض المنتجات =====
// ===== [4.19] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    // تصفية حسب المتجر الحالي (إذا لم يكن المدير)
    if (currentFilter === 'current_store' && currentStore) {
        filtered = filtered.filter(p => p.storeID === currentStore.storeFixedID);
    }
    else if (currentFilter === 'my_products' && currentUser && (currentUser.role === 'merchant_approved' || currentUser.role === 'store_owner')) {
        filtered = filtered.filter(p => p.storeID === currentUser.storeID);
    }
    else if (currentFilter !== 'all' && currentFilter !== 'current_store' && currentFilter !== 'my_products') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.storeID && p.storeID.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.productCompositeID && p.productCompositeID.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `...`; // رسالة عدم وجود منتجات
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
        const storeID = product.storeID || 'غير محدد';
        const storeIDParts = storeID !== 'غير محدد' ? storeID.split('-') : ['', ''];
        const productCompositeID = product.productCompositeID || `${storeID}-${product.serialNumber || String(product.id).slice(-3)}`;

        // ✅✅✅ التحسين المهم: عرض اسم المنتج بشكل صحيح ✅✅✅
        let displayName = product.name;
        if (!displayName || displayName === 'منتج' || displayName.trim() === '') {
            if (product.productCompositeID) {
                const serial = product.productCompositeID.split('-').pop();
                displayName = `📦 منتج ${serial}`;
            } else {
                displayName = '✨ منتج ناردو';
            }
        }

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div style="position:absolute; top:15px; left:15px; background:var(--gold); color:black; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:bold; z-index:10; font-family:monospace;">
                    📦 ${productCompositeID}
                </div>
                
                <div style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.75); padding:5px 10px; border-radius:20px; font-size:11px; font-weight:bold; z-index:10; direction:ltr; display: flex; align-items: center; gap: 4px;">
                    <i class="fas fa-store" style="font-size: 10px; color: var(--gold);"></i>
                    <span style="color: var(--gold);">${storeIDParts[0] || '???'}</span>
                    <span style="color: #888;">-</span>
                    <span style="color: #aaa; font-family: monospace;">${storeIDParts[1] || '???'}</span>
                </div>
                
                <div class="product-gallery">
                    <img src="${imageUrl}" style="width: 100%; height: 250px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    
                    <!-- ✅✅✅ السطر المعدل لعرض اسم المنتج ✅✅✅ -->
                    <h3 class="product-title">${displayName}</h3>
                    
                    <div class="product-merchant-info">
                        <i class="fas fa-store"></i> ${product.storeName || product.merchantName || 'متجر ناردو'}
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
            storeName: product.storeName,
            storeID: product.storeID,
            productCompositeID: product.productCompositeID
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
        id: Date.now(),
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        date: new Date().toLocaleString('ar-EG'),
        timestamp: new Date().toISOString()
    };
    
    // حفظ الطلب في localStorage
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

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });

    // تقليل المخزون
    for (const item of cart) {
        const product = products.find(p => p.id == item.productId);
        if (product) {
            product.stock -= item.quantity;
        }
    }
    localStorage.setItem('nardoo_products', JSON.stringify(products));

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

    const storeID = product.storeID || 'غير محدد';
    const storeIDParts = storeID !== 'غير محدد' ? storeID.split('-') : ['', ''];
    const productCompositeID = product.productCompositeID || `${storeID}-${product.serialNumber || String(product.id).slice(-3)}`;

    content.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
                </div>
                <div>
                    <div style="background: rgba(255,215,0,0.15); padding: 15px; border-radius: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #888;">📦 معرف المنتج:</span>
                            <span style="color: var(--gold); font-family: monospace; font-weight: bold;">${productCompositeID}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #888;">🆔 معرف المتجر:</span>
                            <span style="direction: ltr; font-family: monospace;">
                                <span style="color: var(--gold);">${storeIDParts[0]}</span>
                                <span style="color: #888;">-</span>
                                <span style="color: #aaa;">${storeIDParts[1]}</span>
                            </span>
                        </div>
                    </div>
                    <p style="color: #888; margin-bottom: 10px;">🏪 المتجر: ${product.storeName || product.merchantName || 'ناردو برو'}</p>
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
            currentUser.role === 'merchant_approved' || currentUser.role === 'store_owner' ? '<i class="fas fa-store"></i>' :
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
    else if (currentUser.role === 'merchant_approved' || currentUser.role === 'store_owner') {
        showStorePanel();
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu && !document.getElementById('myProductsBtn')) {
            const myProductsBtn = document.createElement('a');
            myProductsBtn.className = 'nav-link';
            myProductsBtn.id = 'myProductsBtn';
            myProductsBtn.setAttribute('onclick', 'viewMyStoreProducts()');
            myProductsBtn.innerHTML = '<i class="fas fa-box"></i><span>منتجات متجري</span>';
            navMenu.appendChild(myProductsBtn);
        }
    }
}

// ===== [4.31] عرض منتجات المتجر الحالي =====
function viewMyStoreProducts() {
    if (!currentUser || (currentUser.role !== 'merchant_approved' && currentUser.role !== 'store_owner')) return;
    currentFilter = 'my_products';
    displayProducts();
}

// ===== [4.32] عرض لوحة المتجر =====
function showStorePanel() {
    if (!currentUser || (currentUser.role !== 'merchant_approved' && currentUser.role !== 'store_owner')) return;
    
    if (!currentStore) {
        showNotification('الرجاء اختيار متجر أولاً', 'warning');
        return;
    }
    
    const storeID = currentStore.storeFixedID || 'لم يتم إنشاؤه بعد';
    const storeIDParts = storeID !== 'لم يتم إنشاؤه بعد' ? storeID.split('-') : ['', ''];
    const storeProducts = products.filter(p => p.storeID === currentStore.storeFixedID);
    
    const totalValue = storeProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.innerHTML = `
        <div style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 30px; margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                <i class="fas fa-store" style="font-size: 50px; color: var(--gold);"></i>
                <div>
                    <h2 style="color: var(--gold); margin: 0;">${currentStore.storeName}</h2>
                    <p style="color: var(--text-secondary);">مرحباً بعودتك إلى متجرك</p>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05)); border-radius: 15px; padding: 20px; margin-bottom: 30px; text-align: center; border: 1px solid var(--gold);">
                <i class="fas fa-store" style="font-size: 40px; color: var(--gold); margin-bottom: 10px;"></i>
                <div style="font-size: 14px; color: var(--text-secondary);">معرف المتجر الثابت</div>
                <div style="font-size: 28px; font-weight: bold; color: var(--gold); letter-spacing: 1px; margin: 10px 0; direction: ltr;">
                    <span style="color: var(--gold);">${storeIDParts[0]}</span>
                    <span style="color: #888;">-</span>
                    <span style="color: #aaa;">${storeIDParts[1] || '???'}</span>
                </div>
                <div style="font-size: 12px; color: #888; margin-top: 5px;">
                    المصدر: ${currentStore.storeIDSource === 'phone' ? 'رقم الهاتف' : 'رقم عشوائي'}
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn-outline-gold" onclick="copyStoreID()" style="padding: 5px 15px; font-size: 12px;">
                        <i class="fas fa-copy"></i> نسخ المعرف
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${storeProducts.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div style="text-align: center; background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px;">
                    <div style="font-size: 40px; color: var(--gold);">${storeProducts.filter(p => p.stock > 0).length}</div>
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
                <button class="btn-outline-gold" onclick="viewMyStoreProducts()">
                    <i class="fas fa-box"></i> عرض منتجاتي
                </button>
            </div>
        </div>
    `;
}

// ===== [4.33] إرسال طلب متجر إلى تلغرام مع أزرار =====
async function sendStoreRequestToTelegram(storeRequest) {
    const sentRequests = JSON.parse(localStorage.getItem('sent_store_requests') || '[]');
    
    if (sentRequests.includes(storeRequest.id)) {
        console.log('⚠️ طلب المتجر هذا أرسل مسبقاً');
        return;
    }
    
    const message = `
🔵 *طلب إنشاء متجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *رقم الطلب:* ${storeRequest.id}
🏪 *اسم المتجر:* ${storeRequest.storeName}
👤 *المالك:* ${storeRequest.ownerName}
📧 *البريد:* ${storeRequest.email}
📞 *الهاتف:* ${storeRequest.phone || 'غير محدد'}
📍 *العنوان:* ${storeRequest.address || 'غير محدد'}
📝 *الوصف:* ${storeRequest.desc || 'متجر جديد'}
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
                        { text: '✅ موافقة', callback_data: `approve_store_${storeRequest.id}` },
                        { text: '❌ رفض', callback_data: `reject_store_${storeRequest.id}` }
                    ]
                ]
            }
        })
    });
    
    sentRequests.push(storeRequest.id);
    localStorage.setItem('sent_store_requests', JSON.stringify(sentRequests));
}

// ===== [4.34] إظهار نافذة إضافة منتج =====
function showAddProductModal() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'admin' || currentUser.role === 'merchant_approved' || currentUser.role === 'store_owner') {
        if (!currentStore) {
            showNotification('الرجاء اختيار متجر أولاً', 'warning');
            return;
        }
        const modal = document.getElementById('productModal');
        if (modal) modal.style.display = 'flex';
    } else {
        showNotification('فقط المدير وأصحاب المتاجر يمكنهم إضافة منتجات', 'error');
    }
}

// ===== [4.35] البحث عن منتج بالمعرف =====
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج (الكامل مثل: NARD00-123456-001):');
    if (!id) return;
    
    const product = products.find(p => 
        p.id == id || 
        p.telegramId == id ||
        p.productCompositeID == id ||
        (p.productCompositeID && p.productCompositeID.includes(id))
    );
    
    if (product) {
        alert(`
🔍 المنتج موجود:
المعرف الكامل: ${product.productCompositeID || product.id}
الاسم: ${product.name}
السعر: ${product.price} دج
المتجر: ${product.storeName}
معرف المتجر: ${product.storeID || 'غير متوفر'}
        `);
        viewProductDetails(product.id);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ===== [4.51] البحث عن منتجات المتجر بالمعرف الثابت =====
function findProductsByStoreID() {
    const storeID = prompt('🔍 أدخل معرف المتجر (مثال: NARD00-123456):');
    if (!storeID) return;
    
    const storeProducts = products.filter(p => p.storeID === storeID);
    
    if (storeProducts.length === 0) {
        showNotification('❌ لا توجد منتجات لهذا المتجر', 'error');
        return;
    }
    
    const productList = storeProducts.map(p => 
        `📦 ${p.name} - ${p.price} دج (معرف: ${p.productCompositeID || p.id})`
    ).join('\n');
    
    alert(`🛍️ منتجات المتجر (${storeID}):\n\n${productList}\n\n📊 إجمالي: ${storeProducts.length} منتج`);
    
    // تصفية وعرض منتجات هذا المتجر فقط
    currentFilter = 'all';
    searchTerm = storeID;
    displayProducts();
}

// ===== [4.52] نسخ معرف المتجر =====
function copyStoreID() {
    if (currentStore && currentStore.storeFixedID) {
        navigator.clipboard.writeText(currentStore.storeFixedID);
        showNotification('✅ تم نسخ معرف المتجر: ' + currentStore.storeFixedID, 'success');
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
    const pendingStores = stores.filter(s => s.status === 'pending').length;
    const activeStores = stores.filter(s => s.isActive === true).length;
    
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
                <i class="fas fa-store" style="font-size: 40px; color: var(--gold); margin-bottom: 15px;"></i>
                <div style="font-size: 36px; font-weight: bold;">${stores.length}</div>
                <div style="color: var(--text-secondary);">إجمالي المتاجر</div>
            </div>
            
            <div style="background: var(--glass); padding: 25px; border-radius: 15px; text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 40px; color: var(--gold); margin-bottom: 15px;"></i>
                <div style="font-size: 36px; font-weight: bold;">${activeStores}</div>
                <div style="color: var(--text-secondary);">المتاجر النشطة</div>
            </div>
        </div>
        
        <div style="background: var(--glass); padding: 25px; border-radius: 15px;">
            <h4 style="color: var(--gold); margin-bottom: 20px;">طلبات المتاجر الجديدة (${pendingStores})</h4>
            ${pendingStores > 0 ? `
                <button class="btn-gold" onclick="showDashboardStores()">
                    عرض الطلبات
                </button>
            ` : `
                <p style="color: var(--text-secondary);">لا توجد طلبات جديدة</p>
            `}
        </div>
    `;
}

// ===== [4.40] عرض طلبات المتاجر في لوحة التحكم =====
function showDashboardStores() {
    const pendingStores = stores.filter(s => s.status === 'pending');
    
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 30px;">طلبات المتاجر الجديدة</h3>
        ${pendingStores.length === 0 ? `
            <p style="color: var(--text-secondary);">لا توجد طلبات جديدة</p>
        ` : `
            <div style="display: grid; gap: 15px;">
                ${pendingStores.map(store => `
                    <div style="background: var(--glass); padding: 20px; border-radius: 15px; border-left: 4px solid var(--gold);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="color: var(--gold); margin: 0 0 10px 0;">${store.storeName}</h4>
                                <p style="margin: 5px 0; color: #aaa;">👤 ${store.ownerName || 'غير محدد'}</p>
                                <p style="margin: 5px 0; color: #aaa;">📧 ${store.email || 'غير محدد'}</p>
                                <p style="margin: 5px 0; color: #aaa;">📞 ${store.phone || 'غير محدد'}</p>
                                <p style="margin: 5px 0; color: #aaa;">📍 ${store.address || 'غير محدد'}</p>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-gold" onclick="approveStore(${store.id})" style="padding: 8px 15px; font-size: 12px;">
                                    ✅ موافقة
                                </button>
                                <button class="btn-outline-gold" onclick="rejectStore(${store.id})" style="padding: 8px 15px; font-size: 12px;">
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

// ===== [4.41] موافقة على متجر =====
function approveStore(id) {
    const store = stores.find(s => s.id == id);
    if (store) {
        if (store.isActive) {
            showNotification('✅ هذا المتجر نشط بالفعل', 'info');
            return;
        }
        
        store.isActive = true;
        store.status = 'approved';
        store.approvedAt = new Date().toISOString();
        
        // إنشاء معرف المتجر الثابت
        const storeID = getOrCreateStoreID(store);
        
        localStorage.setItem('nardoo_stores', JSON.stringify(stores));
        showNotification(`✅ تمت الموافقة على المتجر - المعرف: ${storeID}`, 'success');
        
        if (document.getElementById('dashboardSection')?.style.display === 'block') {
            showDashboardStores();
        }
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `✅ *تمت الموافقة على متجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${store.storeName}
👤 *المالك:* ${store.ownerName || 'غير محدد'}
🆔 *معرف المتجر:* \`${storeID}\`
📞 *الرقم الثابت:* ${store.phone || store.id}
📧 *البريد:* ${store.email || 'غير محدد'}
🎉 *يمكنه الآن إضافة المنتجات*
🕐 ${new Date().toLocaleString('ar-EG')}`,
                parse_mode: 'Markdown'
            })
        });
    }
}

// ===== [4.42] رفض متجر =====
function rejectStore(id) {
    const store = stores.find(s => s.id == id);
    if (store) {
        if (store.status === 'rejected') {
            showNotification('❌ هذا المتجر مرفوض بالفعل', 'info');
            return;
        }
        
        store.status = 'rejected';
        store.isActive = false;
        localStorage.setItem('nardoo_stores', JSON.stringify(stores));
        showNotification('❌ تم رفض طلب المتجر', 'info');
        
        if (document.getElementById('dashboardSection')?.style.display === 'block') {
            showDashboardStores();
        }
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `❌ *تم رفض طلب متجر*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${store.storeName}
👤 *المالك:* ${store.ownerName || 'غير محدد'}
📧 *البريد:* ${store.email || 'غير محدد'}
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
                    
                    let storeId = null;
                    if (data.startsWith('approve_store_')) storeId = data.replace('approve_store_', '');
                    if (data.startsWith('reject_store_')) storeId = data.replace('reject_store_', '');
                    
                    if (storeId && processedRequests[`approved_${storeId}`]) {
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
                    if (storeId) {
                        processedRequests[`approved_${storeId}`] = true;
                    }
                    
                    if (data.startsWith('approve_store_')) {
                        const storeId = data.replace('approve_store_', '');
                        const store = stores.find(s => s.id == storeId);
                        if (store && !store.isActive) {
                            approveStore(storeId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '✅ تمت الموافقة على المتجر بنجاح'
                                })
                            });
                        }
                    }
                    
                    if (data.startsWith('reject_store_')) {
                        const storeId = data.replace('reject_store_', '');
                        const store = stores.find(s => s.id == storeId);
                        if (store && store.status !== 'rejected') {
                            rejectStore(storeId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '❌ تم رفض المتجر'
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
        if (userTab) userTab.style.display = 'block';
        if (adminTab) adminTab.style.display = 'none';
        if (tabs[0]) tabs[0].classList.add('active');
    } else {
        if (userTab) userTab.style.display = 'none';
        if (adminTab) adminTab.style.display = 'block';
        if (tabs[1]) tabs[1].classList.add('active');
    }
}

// ===== [4.46.2] تبديل التبويبات الفرعية =====
function switchSubTab(subTab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const subBtns = document.querySelectorAll('.sub-tab-btn');
    
    subBtns.forEach(btn => btn.classList.remove('active'));
    
    if (subTab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (subBtns[0]) subBtns[0].classList.add('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (subBtns[1]) subBtns[1].classList.add('active');
    }
}

// ===== [4.46.3] إرسال رمز التحقق إلى القناة =====
async function sendVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingVerificationCode = code;
    verificationCodeExpiry = Date.now() + 300000;
    
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
            const verifyModal = document.getElementById('verify2FAModal');
            if (verifyModal) verifyModal.style.display = 'flex';
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
    const enteredCode = document.getElementById('verificationCode')?.value;
    
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

// ===== [4.46.6] دخول المستخدمين =====
async function handleUserLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    const user = users.find(u => u.email === email || u.name === email);
    
    if (!user) {
        showNotification('❌ المستخدم غير موجود', 'error');
        return;
    }
    
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

// ===== [4.46.7] تسجيل متجر جديد =====
async function handleStoreRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const storeName = document.getElementById('storeName')?.value;
    const storeAddress = document.getElementById('storeAddress')?.value;
    const storeDesc = document.getElementById('storeDesc')?.value;
    
    if (users.find(u => u.email === email)) {
        showNotification('❌ هذا البريد مسجل مسبقاً', 'error');
        return;
    }
    
    const newStore = {
        id: Date.now(),
        storeName: storeName || `متجر ${name}`,
        ownerName: name,
        email: email,
        phone: phone || '',
        address: storeAddress || '',
        desc: storeDesc || 'متجر جديد في منصة نكهة وجمال',
        status: 'pending',
        isActive: false,
        createdAt: new Date().toISOString()
    };
    
    const newUser = {
        id: newStore.id,
        name: name,
        email: email,
        password: password,
        phone: phone || '',
        role: 'store_owner',
        storeID: null,  // سيتم إنشاؤه عند الموافقة
        storeName: storeName || `متجر ${name}`,
        isVerified: true,
        createdAt: new Date().toISOString()
    };
    
    stores.push(newStore);
    users.push(newUser);
    
    localStorage.setItem('nardoo_stores', JSON.stringify(stores));
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    await sendStoreRequestToTelegram(newStore);
    
    showNotification('✅ تم إرسال طلب إنشاء المتجر، سيتم التواصل معك قريباً', 'success');
    closeModal('loginModal');
    
    // إعادة تعيين النموذج
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.reset();
}

// ===== [4.47] إضافة زر البحث بالمعرف الثابت للمتجر =====
function addStoreSearchButton() {
    const nav = document.getElementById('mainNav');
    if (nav && !document.getElementById('searchByStoreBtn')) {
        const searchBtn = document.createElement('a');
        searchBtn.className = 'nav-link';
        searchBtn.id = 'searchByStoreBtn';
        searchBtn.setAttribute('onclick', 'findProductsByStoreID()');
        searchBtn.innerHTML = '<i class="fas fa-store"></i><span>بحث بمتجر</span>';
        nav.appendChild(searchBtn);
    }
}

// ===== [4.48] التهيئة عند تحميل الصفحة =====
window.onload = async function() {
    loadUsers();
    loadStores();
    
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
        addStoreSearchButton();
        
        // إضافة زر تصفية حسب المتجر الحالي
        if (nav && !document.getElementById('filterStoreBtn') && currentStore) {
            const filterBtn = document.createElement('a');
            filterBtn.className = 'nav-link';
            filterBtn.id = 'filterStoreBtn';
            filterBtn.setAttribute('onclick', "filterProducts('current_store')");
            filterBtn.innerHTML = '<i class="fas fa-store-alt"></i><span>متجري الحالي</span>';
            nav.appendChild(filterBtn);
        }
    }, 1000);
    
    console.log('✅ النظام جاهز - معرف المتجر = [اسم_المتجر]-[رقم_ثابت]');
    console.log('✅ معرف المنتج = [معرف_المتجر]-[رقم_تسلسلي]');
};

// ===== [4.49] إغلاق النوافذ عند الضغط خارجها =====
window.onclick = function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== [4.50] تصدير الدوال إلى النطاق العام =====
window.saveProduct = saveProduct;
// window.addProductToTelegram = addProductToTelegram; // تم الحذف
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
window.findProductsByStoreID = findProductsByStoreID;
window.copyStoreID = copyStoreID;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.toggleTheme = toggleTheme;
window.openDashboard = openDashboard;
window.showDashboardOverview = showDashboardOverview;
window.showDashboardStores = showDashboardStores;
window.approveStore = approveStore;
window.rejectStore = rejectStore;
window.viewMyStoreProducts = viewMyStoreProducts;
window.switchAuthTab = switchAuthTab;
window.switchSubTab = switchSubTab;
window.sendVerificationCode = sendVerificationCode;
window.verify2FACode = verify2FACode;
window.resendVerificationCode = resendVerificationCode;
window.handleUserLogin = handleUserLogin;
window.handleStoreRegister = handleStoreRegister;

console.log('✅ نظام تلغرام المتكامل جاهز - مع ID ثابت لكل متجر (اسم المتجر + رقم ثابت)');
console.log('✅ صيغة معرف المتجر: [اسم_المتجر]-[رقم_الهاتف أو رقم_عشوائي]');
console.log('✅ صيغة معرف المنتج: [معرف_المتجر]-[رقم_تسلسلي]');
