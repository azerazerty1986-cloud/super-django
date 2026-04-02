/* ================================================================== */
/* ===== ملف: telegram.js - نظام تكامل تلغرام الكامل ===== */
/* ================================================================== */

// ==================== إعدادات تلغرام ====================
const TELEGRAM = {
    botToken: '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ==================== متغيرات ====================
let telegramProducts = [];
let lastProcessedUpdateId = 0;
let processedRequests = {};
let isLoading = false;

// ==================== القسم 1: جلب المنتجات ====================

async function fetchProductsFromTelegram() {
    if (isLoading) return telegramProducts;
    isLoading = true;
    
    try {
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        // عرض المنتجات المخزنة مؤقتاً
        const saved = localStorage.getItem('nardoo_products');
        if (saved && telegramProducts.length === 0) {
            telegramProducts = JSON.parse(saved);
            if (typeof window.displayProducts === 'function') {
                window.displayProducts();
            }
            console.log(`⚡ عرض سريع: ${telegramProducts.length} منتج من التخزين`);
        }
        
        // جلب التحديثات من تلغرام
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?limit=100`);
        
        if (!response.ok) throw new Error('فشل الاتصال بتلغرام');
        
        const data = await response.json();
        const newProducts = [];
        
        if (data.ok && data.result) {
            const updates = data.result.slice(-200).reverse();
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                // التأكد من أن المنشور يحتوي على صورة
                if (!post.photo && !post.video) continue;
                
                const caption = post.caption || '';
                if (!caption.includes('🟣') && !caption.includes('منتج جديد')) continue;
                
                // استخراج بيانات المنتج
                const product = await extractProductFromPost(post);
                if (product && product.imageUrl) {
                    newProducts.push(product);
                }
            }
        }
        
        console.log(`✅ تم جلب ${newProducts.length} منتج جديد من تلغرام`);
        
        // دمج المنتجات الجديدة مع القديمة
        const mergedProducts = mergeProducts(telegramProducts, newProducts);
        
        // حفظ في localStorage
        localStorage.setItem('nardoo_products', JSON.stringify(mergedProducts));
        
        telegramProducts = mergedProducts;
        
        // مزامنة مع المتجر الرئيسي
        if (typeof window.products !== 'undefined') {
            window.products = telegramProducts;
        }
        
        if (typeof window.displayProducts === 'function') {
            window.displayProducts();
        }
        
        return mergedProducts;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('فشل الاتصال بتلغرام، عرض المنتجات المخزنة', 'warning');
        }
        return telegramProducts;
        
    } finally {
        isLoading = false;
    }
}

// ==================== القسم 2: استخراج بيانات المنتج ====================

async function extractProductFromPost(post) {
    const caption = post.caption || '';
    const lines = caption.split('\n');
    
    let name = 'منتج';
    let price = 0;
    let category = 'promo';
    let stock = 0;
    let merchant = 'المتجر';
    let description = 'منتج ممتاز';
    let productId = post.message_id;
    
    // استخراج البيانات من النص
    for (const line of lines) {
        if (line.includes('المنتج:') || line.includes('📦 *المنتج:*')) {
            name = line.replace('المنتج:', '').replace('📦 *المنتج:*', '').replace(/[*🟣]/g, '').trim();
        }
        else if (line.includes('السعر:')) {
            const match = line.match(/\d+/);
            if (match) price = parseInt(match[0]);
        }
        else if (line.includes('القسم:')) {
            const cat = line.replace('القسم:', '').toLowerCase();
            if (cat.includes('promo')) category = 'promo';
            else if (cat.includes('spices')) category = 'spices';
            else if (cat.includes('cosmetic')) category = 'cosmetic';
            else category = 'other';
        }
        else if (line.includes('الكمية:')) {
            const match = line.match(/\d+/);
            if (match) stock = parseInt(match[0]);
        }
        else if (line.includes('الناشر:') || line.includes('التاجر:')) {
            merchant = line.replace('الناشر:', '').replace('التاجر:', '').trim();
        }
        else if (line.includes('الوصف:')) {
            description = line.replace('الوصف:', '').trim();
        }
    }
    
    // الحصول على رابط الصورة
    let imageUrl = null;
    
    if (post.photo) {
        const fileId = post.photo[post.photo.length - 1].file_id;
        imageUrl = await getTelegramFileUrl(fileId);
    } else if (post.video) {
        const fileId = post.video.file_id;
        imageUrl = await getTelegramFileUrl(fileId);
    }
    
    if (!imageUrl) {
        imageUrl = "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    }
    
    return {
        id: productId,
        telegramId: post.message_id,
        name: name,
        price: price || 1000,
        category: category,
        stock: stock || 10,
        merchantName: merchant,
        description: description,
        rating: 4.5,
        image: imageUrl,
        images: [imageUrl],
        telegramLink: `https://t.me/c/${TELEGRAM.channelId.replace('-100', '')}/${post.message_id}`,
        createdAt: new Date(post.date * 1000).toISOString(),
        dateStr: getTimeAgo(post.date)
    };
}

// جلب رابط الملف من تلغرام
async function getTelegramFileUrl(fileId) {
    try {
        const response = await fetch(
            `${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${fileId}`
        );
        const data = await response.json();
        
        if (data.ok && data.result) {
            return `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${data.result.file_path}`;
        }
    } catch (error) {
        console.error('❌ خطأ في جلب رابط الملف:', error);
    }
    return null;
}

// دمج المنتجات
function mergeProducts(oldProducts, newProducts) {
    const merged = [...oldProducts];
    const existingIds = new Set(merged.map(p => p.id));
    
    for (const newProduct of newProducts) {
        if (!existingIds.has(newProduct.id)) {
            merged.push(newProduct);
            console.log(`➕ منتج جديد: ${newProduct.name} (ID: ${newProduct.id})`);
            existingIds.add(newProduct.id);
        }
    }
    
    return merged;
}

// ==================== القسم 3: إرسال المنتجات ====================

async function addProductToTelegram(product, imageFile) {
    try {
        console.log('📤 جاري إرسال المنتج إلى تلغرام:', product.name);
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        formData.append('caption', formatProductCaption(product));
        formData.append('parse_mode', 'Markdown');

        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('📥 رد تلغرام:', data);
        
        if (data.ok) {
            const messageId = data.result.message_id;
            if (typeof window.showNotification === 'function') {
                window.showNotification(`✅ تم الإرسال - المعرف: ${messageId}`, 'success');
            }
            return { success: true, messageId: messageId, productId: messageId };
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ فشل الإرسال: ' + data.description, 'error');
        }
        return { success: false, error: data.description };
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ خطأ في الاتصال', 'error');
        }
        return { success: false, error: error.message };
    }
}

