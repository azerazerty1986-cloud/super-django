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

// ===== [4.3] الخطوة 1: إرسال المدير إلى القناة =====
async function sendAdminToChannel() {
    const adminMessage = `#admin_registration 👑 *تسجيل مدير النظام*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *المعرف:* 19862
👤 *الاسم:* azer
📧 *البريد:* azer@admin.com
🔑 *كلمة السر:* 19862
👑 *الدور:* مدير
📅 *تاريخ التسجيل:* ${new Date().toLocaleString('ar-EG')}

✅ *حالة الحساب:* معتمد`;

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
            console.log('✅ الخطوة 1: تم إرسال المدير إلى القناة');
            return { success: true, messageId: data.result.message_id };
        } else {
            console.error('❌ فشل إرسال المدير:', data.description);
            return { success: false, error: data.description };
        }
    } catch (error) {
        console.error('❌ خطأ:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.4] الخطوة 2: جلب المدير من القناة =====
async function fetchAdminFromChannel() {
    try {
        console.log('🔄 الخطوة 2: جلب رسالة المدير من القناة...');
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=50`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                const message = update.channel_post || update.message;
                if (!message) continue;
                
                const text = message.caption || message.text || '';
                
                if (text.includes('#admin_registration') && text.includes('19862')) {
                    console.log('✅ تم العثور على رسالة المدير');
                    
                    // استخراج البيانات من الرسالة
                    const nameMatch = text.match(/الاسم:\s*([^\n]+)/);
                    const emailMatch = text.match(/البريد:\s*([^\n]+)/);
                    const passMatch = text.match(/كلمة السر:\s*([^\n]+)/);
                    
                    const admin = {
                        id: 19862,
                        name: nameMatch ? nameMatch[1].replace(/[*_]/g, '').trim() : 'azer',
                        email: emailMatch ? emailMatch[1].replace(/[*_]/g, '').trim() : 'azer@admin.com',
                        password: passMatch ? passMatch[1].replace(/[*_]/g, '').trim() : '19862',
                        role: 'admin'
                    };
                    
                    console.log('📝 تم استخراج البيانات:', { name: admin.name, email: admin.email });
                    return admin;
                }
            }
        }
        
        console.log('⚠️ لم يتم العثور على رسالة المدير');
        return null;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المدير:', error);
        return null;
    }
}

// ===== [4.5] تحميل المستخدمين =====
function loadLocalUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
        console.log(`📦 تم تحميل ${users.length} مستخدم`);
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

// ===== [4.6] الخطوة 3: تسجيل الدخول مع التحقق من القناة =====
async function loginUser(email, password) {
    console.log('🔐 محاولة تسجيل الدخول:', email);
    
    // الخطوة 2: جلب المدير من القناة
    const adminFromChannel = await fetchAdminFromChannel();
    
    // مقارنة البيانات
    if (adminFromChannel && 
        (email === adminFromChannel.email || email === adminFromChannel.name) && 
        password === adminFromChannel.password) {
        
        console.log('✅ الخطوة 3: تسجيل الدخول ناجح - مدير');
        currentUser = adminFromChannel;
        adminData = adminFromChannel;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        localStorage.setItem('admin_data', JSON.stringify(adminData));
        updateUIBasedOnRole();
        showWelcomePopup(currentUser);
        showNotification(`👑 مرحباً أيها المدير ${currentUser.name}`, 'success');
        closeModal('loginModal');
        return true;
    }
    
    // التحقق من المستخدمين العاديين
    const localUser = users.find(u => (u.email === email || u.name === email) && u.password === password);
    
    if (localUser) {
        if (localUser.role === 'merchant_pending') {
            showNotification('⏳ حسابك قيد المراجعة', 'warning');
            return false;
        }
        
        console.log('✅ تسجيل الدخول ناجح - مستخدم عادي');
        currentUser = localUser;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        updateUIBasedOnRole();
        showWelcomePopup(currentUser);
        showNotification(`مرحباً ${localUser.name}`, 'success');
        closeModal('loginModal');
        return true;
    }
    
    showNotification('❌ البريد أو كلمة السر غير صحيحة', 'error');
    return false;
}

// ===== [4.7] تسجيل مستخدم جديد =====
async function registerLocalUser(userData) {
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
        showNotification('البريد مستخدم بالفعل', 'error');
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

// ===== [4.8] تسجيل خروج =====
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('current_user');
    updateUIBasedOnRole();
    showNotification('👋 تم تسجيل الخروج', 'info');
    currentFilter = 'all';
    displayProducts();
}

// ===== [4.9] السلة =====
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

// ===== [4.10] الإشعارات =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;`;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
    toast.style.cssText = `background:${colors[type]};color:black;padding:15px 25px;border-radius:10px;font-weight:bold;animation:slideIn 0.3s ease;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:250px;`;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== [4.11] دوال المساعدة =====
function getCategoryName(category) {
    const names = { 'promo': 'بروموسيو', 'spices': 'توابل', 'cosmetic': 'كوسمتيك', 'other': 'منتوجات أخرى' };
    return names[category] || 'أخرى';
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return 'منذ وقت';
}

function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '<i class="fas fa-star" style="color:var(--gold);"></i>';
    if (half) stars += '<i class="fas fa-star-half-alt" style="color:var(--gold);"></i>';
    for (let i = 0; i < 5 - full - (half ? 1 : 0); i++) stars += '<i class="far fa-star" style="color:var(--gold);"></i>';
    return stars;
}

function sortProducts(arr) {
    switch(sortBy) {
        case 'newest': return [...arr].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
        case 'price_low': return [...arr].sort((a,b) => a.price - b.price);
        case 'price_high': return [...arr].sort((a,b) => b.price - a.price);
        default: return arr;
    }
}

function changeSort(value) { sortBy = value; displayProducts(); }

// ===== [4.12] إضافة منتج =====
async function addProductToTelegram(product, imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        formData.append('caption', `🟣 *منتج جديد*\n━━━━━━━━━━━━━━━━━━━━━━\n📦 *المنتج:* ${product.name}\n💰 *السعر:* ${product.price} دج\n🏷️ *القسم:* ${product.category}\n📊 *الكمية:* ${product.stock}\n👤 *الناشر:* ${product.merchantName}\n📝 *الوصف:* ${product.description || 'منتج ممتاز'}\n📅 ${new Date().toLocaleString('ar-EG')}`);

        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendPhoto`, { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.ok) {
            showNotification('✅ تم إرسال المنتج', 'success');
            return { success: true };
        }
        showNotification('❌ فشل الإرسال', 'error');
        return { success: false };
    } catch (error) {
        showNotification('❌ خطأ', 'error');
        return { success: false };
    }
}

async function saveProduct() {
    if (!currentUser) return showNotification('يجب تسجيل الدخول', 'warning');
    if (currentUser.role !== 'admin' && currentUser.role !== 'merchant_approved') return showNotification('غير مصرح', 'error');
    
    const name = document.getElementById('productName')?.value.trim();
    const price = parseInt(document.getElementById('productPrice')?.value);
    const stock = parseInt(document.getElementById('productStock')?.value);
    const imageFile = document.getElementById('productImages')?.files[0];
    
    if (!name) return showNotification('أدخل اسم المنتج', 'error');
    if (!price || price <= 0) return showNotification('أدخل سعر صحيح', 'error');
    if (!stock || stock <= 0) return showNotification('أدخل كمية', 'error');
    if (!imageFile) return showNotification('اختر صورة', 'error');
    
    const product = { name, price, category: document.getElementById('productCategory')?.value, stock, merchantName: currentUser.storeName || currentUser.name, description: document.getElementById('productDescription')?.value || '' };
    
    const result = await addProductToTelegram(product, imageFile);
    if (result.success) {
        closeModal('productModal');
        await loadProducts();
    }
}

// ===== [4.13] جلب المنتجات =====
async function fetchProductsFromTelegram() {
    if (isLoading) return products;
    isLoading = true;
    try {
        const saved = localStorage.getItem('nardoo_products');
        if (saved) { products = JSON.parse(saved); displayProducts(); }
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`);
        const data = await response.json();
        const newProducts = [];
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                const post = update.channel_post;
                if (!post || !post.photo) continue;
                const caption = post.caption || '';
                if (!caption.includes('🟣')) continue;
                
                const lines = caption.split('\n');
                let name = 'منتج', price = 0, category = 'promo', stock = 0, merchant = 'المتجر';
                for (const line of lines) {
                    if (line.includes('المنتج:')) name = line.replace('المنتج:', '').replace(/[*🟣]/g, '').trim();
                    if (line.includes('السعر:')) { const m = line.match(/\d+/); if (m) price = parseInt(m[0]); }
                    if (line.includes('الكمية:')) { const m = line.match(/\d+/); if (m) stock = parseInt(m[0]); }
                    if (line.includes('الناشر:')) merchant = line.replace('الناشر:', '').trim();
                }
                
                const fileId = post.photo[post.photo.length-1].file_id;
                const fileRes = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    newProducts.push({ id: post.message_id, name, price, category, stock, merchantName: merchant, rating: 4.5, image: `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`, createdAt: new Date(post.date*1000).toISOString() });
                }
            }
        }
        
        for (const p of newProducts) if (!products.some(ex => ex.id === p.id)) products.push(p);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        displayProducts();
        return products;
    } catch(e) { console.error(e); return products; }
    finally { isLoading = false; }
}

