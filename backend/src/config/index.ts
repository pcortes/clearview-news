import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dailyCostCap: parseFloat(process.env.DAILY_COST_CAP || '50'),
  environment: process.env.NODE_ENV || 'development',

  // OpenAI configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5',
};