// تنسيق نص المنتج للإرسال
function formatProductCaption(product) {
    return `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *الناشر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
━━━━━━━━━━━━━━━━━━━━━━
🆔 *معرف المنتج:* ${Date.now()}
📅 ${new Date().toLocaleString('ar-EG')}

✅ للطلب: تواصل مع التاجر`;
}

// ==================== القسم 4: إدارة الطلبات ====================

async function sendOrderToTelegram(order) {
    const message = `🟢 *طلب جديد #${order.orderId}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتجات:*
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${(i.price * i.quantity).toLocaleString()} دج`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💰 *المجموع:* ${order.subtotal.toLocaleString()} دج
🚚 *الشحن:* ${order.shipping.toLocaleString()} دج
💎 *الإجمالي:* ${order.total.toLocaleString()} دج
━━━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleString('ar-EG')}`;

    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        if (response.ok) {
            console.log('✅ تم إرسال الطلب إلى تلغرام');
            // حفظ الطلب في localStorage
            const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
            orders.push(order);
            localStorage.setItem('nardoo_orders', JSON.stringify(orders));
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        return false;
    }
}

async function sendNotificationToTelegram(text, type = 'info') {
    const icons = {
        info: '🔵',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    const message = `${icons[type]} *إشعار*
━━━━━━━━━━━━━━━━━━━━━━
${text}
━━━━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ar-EG')}`;

    try {
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        return true;
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
        return false;
    }
}

// ==================== القسم 5: إدارة طلبات التجار ====================

async function sendMerchantRequestToTelegram(merchant) {
    const sentRequests = JSON.parse(localStorage.getItem('sent_merchant_requests') || '[]');
    
    if (sentRequests.includes(merchant.id)) {
        console.log('⚠️ طلب التاجر هذا أرسل مسبقاً');
        return;
    }
    
    const message = `🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *رقم الطلب:* ${merchant.id}
🏪 *اسم المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone || 'غير محدد'}
📊 *المستوى:* ${merchant.level || '1'}
📝 *الوصف:* ${merchant.desc || 'تاجر جديد'}
━━━━━━━━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ar-EG')}`;

    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ موافقة', callback_data: `approve_${merchant.id}` },
                            { text: '❌ رفض', callback_data: `reject_${merchant.id}` }
                        ]
                    ]
                }
            })
        });
        
        if (response.ok) {
            sentRequests.push(merchant.id);
            localStorage.setItem('sent_merchant_requests', JSON.stringify(sentRequests));
            console.log('✅ تم إرسال طلب التاجر');
        }
        
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
    }
}

// ==================== القسم 6: الاستماع لأوامر تلغرام ====================

async function loadProcessedRequestsFromTelegram() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        const processed = {};
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    if (text.includes('✅ *تمت الموافقة*') || text.includes('❌ *تم الرفض*')) {
                        const match = text.match(/رقم الطلب: (\d+)/);
                        if (match) processed[`approved_${match[1]}`] = true;
                    }
                }
            }
        }
        return processed;
    } catch (error) {
        console.error('❌ خطأ في تحميل المعاملات:', error);
        return {};
    }
}

