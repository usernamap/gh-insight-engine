import OpenAI from 'openai';
import logger from '@/utils/logger';

/**
 * Configuration OpenAI pour l'analyse IA des données GitHub
 */
class OpenAIConfig {
  private client: OpenAI | null = null;
  private readonly apiKey: string;
  private readonly model: string = 'gpt-4o-mini';
  private readonly maxTokens: number = 4096;
  private readonly temperature: number = 0.3;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? '';

    if (!this.apiKey) {
      logger.warn('OPENAI_API_KEY non définie - Service IA désactivé');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });

      logger.info('Configuration OpenAI initialisée', {
        model: this.model,
        maxTokens: this.maxTokens,
      });
    } catch (error) {
      logger.error('Erreur initialisation OpenAI', { error: String(error) });
    }
  }

  /**
   * Récupère le client OpenAI
   */
  public getClient(): OpenAI | null {
    return this.client;
  }

  /**
   * Vérifie si OpenAI est disponible
   */
  public isAvailable(): boolean {
    return this.client != null && this.apiKey.length > 0;
  }

  /**
   * Configuration par défaut pour les analyses
   */
  public getDefaultConfig(): { model: string; max_tokens: number; temperature: number } {
    return {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };
  }

  /**
   * Test de connectivité OpenAI
   */
  public async testConnection(): Promise<boolean> {
    if (!this.isAvailable() || this.client == null) {
      return false;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      logger.info('Test connexion OpenAI réussi', {
        model: response.model,
        usage: response.usage,
      });

      return true;
    } catch (error) {
      logger.error('Test connexion OpenAI échoué', { error: String(error) });
      return false;
    }
  }
}

// Instance singleton
const openaiConfig = new OpenAIConfig();
export default openaiConfig;
