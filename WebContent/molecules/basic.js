var basicui = {}

d2js.Renderers.editLink = function (element, v, table) {
    var e = $(element);
    e.html('');
    var a = $(document.createElement('a')).appendTo(e);
    a.html('EDIT');
    a.attr('href', '###');
    a.data('id', v);
    a.on('click', function () {
    	var row = $(this).findRoot().root;
    	var tl = $(this).closest('[molecule-obj=TableList]');
    	Molecule.of(tl).editRow(row);
    });
};
	     	    
basicui.TableList = function(ui){
	var tableList = this;
	var me = this;
	var editDialogId = this.$el.attr('edit-dialog');
	var newDialogId = this.$el.attr('new-dialog') || editDialogId;
	
	function findDialog$(id){
		var ps = me.$el.parents()
		for(var i=0; i<ps.length; i++){
			var $f = $(ps).find('#' + id);
			if($f.length) return $f;
		}
	}
	
	if(!this.el.hasAttribute('d2js.root')){
		this.el.setAttribute('d2js.root', this.$el.closest('[table]').attr('table'));
	}

	if (editDialogId == null || newDialogId == null) return; // 没有提供编辑数据的对话框

	$(document).ready(function () {
		if (editDialogId) {
			initDialog(findDialog$(editDialogId));
		}
		if (newDialogId && newDialogId != editDialogId) {
			initDialog(findDialog$(newDialogId));
		}
	});

	function initDialog(dialogEle) {
		var dialog = Molecule.of(dialogEle);
		if (dialog == null) debugger;
		dialog.on('close', function () {
			var row = this.$el.findRoot().root;
			row._reject();
			row._clearError();
			d2js.render();
		});
		dialog.on('submit', async function () {
			$(dialogEle).collect();
			var row = this.$el.findRoot().root;
			if (row._isEntity) {
				if (dialogEle[0].hasAttribute('trace-submit')) {
					debugger;
				}
				var result = await row.submit();
				if (result.success) {
					dialogEle.modal('hide');
					tableList.$el.findRoot().root.reload();
				} else {
					d2js.render();
				}
			} else {
				var table = row._table;
				if (dialogEle[0].hasAttribute('trace-submit')) {
					table.inspect();
					debugger;
					return;
				}
				if (row._state == 'new' && table.rows.indexOf(row) == -1) {
					table.rows.push(row);
				}
				table.submit({
					callback: function (error) {
						if (error == null) {
							dialogEle.modal('hide');
							this.reload();
						} else {
							d2js.render();
						}
					}
				});
			}
		});
	}

	this.editRow = function (row) {
		if(row.isTreeNode) row = row.row;	// 侵入式代码
		if(row._table){
			row._table.curr = row;
		}
		var dialogId = (row._state == 'new') ? newDialogId : editDialogId;
		var $dialog = findDialog$(dialogId);
		$dialog.bindRoot(row).render();
		$dialog.attr('molecule-auto-dispose', false);
		this.$el.trigger('tablelist.edit', [row]);
		$dialog.modal({
			onApprove: function () {
				return false;
			},
			onVisible: function () {
				$dialog.attr('molecule-auto-dispose', true);
			}
		}).modal('show');
	}
}

basicui.Header = function(ui){
	var col = this.$el.attr('col');
	var text = this.$el.attr('text');
	this.$el.attr('data-t', col);

	var sortable = this.$el.attr('sortable');
	sortable = (sortable && sortable != 'false')

	var a = this.$el.find('a');
	if (sortable) {
		a.attr('renderer', "sortLink('" + col + "','" + text + "')");
		a.attr('data', col);
	} else {
		a[0].outerHTML = text;
	}
}

