const fs = require('fs-extra');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../../config/settings.json');

class AutoReplyManager {
  constructor() {
    this.settings = {};
    this.load();
  }

  async load() {
    this.settings = await fs.readJson(SETTINGS_FILE);
  }

  async save() {
    await fs.writeJson(SETTINGS_FILE, this.settings, { spaces: 2 });
  }

  getReply(text) {
    const lowerText = text.toLowerCase().trim();
    
    for (const [keyword, reply] of Object.entries(this.settings.autoReplies)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return reply;
      }
    }
    return null;
  }

  async addReply(keyword, reply) {
    this.settings.autoReplies[keyword] = reply;
    await this.save();
  }

  async removeReply(keyword) {
    delete this.settings.autoReplies[keyword];
    await this.save();
  }

  listReplies() {
    return this.settings.autoReplies;
  }

  getSettings() {
    return this.settings;
  }

  async toggleAI(enabled) {
    this.settings.aiEnabled = enabled;
    await this.save();
  }

  async toggleStats(enabled) {
    this.settings.statsEnabled = enabled;
    await this.save();
  }
}

module.exports = new AutoReplyManager();
