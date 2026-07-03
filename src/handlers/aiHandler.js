const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIHandler {
  constructor() {
    this.conversations = new Map(); // تخزين سياق المحادثة
  }

  async generateResponse(userId, message, model = 'gpt-3.5-turbo') {
    try {
      // الحصول على سياق المحادثة السابق
      const context = this.conversations.get(userId) || [];
      
      // إضافة الرسالة الجديدة
      context.push({ role: 'user', content: message });
      
      // الاحتفاظ بآخر 10 رسائل فقط
      if (context.length > 10) {
        context.shift();
      }

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد ذكي ودود. تتحدث باللهجة العراقية/العربية. أجب بإجابات قصيرة ومفيدة.'
          },
          ...context
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content;
      
      // حفظ رد AI في السياق
      context.push({ role: 'assistant', content: aiResponse });
      this.conversations.set(userId, context);

      return aiResponse;
    } catch (error) {
      console.error('AI Error:', error);
      return 'عذراً، حدث خطأ في الذكاء الاصطناعي. جرب مرة ثانية! 🤖';
    }
  }

  clearContext(userId) {
    this.conversations.delete(userId);
  }
}

module.exports = new AIHandler();