function startTelegramListener() {
    loadProcessedRequestsFromTelegram().then(data => {
        Object.assign(processedRequests, data);
    });
    
    setInterval(async () => {
        try {
            const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`);
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    lastProcessedUpdateId = update.update_id;
                    if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                }
            }
        } catch (error) {
            console.error('❌ خطأ في التحقق من أوامر تلغرام:', error);
        }
    }, 10000);
}

async function handleCallbackQuery(callback) {
    const data = callback.data;
    const uniqueId = `${callback.id}_${callback.message?.message_id}_${data}`;
    
    let userId = null;
    if (data.startsWith('approve_')) userId = data.replace('approve_', '');
    if (data.startsWith('reject_')) userId = data.replace('reject_', '');
    
    if (userId && processedRequests[`approved_${userId}`]) {
        await answerCallbackQuery(callback.id, '✅ هذا الطلب تمت معالجته مسبقاً', true);
        return;
    }
    
    if (processedRequests[uniqueId]) {
        await answerCallbackQuery(callback.id, '✅ تمت معالجة هذا الطلب مسبقاً', true);
        return;
    }
    
    processedRequests[uniqueId] = true;
    if (userId) processedRequests[`approved_${userId}`] = true;
    
    if (data.startsWith('approve_') && typeof window.approveMerchant === 'function') {
        window.approveMerchant(userId);
        await answerCallbackQuery(callback.id, '✅ تمت الموافقة على التاجر');
    } else if (data.startsWith('approve_')) {
        console.log('✅ موافقة على التاجر:', userId);
        await answerCallbackQuery(callback.id, '✅ تمت الموافقة على التاجر');
    }
    
    if (data.startsWith('reject_') && typeof window.rejectMerchant === 'function') {
        window.rejectMerchant(userId);
        await answerCallbackQuery(callback.id, '❌ تم رفض التاجر');
    } else if (data.startsWith('reject_')) {
        console.log('❌ رفض التاجر:', userId);
        await answerCallbackQuery(callback.id, '❌ تم رفض التاجر');
    }
}

async function answerCallbackQuery(callbackId, text, showAlert = false) {
    try {
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackId,
                text: text,
                show_alert: showAlert
            })
        });
    } catch (error) {
        console.error('❌ خطأ في الرد على الاستدعاء:', error);
    }
}

// ==================== القسم 7: دوال مساعدة ====================

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return 'منذ وقت';
}

function getCategoryName(category) {
    const names = {
        'promo': 'بروموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ==================== القسم 8: الموافقة على التاجر ورفضه ====================

function approveMerchant(userId) {
    const users = JSON.parse(localStorage.getItem('nardoo_users') || '[]');
    const user = users.find(u => u.id == userId);
    
    if (user && user.role !== 'merchant_approved') {
        user.role = 'merchant_approved';
        user.status = 'approved';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        sendNotificationToTelegram(`✅ تمت الموافقة على التاجر ${user.name}\n🏪 المتجر: ${user.storeName || user.name}`, 'success');
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('✅ تمت الموافقة على التاجر', 'success');
        }
    }
}

function rejectMerchant(userId) {
    const users = JSON.parse(localStorage.getItem('nardoo_users') || '[]');
    const user = users.find(u => u.id == userId);
    
    if (user && user.status !== 'rejected') {
        user.role = 'customer';
        user.status = 'rejected';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        sendNotificationToTelegram(`❌ تم رفض طلب التاجر ${user.name}`, 'error');
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ تم رفض التاجر', 'info');
        }
    }
}

// ==================== القسم 9: التهيئة ====================

function initTelegram() {
    console.log('🤖 نظام تلغرام جاهز');
    
    // تحميل المنتجات المخزنة
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        telegramProducts = JSON.parse(saved);
        if (typeof window.products !== 'undefined') {
            window.products = telegramProducts;
        }
    }
    
    // جلب المنتجات تلقائياً
    setTimeout(() => {
        fetchProductsFromTelegram();
    }, 1000);
    
    // بدء الاستماع للأوامر
    startTelegramListener();
    
    // تحديث كل دقيقة
    setInterval(() => {
        fetchProductsFromTelegram();
    }, 60000);
}

// ==================== القسم 10: تصدير الدوال ====================

window.TELEGRAM = TELEGRAM;
window.fetchProductsFromTelegram = fetchProductsFromTelegram;
window.addProductToTelegram = addProductToTelegram;
window.sendOrderToTelegram = sendOrderToTelegram;
window.sendNotificationToTelegram = sendNotificationToTelegram;
window.sendMerchantRequestToTelegram = sendMerchantRequestToTelegram;
window.startTelegramListener = startTelegramListener;
window.getTelegramFileUrl = getTelegramFileUrl;
window.getTimeAgo = getTimeAgo;
window.getCategoryName = getCategoryName;
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.initTelegram = initTelegram;

console.log('✅ ملف telegram.js جاهز وكامل');
