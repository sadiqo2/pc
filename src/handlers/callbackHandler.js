const { Api } = require('telegram');
const autoReply = require('../utils/autoReply');
const stats = require('../utils/stats');
const { InlineKeyboards } = require('../keyboards/inlineKeyboards');

class CallbackHandler {
  constructor(client) {
    this.client = client;
    this.pendingActions = new Map();
  }

  async handleCallback(event) {
    const callbackQuery = event.query;
    const data = callbackQuery.data.toString();
    const chatId = callbackQuery.peer.userId || callbackQuery.peer.channelId;
    const userId = callbackQuery.userId;
    const msgId = callbackQuery.msgId;

    console.log('Callback received:', data);

    // الرد على الـ callback (إزالة التحميل)
    await this.client.invoke(new Api.messages.SetBotCallbackAnswer({
      queryId: callbackQuery.queryId,
      message: 'تم!'
    }));

    // معالجة الأزرار
    switch (true) {
      case data === 'menu_main':
        await this.editMessage(chatId, msgId, '🤖 **بوتي الذكي**\n\nاختر من القائمة:', InlineKeyboards.mainMenu());
        break;

      case data === 'menu_ai':
        const settings = autoReply.getSettings();
        await this.editMessage(chatId, msgId, '🤖 **إعدادات الذكاء الاصطناعي**', InlineKeyboards.aiMenu(settings.aiEnabled));
        break;

      case data === 'menu_auto':
        const replies = autoReply.listReplies();
        await this.editMessage(chatId, msgId, '⚡ **الردود التلقائية**\n\nاختر لإدارة الردود:', InlineKeyboards.autoReplyMenu(replies));
        break;

      case data === 'menu_stats':
        await this.showStatsInMessage(chatId, msgId);
        break;

      case data === 'menu_settings':
        const currentSettings = autoReply.getSettings();
        await this.editMessage(chatId, msgId, '⚙️ **الإعدادات**', InlineKeyboards.settingsMenu(currentSettings));
        break;

      case data === 'ai_toggle':
        const aiSettings = autoReply.getSettings();
        await autoReply.toggleAI(!aiSettings.aiEnabled);
        const newStatus = autoReply.getSettings().aiEnabled;
        await this.editMessage(chatId, msgId, `🤖 **الذكاء الاصطناعي: ${newStatus ? '✅ مفعل' : '❌ معطل'}**`, InlineKeyboards.aiMenu(newStatus));
        break;

      case data.startsWith('ai_model:'):
        const model = data.split(':')[1];
        await autoReply.toggleAI(true);
        // تحديث النموذج في الإعدادات
        const s = autoReply.getSettings();
        s.aiModel = model;
        await autoReply.save();
        await this.editMessage(chatId, msgId, `🧠 **تم تغيير النموذج إلى ${model}**`, InlineKeyboards.aiMenu(true));
        break;

      case data === 'auto_add':
        this.pendingActions.set(userId, { type: 'add_reply', chatId });
        await this.client.invoke(new Api.messages.SendMessage({
          peer: chatId,
          message: '✏️ أرسل الكلمة اللي تريد الرد عليها:'
        }));
        break;

      case data === 'toggle_stats':
        const st = autoReply.getSettings();
        await autoReply.toggleStats(!st.statsEnabled);
        const updatedSettings = autoReply.getSettings();
        await this.editMessage(chatId, msgId, '⚙️ **الإعدادات**', InlineKeyboards.settingsMenu(updatedSettings));
        break;

      case data === 'reset_stats':
        // إعادة تعيين الإحصائيات
        await this.editMessage(chatId, msgId, '⚠️ هل تريد إعادة تعيين الإحصائيات؟', InlineKeyboards.confirmButtons('reset_stats'));
        break;

      case data === 'confirm:reset_stats':
        const StatsManager = require('../utils/stats');
        StatsManager.data = {
          totalMessages: 0,
          totalUsers: new Set(),
          commandsUsed: {},
          autoRepliesTriggered: 0,
          aiRequests: 0,
          dailyStats: {},
          hourlyStats: {}
        };
        await StatsManager.save();
        await this.editMessage(chatId, msgId, '✅ تم إعادة تعيين الإحصائيات!', InlineKeyboards.settingsMenu(autoReply.getSettings()));
        break;

      case data === 'close':
        await this.client.invoke(new Api.messages.DeleteMessages({
          id: [msgId],
          revoke: true
        }));
        break;

      case data === 'cancel':
        await this.editMessage(chatId, msgId, '❌ تم الإلغاء', InlineKeyboards.mainMenu());
        break;

      default:
        if (data.startsWith('auto_view:')) {
          const keyword = data.split(':')[1];
          const allReplies = autoReply.listReplies();
          const reply = allReplies[keyword];
          await this.client.invoke(new Api.messages.SendMessage({
            peer: chatId,
            message: `📝 **${keyword}**\n→ ${reply}`
          }));
        }
    }
  }

  async editMessage(chatId, msgId, text, keyboard) {
    try {
      await this.client.invoke(new Api.messages.EditMessage({
        peer: chatId,
        id: msgId,
        message: text,
        replyMarkup: keyboard,
        parseMode: 'markdown'
      }));
    } catch (error) {
      console.error('Edit message error:', error);
    }
  }

  async showStatsInMessage(chatId, msgId) {
    const s = stats.getStats();
    const statsText = `
📊 **الإحصائيات**

💬 إجمالي الرسائل: ${s.totalMessages}
👥 عدد المستخدمين: ${s.totalUsers}
🤖 ردود تلقائية: ${s.autoRepliesTriggered}
🧠 طلبات AI: ${s.aiRequests}
📅 رسائل اليوم: ${s.todayMessages}
    `;
    await this.editMessage(chatId, msgId, statsText, InlineKeyboards.mainMenu());
  }
}

module.exports = CallbackHandler;