async function loadProducts() { await fetchProductsFromTelegram(); }

// ===== [4.14] عرض المنتجات =====
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    let filtered = products.filter(p => p.stock > 0);
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') filtered = filtered.filter(p => p.merchantName === currentUser.storeName);
    else if (currentFilter !== 'all') filtered = filtered.filter(p => p.category === currentFilter);
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered = sortProducts(filtered);
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px"><i class="fas fa-box-open" style="font-size:80px;color:var(--gold)"></i><h3>لا توجد منتجات</h3></div>`;
        return;
    }
    
    container.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="viewProductDetails(${p.id})">
            <img src="${p.image}" style="width:100%;height:250px;object-fit:cover">
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-price">${p.price.toLocaleString()} دج</div>
                <button class="add-to-cart" onclick="event.stopPropagation();addToCart(${p.id})">🛒 أضف للسلة</button>
            </div>
        </div>
    `).join('');
}

function filterProducts(category) { currentFilter = category; displayProducts(); }
function searchProducts() { searchTerm = document.getElementById('searchInput')?.value || ''; displayProducts(); }

// ===== [4.15] عمليات السلة =====
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) return showNotification('غير متوفر', 'error');
    const existing = cart.find(i => i.productId == productId);
    if (existing) existing.quantity++;
    else cart.push({ productId, name: product.name, price: product.price, quantity: 1 });
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإضافة', 'success');
}

function toggleCart() { document.getElementById('cartSidebar')?.classList.toggle('open'); updateCartDisplay(); }
function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!itemsDiv) return;
    if (cart.length === 0) { itemsDiv.innerHTML = '<div style="text-align:center;padding:40px">السلة فارغة</div>'; if(totalSpan) totalSpan.textContent = '0 دج'; return; }
    let total = 0;
    itemsDiv.innerHTML = cart.map(i => { total += i.price * i.quantity; return `<div>${i.name} x${i.quantity} = ${(i.price*i.quantity).toLocaleString()} دج <button onclick="removeFromCart(${i.productId})">🗑️</button></div>`; }).join('');
    if(totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}
function removeFromCart(id) { cart = cart.filter(i => i.productId != id); saveCart(); updateCartCounter(); updateCartDisplay(); showNotification('تمت الإزالة', 'info'); }

// ===== [4.16] إتمام الشراء =====
async function checkoutCart() {
    if (cart.length === 0) return showNotification('السلة فارغة', 'warning');
    if (!currentUser) return openLoginModal();
    const total = cart.reduce((s,i)=>s+(i.price*i.quantity),0);
    const orderId = `ORD-${Date.now()}`;
    const message = `🛒 *طلب جديد*\n📋 رقم: ${orderId}\n👤 العميل: ${currentUser.name}\n💰 الإجمالي: ${total.toLocaleString()} دج\n📦 المنتجات:\n${cart.map(i=>`• ${i.name} x${i.quantity}`).join('\n')}`;
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode:'Markdown' }) });
    cart = []; saveCart(); updateCartCounter(); toggleCart();
    showNotification(`✅ تم إرسال طلبك ${orderId}`, 'success');
}

// ===== [4.17] عرض تفاصيل المنتج =====
function viewProductDetails(id) {
    const p = products.find(p=>p.id==id);
    if(!p) return;
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    if(!modal||!content) return;
    content.innerHTML = `<div><h2>${p.name}</h2><img src="${p.image}" style="width:100%"><p>السعر: ${p.price.toLocaleString()} دج</p><button onclick="addToCart(${p.id});closeModal('productDetailModal')">➕ أضف للسلة</button><button onclick="closeModal('productDetailModal')">إغلاق</button></div>`;
    modal.style.display = 'flex';
}

// ===== [4.18] إدارة المستخدمين =====
function openLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}
function toggleMerchantFields() { document.getElementById('merchantFields').style.display = document.getElementById('isMerchant')?.checked ? 'block' : 'none'; }
function handleLogin() { loginUser(document.getElementById('loginEmail')?.value, document.getElementById('loginPassword')?.value); }
async function handleRegister() {
    const data = { name: document.getElementById('regName')?.value, email: document.getElementById('regEmail')?.value, password: document.getElementById('regPassword')?.value, phone: document.getElementById('regPhone')?.value || '', isMerchant: document.getElementById('isMerchant')?.checked };
    if(!data.name||!data.email||!data.password) return showNotification('املأ الحقول', 'error');
    if(data.isMerchant) { data.storeName = document.getElementById('storeName')?.value; data.merchantLevel = document.getElementById('merchantLevel')?.value; }
    await registerLocalUser(data);
    switchAuthTab('login');
}

// ===== [4.19] تحديث الواجهة =====
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
    
    if (userBtn) {
        if (currentUser.role === 'admin') userBtn.innerHTML = '<i class="fas fa-crown" style="color:#ffd700"></i><span>المدير</span>';
        else if (currentUser.role === 'merchant_approved') userBtn.innerHTML = '<i class="fas fa-store" style="color:#ffd700"></i><span>التاجر</span>';
        else userBtn.innerHTML = '<i class="fas fa-user"></i><span>حسابي</span>';
    }
    
    if (currentUser.role === 'admin') {
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        document.getElementById('dashboardSection').style.display = 'block';
        showDashboardOverview();
    }
    if (currentUser.role === 'merchant_approved') {
        if (merchantPanel) merchantPanel.style.display = 'block';
        showMerchantPanel();
    }
}

function showMerchantPanel() {
    const merchantProducts = products.filter(p => p.merchantName === currentUser?.storeName);
    const panel = document.getElementById('merchantPanelContainer');
    if(!panel) return;
    panel.innerHTML = `<div style="background:var(--glass);border:2px solid var(--gold);border-radius:20px;padding:30px;margin:20px 0"><h2>🏪 ${currentUser.storeName}</h2><div>المنتجات: ${merchantProducts.length}</div><button class="btn-gold" onclick="showAddProductModal()">➕ إضافة منتج</button></div>`;
}

function showAddProductModal() { if(currentUser && (currentUser.role==='admin'||currentUser.role==='merchant_approved')) document.getElementById('productModal').style.display='flex'; else showNotification('غير مصرح','error'); }

// ===== [4.20] لوحة المدير =====
function openDashboard() { if(currentUser?.role==='admin') document.getElementById('dashboardSection').style.display='block'; showDashboardOverview(); }
function showDashboardOverview() { document.getElementById('dashboardContent').innerHTML = `<h3>📊 نظرة عامة</h3><div>المنتجات: ${products.length}</div><div>المستخدمين: ${users.length}</div><div>التجار: ${users.filter(u=>u.role==='merchant_approved').length}</div><button onclick="showDashboardMerchants()">📋 طلبات التجار</button>`; }
function showDashboardMerchants() { const pending = users.filter(u=>u.role==='merchant_pending'); document.getElementById('dashboardContent').innerHTML = `<h3>طلبات التجار</h3>${pending.map(m=>`<div><h4>${m.storeName}</h4><button onclick="approveMerchant(${m.id})">✅ موافقة</button><button onclick="rejectMerchant(${m.id})">❌ رفض</button></div>`).join('')}<button onclick="showDashboardOverview()">رجوع</button>`; }
function approveMerchant(id) { const u = users.find(u=>u.id==id); if(u) { u.role='merchant_approved'; localStorage.setItem('nardoo_users',JSON.stringify(users)); showNotification('✅ تمت الموافقة','success'); showDashboardMerchants(); sendTelegramMessage(`✅ تمت الموافقة على تاجر: ${u.name}`); } }
function rejectMerchant(id) { const u = users.find(u=>u.id==id); if(u) { u.role='customer'; localStorage.setItem('nardoo_users',JSON.stringify(users)); showNotification('❌ تم الرفض','info'); showDashboardMerchants(); sendTelegramMessage(`❌ تم رفض تاجر: ${u.name}`); } }

// ===== [4.21] إرسال الطلبات =====
async function sendMerchantRequestToTelegram(merchant) {
    const message = `🔵 *طلب انضمام تاجر جديد*\n━━━━━━━━━━━━━━━━━━━━━━\n🆔 رقم: ${merchant.id}\n🏪 المتجر: ${merchant.storeName}\n👤 التاجر: ${merchant.name}\n📧 البريد: ${merchant.email}`;
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode:'Markdown' }) });
}
async function sendTelegramMessage(msg) { try{ await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id: TELEGRAM.channelId, text: msg, parse_mode:'Markdown' }) }); } catch(e){} }

// ===== [4.22] دوال إضافية =====
function findProductById() { const id = prompt('أدخل المعرف'); if(id) { const p = products.find(p=>p.id==id); if(p) viewProductDetails(p.id); else alert('غير موجود'); } }
function scrollToTop() { window.scrollTo({top:0,behavior:'smooth'}); }
function scrollToBottom() { window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'}); }
function toggleTheme() { isDarkMode = !isDarkMode; document.body.classList.toggle('light-mode',!isDarkMode); localStorage.setItem('theme',isDarkMode?'dark':'light'); }
function showWelcomePopup(user) { alert(`مرحباً ${user.name}!`); }

// ===== [4.23] التهيئة النهائية - تطبيق الفكرة =====
window.onload = async function() {
    console.log('🚀 بدء التهيئة...');
    
    // الخطوة 1: إرسال المدير إلى القناة
    await sendAdminToChannel();
    
    // تحميل البيانات
    loadLocalUsers();
    
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) { products = JSON.parse(savedProducts); displayProducts(); }
    
    await loadProducts();
    loadCart();
    
    // استعادة الجلسة
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const localUser = users.find(u => u.id === parsed.id);
        if (localUser) {
            currentUser = localUser;
            updateUIBasedOnRole();
        }
    }
    
    // استعادة الثيم
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { isDarkMode = savedTheme === 'dark'; document.body.classList.toggle('light-mode',!isDarkMode); }
    
    setTimeout(() => { const loader = document.getElementById('loader'); if(loader) loader.style.display = 'none'; }, 1000);
    
    console.log('✅ النظام جاهز - يمكن تسجيل الدخول كمدير: azer / 19862');
};

window.onclick = function(e) { if(e.target.classList?.contains('modal')) e.target.style.display = 'none'; };

// ===== [4.24] تصدير الدوال =====
window.saveProduct = saveProduct;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
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

console.log('✅ نظام تلغرام المتكامل جاهز (55 نقطة)');
console.log('👑 تسجيل الدخول: azer / 19862');
console.log('📡 تم تطبيق فكرة: إرسال ← جلب ← مقارنة ← نجاح');
