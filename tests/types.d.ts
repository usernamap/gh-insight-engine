// Extension des matchers Jest personnalisés uniquement, sans redéclaration globale

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(property: string, value?: any): R;
    }
  }
}

export {}; 