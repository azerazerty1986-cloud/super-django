/* ================================================================== */
/* ===== [04] الملف: 04-telegram.js - نظام تلغرام مع دعم الصور ===== */
/* ================================================================== */

// ===== [4.1] نظام تلغرام الأساسي =====
const TelegramSystem = {
    // جلب المنتجات من القناة
    async fetchProducts() {
        try {
            console.log('🔄 جلب المنتجات من تلغرام...');
            
            const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/getUpdates`);
            const data = await response.json();
            
            const products = [];
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    if (update.channel_post) {
                        const post = update.channel_post;
                        
                        // البحث عن رسائل المنتجات (🟣) في النص أو في caption الصورة
                        const text = post.text || post.caption || '';
                        
                        if (text.includes('🟣')) {
                            const product = await this.parseProduct(post);
                            if (product) {
                                products.push(product);
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ تم جلب ${products.length} منتج من تلغرام`);
            Utils.save('telegram_products_cache', products);
            
            return products;
            
        } catch (error) {
            console.error('❌ خطأ في جلب المنتجات:', error);
            return Utils.load('telegram_products_cache', []);
        }
    },
    
    // تحليل المنتج من الرسالة
    async parseProduct(post) {
        try {
            const text = post.text || post.caption || '';
            const lines = text.split('\n');
            
            const product = {
                id: post.message_id,
                telegramId: post.message_id,
                name: this.extractValue(lines, 'المنتج:') || 'منتج',
                price: parseInt(this.extractNumber(lines, 'السعر:')) || 0,
                category: this.extractCategory(lines),
                stock: parseInt(this.extractNumber(lines, 'الكمية:')) || 0,
                merchant: this.extractValue(lines, 'التاجر:') || 'المتجر',
                merchantId: this.extractValue(lines, 'معرف التاجر:') || '',
                description: this.extractValue(lines, 'وصف:') || '',
                images: [],
                date: post.date,
                dateStr: Utils.getTimeAgo(post.date)
            };
            
            // إضافة الصورة إذا وجدت
            if (post.photo && post.photo.length > 0) {
                const fileId = post.photo[post.photo.length - 1].file_id;
                const imageUrl = await this.getFileUrl(fileId);
                if (imageUrl) {
                    product.images.push(imageUrl);
                    product.image = imageUrl;
                }
            }
            
            return product.name ? product : null;
            
        } catch (error) {
            console.error('خطأ في تحليل المنتج:', error);
            return null;
        }
    },
    
    // الحصول على رابط الملف
    async getFileUrl(fileId) {
        try {
            const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/getFile?file_id=${fileId}`);
            const data = await response.json();
            
            if (data.ok && data.result) {
                return `https://api.telegram.org/file/bot${CONFIG.telegram.botToken}/${data.result.file_path}`;
            }
        } catch (error) {
            console.error('خطأ في جلب رابط الملف:', error);
        }
        return null;
    },
    
    // استخراج قيمة من النص
    extractValue(lines, key) {
        for (const line of lines) {
            if (line.includes(key)) {
                return line.replace(key, '').replace(/[🟣*]/g, '').trim();
            }
        }
        return null;
    },
    
    // استخراج رقم
    extractNumber(lines, key) {
        const value = this.extractValue(lines, key);
        const match = value?.match(/\d+/);
        return match ? match[0] : '0';
    },
    
    // استخراج القسم
    extractCategory(lines) {
        const cat = this.extractValue(lines, 'القسم:')?.toLowerCase() || '';
        if (cat.includes('promo') || cat.includes('برموسيو')) return 'promo';
        if (cat.includes('spices') || cat.includes('توابل')) return 'spices';
        if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) return 'cosmetic';
        return 'other';
    },
    
    // تحويل base64 إلى blob
    async base64ToBlob(base64) {
        const response = await fetch(base64);
        return await response.blob();
    },
    
    // إضافة منتج جديد مع صورة
    async addProduct(product, user = null) {
        const merchantId = user?.merchantId || 'ADMIN_001';
        const merchantName = user?.name || 'مدير النظام';
        
        // إنشاء نص الرسالة
        const message = `
🟣 *منتج جديد*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${merchantName}
🆔 *معرف التاجر:* ${merchantId}
📝 *الوصف:* ${product.description || 'لا يوجد'}
🕐 ${new Date().toLocaleString('ar-EG')}
        `;
        
        try {
            // البحث عن الصورة في المنتج
            const imageToSend = product.images && product.images.length > 0 
                ? product.images[0] 
                : product.image;
            
            // إذا وجدت صورة (base64)
            if (imageToSend && imageToSend.startsWith('data:image')) {
                console.log('📸 جاري إرسال الصورة إلى تلغرام...');
                
                // تحويل base64 إلى blob
                const blob = await this.base64ToBlob(imageToSend);
                
                // إنشاء FormData
                const formData = new FormData();
                formData.append('chat_id', CONFIG.telegram.channelId);
                formData.append('photo', blob, 'product.jpg');
                formData.append('caption', message);
                formData.append('parse_mode', 'Markdown');
                
                // إرسال الصورة
                const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.ok) {
                    console.log('✅ تم إرسال المنتج مع الصورة بنجاح');
                    return { success: true, messageId: result.result.message_id };
                } else {
                    console.error('❌ فشل إرسال الصورة:', result);
                    
                    // محاولة إرسال نص فقط كبديل
                    return await this.sendTextOnly(message);
                }
                
            } else {
                // إرسال نص فقط
                return await this.sendTextOnly(message);
            }
            
        } catch (error) {
            console.error('❌ خطأ في إضافة المنتج:', error);
            
            // محاولة إرسال نص فقط كبديل
            return await this.sendTextOnly(message);
        }
    },
    
    // إرسال نص فقط
    async sendTextOnly(message) {
        try {
            const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const result = await response.json();
            
            if (result.ok) {
                console.log('✅ تم إرسال النص فقط');
                return { success: true, messageId: result.result.message_id };
            }
            
            return { success: false };
            
        } catch (error) {
            console.error('❌ خطأ في إرسال النص:', error);
            return { success: false };
        }
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
            await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            // إرسال للمدير أيضاً
            await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.adminId,
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
            await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
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
    
    // إرسال رسالة عادية
    async sendMessage(text) {
        try {
            await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegram.channelId,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الرسالة:', error);
            return false;
        }
    },
    
    // التحقق من الأوامر
    async checkCommands() {
        try {
            const response = await fetch(`${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/getUpdates`);
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    if (update.message?.text) {
                        const text = update.message.text;
                        
                        // أمر تحديث المنتجات
                        if (text === '/update_products') {
                            await this.fetchProducts();
                            await this.sendMessage('✅ تم تحديث المنتجات');
                        }
                        
                        // أمر الإحصائيات
                        if (text === '/stats') {
                            const products = await this.fetchProducts();
                            const stats = `
📊 *إحصائيات المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 المنتجات: ${products.length}
🕐 آخر تحديث: ${new Date().toLocaleString('ar-EG')}
                            `;
                            await this.sendMessage(stats);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('خطأ في التحقق من الأوامر:', error);
        }
    }
};

// ===== [4.2] تهيئة النظام =====
window.Telegram = TelegramSystem;

// بدء الاستماع للأوامر كل 30 ثانية
setInterval(() => Telegram.checkCommands(), 30000);

console.log('✅ نظام تلغرام جاهز مع دعم الصور');
