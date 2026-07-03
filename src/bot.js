const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const MessageHandler = require('./handlers/messageHandler');
const CallbackHandler = require('./handlers/callbackHandler');

// ========== إعدادات من .env ==========
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER; // ← الرقم من .env
const sessionString = process.env.SESSION_STRING || '';

// التحقق من الإعدادات
if (!apiId || !apiHash) {
    console.error('❌ خطأ: API_ID و API_HASH مطلوبين في .env');
    console.error('   احصل عليهم من: https://my.telegram.org/apps');
    process.exit(1);
}

if (!phoneNumber) {
    console.error('❌ خطأ: PHONE_NUMBER مطلوب في .env');
    console.error('   مثال: PHONE_NUMBER=+9647712345678');
    process.exit(1);
}

console.log('🚀 جاري تشغيل بوت تيليجرام...');
console.log('📱 الرقم:', phoneNumber);

const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

const messageHandler = new MessageHandler(client);
const callbackHandler = new CallbackHandler(client);

// ========== تخزين مؤقت للكود ==========
const codeFile = path.join(__dirname, '../data/code.txt');

async function startBot() {
    // إنشاء مجلد data إذا ما موجود
    if (!fs.existsSync(path.dirname(codeFile))) {
        fs.mkdirSync(path.dirname(codeFile), { recursive: true });
    }

    await client.start({
        phoneNumber: () => Promise.resolve(phoneNumber),
        
        password: () => {
            console.log('🔐 الحساب محمي بكلمة مرور (2FA)');
            console.log('   أدخل كلمة المرور في ملف data/password.txt');
            
            // إنشاء ملف password.txt
            const passFile = path.join(__dirname, '../data/password.txt');
            fs.writeFileSync(passFile, '');
            
            // انتظر حتى يكتب المستخدم الباسورد
            return waitForFile(passFile, 'كلمة المرور');
        },
        
        phoneCode: () => {
            console.log('📨 تم إرسال كود التحقق!');
            console.log('   أدخل الكود في ملف data/code.txt');
            
            // إنشاء ملف code.txt
            fs.writeFileSync(codeFile, '');
            
            // انتظر حتى يكتب المستخدم الكود
            return waitForFile(codeFile, 'كود التحقق');
        },
        
        onError: (err) => console.error('❌ خطأ:', err.message),
    });

    // حفظ الجلسة
    const savedSession = client.session.save();
    console.log('\n✅ تم تسجيل الدخول بنجاح!');
    console.log('💾 احفظ هذا في .env كـ SESSION_STRING:');
    console.log(savedSession);
    
    // كتابة الجلسة في ملف
    const sessionFile = path.join(__dirname, '../data/session.txt');
    fs.writeFileSync(sessionFile, savedSession);
    console.log('   (تم حفظه أيضاً في data/session.txt)');

    // ========== معالجة الرسائل ==========
    const { NewMessage } = require('telegram').events;
    const { CallbackQuery } = require('telegram').events;

    client.addEventHandler(async (event) => {
        try {
            await messageHandler.handleMessage(event);
        } catch (error) {
            console.error('❌ خطأ في معالجة الرسالة:', error.message);
        }
    }, new NewMessage({}));

    client.addEventHandler(async (event) => {
        try {
            await callbackHandler.handleCallback(event);
        } catch (error) {
            console.error('❌ خطأ في معالجة الزر:', error.message);
        }
    }, new CallbackQuery({}));

    console.log('\n🤖 البوت يعمل الآن!');
    console.log('   أرسل /menu لعرض القائمة');
    console.log('   أرسل /help للمساعدة');
}

// ========== دالة انتظار الملف ==========
function waitForFile(filePath, label) {
    return new Promise((resolve) => {
        console.log(`   ⏳ في انتظار ${label}...`);
        
        const checkInterval = setInterval(() => {
            try {
                const content = fs.readFileSync(filePath, 'utf8').trim();
                
                if (content) {
                    clearInterval(checkInterval);
                    console.log(`   ✅ تم استلام ${label}`);
                    
                    // مسح الملف
                    fs.writeFileSync(filePath, '');
                    
                    resolve(content);
                }
            } catch (e) {
                // الملف لسه ما موجود
            }
        }, 1000); // فحص كل ثانية
        
        // timeout بعد 5 دقائق
        setTimeout(() => {
            clearInterval(checkInterval);
            console.error(`   ❌ انتهى الوقت! لم يتم إدخال ${label}`);
            process.exit(1);
        }, 300000);
    });
}

// ========== معالجة الإغلاق ==========
process.on('SIGINT', async () => {
    console.log('\n👋 جاري إيقاف البوت...');
    await client.disconnect();
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ خطأ غير متوقع:', err.message);
});

startBot().catch((err) => {
    console.error('❌ فشل تشغيل البوت:', err.message);
    process.exit(1);
});
