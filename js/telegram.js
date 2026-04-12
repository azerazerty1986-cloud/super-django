// ===== تلجرام  =====
// ===== تلجرام  =====
//==== [4.1] إعدادات تلغرام الأساسية =====
const TELEGRAM = {
    botToken: '8576673096:AAGvSMjzwVWj6wJ47JdqiDwcObXjBDcyiLA',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [4.2] المتغيرات العامة =====
let products = [];
let currentUser = null;
let currentStore = null;      
let stores = [];              
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let isLoading = false;

// متغيرات التحقق الثنائي (2FA)
let pendingVerificationCode = null;
let verificationCodeExpiry = null;

// ===== [4.3] تحميل البيانات من localStorage =====
function loadUsers() {
    const savedUsers = localStorage.getItem('nardoo_users');
    users = savedUsers ? JSON.parse(savedUsers) : [];
    console.log(`✅ تم تحميل ${users.length} مستخدم`);
}

function loadStores() {
    const savedStores = localStorage.getItem('nardoo_stores');
    if (savedStores) {
        stores = JSON.parse(savedStores);
    } else {
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
    const savedCurrentStore = localStorage.getItem('current_store');
    if (savedCurrentStore) currentStore = JSON.parse(savedCurrentStore);
    else if (stores.length > 0) currentStore = stores[0];
}

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

// ===== [4.4] الإشعارات والدوال المساعدة =====
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;`;
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
        color: ${type === 'success' || type === 'warning' ? 'black' : 'white'};
        padding: 15px 25px; border-radius: 10px; margin-bottom: 10px; font-weight: bold; animation: slideIn 0.3s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.3); min-width: 250px;
    `;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function generateStars(rating) {
    const r = rating || 4.5;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="fas fa-star" style="color: #FFD700;"></i>';
    if (half) html += '<i class="fas fa-star-half-alt" style="color: #FFD700;"></i>';
    for (let i = 0; i < 5 - full - (half ? 1 : 0); i++) html += '<i class="far fa-star" style="color: #FFD700;"></i>';
    return html;
}

function getCategoryName(category) {
    const names = {'promo': 'بروموسيو', 'spices': 'توابل', 'cosmetic': 'كوسمتيك', 'other': 'منتوجات أخرى'};
    return names[category] || 'أخرى';
}

// ===== [4.5] إدارة المنتجات وجلبها من تلغرام =====
async function loadProductsFromTelegramChannel() {
    try {
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
                    id: post.message_id, name: '', price: 1000, category: 'other', stock: 10,
                    storeName: 'متجر ناردو', storeID: 'NARDO-000000', description: caption,
                    images: [], createdAt: new Date(post.date * 1000).toISOString(), rating: 4.5
                };
                for (const line of lines) {
                    if (line.includes('المنتج:')) productData.name = line.split('المنتج:')[1]?.trim();
                    if (line.includes('السعر:')) productData.price = parseInt(line.split('السعر:')[1]?.replace(/[^0-9]/g, '') || 1000);
                    if (line.includes('القسم:')) {
                        const cat = line.split('القسم:')[1]?.trim().toLowerCase();
                        if (cat?.includes('توابل')) productData.category = 'spices';
                        else if (cat?.includes('كوسمتيك')) productData.category = 'cosmetic';
                        else if (cat?.includes('بروموسيو')) productData.category = 'promo';
                    }
                    if (line.includes('الكمية:')) productData.stock = parseInt(line.split('الكمية:')[1]?.replace(/[^0-9]/g, '') || 10);
                    if (line.includes('المتجر:')) productData.storeName = line.split('المتجر:')[1]?.trim();
                }
                if (post.photo && post.photo.length > 0) {
                    const fileId = post.photo[post.photo.length - 1].file_id;
                    const fRes = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
                    const fData = await fRes.json();
                    if (fData.ok) productData.images = [`https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fData.result.file_path}`];
                }
                if (!productData.name) productData.name = `منتج ناردو #${post.message_id}`;
                telegramProducts.push(productData);
            }
            const existing = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
            products = Array.from(new Map([...telegramProducts, ...existing].map(p => [p.id, p])).values());
            localStorage.setItem('nardoo_products', JSON.stringify(products));
            displayProducts();
        }
    } catch (e) { console.error(e); }
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    let filtered = products;
    if (currentFilter === 'my_products' && currentUser) filtered = products.filter(p => p.storeID === (currentUser.storeFixedID || currentUser.storeID));
    else if (currentFilter !== 'all') filtered = products.filter(p => p.category === currentFilter);
    
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    container.innerHTML = filtered.map(product => {
	        const imageUrl = product.images?.[0] || "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
	        const publishDate = new Date(product.createdAt).toLocaleString('ar-DZ', { 
	            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
	        });
	        return `
	            <div class="product-card" style="border: 1px solid #ddd; border-radius: 15px; overflow: hidden; background: var(--bg-secondary); margin-bottom: 20px; transition: transform 0.3s;">
	                <div style="position: relative; height: 200px; overflow: hidden;">
	                    <img src="${imageUrl}" alt="${product.name}" onclick="viewProductDetails(${product.id})" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">
	                    <div style="position: absolute; top: 10px; right: 10px; background: var(--gold); color: black; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">
	                        ${getCategoryName(product.category)}
	                    </div>
	                </div>
	                <div style="padding: 15px;">
	                    <h3 onclick="viewProductDetails(${product.id})" style="margin: 0 0 10px 0; font-size: 18px; color: var(--text-primary); cursor: pointer;">${product.name}</h3>
	                    <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
	                        <p style="margin: 0; font-size: 14px; color: #888;"><i class="fas fa-store"></i> ${product.storeName || 'متجر ناردو'}</p>
	                        <p style="margin: 0; font-size: 12px; color: #666;"><i class="far fa-clock"></i> نُشر في: ${publishDate}</p>
	                    </div>
	                    <div style="margin-bottom: 10px;">${generateStars(product.rating)}</div>
	                    <div style="display: flex; justify-content: space-between; align-items: center;">
	                        <div>
	                            <span style="font-size: 20px; font-weight: bold; color: var(--gold);">${product.price.toLocaleString()} دج</span>
	                            <p style="margin: 0; font-size: 12px; color: #666;">الكمية: ${product.stock} قطعة</p>
	                        </div>
	                        <button onclick="addToCart(${product.id})" style="background: var(--gold); color: black; border: none; padding: 10px 15px; border-radius: 10px; cursor: pointer; font-weight: bold;">
	                            <i class="fas fa-cart-plus"></i> أضف للسلة
	                        </button>
	                    </div>
	                </div>
	            </div>
	        `;
	    }).join('');
}

