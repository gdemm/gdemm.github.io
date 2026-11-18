export function serverRegions(primary){return [{id:'local',label:'本服务器',origin:primary}];}
export function regionTokenKey(){return 'aram-classic-eight-session-v1';}
export function regionalRooms(rooms,node){return rooms.map(r=>({...r,serverRoomId:r.id,regionId:node.id}));}
