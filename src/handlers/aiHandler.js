aiHandler_js = '''const dotenv = require('dotenv');
dotenv.config();

class AIHandler {
  constructor() {
    this.conversations = new Map();
    this.openai = null;
    this.useGroq = false;
    
    // محاولة استخدام OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('🤖 OpenAI: ✅ متصل');
      } catch (e) {
        console.log('🤖 OpenAI: ❌ غير متوفر');
      }
    }
    
    // محاولة استخدام Groq
    if (process.env.GROQ_API_KEY) {
      this.useGroq = true;
      console.log('🤖 Groq: ✅ متصل');
    }
    
    if (!this.openai && !this.useGroq) {
      console.log('🤖 AI: ❌ لا يوجد مفتاح (تشغيل بدون AI)');
    }
  }

  async generateResponse(userId, message, model = 'gpt-3.5-turbo') {
    // إذا ما في AI مفعل
    if (!this.openai && !this.useGroq) {
      return `🤖 الذكاء الاصطناعي معطل.

لتفعيله، أضف مفتاح في .env:
• OPENAI_API_KEY=sk-...
• أو GROQ_API_KEY=gsk-... (مجاني)`;
    }

    try {
      const context = this.conversations.get(userId) || [];
      context.push({ role: 'user', content: message });
      if (context.length > 10) context.shift();

      let aiResponse;

      // استخدام Groq (مجاني)
      if (this.useGroq) {
        const groqModel = model.includes('gpt-4') ? 'llama3-70b-8192' : 'llama3-8b-8192';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: 'system', content: 'أنت مساعد ذكي ودود يتحدث باللهجة العراقية. أجب بإجابات قصيرة ومفيدة.' },
              ...context
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });
        const data = await response.json();
        aiResponse = data.choices[0].message.content;
      }
      // استخدام OpenAI
      else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: 'أنت مساعد ذكي ودود يتحدث باللهجة العراقية. أجب بإجابات قصيرة ومفيدة.' },
            ...context
          ],
          max_tokens: 500,
          temperature: 0.7
        });
        aiResponse = response.choices[0].message.content;
      }

      context.push({ role: 'assistant', content: aiResponse });
      this.conversations.set(userId, context);

      return aiResponse;
    } catch (error) {
      console.error('AI Error:', error.message);
      return 'عذراً، حدث خطأ في الذكاء الاصطناعي. جرب مرة ثانية! 🤖';
    }
  }

  clearContext(userId) {
    this.conversations.delete(userId);
  }
}

module.exports = new AIHandler();
'''

with open('/mnt/agents/output/telegram-userbot-ai/src/handlers/aiHandler.js', 'w') as f:
    f.write(aiHandler_js)

print("✅ src/handlers/aiHandler.js")
