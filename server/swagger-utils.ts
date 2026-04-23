import { z } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';

// Definindo tipos localmente para evitar problemas de importação
type SchemaObject = any;

/**
 * Converte um schema Zod para um schema OpenAPI
 */
export function zodToOpenAPISchema(zodSchema: z.ZodType<any>): SchemaObject {
  // Extrai a descrição do schema se existir
  const description = (zodSchema as any)._def?.description;

  if (zodSchema instanceof z.ZodString) {
    const result: OpenAPIV3.SchemaObject = {
      type: 'string',
      description,
    };
    
    // Access the internal definition safely
    const def = (zodSchema as any)._def || {};
    if (def.checks) {
      for (const check of def.checks) {
        switch (check.kind) {
          case 'min':
            result.minLength = check.value;
            break;
          case 'max':
            result.maxLength = check.value;
            break;
          case 'regex':
            result.pattern = check.regex.source;
            break;
        }
      }
    }
    
    return result;
  }

  if (zodSchema instanceof z.ZodNumber) {
    const result: OpenAPIV3.SchemaObject = {
      type: 'number',
      description,
    };
    
    // Access the internal definition safely
    const def = (zodSchema as any)._def || {};
    if (def.checks) {
      for (const check of def.checks) {
        switch (check.kind) {
          case 'min':
            result.minimum = check.value;
            break;
          case 'max':
            result.maximum = check.value;
            break;
        }
      }
    }
    
    return result;
  }

  if (zodSchema instanceof z.ZodBoolean) {
    return {
      type: 'boolean',
      description,
    };
  }

  if (zodSchema instanceof z.ZodDate) {
    return {
      type: 'string',
      format: 'date-time',
      description,
    };
  }

  if (zodSchema instanceof z.ZodArray) {
    return {
      type: 'array',
      description,
      items: zodToOpenAPISchema(zodSchema.element),
    };
  }

  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema._def.shape();
    const properties: Record<string, OpenAPIV3.SchemaObject> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType<any>;
      const isOpenAPIField = !(fieldSchema instanceof z.ZodOptional) && !(fieldSchema instanceof z.ZodDefault);
      
      if (isOpenAPIField) {
        required.push(key);
      }

      const resolvedSchema = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault
        ? fieldSchema._def.innerType
        : fieldSchema;

      properties[key] = zodToOpenAPISchema(resolvedSchema);
    }

    return {
      type: 'object',
      description,
      properties,
      ...(required.length > 0 && { required }),
    };
  }

  if (zodSchema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: zodSchema.options,
      description,
    };
  }

  if (zodSchema instanceof z.ZodUnion) {
    return {
      oneOf: zodSchema.options.map(zodToOpenAPISchema),
      description,
    };
  }

  if (zodSchema instanceof z.ZodLiteral) {
    const type = typeof zodSchema.value;
    const openApiType = type === 'bigint' ? 'integer' : 
                      type === 'object' ? 'object' :
                      type === 'symbol' ? 'string' :
                      type === 'undefined' ? 'string' :
                      type === 'function' ? 'string' : type;
    
    return {
      type: openApiType,
      enum: [zodSchema.value],
      description,
    };
  }

  if (zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodDefault) {
    return zodToOpenAPISchema(zodSchema._def.innerType);
  }

  // Tipo genérico como fallback
  return {
    type: 'object',
    description,
  };
}

/**
 * Gera um nome de componente baseado no nome do schema
 */
export function generateComponentName(schemaName: string): string {
  // Converte PascalCase ou camelCase para Title Case
  return schemaName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\s+/g, '')
    .trim();
}