Ext.define('POS.custom.field.ComboStockVariant', {
    extend: 'Ext.ux.form.field.ClearCombo',
    alias: 'widget.combo-stock-variant',

    requires: [
        'POS.store.combo.Stock',
        'POS.tpl.combo.StockVariant'
    ],

    displayField: 'unit_name',
    valueField: 'stock_id',

    anyMatch: true,
    autoSelect: false,
    enableKeyEvents: true,
    forceSelection: true,
    hideTrigger: false,
    matchFieldWidth: true,
    minChars: 1,
    queryDelay: 0,
    queryMode: 'local',
    selectOnFocus: true,
    triggerAction: 'all',
    typeAhead: false,
    typeAheadDelay: 250,

    initComponent: function(){
        this.store = POS.app.getStore('POS.store.combo.Stock');

        this.listConfig = {
            itemTpl: Ext.create('POS.tpl.combo.StockVariant')
        };

        this.callParent(arguments);
    }
});