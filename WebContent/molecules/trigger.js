Molecule.trigger = {};

Molecule.trigger.DropDown = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');

   	this.isDropDown = true;
   	
   	this.close = function(){
   		if(semantic) this.$el.dropdown('hide');
   		if(bootstrap){
   			if(this.shown()){
   				this.toggle();
   			}
   		}
   	}
   	
   	this.open = function(){
   		if(semantic) this.$el.dropdown('show');
   		if(bootstrap){
   			if(!this.shown()){
   				this.toggle();
   			}
   		}
   	}
   	
   	this.shown = function(){
   		if(semantic) return this.$el.find('.menu').is('.visible');
   		if(bootstrap) return this.$el.find('.input-group-btn').is('.open');
   	}
   	
   	this.toggle = function () {
   		if(bootstrap) this.$el.find('.dropdown-menu').parent().find('.dropdown-toggle').click();
   		if(semantic){
   			if(this.shown()){
   				this.close();
   			} else {
   				this.open();
   			}
   		}
   	}

    this.setText = function (text) {
        this.$el.find('#txDropDownText').val(text);
        if(semantic) this.$el.find('.text').html(text).attr('class', 'text');
        if(bootstrap) this.$el.find('div.form-control.search').html(text);
    }
    if(semantic) this.$el.dropdown();
}


Molecule.trigger.DropDownList = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');
	var select = this.$el.closest('[select]').attr('select');
	
	this.isDropDownList = true;
	var me = this;
	this.$el.on('valuechange', '[molecule-obj=List]', function(event, value){
		var t = $(event.target);
		updateText(t, value);
    });
	
	var autoCompleteCol = this.$el.attr('autocomplete-col'); 
	if(autoCompleteCol){
		if(semantic) this.$el.addClass('search').dropdown(); 
    	this.$el.on('keyup', '#txDropDownText', function(event, value){
    		me.inputting = true;
    		setTimeout(function(){
    			me.inputting = false;
    		}, 50)
    		me.$el.find('[molecule-obj=List]').attr('renderer', 'autoCompleteTableRenderer|table');
    		var text = $(event.currentTarget).val();
    		var t = me.$el.find('[molecule-obj=List]');
    		t.attr('autocomplete-pattern', text);
    		t.render();
    		me.$el.find('.message').hide();
    		
    		if(!me.shown()){
    			me.toggle();
    			$(event.currentTarget).focus();
    		}
        });
	} else {
		this.$el.find('#txDropDownText').attr('readonly', true);
	}
	
	this.$el.on('d2js.rendered','[molecule-obj=List]', function(event, value){
		if(me.inputting) return;
		
		var t = $(event.target);
		if(t.is('[molecule-obj=List]')){
			updateText(t, me.getValue());
		}
    });
	
	if(select == 'multi' && bootstrap){
		$('<div class="form-control search"></div>').insertBefore(this.$el.find('#txDropDownText'));
		this.$el.find('#txDropDownText').addClass('hide')
		this.$el.find('.form-control.search').css('padding-top', '0px');
	}
	
	
	function updateText(t, value){
		var table = t.findRoot().root;
		var dispCol = t.closest('[display-col]').attr('display-col');
		var valueCol = t.closest('[value-col]').attr('value-col') || 'id';
		if(select == 'multi'){
			if(value) {
				me.setText(value.map(function(v){
					var row = table.find(valueCol, v);
					var text = row ? row[dispCol] : v; 
					if(semantic)
						var h = '<a class="ui label transition visible" data-value="' + v +'" style="display: inline-block !important;">' 
								+ text + '<i class="delete icon"></i></a>';
					if(bootstrap)
						var h = '<span data-value="' + v +'" class="label label-default" style="margin-right:2px;">' + text + '<button type="button" class="close" style="float:none" aria-label="Close"><span aria-hidden="true">&times;</span></button></span>';
					return h;
				}).join(''));
			}
		} else {
			var row = table.find(valueCol, value);
//			if(!row) success = false;
			me.setText(row ? row[dispCol] : value);
			me.close();
		}
	}
	
	this.$el.on('click', '.delete.icon,button.close', function(event){
		var t = $(this);
		var v = t.parent().data('value');
		me.setValue(me.getValue().filter(function(item){return item != v}));
   		event.stopPropagation();
   		me.open();
	});
	
	this.setValue = function(value){this.$el.find('[molecule-obj=List]').molecule().setValue(value);}
	this.getValue = function(value){return this.$el.find('[molecule-obj=List]').molecule().getValue();}
}

