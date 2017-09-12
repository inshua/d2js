Molecule.tree = {}

d2js.Renderers.treeNode = function (element, v, columnName, row, _1, node) {
	if (!row) return;
	var path = row.path;
	var depth = node.depth
	var s = '';
	for (var i = 0; i < depth; i++) s += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
	var checkHtml = typeof node.checked != 'undefined' ? '<input type="checkbox">&nbsp;&nbsp;' : '';
	if (node.children.length == 0) {
		$(element).html(s + checkHtml + v);
	} else {
		if (node.expanded) {
			$(element).html(s + '<a class=""><i class="angle down icon"></i></a>&nbsp;&nbsp;' + checkHtml + v);
			$(element).find('a').on('click', function (event) {
				node.expanded = false;
				d2js.render(element.closest('table')[0]);
				event.stopPropagation();
			})
		} else {
			$(element).html(s + '<a class=""><i class="angle right icon"></i></a>' + checkHtml + v);
			$(element).find('a').on('click', function () {
				node.expanded = true;
				d2js.render(element.closest('table')[0]);
				event.stopPropagation();
			})
		}
	}
	if (typeof node.checked != 'undefined')
		$(element).find('input[type=checkbox]').prop('checked', node.checked);

	$(element).find('input[type=checkbox]').on('change', function () {
		var checked = this.checked;
		var update = false;
		(function down(node) {
			node.checked = checked;
			if (node.children.length) {
				update = true;
				node.children.forEach(down);
			}
		})(node);
		(function up(pnode) {
			if (pnode == null) return;
			if (checked && pnode.children.every(function (c) { return c.checked == true })) {
				update = true;
				pnode.checked = true;
				up(pnode.parent)
			} else if (!checked && pnode.children.some(function (c) { return c.checked === false })) {
				pnode.checked = false;
				update = true;
				up(pnode.parent)
			}
		})(node.parent);

		var t = $(element).closest('table');
		if (update) {
			d2js.render(element.closest('table')[0]);
		}
		t.trigger('checkchange');
	})
};


Molecule.tree.TreeNode = function(){
	var table = this.$el.closest('[table]').attr('table');
	var col = this.$el.attr('col');
	var text = this.$el.attr('text');
	this.$el.attr('data-n', col);
	this.$el.html(text);
}

