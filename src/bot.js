const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const MessageHandler = require('./handlers/messageHandler');
const CallbackHandler = require('./handlers/callbackHandler');

// إعدادات الاتصال
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(''); // سيتم حفظه بعد أول تسجيل دخول

console.log('🚀 جاري تشغيل بوت تيليجرام...');
console.log('📱 سجل دخول بحسابك الشخصي');

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

const messageHandler = new MessageHandler(client);
const callbackHandler = new CallbackHandler(client);

async function startBot() {
  await client.start({
    phoneNumber: async () => await input.text('📱 أدخل رقم هاتفك (+964XXXXXXXXXX): '),
    password: async () => await input.text('🔐 أدخل كلمة المرور (لو عندك 2FA): '),
    phoneCode: async () => await input.text('📨 أدخل كود التحقق: '),
    onError: (err) => console.log(err),
  });

  console.log('✅ تم تسجيل الدخول بنجاح!');
  console.log('💾 جلسة الحفظ:', client.session.save());
  
  // حفظ الجلسة للاستخدام المستقبلي
  console.log('\n⚠️ احفظ الجلسة أعلاه في متغير STRING_SESSION في .env');

  // معالجة الرسائل الجديدة
  client.addEventHandler(async (event) => {
    try {
      await messageHandler.handleMessage(event);
    } catch (error) {
      console.error('Message Handler Error:', error);
    }
  }, new (require('telegram').events.NewMessage)({}));

  // معالجة الـ Callback Queries (الأزرار)
  client.addEventHandler(async (event) => {
    try {
      await callbackHandler.handleCallback(event);
    } catch (error) {
      console.error('Callback Handler Error:', error);
    }
  }, new (require('telegram').events.CallbackQuery)({}));

  console.log('🤖 البوت يعمل الآن! أرسل /menu لعرض القائمة');
}

// التعامل مع الأخطاء
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('SIGINT', async () => {
  console.log('\n👋 جاري إيقاف البوت...');
  await client.disconnect();
  process.exit(0);
});

startBot().catch(console.error);
