// Do not construct hidden shop DOM/images during lobby or battle entry.
export class DeferredShop {
 constructor(create){this.create=create;this.instance=null;}
 ensure(){return this.instance??=this.create();}
 open(){return this.ensure().open();}
 selectInventory(index){return this.ensure().selectInventory(index);}
 syncPurchase(){return this.instance?.syncPurchase()??false;}
 refresh(){return this.instance?.refresh();}
 updateBudget(){return this.instance?.updateBudget();}
}
