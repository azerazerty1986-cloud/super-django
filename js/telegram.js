/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== مع دعم الصور والفيديو والأزرار التفاعلية ===== */
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

function base64ToBlob(base64) {
    return fetch(base64).then(res => res.blob());
}

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

// ===== [4.8] الوظيفة الرئيسية لإضافة منتج =====
async function addProductToTelegram(product, mediaFile, additionalFiles = []) {
    try {
        const fileType = mediaFile.type.startsWith('video/') ? 'video' : 'photo';
        
        if (additionalFiles && additionalFiles.length > 0) {
            const allFiles = [mediaFile, ...additionalFiles];
            return await sendMediaGroup(product, allFiles);
        }
        
        if (fileType === 'video') {
            return await sendVideo(product, mediaFile);
        }
        
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
            const updates = data.result.slice(-200).reverse();
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                if (!post.photo && !post.video) continue;
                
                const caption = post.caption || '';
                if (!caption.includes('🟣')) continue;
                
                const lines = caption.split('\n');
                
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

// ===== [4.15] نظام إدارة طلبات التجار =====
const MerchantRequestSystem = {
    pendingRequests: {},
    
    loadRequests() {
        const saved = localStorage.getItem('merchant_requests');
        if (saved) {
            this.pendingRequests = JSON.parse(saved);
        }
        return this.pendingRequests;
    },
    
    saveRequests() {
        localStorage.setItem('merchant_requests', JSON.stringify(this.pendingRequests));
    },
    
    createRequest(merchantData) {
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        
        const request = {
            id: requestId,
            merchantId: merchantData.id || Date.now(),
            name: merchantData.name,
            email: merchantData.email,
            phone: merchantData.phone,
            storeName: merchantData.storeName || merchantData.name,
            specialization: merchantData.specialization || 'عام',
            workArea: merchantData.workArea || 'غير محدد',
            experience: merchantData.experience || '0',
            level: merchantData.merchantLevel || '1',
            status: 'pending',
            createdAt: new Date().toISOString(),
            telegramMessageId: null,
            telegramChatId: null
        };
        
        this.pendingRequests[requestId] = request;
        this.saveRequests();
        
        return request;
    },
    
    updateRequestStatus(requestId, status, adminName = 'مدير النظام') {
        if (this.pendingRequests[requestId]) {
            this.pendingRequests[requestId].status = status;
            this.pendingRequests[requestId].processedAt = new Date().toISOString();
            this.pendingRequests[requestId].processedBy = adminName;
            this.saveRequests();
            return true;
        }
        return false;
    },
    
    getRequest(requestId) {
        return this.pendingRequests[requestId];
    },
    
    getPendingRequests() {
        return Object.values(this.pendingRequests).filter(r => r.status === 'pending');
    }
};

MerchantRequestSystem.loadRequests();

// ===== [4.16] إرسال طلب تاجر مع أزرار تفاعلية =====
async function sendMerchantRequestToTelegram(merchant) {
    try {
        console.log('🔵 جاري إرسال طلب تاجر...');
        
        const request = MerchantRequestSystem.createRequest(merchant);
        
        const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *رقم الطلب:* \`${request.id}\`
━━━━━━━━━━━━━━━━━━━━━━
👤 *المتقدم:* ${request.name}
📧 *البريد:* ${request.email || 'غير محدد'}
📞 *الهاتف:* ${request.phone || 'غير محدد'}

🏪 *معلومات المتجر:*
• اسم المتجر: ${request.storeName}
• التخصص: ${request.specialization}
• المنطقة: ${request.workArea}
• الخبرة: ${request.experience} سنة
• المستوى: ${request.level}

📅 *تاريخ الطلب:* ${new Date(request.createdAt).toLocaleString('ar-EG')}

━━━━━━━━━━━━━━━━━━━━━━
⬇️ *يرجى اختيار الإجراء المناسب*
        `;

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
                            { 
                                text: "✅ نعم، أوافق على الطلب", 
                                callback_data: `approve_${request.id}`
                            }
                        ],
                        [
                            { 
                                text: "❌ لا، أرفض الطلب", 
                                callback_data: `reject_${request.id}` 
                            }
                        ],
                        [
                            { 
                                text: "📋 عرض التفاصيل الكاملة", 
                                callback_data: `details_${request.id}` 
                            },
                            { 
                                text: "📞 التواصل مع المتقدم", 
                                callback_data: `contact_${request.id}` 
                            }
                        ]
                    ]
                }
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log(`✅ تم إرسال طلب التاجر - المعرف: ${request.id}`);
            
            request.telegramMessageId = data.result.message_id;
            request.telegramChatId = data.result.chat.id;
            MerchantRequestSystem.saveRequests();
            
            await sendNotificationToAdmin(request);
            
            return { 
                success: true, 
                requestId: request.id,
                messageId: data.result.message_id 
            };
        }
        
        return { success: false, error: data.description };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
        return { success: false, error: error.message };
    }
}

