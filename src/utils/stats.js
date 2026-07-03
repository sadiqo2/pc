stats_js = '''const fs = require('fs-extra');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../../data/stats.json');

class StatsManager {
  constructor() {
    this.data = {
      totalMessages: 0,
      totalUsers: new Set(),
      commandsUsed: {},
      autoRepliesTriggered: 0,
      aiRequests: 0,
      dailyStats: {},
      hourlyStats: {}
    };
    this.load();
  }

  async load() {
    try {
      const saved = await fs.readJson(STATS_FILE);
      this.data = {
        ...saved,
        totalUsers: new Set(saved.totalUsers || [])
      };
    } catch {
      await this.save();
    }
  }

  async save() {
    const toSave = {
      ...this.data,
      totalUsers: Array.from(this.data.totalUsers)
    };
    await fs.ensureDir(path.dirname(STATS_FILE));
    await fs.writeJson(STATS_FILE, toSave, { spaces: 2 });
  }

  recordMessage(userId, type = 'message') {
    this.data.totalMessages++;
    this.data.totalUsers.add(userId.toString());
    
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    this.data.dailyStats[today] = (this.data.dailyStats[today] || 0) + 1;
    this.data.hourlyStats[hour] = (this.data.hourlyStats[hour] || 0) + 1;
    
    if (type === 'autoReply') this.data.autoRepliesTriggered++;
    if (type === 'ai') this.data.aiRequests++;
    
    this.save();
  }

  recordCommand(command) {
    this.data.commandsUsed[command] = (this.data.commandsUsed[command] || 0) + 1;
    this.save();
  }

  getStats() {
    return {
      ...this.data,
      totalUsers: this.data.totalUsers.size,
      topCommands: Object.entries(this.data.commandsUsed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      todayMessages: this.data.dailyStats[new Date().toISOString().split('T')[0]] || 0
    };
  }
}

module.exports = new StatsManager();
'''

with open('/mnt/agents/output/telegram-userbot-ai/src/utils/stats.js', 'w') as f:
    f.write(stats_js)

print("✅ src/utils/stats.js")
