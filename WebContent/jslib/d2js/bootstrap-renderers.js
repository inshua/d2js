/**
 * bootstrap 渲染器
 * @namespace
 */
d2js.Renderers.bootstrap = {}

/**
 * label 渲染器
 * 一个demo性的渲染器，没有实际效果。
 * 用法：
 * renderer="bootstrap.label('default')", renderer="bootstrap.label('primary')" etc 
 */
d2js.Renderers.bootstrap.label = function(level){
	level = level || 'default';
	return function(element, value, columnName, row, index, rows, _1, table){
		element.innerHTML = value + '';
		element.className = 'label label-' + level;
	}
}

/**
 * 分页组件
 * 用法：
 * ```html
 * <nav>
	  <ul class="pagination" data="#table" renderer="pagination">
	  </ul>
   </nav>
   ```
 */
d2js.Renderers.pagination = d2js.KNOWN_RENDERERS['pagination'] = function(element, table){
	[{$:'.pagination > .active > a, .pagination > .active > span, .pagination > .active > a:hover, .pagination > .active > span:hover, .pagination > .active > a:focus, .pagination > .active > span:focus, .pagination > li > a:hover, .pagination > li > span:hover, .pagination > li > a:focus, .pagination > li > span:focus'
		,cursor : 'pointer'
	}].defCss();
	
	var ul = $(element);
	ul.html('');
	
	var isFirstPage = (table.page == 0);
	var isLastPage = (table.page >= table.pageCount -1);
	
	var li = $(document.createElement('li')).appendTo(ul);
	if(isFirstPage) li.addClass('disabled');
	
	var a = $(document.createElement('a')).appendTo(li);
	a.attr('aria-label', 'Previous');
	a.href = '###';
	if(!isFirstPage){
		a.on('click', function(){
			table.navigatePage(table.page - 1);
		});
	}
	a.html('<span aria-hidden="true">&laquo;</span>');
	
	for(var i=0; i < table.pageCount; i++){
		var li = $(document.createElement('li')).appendTo(ul);
		var a = $(document.createElement('a')).appendTo(li);
		a.href = '###';
		if(i == table.page){
			li.addClass('active');
			a.html((i+1) + '<span class="sr-only">(current)</span>');
		} else {
			a.attr('page', i);
			a.on('click', function(){
				table.navigatePage(this.getAttribute('page'));
			});
			a.html((i + 1));
		}
	}
	
	var li = $(document.createElement('li')).appendTo(ul);
	if(isLastPage) li.addClass('disabled');
	
	var a = $(document.createElement('a')).appendTo(li);
	a.attr('aria-label', 'Next');
	a.href = '###';
	if(!isLastPage){
		a.on('click', function(){
			table.navigatePage(table.page * 1 + 1);
		});
	}
	a.html('<span aria-hidden="true">&raquo;</span>');
	
}


/**
 * 标准错误渲染器
 * 渲染错误，当没有错误时隐藏元素。
 */
d2js.Renderers.stderr = d2js.KNOWN_RENDERERS['stderr'] = function(element,  value, columnName, row, index, rows, _1, table){
	var e = $(element), v = value;
	if(value == null){
		e.addClass('hide');
	} else {
		e.attr('class', '');
		switch(v.level){
		case 'warning' :
			e.addClass('label label-warning');
			break;
		default :
			e.addClass('label label-danger');
		}
		e.html(value.message);
	}
}

/**
 * 字段错误渲染器。结合表单使用。
 */
d2js.Renderers.flderr = d2js.KNOWN_RENDERERS['flderr'] = function(element,  value, columnName, row, index, rows, _1, table){
	var e = $(element), v = value;
	var helpDiv = null;
	if(e.is('.help-block.with-errors')){
		helpDiv = e;
		e = helpDiv.parent();
	} else {
		helpDiv = e.find('.help-block.with-errors');
		if(helpDiv.length == 0){
			helpDiv = $(document.createElement('div')).appendTo(e);
			helpDiv.addClass('help-block with-errors');
		}
	}	
	if(value == null){
		e.removeClass('has-error');
		helpDiv.html('');
	} else {
		e.addClass('has-error');
		helpDiv.html(value.message || value + '');
	}
}