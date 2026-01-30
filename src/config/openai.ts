import OpenAI from 'openai';
import logger from '@/utils/logger';
import { OPENAI_CONSTANTS, MESSAGES_CONSTANTS, APP_CONSTANTS } from '@/constants';

class OpenAIConfig {
  private client: OpenAI | null = null;
  private readonly apiKey: string;
  private readonly model: string = OPENAI_CONSTANTS.MODEL;
  private readonly maxTokens: number = OPENAI_CONSTANTS.MAX_TOKENS;
  private readonly temperature: number = OPENAI_CONSTANTS.TEMPERATURE;

  constructor() {
    this.apiKey =
      process.env[APP_CONSTANTS.ENV.OPENAI_API_KEY] ?? APP_CONSTANTS.DEFAULTS.EMPTY_STRING;

    if (!this.apiKey) {
      logger.warn(MESSAGES_CONSTANTS.OPENAI.API_KEY_NOT_DEFINED);
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });

      logger.info(MESSAGES_CONSTANTS.OPENAI.CONFIGURATION_INITIALIZED, {
        model: this.model,
        maxTokens: this.maxTokens,
      });
    } catch (error) {
      logger.error(MESSAGES_CONSTANTS.OPENAI.INITIALIZATION_ERROR, { error: String(error) });
    }
  }

  public getClient(): OpenAI | null {
    return this.client;
  }

  public isAvailable(): boolean {
    return this.client != null && this.apiKey.length > 0;
  }

  public getDefaultConfig(): { model: string; max_completion_tokens: number; temperature: number } {
    return {
      model: this.model,
      max_completion_tokens: this.maxTokens,
      temperature: this.temperature,
    };
  }

  public async testConnection(): Promise<boolean> {
    if (!this.isAvailable() || this.client == null) {
      return false;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: OPENAI_CONSTANTS.ROLES.USER, content: OPENAI_CONSTANTS.TEST_MESSAGE }],
        max_completion_tokens: OPENAI_CONSTANTS.TEST_MAX_TOKENS,
      });

      logger.info(MESSAGES_CONSTANTS.OPENAI.TEST_CONNECTION_SUCCESSFUL, {
        model: response.model,
        usage: response.usage,
      });

      return true;
    } catch (error) {
      logger.error(MESSAGES_CONSTANTS.OPENAI.TEST_CONNECTION_FAILED, { error: String(error) });
      return false;
    }
  }
}

const openaiConfig = new OpenAIConfig();
export default openaiConfig;
