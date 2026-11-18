import {MAP_CONFIG} from './map-config.js';
import {BRUSH_REGIONS} from './brush-regions-data.js';
export function brushRegionAt(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return 0;
 const [ux,uz]=MAP_CONFIG.direction,s=MAP_CONFIG.scale,o=MAP_CONFIG.origin,n=MAP_CONFIG.navigation;
 const nx=o[0]+(x*ux-y*uz)*s,nz=o[2]+(x*uz+y*ux)*s;
 const ix=Math.floor((nx-n.minX)/n.cellSize),iz=Math.floor((nz-n.minZ)/n.cellSize);
 if(ix<0||iz<0||ix>=n.columns||iz>=n.rows)return 0;
 return BRUSH_REGIONS.cells[iz*n.columns+ix]||0;
}
