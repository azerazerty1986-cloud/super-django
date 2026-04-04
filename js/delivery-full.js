/* ================================================================== */
/* ===== نظام التوصيل المتكامل - delivery-full.js ===== */
/* ===== يعمل مع ملف التلغرام الموجود (04-telegram.js) ===== */
/* ================================================================== */

(function() {
    'use strict';
    
    console.log('🚚 [نظام التوصيل] بدء التهيئة...');

    // ===== 1. إعدادات التوصيل =====
    const DeliverySettings = {
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
        
        companies: [
            { name: 'ناردو إكسبرس', icon: '🚀', price: 0, speed: 'سريع (1-2 يوم)' },
            { name: 'براقي برو', icon: '📮', price: -100, speed: 'عادي (2-4 يوم)' },
            { name: 'دليفري سريع', icon: '⚡', price: 300, speed: 'فائق السرعة (24 ساعة)' },
            { name: 'الجزائر بوست', icon: '📬', price: -200, speed: 'اقتصادي (3-5 يوم)' }
        ],
        
        timeOptions: ['أقرب وقت', 'الصباح (8ص-12م)', 'بعد الظهر (12م-4م)', 'المساء (4م-8م)']
    };

    // ===== 2. دالة حساب الإجمالي =====
    function calculateOrderTotal(cart, zonePrice, companyPrice) {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = zonePrice + companyPrice;
        return { subtotal, shipping, total: subtotal + shipping };
    }

    // ===== 3. دالة تجميع المنتجات حسب التاجر =====
    function groupItemsByMerchant(cart) {
        const merchantGroups = {};
        for (const item of cart) {
            const merchantName = item.merchantName || item.merchant || 'متجر غير معروف';
            if (!merchantGroups[merchantName]) {
                merchantGroups[merchantName] = {
                    items: [],
                    subtotal: 0
                };
            }
            merchantGroups[merchantName].items.push(item);
            merchantGroups[merchantName].subtotal += item.price * item.quantity;
        }
        return merchantGroups;
    }

    // ===== 4. دالة إرسال رسالة تلغرام =====
    async function sendTelegramMessage(message, hashtag) {
        if (!window.TELEGRAM) {
            console.error('❌ TELEGRAM غير موجود');
            return false;
        }
        
        const fullMessage = `${hashtag}\n\n${message}`;
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${window.TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: window.TELEGRAM.channelId,
                    text: fullMessage,
                    parse_mode: 'HTML'
                })
            });
            const result = await response.json();
            if (result.ok) {
                console.log(`✅ تم إرسال ${hashtag}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ خطأ في الإرسال:', error);
            return false;
        }
    }

    // ===== 5. الدوال الرئيسية لإرسال الرسائل الأربع =====
    
    // 5.1 رسالة المدير (تقرير كامل)
    async function sendToAdmin(orderData) {
        const { orderId, orderDate, customerName, customerPhone, customerAddress, 
                zoneName, zoneDays, companyName, companyIcon, companyPrice,
                cart, subtotal, shipping, total, notes, deliveryTime } = orderData;
        
        let productsText = '';
        for (const item of cart) {
            productsText += `  • ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        }
        
        const message = `👑 <b>تقرير المدير - طلب جديد</b>
━━━━━━━━━━━━━━━━━━━━━━
📋 <b>رقم الطلب:</b> <code>${orderId}</code>
🕐 <b>التاريخ:</b> ${orderDate}

👤 <b>معلومات العميل:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerName}
├ 📞 <b>الهاتف:</b> ${customerPhone}
├ 📍 <b>العنوان:</b> ${customerAddress}
└ 📝 <b>ملاحظات:</b> ${notes || 'لا توجد'}

📦 <b>المنتجات المطلوبة:</b>
${productsText}
━━━━━━━━━━━━━━━━━━━━━━
🗺️ <b>منطقة التوصيل:</b> ${zoneName}
${companyIcon} <b>شركة التوصيل:</b> ${companyName}
⏰ <b>وقت التوصيل:</b> ${deliveryTime}
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي المنتجات:</b> ${subtotal.toLocaleString()} دج
🚚 <b>رسوم التوصيل:</b> ${shipping.toLocaleString()} دج
💎 <b>الإجمالي النهائي:</b> ${total.toLocaleString()} دج
⏰ <b>الوقت المتوقع:</b> ${zoneDays}

✅ تم إرسال الطلب إلى التاجر وشركة التوصيل`;
        
        return await sendTelegramMessage(message, '#تقرير_مدير');
    }
    
    // 5.2 رسالة التاجر (منتجاته فقط)
    async function sendToMerchant(merchantName, merchantData, orderId, customerName, customerPhone, customerAddress, deliveryTime, notes, orderDate) {
        let productsText = '';
        for (const item of merchantData.items) {
            productsText += `  • ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        }
        
        const message = `🏪 <b>تقرير تاجر - ${merchantName}</b>
━━━━━━━━━━━━━━━━━━━━━━
📋 <b>رقم الطلب:</b> <code>${orderId}</code>
🕐 <b>التاريخ:</b> ${orderDate}

👤 <b>معلومات الزبون:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerName}
├ 📞 <b>الهاتف:</b> ${customerPhone}
├ 📍 <b>العنوان:</b> ${customerAddress}
└ 📝 <b>ملاحظات:</b> ${notes || 'لا توجد'}

📦 <b>منتجاتك المطلوبة:</b>
${productsText}
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي منتجاتك:</b> ${merchantData.subtotal.toLocaleString()} دج
⏰ <b>وقت التوصيل المفضل:</b> ${deliveryTime}

✅ يرجى تجهيز الطلب`;
        
        const hashtag = `#تقرير_تاجر_${merchantName.replace(/ /g, '_')}`;
        return await sendTelegramMessage(message, hashtag);
    }
    
    // 5.3 رسالة شركة التوصيل
    async function sendToDeliveryCompany(orderData) {
        const { orderId, customerName, customerPhone, customerAddress, zoneName, 
                deliveryTime, notes, companyName, companyIcon, zoneDays, cart } = orderData;
        
        const message = `🚚 <b>تقرير توصيل - ${companyName}</b>
━━━━━━━━━━━━━━━━━━━━━━
📋 <b>رقم الطلب:</b> <code>${orderId}</code>

👤 <b>معلومات المستلم:</b>
┌─────────────────────────
├ 👨 <b>الاسم:</b> ${customerName}
├ 📞 <b>الهاتف:</b> ${customerPhone}
├ 📍 <b>العنوان الكامل:</b> ${customerAddress}
├ 🗺️ <b>المنطقة:</b> ${zoneName}
└ ⏰ <b>وقت التوصيل:</b> ${deliveryTime}

📦 <b>عدد الطرود:</b> ${cart.length} قطعة
📝 <b>ملاحظات:</b> ${notes || 'لا توجد'}
━━━━━━━━━━━━━━━━━━━━━━
✅ <b>يرجى التوصيل خلال</b> ${zoneDays}
${companyIcon} شكراً لتعاونكم`;
        
        const hashtag = `#تقرير_توصيل_${companyName.replace(/ /g, '_')}`;
        return await sendTelegramMessage(message, hashtag);
    }
    
    // 5.4 رسالة المشتري (تأكيد)
    async function sendToCustomer(orderData) {
        const { orderId, orderDate, customerName, cart, total, companyName, companyIcon, zoneDays, customerAddress } = orderData;
        
        let productsText = '';
        for (const item of cart) {
            productsText += `  • ${item.name} (${item.quantity}) × ${item.price.toLocaleString()} = ${(item.price * item.quantity).toLocaleString()} دج\n`;
        }
        
        const message = `🛒 <b>تأكيد طلبك - ناردو برو</b>
━━━━━━━━━━━━━━━━━━━━━━
✨ <b>تم استلام طلبك بنجاح!</b>

📋 <b>رقم الطلب:</b> <code>${orderId}</code>
📅 <b>التاريخ:</b> ${orderDate}

📦 <b>منتجاتك:</b>
${productsText}
━━━━━━━━━━━━━━━━━━━━━━
${companyIcon} <b>شركة التوصيل:</b> ${companyName}
📍 <b>عنوان التوصيل:</b> ${customerAddress}
💰 <b>الإجمالي:</b> ${total.toLocaleString()} دج
⏰ <b>التوصيل المتوقع:</b> ${zoneDays}
━━━━━━━━━━━━━━━━━━━━━━
✨ شكراً لتسوقك من <b>ناردو برو</b> ✨

📞 سيتم التواصل معك قريباً لتأكيد الطلب`;
        
        const hashtag = `#تأكيد_مشتري_${customerName.replace(/ /g, '_')}`;
        return await sendTelegramMessage(message, hashtag);
    }

    // ===== 6. دالة إرسال جميع الرسائل =====
    async function sendAllTelegramMessages(orderData) {
        console.log('📤 بدء إرسال رسائل التلغرام...');
        
        const merchantGroups = groupItemsByMerchant(orderData.cart);
        
        // 1️⃣ إرسال للمدير
        await sendToAdmin(orderData);
        await new Promise(r => setTimeout(r, 500));
        
        // 2️⃣ إرسال لكل تاجر
        for (const [merchantName, merchantData] of Object.entries(merchantGroups)) {
            await sendToMerchant(
                merchantName, merchantData, orderData.orderId,
                orderData.customerName, orderData.customerPhone, orderData.customerAddress,
                orderData.deliveryTime, orderData.notes, orderData.orderDate
            );
            await new Promise(r => setTimeout(r, 500));
        }
        
        // 3️⃣ إرسال لشركة التوصيل
        await sendToDeliveryCompany(orderData);
        await new Promise(r => setTimeout(r, 500));
        
        // 4️⃣ إرسال للمشتري
        await sendToCustomer(orderData);
        
        console.log('✅ تم إرسال جميع الرسائل بنجاح');
        return true;
    }

    // ===== 7. دالة عرض نافذة التوصيل =====
    window.showDeliveryCheckout = function() {
        console.log('🚚 فتح نافذة التوصيل');
        
        // التحقق من السلة (من ملف التلغرام)
        if (!window.cart || window.cart.length === 0) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('🛒 السلة فارغة! أضف منتجات أولاً', 'warning');
            } else {
                alert('السلة فارغة! أضف منتجات أولاً');
            }
            return;
        }
        
        // التحقق من تسجيل الدخول (من ملف التلغرام)
        if (!window.currentUser) {
            if (typeof window.openLoginModal === 'function') {
                window.openLoginModal();
            } else {
                alert('يرجى تسجيل الدخول أولاً');
            }
            return;
        }
        
        const cart = window.cart;
        const currentUser = window.currentUser;
        
        // حساب إجمالي المنتجات
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // إنشاء نافذة التوصيل
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
        
        // بناء خيارات المناطق
        let zonesHtml = '';
        DeliverySettings.zones.forEach(zone => {
            zonesHtml += `<option value="${zone.name}|${zone.price}|${zone.days}">${zone.name} - ${zone.price.toLocaleString()} دج (${zone.days})</option>`;
        });
        
        // بناء خيارات الشركات
        let companiesHtml = '';
        DeliverySettings.companies.forEach(company => {
            const priceText = company.price >= 0 ? `+${company.price}` : `${company.price}`;
            companiesHtml += `<option value="${company.name}|${company.price}|${company.icon}|${company.speed}">${company.icon} ${company.name} - ${priceText} دج (${company.speed})</option>`;
        });
        
        // بناء خيارات الوقت
        let timeHtml = '';
        DeliverySettings.timeOptions.forEach(time => {
            timeHtml += `<label style="flex:1; text-align:center; padding:8px; background:rgba(255,215,0,0.1); border-radius:10px; cursor:pointer;">
                            <input type="radio" name="deliveryTime" value="${time}" ${time === 'أقرب وقت' ? 'checked' : ''}> ${time}
                        </label>`;
        });
        
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
                
                <!-- شركة التوصيل -->
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px;">
                        <i class="fas fa-building"></i> شركة التوصيل <span style="color: red;">*</span>
                    </label>
                    <select id="deliveryCompanySelect" 
                            style="width: 100%; padding: 12px; border-radius: 10px; background: #0f0f23; color: white; border: 1px solid #ffd700; outline: none;">
                        ${companiesHtml}
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
                        ${timeHtml}
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
        
        // دالة تحديث الملخص
        function updateSummary() {
            const zoneSelect = document.getElementById('deliveryZoneSelect');
            const companySelect = document.getElementById('deliveryCompanySelect');
            
            const zoneValue = zoneSelect.value.split('|');
            const zonePrice = parseInt(zoneValue[1]);
            const zoneName = zoneValue[0];
            const zoneDays = zoneValue[2];
            
            const companyValue = companySelect.value.split('|');
            const companyPrice = parseInt(companyValue[1]);
            const companyName = companyValue[0];
            const companyIcon = companyValue[2];
            
            const { subtotal: calculatedSubtotal, shipping, total } = calculateOrderTotal(cart, zonePrice, companyPrice);
            
            const summaryDiv = document.getElementById('deliverySummary');
            summaryDiv.innerHTML = `
                <h4 style="color: #ffd700; margin-bottom: 15px; text-align: center;">📊 ملخص الطلب</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🛍️ إجمالي المنتجات:</span>
                    <span><strong>${calculatedSubtotal.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🗺️ رسوم المنطقة (${zoneName}):</span>
                    <span><strong>${zonePrice.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>${companyIcon} رسوم الشركة (${companyName}):</span>
                    <span><strong>${companyPrice >= 0 ? '+' : ''}${companyPrice.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>🚚 إجمالي رسوم التوصيل:</span>
                    <span><strong>${shipping.toLocaleString()} دج</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>⏰ المدة المتوقعة:</span>
                    <span><strong>${zoneDays}</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid #ffd700;">
                    <span style="font-size: 18px;">💎 الإجمالي النهائي:</span>
                    <span style="font-size: 22px; color: #ffd700; font-weight: bold;">${total.toLocaleString()} دج</span>
                </div>
            `;
        }
        
        // ربط أحداث التغيير
        document.getElementById('deliveryZoneSelect').addEventListener('change', updateSummary);
        document.getElementById('deliveryCompanySelect').addEventListener('change', updateSummary);
        updateSummary();
        
        // زر تأكيد الطلب
        document.getElementById('confirmDeliveryBtn').onclick = async () => {
            const customerName = document.getElementById('deliveryName').value;
            const customerPhone = document.getElementById('deliveryPhone').value;
            const customerAddress = document.getElementById('deliveryAddress').value;
            const deliveryTime = document.querySelector('input[name="deliveryTime"]:checked')?.value || 'أقرب وقت';
            const notes = document.getElementById('deliveryNotes').value;
            
            if (!customerName || !customerPhone || !customerAddress) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                } else {
                    alert('يرجى ملء جميع الحقول المطلوبة');
                }
                return;
            }
            
            // الحصول على القيم المختارة
            const zoneSelect = document.getElementById('deliveryZoneSelect');
            const companySelect = document.getElementById('deliveryCompanySelect');
            
            const zoneValue = zoneSelect.value.split('|');
            const zonePrice = parseInt(zoneValue[1]);
            const zoneName = zoneValue[0];
            const zoneDays = zoneValue[2];
            
            const companyValue = companySelect.value.split('|');
            const companyPrice = parseInt(companyValue[1]);
            const companyName = companyValue[0];
            const companyIcon = companyValue[2];
            
            const { subtotal, shipping, total } = calculateOrderTotal(cart, zonePrice, companyPrice);
            const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const orderDate = new Date().toLocaleString('ar-EG');
            
            // تجهيز بيانات الطلب للإرسال
            const orderData = {
                orderId, orderDate,
                customerName, customerPhone, customerAddress,
                zoneName, zonePrice, zoneDays,
                companyName, companyPrice, companyIcon,
                deliveryTime, notes,
                cart: [...cart],
                subtotal, shipping, total
            };
            
            // إظهار رسالة جاري المعالجة
            if (typeof window.showNotification === 'function') {
                window.showNotification('📤 جاري إرسال الطلب...', 'info');
            }
            
            // إرسال الرسائل الأربع إلى تلغرام
            const sent = await sendAllTelegramMessages(orderData);
            
            // حفظ الطلب في localStorage
            const deliveries = JSON.parse(localStorage.getItem('nardoo_deliveries') || '[]');
            deliveries.unshift({
                id: `DEL-${Date.now()}`,
                orderId: orderId,
                customerName: customerName,
                customerPhone: customerPhone,
                customerAddress: customerAddress,
                zone: zoneName,
                company: companyName,
                total: total,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('nardoo_deliveries', JSON.stringify(deliveries.slice(0, 100)));
            
            // تفريغ السلة (باستخدام دوال ملف التلغرام)
            if (typeof window.cart !== 'undefined') {
                window.cart = [];
            }
            if (typeof window.saveCart === 'function') {
                window.saveCart();
            }
            if (typeof window.updateCartCounter === 'function') {
                window.updateCartCounter();
            }
            if (typeof window.toggleCart === 'function') {
                window.toggleCart();
            }
            
            // إغلاق النافذة
            modal.remove();
            
            // عرض رسالة النجاح
            if (typeof window.showNotification === 'function') {
                window.showNotification(`✅ تم إرسال طلبك بنجاح! رقم الطلب: ${orderId}`, 'success');
            }
            
            // نافذة نجاح منبثقة
            const successModal = document.createElement('div');
            successModal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); backdrop-filter: blur(10px);
                z-index: 200001; display: flex; justify-content: center; align-items: center;
                animation: fadeIn 0.3s ease;
            `;
            successModal.innerHTML = `
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
                        <strong>الوقت المتوقع:</strong> ${zoneDays}
                    </p>
                    <div style="background: rgba(255,215,0,0.1); border-radius: 15px; padding: 10px; margin-bottom: 20px;">
                        <p style="color: #ffd700; font-size: 12px;">
                            <i class="fas ${sent ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${sent ? 'تم إرسال الطلب إلى التلغرام' : 'تم حفظ الطلب محلياً'}
                        </p>
                    </div>
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="background: #ffd700; color: #000; padding: 12px 30px; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-check"></i> حسناً
                    </button>
                </div>
            `;
            document.body.appendChild(successModal);
            
            setTimeout(() => {
                if (successModal.parentElement) successModal.remove();
            }, 5000);
            
            console.log(`✅ تم إنشاء الطلب: ${orderId} - الإجمالي: ${total} دج`);
        };
    };

    // ===== 8. استبدال دالة إتمام الطلب في ملف التلغرام =====
    const originalCheckout = window.checkoutCart;
    
    window.checkoutCart = function() {
        console.log('🚚 [نظام التوصيل] تم استدعاء checkoutCart');
        
        // التحقق من السلة (من ملف التلغرام)
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
        
        // التحقق من تسجيل الدخول (من ملف التلغرام)
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
    
    // ===== 9. تحديث زر إتمام الطلب في السلة =====
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
            setTimeout(updateCheckoutButton, 500);
        }
    }
    
    // ===== 10. مراقبة DOM =====
    const observer = new MutationObserver(function(mutations) {
        updateCheckoutButton();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // تنفيذ فوري بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                updateCheckoutButton();
                console.log('🚚 [نظام التوصيل] تم التهيئة بنجاح - زر التوصيل جاهز!');
            }, 1500);
        });
    } else {
        setTimeout(() => {
            updateCheckoutButton();
            console.log('🚚 [نظام التوصيل] تم التهيئة بنجاح - زر التوصيل جاهز!');
        }, 1500);
    }
    
    console.log('✅ [نظام التوصيل] تم تحميل الملف بنجاح - delivery-full.js');
})();
