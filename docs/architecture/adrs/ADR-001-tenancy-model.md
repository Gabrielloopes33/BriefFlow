# ADR-001 - Modelo de Tenancy Hibrido

Status: Accepted
Data: 2026-04-17
Owner: @architect

## Contexto
O produto precisa de isolamento forte entre clientes, suporte a crescimento e custo operacional viavel em VPS.

## Decisao
Adotar tenancy hibrido:
1. Shared tenancy como padrao (tenant_id + politicas de isolamento).
2. Dedicated tenancy para clientes enterprise/hot tenants.
3. Registry de tenants para rotear conexao e modo de isolamento.

## Justificativa
1. Shared tenancy reduz custo operacional no inicio.
2. Dedicated tenancy atende requisitos de isolamento fisico quando necessario.
3. Modelo hibrido evita migracao total prematura para database-per-client.

## Trade-offs
1. Shared tenancy exige disciplina rigorosa de autorizacao e filtros por tenant.
2. Dedicated tenancy aumenta complexidade de provisionamento e observabilidade.

## Consequencias
1. Todas as tabelas de dominio terao tenant_id obrigatorio.
2. API deve validar ownership do tenant em todo endpoint protegido.
3. Provisionamento de tenant precisa suportar os dois modos de isolamento.

## Riscos e mitigacoes
1. Risco: vazamento cross-tenant.
   - Mitigacao: testes automatizados de isolamento e gate bloqueante.
2. Risco: custo de operacao com dedicated tenants.
   - Mitigacao: habilitar dedicated apenas por plano/politica.

## Checklist de seguranca
- [x] Escopo de tenant definido
- [x] Ownership obrigatoria em operacoes de escrita/leitura
- [x] Regra de isolamento por padrao
