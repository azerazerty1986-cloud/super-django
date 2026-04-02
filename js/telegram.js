/* ================================================================== */
/* ===== ملف: telegram.js - نظام تلغرام + المستخدمين + المصادقة ===== */
/* ================================================================== */

// ==================== القسم 1: إعدادات تلغرام ====================

const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ==================== القسم 2: المتغيرات العامة ====================

let products = [];
let currentUser = null;
let users = [];
let isLoading = false;
let lastProcessedUpdateId = 0;
let processedRequests = {};

// ==================== القسم 3: تحميل المستخدمين ====================

function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'azer', 
                email: 'azer@admin.com', 
                password: '123456', 
                role: 'admin',
                phone: '',
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
                merchantLevel: '2',
                status: 'approved',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ==================== القسم 4: دوال تلغرام الأساسية ====================

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
        formData.append('parse_mode', 'Markdown');

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

async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    
    try {
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        const oldProducts = [...products];
        
        const saved = localStorage.getItem('nardoo_products');
        if (saved && oldProducts.length === 0) {
            products = JSON.parse(saved);
            if (typeof displayProducts === 'function') displayProducts();
            console.log(`⚡ عرض سريع: ${products.length} منتج من التخزين`);
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
                
                const lines = caption.split('\n');
                
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                let description = 'منتج ممتاز';
                let productId = post.message_id;
                
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
        if (typeof displayProducts === 'function') displayProducts();
        
        console.log(`📦 إجمالي المنتجات: ${products.length}`);
        
        return mergedProducts;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        showNotification('فشل الاتصال بتلغرام، عرض المنتجات المخزنة', 'warning');
        
        const saved = localStorage.getItem('nardoo_products');
        if (saved) {
            products = JSON.parse(saved);
            if (typeof displayProducts === 'function') displayProducts();
            return products;
        }
        
        return [];
        
    } finally {
        isLoading = false;
    }
}

async function loadProducts() {
    await fetchProductsFromTelegram();
}

// ==================== القسم 5: إدارة المنتجات ====================