// ===== [4.6] السلة والطلبات =====
function addToCart(productId) {
    const p = products.find(x => x.id == productId);
    if (!p) return;
    const item = cart.find(x => x.productId == productId);
    if (item) {
        if (item.quantity < p.stock) { item.quantity++; showNotification('تمت زيادة الكمية', 'success'); }
        else showNotification('الكمية محدودة', 'warning');
    } else {
        cart.push({ productId: p.id, name: p.name, price: p.price, quantity: 1, image: p.images?.[0], storeName: p.storeName });
        showNotification('تمت الإضافة للسلة', 'success');
    }
    saveCart(); updateCartCounter();
}

async function checkoutCart() {
    if (cart.length === 0) return showNotification('السلة فارغة', 'warning');
    if (!currentUser) return (showNotification('سجل دخولك أولاً', 'warning'), openLoginModal());
    const phone = prompt('رقم الهاتف:', currentUser.phone || '');
    if (!phone) return;
    const addr = prompt('العنوان:', '');
    if (!addr) return;
    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const msg = `🟢 *طلب جديد*\n👤 ${currentUser.name}\n📞 ${phone}\n📍 ${addr}\n📦 المنتجات:\n${cart.map(i => `• ${i.name} x${i.quantity}`).join('\n')}\n💰 الإجمالي: ${(sub + 800).toLocaleString()} دج`;
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: msg, parse_mode: 'Markdown' }) });
    cart = []; saveCart(); updateCartCounter(); showNotification('تم إرسال الطلب بنجاح', 'success');
}

