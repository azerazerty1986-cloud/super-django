/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== مع دعم الصور والفيديو وإرسال واستقبال الوسائط ===== */
/* ================================================================== */

// ===== [4.1] إعدادات تلغرام الأساسية =====
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [4.2] دوال مساعدة داخلية =====
function getCategoryName(category) {
    const names = {
        'promo': 'برومسيون',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// تحويل Base64 إلى Blob
function base64ToBlob(base64) {
    return fetch(base64).then(res => res.blob());
}

// الحصول على نوع الملف
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'photo';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    return 'document';
}

// ===== [4.3] تنسيق النص المرسل =====
function formatProductCaption(product) {
    return `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
🆔 *معرف المنتج:* ${product.id || product.productId || 'جديد'}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
📅 ${new Date().toLocaleString('ar-EG')}

✅ للطلب: تواصل مع التاجر`;
}

// ===== [4.4] الحصول على رابط الملف من تلغرام =====
async function getTelegramFileUrl(fileId) {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            return `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${data.result.file_path}`;
        }
    } catch (error) {
        console.error('❌ خطأ في جلب رابط الملف:', error);
    }
    return null;
}

// ===== [4.5] إرسال صورة مع نص =====
async function sendPhoto(product, imageFile) {
    try {
        console.log('📸 جاري إرسال صورة المنتج...');
        
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
        
        if (data.ok) {
            console.log(`✅ تم إرسال الصورة - المعرف: ${data.result.message_id}`);
            
            // الحصول على رابط الصورة
            const fileId = data.result.photo[data.result.photo.length - 1].file_id;
            const photoUrl = await getTelegramFileUrl(fileId);
            
            return { 
                success: true, 
                messageId: data.result.message_id,
                telegramId: data.result.message_id,
                mediaUrl: photoUrl,
                mediaType: 'photo'
            };
        }
        
        return { success: false, error: data.description };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الصورة:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.6] إرسال فيديو مع نص =====
async function sendVideo(product, videoFile) {
    try {
        console.log('🎥 جاري إرسال فيديو المنتج...');
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('video', videoFile);
        formData.append('caption', formatProductCaption(product));
        formData.append('parse_mode', 'Markdown');
        formData.append('supports_streaming', 'true');

        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendVideo`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log(`✅ تم إرسال الفيديو - المعرف: ${data.result.message_id}`);
            
            // الحصول على رابط الفيديو
            const videoUrl = await getTelegramFileUrl(data.result.video.file_id);
            
            return { 
                success: true, 
                messageId: data.result.message_id,
                telegramId: data.result.message_id,
                mediaUrl: videoUrl,
                mediaType: 'video'
            };
        }
        
        return { success: false, error: data.description };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الفيديو:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.7] إرسال مجموعة وسائط (صور وفيديو معاً) =====
async function sendMediaGroup(product, mediaFiles) {
    try {
        console.log(`📦 جاري إرسال ${mediaFiles.length} ملف كمجموعة...`);
        
        const media = [];
        
        for (let i = 0; i < Math.min(mediaFiles.length, 10); i++) {
            const file = mediaFiles[i];
            const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
            
            media.push({
                type: fileType,
                media: `attach://file_${i}`,
                ...(i === 0 ? {
                    caption: formatProductCaption(product),
                    parse_mode: 'Markdown'
                } : {})
            });
        }

        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('media', JSON.stringify(media));

        for (let i = 0; i < mediaFiles.length; i++) {
            formData.append(`file_${i}`, mediaFiles[i]);
        }

        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMediaGroup`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log(`✅ تم إرسال المجموعة بنجاح`);
            return { 
                success: true, 
                messageId: data.result[0].message_id,
                telegramId: data.result[0].message_id,
                mediaCount: mediaFiles.length
            };
        }
        
        return { success: false, error: data.description };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال المجموعة:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.8] الوظيفة الرئيسية لإضافة منتج (تختار النوع المناسب) =====
async function addProductToTelegram(product, mediaFile, additionalFiles = []) {
    try {
        // التحقق من نوع الملف
        const fileType = mediaFile.type.startsWith('video/') ? 'video' : 'photo';
        
        // إذا كان هناك عدة ملفات
        if (additionalFiles && additionalFiles.length > 0) {
            const allFiles = [mediaFile, ...additionalFiles];
            return await sendMediaGroup(product, allFiles);
        }
        
        // إذا كان الملف فيديو
        if (fileType === 'video') {
            return await sendVideo(product, mediaFile);
        }
        
        // إذا كان الملف صورة
        return await sendPhoto(product, mediaFile);
        
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.9] جلب جميع المنتجات من تلغرام =====
async function fetchProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلغرام...');
        
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        const products = [];
        
        if (data.ok && data.result) {
            // جلب آخر 200 تحديث
            const updates = data.result.slice(-200).reverse();
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                // تجاهل الرسائل النصية فقط
                if (!post.photo && !post.video) continue;
                
                const caption = post.caption || '';
                if (!caption.includes('🟣')) continue; // فقط رسائل المنتجات
                
                const lines = caption.split('\n');
                
                // استخراج البيانات
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                
                lines.forEach(line => {
                    if (line.includes('المنتج:')) {
                        name = line.replace('المنتج:', '').replace(/[*🟣]/g, '').trim();
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
                    else if (line.includes('التاجر:')) {
                        merchant = line.replace('التاجر:', '').trim();
                    }
                });
                
                // تحديد نوع الوسائط وجلب الرابط
                let mediaType = 'unknown';
                let mediaUrl = null;
                
                if (post.photo) {
                    mediaType = 'photo';
                    const fileId = post.photo[post.photo.length - 1].file_id;
                    mediaUrl = await getTelegramFileUrl(fileId);
                } else if (post.video) {
                    mediaType = 'video';
                    mediaUrl = await getTelegramFileUrl(post.video.file_id);
                }
                
                if (mediaUrl) {
                    products.push({
                        id: post.message_id,
                        telegramId: post.message_id,
                        name: name,
                        price: price || 1000,
                        category: category,
                        stock: stock || 10,
                        merchantName: merchant,
                        mediaType: mediaType,
                        image: mediaType === 'photo' ? mediaUrl : null,
                        video: mediaType === 'video' ? mediaUrl : null,
                        images: mediaType === 'photo' ? [mediaUrl] : [],
                        telegramLink: `https://t.me/c/${TELEGRAM.channelId.replace('-100', '')}/${post.message_id}`,
                        createdAt: new Date(post.date * 1000).toISOString(),
                        dateStr: getTimeAgo(post.date)
                    });
                }
            }
        }
        
        console.log(`✅ تم جلب ${products.length} منتج من تلغرام`);
        
        // حفظ نسخة احتياطية
        localStorage.setItem('telegram_products', JSON.stringify(products));
        
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        const cached = localStorage.getItem('telegram_products');
        return cached ? JSON.parse(cached) : [];
    }
}

