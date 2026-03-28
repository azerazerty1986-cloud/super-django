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
            event.target.style.display = 'none';
        }
    },
    
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
        if (event && event.target) event.target.classList.add('active');
    },
    
    searchProducts() {
        const term = document.getElementById('searchInput')?.value;
        if (!term) {
            this.displayProducts();
            return;
        }
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(term.toLowerCase())
        );
        this.displayProducts(filtered);
    },
    
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
    
    updateCartItem(productId, quantity) {
        if (window.Cart) {
            Cart.update(productId, quantity);
        }
    },
    
    removeFromCart(productId) {
        if (window.Cart) {
            Cart.remove(productId);
        }
    },
    
    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (window.Cart) Cart.display();
        }
    },
    
    checkout() {
        if (window.Cart) {
            Cart.checkout();
        } else {
            alert('تم التوجيه إلى واتساب');
        }
    },
    
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
    
    playReel(reelId) {
        Utils.showNotification('قريباً: نظام الريلز', 'info');
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