async function saveProduct() {
    console.log('🔄 بدء saveProduct');
    
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
        description: description
    };

    console.log('📦 المنتج:', product);
    console.log('🖼️ الصورة:', imageFile.name, imageFile.type, imageFile.size);
    console.log('👤 المستخدم الحالي:', currentUser);

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
        `);
        if (typeof viewProductDetails === 'function') viewProductDetails(product.id);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ==================== القسم 6: المصادقة ====================

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
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
        
        // عرض نافذة الترحيب المنبثقة
        showWelcomePopup(user);
        
        showNotification(`مرحباً ${user.name}`, 'success');
    } else {
        showNotification('بيانات غير صحيحة', 'error');
    }
}

function handleMerchantRegister(merchantData) {
    const {
        name,
        email,
        password,
        phone,
        storeName,
        merchantLevel,
        merchantDesc
    } = merchantData;

    if (users.find(u => u.email === email)) {
        showNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
        return false;
    }

    const newMerchant = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password,
        phone: phone || '',
        role: 'merchant_pending',
        status: 'pending',
        storeName: storeName || 'متجر ' + name,
        merchantLevel: merchantLevel || '1',
        description: merchantDesc || '',
        createdAt: new Date().toISOString()
    };

    users.push(newMerchant);
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    sendMerchantRequestToTelegram({
        id: newMerchant.id,
        name: newMerchant.name,
        storeName: newMerchant.storeName,
        email: newMerchant.email,
        phone: newMerchant.phone,
        level: newMerchant.merchantLevel,
        desc: newMerchant.description
    });

    showNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
    return true;
}

function handleRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant')?.checked;

    if (!name || !email || !password) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    if (isMerchant) {
        const storeName = document.getElementById('storeName')?.value;
        const merchantLevel = document.getElementById('merchantLevel')?.value;
        const merchantDesc = document.getElementById('merchantDesc')?.value;

        handleMerchantRegister({
            name, email, password, phone,
            storeName, merchantLevel, merchantDesc
        });
        switchAuthTab('login');
    } else {
        if (users.find(u => u.email === email)) {
            showNotification('البريد مستخدم بالفعل', 'error');
            return;
        }

        const newUser = {
            id: users.length + 1,
            name,
            email,
            password,
            phone,
            role: 'customer',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('✅ تم التسجيل بنجاح', 'success');
        switchAuthTab('login');
    }
}

// ==================== القسم 7: نافذة الترحيب ====================

function showWelcomePopup(user) {
    const popup = document.createElement('div');
    popup.id = 'welcomePopup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
        border: 2px solid var(--gold);
        border-radius: 30px;
        padding: 30px 40px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        animation: welcomeZoomIn 0.4s ease-out;
        min-width: 350px;
        backdrop-filter: blur(10px);
    `;
    
    let roleIcon = '👤';
    let roleText = 'عميل';
    if (user.role === 'admin') {
        roleIcon = '👑';
        roleText = 'مدير';
    } else if (user.role === 'merchant_approved') {
        roleIcon = '🏪';
        roleText = 'تاجر معتمد';
    } else if (user.role === 'merchant_pending') {
        roleIcon = '⏳';
        roleText = 'قيد المراجعة';
    }
    
    popup.innerHTML = `
        <div style="font-size: 70px; margin-bottom: 15px;">${roleIcon}</div>
        <h2 style="color: var(--gold); margin-bottom: 10px; font-size: 28px;">مرحباً بك يا ${user.name}! 🎉</h2>
        <p style="color: var(--text-secondary); margin-bottom: 15px;">نوع الحساب: <strong style="color: var(--gold);">${roleText}</strong></p>
        <div style="background: rgba(255,215,0,0.15); border-radius: 15px; padding: 15px; margin: 15px 0;">
            <p style="margin: 5px 0;">📧 ${user.email}</p>
            ${user.phone ? `<p style="margin: 5px 0;">📞 ${user.phone}</p>` : ''}
            ${user.storeName ? `<p style="margin: 5px 0;">🏪 ${user.storeName}</p>` : ''}
        </div>
        <p style="color: var(--gold); font-size: 14px; margin-bottom: 20px;">✨ أهلاً وسهلاً بك في متجر ناردو برو ✨</p>
        <button id="closeWelcomePopup" style="
            background: var(--gold);
            color: black;
            border: none;
            padding: 12px 30px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <i class="fas fa-check"></i> تفضل بالتسوق
        </button>
    `;
    
    document.body.appendChild(popup);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes welcomeZoomIn {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        @keyframes welcomeZoomOut {
            from {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
        }
    `;
    document.head.appendChild(style);
    
    document.getElementById('closeWelcomePopup').onclick = () => {
        popup.style.animation = 'welcomeZoomOut 0.3s ease-in';
        setTimeout(() => popup.remove(), 300);
    };
    
    setTimeout(() => {
        document.addEventListener('click', function closeOnOutside(e) {
            if (!popup.contains(e.target) && !e.target.closest('#closeWelcomePopup')) {
                popup.style.animation = 'welcomeZoomOut 0.3s ease-in';
                setTimeout(() => {
                    popup.remove();
                    document.removeEventListener('click', closeOnOutside);
                }, 300);
            }
        });
    }, 100);
    
    setTimeout(() => {
        if (document.getElementById('welcomePopup')) {
            popup.style.animation = 'welcomeZoomOut 0.3s ease-in';
            setTimeout(() => popup.remove(), 300);
        }
    }, 5000);
}

// ==================== القسم 8: إدارة التجار ====================

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
        showNotification('✅ تمت الموافقة على التاجر بنجاح', 'success');
        
        if (document.getElementById('dashboardSection')?.style.display === 'block') {
            if (typeof showDashboardMerchants === 'function') showDashboardMerchants();
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
            if (typeof showDashboardMerchants === 'function') showDashboardMerchants();
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

function viewMyProducts() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    if (typeof filterProducts === 'function') {
        window.currentFilter = 'my_products';
        filterProducts('my_products');
    }
}

// ==================== القسم 9: لوحة تحكم المدير ====================

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

function showDashboardMerchants() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    if (pendingMerchants.length === 0) {
        content.innerHTML = `
            <h3 style="color: var(--gold); margin-bottom: 20px;">طلبات التجار</h3>
            <p style="color: var(--text-secondary);">لا توجد طلبات جديدة</p>
            <button class="btn-outline-gold" onclick="showDashboardOverview()">رجوع</button>
        `;
        return;
    }
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">طلبات التجار (${pendingMerchants.length})</h3>
        ${pendingMerchants.map(m => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 10px; padding: 20px; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="color: var(--gold); margin: 0 0 10px 0;">${m.storeName || m.name}</h4>
                        <p><i class="fas fa-user"></i> ${m.name}</p>
                        <p><i class="fas fa-envelope"></i> ${m.email}</p>
                        <p><i class="fas fa-phone"></i> ${m.phone || 'غير متوفر'}</p>
                        <p><i class="fas fa-chart-line"></i> المستوى: ${m.merchantLevel || '1'}</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-gold" onclick="approveMerchant(${m.id})">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                        <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})">
                            <i class="fas fa-times"></i> رفض
                        </button>
                    </div>
                </div>
            </div>
        `).join('')}
        <button class="btn-outline-gold" onclick="showDashboardOverview()" style="margin-top: 20px;">رجوع للخلف</button>
    `;
}

// ==================== القسم 10: دوال إضافية ====================

function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
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
    if (typeof displayProducts === 'function') displayProducts();
}

// ==================== القسم 11: الاستماع لأوامر تلغرام ====================

async function loadProcessedRequestsFromTelegram() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        const processed = {};
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    
                    if (text.includes('✅ *تمت الموافقة*') || 
                        text.includes('❌ *تم الرفض*')) {
                        const match = text.match(/رقم الطلب: (\d+)/);
                        if (match) {
                            processed[`approved_${match[1]}`] = true;
                        }
                    }
                }
            }
        }
        
        return processed;
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المعاملات:', error);
        return {};
    }
}

async function answerCallbackQuery(callbackId, text, showAlert = false) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackId,
                text: text,
                show_alert: showAlert
            })
        });
    } catch (error) {
        console.error('❌ خطأ في الرد على الاستدعاء:', error);
    }
}

async function handleCallbackQuery(callback) {
    const data = callback.data;
    const uniqueId = `${callback.id}_${callback.message?.message_id}_${data}`;
    
    let userId = null;
    if (data.startsWith('approve_')) userId = data.replace('approve_', '');
    if (data.startsWith('reject_')) userId = data.replace('reject_', '');
    
    if (userId && processedRequests[`approved_${userId}`]) {
        await answerCallbackQuery(callback.id, '✅ هذا الطلب تمت معالجته مسبقاً', true);
        return;
    }
    
    if (processedRequests[uniqueId]) {
        await answerCallbackQuery(callback.id, '✅ تمت معالجة هذا الطلب مسبقاً', true);
        return;
    }
    
    processedRequests[uniqueId] = true;
    if (userId) processedRequests[`approved_${userId}`] = true;
    
    if (data.startsWith('approve_')) {
        const userIdNum = parseInt(data.replace('approve_', ''));
        const user = users.find(u => u.id == userIdNum);
        if (user && user.role !== 'merchant_approved') {
            approveMerchant(userIdNum);
            await answerCallbackQuery(callback.id, '✅ تمت الموافقة على التاجر بنجاح');
        }
    }
    
    if (data.startsWith('reject_')) {
        const userIdNum = parseInt(data.replace('reject_', ''));
        const user = users.find(u => u.id == userIdNum);
        if (user && user.status !== 'rejected') {
            rejectMerchant(userIdNum);
            await answerCallbackQuery(callback.id, '❌ تم رفض التاجر');
        }
    }
}

function startTelegramListener() {
    loadProcessedRequestsFromTelegram().then(data => {
        Object.assign(processedRequests, data);
    });
    
    setInterval(async () => {
        try {
            const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`);
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    lastProcessedUpdateId = update.update_id;
                    
                    if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                }
            }
        } catch (error) {
            console.error('❌ خطأ في التحقق من أوامر تلغرام:', error);
        }
    }, 10000);
}

