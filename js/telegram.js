/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ================================================================== */

// ===== إعدادات تلغرام =====
const TELEGRAM_CONFIG = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [4.1] نظام تلغرام الأساسي مع دعم الصور والمعرفات =====
const TelegramSystem = {
    // إضافة منتج مع صورة (والحصول على معرف تلقائي)
    async addProductWithPhoto(product, imageFile) {
        try {
            console.log('📸 جاري إرسال المنتج مع الصورة إلى تلغرام...');
            
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CONFIG.channelId);
            formData.append('photo', imageFile);
            formData.append('caption', `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
🆔 *معرف المنتج:* ${product.id || 'جاري الإنشاء'}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
            formData.append('parse_mode', 'Markdown');

            const response = await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ تم الإرسال - المعرف: ${data.result.message_id}`);
                
                // الحصول على رابط الصورة
                const fileId = data.result.photo[data.result.photo.length - 1].file_id;
                const fileResponse = await fetch(
                    `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getFile?file_id=${fileId}`
                );
                const fileData = await fileResponse.json();
                
                let photoUrl = null;
                if (fileData.ok) {
                    photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${fileData.result.file_path}`;
                }
                
                return { 
                    success: true, 
                    messageId: data.result.message_id,
                    telegramId: data.result.message_id,
                    photoUrl: photoUrl
                };
            }
            
            console.error('❌ فشل الإرسال:', data);
            return { success: false, error: data.description };
            
        } catch (error) {
            console.error('❌ خطأ في إضافة المنتج:', error);
            return { success: false, error: error.message };
        }
    },
    
    // إضافة منتج مع عدة صور (ألبوم)
    async addProductWithAlbum(product, imageFiles) {
        try {
            console.log(`📸 جاري إرسال ${imageFiles.length} صور كألبوم إلى تلغرام...`);
            
            const media = [];
            
            for (let i = 0; i < Math.min(imageFiles.length, 10); i++) {
                const file = imageFiles[i];
                const reader = new FileReader();
                
                const base64 = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });
                
                if (i === 0) {
                    media.push({
                        type: 'photo',
                        media: `attach://photo_${i}`,
                        caption: `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
🕐 ${new Date().toLocaleString('ar-EG')}`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    media.push({
                        type: 'photo',
                        media: `attach://photo_${i}`
                    });
                }
            }
            
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CONFIG.channelId);
            formData.append('media', JSON.stringify(media));
            
            for (let i = 0; i < Math.min(imageFiles.length, 10); i++) {
                formData.append(`photo_${i}`, imageFiles[i]);
            }
            
            const response = await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMediaGroup`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ تم إرسال الألبوم بنجاح`);
                return { 
                    success: true, 
                    messageId: data.result[0].message_id,
                    telegramId: data.result[0].message_id
                };
            }
            
            return { success: false, error: 'فشل إرسال الألبوم' };
            
        } catch (error) {
            console.error('❌ خطأ في إضافة الألبوم:', error);
            return { success: false };
        }
    },
    
    // جلب المنتجات من تلغرام (مع الصور والمعرفات)
    async fetchProducts() {
        try {
            console.log('🔄 جلب المنتجات من تلغرام...');
            
            const response = await fetch(
                `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getUpdates`
            );
            
            const data = await response.json();
            const products = [];
            
            if (data.ok && data.result) {
                // جلب آخر 200 تحديث
                const updates = data.result.slice(-200).reverse();
                
                for (const update of updates) {
                    const post = update.channel_post || update.message;
                    if (!post || !post.photo) continue;
                    
                    // التأكد من أن الرسالة تحتوي على المنتج (🟣)
                    const caption = post.caption || '';
                    if (!caption.includes('🟣')) continue;
                    
                    const product = await this.parseProductFromMessage(post);
                    if (product) {
                        products.push(product);
                    }
                }
            }
            
            console.log(`✅ تم جلب ${products.length} منتج من تلغرام`);
            
            // حفظ نسخة احتياطية
            localStorage.setItem('telegram_products', JSON.stringify(products));
            
            return products;
            
        } catch (error) {
            console.error('❌ خطأ في جلب المنتجات:', error);
            
            // استخدام الكاش في حالة الخطأ
            const cached = localStorage.getItem('telegram_products');
            return cached ? JSON.parse(cached) : [];
        }
    },
    
    // تحليل المنتج من رسالة تلغرام
    async parseProductFromMessage(post) {
        try {
            const caption = post.caption || '';
            const lines = caption.split('\n');
            
            // استخراج البيانات
            let name = 'منتج';
            let price = 0;
            let category = 'promo';
            let stock = 0;
            let merchant = 'المتجر';
            let description = '';
            let productId = post.message_id;
            
            lines.forEach(line => {
                if (line.includes('المنتج:')) {
                    name = line.replace('المنتج:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('السعر:')) {
                    const match = line.match(/\d+/);
                    if (match) price = parseInt(match[0]);
                }
                else if (line.includes('القسم:')) {
                    const cat = line.replace('القسم:', '').replace(/[🟣*]/g, '').trim().toLowerCase();
                    if (cat.includes('promo') || cat.includes('برموسيو')) category = 'promo';
                    else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
                    else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
                    else category = 'other';
                }
                else if (line.includes('الكمية:')) {
                    const match = line.match(/\d+/);
                    if (match) stock = parseInt(match[0]);
                }
                else if (line.includes('التاجر:')) {
                    merchant = line.replace('التاجر:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('الوصف:')) {
                    description = line.replace('الوصف:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('معرف المنتج:')) {
                    const idMatch = line.match(/\d+/);
                    if (idMatch) productId = parseInt(idMatch[0]);
                }
            });
            
            // جلب رابط الصورة
            const fileId = post.photo[post.photo.length - 1].file_id;
            const fileResponse = await fetch(
                `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getFile?file_id=${fileId}`
            );
            const fileData = await fileResponse.json();
            
            let imageUrl = null;
            if (fileData.ok) {
                imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${fileData.result.file_path}`;
            }
            
            // إنشاء المعرف المحلي
            const localId = IDSystem ? IDSystem.generateTelegramProductId(productId) : `TLG_${productId}`;
            
            return {
                id: localId,                    // المعرف المحلي (TLG_12345)
                telegramId: productId,           // المعرف الأصلي من تلغرام
                name: name,
                price: price || 1000,
                category: category,
                stock: stock || 10,
                merchantName: merchant,
                description: description || 'منتج ممتاز',
                image: imageUrl,
                images: imageUrl ? [imageUrl] : [],
                rating: 4.5,
                createdAt: new Date(post.date * 1000).toISOString(),
                dateStr: this.getTimeAgo(post.date),
                source: 'telegram'
            };
            
        } catch (error) {
            console.error('خطأ في تحليل المنتج:', error);
            return null;
        }
    },
    
    // حساب الوقت المنقضي
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp * 1000);
        const seconds = Math.floor((now - past) / 1000);
        
        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        return `منذ ${Math.floor(seconds / 86400)} يوم`;
    },
    
    // إرسال طلب شراء
    async sendOrder(order) {
        const itemsList = order.items.map(item => 
            `  • ${item.name} (${item.quantity}) = ${item.price * item.quantity} دج`
        ).join('\n');
        
        const message = `
🟢 *طلب جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customer}
📞 *الهاتف:* ${order.phone || 'غير محدد'}

📦 *المنتجات:*
${itemsList}

💰 *الإجمالي:* ${order.total} دج
🕐 ${new Date().toLocaleString('ar-EG')}
        `;
        
        try {
            await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CONFIG.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            // إرسال للمدير أيضاً
            await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CONFIG.adminId,
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
    },
    
    // إرسال طلب تاجر
    async sendMerchantRequest(merchant) {
        const message = `
🔵 *طلب تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *التاجر:* ${merchant.name}
🏪 *المتجر:* ${merchant.storeName}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone}
📋 *التخصص:* ${merchant.specialization || 'غير محدد'}
📍 *المنطقة:* ${merchant.workArea || 'غير محدد'}

⬇️ *للإجراء*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
🕐 ${new Date().toLocaleString('ar-EG')}
        `;
        
        try {
            await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CONFIG.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في إرسال طلب التاجر:', error);
            return false;
        }
    },
    
    // البحث عن منتج بالمعرف
    async findProductById(productId) {
        const products = await this.fetchProducts();
        
        // البحث بالمعرف المحلي أو الأصلي
        return products.find(p => 
            p.id == productId || 
            p.telegramId == productId ||
            p.id == `TLG_${productId}`
        );
    },
    
    // تحديث المنتجات المحلية من تلغرام
    async syncProducts() {
        const telegramProducts = await this.fetchProducts();
        
        // دمج مع المنتجات المحلية
        const localProducts = Utils.load('products', []);
        const existingIds = new Set(localProducts.map(p => p.telegramId));
        
        telegramProducts.forEach(tp => {
            if (!existingIds.has(tp.telegramId)) {
                localProducts.push(tp);
            }
        });
        
        Utils.save('products', localProducts);
        
        if (window.Shop) {
            Shop.products = localProducts;
            Shop.saveProducts();
            Shop.displayProducts();
        }
        
        console.log(`✅ تمت المزامنة: ${localProducts.length} منتج`);
        return localProducts;
    },
    
    // التحقق من الأوامر
    async checkCommands() {
        try {
            const response = await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getUpdates`);
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    if (update.message?.text) {
                        const text = update.message.text;
                        
                        // أمر تحديث المنتجات
                        if (text === '/update_products') {
                            await this.syncProducts();
                            await this.sendMessage('✅ تم تحديث المنتجات');
                        }
                        
                        // أمر البحث بالمعرف
                        if (text.startsWith('/product_')) {
                            const id = text.replace('/product_', '');
                            const product = await this.findProductById(id);
                            
                            if (product) {
                                await this.sendMessage(`
🔍 *المنتج موجود*
🆔 المعرف: ${product.id}
📦 الاسم: ${product.name}
💰 السعر: ${product.price} دج
👤 التاجر: ${product.merchantName}
📊 المخزون: ${product.stock}
                                `);
                            } else {
                                await this.sendMessage('❌ لا يوجد منتج بهذا المعرف');
                            }
                        }
                        
                        // أمر الإحصائيات
                        if (text === '/stats') {
                            const products = await this.fetchProducts();
                            await this.sendMessage(`
📊 *إحصائيات المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 المنتجات: ${products.length}
🕐 آخر تحديث: ${new Date().toLocaleString('ar-EG')}
                            `);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('خطأ في التحقق من الأوامر:', error);
        }
    },
    
    // إرسال رسالة عادية
    async sendMessage(text) {
        try {
            await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CONFIG.channelId,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الرسالة:', error);
            return false;
        }
    }
};

// ===== [4.2] تهيئة النظام =====
window.Telegram = TelegramSystem;

// بدء الاستماع للأوامر كل 30 ثانية
setInterval(() => Telegram.checkCommands(), 30000);

console.log('✅ نظام تلغرام المتكامل جاهز - المعرفات التلقائية من message_id');