// ===== [4.10] حساب الوقت المنقضي =====
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp * 1000);
    const seconds = Math.floor((now - past) / 1000);
    
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

// ===== [4.11] البحث عن منتج بالمعرف =====
async function findProductById(productId) {
    const products = await fetchProductsFromTelegram();
    return products.find(p => p.id == productId || p.telegramId == productId);
}

// ===== [4.12] حذف رسالة من تلغرام =====
async function deleteTelegramMessage(messageId) {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                message_id: messageId
            })
        });
        
        const data = await response.json();
        return data.ok;
        
    } catch (error) {
        console.error('❌ خطأ في حذف الرسالة:', error);
        return false;
    }
}

// ===== [4.13] تحديث منتج في تلغرام =====
async function updateProductInTelegram(messageId, newCaption) {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                message_id: messageId,
                caption: newCaption,
                parse_mode: 'Markdown'
            })
        });
        
        const data = await response.json();
        return data.ok;
        
    } catch (error) {
        console.error('❌ خطأ في تحديث المنتج:', error);
        return false;
    }
}

// ===== [4.14] إرسال طلب شراء =====
async function sendOrderToTelegram(order) {
    const itemsList = order.items.map((item, i) => 
        `  ${i+1}. ${item.name} (${item.quantity}) = ${item.price * item.quantity} دج`
    ).join('\n');
    
    const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone || 'غير محدد'}
