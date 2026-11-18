// Native hidden-submesh lists use commas as well as whitespace.
export function hiddenSubmeshes(nativeValue='',extra=[]){return [...new Set([...String(nativeValue).split(/[,;\s]+/),...extra].map(n=>n.trim()).filter(Boolean))];}
export function isHiddenMaterial(name,hidden){return hidden.some(n=>n.toLowerCase()===String(name).toLowerCase());}
