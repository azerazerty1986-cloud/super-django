/* ================================================================== */
/* ===== [05] الملف: 05-app.js - التطبيق الرئيسي ===== */
/* ================================================================== */

const App = {
    products: [],
    
    async init() {
        console.log('🚀 بدء تشغيل ناردو برو...');
        
        Auth.init();
        
        if (window.Cart) {
            Cart.init();
        }
        
        await this.loadProducts();
        Auth.updateUI();
        
        this.updateUIByRole();
        
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
    
    // ===== تحميل المنتجات =====
    async loadProducts() {
    // عرض فوري من sessionStorage
    if (window.GlobalData) {
        const cached = sessionStorage.getItem('global_products');
        if (cached) {
            this.products = JSON.parse(cached);
            this.displayProducts();
            console.log('⚡ عرض فوري للمنتجات');
        }
        
        // جلب جديد في الخلفية
        GlobalData.getProducts().then(products => {
            if (products && products.length) {
                this.products = products;
                this.displayProducts();
                console.log('✅ تحديث المنتجات من الخادم');
            }
        });
        
        return;
    }
    
    // الكود الاحتياطي
    if (window.Telegram) {
        this.products = await Telegram.fetchProducts();
    } else {
        this.products = Utils.load('products', []);
    }
    this.displayProducts();
}
    
    // ===== عرض المنتجات =====
    displayProducts(productsToShow = null) {
        if (window.Shop) {
            Shop.displayProducts();
        } else {
            const container = document.getElementById('productsContainer');
            if (!container) return;
            
            const products = productsToShow || this.products;
            
            if (products.length === 0) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
                        <i class="fas fa-box-open" style="font-size:80px; color:var(--gold); margin-bottom:20px;"></i>
                        <h3 style="color:var(--gold);">لا توجد منتجات</h3>
                        ${Auth.currentUser && (Auth.currentUser.role === 'admin' || Auth.currentUser.role === 'merchant') ? 
                            '<button class="btn-gold" onclick="App.openAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>' : 
                            '<p style="color:var(--text-secondary);">سجل دخول كتاجر لإضافة منتجات</p>'}
                    </div>
                `;
                return;
            }
            
            container.innerHTML = products.map(p => {
                const shortId = p.productId ? p.productId.substring(0, 12) + '...' : (p.id ? p.id.substring(0, 12) + '...' : 'ID');
                const stockClass = p.stock <= 0 ? 'out-of-stock' : p.stock < 5 ? 'low-stock' : 'in-stock';
                const stockText = p.stock <= 0 ? 'غير متوفر' : p.stock < 5 ? `كمية محدودة (${p.stock})` : `متوفر (${p.stock})`;
                
                return `
                <div class="product-card" onclick="App.showProductDetail('${p.productId || p.id}')">
                    <div style="position:absolute; top:10px; left:10px; background:var(--gold); color:black; padding:3px 10px; border-radius:20px; font-size:10px; z-index:10;">
                        🆔 ${shortId}
                    </div>
                    <div class="product-gallery">
                        <img src="${p.image || CONFIG.defaultImage}" alt="${p.name}" loading="lazy" onerror="this.src='${CONFIG.defaultImage}'">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${p.name}</h3>
                        <div class="product-price">${p.price.toLocaleString()} دج</div>
                        <div class="product-stock ${stockClass}">${stockText}</div>
                        <button class="add-to-cart" onclick="event.stopPropagation(); App.addToCart('${p.productId || p.id}')" ${p.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                    </div>
                </div>`;
            }).join('');
        }
    },
    
    // ===== تصفية المنتجات =====
    filterProducts(category) {
        if (window.Shop) {
            Shop.filter(category);
        } else {
            let filtered = this.products;
            if (category !== 'all') {
                filtered = this.products.filter(p => p.category === category);
            }
            this.displayProducts(filtered);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            if (event && event.target) event.target.classList.add('active');
        }
    },
    
    // ===== بحث =====
    searchProducts() {
        const term = document.getElementById('searchInput')?.value;
        if (window.Shop) {
            Shop.search(term);
        } else {
            if (!term) {
                this.displayProducts();
                return;
            }
            const filtered = this.products.filter(p => 
                p.name.toLowerCase().includes(term.toLowerCase())
            );
            this.displayProducts(filtered);
        }
    },
    
    // ===== تفاصيل المنتج =====
    showProductDetail(productId) {
        let product;
        if (window.Shop) {
            product = Shop.getProduct(productId);
        } else {
            product = this.products.find(p => p.id == productId || p.productId == productId);
        }
        
        if (!product) return;
        
        const ownerId = product.productId ? product.productId.split('_PRD_')[0] : (product.merchantId || 'غير معروف');
        
        const content = document.getElementById('productDetailContent');
        if (!content) return;
        
        content.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px;">
                <div>
                    <img src="${product.image || CONFIG.defaultImage}" style="width:100%; border-radius:20px; border:3px solid var(--gold);">
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
                        ${product.price.toLocaleString()} دج
                    </div>
                    
                    <div class="product-stock" style="margin-bottom:15px; ${product.stock <= 0 ? 'color:#f87171' : product.stock < 5 ? 'color:#fbbf24' : 'color:#4ade80'}">
                        ${product.stock <= 0 ? '❌ غير متوفر' : product.stock < 5 ? `⚠️ كمية محدودة (${product.stock})` : `✅ متوفر (${product.stock})`}
                    </div>
                    
                    <button class="btn-gold" onclick="App.addToCart('${product.productId || product.id}'); App.closeModal('productDetailModal');" ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            </div>
        `;
        
        Utils.openModal('productDetailModal');
    },
    
    // ===== إضافة للسلة =====
    addToCart(productId) {
        if (window.Cart) {
            Cart.add(productId);
        } else {
            const product = this.products.find(p => (p.productId || p.id) == productId);
            if (!product) {
                Utils.showNotification('المنتج غير موجود', 'error');
                return;
            }
            if (product.stock <= 0) {
                Utils.showNotification('المنتج غير متوفر', 'error');
                return;
            }
            Utils.showNotification(`✅ تم إضافة ${product.name} للسلة`, 'success');
        }
    },
    
    // ===== تحديث كمية المنتج في السلة =====
    updateCartItem(productId, quantity) {
        if (window.Cart) {
            Cart.update(productId, quantity);
        }
    },
    
    // ===== حذف من السلة =====
    removeFromCart(productId) {
        if (window.Cart) {
            Cart.remove(productId);
        }
    },
    
    // ===== عرض السلة =====
    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (window.Cart) Cart.display();
        }
    },
    
    // ===== إتمام الشراء =====
    checkout() {
        if (window.Cart) {
            Cart.checkout();
        } else {
            alert('تم التوجيه إلى واتساب');
        }
    },
    
    // ===== فتح نافذة إضافة منتج =====
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
    
    // ===== رفع الصور =====
    handleImageUpload(event) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        for (let file of event.target.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
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
    },
    
    // ===== حفظ المنتج =====
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
        const imageFile = document.getElementById('productImages')?.files[0];
        
        if (!name || !category || !price || !stock) {
            Utils.showNotification('الرجاء ملء جميع الحقول', 'error');
            return;
        }

        if (!imageFile) {
            Utils.showNotification('الرجاء اختيار صورة للمنتج', 'error');
            return;
        }

        Utils.showNotification('جاري رفع المنتج...', 'info');

        const productId = IDSystem.generateProductId(Auth.currentUser.userId);
        
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
                
                if (window.Shop) {
                    Shop.products.push(newProduct);
                    Shop.saveProducts();
                    Shop.displayProducts();
                } else {
                    this.products.push(newProduct);
                    Utils.save('products', this.products);
                    this.displayProducts();
                }
                
                if (window.Inventory) {
                    const merchantId = Auth.currentUser.userId || Auth.currentUser.id;
                    if (!Inventory.warehouses[merchantId]) {
                        Inventory.createWarehouse(Auth.currentUser);
                    }
                    Inventory.addProduct(merchantId, newProduct);
                }
                
                Utils.showNotification(`✅ تم إضافة المنتج - المعرف: ${productId}`, 'success');
                this.closeModal('productModal');
                
            } else {
                Utils.showNotification('❌ فشل الإرسال إلى تلغرام', 'error');
            }
        }
    },
    
    // ===== دوال المصادقة =====
    openLoginModal() {
        Utils.openModal('loginModal');
    },
    
    closeModal(modalId) {
        Utils.closeModal(modalId);
    },
    
    switchAuthTab(tab) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
        if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
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
            this.updateUIByRole();
            Utils.showNotification(`مرحباً ${result.user.name} - معرفك: ${result.user.userId}`);
            
            if (result.user.role === 'merchant' && window.Inventory) {
                Inventory.createWarehouse(result.user);
            }
            
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
    
    // ===== لوحة التحكم =====
    openDashboard() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (Auth.currentUser.role === 'admin') {
            document.getElementById('dashboardSection').style.display = 'block';
        } else if (window.Roles) {
            this.showRoleDashboard();
        } else {
            Utils.showNotification('غير مصرح', 'error');
        }
    },
    
    // ===== دوال إدارة المخزون =====
    showInventory() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (window.Roles && !Roles.hasPermission(Auth.currentUser, 'manage_inventory')) {
            Utils.showNotification('غير مصرح لك بإدارة المخزون', 'error');
            return;
        }
        
        if (window.Inventory) {
            Inventory.showMerchantInventory();
        } else {
            Utils.showNotification('نظام المخزون غير متاح', 'error');
        }
    },
    
    // ===== دوال نظام التوصيل =====
    showDeliveryDashboard() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (Auth.currentUser.role !== 'admin' && (!window.Roles || !Roles.hasPermission(Auth.currentUser, 'view_deliveries'))) {
            Utils.showNotification('غير مصرح لك', 'error');
            return;
        }
        
        if (window.Delivery) {
            const dashboard = Delivery.getAdminDashboardHTML();
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h2><i class="fas fa-truck"></i> نظام التوصيل</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div style="padding: 20px; max-height: 80vh; overflow-y: auto;">
                        ${dashboard}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            Utils.showNotification('نظام التوصيل غير متاح', 'error');
        }
    },
    
    showMyDeliveries() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (Auth.currentUser.role !== 'delivery_person') {
            Utils.showNotification('هذه الصفحة للمندوبين فقط', 'error');
            return;
        }
        
        if (window.Delivery) {
            const deliveries = Delivery.getDriverDeliveries(Auth.currentUser.userId);
            
            let html = `
                <div class="deliveries-list">
                    <h3><i class="fas fa-motorcycle"></i> توصيلاتي</h3>
            `;
            
            if (deliveries.length === 0) {
                html += '<p>لا توجد توصيلات</p>';
            } else {
                deliveries.forEach(d => {
                    const statusText = {
                        'pending': '⏳ قيد الانتظار',
                        'assigned': '🔄 تم التعيين',
                        'picked_up': '📦 تم الاستلام',
                        'delivered': '✅ تم التوصيل'
                    }[d.status] || d.status;
                    
                    html += `
                        <div style="background: var(--glass); padding: 15px; border-radius: 12px; margin: 10px 0;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>#${d.id}</strong>
                                <span>${statusText}</span>
                            </div>
                            <div>👤 ${d.customerName}</div>
                            <div>📍 ${d.customerAddress}</div>
                            <div>💰 ${d.deliveryPrice} دج</div>
                            ${d.status !== 'delivered' ? `
                                <div style="margin-top: 10px; display: flex; gap: 10px;">
                                    <button class="btn-gold" onclick="Delivery.updateDeliveryStatus('${d.id}', 'picked_up', 'تم استلام الطلب')">
                                        <i class="fas fa-box"></i> استلام
                                    </button>
                                    <button class="btn-gold" onclick="Delivery.updateDeliveryStatus('${d.id}', 'delivered', 'تم التوصيل بنجاح')">
                                        <i class="fas fa-check"></i> توصيل
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }
            
            html += '</div>';
            
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-motorcycle"></i> توصيلاتي</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                        ${html}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    },
    
    // ===== عرض لوحة التحكم حسب الدور =====
    showRoleDashboard() {
        if (window.Roles && Auth.currentUser) {
            const dashboard = Roles.getDashboardByRole(Auth.currentUser);
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-tachometer-alt"></i> لوحة التحكم</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div style="padding: 20px;">
                        ${dashboard}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            Utils.showNotification('نظام الأدوار غير متاح', 'error');
        }
    },
    
    // ===== عرض لوحة التحليلات =====
    showAnalytics() {
        if (!Auth.currentUser) {
            Utils.showNotification('الرجاء تسجيل الدخول أولاً', 'error');
            this.openLoginModal();
            return;
        }
        
        if (Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح - هذه الصفحة للمدير فقط', 'error');
            return;
        }
        
        if (window.Analytics) {
            Analytics.showAnalyticsDashboard();
        } else {
            Utils.showNotification('نظام التحليلات غير متاح', 'error');
        }
    },
    
    // ===== تحديث واجهة المستخدم حسب الدور =====
    updateUIByRole() {
        if (!Auth.currentUser) return;
        
        const user = Auth.currentUser;
        
        const inventoryBtn = document.getElementById('inventoryBtn');
        if (inventoryBtn) {
            const hasPermission = window.Roles ? Roles.hasPermission(user, 'manage_inventory') : (user.role === 'merchant' || user.role === 'admin');
            inventoryBtn.style.display = hasPermission ? 'flex' : 'none';
        }
        
        const deliveryBtn = document.getElementById('deliveryBtn');
        if (deliveryBtn) {
            const showDelivery = (user.role === 'admin' || user.role === 'delivery_person');
            deliveryBtn.style.display = showDelivery ? 'flex' : 'none';
            
            if (user.role === 'delivery_person') {
                deliveryBtn.innerHTML = '<i class="fas fa-motorcycle"></i> توصيلاتي';
                deliveryBtn.onclick = () => this.showMyDeliveries();
            } else {
                deliveryBtn.innerHTML = '<i class="fas fa-truck"></i> نظام التوصيل';
                deliveryBtn.onclick = () => this.showDeliveryDashboard();
            }
        }
        
        const analyticsBtn = document.getElementById('analyticsBtn');
        if (analyticsBtn) {
            analyticsBtn.style.display = user.role === 'admin' ? 'flex' : 'none';
        }
        
        const userBtn = document.getElementById('userBtn');
        if (userBtn) {
            if (user.role === 'admin') userBtn.innerHTML = '<i class="fas fa-crown"></i>';
            else if (user.role === 'merchant') userBtn.innerHTML = '<i class="fas fa-store"></i>';
            else if (user.role === 'delivery_person') userBtn.innerHTML = '<i class="fas fa-motorcycle"></i>';
            else userBtn.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) {
            dashboardBtn.style.display = user.role === 'admin' ? 'flex' : 'none';
        }
    },
    
    // ===== دوال مساعدة =====
    setupEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('click', this.handleClick.bind(this));
        
        setInterval(() => {
            if (Auth.currentUser && this.lastUser !== Auth.currentUser.userId) {
                this.lastUser = Auth.currentUser.userId;
                this.updateUIByRole();
            }
        }, 1000);
    },
    
    handleScroll() {
        const btn = document.getElementById('quickTopBtn');
        if (btn) btn.classList.toggle('show', window.scrollY > 300);
    },
    
    handleClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
            event.target.style.display = 'none';
        }
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
        if (toggle) {
            const isDark = !document.body.classList.contains('light-mode');
            toggle.innerHTML = isDark ? 
                '<i class="fas fa-moon"></i><span>ليلي</span>' : 
                '<i class="fas fa-sun"></i><span>نهاري</span>';
        }
        Utils.save('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    },
    
    playReel(reelId) {
        Utils.showNotification('قريباً: نظام الريلز', 'info');
    },
    
    // ===== تأثيرات =====
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
            const hours = document.getElementById('marqueeHours');
            const minutes = document.getElementById('marqueeMinutes');
            const seconds = document.getElementById('marqueeSeconds');
            
            if (hours) hours.textContent = now.getHours().toString().padStart(2, '0');
            if (minutes) minutes.textContent = now.getMinutes().toString().padStart(2, '0');
            if (seconds) seconds.textContent = now.getSeconds().toString().padStart(2, '0');
        }, 1000);
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

console.log('✅ التطبيق الرئيسي جاهز');