📍 *العنوان:* ${order.customerAddress || 'غير محدد'}

📦 *المنتجات:*
${itemsList}

💰 *الإجمالي:* ${order.total} دج
🕐 ${new Date().toLocaleString('ar-EG')}
    `;

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
        
        // إرسال نسخة للمدير
        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        console.log('✅ تم إرسال الطلب');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        return false;
    }
}

// ===== [4.15] إرسال طلب انضمام تاجر =====
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *التاجر:* ${merchant.name}
🏪 *المتجر:* ${merchant.storeName}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone}
📊 *المستوى:* ${merchant.level}
📝 *الوصف:* ${merchant.desc}

⬇️ *للإجراء*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
    `;

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
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
        return false;
    }
}

// ===== [4.16] إرسال إشعار عام =====
async function sendNotificationToTelegram(text) {
    const message = `
🟡 *إشعار*
━━━━━━━━━━━━━━━━━━━━━━
${text}
🕐 ${new Date().toLocaleString('ar-EG')}
    `;

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

// ===== [4.17] مزامنة المنتجات مع التطبيق =====
async function syncProductsWithApp() {
    const telegramProducts = await fetchProductsFromTelegram();
    const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
    
    // دمج المنتجات (تجنب التكرار)
    const existingIds = new Set(localProducts.map(p => p.telegramId));
    
    telegramProducts.forEach(tp => {
        if (!existingIds.has(tp.telegramId)) {
            localProducts.push(tp);
        }
    });
    
    localStorage.setItem('products', JSON.stringify(localProducts));
    
    console.log(`✅ تمت المزامنة: ${localProducts.length} منتج (${telegramProducts.length} من تلغرام)`);
    
    return localProducts;
}

// ===== [4.18] الاستماع لأوامر تلغرام =====
async function checkTelegramCommands() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    
                    if (text.startsWith('/approve_')) {
                        const userId = text.replace('/approve_', '');
                        console.log('✅ موافقة على تاجر:', userId);
                    }
                    
                    if (text.startsWith('/reject_')) {
                        const userId = text.replace('/reject_', '');
                        console.log('❌ رفض تاجر:', userId);
                    }
                    
                    if (text === '/update_products') {
                        await syncProductsWithApp();
                        await sendNotificationToTelegram('✅ تم تحديث المنتجات');
                    }
                    
                    if (text === '/stats') {
                        const products = await fetchProductsFromTelegram();
                        await sendNotificationToTelegram(`
📊 *إحصائيات المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 المنتجات: ${products.length}
📸 صور: ${products.filter(p => p.mediaType === 'photo').length}
🎥 فيديو: ${products.filter(p => p.mediaType === 'video').length}
🕐 آخر تحديث: ${new Date().toLocaleString('ar-EG')}
                        `);
                    }
                }
            }
        }
    } catch (error) {
        console.error('خطأ في التحقق من الأوامر:', error);
    }
}

// ===== [4.19] بدء الاستماع للأوامر كل 30 ثانية =====
setInterval(checkTelegramCommands, 30000);

// ===== [4.20] واجهة API =====
window.TelegramAPI = {
    // إرسال
    addProduct: addProductToTelegram,
    sendPhoto: sendPhoto,
    sendVideo: sendVideo,
    sendMediaGroup: sendMediaGroup,
    
    // جلب
    fetchProducts: fetchProductsFromTelegram,
    findProduct: findProductById,
    syncProducts: syncProductsWithApp,
    
    // إدارة
    deleteMessage: deleteTelegramMessage,
    updateProduct: updateProductInTelegram,
    
    // طلبات
    sendOrder: sendOrderToTelegram,
    sendMerchantRequest: sendMerchantRequestToTelegram,
    sendNotification: sendNotificationToTelegram,
    
    // أوامر
    checkCommands: checkTelegramCommands
};

console.log('✅ نظام تلغرام المتكامل جاهز - يدعم الصور والفيديو والمجموعات');
console.log('📸 إرسال: صور - فيديو - مجموعات');
console.log('📥 استقبال: جلب المنتجات مع الوسائط');
