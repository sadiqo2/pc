const { Api } = require('telegram');

class InlineKeyboards {
  // لوحة التحكم الرئيسية
  static mainMenu() {
    return new Api.ReplyInlineMarkup({
      rows: [
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '🤖 الذكاء الاصطناعي',
              data: Buffer.from('menu_ai')
            }),
            new Api.KeyboardButtonCallback({
              text: '⚡ الردود التلقائية',
              data: Buffer.from('menu_auto')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '📊 الإحصائيات',
              data: Buffer.from('menu_stats')
            }),
            new Api.KeyboardButtonCallback({
              text: '⚙️ الإعدادات',
              data: Buffer.from('menu_settings')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '❌ إغلاق',
              data: Buffer.from('close')
            })
          ]
        })
      ]
    });
  }

  // قائمة الردود التلقائية
  static autoReplyMenu(replies) {
    const rows = [];
    
    // زر إضافة رد جديد
    rows.push(new Api.KeyboardButtonRow({
      buttons: [
        new Api.KeyboardButtonCallback({
          text: '➕ إضافة رد جديد',
          data: Buffer.from('auto_add')
        }),
        new Api.KeyboardButtonCallback({
          text: '🗑️ حذف رد',
          data: Buffer.from('auto_remove')
        })
      ]
    }));

    // عرض الردود الحالية
    const replyEntries = Object.entries(replies).slice(0, 8);
    for (const [keyword, reply] of replyEntries) {
      rows.push(new Api.KeyboardButtonRow({
        buttons: [
          new Api.KeyboardButtonCallback({
            text: `📝 ${keyword.substring(0, 15)}`,
            data: Buffer.from(`auto_view:${keyword}`)
          })
        ]
      }));
    }

    rows.push(new Api.KeyboardButtonRow({
      buttons: [
        new Api.KeyboardButtonCallback({
          text: '🔙 رجوع',
          data: Buffer.from('menu_main')
        })
      ]
    }));

    return new Api.ReplyInlineMarkup({ rows });
  }

  // إعدادات الذكاء الاصطناعي
  static aiMenu(aiEnabled) {
    const status = aiEnabled ? '✅ مفعل' : '❌ معطل';
    
    return new Api.ReplyInlineMarkup({
      rows: [
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: `🤖 الذكاء الاصطناعي: ${status}`,
              data: Buffer.from('ai_toggle')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '🧠 نموذج GPT-3.5',
              data: Buffer.from('ai_model:gpt-3.5-turbo')
            }),
            new Api.KeyboardButtonCallback({
              text: '🧠 نموذج GPT-4',
              data: Buffer.from('ai_model:gpt-4')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '🔙 رجوع',
              data: Buffer.from('menu_main')
            })
          ]
        })
      ]
    });
  }

  // إعدادات عامة
  static settingsMenu(settings) {
    return new Api.ReplyInlineMarkup({
      rows: [
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: settings.statsEnabled ? '📊 الإحصائيات: ✅' : '📊 الإحصائيات: ❌',
              data: Buffer.from('toggle_stats')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '🔄 إعادة تعيين الإحصائيات',
              data: Buffer.from('reset_stats')
            })
          ]
        }),
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '🔙 رجوع',
              data: Buffer.from('menu_main')
            })
          ]
        })
      ]
    });
  }

  // أزرار تأكيد
  static confirmButtons(action) {
    return new Api.ReplyInlineMarkup({
      rows: [
        new Api.KeyboardButtonRow({
          buttons: [
            new Api.KeyboardButtonCallback({
              text: '✅ نعم',
              data: Buffer.from(`confirm:${action}`)
            }),
            new Api.KeyboardButtonCallback({
              text: '❌ لا',
              data: Buffer.from('cancel')
            })
          ]
        })
      ]
    });
  }
}

module.exports = InlineKeyboards;