// ==================== القسم 12: تأثيرات الكتابة ====================

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

// ==================== القسم 13: تحديث الواجهة حسب الدور ====================

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
        
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            showDashboardOverview();
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

// ==================== القسم 14: إرسال إشعار عام ====================

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

// ==================== تصدير الدوال ====================

window.TELEGRAM = TELEGRAM;
window.loadUsers = loadUsers;
window.getTelegramFileUrl = getTelegramFileUrl;
window.addProductToTelegram = addProductToTelegram;
window.fetchProductsFromTelegram = fetchProductsFromTelegram;
window.loadProducts = loadProducts;
window.saveProduct = saveProduct;
window.handleImageUpload = handleImageUpload;
window.showAddProductModal = showAddProductModal;
window.findProductById = findProductById;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.switchAuthTab = switchAuthTab;
window.toggleMerchantFields = toggleMerchantFields;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showWelcomePopup = showWelcomePopup;
window.sendMerchantRequestToTelegram = sendMerchantRequestToTelegram;
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.showMerchantPanel = showMerchantPanel;
window.viewMyProducts = viewMyProducts;
window.openDashboard = openDashboard;
window.showDashboardOverview = showDashboardOverview;
window.showDashboardMerchants = showDashboardMerchants;
window.getCategoryName = getCategoryName;
window.getTimeAgo = getTimeAgo;
window.generateStars = generateStars;
window.sortProducts = sortProducts;
window.changeSort = changeSort;
window.startTelegramListener = startTelegramListener;
window.updateUIBasedOnRole = updateUIBasedOnRole;
window.sendNotificationToTelegram = sendNotificationToTelegram;
window.TypingAnimation = TypingAnimation;

console.log('✅ telegram.js - جميع الأقسام الـ 14 جاهزة');
