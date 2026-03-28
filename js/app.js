/* ================================================================== */
/* ===== [05] الملف: 05-app.js - التطبيق الرئيسي ===== */
/* ================================================================== */

const App = {
    products: [],
    
    async init() {
        console.log('🚀 بدء تشغيل ناردو برو...');
        
        Auth.init();
        Cart.init();
        
        await this.loadProducts();
        Auth.updateUI();
        
        this.startTypingEffect();
        this.startClock();
        this.setupEventListeners();
        
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 1000);
    },
    
    async loadProducts() {
        if (window.Telegram) {
            this.products = await Telegram.fetchProducts();
        } else {
            this.products = Utils.load('products', []);
        }
        this.displayProducts();
    },
    
    setupEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('click', this.handleClick.bind(this));
    },
    
    handleScroll() {
        const btn = document.getElementById('quickTopBtn');
        if (btn) btn.classList.toggle('show', window.scrollY > 300);
    },
    
    handleClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    },
    
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
            Utils.showNotification(`مرحباً ${result.user.name} - معرفك: ${result.user.userId}`);
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
        
        let role = 'customer';
        let roleData = {};
        
        if (requestRole) {
            role = document.getElementById('requestedRole').value;
            roleData = {
                storeName: document.getElementById('storeName')?.value,
                specialization: document.getElementById('specialization')?.value,
                workArea: document.getElementById('workArea')?.value,
                vehicleType: document.getElementById('vehicleType')?.value,
                experience: document.getElementById('experience')?.value
            };
        }
        
        const userData = { 
            name, 
            email, 
            password, 
            phone, 
            role,
            ...roleData
        };
        
        const result = Auth.register(userData);
        
        if (result.success) {
            Utils.showNotification(result.message, 'success');
            this.switchAuthTab('login');
            document.getElementById('registerForm')?.reset();
        } else {
            Utils.showNotification(result.message, 'error');
        }
    },
    
    filterProducts(category) {
        let filtered = this.products;
        if (category !== 'all') {
            filtered = this.products.filter(p => p.category === category);
        }
        this.displayProducts(filtered);
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        event.target.classList.add('active');
    },
    
    searchProducts() {
        const term = document.getElementById('searchInput').value;
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(term.toLowerCase())
        );
        this.displayProducts(filtered);
    },
    
    showProductDetail(productId) {
        const product = this.products.find(p => p.id === productId || p.productId === productId);
        if (!product) return;
        
        const ownerId = product.productId ? product.productId.split('_PRD_')[0] : 'غير معروف';
        
        document.getElementById('productDetailContent').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px;">
                <div>
                    <img src="${product.image}" style="width:100%; border-radius:20px; border:3px solid var(--gold);">
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h2 style="color:var(--gold);">${product.name}</h2>
                        <span style="background:var(--glass); padding:5px 15px; border-radius:30px; font-size:12px;">
                            🆔 ${product.productId || product.id}
                        </span>
                    </div>
                    <p>${product.description || 'منتج عالي الجودة'}</p>
                    
                    <div style="background:var(--glass); padding:15px; border-radius:15px; margin:20px 0;">
                        <p><i class="fas fa-store"></i> ${product.merchantName}</p>
                        <p style="color:var(--gold-light); font-size:12px; margin-top:5px;">
                            معرف الناشر: ${ownerId}
                        </p>
                    </div>
                    
                    <div style="font-size:36px; color:var(--gold); font-weight:800; margin-bottom:20px;">
                        ${product.price} دج
                    </div>
                    
                    <button class="btn-gold" onclick="App.addToCart('${product.id}'); App.closeModal('productDetailModal');">
                        أضف للسلة
                    </button>
                </div>
            </div>
        `;
        
        Utils.openModal('productDetailModal');
    },
    
    // ===== [معدل] فتح نافذة إضافة منتج (للنافذة القديمة) =====
    openAddProductModal() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        const allowedRoles = ['admin', 'merchant', 'distributor', 'content_creator'];
        if (!allowedRoles.includes(Auth.currentUser.role)) {
            Utils.showNotification('غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        Utils.openModal('productModal');
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
    
    // ===== [معدل] حفظ المنتج - المنتج يأخذ معرف صاحبه + رقم تسلسلي =====
    async saveProduct() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            return;
        }
        
        const allowedRoles = ['admin', 'merchant', 'distributor', 'content_creator'];
        if (!allowedRoles.includes(Auth.currentUser.role)) {
            Utils.showNotification('غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        const name = document.getElementById('productName')?.value;
        const category = document.getElementById('productCategory')?.value;
        const price = parseInt(document.getElementById('productPrice')?.value);
        const stock = parseInt(document.getElementById('productStock')?.value);
        const description = document.getElementById('productDescription')?.value;
        const imageFile = document.getElementById('productImages').files[0];
        
        if (!name || !category || !price || !stock) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }

        if (!imageFile) {
            Utils.showNotification('الرجاء اختيار صورة للمنتج', 'error');
            return;
        }

        Utils.showNotification('جاري رفع المنتج...', 'info');

        // المنتج يأخذ معرف صاحبه + رقم تسلسلي
        const productId = `${Auth.currentUser.userId}_PRD_${Date.now().toString().slice(-6)}`;
        
        const product = {
            productId: productId,
            name: name,
            category: category,
            price: price,
            stock: stock,
            description: description || '',
            merchantName: Auth.currentUser.storeName || Auth.currentUser.name,
            merchantId: Auth.currentUser.userId
        };

        if (window.Telegram) {
            const result = await Telegram.addProductWithPhoto(product, imageFile);
            
            if (result.success) {
                const newProduct = {
                    ...product,
                    id: productId,
                    telegramId: result.messageId,
                    image: result.photoUrl || CONFIG.defaultImage,
                    images: result.photoUrl ? [result.photoUrl] : [],
                    createdAt: new Date().toISOString()
                };
                
                this.products.push(newProduct);
                Utils.save('products', this.products);
                this.displayProducts();
                
                Utils.showNotification(`✅ تم إضافة المنتج - المعرف: ${productId}`, 'success');
                this.closeModal('productModal');
                
            } else {
                Utils.showNotification('❌ فشل الإرسال إلى تلغرام', 'error');
            }
        }
    },
    
    // ===== [جديد] دوال أيقونة إضافة المنتج (للأيقونة الخضراء) =====
    
    // فتح نافذة إضافة منتج من الأيقونة
    openAddProductForm() {
        console.log('📝 محاولة فتح نافذة إضافة منتج من الأيقونة');
        
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        const allowedRoles = ['admin', 'merchant', 'distributor', 'content_creator'];
        if (!allowedRoles.includes(Auth.currentUser.role)) {
            Utils.showNotification('غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            const form = document.getElementById('addProductForm');
            if (form) form.reset();
            
            const preview = document.getElementById('newImagePreview');
            if (preview) preview.innerHTML = '';
            
            console.log('✅ تم فتح نافذة إضافة منتج');
        } else {
            console.error('❌ addProductModal غير موجود');
            Utils.showNotification('النافذة غير موجودة', 'error');
        }
    },
    
    // إغلاق نافذة إضافة منتج من الأيقونة
    closeAddProductForm() {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
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
    async saveNewProduct() {
        if (!Auth.currentUser) {
            Utils.showNotification('يجب تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        const allowedRoles = ['admin', 'merchant', 'distributor', 'content_creator'];
        if (!allowedRoles.includes(Auth.currentUser.role)) {
            Utils.showNotification('غير مصرح لك بإضافة منتجات', 'error');
            return;
        }
        
        const name = document.getElementById('newProductName')?.value;
        const category = document.getElementById('newProductCategory')?.value;
        const price = parseInt(document.getElementById('newProductPrice')?.value);
        const stock = parseInt(document.getElementById('newProductStock')?.value);
        const description = document.getElementById('newProductDescription')?.value;
        const imageFile = document.getElementById('newProductImages').files[0];
        
        if (!name || !category || !price || !stock) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }

        if (!imageFile) {
            Utils.showNotification('الرجاء اختيار صورة للمنتج', 'error');
            return;
        }

        Utils.showNotification('جاري رفع المنتج...', 'info');

        const productId = `${Auth.currentUser.userId}_PRD_${Date.now().toString().slice(-6)}`;
        
        const product = {
            productId: productId,
            name: name,
            category: category,
            price: price,
            stock: stock,
            description: description || '',
            merchantName: Auth.currentUser.storeName || Auth.currentUser.name,
            merchantId: Auth.currentUser.userId
        };

        if (window.Telegram) {
            const result = await Telegram.addProductWithPhoto(product, imageFile);
            
            if (result.success) {
                const newProduct = {
                    ...product,
                    id: productId,
                    telegramId: result.messageId,
                    image: result.photoUrl || CONFIG.defaultImage,
                    images: result.photoUrl ? [result.photoUrl] : [],
                    createdAt: new Date().toISOString()
                };
                
                this.products.push(newProduct);
                Utils.save('products', this.products);
                this.displayProducts();
                
                Utils.showNotification(`✅ تم إضافة المنتج - المعرف: ${productId}`, 'success');
                this.closeAddProductForm();
                
            } else {
                Utils.showNotification('❌ فشل الإرسال إلى تلغرام', 'error');
            }
        }
    },
    
    displayProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        if (this.products.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px;">لا توجد منتجات</div>';
            return;
        }
        
        container.innerHTML = this.products.map(p => {
            const shortId = p.productId ? p.productId.substring(0, 12) + '...' : 'ID';
            
            return `
            <div class="product-card" onclick="App.showProductDetail('${p.productId || p.id}')">
                <div style="position:absolute; top:10px; left:10px; background:var(--gold); color:black; padding:3px 10px; border-radius:20px; font-size:10px; z-index:10;">
                    🆔 ${shortId}
                </div>
                <div class="product-gallery">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price} دج</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); App.addToCart('${p.productId || p.id}')">
                        أضف للسلة
                    </button>
                </div>
            </div>
        `}).join('');
    },
    
    addToCart(productId) {
        Utils.showNotification('تمت الإضافة للسلة');
    },
    
    toggleCart() {
        document.getElementById('cartSidebar').classList.toggle('open');
    },
    
    checkout() {
        alert('تم التوجيه إلى واتساب');
    },
    
    openDashboard() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح', 'error');
            return;
        }
        document.getElementById('dashboardSection').style.display = 'block';
    },
    
    playReel(reelId) {
        window.open(`07-reels.html?id=${reelId}`, '_blank');
    },
    
    scrollToTop() {
        Utils.scrollToTop();
    },
    
    scrollToBottom() {
        Utils.scrollToBottom();
    },
    
    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const toggle = document.getElementById('themeToggle');
        toggle.innerHTML = toggle.innerHTML.includes('moon') ? 
            '<i class="fas fa-sun"></i><span>نهاري</span>' : 
            '<i class="fas fa-moon"></i><span>ليلي</span>';
    },
    
    startTypingEffect() {
        const texts = ['ناردو برو', 'تسوق آمن', 'جودة عالية'];
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

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