// ===== [4.17] إرسال إشعار للمدير الخاص =====
async function sendNotificationToAdmin(request) {
    try {
        const message = `
🔔 *إشعار بطلب تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: \`${request.id}\`
👤 المتقدم: ${request.name}
🏪 المتجر: ${request.storeName}
📅 ${new Date().toLocaleString('ar-EG')}

تم إرسال الطلب إلى القناة مع أزرار تفاعلية.
        `;

        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار للمدير:', error);
        return false;
    }
}

// ===== [4.18] معالجة الأزرار التفاعلية =====
async function handleTelegramCallbacks() {
    try {
        const response = await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.callback_query) {
                    const callback = update.callback_query;
                    const callbackData = callback.data;
                    const chatId = callback.message.chat.id;
                    const messageId = callback.message.message_id;
                    const userId = callback.from.id;
                    const userName = callback.from.first_name || 'مدير';
                    
                    console.log(`🔘 تم الضغط على زر: ${callbackData} من ${userName}`);
                    
                    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            callback_query_id: callback.id,
                            text: "جاري معالجة طلبك...",
                            show_alert: false
                        })
                    });
                    
                    if (callbackData.startsWith('approve_')) {
                        await handleApproveMerchant(callbackData, chatId, messageId, userName);
                    }
                    else if (callbackData.startsWith('reject_')) {
                        await handleRejectMerchant(callbackData, chatId, messageId, userName);
                    }
                    else if (callbackData.startsWith('details_')) {
                        await handleShowDetails(callbackData, chatId);
                    }
                    else if (callbackData.startsWith('contact_')) {
                        await handleContactMerchant(callbackData, chatId);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة الأزرار:', error);
    }
}

// ===== [4.19] معالجة الموافقة على التاجر =====
async function handleApproveMerchant(callbackData, chatId, messageId, adminName) {
    const requestId = callbackData.replace('approve_', '');
    const request = MerchantRequestSystem.getRequest(requestId);
    
    if (!request) {
        await sendErrorMessage(chatId, 'الطلب غير موجود');
        return;
    }
    
    MerchantRequestSystem.updateRequestStatus(requestId, 'approved', adminName);
    
    if (window.Auth) {
        const user = Auth.users.find(u => u.email === request.email);
        if (user) {
            user.role = 'merchant_approved';
            user.status = 'approved';
            user.approvedBy = adminName;
            user.approvedAt = new Date().toISOString();
            Auth.save();
        }
    }
    
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `✅ *تمت الموافقة على طلب التاجر*
━━━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: \`${requestId}\`
👤 التاجر: ${request.name}
🏪 المتجر: ${request.storeName}
👤 بواسطة: ${adminName}
📅 ${new Date().toLocaleString('ar-EG')}

🎉 مرحباً بك في منصة ناردو برو!`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📊 عرض التجار", callback_data: "show_merchants" },
                        { text: "🏠 الرئيسية", callback_data: "home" }
                    ]
                ]
            }
        })
    });
    
    await sendMerchantApprovalNotification(request);
    
    console.log(`✅ تمت الموافقة على التاجر: ${request.name}`);
}

// ===== [4.20] معالجة رفض التاجر =====
async function handleRejectMerchant(callbackData, chatId, messageId, adminName) {
    const requestId = callbackData.replace('reject_', '');
    const request = MerchantRequestSystem.getRequest(requestId);
    
    if (!request) {
        await sendErrorMessage(chatId, 'الطلب غير موجود');
        return;
    }
    
    MerchantRequestSystem.updateRequestStatus(requestId, 'rejected', adminName);
    
    if (window.Auth) {
        const user = Auth.users.find(u => u.email === request.email);
        if (user) {
            user.role = 'customer';
            user.status = 'rejected';
            user.rejectedBy = adminName;
            user.rejectedAt = new Date().toISOString();
            Auth.save();
        }
    }
    
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `❌ *تم رفض طلب التاجر*
━━━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: \`${requestId}\`
👤 التاجر: ${request.name}
🏪 المتجر: ${request.storeName}
👤 بواسطة: ${adminName}
📅 ${new Date().toLocaleString('ar-EG')}

نأسف، يمكنك التقديم مرة أخرى لاحقاً.`,
            parse_mode: 'Markdown'
        })
    });
    
    await sendMerchantRejectionNotification(request);
    
    console.log(`❌ تم رفض التاجر: ${request.name}`);
}

