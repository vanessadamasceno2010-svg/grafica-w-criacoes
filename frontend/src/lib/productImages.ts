import type { Product, ProductVariation } from './api';
export const isQuantityOption = (key: string) => /quant|lote|conjunto|unidades|tiragem/i.test(key);
export function visualOptions(v: ProductVariation): Record<string,string> {
 const options = Object.keys(v.opcoes || {}).length ? v.opcoes! : {Acabamento:v.acabamento || '',Tamanho:v.tamanho || '',Modelo:v.modelo || ''};
 return Object.fromEntries(Object.entries(options).filter(([k,value])=>!isQuantityOption(k) && Boolean(value)).sort(([a],[b])=>a.localeCompare(b)));
}
export function visualKey(v: ProductVariation) { return JSON.stringify(visualOptions(v)); }
export function productImages(product: Product|null, selected?: ProductVariation|null): string[] {
 if (!product) return ['/assets/chaveiros-personalizados.jpeg'];
 const group = selected ? (product.variacoes || []).filter(v=>v.ativo!==false && visualKey(v)===visualKey(selected)) : [];
 const photos = group.find(v=>v.imagens?.length)?.imagens || [];
 const result = photos.length ? photos : [product.imagem_principal,...(product.imagens_adicionais || [])];
 return [...new Set(result.filter(Boolean))].length ? [...new Set(result.filter(Boolean))] : ['/assets/chaveiros-personalizados.jpeg'];
}