d2js.Renderers.autoCompleteTableRenderer = function(hTable, table){
	var autoCompleteCol = $(hTable).closest('[autocomplete-col]').attr('autocomplete-col');
	var pattern = $(hTable).closest('[autocomplete-pattern]').attr('autocomplete-pattern').toUpperCase();  
	var tb = new d2js.DataTable('na', 'na', {standalone:true});
	for(var i=0; i<table.rows.length; i++){
		var row = table.rows[i];
		if(autoCompleteCol){
			var s = row[autoCompleteCol] + '';
			if(s.toUpperCase().indexOf(pattern) == -1){
				continue;
			}
		}
		tb.rows.push(row);
	}
	return tb;
}

Molecule.trigger.DropDownTree = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');
	
	this.isDropDownTree = true;
	var me = this;
	//console.info('inject value change event');
	
	var select = this.$el.closest('[select]').attr('select');
	this.$el.on('valuechange', '[molecule-obj=Tree]', function (event, value) {
		var t = $(event.target);
		// console.log('value change', event.target);
		updateText(t, value);
	});
	
	var asObject = this.$el.closest('[as-object]').attr('as-object') == 'true';
	
	if(select == 'multi' && bootstrap){
		$('<div class="form-control search"></div>').insertBefore(this.$el.find('#txDropDownText'));
		this.$el.find('#txDropDownText').addClass('hide')
		this.$el.find('.form-control.search').css('padding-top', '0px');
	}

	this.$el.on('d2js.rendered', '[molecule-obj=Tree]', function (event, value) {
		var t = $(event.target);
		if(t.is('[molecule-obj=Tree]')){
			// console.log('d2js.render', $(event.target).attr('data'));
			updateText(t, me.getValue());
		}
	});
	
	this.$el.on('click', '.delete.icon,button.close', function(event){
		var t = $(this);
		var v = t.parent().data('value');
		me.setValue(me.getValue().filter(function(item){return item != v}));
   		event.stopPropagation();
   		me.open();
	});

	function updateText(t, value) {
		var table = t.findRoot().root;
		var dispCol = t.closest('[display-col]').attr('display-col');
		var valueCol = t.closest('[value-col]').attr('value-col') || 'id';
		
		if (select == 'multi') {
			if (value) me.setText(value.map(function (v) {
				if(asObject) var row = v; else var row = table.find(valueCol, v);
				var text = row ? row[dispCol] : v; 
				if(semantic)
					var h = '<a class="ui label transition visible" data-value="' + v +'" style="display: inline-block !important;">' 
							+ text + '<i class="delete icon"></i></a>';
				if(bootstrap)
					var h = '<span data-value="' + v +'" class="label label-default" style="margin-right:2px;">' + text + '<button type="button" class="close" style="float:none" aria-label="Close"><span aria-hidden="true">&times;</span></button></span>';
				return h;
			}).join(''));
		} else {
			// console.log('update text ', value);
			if(value && value.length) value = value[0];
			if(asObject) var row = value; else var row = table.find(valueCol, value);
			me.setText(row ? row[dispCol] : value);
			if(bootstrap) me.close();	// semantic will auto close
		}
	}
	this.setValue = function (value) {
		if (JSON.stringify(value) != JSON.stringify(this.getValue())) {
			var t = this.$el.find('[molecule-obj=Tree]');
			t.molecule().setValue(value);
		}
	}
	this.getValue = function (value) {
		var m = this.$el.find('[molecule-obj=Tree]').molecule();
		return m && m.getValue();
	}
}