// ===== [4.7] إدارة المتاجر والمعرفات الثابتة (مستعادة بالكامل) =====
function generateStoreID(storeName, phoneNumber = null) {
    let cleanName = storeName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '') || 'متجر';
    let namePart = cleanName.substring(0, 6).toUpperCase();
    let fixedNumber = phoneNumber && phoneNumber.length >= 4 ? phoneNumber.replace(/[^0-9]/g, '').slice(-6) : Math.floor(Math.random() * 900000 + 100000).toString();
    return `${namePart}-${fixedNumber}`;
}

function getOrCreateStoreID(store) {
    if (store.storeFixedID) return store.storeFixedID;
    const storeID = generateStoreID(store.storeName || store.name || 'متجر ناردو', store.phone || '');
    store.storeFixedID = storeID;
    const allStores = JSON.parse(localStorage.getItem('nardoo_stores') || '[]');
    const idx = allStores.findIndex(s => s.id === store.id);
    if (idx !== -1) {
        allStores[idx].storeFixedID = storeID;
        localStorage.setItem('nardoo_stores', JSON.stringify(allStores));
    }
    return storeID;
}

// ===== [4.8] نظام المصادقة و 2FA (مستعاد بالكامل) =====
async function sendVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingVerificationCode = code;
    verificationCodeExpiry = Date.now() + 300000;
    const message = `🔐 رمز التحقق الخاص بك: \`${code}\``;
    try {
        const res = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM.channelId, text: message, parse_mode: 'Markdown' }) });
        if ((await res.json()).ok) {
            showNotification('✅ تم إرسال الرمز', 'success');
            closeModal('loginModal');
            document.getElementById('verify2FAModal').style.display = 'flex';
        }
    } catch (e) { showNotification('❌ خطأ في الاتصال', 'error'); }
}

async function verify2FACode() {
    const entered = document.getElementById('verificationCode')?.value;
    if (entered === pendingVerificationCode && Date.now() <= verificationCodeExpiry) {
        let admin = users.find(u => u.role === 'admin') || { id: Date.now(), name: 'مدير النظام', role: 'admin', email: 'admin@nardoo.com' };
        if (!users.find(u => u.role === 'admin')) users.push(admin);
        currentUser = admin;
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        localStorage.setItem('current_user', JSON.stringify(admin));
        location.reload();
    } else { showNotification('❌ رمز غير صحيح', 'error'); }
}

function updateUIBasedOnRole() {
    if (!currentUser) return;
    const userBtn = document.getElementById('userBtn');
    if (userBtn) userBtn.innerHTML = currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' : (currentUser.role.includes('store') ? '<i class="fas fa-store"></i>' : '<i class="fas fa-user"></i>');
    const dashBtn = document.getElementById('dashboardBtn');
    if (dashBtn) dashBtn.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
}

// ===== [4.9] معالجة تسجيل الدخول والتسجيل =====
async function handleUserLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPassword')?.value;
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        location.reload();
    } else { showNotification('❌ بيانات خاطئة', 'error'); }
}

async function handleStoreRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const pass = document.getElementById('regPassword')?.value;
    const storeName = document.getElementById('storeName')?.value;
    const newUser = { id: Date.now(), name, email, password: pass, role: 'store_owner', storeName: storeName || `متجر ${name}`, createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    showNotification('✅ تم التسجيل بنجاح', 'success');
    closeModal('loginModal');
}

