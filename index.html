<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>إرسال المدير للقناة</title>
    <style>
        body {
            background: #1a1a2e;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial;
        }
        .box {
            background: #16213e;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            min-width: 300px;
        }
        button {
            background: #0088cc;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
            text-align: right;
        }
        .success { background: #0f5c3e; color: white; }
        .error { background: #8b0000; color: white; }
    </style>
</head>
<body>
    <div class="box">
        <h2>📤 إرسال المدير إلى القناة</h2>
        <p>👑 المدير: <strong>azer</strong></p>
        <p>🔑 كلمة السر: <strong>19862</strong></p>
        <button onclick="sendAdmin()">📨 إرسال للقناة</button>
        <div id="result" class="result"></div>
    </div>

    <script>
        const BOT_TOKEN = '8576673096:AAHj80CdifTJNlOs6JgouHmjEXl0bM-8Shw';
        const CHANNEL_ID = '-1003822964890';

        async function sendAdmin() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '📤 جاري الإرسال...';
            resultDiv.className = 'result';
            
            const message = `#admin_registration 👑 *تسجيل مدير النظام*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *المعرف:* 19862
👤 *الاسم:* azer
📧 *البريد:* azer@admin.com
🔑 *كلمة السر:* 19862
👑 *الدور:* مدير
📅 *تاريخ التسجيل:* ${new Date().toLocaleString('ar-EG')}

✅ *حالة الحساب:* معتمد
━━━━━━━━━━━━━━━━━━━━━━
🔐 هذا الحساب لديه صلاحيات كاملة في النظام`;
            
            try {
                const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHANNEL_ID,
                        text: message,
                        parse_mode: 'Markdown'
                    })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    resultDiv.innerHTML = `✅ تم الإرسال بنجاح!
                    
📨 معرف الرسالة: ${data.result.message_id}
🔗 رابط القناة: افحص قناتك يدوياً
⏱️ ${new Date().toLocaleString('ar-EG')}`;
                    resultDiv.className = 'result success';
                } else {
                    resultDiv.innerHTML = `❌ فشل الإرسال!
                    
📝 الخطأ: ${data.description}
💡 الحل: تأكد من أن البوت مشرف في القناة`;
                    resultDiv.className = 'result error';
                }
            } catch (error) {
                resultDiv.innerHTML = `❌ خطأ: ${error.message}`;
                resultDiv.className = 'result error';
            }
        }
    </script>
</body>
</html>