// ===== [4.21] عرض تفاصيل الطلب =====
async function handleShowDetails(callbackData, chatId) {
    const requestId = callbackData.replace('details_', '');
    const request = MerchantRequestSystem.getRequest(requestId);
    
    if (!request) {
        await sendErrorMessage(chatId, 'الطلب غير موجود');
        return;
    }
    
    const details = `
📋 *تفاصيل الطلب الكاملة*
━━━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: \`${request.id}\`
━━━━━━━━━━━━━━━━━━━━━━
👤 *البيانات الشخصية:*
• الاسم: ${request.name}
• البريد: ${request.email}
• الهاتف: ${request.phone || 'غير محدد'}

🏪 *بيانات المتجر:*
• اسم المتجر: ${request.storeName}
• التخصص: ${request.specialization}
• منطقة العمل: ${request.workArea}
• سنوات الخبرة: ${request.experience}
• المستوى: ${request.level}

📊 *حالة الطلب:* ${request.status === 'pending' ? '⏳ قيد الانتظار' : request.status === 'approved' ? '✅ تمت الموافقة' : '❌ مرفوض'}
📅 تاريخ التقديم: ${new Date(request.createdAt).toLocaleString('ar-EG')}
    `;

    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: details,
            parse_mode: 'Markdown'
        })
    });
}

// ===== [4.22] التواصل مع التاجر =====
async function handleContactMerchant(callbackData, chatId) {
    const requestId = callbackData.replace('contact_', '');
    const request = MerchantRequestSystem.getRequest(requestId);
    
    if (!request || !request.phone) {
        await sendErrorMessage(chatId, 'رقم الهاتف غير متوفر');
        return;
    }
    
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `📞 *رقم هاتف التاجر*\n\n${request.phone}`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📱 اتصال", url: `tel:${request.phone}` },
                        { text: "💬 واتساب", url: `https://wa.me/${request.phone.replace('+', '')}` }
                    ]
                ]
            }
        })
    });
}

// ===== [4.23] إرسال إشعار موافقة للتاجر =====
async function sendMerchantApprovalNotification(request) {
    try {
        const message = `
🎉 *تهانينا! تمت الموافقة على طلبك*
━━━━━━━━━━━━━━━━━━━━━━
👤 عزيزي ${request.name}،

✅ تمت الموافقة على طلب انضمامك كتاجر في منصة ناردو برو.

🏪 *متجرك:* ${request.storeName}
🆔 *معرفك:* ${request.id}

✨ يمكنك الآن:
• إضافة منتجاتك
• إدارة متجرك
• التواصل مع العملاء
• متابعة طلباتك

🔗 رابط المتجر: ${window.location.origin}
📱 للدعم: @nardoo_support

نتمنى لك تجارة موفقة 🌟
        `;

        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: request.email,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الموافقة:', error);
    }
}

// ===== [4.24] إرسال إشعار رفض للتاجر =====
async function sendMerchantRejectionNotification(request) {
    try {
        const message = `
😔 *نأسف، تم رفض طلبك*
━━━━━━━━━━━━━━━━━━━━━━
👤 عزيزي ${request.name}،

❌ نأسف لإعلامك أنه تم رفض طلب انضمامك كتاجر في منصة ناردو برو.

📝 *يمكنك:*
• التواصل مع الدعم لمعرفة السبب
• تحسين بياناتك وإعادة التقديم
• التسجيل كمشتري عادي

📱 للدعم: @nardoo_support
        `;

        await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: request.email,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الرفض:', error);
    }
}

// ===== [4.25] إرسال رسالة خطأ =====
async function sendErrorMessage(chatId, errorText) {
    await fetch(`${TELEGRAM.apiUrl}${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `❌ *خطأ:* ${errorText}`,
            parse_mode: 'Markdown'
        })
    });
}

// ===== [4.26] جلب جميع طلبات التجار =====
async function fetchAllMerchantRequests() {
    return MerchantRequestSystem.getPendingRequests();
}

// ===== [4.27] إرسال إشعار عام =====
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

// ===== [4.28] مزامنة المنتجات مع التطبيق =====
async function syncProductsWithApp() {
    const telegramProducts = await fetchProductsFromTelegram();
    const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
    
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

// ===== [4.29] بدء الاستماع للأزرار كل 5 ثوان =====
setInterval(handleTelegramCallbacks, 5000);

// ===== [4.30] واجهة API =====
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
    
    // طلبات التجار
    getPendingRequests: fetchAllMerchantRequests,
    approveRequest: (requestId, adminName) => {
        return MerchantRequestSystem.updateRequestStatus(requestId, 'approved', adminName);
    },
    rejectRequest: (requestId, adminName) => {
        return MerchantRequestSystem.updateRequestStatus(requestId, 'rejected', adminName);
    },
    getRequest: (requestId) => MerchantRequestSystem.getRequest(requestId)
};

console.log('✅ نظام تلغرام المتكامل جاهز - مع الأزرار التفاعلية');
