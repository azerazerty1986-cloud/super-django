
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
        
        // تحميل المنتجات
        if (window.Shop) {
            await Shop.loadProducts();
            this.products = Shop.products;
        } else {
            this.loadLocalProducts();
        }
        
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
    
    // تحميل المنتجات محلياً
    loadLocalProducts() {
        this.products = Utils.load('products', [
            { id: 1, name: 'زعتر فلسطيني', price: 500, category: 'spices', stock: 50, image: 'https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300', merchantName: 'المتجر' },
            { id: 2, name: 'كريم ترطيب', price: 1200, category: 'cosmetic', stock: 30, image: 'https://images.unsplash.com/photo-1596040033229-a9821e1929c7?w=300', merchantName: 'المتجر' },
            { id: 3, name: 'بخور عود', price: 1500, category: 'other', stock: 15, image: 'https://images.unsplash.com/photo-1608571423912-8a4c8a8c9b9a?w=300', merchantName: 'المتجر' }
        ]);
        this.displayProducts(this.products);
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
        const username = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = Auth.login(username, password);
        
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
    
    // ===== دوال المنتجات (لجميع المستخدمين) =====
    filterProducts(category) {
        if (window.Shop) {
            Shop.filter(category);
        } else {
            // تصفية محلية
            let filtered = this.products;
            if (category !== 'all') {
                filtered = this.products.filter(p => p.category === category);
            }
            this.displayProducts(filtered);
        }
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        event.target.classList.add('active');
    },
    
    searchProducts() {
        const term = document.getElementById('searchInput').value;
        if (window.Shop) {
            Shop.search(term);
        } else {
            // بحث محلي
            const filtered = this.products.filter(p => 
                p.name.toLowerCase().includes(term.toLowerCase())
            );
            this.displayProducts(filtered);
        }
    },
    
    showProductDetail(productId) {
        let product;
        
        if (window.Shop) {
            product = Shop.getProduct(productId);
        } else {
            product = this.products.find(p => p.id == productId);
        }
        
        if (!product) return;
        
        // عرض الصور المتعددة إن وجدت
        const images = product.images && product.images.length > 0 ? product.images : [product.image];
        const mainImage = images[0];
        
        // إنشاء معرض الصور المصغرة
        let galleryThumbs = '';
        if (images.length > 1) {
            galleryThumbs = '<div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">' +
                images.map((img, index) => 
                    `<img src="${img}" onclick="document.getElementById('mainProductImage').src='${img}'" 
                      style="width:60px; height:60px; object-fit:cover; border-radius:10px; border:2px solid var(--gold); cursor:pointer; ${index === 0 ? 'opacity:1;' : 'opacity:0.7;'}"
                      onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${index === 0 ? '1' : '0.7'}'">`
                ).join('') + '</div>';
        }
        
        document.getElementById('productDetailContent').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px;">
                <div>
                    <img id="mainProductImage" src="${mainImage}" style="width:100%; border-radius:20px; border:3px solid var(--gold);">
                    ${galleryThumbs}
                </div>
                <div>
                    <h2 style="color:var(--gold); font-size:28px;">${product.name}</h2>
                    <p style="margin:20px 0;">${product.description || 'منتج عالي الجودة'}</p>
                    <div style="background:var(--glass); padding:15px; border-radius:15px; margin-bottom:20px;">
                        <p><i class="fas fa-store"></i> ${product.merchantName || 'المتجر'}</p>
                    </div>
                    <div style="font-size:36px; color:var(--gold); font-weight:800; margin-bottom:20px;">
                        ${product.price.toLocaleString()} <small style="font-size:16px;">دج</small>
                    </div>
                    <div style="margin-bottom:20px;">
                        <span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">
                            ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                        </span>
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
    
    // ===== [إصلاح] دوال رفع الصور =====
    
    // رفع الصور للنموذج العادي
    handleImageUpload(event) {
        const preview = document.getElementById('imagePreview');
        if (!preview) {
            console.error('❌ imagePreview غير موجود');
            return;
        }
        
        // تخزين الصور في مصفوفة
        if (!this.uploadedImages) this.uploadedImages = [];
        
        preview.innerHTML = '';
        
        for (let file of event.target.files) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                preview.appendChild(img);
                
                this.uploadedImages.push(e.target.result);
                console.log('✅ تم رفع صورة:', file.name);
            };
            
            reader.onerror = (error) => {
                console.error('❌ خطأ في قراءة الصورة:', error);
                Utils.showNotification('خطأ في رفع الصورة', 'error');
            };
            
            reader.readAsDataURL(file);
        }
        
        Utils.showNotification(`جاري رفع ${event.target.files.length} صور`, 'info');
    },
    
    // رفع الصور للنموذج الجديد
    handleNewImageUpload(event) {
        const preview = document.getElementById('newImagePreview');
        if (!preview) {
            console.error('❌ newImagePreview غير موجود');
            return;
        }
        
        if (!this.newUploadedImages) this.newUploadedImages = [];
        
        preview.innerHTML = '';
        
        for (let file of event.target.files) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                preview.appendChild(img);
                
                this.newUploadedImages.push(e.target.result);
                console.log('✅ تم رفع صورة جديدة:', file.name);
            };
            
            reader.onerror = (error) => {
                console.error('❌ خطأ في قراءة الصورة:', error);
                Utils.showNotification('خطأ في رفع الصورة', 'error');
            };
            
            reader.readAsDataURL(file);
        }
        
        Utils.showNotification(`جاري رفع ${event.target.files.length} صور`, 'info');
    },
    
    // ===== [إصلاح] دوال إضافة المنتج =====
    
    // فتح نافذة إضافة منتج
    openAddProductModal() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        // السماح فقط للمدير والتاجر
        if (Auth.currentUser.role === 'admin' || Auth.currentUser.role === 'merchant') {
            const modal = document.getElementById('productModal');
            if (modal) {
                // إعادة تعيين الحقول
                document.getElementById('productName').value = '';
                document.getElementById('productCategory').value = 'promo';
                document.getElementById('productPrice').value = '';
                document.getElementById('productStock').value = '';
                document.getElementById('productDescription').value = '';
                document.getElementById('imagePreview').innerHTML = '';
                this.uploadedImages = [];
                
                modal.classList.add('show');
                console.log('✅ تم فتح نافذة إضافة منتج');
            } else {
                console.error('❌ productModal غير موجود');
                Utils.showNotification('النافذة غير موجودة', 'error');
            }
        } else {
            Utils.showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
        }
    },
    
    // حفظ المنتج
    async saveProduct() {
        // التحقق من تسجيل الدخول
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            return;
        }
        
        // التحقق من الصلاحية
        if (Auth.currentUser.role !== 'admin' && Auth.currentUser.role !== 'merchant') {
            Utils.showNotification('غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        // جمع البيانات
        const name = document.getElementById('productName')?.value;
        const category = document.getElementById('productCategory')?.value;
        const price = parseInt(document.getElementById('productPrice')?.value);
        const stock = parseInt(document.getElementById('productStock')?.value);
        const description = document.getElementById('productDescription')?.value;
        
        if (!name || !category || !price || !stock) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }
        
        // إنشاء المنتج
        const product = {
            id: Date.now(),
            name: name,
            category: category,
            price: price,
            stock: stock,
            description: description || '',
            image: 'https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300', // صورة افتراضية
            merchantId: Auth.currentUser.merchantId || Auth.currentUser.userId || 'ADMIN',
            merchantName: Auth.currentUser.name,
            createdAt: new Date().toISOString(),
            dateStr: 'الآن'
        };
        
        // إضافة الصور المرفوعة إن وجدت
        if (this.uploadedImages && this.uploadedImages.length > 0) {
            product.images = this.uploadedImages;
            product.image = this.uploadedImages[0]; // أول صورة كصورة رئيسية
        }
        
        // تفريغ مصفوفة الصور بعد الحفظ
        this.uploadedImages = [];
        
        // حفظ في نظام Shop
        if (window.Shop) {
            if (!Shop.products) Shop.products = [];
            Shop.products.push(product);
            Shop.saveProducts();
            Shop.displayProducts();
            console.log('✅ تمت الإضافة إلى Shop');
        } else {
            // حفظ محلياً
            if (!this.products) this.products = [];
            this.products.push(product);
            Utils.save('products', this.products);
            this.displayProducts(this.products);
        }
        
        // إرسال إلى تلغرام
        if (window.Telegram) {
            try {
                await Telegram.addProduct(product, Auth.currentUser);
                Utils.showNotification('✅ تم الإرسال إلى تلغرام');
            } catch (error) {
                console.error('خطأ في إرسال تلغرام:', error);
            }
        }
        
        Utils.showNotification('✅ تم إضافة المنتج');
        this.closeModal('productModal');
    },
    
    // ===== دوال إضافة المنتج للأيقونة =====
    openAddProductForm() {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            // إعادة تعيين الحقول
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductCategory').value = 'promo';
            document.getElementById('newProductPrice').value = '';
            document.getElementById('newProductStock').value = '';
            document.getElementById('newProductDescription').value = '';
            document.getElementById('newImagePreview').innerHTML = '';
            this.newUploadedImages = [];
            
            modal.classList.add('show');
        } else {
            console.error('❌ addProductModal غير موجود');
            Utils.showNotification('النافذة غير موجودة', 'error');
        }
    },
    
    closeAddProductForm() {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    async saveNewProduct() {
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
            image: 'https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300',
            merchantId: Auth.currentUser.merchantId || Auth.currentUser.userId || 'USER',
            merchantName: Auth.currentUser.name,
            createdAt: new Date().toISOString(),
            dateStr: 'الآن'
        };
        
        // إضافة الصور المرفوعة إن وجدت
        if (this.newUploadedImages && this.newUploadedImages.length > 0) {
            product.images = this.newUploadedImages;
            product.image = this.newUploadedImages[0];
        }
        
        // تفريغ مصفوفة الصور
        this.newUploadedImages = [];
        
        // حفظ في نظام Shop
        if (window.Shop) {
            if (!Shop.products) Shop.products = [];
            Shop.products.push(product);
            Shop.saveProducts();
            Shop.displayProducts();
        } else {
            // حفظ محلياً
            let products = Utils.load('products', []);
            products.push(product);
            Utils.save('products', products);
            this.displayProducts(products);
        }
        
        // إرسال إلى تلغرام
        try {
            const message = `
🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
🆔 *المعرف:* ${product.merchantId}
📝 *الوصف:* ${product.description || 'لا يوجد'}
🕐 ${new Date().toLocaleString('ar-EG')}
            `;
            
            await fetch(`https://api.telegram.org/bot8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: '-1003822964890',
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        } catch (error) {
            console.error('❌ خطأ في الاتصال بتلغرام:', error);
        }
        
        Utils.showNotification('✅ تم إضافة المنتج');
        this.closeAddProductForm();
    },
    
    // عرض المنتجات
    displayProducts(products) {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = products.map(p => {
            // استخدام الصورة الأولى إن وجدت
            const imageUrl = p.images && p.images.length > 0 ? p.images[0] : p.image;
            
            return `
            <div class="product-card" onclick="App.showProductDetail(${p.id})">
                <div class="product-gallery">
                    <img src="${imageUrl}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c5330041e7?w=300'">
                    ${p.images && p.images.length > 1 ? `<span class="image-counter"><i class="fas fa-images"></i> ${p.images.length}</span>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price} دج</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); App.addToCart(${p.id})">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        `}).join('');
    },
    
    // ===== دوال السلة =====
    addToCart(productId) {
        if (window.Cart) {
            Cart.add(productId);
        } else {
            Utils.showNotification('تمت الإضافة للسلة (تجريبي)');
        }
    },
    
    toggleCart() {
        document.getElementById('cartSidebar').classList.toggle('open');
        if (window.Cart) {
            Cart.display();
        }
    },
    
    updateCartItem(productId, newQuantity) {
        if (window.Cart) {
            Cart.update(productId, newQuantity);
        }
    },
    
    removeFromCart(productId) {
        if (window.Cart) {
            Cart.remove(productId);
        }
    },
    
    checkout() {
        if (window.Cart) {
            Cart.checkout();
        } else {
            alert('تم التوجيه إلى واتساب');
        }
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
        } else if (tab === 'delivery') {
            content.innerHTML = this.getDeliveryHTML();
        }
    },
    
    getOverviewHTML() {
        const stats = Auth.getStats ? Auth.getStats() : { total: 0, merchants: 0, pending: 0 };
        const productCount = window.Shop ? Shop.products.length : (this.products ? this.products.length : 0);
        
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
                    <p style="font-size:24px;">${productCount}</p>
                </div>
            </div>
        `;
    },
    
    getUsersHTML() {
        const users = Auth.users || [];
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">المستخدمين</h3>
            <table style="width:100%;">
                <thead>
                    <tr><th>الاسم</th><th>البريد</th><th>الدور</th></tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td>${u.role || 'user'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    getMerchantsHTML() {
        const users = Auth.users || [];
        const merchants = users.filter(u => u.role === 'merchant');
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">التجار (${merchants.length})</h3>
            ${merchants.map(m => `
                <div style="background:var(--glass); padding:15px; border-radius:15px; margin:10px 0;">
                    <p><strong>${m.name}</strong> - ${m.email}</p>
                </div>
            `).join('')}
        `;
    },
    
    getRequestsHTML() {
        const requests = Auth.getPendingRequests ? Auth.getPendingRequests() : [];
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">طلبات الأدوار (${requests.length})</h3>
            ${requests.map(r => `
                <div style="background:var(--glass); padding:15px; border-radius:15px; margin:10px 0;">
                    <p><strong>${r.userName}</strong> يطلب دور <span style="color:var(--gold);">${r.requestedRoleName}</span></p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-gold" onclick="Auth.approveRequest('${r.id}'); location.reload();">موافقة</button>
                        <button class="btn-outline-gold" onclick="Auth.rejectRequest('${r.id}'); location.reload();">رفض</button>
                    </div>
                </div>
            `).join('')}
        `;
    },
    
    getProductsHTML() {
        const products = window.Shop ? Shop.products : (this.products || []);
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">المنتجات</h3>
            <table style="width:100%;">
                <thead>
                    <tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>التاجر</th></tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price} دج</td>
                            <td>${p.stock}</td>
                            <td>${p.merchantName || 'المتجر'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    getDeliveryHTML() {
        return `
            <h3 style="color:var(--gold); margin-bottom:20px;">نظام التوصيل</h3>
            <p>قريباً...</p>
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
    
    // ===== [للمدير فقط] الموافقة على طلبات التجار =====
    approveMerchant(userId) {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح', 'error');
            return;
        }
        
        const user = Auth.users.find(u => u.id == userId || u.userId == userId);
        if (user) {
            user.role = 'merchant';
            user.roleName = 'تاجر';
            Auth.save();
            Utils.showNotification(`✅ تمت الموافقة على ${user.name} كتاجر`);
            this.switchDashboardTab('merchants');
        }
    },
    
    rejectMerchant(userId) {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح', 'error');
            return;
        }
        
        const user = Auth.users.find(u => u.id == userId || u.userId == userId);
        if (user) {
            user.role = 'customer';
            user.roleName = 'مشتري';
            Auth.save();
            Utils.showNotification(`❌ تم رفض طلب ${user.name}`);
            this.switchDashboardTab('merchants');
        }
    },
    
    // ===== دالة تشغيل الريلز =====
    playReel(reelId) {
        window.open(`07-reels.html?id=${reelId}`, '_blank');
    },
    
    // ===== دوال التمرير =====
    scrollToTop() {
        window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
        });
    },
    
    scrollToBottom() {
        window.scrollTo({ 
            top: document.body.scrollHeight, 
            behavior: 'smooth' 
        });
    },
    
    // ===== دوال مساعدة =====
    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const toggle = document.getElementById('themeToggle');
        toggle.innerHTML = toggle.innerHTML.includes('moon') ? 
            '<i class="fas fa-sun"></i><span>نهاري</span>' : 
            '<i class="fas fa-moon"></i><span>ليلي</span>';
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