d2js.Renderers.sortLink = function (colName, text) {
	return function (element) {
		var $e = $(element);
		var table = $e.findRoot().root;
		$e.attr('href', '###');
		element.onclick = function () {
			var sort = {};
			var old = table.search._sorts && table.search._sorts[colName];
			if (old == 'asc') {
				sort[colName] = 'desc';
			} else {
				sort[colName] = 'asc';
			}
			table.search._sorts = sort;
			table.load();
		};
		var icon = null;
		var sorts = table.search._sorts || {};
		switch (sorts[colName]) {
			case 'asc':
				icon = 'glyphicon glyphicon-arrow-up';
				$e.closest('th').removeClass('sorted descending').addClass('sorted ascending');
				break;
			case 'desc':
				icon = 'glyphicon glyphicon-arrow-down';
				$e.closest('th').removeClass('sorted ascending').addClass('sorted descending');
				break;
			default:
				$e.closest('th').removeClass('sorted ascending descending');
		}
		$e.html(text + (icon ? '<span class="' + icon + '">' : ''));
	}
}

basicui.CheckHeader = function(ui){
	var checked = [];
	var checkboxes = [];
	var col = this.$el.attr('col');
	this.$el.attr('data-t', col);

	this.$el.attr('check-all-id', this.id || '');

	var me = this;
	this.$el.find('#ckAll').on('change', function (e) {
		var arr = [];
		checkboxes.forEach(function (ck) {
			ck.checked = this.checked;
			if (ck.checked) arr.push($(ck).parent().data('value'))
		}, this);
		checked = arr;
		me.$el.trigger('valuechange', [checked]);
	});

	this.checkboxes = checkboxes;

	this.checked = function (v) {
		if (v == null) {
			return checked;
		} else {
			checked = v;
			checkboxes.forEach(function (ck) {
				ck.checked = (checked.indexOf($(ck).parent().data('value')) != -1);
			})
			if (checkboxes.every(function (ck) {
					return ck.checked
				})) {
				me.$el.find('#ckAll').prop('checked', true);
			} else {
				me.$el.find('#ckAll').prop('checked', false);
			}
		}
	}

//		var table = this.$el.findRoot().root;
//		table.on(['load', 'submit'], function () {
//			me.checked([]);
//		});
}

d2js.Renderers.check = function (element, v, table) {
	var checkAllId = $(element).attr('check-all-id');
	if (checkAllId != null && checkAllId != '') {
		var checkAll = $(element).closest('table').find('thead').find('th[check-all-id=' + checkAllId + ']').molecule();
	} else {
		var checkAll = $(element).closest('table').find('thead').find('th[check-all-id]').molecule();
	}

	var checked = checkAll.checked();
	var checkboxes = checkAll.checkboxes;

	var e = $(element).html('');
	var ck = $(document.createElement('input')).attr('type', 'checkbox')
		.prop('checked', checked.indexOf(v) != -1)
		.appendTo(e);
	checkboxes.push(ck[0]);

	$(element).data('value', v);

	ck.on('change', function (event) {
		var checked = checkAll.checked();
		if (this.checked) {
			if (checked.indexOf(v) == -1) {
				checked.push(v);
			}
			if (checkboxes.every(function (ck) {
					return ck.checked
				})) {
				checkAll.$el.find('#ckAll').prop('checked', true);
			}
			checkAll.$el.trigger('valuechange', [checked]);
		} else {
			if (checked.indexOf(v) != -1) {
				checked.splice(checked.indexOf(v), 1);
			}
			if (!checkboxes.every(function (ck) {
					return ck.checked
				})) {
				checkAll.$el.find('#ckAll').prop('checked', false);
			}
			checkAll.$el.trigger('valuechange', [checked]);
		}
	});
}


