// Keep rendering paused through leave -> same-room join -> explicit enter.
// Transport decoding/ACKs must continue while acceptsState() returns false.
export class SelectionReturn {
  constructor({send,loadout,onReturn,changed=()=>{},notice=()=>{},setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id)}) {
    Object.assign(this,{send,loadout,onReturn,changed,notice,setTimer,clearTimer});
    this.pending=null;this.selecting=false;this.awaitingEntry=false;this.timer=null;
    this.roomId=null;this.source=null;this.entryRoomId=null;
  }
  begin(room,unitId) {
    if(this.pending||!room?.id)return false;
    if(!this.send({type:'leave'}))return false;
    this.roomId=room.id;this.source={roomId:room.id,round:room.round,unitId};
    this.pending='leaving';this.selecting=true;this.awaitingEntry=false;
    this.notice('正在返回英雄选择…');this.onReturn();this.arm();this.changed();return true;
  }
  arm() {
    this.stopTimer();
    this.timer=this.setTimer(()=>{
      this.timer=null;this.pending=null;this.awaitingEntry=false;
      this.notice('返回选人超时，请退出房间后重新加入。',true);this.changed();
    },10000);
  }
  stopTimer(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
  room(room) {
    if(this.pending==='leaving'&&!room) {
      this.pending='joining';
      if(!this.send({type:'join',...this.loadout(),id:this.roomId})) {
        this.failed();this.notice('连接繁忙，未能重新加入，请重试。',true);
      }
      this.changed();
    }else if(this.pending==='joining'&&room) {
      this.stopTimer();this.pending=null;
      this.notice(room.id===this.roomId?'已返回英雄选择，可切换阵营后加入战斗。':'已进入房间，请确认阵营后加入战斗。');
      this.changed();
    }
  }
  entering(room) {
    if(this.selecting){this.awaitingEntry=true;this.entryRoomId=room?.id;}
  }
  acceptsState(game,room) {
    if(!this.selecting)return true;
    if(!this.awaitingEntry||room?.id!==this.entryRoomId||!game?.local?.unitId)return false;
    if(this.source?.roomId===room.id&&this.source.round===room.round&&this.source.unitId===game.local.unitId)return false;
    this.selecting=false;this.awaitingEntry=false;this.source=null;this.roomId=null;this.entryRoomId=null;
    return true;
  }
  failed(){this.stopTimer();this.pending=null;this.awaitingEntry=false;this.changed();}
  disconnected(){this.stopTimer();if(this.pending)this.pending='reconnecting';this.changed();}
  welcomed(){
    if(this.pending!=='reconnecting')return;
    // Leave is idempotent whether the lost connection delivered it or not.
    this.pending='leaving';
    if(this.send({type:'leave'}))this.arm();else this.failed();
    this.changed();
  }
  leave(){this.stopTimer();this.pending=null;this.awaitingEntry=false;this.roomId=null;this.changed();}
  close(){this.stopTimer();this.pending=null;this.awaitingEntry=false;}
}
