/* ================================================================== */
/* ===== [05] الملف: 05-app.js - التطبيق الرئيسي ===== */
/* ================================================================== */

// ===== [5.1] التطبيق الرئيسي =====
const App = {
    // التهيئة
    async init() {
        console.log('🚀 بدء تشغيل ناردو برو...');
        
        // تهيئة الأنظمة
        Auth.init();
        Cart.init();
        await Shop.loadProducts();
        
        // تحديث واجهة المستخدم
        Auth.updateUI();
        
        // تأثيرات
        this.startTypingEffect();
        this.startClock();
        this.setupEventListeners();
        
        // إخفاء شاشة التحميل
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 1000);
        
        console.log('✅ تم التشغيل بنجاح');
    },
    
    // إعداد مستمعي الأحداث
    setupEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('click', this.handleClick.bind(this));
    },
    
    // معالجة التمرير
    handleScroll() {
        const btn = document.getElementById('quickTopBtn');
        if (btn) {
            btn.classList.toggle('show', window.scrollY > 300);
        }
    },
    
    // معالجة النقر
    handleClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    },
    
    // ===== دوال المستخدم =====
    openLoginModal() {
        Utils.openModal('loginModal');
    },
    
    closeModal(modalId) {
        Utils.closeModal(modalId);
    },
    
    switchAuthTab(tab) {
        document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    },
    
    toggleRoleFields() {
        const fields = document.getElementById('roleFields');
        if (fields) {
            fields.style.display = document.getElementById('requestRole').checked ? 'block' : 'none';
        }
    },
    
    handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = Auth.login(email, password);
        
        if (result.success) {
            this.closeModal('loginModal');
            Auth.updateUI();
            Utils.showNotification(`مرحباً ${result.user.name}`);
            setTimeout(() => location.reload(), 500);
        } else {
            Utils.showNotification(result.message, 'error');
        }
    },
    
    handleRegister() {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const phone = document.getElementById('regPhone').value;
        const requestRole = document.getElementById('requestRole').checked;
        
        if (!name || !email || !password) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }
        
        const userData = { name, email, password, phone };
        const result = Auth.register(userData);
        
        if (result.success) {
            if (requestRole) {
                const role = document.getElementById('requestedRole').value;
                const roleData = {
                    storeName: document.getElementById('storeName')?.value || '',
                    specialization: document.getElementById('specialization')?.value || '',
                    workArea: document.getElementById('workArea')?.value || ''
                };
                
                Auth.submitRoleRequest(result.user.userId, role, roleData);
                Utils.showNotification('تم التسجيل وطلب الدور', 'info');
            } else {
                Utils.showNotification('✅ تم التسجيل بنجاح', 'success');
            }
            
            this.switchAuthTab('login');
            document.getElementById('registerForm')?.reset();
        } else {
            Utils.showNotification(result.message, 'error');
        }
    },
    
    // ===== دوال المنتجات =====
    filterProducts(category) {
        Shop.filter(category);
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        event.target.classList.add('active');
    },
    
    searchProducts() {
        const term = document.getElementById('searchInput').value;
        Shop.search(term);
    },
    
    showProductDetail(productId) {
        const product = Shop.getProduct(productId);
        if (!product) return;
        
        const images = product.images?.length ? product.images : [CONFIG.defaultImage];
        
        document.getElementById('productDetailContent').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px;">
                <div>
                    <img src="${images[0]}" style="width:100%; border-radius:20px; border:3px solid var(--gold);">
                </div>
                <div>
                    <h2 style="color:var(--gold); font-size:28px;">${product.name}</h2>
                    <p style="margin:20px 0;">${product.description || 'منتج عالي الجودة'}</p>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; margin-bottom:20px;">
                        <p><i class="fas fa-store"></i> ${product.merchantName}</p>
                        <p style="color:var(--gold-light);">🆔 ${product.merchantId}</p>
                        <p>🆔 ${product.id}</p>
                    </div>
                    <div style="font-size:36px; color:var(--gold); font-weight:800; margin-bottom:20px;">
                        ${product.price.toLocaleString()} <small style="font-size:16px;">دج</small>
                    </div>
                    <div class="product-stock ${Shop.getStockClass(product.stock)}" style="margin-bottom:20px;">
                        ${Shop.getStockText(product.stock)}
                    </div>
                    <div style="display:flex; gap:15px;">
                        <button class="btn-gold" style="flex:2;" onclick="App.addToCart('${product.id}'); App.closeModal('productDetailModal');">
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="btn-outline-gold" style="flex:1;" onclick="App.closeModal('productDetailModal')">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        Utils.openModal('productDetailModal');
    },
    
    openAddProductModal() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (Auth.currentUser.role === 'admin' || Auth.currentUser.role === 'merchant') {
            Utils.openModal('productModal');
        } else {
            Utils.showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
        }
    },
    
    handleImageUpload(event) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        for (let file of event.target.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `<img src="${e.target.result}" class="preview-image">`;
            };
            reader.readAsDataURL(file);
        }
    },
    
    async saveProduct() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            return;
        }
        
        const product = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: parseInt(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value
        };
        
        if (!product.name || !product.price || !product.stock) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }
        
        // إنشاء معرف للمنتج
        const productId = IDSystem.generateProductId(Auth.currentUser.merchantId || 'ADMIN_001');
        
        const newProduct = {
            id: productId,
            productId: productId,
            ...product,
            merchantId: Auth.currentUser.merchantId || 'ADMIN_001',
            merchantName: Auth.currentUser.name,
            images: [CONFIG.defaultImage],
            rating: 4.5,
            createdAt: new Date().toISOString(),
            dateStr: 'الآن'
        };
        
        // إضافة للمنتجات
        Shop.products.push(newProduct);
        Shop.saveProducts();
        
        // إرسال لتلغرام
        if (window.Telegram) {
            await Telegram.addProduct(newProduct, Auth.currentUser);
        }
        
        // إضافة للمستودع
        if (window.Inventory && Auth.currentUser.role === 'merchant') {
            Inventory.addProduct(Auth.currentUser.merchantId, newProduct);
        }
        
        Utils.showNotification('✅ تم إضافة المنتج');
        this.closeModal('productModal');
        Shop.displayProducts();
    },
    
    // ===== [إضافة] دوال إضافة المنتج للأيقونة =====
    
    // فتح نموذج إضافة منتج (للأيقونة)
    openAddProductForm() {
        Utils.openModal('addProductModal');
    },
    
    // إغلاق نموذج إضافة منتج (للأيقونة)
    closeAddProductForm() {
        Utils.closeModal('addProductModal');
    },
    
    // رفع الصور للنموذج الجديد
    handleNewImageUpload(event) {
        const preview = document.getElementById('newImagePreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        for (let file of event.target.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `<img src="${e.target.result}" class="preview-image">`;
            };
            reader.readAsDataURL(file);
        }
    },
    
    // حفظ المنتج الجديد (للأيقونة)
    saveNewProduct() {
        // التحقق من تسجيل الدخول
        if (!Auth.currentUser) {
            Utils.showNotification('❌ يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        // الأدوار المسموح لها بإضافة منتجات
        const allowedRoles = ['admin', 'merchant', 'distributor', 'content_creator'];
        if (!allowedRoles.includes(Auth.currentUser.role)) {
            Utils.showNotification('❌ غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        // التحقق من الحقول
        const name = document.getElementById('newProductName')?.value;
        const category = document.getElementById('newProductCategory')?.value;
        const price = parseInt(document.getElementById('newProductPrice')?.value);
        const stock = parseInt(document.getElementById('newProductStock')?.value);
        const description = document.getElementById('newProductDescription')?.value;
        
        if (!name || !category || !price || !stock) {
            Utils.showNotification('❌ الرجاء ملء جميع الحقول', 'error');
            return;
        }
        
        // إنشاء المنتج الجديد
        const product = {
            id: Date.now(),
            name: name,
            category: category,
            price: price,
            stock: stock,
            description: description || '',
            image: CONFIG.defaultImage,
            merchantId: Auth.currentUser.merchantId || Auth.currentUser.userId || 'USER',
            merchantName: Auth.currentUser.name,
            createdAt: new Date().toISOString()
        };
        
        // إضافة للمنتجات
        if (!window.products) window.products = [];
        window.products.push(product);
        Utils.save('products', window.products);
        
        // إضافة لـ Shop إذا كان موجوداً
        if (Shop && Shop.products) {
            Shop.products.push(product);
            Shop.saveProducts();
            Shop.displayProducts();
        } else {
            this.displayProducts(window.products);
        }
        
        Utils.showNotification('✅ تم إضافة المنتج');
        this.closeAddProductForm();
    },
    
    // عرض المنتجات (دالة مساعدة)
    displayProducts(products) {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = products.map(p => `
            <div class="product-card" onclick="App.showProductDetail(${p.id})">
                <div class="product-gallery">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price} دج</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); App.addToCart(${p.id})">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    // ===== دوال السلة =====
    addToCart(productId) {
        Cart.add(productId);
    },
    
    toggleCart() {
        document.getElementById('cartSidebar').classList.toggle('open');
        Cart.display();
    },
    
    updateCartItem(productId, newQuantity) {
        Cart.update(productId, newQuantity);
    },
    
    removeFromCart(productId) {
        Cart.remove(productId);
    },
    
    checkout() {
        Cart.checkout();
    },
    
    // ===== دوال المدير =====
    openDashboard() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح', 'error');
            return;
        }
        document.getElementById('dashboardSection').style.display = 'block';
        this.switchDashboardTab('overview');
    },
    
    switchDashboardTab(tab) {
        document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        const content = document.getElementById('dashboardContent');
        
        if (tab === 'overview') {
            content.innerHTML = this.getOverviewHTML();
        } else if (tab === 'users') {
            content.innerHTML = this.getUsersHTML();
        } else if (tab === 'merchants') {
            content.innerHTML = this.getMerchantsHTML();
        } else if (tab === 'requests') {
            content.innerHTML = this.getRequestsHTML();
        } else if (tab === 'products') {
            content.innerHTML = this.getProductsHTML();
        }
    },
    
    getOverviewHTML() {
        const stats = Auth.getStats();
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">نظرة عامة</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px;">
                <div style="background:var(--glass); padding:20px; border-radius:20px; text-align:center;">
                    <i class="fas fa-users" style="font-size:40px; color:var(--gold);"></i>
                    <h4>المستخدمين</h4>
                    <p style="font-size:24px;">${stats.total}</p>
                </div>
                <div style="background:var(--glass); padding:20px; border-radius:20px; text-align:center;">
                    <i class="fas fa-store" style="font-size:40px; color:var(--gold);"></i>
                    <h4>التجار</h4>
                    <p style="font-size:24px;">${stats.merchants}</p>
                </div>
                <div style="background:var(--glass); padding:20px; border-radius:20px; text-align:center;">
                    <i class="fas fa-clock" style="font-size:40px; color:var(--gold);"></i>
                    <h4>طلبات pending</h4>
                    <p style="font-size:24px;">${stats.pending}</p>
                </div>
                <div style="background:var(--glass); padding:20px; border-radius:20px; text-align:center;">
                    <i class="fas fa-box" style="font-size:40px; color:var(--gold);"></i>
                    <h4>المنتجات</h4>
                    <p style="font-size:24px;">${Shop.products.length}</p>
                </div>
            </div>
        `;
    },
    
    getUsersHTML() {
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">المستخدمين</h3>
            <table style="width:100%;">
                <thead>
                    <tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>المعرف</th></tr>
                </thead>
                <tbody>
                    ${Auth.users.map(u => `
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td>${u.roleName || u.role}</td>
                            <td>${u.userId}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    getMerchantsHTML() {
        const merchants = Auth.users.filter(u => u.role === 'merchant');
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">التجار (${merchants.length})</h3>
            ${merchants.map(m => `
                <div style="background:var(--glass); padding:15px; border-radius:15px; margin:10px 0;">
                    <p><strong>${m.name}</strong> - ${m.email}</p>
                    <p>معرف: ${m.userId}</p>
                </div>
            `).join('')}
        `;
    },
    
    getRequestsHTML() {
        const requests = Auth.getPendingRequests();
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">طلبات الأدوار (${requests.length})</h3>
            ${requests.map(r => `
                <div style="background:var(--glass); padding:15px; border-radius:15px; margin:10px 0;">
                    <p><strong>${r.userName}</strong> يطلب دور <span style="color:var(--gold);">${r.requestedRoleName}</span></p>
                    <p>البريد: ${r.userEmail}</p>
                    <p>البيانات: ${JSON.stringify(r.data)}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-gold" onclick="Auth.approveRequest('${r.id}'); location.reload();">موافقة</button>
                        <button class="btn-outline-gold" onclick="Auth.rejectRequest('${r.id}'); location.reload();">رفض</button>
                    </div>
                </div>
            `).join('')}
        `;
    },
    
    getProductsHTML() {
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">المنتجات</h3>
            <table style="width:100%;">
                <thead>
                    <tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>التاجر</th></tr>
                </thead>
                <tbody>
                    ${Shop.products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price} دج</td>
                            <td>${p.stock}</td>
                            <td>${p.merchantName}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    openAdminApps() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح', 'error');
            return;
        }
        
        document.getElementById('adminAppsContent').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px;">
                <div style="background:var(--glass); border:2px solid var(--gold); border-radius:20px; padding:20px; text-align:center;">
                    <i class="fab fa-snapchat" style="font-size:40px; color:var(--gold);"></i>
                    <h3>سناب شات</h3>
                    <button class="btn-gold" onclick="window.open('05-snam.html','_blank')">تشغيل</button>
                </div>
                <div style="background:var(--glass); border:2px solid var(--gold); border-radius:20px; padding:20px; text-align:center;">
                    <i class="fab fa-tiktok" style="font-size:40px; color:var(--gold);"></i>
                    <h3>تيك توك</h3>
                    <button class="btn-gold" onclick="window.open('06-tikm.html','_blank')">تشغيل</button>
                </div>
                <div style="background:var(--glass); border:2px solid var(--gold); border-radius:20px; padding:20px; text-align:center;">
                    <i class="fas fa-film" style="font-size:40px; color:var(--gold);"></i>
                    <h3>ناردو ريلز</h3>
                    <button class="btn-gold" onclick="window.open('07-reels.html','_blank')">تشغيل</button>
                </div>
            </div>
        `;
        
        Utils.openModal('adminAppsModal');
    },
    
    // ===== دوال مساعدة =====
    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const toggle = document.getElementById('themeToggle');
        toggle.innerHTML = toggle.innerHTML.includes('moon') ? 
            '<i class="fas fa-sun"></i><span>نهاري</span>' : 
            '<i class="fas fa-moon"></i><span>ليلي</span>';
    },
    
    scrollToTop() {
        Utils.scrollToTop();
    },
    
    scrollToBottom() {
        Utils.scrollToBottom();
    },
    
    startTypingEffect() {
        const texts = ['ناردو برو', 'تسوق آمن', 'جودة عالية', 'توصيل سريع'];
        let index = 0, charIndex = 0;
        const element = document.getElementById('typing-text');
        
        if (!element) return;
        
        const type = () => {
            if (charIndex < texts[index].length) {
                element.textContent += texts[index].charAt(charIndex);
                charIndex++;
                setTimeout(type, 100);
            } else {
                setTimeout(erase, 2000);
            }
        };
        
        const erase = () => {
            if (element.textContent.length > 0) {
                element.textContent = element.textContent.slice(0, -1);
                setTimeout(erase, 50);
            } else {
                index = (index + 1) % texts.length;
                charIndex = 0;
                setTimeout(type, 500);
            }
        };
        
        type();
    },
    
    startClock() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('marqueeHours').textContent = now.getHours().toString().padStart(2, '0');
            document.getElementById('marqueeMinutes').textContent = now.getMinutes().toString().padStart(2, '0');
            document.getElementById('marqueeSeconds').textContent = now.getSeconds().toString().padStart(2, '0');
        }, 1000);
    }
};

// ===== [5.2] تشغيل التطبيق =====
window.App = App;

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => App.init());

console.log('✅ التطبيق الرئيسي جاهز');
