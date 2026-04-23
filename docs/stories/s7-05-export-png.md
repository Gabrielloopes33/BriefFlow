# S7-05 — Export PNG por Slide + Upload Supabase Storage

Status: Ready  
Owner: @dev  
Sprint: 07  
Prioridade: Alta  
Pontos: 5  
Depende de: S7-02 (editor Konva), S7-01 (storage bucket)

## Contexto

O fluxo de criação visual se completa quando o usuário consegue exportar os slides como imagens PNG prontas para publicação. O export usa a API nativa do Konva (`stage.toDataURL()`) e o upload vai para o Supabase Storage, com as URLs salvas no banco (`creatives.export_urls`).

## Escopo

**IN:**
- Botão "Exportar" no editor Konva
- Export de cada slide como PNG via `stage.toDataURL('image/png', 1.0)`
- Upload dos PNGs para Supabase Storage no bucket `creatives`
- Organização: `creatives/{tenant_id}/{creative_id}/slide-{N}.png`
- Atualização de `creatives.export_urls` no banco com as URLs públicas
- Feedback de progresso durante export + upload (loading state por slide)
- Download local opcional (ZIP dos slides ou individual)

**OUT:**
- Publicação direta no Instagram/LinkedIn (requer API deles — roadmap futuro)
- Compressão de imagem (Konva exporta em qualidade máxima por padrão)
- Export em outros formatos (PDF, SVG)

## Critérios de Aceite

- [ ] Botão "Exportar carrossel" no editor gera PNGs de todos os slides
- [ ] PNGs em 1080x1080px (dimensão padrão de carrossel Instagram)
- [ ] Upload para Supabase Storage em `creatives/{tenant_id}/{creative_id}/slide-{N}.png`
- [ ] `creatives.export_urls` atualizado com array de URLs públicas após upload
- [ ] `creatives.status` atualizado para `'ready'` após export completo
- [ ] Indicador de progresso: "Exportando slide 1 de 5..." durante o processo
- [ ] Botão "Baixar tudo" gera download ZIP dos PNGs via JSZip
- [ ] Upload falha graciosamente: erro por slide mostrado, outros continuam

## Tarefas

- [ ] Instalar: `npm install jszip`
- [ ] Criar `client/src/hooks/use-creative-export.ts`
  - [ ] Função `exportSlides(stageRefs, creativeId)` — loop por slides
  - [ ] `stage.toDataURL()` por slide
  - [ ] Upload via Supabase Storage client
  - [ ] Update em `creatives.export_urls`
  - [ ] Geração de ZIP via JSZip
- [ ] Adicionar botão "Exportar" + "Baixar" ao `CreativeEditor.tsx`
- [ ] Criar endpoint `PUT /api/creatives/:id/export-urls` em `server/routes.ts` para update das URLs
- [ ] Implementar feedback de progresso no editor (toast + loading por slide)
- [ ] Configurar CORS do Supabase Storage para aceitar upload do frontend

## Organização de Arquivos no Storage

```
bucket: creatives (público)
└── {tenant_id}/
    └── {creative_id}/
        ├── slide-1.png
        ├── slide-2.png
        ├── slide-3.png
        ├── slide-4.png
        └── slide-5.png
```

## Export Flow (referência)

```typescript
async function exportSlides(stageRefs: RefObject<Konva.Stage>[], creativeId: string) {
  const urls: string[] = [];
  
  for (const [index, ref] of stageRefs.entries()) {
    const dataUrl = ref.current?.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
    if (!dataUrl) continue;
    
    const blob = dataURLtoBlob(dataUrl);
    const path = `${tenantId}/${creativeId}/slide-${index + 1}.png`;
    
    const { data } = await supabase.storage
      .from('creatives')
      .upload(path, blob, { upsert: true, contentType: 'image/png' });
    
    const { publicUrl } = supabase.storage.from('creatives').getPublicUrl(path).data;
    urls.push(publicUrl);
    
    onProgress?.(index + 1, stageRefs.length); // callback de progresso
  }
  
  await updateCreativeExportUrls(creativeId, urls);
  return urls;
}
```

## Arquivos a Criar/Modificar

- INSTALAR: `jszip`
- CRIAR: `client/src/hooks/use-creative-export.ts`
- MODIFICAR: `client/src/components/creative-editor/CreativeEditor.tsx` — botões de export/download
- MODIFICAR: `server/routes.ts` — endpoint de update de export_urls

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: carrossel de 5 slides exportado, 5 PNGs no Supabase Storage, URLs no banco
- [ ] Teste: download ZIP funciona com 5 arquivos dentro
- [ ] Evidências: screenshot dos arquivos no Supabase Storage dashboard
