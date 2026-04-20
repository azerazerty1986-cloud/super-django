
// ============================================
// 🚀 ناردو برو - نظام التحسينات المتكامل
// الإصدار: 2.0.0 - بدون تعديلات أمان
// ============================================

(function() {
    'use strict';
    
    // ============================================
    // الإعدادات العامة
    // ============================================
    const CONFIG = {
        version: '2.0.0',
        autoSaveInterval: 30000,           // 30 ثانية
        trackingRefreshInterval: 5000,      // 5 ثواني
        maxOrdersToStore: 100,
        enableSound: true,
        enableDesktopNotifications: true
    };
    
    let state = {
        isSubmitting: false,
        trackingInterval: null,
        autoSaveInterval: null,
        currentRating: 0
    };
    
    // ============================================
    // التهيئة الرئيسية
    // ============================================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyAllImprovements);
        } else {
            applyAllImprovements();
        }
    }
    
    function applyAllImprovements() {
        console.log(`🚀 ناردو برو - تفعيل التحسينات v${CONFIG.version}`);
        
        // 1. نظام تتبع الطلبات
        initTrackingSystem();
        
        // 2. لوحة التحكم والإحصائيات
        initDashboard();
        
        // 3. إشعارات سطح المكتب
        initDesktopNotifications();
        
        // 4. الوضع الليلي
        initTheme();
        
        // 5. النسخ الاحتياطي
        initBackup();
        
        // 6. الحفظ التلقائي
        initAutoSave();
        
        // 7. نظام التقييم
        initRatingSystem();
        
        // 8. اختصارات لوحة المفاتيح
        initKeyboardShortcuts();
        
        // 9. إحصائيات السلة
        initCartStats();
        
        // 10. زر مشاركة السلة
        initShareCart();
        
        // 11. تحسين صحة رقم الهاتف
        initPhoneValidation();
        
        // 12. منع الإرسال المتكرر
        initPreventDoubleSubmit();
        
        // 13. إعادة الطلب من الأرشيف
        initReorderButton();
        
        // 14. تأثيرات حركية
        initAnimations();
        
        // 15. مؤشر الكتابة
        initTypingIndicator();
        
        // 16. تقارير أسبوعية
        initWeeklyReport();
        
        console.log('✅ تم تفعيل جميع التحسينات بنجاح');
    }
    
    // ============================================
    // 1. نظام تتبع الطلبات 📍
    // ============================================
    function initTrackingSystem() {
        addTrackingInterface();
        enhanceOrderSaving();
        startTrackingUpdates();
    }
    
    function addTrackingInterface() {
        const container = document.querySelector('.container');
        if (!container || document.getElementById('trackingSection')) return;
        
        // إضافة زر التتبع في الهيدر
        const headerInfo = document.querySelector('.header-info');
        if (headerInfo && !document.querySelector('.tracking-btn')) {
            const trackBtn = document.createElement('div');
            trackBtn.className = 'info-item tracking-btn';
            trackBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i><span>تتبع طلبي</span>';
            trackBtn.onclick = () => toggleTrackingSection();
            headerInfo.appendChild(trackBtn);
        }
        
        // إضافة قسم التتبع
        const trackingHTML = `
            <div id="trackingSection" class="tracking-section" style="display: none;">
                <div class="tracking-header">
                    <h2><i class="fas fa-map-marked-alt"></i> تتبع طلبي</h2>
                    <input type="text" id="trackingInput" placeholder="أدخل رقم التتبع..." class="tracking-input">
                    <button onclick="window.trackOrderNumber()" class="btn btn-gold">
                        <i class="fas fa-search"></i> تتبع
                    </button>
                    <button onclick="window.closeTracking()" class="btn btn-outline">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="trackingResult" class="tracking-result"></div>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', trackingHTML);
        
        // إضافة ستايل التتبع
        addTrackingStyles();
    }
    
    function addTrackingStyles() {
        if (document.getElementById('trackingStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'trackingStyles';
        style.textContent = `
            .tracking-section {
                background: var(--glass);
                border: 2px solid var(--gold);
                border-radius: 20px;
                padding: 25px;
                margin-bottom: 25px;
                animation: slideIn 0.3s ease;
            }
            .tracking-header {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                align-items: center;
                margin-bottom: 20px;
            }
            .tracking-header h2 {
                color: var(--gold);
                margin: 0;
                font-size: 20px;
            }
            .tracking-input {
                flex: 1;
                padding: 12px;
                border-radius: 10px;
                border: 1px solid rgba(255,215,0,0.3);
                background: rgba(255,255,255,0.1);
                color: white;
                font-family: 'Cairo', sans-serif;
                min-width: 200px;
            }
            .tracking-input:focus {
                outline: none;
                border-color: var(--gold);
            }
            .tracking-result {
                margin-top: 20px;
            }
            .tracking-timeline {
                position: relative;
                padding: 20px 0;
            }
            .timeline-step {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
                position: relative;
            }
            .timeline-step:not(:last-child):before {
                content: '';
                position: absolute;
                right: 22px;
                top: 40px;
                width: 2px;
                height: calc(100% - 20px);
                background: rgba(255,215,0,0.3);
            }
            .timeline-icon {
                width: 45px;
                height: 45px;
                background: rgba(255,215,0,0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
            }
            .timeline-icon.completed {
                background: #4ade80;
                color: white;
            }
            .timeline-icon.active {
                background: #ffd700;
                color: #000;
                animation: pulse 1s infinite;
            }
            .timeline-content {
                flex: 1;
            }
            .timeline-title {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .timeline-date {
                font-size: 12px;
                color: var(--text-secondary);
            }
            .order-status-card {
                background: rgba(255,215,0,0.1);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .order-status-card h3 {
                color: var(--gold);
                margin-bottom: 15px;
            }
            .status-badge {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            }
            .status-delivered { background: #4ade80; color: #000; }
            .status-shipped { background: #60a5fa; color: #fff; }
            .status-processing { background: #fbbf24; color: #000; }
            .status-pending { background: #f87171; color: #fff; }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    function toggleTrackingSection() {
        const section = document.getElementById('trackingSection');
        if (section) {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    window.trackOrderNumber = function() {
        const trackingNumber = document.getElementById('trackingInput')?.value.trim();
        if (!trackingNumber) {
            showNotification('الرجاء إدخال رقم التتبع', 'warning');
            return;
        }
        
        const orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
        const order = orders.find(o => o.originalOrderId === trackingNumber || o.id?.includes(trackingNumber));
        
        if (!order) {
            showNotification('⚠️ لا يوجد طلب بهذا الرقم', 'error');
            return;
        }
        
        displayTrackingInfo(order);
    };
    
    function displayTrackingInfo(order) {
        const container = document.getElementById('trackingResult');
        if (!container) return;
        
        const statusSteps = [
            { key: 'pending', label: '⏳ تم استلام الطلب', icon: 'fa-clock', date: order.date },
            { key: 'processing', label: '📦 قيد التجهيز', icon: 'fa-box', date: order.processingDate },
            { key: 'shipped', label: '🚚 خرج للتوصيل', icon: 'fa-truck', date: order.shippedDate },
            { key: 'delivered', label: '🏠 تم التوصيل', icon: 'fa-home', date: order.deliveredDate }
        ];
        
        const currentStatus = order.trackingStatus || 'pending';
        const currentIndex = statusSteps.findIndex(s => s.key === currentStatus);
        
        let timelineHTML = '<div class="tracking-timeline">';
        statusSteps.forEach((step, index) => {
            let status = 'pending';
            if (index < currentIndex) status = 'completed';
            if (index === currentIndex) status = 'active';
            
            timelineHTML += `
                <div class="timeline-step">
                    <div class="timeline-icon ${status}">
                        <i class="fas ${step.icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${step.label}</div>
                        <div class="timeline-date">${step.date || 'في انتظار...'}</div>
                    </div>
                </div>
            `;
        });
        timelineHTML += '</div>';
        
        const infoHTML = `
            <div class="order-status-card">
                <h3><i class="fas fa-receipt"></i> تفاصيل الطلب</h3>
                <p><strong>رقم الطلب:</strong> ${order.originalOrderId || order.id}</p>
                <p><strong>التاريخ:</strong> ${order.date}</p>
                <p><strong>المتجر:</strong> ${order.storeName}</p>
                <p><strong>الإجمالي:</strong> ${(order.total || 0).toLocaleString()} دج</p>
                <p><strong>جهة التوصيل:</strong> ${order.distributor || 'سيتم التحديد'}</p>
            </div>
            ${timelineHTML}
        `;
        
        container.innerHTML = infoHTML;
        showNotification('📍 تم العثور على الطلب', 'success');
    }
    
    function enhanceOrderSaving() {
        const originalSaveOrder = window.saveOrderLocally;
        if (originalSaveOrder) {
            window.saveOrderLocally = function(customerData, groupedStores, mainOrderId, timestamp, distributor) {
                const result = originalSaveOrder.apply(this, arguments);
                
                let orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
                orders = orders.map(order => {
                    if (order.originalOrderId === mainOrderId && !order.trackingStatus) {
                        return { 
                            ...order, 
                            trackingStatus: 'pending',
                            processingDate: null,
                            shippedDate: null,
                            deliveredDate: null
                        };
                    }
                    return order;
                });
                localStorage.setItem('nardo_orders', JSON.stringify(orders));
                
                return result;
            };
        }
    }
    
    function startTrackingUpdates() {
        if (state.trackingInterval) clearInterval(state.trackingInterval);
        
        state.trackingInterval = setInterval(() => {
            updateOrdersStatus();
        }, CONFIG.trackingRefreshInterval);
    }
    
    function updateOrdersStatus() {
        let orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
        let updated = false;
        
        orders = orders.map(order => {
            if (order.trackingStatus === 'pending' && shouldUpdateStatus(order)) {
                updated = true;
                return { ...order, trackingStatus: 'processing', processingDate: new Date().toLocaleString() };
            }
            return order;
        });
        
        if (updated) {
            localStorage.setItem('nardo_orders', JSON.stringify(orders));
            showNotification('📢 تم تحديث حالة طلبك', 'info');
        }
    }
    
    function shouldUpdateStatus(order) {
        const orderDate = new Date(order.date);
        const now = new Date();
        const diffMinutes = (now - orderDate) / 1000 / 60;
        return diffMinutes > 5;
    }
    
    window.closeTracking = function() {
        const section = document.getElementById('trackingSection');
        if (section) section.style.display = 'none';
    };
    
    // ============================================
    // 2. لوحة التحكم والإحصائيات 📊
    // ============================================
    function initDashboard() {
        addDashboardButton();
        createDashboardModal();
    }
    
    function addDashboardButton() {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo || document.querySelector('.dashboard-btn')) return;
        
        const dashboardBtn = document.createElement('div');
        dashboardBtn.className = 'info-item dashboard-btn';
        dashboardBtn.innerHTML = '<i class="fas fa-chart-line"></i><span>لوحة التحكم</span>';
        dashboardBtn.onclick = () => showDashboard();
        headerInfo.appendChild(dashboardBtn);
    }
    
    function createDashboardModal() {
        if (document.getElementById('dashboardModal')) return;
        
        const modalHTML = `
            <div id="dashboardModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 700px;">
                    <h2><i class="fas fa-chart-line"></i> لوحة التحكم</h2>
                    <div id="dashboardContent"></div>
                    <div class="modal-buttons">
                        <button class="btn btn-outline" onclick="closeDashboard()">إغلاق</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    window.showDashboard = function() {
        const orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
        const cart = window.cart || [];
        
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingOrders = orders.filter(o => o.trackingStatus === 'pending').length;
        const completedOrders = orders.filter(o => o.trackingStatus === 'delivered').length;
        const uniqueStores = new Set(orders.map(o => o.storeID)).size;
        
        const dashboardHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="dashboard-stat-card">
                    <i class="fas fa-shopping-bag"></i>
                    <span>${totalOrders}</span>
                    <small>إجمالي الطلبات</small>
                </div>
                <div class="dashboard-stat-card">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${totalSpent.toLocaleString()}</span>
                    <small>إجمالي المشتريات</small>
                </div>
                <div class="dashboard-stat-card">
                    <i class="fas fa-clock"></i>
                    <span>${pendingOrders}</span>
                    <small>قيد التنفيذ</small>
                </div>
                <div class="dashboard-stat-card">
                    <i class="fas fa-check-circle"></i>
                    <span>${completedOrders}</span>
                    <small>مكتملة</small>
                </div>
            </div>
            <div style="background: rgba(255,215,0,0.1); border-radius: 15px; padding: 20px;">
                <h3><i class="fas fa-chart-pie"></i> إحصائيات إضافية</h3>
                <p>🏪 عدد المتاجر: ${uniqueStores}</p>
                <p>📦 متوسط قيمة الطلب: ${totalOrders ? Math.round(totalSpent / totalOrders).toLocaleString() : 0} دج</p>
                <p>⭐ تقييمك: ${calculateAverageRating()} / 5</p>
                <button class="btn btn-gold" style="margin-top: 15px;" onclick="exportReport()">
                    <i class="fas fa-download"></i> تصدير التقرير
                </button>
            </div>
        `;
        
        // إضافة ستايل البطاقات
        if (!document.getElementById('dashboardStyles')) {
            const style = document.createElement('style');
            style.id = 'dashboardStyles';
            style.textContent = `
                .dashboard-stat-card {
                    background: var(--glass);
                    border: 1px solid rgba(255,215,0,0.2);
                    border-radius: 15px;
                    padding: 20px;
                    text-align: center;
                    transition: all 0.3s;
                }
                .dashboard-stat-card:hover {
                    transform: translateY(-5px);
                }
                .dashboard-stat-card i {
                    font-size: 30px;
                    color: var(--gold);
                    margin-bottom: 10px;
                    display: block;
                }
                .dashboard-stat-card span {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--gold);
                    display: block;
                }
                .dashboard-stat-card small {
                    font-size: 12px;
                    color: var(--text-secondary);
                }
            `;
            document.head.appendChild(style);
        }
        
        document.getElementById('dashboardContent').innerHTML = dashboardHTML;
        document.getElementById('dashboardModal').style.display = 'flex';
    };
    
    function calculateAverageRating() {
        const ratings = JSON.parse(localStorage.getItem('nardo_ratings') || '[]');
        if (ratings.length === 0) return 0;
        const sum = ratings.reduce((s, r) => s + r.rating, 0);
        return (sum / ratings.length).toFixed(1);
    }
    
    window.closeDashboard = function() {
        document.getElementById('dashboardModal').style.display = 'none';
    };
    
    window.exportReport = function() {
        const orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
        const ratings = JSON.parse(localStorage.getItem('nardo_ratings') || '[]');
        
        const report = {
            generatedAt: new Date().toISOString(),
            totalOrders: orders.length,
            totalSpent: orders.reduce((s, o) => s + (o.total || 0), 0),
            averageRating: calculateAverageRating(),
            orders: orders,
            ratings: ratings
        };
        
        const dataStr = JSON.stringify(report, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `nardo-report-${Date.now()}.json`);
        linkElement.click();
        
        showNotification('✅ تم تصدير التقرير بنجاح', 'success');
    };
    
    // ============================================
    // 3. إشعارات سطح المكتب 🔔
    // ============================================
    function initDesktopNotifications() {
        if (!CONFIG.enableDesktopNotifications) return;
        
        if ('Notification' in window && Notification.permission === 'default') {
            const notifyBtn = document.createElement('div');
            notifyBtn.className = 'info-item';
            notifyBtn.innerHTML = '<i class="fas fa-bell"></i><span>تفعيل الإشعارات</span>';
            notifyBtn.onclick = async () => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    showNotification('✅ تم تفعيل الإشعارات', 'success');
                    notifyBtn.remove();
                }
            };
            
            const headerInfo = document.querySelector('.header-info');
            if (headerInfo && !document.querySelector('.notify-btn')) {
                headerInfo.appendChild(notifyBtn);
            }
        }
    }
    
    function sendNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🛍️ ${title}`, { body });
        }
        playSound();
    }
    
    // ============================================
    // 4. الوضع الليلي 🌙
    // ============================================
    function initTheme() {
        addThemeButton();
        loadSavedTheme();
    }
    
    function addThemeButton() {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo || document.querySelector('.theme-btn')) return;
        
        const themeBtn = document.createElement('div');
        themeBtn.className = 'info-item theme-btn';
        themeBtn.innerHTML = '<i class="fas fa-moon"></i><span>وضع ليلي</span>';
        themeBtn.onclick = () => toggleTheme();
        headerInfo.appendChild(themeBtn);
    }
    
    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('nardo_theme', isDark ? 'dark' : 'light');
        
        const btn = document.querySelector('.theme-btn');
        if (btn) {
            btn.innerHTML = isDark ? '<i class="fas fa-sun"></i><span>وضع نهاري</span>' : '<i class="fas fa-moon"></i><span>وضع ليلي</span>';
        }
        
        showNotification(isDark ? '🌙 الوضع الليلي مفعل' : '☀️ الوضع النهاري مفعل', 'info');
    }
    
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('nardo_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const btn = document.querySelector('.theme-btn');
            if (btn) btn.innerHTML = '<i class="fas fa-sun"></i><span>وضع نهاري</span>';
        }
    }
    
    // ============================================
    // 5. النسخ الاحتياطي 💾
    // ============================================
    function initBackup() {
        addBackupButton();
    }
    
    function addBackupButton() {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo || document.querySelector('.backup-btn')) return;
        
        const backupBtn = document.createElement('div');
        backupBtn.className = 'info-item backup-btn';
        backupBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>نسخ احتياطي</span>';
        backupBtn.onclick = () => showBackupMenu();
        headerInfo.appendChild(backupBtn);
    }
    
    function showBackupMenu() {
        const menuHTML = `
            <div id="backupMenu" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--secondary); padding: 25px; border-radius: 20px; border: 2px solid var(--gold); z-index: 4000; min-width: 300px;">
                <h3><i class="fas fa-cloud-upload-alt"></i> النسخ الاحتياطي</h3>
                <button class="btn btn-gold" style="margin: 10px 0; width: 100%;" onclick="backupToLocal()">
                    <i class="fas fa-download"></i> نسخ احتياطي
                </button>
                <button class="btn btn-outline" style="margin: 10px 0; width: 100%;" onclick="restoreFromBackup()">
                    <i class="fas fa-upload"></i> استعادة نسخة
                </button>
                <button class="btn btn-danger" style="margin: 10px 0; width: 100%;" onclick="closeBackupMenu()">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        `;
        
        const existing = document.getElementById('backupMenu');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }
    
    window.backupToLocal = function() {
        const data = {
            cart: window.cart || [],
            orders: JSON.parse(localStorage.getItem('nardo_orders') || '[]'),
            ratings: JSON.parse(localStorage.getItem('nardo_ratings') || '[]'),
            backupDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nardo-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('✅ تم إنشاء النسخة الاحتياطية', 'success');
        closeBackupMenu();
    };
    
    window.restoreFromBackup = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.cart && window.cart) window.cart = data.cart;
                    if (data.orders) localStorage.setItem('nardo_orders', JSON.stringify(data.orders));
                    if (data.ratings) localStorage.setItem('nardo_ratings', JSON.stringify(data.ratings));
                    
                    if (typeof window.saveCart === 'function') window.saveCart();
                    if (typeof window.updateCartDisplay === 'function') window.updateCartDisplay();
                    if (typeof window.renderOrdersArchive === 'function') window.renderOrdersArchive();
                    
                    showNotification('✅ تم استعادة البيانات بنجاح، سيتم تحديث الصفحة', 'success');
                    setTimeout(() => location.reload(), 1500);
                } catch (error) {
                    showNotification('❌ ملف غير صالح', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
        closeBackupMenu();
    };
    
    window.closeBackupMenu = function() {
        document.getElementById('backupMenu')?.remove();
    };
    
    // ============================================
    // 6. الحفظ التلقائي 💾
    // ============================================
    function initAutoSave() {
        if (state.autoSaveInterval) clearInterval(state.autoSaveInterval);
        
        state.autoSaveInterval = setInterval(() => {
            const cart = window.cart || [];
            if (cart.length > 0 && typeof window.saveCart === 'function') {
                window.saveCart();
                console.log('🔄 تم الحفظ التلقائي');
            }
        }, CONFIG.autoSaveInterval);
        
        window.addEventListener('beforeunload', () => {
            const cart = window.cart || [];
            if (cart.length > 0 && typeof window.saveCart === 'function') {
                window.saveCart();
            }
        });
    }
    
    // ============================================
    // 7. نظام التقييم ⭐
    // ============================================
    function initRatingSystem() {
        createRatingModal();
        addRatingWidget();
    }
    
    function createRatingModal() {
        if (document.getElementById('ratingModal')) return;
        
        const modalHTML = `
            <div id="ratingModal" class="modal" style="display: none;">
                <div class="modal-content" style="text-align: center;">
                    <h3>⭐ كيف تقيم تجربتك؟</h3>
                    <div id="ratingStars" style="display: flex; justify-content: center; gap: 10px; margin: 20px 0;">
                        <i class="far fa-star" data-rating="1" style="font-size: 35px; cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="2" style="font-size: 35px; cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="3" style="font-size: 35px; cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="4" style="font-size: 35px; cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="5" style="font-size: 35px; cursor: pointer;"></i>
                    </div>
                    <textarea id="ratingComment" placeholder="ملاحظاتك تساعدنا للتطوير..." rows="3" style="width: 100%; margin: 15px 0; padding: 10px; border-radius: 10px;"></textarea>
                    <div style="display: flex; gap: 15px;">
                        <button id="submitRatingBtn" class="btn btn-gold">إرسال التقييم</button>
                        <button id="closeRatingBtn" class="btn btn-outline">تخطي</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // تهيئة نجوم التقييم
        const stars = document.querySelectorAll('#ratingStars i');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                state.currentRating = parseInt(this.dataset.rating);
                stars.forEach(s => {
                    s.classList.remove('fas', 'active');
                    s.classList.add('far');
                });
                for (let i = 0; i < state.currentRating; i++) {
                    stars[i].classList.remove('far');
                    stars[i].classList.add('fas', 'active');
                }
            });
        });
        
        document.getElementById('submitRatingBtn')?.addEventListener('click', () => {
            if (state.currentRating === 0) {
                showNotification('⭐ الرجاء اختيار تقييم', 'warning');
                return;
            }
            const comment = document.getElementById('ratingComment').value;
            const ratings = JSON.parse(localStorage.getItem('nardo_ratings') || '[]');
            ratings.push({ rating: state.currentRating, comment, date: new Date().toISOString() });
            localStorage.setItem('nardo_ratings', JSON.stringify(ratings));
            showNotification(`شكراً لتقييمك ${'⭐'.repeat(state.currentRating)}`, 'success');
            document.getElementById('ratingModal').style.display = 'none';
            document.getElementById('ratingComment').value = '';
            state.currentRating = 0;
        });
        
        document.getElementById('closeRatingBtn')?.addEventListener('click', () => {
            document.getElementById('ratingModal').style.display = 'none';
        });
    }
    
    function addRatingWidget() {
        const widgetHTML = `
            <div id="ratingWidget" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: none;">
                <div style="background: var(--gold); color: #000; padding: 10px 20px; border-radius: 50px; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                    <i class="fas fa-star"></i> قيم تجربتك
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        const widget = document.getElementById('ratingWidget');
        if (widget) {
            widget.onclick = () => {
                document.getElementById('ratingModal').style.display = 'flex';
            };
            
            // إظهار بعد 3 زيارات
            const visits = parseInt(localStorage.getItem('nardo_visits') || '0');
            if (visits >= 2) {
                setTimeout(() => widget.style.display = 'block', 5000);
            }
        }
        
        // زيادة عدد الزيارات
        let visits = parseInt(localStorage.getItem('nardo_visits') || '0');
        visits++;
        localStorage.setItem('nardo_visits', visits.toString());
    }
    
    // ============================================
    // 8. اختصارات لوحة المفاتيح ⌨️
    // ============================================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const cart = window.cart || [];
            
            // Ctrl + C: مسح السلة
            if (e.ctrlKey && e.key === 'c') {
                if (cart.length > 0 && confirm('مسح السلة؟')) {
                    if (typeof window.clearCart === 'function') window.clearCart();
                }
            }
            
            // Ctrl + P: فتح الدفع
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                if (cart.length > 0 && typeof window.openCustomerModal === 'function') {
                    window.openCustomerModal();
                }
            }
            
            // Ctrl + Shift + T: فتح التتبع
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                toggleTrackingSection();
                showNotification('⌨️ فتح لوحة التتبع', 'info');
            }
            
            // Ctrl + Shift + D: فتح لوحة التحكم
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                window.showDashboard();
            }
            
            // Ctrl + Shift + B: نسخ احتياطي
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                window.backupToLocal();
            }
            
            // Esc: إغلاق النوافذ
            if (e.key === 'Escape') {
                document.getElementById('customerModal')?.style.display = 'none';
                document.getElementById('dashboardModal')?.style.display = 'none';
                document.getElementById('ratingModal')?.style.display = 'none';
                document.getElementById('backupMenu')?.remove();
            }
        });
    }
    
    // ============================================
    // 9. إحصائيات السلة 📊
    // ============================================
    function initCartStats() {
        const cartContainer = document.getElementById('cartContainer');
        if (!cartContainer) return;
        
        const observer = new MutationObserver(() => updateStatsDisplay());
        observer.observe(cartContainer, { childList: true, subtree: true });
        
        function updateStatsDisplay() {
            let statsContainer = document.getElementById('cartStatsContainer');
            if (!statsContainer && cartContainer.parentElement) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'cartStatsContainer';
                statsContainer.style.marginBottom = '20px';
                cartContainer.parentElement.insertBefore(statsContainer, cartContainer);
            }
            
            const cart = window.cart || [];
            if (statsContainer) {
                if (cart.length === 0) {
                    statsContainer.innerHTML = '';
                    return;
                }
                
                const uniqueStores = new Set(cart.map(i => i.storeID)).size;
                const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
                
                statsContainer.innerHTML = `
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="info-item" style="flex: 1; justify-content: center;">
                            <i class="fas fa-store"></i>
                            <span><strong>${uniqueStores}</strong> متاجر</span>
                        </div>
                        <div class="info-item" style="flex: 1; justify-content: center;">
                            <i class="fas fa-boxes"></i>
                            <span><strong>${totalItems}</strong> قطع</span>
                        </div>
                        <div class="info-item" style="flex: 1; justify-content: center;">
                            <i class="fas fa-tag"></i>
                            <span><strong>${cart.length}</strong> منتج فريد</span>
                        </div>
                    </div>
                `;
            }
        }
        
        setTimeout(updateStatsDisplay, 100);
    }
    
    // ============================================
    // 10. زر مشاركة السلة 🔗
    // ============================================
    function initShareCart() {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo || document.querySelector('.share-cart-btn')) return;
        
        const shareBtn = document.createElement('div');
        shareBtn.className = 'info-item share-cart-btn';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i><span>مشاركة السلة</span>';
        shareBtn.onclick = () => {
            const cart = window.cart || [];
            if (cart.length === 0) {
                showNotification('⚠️ السلة فارغة، أضف منتجات أولاً', 'warning');
                return;
            }
            
            const cartData = btoa(JSON.stringify(cart.map(item => ({ id: item.id, quantity: item.quantity }))));
            const shareUrl = `${window.location.origin}${window.location.pathname}?cart=${cartData}`;
            navigator.clipboard.writeText(shareUrl);
            showNotification('✅ تم نسخ رابط السلة! يمكنك مشاركته', 'success');
        };
        
        const clearCartBtn = Array.from(headerInfo.children).find(el => el.innerText.includes('مسح الكل'));
        if (clearCartBtn) {
            headerInfo.insertBefore(shareBtn, clearCartBtn);
        } else {
            headerInfo.appendChild(shareBtn);
        }
    }
    
    // ============================================
    // 11. تحسين صحة رقم الهاتف 📞
    // ============================================
    function initPhoneValidation() {
        const phoneInput = document.getElementById('customerPhone');
        if (!phoneInput) return;
        
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
        });
        
        const originalSubmitOrder = window.submitOrder;
        if (originalSubmitOrder) {
            window.submitOrder = async function() {
                const phone = document.getElementById('customerPhone')?.value.trim();
                const phoneRegex = /^(05|06|07)[0-9]{8}$/;
                if (phone && !phoneRegex.test(phone)) {
                    showNotification('رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05،06،07)', 'error');
                    return false;
                }
                return originalSubmitOrder.apply(this, arguments);
            };
        }
    }
    
    // ============================================
    // 12. منع الإرسال المتكرر 🚫
    // ============================================
    function initPreventDoubleSubmit() {
        const originalSubmitOrder = window.submitOrder;
        if (originalSubmitOrder) {
            window.submitOrder = async function() {
                if (state.isSubmitting) {
                    showNotification('جاري معالجة طلب سابق...', 'warning');
                    return false;
                }
                state.isSubmitting = true;
                try {
                    const result = await originalSubmitOrder.apply(this, arguments);
                    return result;
                } finally {
                    setTimeout(() => { state.isSubmitting = false; }, 3000);
                }
            };
        }
    }
    
    // ============================================
    // 13. إعادة الطلب من الأرشيف 🔄
    // ============================================
    function initReorderButton() {
        const archiveContainer = document.getElementById('ordersArchiveContainer');
        if (!archiveContainer) return;
        
        const observer = new MutationObserver(() => {
            document.querySelectorAll('.order-card').forEach(card => {
                if (card.querySelector('.reorder-btn')) return;
                
                const reorderBtn = document.createElement('button');
                reorderBtn.className = 'reorder-btn';
                reorderBtn.style.cssText = `
                    margin-top: 10px;
                    padding: 5px 15px;
                    background: rgba(255, 215, 0, 0.2);
                    border: 1px solid #ffd700;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #ffd700;
                    transition: all 0.3s;
                `;
                reorderBtn.innerHTML = '<i class="fas fa-redo"></i> إعادة الطلب';
                reorderBtn.onclick = (e) => {
                    e.stopPropagation();
                    const orderIdElem = card.querySelector('.order-id');
                    if (orderIdElem) {
                        const orderId = orderIdElem.innerText.replace('#', '');
                        reorderFromArchive(orderId);
                    }
                };
                reorderBtn.onmouseenter = () => reorderBtn.style.background = '#ffd700';
                reorderBtn.onmouseleave = () => reorderBtn.style.background = 'rgba(255, 215, 0, 0.2)';
                card.appendChild(reorderBtn);
            });
        });
        
        observer.observe(archiveContainer, { childList: true, subtree: true });
    }
    
    function reorderFromArchive(orderId) {
        const orders = JSON.parse(localStorage.getItem('nardo_orders') || '[]');
        const order = orders.find(o => o.id === orderId || o.originalOrderId === orderId);
        
        if (order && order.items) {
            order.items.forEach(item => {
                if (typeof window.addToCart === 'function') {
                    window.addToCart({
                        id: item.id + '_' + Date.now(),
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        storeID: item.storeID,
                        storeName: item.storeName,
                        productCompositeID: item.productCompositeID
                    });
                }
            });
            showNotification('✓ تم إعادة الطلب للسلة', 'success');
            if (typeof window.updateCartDisplay === 'function') window.updateCartDisplay();
        } else {
            showNotification('⚠️ لا يمكن إعادة هذا الطلب', 'error');
        }
    }
    
    // ============================================
    // 14. تأثيرات حركية ✨
    // ============================================
    function initAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .cart-item {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            .cart-item:hover {
                transform: translateX(-5px) !important;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2) !important;
            }
            .merchant-section {
                transition: all 0.3s ease !important;
            }
            .merchant-section:hover {
                transform: translateX(-5px) !important;
            }
            .info-item {
                transition: all 0.3s ease !important;
            }
            .info-item:hover {
                transform: translateY(-2px) !important;
            }
            .btn-gold:active {
                animation: btnPulse 0.3s ease !important;
            }
            @keyframes btnPulse {
                0% { transform: scale(1); }
                50% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }
            .order-card {
                transition: all 0.3s ease !important;
            }
            .order-card:hover {
                transform: translateX(-5px) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ============================================
    // 15. مؤشر الكتابة ✍️
    // ============================================
    function initTypingIndicator() {
        const addressInput = document.getElementById('customerAddress');
        if (!addressInput) return;
        
        let typingTimeout;
        addressInput.addEventListener('input', () => {
            let indicator = document.getElementById('typingIndicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'typingIndicator';
                indicator.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: #ffd700;
                    color: #000;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-size: 12px;
                    z-index: 2000;
                    animation: slideIn 0.3s ease;
                `;
                indicator.textContent = '✍️ جاري الكتابة...';
                document.body.appendChild(indicator);
            }
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                document.getElementById('typingIndicator')?.remove();
            }, 1000);
        });
    }
    
    // ============================================
    // 16. تقارير أسبوعية 📅
    // ============================================
    function initWeeklyReport() {
        const lastReport = localStorage.getItem('nardo_last_report');
        const now = Date.now();
        
        if (!lastReport || (now - parseInt(lastReport)) > 604800000) {
            const analytics = JSON.parse(localStorage.getItem('nardo_analytics') || '{"views":0,"addToCart":0,"orders":0}');
            const report = `📊 تقرير أسبوعي\n👀 زيارات: ${analytics.views || 0}\n🛒 إضافات: ${analytics.addToCart || 0}\n📦 طلبات: ${analytics.orders || 0}`;
            console.log('📊 التقرير الأسبوعي:', report);
            localStorage.setItem('nardo_last_report', now.toString());
        }
        
        // تتبع الإحصائيات
        const originalAddToCart = window.addToCart;
        if (originalAddToCart) {
            window.addToCart = function(product) {
                const result = originalAddToCart.apply(this, arguments);
                const analytics = JSON.parse(localStorage.getItem('nardo_analytics') || '{"views":0,"addToCart":0,"orders":0}');
                analytics.addToCart = (analytics.addToCart || 0) + 1;
                localStorage.setItem('nardo_analytics', JSON.stringify(analytics));
                return result;
            };
        }
    }
    
    // ============================================
    // دوال مساعدة
    // ============================================
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            max-width: 400px;
            margin: 0 auto;
            padding: 15px 25px;
            border-radius: 12px;
            font-weight: bold;
            z-index: 2000;
            animation: slideIn 0.3s ease;
            text-align: center;
            background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
            color: ${type === 'success' || type === 'warning' ? '#000' : '#fff'};
        `;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    function playSound() {
        if (!CONFIG.enableSound) return;
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch(e) {}
    }
    
    // بدء التهيئة
    init();
    
})();

