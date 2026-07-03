const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// ========== تحميل .env ==========
dotenv.config();

const MessageHandler = require('./handlers/messageHandler');
const CallbackHandler = require('./handlers/callbackHandler');

// ========== الإعدادات ==========
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER;
let sessionString = process.env.SESSION_STRING || '';

// ملف الجلسة الاحتياطي
const SESSION_FILE = path.join(__dirname, '../data/session.txt');

// إذا SESSION_STRING فاضي، جرب اقرأ من الملف
if (!sessionString && fs.existsSync(SESSION_FILE)) {
    sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    console.log('📂 تم تحميل الجلسة من الملف');
}

// التحقق من API
if (!apiId || !apiHash) {
    console.error('❌ API_ID و API_HASH مطلوبين في .env');
    console.error('   https://my.telegram.org/apps');
    process.exit(1);
}

if (!phoneNumber && !sessionString) {
    console.error('❌ PHONE_NUMBER مطلوب للتسجيل الأول');
    process.exit(1);
}

console.log('🚀 تشغيل البوت...');
console.log('📱 الرقم:', phoneNumber || 'مخزن بالجلسة');
console.log('🔑 الجلسة:', sessionString ? '✅ موجودة' : '❌ فارغة');

const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

const messageHandler = new MessageHandler(client);
const callbackHandler = new CallbackHandler(client);

// ========== ملفات مؤقتة ==========
const CODE_FILE = path.join(__dirname, '../data/code.txt');
const PASS_FILE = path.join(__dirname, '../data/password.txt');

async function startBot() {
    // إنشاء مجلد data
    if (!fs.existsSync(path.dirname(CODE_FILE))) {
        fs.mkdirSync(path.dirname(CODE_FILE), { recursive: true });
    }

    await client.start({
        phoneNumber: async () => {
            if (sessionString) {
                console.log('📱 استخدام الجلسة المخزنة...');
                return phoneNumber || '+964000000000'; // رقم وهمي إذا عندنا جلسة
            }
            console.log('📱 تسجيل دخول جديد:', phoneNumber);
            return phoneNumber;
        },
        
        password: async () => {
            console.log('🔐 2FA مطلوب! اكتب الباسورد في data/password.txt');
            fs.writeFileSync(PASS_FILE, '');
            return waitForFile(PASS_FILE, 'كلمة المرور');
        },
        
        phoneCode: async () => {
            console.log('📨 الكود وصل! اكتبه في data/code.txt');
            fs.writeFileSync(CODE_FILE, '');
            return waitForFile(CODE_FILE, 'كود التحقق');
        },
        
        onError: (err) => console.error('❌ خطأ:', err.message),
    });

    // ========== حفظ الجلسة ==========
    const newSession = client.session.save();
    
    // حفظ في الملف
    fs.writeFileSync(SESSION_FILE, newSession);
    console.log('\n✅ تم حفظ الجلسة في data/session.txt');
    
    // طباعة للـ .env
    console.log('\n💾 أضف هذا لـ .env:');
    console.log('SESSION_STRING=' + newSession);
    console.log('\n📋 أو انسخ من data/session.txt');

    // ========== معالجة الأحداث ==========
    const { NewMessage, CallbackQuery } = require('telegram').events;

    client.addEventHandler(async (event) => {
        try { await messageHandler.handleMessage(event); }
        catch (e) { console.error('❌ رسالة:', e.message); }
    }, new NewMessage({}));

    client.addEventHandler(async (event) => {
        try { await callbackHandler.handleCallback(event); }
        catch (e) { console.error('❌ زر:', e.message); }
    }, new CallbackQuery({}));

    console.log('\n🤖 البوت شغال!');
}

// ========== انتظار الملف ==========
function waitForFile(filePath, label) {
    return new Promise((resolve) => {
        console.log(`   ⏳ انتظر ${label}...`);
        
        const interval = setInterval(() => {
            try {
                const content = fs.readFileSync(filePath, 'utf8').trim();
                if (content) {
                    clearInterval(interval);
                    console.log(`   ✅ ${label} وصل!`);
                    fs.writeFileSync(filePath, '');
                    resolve(content);
                }
            } catch {}
        }, 1000);
        
        setTimeout(() => {
            clearInterval(interval);
            console.error(`   ❌ انتهى الوقت (${label})`);
            process.exit(1);
        }, 300000);
    });
}

// ========== إغلاق نظيف ==========
process.on('SIGINT', async () => {
    console.log('\n👋 باي...');
    await client.disconnect();
    process.exit(0);
});

startBot().catch(err => {
    console.error('❌ فشل:', err.message);
    process.exit(1);
});
