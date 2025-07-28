module.exports = {
  breakingChanges: {
    strictMode: true,
    
    breaking: [
      'path.remove',
      'operation.remove',
      
      'operation.method.change',
      
      'parameter.remove',
      'parameter.required.add',
      'parameter.type.change',
      'parameter.format.change',
      'parameter.enum.remove',
      
      'requestBody.required.add',
      'requestBody.mediaType.remove',
      'requestBody.schema.property.remove',
      'requestBody.schema.property.required.add',
      'requestBody.schema.type.change',
      'requestBody.schema.format.change',
      'requestBody.schema.enum.remove',
  
      'response.remove',
      'response.mediaType.remove',
      'response.schema.property.remove',
      'response.schema.property.required.remove',
      'response.schema.type.change',
      'response.schema.format.change',
      'response.schema.enum.remove',
      
      'security.scheme.remove',
      'security.requirement.add',
      'security.scope.remove',
      
      'server.remove',
      'server.url.change'
    ],
    
    nonBreaking: [
      'path.add',
      'operation.add',
      
      'parameter.add',
      'parameter.required.remove',
      'parameter.enum.add',
      
      'requestBody.schema.property.add',
      'requestBody.schema.property.required.remove',
      'requestBody.schema.enum.add',
      
      'response.add',
      'response.mediaType.add',
      'response.schema.property.add',
      'response.schema.property.required.add',
      'response.schema.enum.add',
      
      'info.description.change',
      'operation.description.change',
      'operation.summary.change',
      'parameter.description.change',
      'response.description.change',
      'schema.description.change',
      'tag.description.change',
      
      'security.scheme.add',
      'security.requirement.remove',
      'security.scope.add',
      
      'server.add'
    ]
  },
  
  reporting: {
    format: 'json',
    includeDetails: true,
    groupByType: true,
    includeExamples: true
  },
  
  validation: {
    validateSchemas: true,
    ignoreFormatting: true,
    ignoreOrder: true,
    ignoreVendorExtensions: false
  },
  
  exclude: {
    paths: [
      '$.paths[*][*].responses[*].content[*].examples',
      '$.components.examples',
      '$.info.version'
    ],
    
    changeTypes: [
      'description.change'
    ]
  },
  
  githubInsightEngine: {
    criticalEndpoints: [
      '/health',
      '/ping',
      '/auth/login',
      '/auth/me'
    ],
    
    criticalSchemas: [
      'LoginRequest',
      'LoginResponse',
      'UserProfile',
      'Repository',
      'Error'
    ],
    
    customChecks: {
      securityRequired: true,
      statusCodeConsistency: true,
      responseFormatConsistency: true
    }
  }
}; 