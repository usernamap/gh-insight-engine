module.exports = {
  // Configuration pour openapi-diff
  breakingChanges: {
    // Considérer comme breaking changes
    strictMode: true,
    
    // Types de changements considérés comme breaking
    breaking: [
      // Suppression d'endpoints
      'path.remove',
      'operation.remove',
      
      // Changements de méthodes HTTP
      'operation.method.change',
      
      // Changements de paramètres
      'parameter.remove',
      'parameter.required.add',
      'parameter.type.change',
      'parameter.format.change',
      'parameter.enum.remove',
      
      // Changements de request body
      'requestBody.required.add',
      'requestBody.mediaType.remove',
      'requestBody.schema.property.remove',
      'requestBody.schema.property.required.add',
      'requestBody.schema.type.change',
      'requestBody.schema.format.change',
      'requestBody.schema.enum.remove',
      
      // Changements de réponses
      'response.remove',
      'response.mediaType.remove',
      'response.schema.property.remove',
      'response.schema.property.required.remove',
      'response.schema.type.change',
      'response.schema.format.change',
      'response.schema.enum.remove',
      
      // Changements de sécurité
      'security.scheme.remove',
      'security.requirement.add',
      'security.scope.remove',
      
      // Changements de serveurs
      'server.remove',
      'server.url.change'
    ],
    
    // Types de changements considérés comme non-breaking
    nonBreaking: [
      // Ajouts d'endpoints
      'path.add',
      'operation.add',
      
      // Ajouts de paramètres optionnels
      'parameter.add',
      'parameter.required.remove',
      'parameter.enum.add',
      
      // Ajouts de propriétés optionnelles
      'requestBody.schema.property.add',
      'requestBody.schema.property.required.remove',
      'requestBody.schema.enum.add',
      
      // Ajouts de réponses
      'response.add',
      'response.mediaType.add',
      'response.schema.property.add',
      'response.schema.property.required.add',
      'response.schema.enum.add',
      
      // Changements de documentation
      'info.description.change',
      'operation.description.change',
      'operation.summary.change',
      'parameter.description.change',
      'response.description.change',
      'schema.description.change',
      'tag.description.change',
      
      // Ajouts de sécurité
      'security.scheme.add',
      'security.requirement.remove',
      'security.scope.add',
      
      // Ajouts de serveurs
      'server.add'
    ]
  },
  
  // Configuration des rapports
  reporting: {
    // Format de sortie
    format: 'json',
    
    // Inclure les détails complets
    includeDetails: true,
    
    // Grouper par type de changement
    groupByType: true,
    
    // Inclure les exemples
    includeExamples: true
  },
  
  // Configuration de validation
  validation: {
    // Valider les schémas OpenAPI avant comparaison
    validateSchemas: true,
    
    // Ignorer les différences de formatage
    ignoreFormatting: true,
    
    // Ignorer les différences d'ordre
    ignoreOrder: true,
    
    // Ignorer les extensions vendor (x-*)
    ignoreVendorExtensions: false
  },
  
  // Exclusions personnalisées
  exclude: {
    // Chemins à ignorer dans la comparaison
    paths: [
      // Ignorer les changements dans les exemples
      '$.paths[*][*].responses[*].content[*].examples',
      '$.components.examples',
      
      // Ignorer les changements de version dans info
      '$.info.version'
    ],
    
    // Types de changements à ignorer
    changeTypes: [
      // Ignorer les changements de description pure
      'description.change'
    ]
  },
  
  // Configuration GitHub Insight Engine spécifique
  githubInsightEngine: {
    // Endpoints critiques qui ne doivent jamais avoir de breaking changes
    criticalEndpoints: [
      '/health',
      '/ping',
      '/auth/login',
      '/auth/me'
    ],
    
    // Schémas critiques
    criticalSchemas: [
      'LoginRequest',
      'LoginResponse',
      'UserProfile',
      'Repository',
      'Error'
    ],
    
    // Vérifications spécifiques
    customChecks: {
      // Vérifier que les nouveaux endpoints ont la sécurité appropriée
      securityRequired: true,
      
      // Vérifier la cohérence des codes de statut
      statusCodeConsistency: true,
      
      // Vérifier la cohérence des formats de réponse
      responseFormatConsistency: true
    }
  }
}; 