basicui.ActionHeader = function(){
	var col = this.$el.attr('col');
	var text = this.$el.attr('text');
	this.$el.attr('data-t', col);

	var a = this.$el.find('a');
	var onclick = (this.$el.attr('onclick') || '').replace(/\'/g, "\"");
	this.$el.attr('renderer', "actionLink('" + col + "','" + text + "','" + onclick + "')");
	this.$el.removeAttr('onclick');
}

d2js.Renderers.actionLink = function (colName, text, click) {
	return function (element, table) {
		var e = $(document.createElement('a')).appendTo(element);
		e.attr('href', '###');
		if (click) e.attr('onclick', click);
		var action = e.parent().attr('action');
		e.bind('click', function () {
			var td = $(this).parent();
			td.trigger('actionheader.click', [action].concat(d2js.locateData(td)));
		});
		e[0].innerHTML = text;
	}
}

basicui.FormItem = function(ui){
	var table = this.$el.closest('[table]').attr('table');
	var col = this.$el.attr('col');
	var text = this.$el.attr('text');

	this.$el.find('[renderer=flderr]').attr('data', '_error_at,' + col);
	this.$el.find('label').html(text);

	if (this.$el.is('[dict]') && this.$el.find('select').length) {
		this.$el.attr('data', 'this');
		this.$el.attr('renderer', "dictToList|options('name','id',false)");
	}
	
//	var table = this.$el.closest('[table]').attr('table');
//	var col = this.$el.attr('col');
//	var text = this.$el.attr('text');
//	
//	this.$el.find('[renderer=flderr]').attr('data', '_error_at,' + col);
//	this.$el.find('label').html(text);
//	
//	if (this.$el.is('[dict]') && this.$el.find('select').length) {
//		var dict = this.$el.attr('dict');
//		this.$el.attr('d2js.root', 'dicts');
//		this.$el.attr('data', dict);
//		this.$el.attr('renderer', "dictToList|options('name','id',false)");
//		this.$el.find('select').attr('d2js.root', '..');
//	}
}

basicui.FormImageItem = function(){
	var table = this.$el.closest('[table]').attr('table');
	var col = this.$el.closest('.field').attr('col');
	this.$el.attr('data', '#' + table + ',curr,' + col);

	var imgPreview = this.$el.find('#imgPreview')[0];
	var imageData = '';
	this.$el.find('input').on('change', function previewImage() {
		var file = this;
		var reader = new FileReader();
		reader.onloadend = function () {
			imageData = imgPreview.src = reader.result;
			console.log(reader.result);
		}
		if (file) {
			reader.readAsDataURL(file.files[0]);
		} else {
			imageData = imgPreview.src = "";
		}
	});
	var me = this;
	$(imgPreview).on('click', function () {
		me.$el.find('input').click();
	});
	this.getValue = function () {
		return imageData
	};
	this.setValue = function (value) {
		imageData = imgPreview.src = value || "";
	}
	if (this.$el.attr('src')) {
		imgPreview.src = this.$el.attr('src');
		this.$el.removeAttr('src');
	}
	if (this.$el.attr('img-style')) {
		imgPreview.style.cssText = this.$el.attr('img-style')
	}
	
	
	var table = this.$el.closest('[table]').attr('table');
	var col = this.$el.closest('.form-group').attr('col');
	this.$el.attr('data', col);

	var imgPreview = this.$el.find('#imgPreview')[0];
	var imageData = '';
	this.$el.find('input').on('change', function previewImage() {
		var file = this;
		var reader = new FileReader();
		reader.onloadend = function () {
			imageData = imgPreview.src = reader.result;
		}
		if (file) {
			reader.readAsDataURL(file.files[0]);
		} else {
			imageData = imgPreview.src = "";
		}
	});
	var me = this;
	$(imgPreview).on('click', function () { me.$el.find('input').click(); });
	this.getValue = function () { return imageData };
	this.setValue = function (value) {
		imageData = imgPreview.src = value || "";
	}
	if (this.$el.attr('src')) {
		imgPreview.src = this.$el.attr('src');
		this.$el.removeAttr('src');
	}
	if (this.$el.attr('img-style')) {
		imgPreview.style.cssText = this.$el.attr('img-style')
	}
}


basicui.SearchFormSelectItem = function(ui){
	var col = this.$el.closest('.field').attr('col');
	var allowEmpty = (this.$el.closest('[allow-empty]').attr('allow-empty') != 'false');
	this.$el.find('select').attr('data', 'search,params,' + col);
	
	if(ui == 'bootstrap'){
		var table = this.$el.closest('[table]').attr('table');
		var col = this.$el.closest('.form-group').attr('col');
		var allowEmpty = (this.$el.closest('[allow-empty]').attr('allow-empty') != 'false');

		this.$el.attr('data', 'this');
		this.$el.find('select').attr('data', col);
		this.$el.attr('renderer', 'dictToList|options(\'name\',\'id\', ' + allowEmpty + ')');
		d2js.render(this.$el);
	} else {
		var inited = false;
		if (this.$el.attr('dict')) {
			this.$el.attr('d2js.root', 'dicts');
			this.$el.attr('data', this.$el.attr('dict'));
			this.$el.attr('renderer', 'dictToList|options(\'name\',\'id\', ' + allowEmpty + ')');
	
			this.$el.find('select').attr('d2js.root', '..');
		}
		this.$el.find('select').on('d2js.rendered', function (event) {
			if (!inited) {
				$(this).dropdown(); //.addClass('compact');
				inited = true;
			}
			setTimeout((function(){
				$(this).dropdown('set selected', this.value);
			}).bind(this), 50);	// dropdown() 后 menu items 仍没有初始化，并且目前没有找到回调时机
		});
		if (this.$el.attr('dict')) {
			d2js.render(this.$el);
		}
	}
}


basicui.Dialog = function(ui){
	var title = this.$el.attr('title-text');
	this.$el.find('.modal-title').html(title);
	this.el.title = '';

	if (this.$el.attr('show-buttons') == 'false') this.$el.find('#bnSave').hide();
	EventDispatcher.call(this);
	this.regEvent(['close', 'submit']);

	var me = this;
	this.$el.on('click', '#bnSave', function () {
		me.fireEvent('submit');
	});

	this.$el.on('hide.bs.modal', function () {
		me.fireEvent('close');
	});
}


basicui.SearchButton = function(ui){
	var table = this.$el.closest('[table]').attr('table');
	this.$el.on('click', function () {
		var $form = $(this).closest('form')
		$form.collect();
		$form.parent().findRoot().root.navigatePage(0);
	});
}

basicui.AddButton = function(){
	this.$el.on('click', function () {
		var table = $(this).closest('form').parent().findRoot().root;
		var tl = $(this).closest('[molecule-obj=TableList]');
		if (table.isList) {
			var Constructor = table.meta.Constructor;
			var row = new Constructor();
			Molecule.of(tl).editRow(row);
		} else {
			var row = table.newRow();
			Molecule.of(tl).editRow(row);
		}
	});
}

basicui.Confirm = function(){
	var me = this;
	this.$el.find('#ok').on('click', function () {
		$(document).off('mousedown', f);
		me.$el.trigger('confirm.ok');
	});
	this.$el.find('#cancel').on('click', function () {
		$(document).off('mousedown', f);
		me.$el.trigger('confirm.cancel');
	});

	function f(event) {
		if (!me.$el.has($(event.target)).length) {
			$(document).off('mousedown', f);
			me.$el.trigger('confirm.cancel');
		}
	}
	$(document).on('mousedown', f);
}

basicui.CheckGroup = function(ui){
	var table = this.$el.closest('[table]').attr('table');
	var col = this.$el.closest('[col]').attr('col');
	this.$el.attr('data', '#' + table + ',curr,' + col);

	var dict = this.$el.is('[dict]') || this.$el.parent('[dict][molecule-obj=FormItem]').attr('dict');
	var ckgrp = this.$el.find('.checkgroup');
	if (dict) {
		ckgrp.attr('dict', dict);
	}

	this.value = [];

	var me = this;
	this.setValue = function (v) {
		me.value = v;
		me.$el.find('input[type=button]').each(function (idx, ck) {
			$(ck).prop('checked', (v && v.indexOf(ck.value) != -1));
			if ($(ck).prop('checked')) {
				$(ck).addClass('active');
			} else {
				$(ck).removeClass('active');
			}
		});
	}

	this.getValue = function () {
		return me.value;
	}

	this.updateValue = function () {
		var arr = [];
		me.$el.find('input[type=button]').each(function (idx, ck) {
			if ($(ck).prop('checked')) {
				arr.push(ck.value);
			}
		});
		me.value = arr;
	}
	
	
	this.$el.bindRenderers({
		checkgroup : function (dispCol, valueCol) {
			return function (element, rows, table) {
				$(element).find('*').each(function (idx, ele) { ele.remove() });

				if (rows == null) return;
				
				for (var i = 0; i < rows.length; i++) {
					if(ui == 'semantic'){
						$(document.createElement('input'))
							.attr('type', 'button').val(rows[i][valueCol]).html(rows[i][dispCol])
							.attr('class', 'ui button')
							.appendTo(element);
					} else {
						var li = $(document.createElement('li'));
						$(document.createElement('input'))
							.attr('type', 'checkbox').val(rows[i][valueCol])
							.appendTo(li);
						$(document.createElement('span')).html(rows[i][dispCol]).appendTo(li);
						li.appendTo(element);
					}
				}
				var m = $(element).parent().molecule();
				if (m) m.setValue(m.getValue());
			}
		}
	})

	this.$el.on('click', 'input[type=button]', function (event) {
		var ck = $(event.target);
		ck.prop('checked', !ck.prop('checked'));
		if (ck.prop('checked')) {
			ck.addClass('active');
		} else {
			ck.removeClass('active');
		}
		ck.trigger('change');
	});

	this.$el.on('change', function (event) {
		if (event.target && $(event.target).is('input[type=button]')) {
			me.updateValue();
			me.$el.trigger('change', [me.value]);
		}
	})
}

basicui.DateTime = function(){
	this.getValue = function () {
		var s = this.$el.find('[type=date]').val() + ' ' + this.$el.find('[type=time]').val();
		return Date.parse(s, 'yyyy-MM-dd HH:mm');
	}
	this.setValue = function (value) {
		if (value) {
			this.$el.find('[type=date]').val(value.format('yyyy-MM-dd'));
			this.$el.find('[type=time]').val(value.format('HH:mm'));
		} else {
			this.$el.find('[type=date]').val('');
			this.$el.find('[type=time]').val('');
		}
	}
}

basicui.RadioButtonGroup = function(){
	this.$el.find('.btn-group').attr('dict', this.$el.attr('dict'));
	var value = this.$el.data('value');

	this.setValue = function (val) {
		value = val;
		this.$el.find('button').each(function (idx, btn) {
			if ($(btn).data('value') == value) {
				$(btn).addClass('btn-primary');
			} else {
				$(btn).removeClass('btn-primary');
			}
		});
	}
	if (value != null && value.length) {
		this.setValue(value);
	}
	this.getValue = function () {
		return value;
	}

	var me = this;
	this.$el.on('click', 'button', function (event) {
		var v = $(event.currentTarget).data('value');
		me.setValue(v);
	});
	
	this.$el.bindRenderers({
		buttons : function (dispCol, valueCol, allowEmpty) {

			return function (element, rows, table) {
				var group = $(element);

				element.innerHTML = '';

				if (!rows) return;
				for (var i = 0; i < rows.length; i++) {
					$(document.createElement('button'))
						.addClass('btn btn-default')
						.data('value', rows[i][valueCol])
						.html(rows[i][dispCol])
						.appendTo(group);
				}

				var m = group.parent().molecule();
				if (m) {
					m.setValue(m.getValue());
				}
			}
		}
	})
}

basicui.List = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');

	var activeTrClass = 'active';
	if(bootstrap) activeTrClass = 'info';
	
	var table = this.$el.closest('[table]').attr('table');
	this.$el.attr('d2js.root', table).attr('data', 'this');

	var valueColumn = this.$el.closest('[value-col]').attr('value-col') || 'id'
	var paging = this.$el.closest('[paging]').attr('paging');
	if (paging == 'false') {
		this.$el.find('.pagination').closest('tfoot').remove();
	}
	if (this.$el.closest('[show-header]').attr('show-header') == 'false') {
		this.$el.find('thead').hide();
	}
	var me = this;
	var select = this.$el.closest('[select]').attr('select') || 'none';
	switch (select) {
		case 'none':
			;
			break;
		case 'single':
			if(semantic) this.$el[0].className = 'ui sortable selectable table';
			if(bootstrap) this.$el[0].className = 'table table-hover table-condensed table-selectable list';
			this.$el.on('d2js.rendered', function f(event) {
				if (event.target == me.$el[0]) {
					var storeValue = me.$el.data('value');
					$(event.target).find('tbody.data>tr').each(function (idx, tr) {
						var row = $(tr).findRoot().root;
						var value = row[valueColumn];
						if (storeValue && storeValue == value) {
							$(tr).addClass(activeTrClass);
							me.$el.data('prev_selected_tr', tr);
						}
						$(tr).bind('click', function () {
							if (me.$el.data('value') != value) {
								var prevtr = me.$el.data('prev_selected_tr');
								prevtr && $(prevtr).removeClass(activeTrClass);

								me.$el.data('value', value);
								$(tr).addClass(activeTrClass);
								me.$el.data('prev_selected_tr', tr);
								me.$el.trigger('valuechange', [value, row]);
							}
						});
					});
				}
			});
			this.setValue = function (value) {
				if (value != this.getValue()) {
					me.$el.data('value', value);
					d2js.render(me.$el);
					this.$el.trigger('valuechange', [value]);
				}
			}
			this.getValue = function () {
				return me.$el.data('value');
			}
			break;
		case 'multi':
			if(semantic) this.$el[0].className = 'ui sortable selectable table';
			if(bootstrap) this.$el[0].className = 'table table-hover table-condensed table-selectable list';

			var checkAll = $(document.createElement('th')).attr('molecule', 'CheckHeader');
			checkAll.attr('col', valueColumn);
			var tr = this.$el.find('thead>tr');
			checkAll.insertBefore(tr.children()[0]);

			$(this.$el).on('valuechange', function (evt, checked) {
				if (evt.target != me.$el[0]) {
					me.$el.find('tbody.data>tr').each(function (idx, tr) {
						var d = $(tr).findRoot().root;
						if (!d) return;
						var row = d;
						var value = row[valueColumn];
						if (checked.indexOf(value) != -1) {
							$(tr).addClass(activeTrClass)
						} else {
							$(tr).removeClass(activeTrClass)
						}
					});
					// console.log(me.$el[0] + ' trigger valuechange');
					me.$el.trigger('valuechange', [checked]);
				}
			});

			this.$el.on('d2js.rendered', function f(event) {
				if (event.target == me.$el[0]) {
					var storeValue = me.$el.data('value');
					$(event.target).find('tbody.data>tr').each(function (idx, tr) {
						$(tr).on('click', function (event) {
							if ($(event.target).is('td[molecule-obj=CheckHeader]>input')) {
								return;
							}
							var ck = $(tr).find('td[molecule-obj=CheckHeader]>input');
							ck.prop('checked', !ck.prop('checked'));
							ck.change();
						});
					});
				}
			});

			this.setValue = function (value) {
				var ck = me.$el.find('thead>tr>th[molecule-obj=CheckHeader]');
				ck.molecule().checked(value && value.slice());
				ck.trigger('valuechange', [ck.molecule().checked()])
			}
			this.getValue = function () {
				var m = me.$el.find('thead>tr>th[molecule-obj=CheckHeader]').molecule();
				return m && m.checked();
			}

			break;
	}

	var allowRemove = this.$el.closest('[allow-remove]').attr('allow-remove') == 'true';
	var willDeleteRows = null;
	this.table  = function(){
		return this.$el.findRoot().root;
	}
	if (allowRemove) {
		var leftFoot = this.$el.find('#leftFoot');
		if(bootstrap) var s = '<button class="btn btn-default btn-remove">Remove</button>';
		if(semantic) var s = '<button type="button" class="ui button btn-remove" disabled><i class="remove icon"></i>Remove</button>';
		
		leftFoot.html(s);
		leftFoot.on('click', '.btn-remove', function (evt) {
			debugger;
			var th = me.$el.find('thead>tr>th[molecule-obj=CheckHeader]');
			var col = th.attr('col');
			var checked = th.molecule().checked();
			willDeleteRows = checked.map(function (c) {
				var t = me.table();
				if(t.isList){
					return t.find(function(entity){return entity[col] == c});
				} else {
					return t.find(col, c)
				}
			}).filter(function (r) {
				return r
			});
			if (willDeleteRows.length == 0) {
				if(semantic) var s2 = '<div class="ui yellow message" role="alert">请选择要删除的数据行</div>';
				if(bootstrap) var s2= '<div class="alert alert-warning" role="alert">请选择要删除的数据行</div>';
				var a = $(s2).appendTo(leftFoot.parent().parent());
				setTimeout(function () {
					a.remove()
				}, 500);
			} else {
				if(bootstrap) var s3 = '<div molecule="Confirm">所选 ' + willDeleteRows.length + ' 行记录将被删除，该操作无法撤销，请点击[确定]按钮继续</div>'
				if(semantic) var s3 = '<div molecule="Confirm">所选 ' + willDeleteRows.length + ' 行记录将被删除，该操作无法撤销，请点击[确定]按钮继续</div>'
				leftFoot.html(s3);
			}
		}).on('confirm.ok', async function () {
			willDeleteRows.forEach(function (row) {
				row._remove();
			});
			var t = me.table();
			if(t.isList){
				var result = await t.submit();
				if (result.success) {
					t.reload();
				} else {
					d2js.render();
				}
			} else {
				t.submit(function (error) {
					if (!error) {
						t.reload();
					} else {
						d2js.render();
					}
				});
			}
			leftFoot.html(s);
		}).on('confirm.cancel', function () {
			leftFoot.html(s);
		});

		if(bootstrap) var dangerous = 'dangerous';
		if(semantic) var dangerous = 'red';
		this.$el.on('valuechange', 'th', function (evt, selected) {
			if (selected && selected.length) {
				leftFoot.find('button.btn-remove').prop('disabled', false).addClass(dangerous);
			} else {
				leftFoot.find('button.btn-remove').prop('disabled', true).removeClass(dangerous);
			}
		});
	}
}