// ===== [4.10] تفاصيل المنتج وشريط التعليقات =====
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    if (!modal || !content) return;
    const imageUrl = product.images?.[0] || "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
	    const publishDate = new Date(product.createdAt).toLocaleString('ar-DZ', { 
	        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
	    });
	    content.innerHTML = `
	        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 30px; padding: 20px; background: var(--bg-primary); border-radius: 20px;">
	            <div style="height: 400px; border-radius: 15px; overflow: hidden;"><img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>
	            <div style="display: flex; flex-direction: column; gap: 15px;">
	                <h2 style="color: var(--gold); margin: 0;">${product.name}</h2>
	                <div style="display: flex; flex-direction: column; gap: 5px;">
	                    <p style="margin: 0; color: #888;">🏪 المتجر: <strong>${product.storeName}</strong></p>
	                    <p style="margin: 0; font-size: 12px; color: #666;"><i class="far fa-clock"></i> نُشر في: ${publishDate}</p>
	                </div>
	                <div style="font-size: 24px; font-weight: bold; color: var(--gold);">${product.price.toLocaleString()} دج</div>
	                <div style="color: #bbb;">${product.description || 'وصف المنتج...'}</div>
	                <div style="border-top: 1px solid #333; padding-top: 15px;">
	                    <h4 style="color: var(--gold);">💬 التعليقات</h4>
	                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; font-size: 13px; color: #aaa;">لا توجد تعليقات بعد.</div>
	                </div>
	                <div style="display: flex; gap: 15px; margin-top: auto;">
	                    <button onclick="addToCart(${product.id}); closeModal('productDetailModal')" style="flex: 1; background: var(--gold); color: black; border: none; padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer;">أضف للسلة</button>
	                    <button onclick="closeModal('productDetailModal')" style="flex: 0.5; background: transparent; border: 1px solid #555; color: white; padding: 15px; border-radius: 12px; cursor: pointer;">إغلاق</button>
	                </div>
	            </div>
	        </div>
	    `;
    modal.style.display = 'flex';
}

// ===== [4.11] أنيميشن الكتابة والتهيئة =====
class TypingAnimation {
    constructor(el, texts, speed, delay) { this.el = el; this.texts = texts; this.speed = speed; this.delay = delay; this.idx = 0; this.text = ''; this.isDeleting = false; }
    start() { this.type(); }
    type() {
        const full = this.texts[this.idx];
        this.text = this.isDeleting ? full.substring(0, this.text.length - 1) : full.substring(0, this.text.length + 1);
        if (this.el) this.el.innerHTML = this.text + '<span class="cursor">|</span>';
        let delta = this.isDeleting ? this.speed/2 : this.speed;
        if (!this.isDeleting && this.text === full) { delta = this.delay; this.isDeleting = true; }
        else if (this.isDeleting && this.text === '') { this.isDeleting = false; this.idx = (this.idx + 1) % this.texts.length; delta = 500; }
        setTimeout(() => this.type(), delta);
    }
}

window.onload = () => {
    loadUsers(); loadStores(); loadCart();
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) { currentUser = JSON.parse(savedUser); updateUIBasedOnRole(); }
    loadProductsFromTelegramChannel();
    const typing = document.getElementById('typing-text');
    if (typing) new TypingAnimation(typing, ['نكهة وجمال', 'ناردو برو', 'تسوق آمن'], 100, 2000).start();
};

// تصدير الدوال للنطاق العام
Object.assign(window, {
    displayProducts, viewProductDetails, addToCart, checkoutCart, loadProductsFromTelegramChannel,
    handleUserLogin, handleStoreRegister, sendVerificationCode, verify2FACode,
    closeModal: (id) => document.getElementById(id).style.display = 'none',
    openLoginModal: () => document.getElementById('loginModal').style.display = 'flex',
    filterProducts: (c) => { currentFilter = c; displayProducts(); },
    searchProducts: (v) => { searchTerm = v; displayProducts(); }
});
