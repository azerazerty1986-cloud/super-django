/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام المتكامل ===== */
/* ===== متوافق مع المعرفات الجديدة (معرف المستخدم + رقم تسلسلي) ===== */
/* ================================================================== */

// ===== إعدادات تلغرام =====
const TELEGRAM_CONFIG = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689',
    apiUrl: 'https://api.telegram.org/bot'
};

// ===== [4.1] نظام تلغرام مع دعم المعرفات الجديدة =====
const TelegramSystem = {
    // إضافة منتج مع صورة (يدعم المعرف الجديد)
    async addProductWithPhoto(product, imageFile) {
        try {
            console.log('📸 جاري إرسال المنتج مع الصورة إلى تلغرام...');
            console.log('🆔 معرف المنتج الجديد:', product.productId);
            
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CONFIG.channelId);
            formData.append('photo', imageFile);
            formData.append('caption', `🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *الناشر:* ${product.merchantName}
🆔 *معرف المنتج:* ${product.productId}
🆔 *معرف الناشر:* ${product.merchantId}
📝 *الوصف:* ${product.description || 'منتج ممتاز'}
🕐 ${new Date().toLocaleString('ar-EG')}
            `);
            formData.append('parse_mode', 'Markdown');

            const response = await fetch(`${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ تم الإرسال - معرف تلغرام: ${data.result.message_id}`);
                console.log(`✅ معرف المنتج الجديد: ${product.productId}`);
                
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
                    photoUrl: photoUrl,
                    productId: product.productId  // المعرف الجديد
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
            console.log(`📸 جاري إرسال ${imageFiles.length} صور كألبوم...`);
            console.log('🆔 معرف المنتج:', product.productId);
            
            const media = [];
            
            for (let i = 0; i < Math.min(imageFiles.length, 10); i++) {
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
👤 *الناشر:* ${product.merchantName}
🆔 *معرف المنتج:* ${product.productId}
🆔 *معرف الناشر:* ${product.merchantId}
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
                console.log(`✅ تم إرسال الألبوم - معرف المنتج: ${product.productId}`);
                return { 
                    success: true, 
                    messageId: data.result[0].message_id,
                    telegramId: data.result[0].message_id,
                    productId: product.productId
                };
            }
            
            return { success: false, error: 'فشل إرسال الألبوم' };
            
        } catch (error) {
            console.error('❌ خطأ:', error);
            return { success: false };
        }
    },
    
    // جلب المنتجات من تلغرام
    async fetchProducts() {
        try {
            console.log('🔄 جلب المنتجات من تلغرام...');
            
            const response = await fetch(
                `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getUpdates`
            );
            
            const data = await response.json();
            const products = [];
            
            if (data.ok && data.result) {
                const updates = data.result.slice(-200).reverse();
                
                for (const update of updates) {
                    const post = update.channel_post || update.message;
                    if (!post || !post.photo) continue;
                    
                    const caption = post.caption || '';
                    if (!caption.includes('🟣')) continue;
                    
                    const product = await this.parseProductFromMessage(post);
                    if (product) {
                        products.push(product);
                    }
                }
            }
            
            console.log(`✅ تم جلب ${products.length} منتج من تلغرام`);
            localStorage.setItem('telegram_products', JSON.stringify(products));
            
            return products;
            
        } catch (error) {
            console.error('❌ خطأ:', error);
            const cached = localStorage.getItem('telegram_products');
            return cached ? JSON.parse(cached) : [];
        }
    },
    
    // تحليل المنتج من رسالة تلغرام (معرف جديد)
    async parseProductFromMessage(post) {
        try {
            const caption = post.caption || '';
            const lines = caption.split('\n');
            
            let name = 'منتج';
            let price = 0;
            let category = 'promo';
            let stock = 0;
            let merchant = 'المتجر';
            let description = '';
            let productId = '';
            let merchantId = '';
            
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
                    if (cat.includes('promo')) category = 'promo';
                    else if (cat.includes('spices')) category = 'spices';
                    else if (cat.includes('cosmetic')) category = 'cosmetic';
                    else category = 'other';
                }
                else if (line.includes('الكمية:')) {
                    const match = line.match(/\d+/);
                    if (match) stock = parseInt(match[0]);
                }
                else if (line.includes('الناشر:')) {
                    merchant = line.replace('الناشر:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('معرف المنتج:')) {
                    productId = line.replace('معرف المنتج:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('معرف الناشر:')) {
                    merchantId = line.replace('معرف الناشر:', '').replace(/[🟣*]/g, '').trim();
                }
                else if (line.includes('الوصف:')) {
                    description = line.replace('الوصف:', '').replace(/[🟣*]/g, '').trim();
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
            
            return {
                id: productId || `TLG_${post.message_id}`,
                productId: productId || `TLG_${post.message_id}`,
                telegramId: post.message_id,
                name: name,
                price: price || 1000,
                category: category,
                stock: stock || 10,
                merchantName: merchant,
                merchantId: merchantId,
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
    
    // البحث عن منتج بالمعرف الجديد
    async findProductById(productId) {
        const products = await this.fetchProducts();
        return products.find(p => 
            p.productId === productId || 
            p.id === productId ||
            p.telegramId == productId
        );
    },
    
    // البحث عن منتجات ناشر معين
    async findProductsByMerchant(merchantId) {
        const products = await this.fetchProducts();
        return products.filter(p => p.merchantId === merchantId);
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
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ:', error);
            return false;
        }
    },
    
    // إرسال طلب تاجر
    async sendMerchantRequest(merchant) {
        const message = `
🔵 *طلب تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *التاجر:* ${merchant.name}
🆔 *معرف التاجر:* ${merchant.userId || 'جديد'}
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
            console.error('❌ خطأ:', error);
            return false;
        }
    },
    
    // مزامنة المنتجات مع المتجر المحلي
    async syncProducts() {
        const telegramProducts = await this.fetchProducts();
        const localProducts = Utils.load('products', []);
        const existingIds = new Set(localProducts.map(p => p.productId));
        
        telegramProducts.forEach(tp => {
            if (!existingIds.has(tp.productId)) {
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
                        
                        if (text === '/update_products') {
                            await this.syncProducts();
                            await this.sendMessage('✅ تم تحديث المنتجات');
                        }
                        
                        if (text.startsWith('/product_')) {
                            const id = text.replace('/product_', '');
                            const product = await this.findProductById(id);
                            
                            if (product) {
                                await this.sendMessage(`
🔍 *المنتج موجود*
🆔 المعرف: ${product.productId}
📦 الاسم: ${product.name}
💰 السعر: ${product.price} دج
👤 الناشر: ${product.merchantName}
📊 المخزون: ${product.stock}
                                `);
                            } else {
                                await this.sendMessage('❌ لا يوجد منتج بهذا المعرف');
                            }
                        }
                        
                        if (text === '/stats') {
                            const products = await this.fetchProducts();
                            const merchants = new Set(products.map(p => p.merchantId)).size;
                            
                            await this.sendMessage(`
📊 *إحصائيات المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 المنتجات: ${products.length}
👥 الناشرون: ${merchants}
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
            console.error('❌ خطأ:', error);
            return false;
        }
    }
};

// ===== [4.2] تهيئة النظام =====
window.Telegram = TelegramSystem;

// بدء الاستماع للأوامر كل 30 ثانية
setInterval(() => Telegram.checkCommands(), 30000);

console.log('✅ نظام تلغرام جاهز - متوافق مع المعرفات الجديدة');
console.log('📌 معرف المنتج = معرف الناشر + رقم تسلسلي');
