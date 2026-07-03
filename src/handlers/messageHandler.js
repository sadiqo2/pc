const { Api } = require('telegram');
const autoReply = require('../utils/autoReply');
const stats = require('../utils/stats');
const aiHandler = require('./aiHandler');

class MessageHandler {
  constructor(client) {
    this.client = client;
    this.pendingActions = new Map(); // لتخزين الإجراءات المعلقة
  }

  async handleMessage(event) {
    const message = event.message;
    const chatId = message.chatId;
    const userId = message.senderId;
    const text = message.message || '';

    // تسجيل الإحصائيات
    stats.recordMessage(userId);

    // التحقق من الأوامر
    if (text.startsWith('/')) {
      await this.handleCommand(message, text);
      return;
    }

    // التحقق من الإجراءات المعلقة (مثل إضافة رد)
    if (this.pendingActions.has(userId)) {
      await this.handlePendingAction(message, userId, text);
      return;
    }

    // الرد التلقائي
    const autoResponse = autoReply.getReply(text);
    if (autoResponse) {
      stats.recordMessage(userId, 'autoReply');
      await this.sendMessage(chatId, autoResponse);
      return;
    }

    // الذكاء الاصطناعي
    const settings = autoReply.getSettings();
    if (settings.aiEnabled && text.length > 2) {
      stats.recordMessage(userId, 'ai');
      const typingAction = await this.client.invoke(new Api.messages.SetTyping({
        peer: chatId,
        action: new Api.SendMessageTypingAction()
      }));
      
      const aiResponse = await aiHandler.generateResponse(userId, text, settings.aiModel);
      await this.sendMessage(chatId, aiResponse);
    }
  }

  async handleCommand(message, text) {
    const chatId = message.chatId;
    const userId = message.senderId;
    const command = text.split(' ')[0].toLowerCase();

    stats.recordCommand(command);

    switch (command) {
      case '/start':
      case '/menu':
        await this.sendMenu(chatId);
        break;

      case '/ai':
        const aiQuery = text.replace('/ai', '').trim();
        if (aiQuery) {
          const response = await aiHandler.generateResponse(userId, aiQuery);
          await this.sendMessage(chatId, `🤖 ${response}`);
        } else {
          await this.sendMessage(chatId, 'استخدم: /ai سؤالك هنا');
        }
        break;

      case '/addreply':
        this.pendingActions.set(userId, { type: 'add_reply', step: 1 });
        await this.sendMessage(chatId, '✏️ أرسل الكلمة اللي تريد الرد عليها:');
        break;

      case '/replies':
        const replies = autoReply.listReplies();
        let replyText = '📝 الردود التلقائية:\n\n';
        for (const [k, v] of Object.entries(replies)) {
          replyText += `• ${k} → ${v}\n`;
        }
        await this.sendMessage(chatId, replyText);
        break;

      case '/stats':
        await this.showStats(chatId);
        break;

      case '/clear':
        aiHandler.clearContext(userId);
        await this.sendMessage(chatId, '🧹 تم مسح سياق المحادثة!');
        break;

      case '/help':
        await this.showHelp(chatId);
        break;

      default:
        await this.sendMessage(chatId, '❓ أمر غير معروف. استخدم /menu');
    }
  }

  async handlePendingAction(message, userId, text) {
    const action = this.pendingActions.get(userId);
    const chatId = message.chatId;

    if (action.type === 'add_reply') {
      if (action.step === 1) {
        action.keyword = text;
        action.step = 2;
        await this.sendMessage(chatId, '✏️ الحين أرسل الرد اللي تريده:');
      } else if (action.step === 2) {
        await autoReply.addReply(action.keyword, text);
        this.pendingActions.delete(userId);
        await this.sendMessage(chatId, `✅ تم الإضافة!\n"${action.keyword}" → "${text}"`);
      }
    }
  }

  async sendMenu(chatId) {
    const { InlineKeyboards } = require('../keyboards/inlineKeyboards');
    await this.client.invoke(new Api.messages.SendMessage({
      peer: chatId,
      message: '🤖 **بوتي الذكي**\n\nاختر من القائمة:',
      replyMarkup: InlineKeyboards.mainMenu(),
      parseMode: 'markdown'
    }));
  }

  async showStats(chatId) {
    const s = stats.getStats();
    const statsText = `
📊 **الإحصائيات**

💬 إجمالي الرسائل: ${s.totalMessages}
👥 عدد المستخدمين: ${s.totalUsers}
🤖 ردود تلقائية: ${s.autoRepliesTriggered}
🧠 طلبات AI: ${s.aiRequests}
📅 رسائل اليوم: ${s.todayMessages}

🔝 الأوامر الأكثر استخداماً:
${s.topCommands.map(([cmd, count]) => `  ${cmd}: ${count}`).join('\n') || 'لا يوجد'}
    `;
    await this.sendMessage(chatId, statsText);
  }

  async showHelp(chatId) {
    const helpText = `
🤖 **أوامر البوت:**

/menu - فتح القائمة الرئيسية
/ai [سؤال] - سؤال الذكاء الاصطناعي
/addreply - إضافة رد تلقائي
/replies - عرض الردود التلقائية
/stats - عرض الإحصائيات
/clear - مسح سياق المحادثة
/help - عرض هذه المساعدة

💡 **ميزات:**
• ردود تلقائية ذكية
• ذكاء اصطناعي متكامل
• أزرار شفافة تفاعلية
• إحصائيات مفصلة
    `;
    await this.sendMessage(chatId, helpText);
  }

  async sendMessage(chatId, text) {
    await this.client.invoke(new Api.messages.SendMessage({
      peer: chatId,
      message: text,
      parseMode: 'markdown'
    }));
  }
}

module.exports = MessageHandler;