Molecule.tree.Tree = function(ui){
	var semantic = (ui == 'semantic')
	var bootstrap = (ui == 'bootstrap');

	if(bootstrap) var selectedTrClass = 'info';
	if(semantic) var selectedTrClass = 'active';
	
	
	var table = this.$el.closest('[table]').attr('table');
	this.$el.attr('d2js.root', table).attr('data', 'this');
	var paging = this.$el.closest('[paging]').attr('paging');
	if (paging == 'false') {
		this.$el.find('.pagination').closest('tfoot').remove();
	} else {
		this.$el.find('.pagination').attr('data', 'this');
	}

	var idColumn = this.$el.closest('[id-col]').attr('id-col') || 'id';
	var valueColumn = this.$el.closest('[value-col]').attr('value-col') || idColumn;
	var asObject = this.$el.closest('[as-object]').attr('as-object') == 'true';

	if (this.$el.closest('[show-header]').attr('show-header') == 'false') {
		this.$el.find('thead').hide();
	}
	
	var me = this;
	var select = this.$el.closest('[select]').attr('select') || 'none';
	switch (select) {
		case 'none': ;
			break;
		case 'single':
		case 'multi':
			if(bootstrap) this.$el[0].className = 'table table-hover table-condensed table-selectable';
			if(semantic)  this.$el[0].className = 'ui selectable table';	// celled striped
			this.$el.attr('checkable', (select == 'multi') + '');
			if (select == 'multi') {
				this.$el.on('checkchange', function () {
					var checked = getCheckedItems(me.$el.data('tree'), valueColumn);
					me.$el.data('value', checked);

					me.$el.find('tbody>tr').each(function () {
						var row = $(this).findRoot().root.row;
						if (checked.indexOf(row[valueColumn]) != -1) $(this).addClass(selectedTrClass); else $(this).removeClass(selectedTrClass);
					});

					me.$el.trigger('valuechange', [checked]);
				});
			}

			this.$el.on('d2js.rendered', function f(event) {
				if (event.target == me.el) {
					var value = me.$el.data('value');
					//console.log('after rendered, set value ', value);
					me.$el.find('tbody>tr').each(function (idx, tr) {
						var row = $(this).findRoot().root.row;
						if (value && value.indexOf(row[valueColumn]) != -1) $(tr).addClass(selectedTrClass); else $(tr).removeClass(selectedTrClass);
					});
					me.$el.find('tbody>tr').each(function (idx, tr) {
						$(tr).on('click', function (event) {
							if (select == 'multi') {
								if ($(event.target).is('td[molecule-obj=TreeNode]>input')) {
									return;
								}
								var ck = $(tr).find('td[molecule-obj=TreeNode]>input');
								ck.prop('checked', !ck.prop('checked'));
								ck.change();
							} else {
								var row = d2js.findRoot(tr).root.row;
								me.setMultiValue([toValue(row)], event);
							}
						});
					});
				}
			});

			this.setValue = this.setMultiValue = function (value, event) {
				var table = d2js.locateData(this.$el)[0];
				this.$el.data('tree', null);
				var neu = value && value.slice();
				var old = me.$el.attr('value');
				//console.log(me.$el.attr('data'), 'set value ', value);
				if (JSON.stringify(neu) != JSON.stringify(old)) {
					this.$el.data('value', neu);
					//console.log('trigger value change', me.$el.attr('data'));
					var evt = jQuery.Event("valuechange");
					evt.originalEvent = event && event.originalEvent;
					me.$el.trigger(evt, [neu]);
				}
				d2js.render(this.$el);
			}
			this.getValue = this.getMultiValue = function () {
				return this.$el.data('value');
			}

			if (select == 'single') {
				this.setValue = function (value) { this.setMultiValue([value]); }
				this.getValue = function () { return this.getMultiValue() && this.getMultiValue()[0]; }
			}

			break;
	}
	
	
	function getCheckedItems(roots, valueColumn) {
		var items = [];
		for (var stk = roots.slice(); stk.length;) {
			var item = stk.pop();
			if (item.checked) {	// 忽略选中的子节点
				items.push(item)
			} else {
				for (var i = 0; i < item.children.length; i++) {
					stk.push(item.children[i]);
				}
			}
		}
		return items.map(function (nd) { return toValue(nd.row) });
	}

	function toValue(row){
		if(asObject) return row;
		return row[valueColumn]
	}
	
	this.$el.bindRenderers({tree : function (hTable, table) {
		
		var checked = $(hTable).data('value');
		var checkable = hTable.getAttribute('checkable');
		checkable = (checkable && checkable != 'false');
		var idColumn = $(hTable).closest('[id-col]').attr('id-col') || 'id';
		var valueColumn = $(hTable).closest('[value-col]').attr('value-col') || idColumn;
		var parentColumn = $(hTable).closest('[parent-col]').attr('parent-col') || 'parent_id';
		var rebuildTree = false;
		var rows = null, index = null;
		if(table.isList){
			rows = table;
			index = rows.indexBy(idColumn);
		} else {		// isDataTable
			rows = table.rows;
			if(table.indexes == null) table.rebuildIndexes();
			index = table.indexes[idColumn];
		}

		var tree = $(hTable).data('tree');

		if (!tree) {
			rebuildTree = true;
		} else if ((rows.length == 0) != (tree.length == 0)) {
			rebuildTree = true;
		} else if (rows.indexOf(tree[0] && tree[0].row) == -1) {
			rebuildTree = true;
		}
		if (rebuildTree) {
			tree = buildTree(idColumn, parentColumn);
			$(hTable).data('tree', tree);
		}
		
		function buildTree(idColumn, parentColumn) {
			var roots = rows.filter(function (row) {
				return index[row[parentColumn]] == null;		// 没有父节点的即是根节点
			}).map(function (row) { return toNode(row, 0) });

			function toNode(row, depth, parentNode) {
				var node = { row: row, expanded: true, depth: depth, parent: parentNode, isTreeNode: true };
				if (checkable) {
					node.checked = false;		// false | true | undefined
					if ((parentNode && parentNode.checked) || (checked && checked.indexOf(toValue(row)) != -1)) {
						node.checked = true;
					}
				}
				node.children = rows
					.filter(function (crow) { return crow[parentColumn] == row[idColumn] })
					.map(function (crow) { return toNode(crow, depth + 1, node) });
				return node;
			}

			$(hTable).data('tree', roots);
			return roots
		}


		var columnRenders = [];
		var headRow = hTable.tHead.rows[0];
		for (var i = 0; i < headRow.cells.length; i++) {
			var cell = headRow.cells[i];
			var attrs = {};
			for (var j = 0; j < cell.attributes.length; j++) {
				var attr = cell.attributes[j].name;
				var v = $(cell).attr(attr);
				switch (attr) {
					case 'data-t': attrs['data'] = v; break;
					default: attrs[attr] = v;
				}
			}
			columnRenders.push(attrs);
		}

		if (hTable.tBodies.length == 0) {
			var tBody = hTable.createTBody();
		} else {
			var tBody = hTable.tBodies[0];
			while (tBody.rows.length) {
				tBody.rows[0].remove();
			}
		}

		var stk = tree.slice(); stk.reverse();
		while (stk.length) {
			var nd = stk.pop();
			var idx = rows.indexOf(nd.row);

			var tr = tBody.insertRow();
			$(tr).bindRoot(nd, hTable);
			columnRenders.forEach(function (column) {
				var cell = document.createElement('td');
				var isTreeNode = false;
				for (var attr in column) {
					if (column.hasOwnProperty(attr)) {
						if (attr == 'data') {
							$(cell).attr('data', 'row,' + column[attr]);
						} else if (attr == 'data-n') {
							$(cell).attr('data', 'row,' + column[attr]);
						} else {
							$(cell).attr(attr, column[attr]);
						}
					}
				}
				tr.appendChild(cell);
			});
			// $(tr).render();

			if (nd.expanded) {
				for (var i = nd.children.length - 1; i >= 0; i--) {
					stk.push(nd.children[i]);
				}
			}
		}
	}});
}

