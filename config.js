require('dotenv').config();

// Runtime validation for required environment variables
const requiredEnvVars = [
  'EVOLUTION_API_KEY',
  'EVOLUTION_INSTANCE_NAME'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please set these variables in your .env file or environment.');
  console.error('   See .env.example for reference.\n');
  process.exit(1);
}

module.exports = {
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default_instance'
  },

  bot: {
    port: process.env.BOT_PORT || 3000,
    webhookPath: process.env.BOT_WEBHOOK_PATH || '/webhook',
    autoRegisterWebhook: process.env.WEBHOOK_AUTO_REGISTER !== 'false', // Default true
    // Webhook URL for Evolution API to call (important for Docker!)
    webhookUrl: process.env.WEBHOOK_URL || null // If null, auto-generate with host.docker.internal
  },

  admins: process.env.ADMINS ? process.env.ADMINS.split(',') : [],

  features: {
    tagall: {
      enabled: process.env.TAGALL_ENABLED === 'true',
      adminOnly: true,
      commands: ['.h']
    },

    help: {
      enabled: process.env.HELP_ENABLED === 'true',
      commands: ['/help', '/commands', '!help']
    },

    blast: {
      enabled: true,
      useTypingIndicator: process.env.BLAST_USE_TYPING !== 'false', // Default true, set to false if not supported
      minDelay: parseInt(process.env.BLAST_MIN_DELAY) || 3000, // milliseconds
      maxDelay: parseInt(process.env.BLAST_MAX_DELAY) || 8000, // milliseconds
      maxTargets: parseInt(process.env.BLAST_MAX_TARGETS) || 50
    }
  }
};
