import swaggerJsdoc from 'swagger-jsdoc';
import { zodToOpenAPISchema, generateComponentName } from './swagger-utils';
import { 
  insertClientSchema, 
  insertSourceSchema, 
  insertContentSchema, 
  insertBriefSchema, 
  insertAnalysisConfigSchema,
  clients,
  sources,
  contents,
  briefs,
  analysisConfigs
} from '../shared/schema';

const toOpenApiSchema = (schema: unknown) => zodToOpenAPISchema(schema as any);

// Opções do Swagger
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BriefFlow API',
      version: '1.0.0',
      description: 'API para geração de conteúdo com fontes reais usando Claude API',
      contact: {
        name: 'BriefFlow Team',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com' 
          : `http://localhost:${process.env.PORT || 5001}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de Produção' 
          : 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      schemas: {
        // Client schemas
        Client: toOpenApiSchema(insertClientSchema),
        InsertClient: toOpenApiSchema(insertClientSchema),
        
        // Source schemas
        Source: toOpenApiSchema(insertSourceSchema),
        InsertSource: toOpenApiSchema(insertSourceSchema),
        
        // Content schemas
        Content: toOpenApiSchema(insertContentSchema),
        InsertContent: toOpenApiSchema(insertContentSchema),
        
        // Brief schemas
        Brief: toOpenApiSchema(insertBriefSchema),
        InsertBrief: toOpenApiSchema(insertBriefSchema),
        
        // AnalysisConfig schemas
        AnalysisConfig: toOpenApiSchema(insertAnalysisConfigSchema),
        InsertAnalysisConfig: toOpenApiSchema(insertAnalysisConfigSchema),
        
        // Error schemas
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem de erro',
            },
            field: {
              type: 'string',
              description: 'Campo com erro (opcional)',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem de validação',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      // Health Check
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Verificar saúde da API',
          description: 'Endpoint para verificar se a API está funcionando corretamente',
          responses: {
            200: {
              description: 'API está saudável',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      
      // Clients endpoints
      '/api/clients': {
        get: {
          tags: ['Clients'],
          summary: 'Listar todos os clientes',
          description: 'Retorna uma lista de todos os clientes cadastrados',
          responses: {
            200: {
              description: 'Lista de clientes',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Client' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Clients'],
          summary: 'Criar novo cliente',
          description: 'Cria um novo cliente no sistema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InsertClient' },
              },
            },
          },
          responses: {
            201: {
              description: 'Cliente criado com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            400: {
              description: 'Erro de validação',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      
      '/api/clients/{id}': {
        get: {
          tags: ['Clients'],
          summary: 'Obter cliente por ID',
          description: 'Retorna os detalhes de um cliente específico',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          responses: {
            200: {
              description: 'Dados do cliente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            404: {
              description: 'Cliente não encontrado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        put: {
          tags: ['Clients'],
          summary: 'Atualizar cliente',
          description: 'Atualiza os dados de um cliente existente',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InsertClient' },
              },
            },
          },
          responses: {
            200: {
              description: 'Cliente atualizado com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            404: {
              description: 'Cliente não encontrado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Clients'],
          summary: 'Excluir cliente',
          description: 'Exclui um cliente do sistema',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          responses: {
            204: {
              description: 'Cliente excluído com sucesso',
            },
            404: {
              description: 'Cliente não encontrado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      
      // Sources endpoints
      '/api/clients/{clientId}/sources': {
        get: {
          tags: ['Sources'],
          summary: 'Listar fontes de um cliente',
          description: 'Retorna todas as fontes de conteúdo de um cliente específico',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          responses: {
            200: {
              description: 'Lista de fontes',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Source' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Sources'],
          summary: 'Criar nova fonte',
          description: 'Adiciona uma nova fonte de conteúdo para um cliente',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InsertSource' },
              },
            },
          },
          responses: {
            201: {
              description: 'Fonte criada com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Source' },
                },
              },
            },
            400: {
              description: 'Erro de validação',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      
      '/api/sources/{id}': {
        delete: {
          tags: ['Sources'],
          summary: 'Excluir fonte',
          description: 'Exclui uma fonte de conteúdo do sistema',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID da fonte',
            },
          ],
          responses: {
            204: {
              description: 'Fonte excluída com sucesso',
            },
            404: {
              description: 'Fonte não encontrada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      
      // Contents endpoints
      '/api/clients/{clientId}/contents': {
        get: {
          tags: ['Contents'],
          summary: 'Listar conteúdos de um cliente',
          description: 'Retorna todos os conteúdos coletados para um cliente específico',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          responses: {
            200: {
              description: 'Lista de conteúdos',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Content' },
                  },
                },
              },
            },
          },
        },
      },
      
      // Briefs endpoints
      '/api/clients/{clientId}/briefs': {
        get: {
          tags: ['Briefs'],
          summary: 'Listar pautas de um cliente',
          description: 'Retorna todas as pautas de conteúdo de um cliente específico',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          responses: {
            200: {
              description: 'Lista de pautas',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Brief' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Briefs'],
          summary: 'Criar nova pauta',
          description: 'Cria uma nova pauta de conteúdo para um cliente',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InsertBrief' },
              },
            },
          },
          responses: {
            201: {
              description: 'Pauta criada com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Brief' },
                },
              },
            },
            400: {
              description: 'Erro de validação',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      
      '/api/briefs/{id}': {
        get: {
          tags: ['Briefs'],
          summary: 'Obter pauta por ID',
          description: 'Retorna os detalhes de uma pauta específica',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID da pauta',
            },
          ],
          responses: {
            200: {
              description: 'Dados da pauta',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Brief' },
                },
              },
            },
            404: {
              description: 'Pauta não encontrada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        put: {
          tags: ['Briefs'],
          summary: 'Atualizar pauta',
          description: 'Atualiza os dados de uma pauta existente',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
              description: 'ID da pauta',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InsertBrief' },
              },
            },
          },
          responses: {
            200: {
              description: 'Pauta atualizada com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Brief' },
                },
              },
            },
            404: {
              description: 'Pauta não encontrada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      
      '/api/clients/{clientId}/briefs/generate': {
        post: {
          tags: ['Briefs'],
          summary: 'Gerar pauta com IA',
          description: 'Gera automaticamente uma pauta de conteúdo usando Claude API',
          parameters: [
            {
              in: 'path',
              name: 'clientId',
              required: true,
              schema: { type: 'string' },
              description: 'ID do cliente',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    contentIds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'IDs dos conteúdos para basear a geração',
                    },
                    topic: {
                      type: 'string',
                      description: 'Tópico específico para a pauta',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Pauta gerada com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Brief' },
                },
              },
            },
            500: {
              description: 'Erro na geração da pauta',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // Não vamos usar o parser de comentários, vamos definir tudo manualmente
};

// Gera a especificação do Swagger
export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;