basicui.Pagination = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');
	
	var me = this;
	this.$el.find('#prev').on('click', function(){
		if($(this).is('.disabled')) return;
		var table = me.$el.findRoot().root;
		table.navigatePage(table.page - 1);
	})
	this.$el.find('#next').on('click', function(){
		if($(this).is('.disabled')) return;
		var table = me.$el.findRoot().root;
		table.navigatePage(table.page * 1 + 1);
	})
	this.$el.on('click', '.page-num', function(e){
		if($(this).is('.active')) return;
		var table = me.$el.findRoot().root;
		table.navigatePage($(this).data('page'));
	})
	this.$el.find('#go').click(function(){
		var page = me.$el.find('input').val() * 1 - 1;
		var table = me.$el.findRoot().root;
		if(isNaN(page) || page < 0) page = 0;
		if(page > table.pageCount - 1){
			page = table.pageCount - 1;
		}
		table.navigatePage(page);
	})
	this.$el.bindRenderers({
		pagination: function(e, table){
			var isFirstPage = (table.page == 0);
			var isLastPage = (table.page >= table.pageCount -1);
			if(isFirstPage){
				me.$el.find('#prev').addClass('disabled')
			} else {
				me.$el.find('#prev').removeClass('disabled')
			}
			if(isLastPage){
				me.$el.find('#next').addClass('disabled')
			} else {
				me.$el.find('#next').removeClass('disabled')
			}
			
			me.$el.find('.page-num').remove();
			var el = me.$el.find('#prev');
			var ignoring = false;
			var NUM = (me.$el.attr('page-nearby') || 3) * 1;
			for(var i=0; i < table.pageCount; i++){
				if(i == 0 || i == table.pageCount - 1 || (i > table.page - NUM && i < table.page + NUM)){
					ignoring = false;
					
					if(bootstrap){
						var $li = $(document.createElement('li')).insertAfter(el).addClass('page-num').data('page', i)
						var $a = $(document.createElement('a')).appendTo($li);
						if(i == table.page){
							$li.addClass('active');
							$a.html((i+1) + '<span class="sr-only">(current)</span>');
						} else {
							$li.data('page', i);
							$a.html((i + 1));
						}
						el = $li
					}
					if(semantic){
						var $a = $(document.createElement('a')).html(i+1).addClass('item page-num').data('page', i).insertAfter(el);
						if(i == table.page){
							$a.addClass('active');
						}
						el = $a;
					}
				} else {
					if(ignoring) continue;
					ignoring = true;
					if(semantic){
						var $a = $(document.createElement('a')).insertAfter(el)
						el = $a;
						$a.html('...').addClass('item page-num disabled');
					}
					if(bootstrap){
						var $li = $(document.createElement('li')).insertAfter(el).addClass('disabled');
						var $a = $(document.createElement('a')).appendTo(li).html('...');
					}
				}
			}
		}
	})
}
