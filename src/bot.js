const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage, CallbackQuery } = require('telegram').events;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

dotenv.config();

// ========== إعدادات ==========
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER;
const SESSION_FILE = path.join(__dirname, '../data/session.txt');
const ENV_FILE = path.join(__dirname, '../.env');

// قراءة الجلسة
let sessionString = process.env.SESSION_STRING || '';
if (!sessionString && fs.existsSync(SESSION_FILE)) {
    sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
}

// التحقق
if (!apiId || !apiHash) {
    console.error('❌ API_ID و API_HASH مطلوبين!');
    console.error('   احصل عليهم من: https://my.telegram.org/apps');
    process.exit(1);
}

if (!phoneNumber && !sessionString) {
    console.error('❌ PHONE_NUMBER مطلوب في .env');
    console.error('   مثال: PHONE_NUMBER=+9647712345678');
    process.exit(1);
}

// إنشاء مجلد data
if (!fs.existsSync(path.dirname(SESSION_FILE))) {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
}

console.log('🚀 بوت تيليجرام - جاري التشغيل...\n');

const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

// ========== دالة إدخال من Terminal ==========
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// ========== حفظ الجلسة ==========
function saveSession(session) {
    // حفظ في ملف
    fs.writeFileSync(SESSION_FILE, session);
    
    // تحديث .env
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
        // استبدل SESSION_STRING القديم أو أضف جديد
        if (envContent.includes('SESSION_STRING=')) {
            envContent = envContent.replace(/SESSION_STRING=.*/g, `SESSION_STRING=${session}`);
        } else {
            envContent += `\nSESSION_STRING=${session}\n`;
        }
    } else {
        envContent = `SESSION_STRING=${session}\n`;
    }
    fs.writeFileSync(ENV_FILE, envContent);
    
    console.log('\n✅ تم حفظ الجلسة!');
    console.log('📁 data/session.txt');
    console.log('📝 .env (تم تحديثه)');
}

// ========== تشغيل البوت ==========
async function startBot() {
    const handlers = require('./handlers/messageHandler');
    const callbackHandlers = require('./handlers/callbackHandler');
    
    const msgHandler = new handlers(client);
    const cbHandler = new callbackHandlers(client);

    await client.start({
        phoneNumber: async () => {
            if (sessionString) {
                console.log('📱 استخدام جلسة مخزنة...');
                return phoneNumber || '+964000000000';
            }
            console.log('📱 تسجيل دخول جديد');
            return phoneNumber;
        },
        
        password: async () => {
            console.log('\n🔐 الحساب محمي بكلمة مرور (2FA)');
            const pass = await ask('   أدخل كلمة المرور: ');
            return pass;
        },
        
        phoneCode: async () => {
            console.log('\n📨 تم إرسال كود التحقق لتيليجرام');
            console.log('   (تحقق من التطبيق أو الرسائل)');
            const code = await ask('   أدخل الكود: ');
            return code;
        },
        
        onError: (err) => {
            console.error('\n❌ خطأ:', err.message);
        },
    });

    // حفظ الجلسة الجديدة
    const newSession = client.session.save();
    if (newSession && newSession !== sessionString) {
        saveSession(newSession);
    }

    console.log('\n✅ تم تسجيل الدخول بنجاح!');
    console.log('🤖 البوت يعمل الآن\n');

    // معالجة الرسائل
    client.addEventHandler(async (event) => {
        try {
            await msgHandler.handleMessage(event);
        } catch (e) {
            // console.error('رسالة:', e.message);
        }
    }, new NewMessage({}));

    client.addEventHandler(async (event) => {
        try {
            await cbHandler.handleCallback(event);
        } catch (e) {
            // console.error('زر:', e.message);
        }
    }, new CallbackQuery({}));

    console.log('📋 الأوامر المتاحة:');
    console.log('   /menu - القائمة الرئيسية');
    console.log('   /help - المساعدة');
    console.log('   Ctrl+C - إيقاف البوت\n');
}

// ========== إغلاق ==========
process.on('SIGINT', async () => {
    console.log('\n👋 إيقاف البوت...');
    await client.disconnect();
    process.exit(0);
});

startBot().catch(err => {
    console.error('❌ فشل:', err.message);
    process.exit(1);
});
