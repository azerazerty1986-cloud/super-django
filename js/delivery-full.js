/* ================================================================== */
/* ===== [08] نظام التوصيل المتكامل - ناردو برو ===== */
/* ================================================================== */

(function() {
    'use strict';
    
    console.log('🚚 [نظام التوصيل] بدء التهيئة...');

    // ===== 1. نظام التوصيل الأساسي =====
    window.DeliverySystem = {
        zones: [
            { name: 'الجزائر وسط', price: 500, days: '1-2 أيام' },
            { name: 'الجزائر شرق', price: 600, days: '1-2 أيام' },
            { name: 'الجزائر غرب', price: 600, days: '1-2 أيام' },
            { name: 'وهران', price: 800, days: '2-3 أيام' },
            { name: 'قسنطينة', price: 800, days: '2-3 أيام' },
            { name: 'عنابة', price: 700, days: '2-3 أيام' },
            { name: 'تلمسان', price: 900, days: '3-4 أيام' },
            { name: 'باقي الولايات', price: 1000, days: '3-5 أيام' }
        ],
        
        deliveries: [],
        
        getZonePrice: function(zoneName) {
            const zone = this.zones.find(z => z.name === zoneName);
            return zone ? zone.price : 1000;
        },
        
        getZoneDays: function(zoneName) {
            const zone = this.zones.find(z => z.name === zoneName);
            return zone ? zone.days : '3-5 أيام';
        },
        
        saveDelivery: function(delivery) {
            this.deliveries = JSON.parse(localStorage.getItem('nardoo_deliveries') || '[]');
            this.deliveries.unshift(delivery);
            localStorage.setItem('nardoo_deliveries', JSON.stringify(this.deliveries.slice(0, 100)));
        },
        
        getStats: function() {
            const deliveries = JSON.parse(localStorage.getItem('nardoo_deliveries') || '[]');
            return {
                total: deliveries.length,
                pending: deliveries.filter(d => d.status === 'pending').length,
                completed: deliveries.filter(d => d.status === 'completed').length,
                totalEarnings: deliveries.reduce((sum, d) => sum + (d.shipping || 0), 0)
            };
        }
    };

    // ===== 2. دالة عرض نافذة التوصيل =====
    window.showDeliveryCheckout = function() {
        console.log('🚚 فتح نافذة التوصيل');
        
        // حساب إجمالي المنتجات
        let subtotal = 0;
        let cartItems = [];
        
        if (window.cart && window.cart.length > 0) {
            cartItems = window.cart;
            subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else {
            // محاولة الحصول على السلة من localStorage
            const savedCart = localStorage.getItem('nardoo_cart');
            if (savedCart) {
                cartItems = JSON.parse(savedCart);
                subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
        }
        
        if (cartItems.length === 0) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('🛒 السلة فارغة!', 'warning');
            } else {
                alert('السلة فارغة! أضف منتجات أولاً');
            }
            return;
        }
        
        // إنشاء النافذة
        const modal = document.createElement('div');
        modal.id = 'deliveryCheckoutModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            backdrop-filter: blur(10px);
            z-index: 200000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s ease;
        `;
        
        // خيارات المناطق
        let zonesHtml = '';
        DeliverySystem.zones.forEach(zone => {
            zonesHtml += `<option value="${zone.name}" data-price="${zone.price}" data-days="${zone.days}">${zone.name} - ${zone.price.toLocaleString()} دج (${zone.days})</option>`;
        });
        
        const currentUser = window.currentUser || {};
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 30px; padding: 30px; max-width: 550px; width: 90%; max-height: 85vh; overflow-y: auto; border: 2px solid #ffd700; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <h2 style="color: #ffd700; text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-truck"></i> إتمام الطلب مع التوصيل
                </h2>
                
                <!-- معلومات العميل -->
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-user"></i> الاسم الكامل <span style="color: red;">*</span>
                    </label>
                    <input type="text" id="deliveryName" value="${currentUser.name || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-phone"></i> رقم الهاتف <span style="color: red;">*</span>
                    </label>
                    <input type="tel" id="deliveryPhone" value="${currentUser.phone || ''}" 
                           style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none;">
                </div>
                
                <!-- منطقة التوصيل -->
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-map-marker-alt"></i> منطقة التوصيل <span style="color: red;">*</span>
                    </label>
                    <select id="deliveryZoneSelect" 
                            style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none;">
                        ${zonesHtml}
                    </select>
                </div>
                
                <!-- العنوان التفصيلي -->
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-location-dot"></i> العنوان التفصيلي <span style="color: red;">*</span>
                    </label>
                    <textarea id="deliveryAddress" rows="3" 
                              style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none; resize: vertical;"
                              placeholder="الشارع، رقم البناء، الطابق، معلم قريب..."></textarea>
                </div>
                
                <!-- وقت التوصيل -->
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-clock"></i> وقت التوصيل المفضل
                    </label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <label style="flex: 1; text-align: center; padding: 8px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="asap" checked> في أقرب وقت
                        </label>
                        <label style="flex: 1; text-align: center; padding: 8px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="morning"> الصباح
                        </label>
                        <label style="flex: 1; text-align: center; padding: 8px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="afternoon"> بعد الظهر
                        </label>
                        <label style="flex: 1; text-align: center; padding: 8px; background: rgba(255,215,0,0.1); border-radius: 10px; cursor: pointer;">
                            <input type="radio" name="deliveryTime" value="evening"> المساء
                        </label>
                    </div>
                </div>
                
                <!-- ملاحظات -->
                <div style="margin-bottom: 20px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-sticky-note"></i> ملاحظات إضافية
                    </label>
                    <textarea id="deliveryNotes" rows="2" 
                              style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none; resize: vertical;"
                              placeholder="تعليمات التوصيل..."></textarea>
                </div>
                
                <!-- ملخص الطلب -->
                <div id="deliverySummary" style="background: rgba(255,215,0,0.15); padding: 20px; border-radius: 15px; margin: 20px 0;">
                    <div style="text-align: center; color: #ffd700;">جاري حساب الملخص...</div>
                </div>
                
                <!-- الأزرار -->
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button onclick="document.getElementById('deliveryCheckoutModal').remove()" 
                            style="flex: 1; padding: 15px; background: #f87171; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                    <button id="confirmDeliveryBtn" 
                            style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffb700); color: #000; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-check-circle"></i> تأكيد الطلب
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // إضافة تأثيرات CSS
        if (!document.getElementById('deliveryAnimationStyles')) {
            const style = document.createElement('style');
            style.id = 'deliveryAnimationStyles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // تحديث الملخص
        const updateSummary = () => {
            const select = document.getElementById('deliveryZoneSelect');
            const selectedOption = select.options[select.selectedIndex];
            const zonePrice = parseInt(selectedOption.dataset.price) || 1000;
            const estimatedDays = selectedOption.dataset.days || '3-5 أيام';
            const total = subtotal + zonePrice;
            
            const summaryDiv = document.getElementById('deliverySummary');
            summaryDiv.innerHTML = `
                <h4 style="color: #ffd700; margin-bottom: 15px; text-align: center;">📊 ملخص الطلب</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🛍️ إجمالي المنتجات:</span>
                    <span><strong>${subtotal.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🚚 رسوم التوصيل:</span>
                    <span><strong>${zonePrice.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>⏰ المدة المتوقعة:</span>
                    <span><strong>${estimatedDays}</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid #ffd700;">
                    <span style="font-size: 18px;">💎 الإجمالي النهائي:</span>
                    <span style="font-size: 22px; color: #ffd700; font-weight: bold;">${total.toLocaleString()} دج</span>
                </div>
            `;
        };
        
        const zoneSelect = document.getElementById('deliveryZoneSelect');
        if (zoneSelect) {
            zoneSelect.addEventListener('change', updateSummary);
        }
        updateSummary();
        
        // زر التأكيد
        document.getElementById('confirmDeliveryBtn').onclick = async () => {
            const customerName = document.getElementById('deliveryName').value;
            const customerPhone = document.getElementById('deliveryPhone').value;
            const deliveryZone = document.getElementById('deliveryZoneSelect').value;
            const customerAddress = document.getElementById('deliveryAddress').value;
            const deliveryTime = document.querySelector('input[name="deliveryTime"]:checked')?.value || 'asap';
            const notes = document.getElementById('deliveryNotes').value;
            
            if (!customerName || !customerPhone || !customerAddress) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                } else {
                    alert('يرجى ملء جميع الحقول المطلوبة');
                }
                return;
            }
            
            const select = document.getElementById('deliveryZoneSelect');
            const selectedOption = select.options[select.selectedIndex];
            const shipping = parseInt(selectedOption.dataset.price) || 1000;
            const estimatedDays = selectedOption.dataset.days || '3-5 أيام';
            const total = subtotal + shipping;
            const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const orderDate = new Date().toLocaleString('ar-EG');
            
            const timeText = deliveryTime === 'asap' ? 'في أقرب وقت' : 
                             deliveryTime === 'morning' ? 'الصباح (8ص-12م)' :
                             deliveryTime === 'afternoon' ? 'بعد الظهر (12م-4م)' : 'المساء (4م-8م)';
            
            // تفاصيل المنتجات
            let productsDetails = '';
            for (const item of cartItems) {
                productsDetails += `• ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} دج = ${(item.price * item.quantity).toLocaleString()} دج\n`;
            }
            
            // رسالة الطلب للتلغرام
            const message = `
🟢 <b>طلب جديد مع التوصيل - ناردو برو</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>رقم الطلب:</b> <code>${orderId}</code>
🕐 <b>تاريخ الطلب:</b> ${orderDate}

👤 <b>معلومات العميل:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerName}
├ 📞 <b>الهاتف:</b> ${customerPhone}
├ 📍 <b>المنطقة:</b> ${deliveryZone}
├ 🏠 <b>العنوان:</b> ${customerAddress}
├ ⏰ <b>وقت التوصيل:</b> ${timeText}
└ 📝 <b>ملاحظات:</b> ${notes || 'لا توجد'}

📦 <b>المنتجات المطلوبة:</b>
${productsDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
🚚 <b>رسوم التوصيل:</b> ${shipping.toLocaleString()} دج
💎 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ <b>الوقت المتوقع للتوصيل:</b> ${estimatedDays}

✅ سيتم التواصل معك قريباً لتأكيد الطلب
            `;
            
            // حفظ التوصيلة
            const delivery = {
                id: `DEL-${Date.now()}`,
                orderId: orderId,
                customerName: customerName,
                customerPhone: customerPhone,
                customerAddress: customerAddress,
                zone: deliveryZone,
                shipping: shipping,
                total: total,
                items: cartItems.length,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            DeliverySystem.saveDelivery(delivery);
            
            // إرسال إلى تلغرام
            let telegramSent = false;
            if (window.TELEGRAM && window.TELEGRAM.botToken) {
                try {
                    const response = await fetch(`https://api.telegram.org/bot${window.TELEGRAM.botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: window.TELEGRAM.channelId,
                            text: message,
                            parse_mode: 'HTML'
                        })
                    });
                    const result = await response.json();
                    if (result.ok) telegramSent = true;
                } catch(e) {
                    console.error('❌ خطأ في إرسال التلغرام:', e);
                }
            }
            
            // تفريغ السلة
            if (typeof window.cart !== 'undefined') {
                window.cart = [];
            }
            localStorage.setItem('nardoo_cart', JSON.stringify([]));
            if (typeof window.saveCart === 'function') window.saveCart();
            if (typeof window.updateCartCounter === 'function') window.updateCartCounter();
            if (typeof window.toggleCart === 'function') window.toggleCart();
            
            // إغلاق النافذة
            modal.remove();
            
            // عرض نافذة النجاح
            showSuccessModal(orderId, total, estimatedDays, telegramSent);
            
            console.log(`✅ تم إنشاء الطلب: ${orderId} - الإجمالي: ${total} دج`);
        };
    };
    
    // ===== 3. نافذة النجاح =====
    function showSuccessModal(orderId, total, estimatedDays, telegramSent) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); backdrop-filter: blur(10px);
            z-index: 200001; display: flex; justify-content: center; align-items: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 30px; padding: 40px; text-align: center; border: 2px solid #ffd700; max-width: 400px; animation: slideUp 0.3s ease;">
                <div style="font-size: 70px; margin-bottom: 15px;">🎉🚚</div>
                <h2 style="color: #ffd700; margin-bottom: 15px;">تم استلام طلبك بنجاح!</h2>
                <p style="color: white; margin-bottom: 10px;">
                    <strong>رقم الطلب:</strong><br>
                    <code style="background: rgba(255,215,0,0.2); padding: 8px 15px; border-radius: 8px; font-size: 14px;">${orderId}</code>
                </p>
                <p style="color: white; margin-bottom: 10px;">
                    <strong>الإجمالي:</strong> ${total.toLocaleString()} دج
                </p>
                <p style="color: white; margin-bottom: 20px;">
                    <strong>الوقت المتوقع:</strong> ${estimatedDays}
                </p>
                <div style="background: rgba(255,215,0,0.1); border-radius: 15px; padding: 10px; margin-bottom: 20px;">
                    <p style="color: #ffd700; font-size: 12px;">
                        <i class="fas ${telegramSent ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${telegramSent ? 'تم إرسال الطلب إلى التلغرام' : 'سيتم إرسال الطلب قريباً'}
                    </p>
                </div>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: #ffd700; color: #000; padding: 12px 30px; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; font-size: 16px;">
                    <i class="fas fa-check"></i> حسناً
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // إغلاق تلقائي بعد 5 ثواني
        setTimeout(() => {
            if (modal.parentElement) modal.remove();
        }, 5000);
    }
    
    // ===== 4. استبدال دالة إتمام الطلب =====
    const originalCheckout = window.checkoutCart;
    
    window.checkoutCart = function() {
        console.log('🚚 [نظام التوصيل] تم استدعاء checkoutCart');
        
        // التحقق من السلة
        let cartEmpty = true;
        if (window.cart && window.cart.length > 0) {
            cartEmpty = false;
        } else {
            const savedCart = localStorage.getItem('nardoo_cart');
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (parsed && parsed.length > 0) cartEmpty = false;
            }
        }
        
        if (cartEmpty) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('🛒 السلة فارغة! أضف منتجات أولاً', 'warning');
            } else {
                alert('السلة فارغة! أضف منتجات أولاً');
            }
            return;
        }
        
        // التحقق من تسجيل الدخول
        if (!window.currentUser) {
            if (typeof window.openLoginModal === 'function') {
                window.openLoginModal();
            } else {
                alert('يرجى تسجيل الدخول أولاً');
            }
            return;
        }
        
        // فتح نافذة التوصيل
        window.showDeliveryCheckout();
    };
    
    // ===== 5. تحديث زر إتمام الطلب في السلة =====
    function updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            const oldHtml = checkoutBtn.innerHTML;
            if (!oldHtml.includes('التوصيل') && !oldHtml.includes('truck')) {
                checkoutBtn.innerHTML = '<i class="fas fa-truck"></i> إتمام الطلب مع التوصيل';
                checkoutBtn.style.background = 'linear-gradient(135deg, #ffd700, #ffb700)';
                checkoutBtn.style.color = '#000';
                checkoutBtn.style.fontWeight = 'bold';
                checkoutBtn.style.border = 'none';
                console.log('✅ تم تحديث زر إتمام الطلب');
            }
        } else {
            // محاولة مرة أخرى
            setTimeout(updateCheckoutButton, 500);
        }
    }
    
    // ===== 6. إضافة زر التوصيل في القائمة للمدير =====
    function addDeliveryNavButton() {
        if (window.currentUser && window.currentUser.role === 'admin') {
            const deliveryBtn = document.getElementById('deliveryBtn');
            if (deliveryBtn) {
                deliveryBtn.style.display = 'flex';
                deliveryBtn.onclick = function(e) {
                    e.preventDefault();
                    showDeliveryStats();
                };
                console.log('✅ تم إظهار زر التوصيل في القائمة');
            }
        }
    }
    
    // ===== 7. عرض إحصائيات التوصيل =====
    window.showDeliveryStats = function() {
        const stats = DeliverySystem.getStats();
        const deliveries = JSON.parse(localStorage.getItem('nardoo_deliveries') || '[]');
        
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="color: #ffd700; margin-bottom: 20px;">
                        <i class="fas fa-truck"></i> نظام التوصيل - لوحة التحكم
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
                        <div style="background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-box" style="font-size: 30px; color: #ffd700;"></i>
                            <h4 style="margin: 10px 0;">${stats.total}</h4>
                            <small>إجمالي الطلبات</small>
                        </div>
                        <div style="background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-clock" style="font-size: 30px; color: #fbbf24;"></i>
                            <h4 style="margin: 10px 0;">${stats.pending}</h4>
                            <small>قيد المعالجة</small>
                        </div>
                        <div style="background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-check-circle" style="font-size: 30px; color: #4ade80;"></i>
                            <h4 style="margin: 10px 0;">${stats.completed}</h4>
                            <small>مكتملة</small>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,215,0,0.1); padding: 20px; border-radius: 15px; margin-top: 20px;">
                        <h4 style="color: #ffd700; margin-bottom: 15px;">آخر الطلبات</h4>
                        ${deliveries.slice(0, 5).map(d => `
                            <div style="border-bottom: 1px solid rgba(255,215,0,0.2); padding: 10px 0;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>${d.orderId}</strong></span>
                                    <span>${d.total.toLocaleString()} دج</span>
                                </div>
                                <div style="font-size: 12px; color: #aaa;">
                                    ${d.customerName} - ${d.zone}
                                </div>
                            </div>
                        `).join('')}
                        ${deliveries.length === 0 ? '<p style="text-align: center; color: #aaa;">لا توجد طلبات بعد</p>' : ''}
                    </div>
                    
                    <button class="btn-outline-gold" onclick="if(window.showDashboardOverview) window.showDashboardOverview()" style="margin-top: 20px;">
                        <i class="fas fa-arrow-left"></i> رجوع للوحة الرئيسية
                    </button>
                </div>
            `;
        }
    };
    
    // ===== 8. مراقبة DOM =====
    const observer = new MutationObserver(function(mutations) {
        updateCheckoutButton();
        addDeliveryNavButton();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // تنفيذ فوري بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                updateCheckoutButton();
                addDeliveryNavButton();
                console.log('🚚 [نظام التوصيل] تم التهيئة بنجاح - زر التوصيل جاهز!');
            }, 1500);
        });
    } else {
        setTimeout(() => {
            updateCheckoutButton();
            addDeliveryNavButton();
            console.log('🚚 [نظام التوصيل] تم التهيئة بنجاح - زر التوصيل جاهز!');
        }, 1500);
    }
    
})();

console.log('✅ [نظام التوصيل] تم تحميل الملف النهائي');
