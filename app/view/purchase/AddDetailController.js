Ext.define('POS.view.purchase.AddDetailController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.add-purchase-detail',

    control: {
        '#': {
            boxready: function(){
                var product = this.lookupReference('product');
                
                setTimeout(function(){
                    product.focus();
                }, 10);
            },
            close: function(){
                POS.app.getStore('combo.Stock').removeAll();
                
                var paid = Ext.ComponentQuery.query('add-purchase')[0].down('[name = paid]');
                
                setTimeout(function(){
                    paid.focus();
                }, 10);
            }
        },
        'textfield[tabOnEnter = true]': {
            specialkey: function(field, e){
                if(e.getKey() == e.ENTER) {
                    setTimeout(function(){
                        field.next('field').focus();
                    }, 10);
                }
            }
        },
        'textfield[saveOnEnter = true]': {
            specialkey: function(f, e){
                if(e.getKey() == e.ENTER) {
                    var me = this;
                
                    setTimeout(function(){
                        me.save();
                    }, 10);
                }
            }
        }
    },

    addProduct: function(){
        var panel = Ext.fn.App.window('add-product');

        panel.bindCombo = this.lookupReference('product').getId();
    },

    addVariant: function(){
        var product = this.lookupReference('product').getSelectedRecord();
            
        // make sure a product is selected
        if (!Ext.isEmpty(product)) {
            var panel           = Ext.fn.App.window('add-stock'),
                panelController = panel.getController();
            
            panel.bindCombo = this.lookupReference('stock').getId();
            
            var comboProduct = panelController.lookupReference('product');            
            comboProduct.setValue(product);
            comboProduct.setReadOnly(true);
            
            panelController.lookupReference('add_product').hide();
            
            setTimeout(function(){
                panelController.lookupReference('unit').focus();
            }, 10);
        } else {
            Ext.fn.App.notification('Ups', 'Pilih Produk terlebih dahulu');
        }
    },
    
    close: function(){
        this.getView().close();
    },

    load: function(record){
        var panel = this.getView(),
            form = panel.down('form');

        var product = Ext.create('POS.model.Product', {
            id: record.get('product_id'),
            name: record.get('product_name')
        });

        record.set('product', product);

        var variant = Ext.create('POS.model.combo.Stock', {
            stock_id: record.get('stock_id'),
            unit_name: record.get('unit_name')
        });

        record.set('stock', variant);
        
        form.getForm().setValues(record.getData());
        
        var params = {
            product_id: record.get('product_id')
        }        
        var monitor = Ext.fn.WebSocket.monitor(
            Ext.ws.Main.on('populate/stock', function(websocket, result){
                clearTimeout(monitor);
                if (result.success){
                    POS.app.getStore('combo.Stock').loadData(result.data);
                }else{
                    Ext.fn.App.notification('Ups', result.errmsg);
                }
            }, this, {
                single: true,
                destroyable: true
            })
        );
        Ext.ws.Main.send('populate/stock', params);
        
        var params = {
            id: record.get('stock_id')
        }        
        var monitor = Ext.fn.WebSocket.monitor(
            Ext.ws.Main.on('stock/getOne', function(websocket, result){
                clearTimeout(monitor);
                if (result.success){
                    this.onSetValueStock(result.data);
                }else{
                    Ext.fn.App.notification('Ups', result.errmsg);
                }
            }, this, {
                single: true,
                destroyable: true
            })
        );
        Ext.ws.Main.send('stock/getOne', params);
    },
    
    onChangeProduct: function(combo){
        if (combo.getRawValue() == '') {
            combo.clear();
            this.onClearProduct();
        }
    },
    
    onClearProduct: function(){
        var stock = this.lookupReference('stock');
        
        stock.clear();
        stock.getStore().removeAll();

        this.lookupReference('price_status').update({});
    },
    
    onSelectProduct: function(combo, record){
        var params = {
            product_id: record[0].getData().id
        }
        
        var monitor = Ext.fn.WebSocket.monitor(
            Ext.ws.Main.on('populate/stock', function(websocket, result){
                clearTimeout(monitor);
                if (result.success){
                    this.onClearProduct();
                    
                    POS.app.getStore('combo.Stock').loadData(result.data);
                    
                    var resultLength = result.data.length;
                    
                    if (resultLength == 0) {
                        this.addVariant();
                        
                    } else if (resultLength == 1) {
                        var stock = Ext.create('POS.model.Stock', result.data[0]);
                        
                        var comboStock = this.lookupReference('stock');
                        
                        comboStock.select(stock);
                        comboStock.fireEvent('setvalue', stock.getData());
                        
                    } else {
                        this.lookupReference('stock').focus(true);
                    }
                }else{
                    Ext.fn.App.notification('Ups', result.errmsg);
                }
            }, this, {
                single: true,
                destroyable: true
            })
        );
        Ext.ws.Main.send('populate/stock', params);
    },
    
    onClearStock: function(){
        this.lookupReference('unit').setHtml('');        
        this.lookupReference('detail_container').hide();
    },
    
    onSelectStock: function(combo, record){
        this.onSetValueStock(record[0].getData());
    },
    
    onSetValueStock: function(value){
        this.getViewModel().set('stock', value);
        
        this.setUnitPrice();
    
        this.lookupReference('unit').setHtml(value.unit_name);
        this.lookupReference('detail_container').show();
        this.lookupReference('amount').focus(true);
    },

    save: function(){
        var panel = this.getView(),
            form = panel.down('form');

        if(
            form.getForm().isValid()
            &&
            this.lookupReference('total_price').getSubmitValue() != 0
        ){
            var values = form.getValues(),
                viewModelData = this.getViewModel().getData();
            
            values.stock_id = values.stock;
            values.product_id = values.product;
            values.product_name = viewModelData.stock.product_name;
            values.unit_name = viewModelData.stock.unit_name;
            values.unit_price = parseInt(values.total_price / values.amount);
            
            if (!panel.isEdit) {            
                var store = POS.app.getStore('PurchaseDetail'),
                    rec = Ext.create('POS.model.PurchaseDetail');
                    
                rec.set(values);
                store.add(rec);
            }else{
                // perhaps there is a better way to select currently edited record than this clumsy code below
                var rec = Ext.ComponentQuery.query('add-purchase grid-purchase-detail')[0].getSelectionModel().getSelection()[0];
                rec.set(values);
            }
            
            panel.isEdit = false;
            
            Ext.ComponentQuery.query('add-purchase')[0].getController().setTotalPrice();

            form.reset();
            
            this.lookupReference('status').setHtml(values.amount + ' ' + values.unit_name + ' <span class="green">' + values.product_name + '</span> dengan harga satuan <span class="green">' + Ext.fn.Render.plainCurrency(values.unit_price) + '</span> telah ditambahkan.');
            
            this.lookupReference('price_status').update({});
            
            this.lookupReference('product').focus();
        }
    },
    
    setUnitPrice: function(){
        var totalPrice      = this.lookupReference('total_price'),
            amount          = this.lookupReference('amount'),
            unitPrice       = this.lookupReference('unit_price'),
            value           = parseInt(totalPrice.getSubmitValue() / amount.getValue()),
            priceDifference = this.getViewModel().get('stock.buy') - value,
            params          = {};
            
        unitPrice.setHtml(Ext.fn.Render.currency(value));
        
        if (priceDifference == 0) {
            params.status = 'stagnant';
            params.amount = 0;
            
        } else if (priceDifference > 0) {
            params.status = 'down';
            params.amount = priceDifference;
            
        } else if (priceDifference < 0) {
            params.status = 'up';
            params.amount = Math.abs(priceDifference);
        }
        
        this.lookupReference('price_status').update(params);
    }
});
