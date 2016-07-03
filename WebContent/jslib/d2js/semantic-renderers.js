
/**
 * 分页组件。渲染 DataTable。
 */
d2js.Renderers.pagination = d2js.KNOWN_RENDERERS['pagination'] = function(element, table){
	var ul = $(element);
	ul.html('');
	
	var isFirstPage = (table.page == 0);
	var isLastPage = (table.page >= table.pageCount -1);
	
	var a = $(document.createElement('a')).appendTo(ul);
	a.addClass('icon item');
	if(isFirstPage) a.addClass('disabled');
	a.href = '###';
	if(!isFirstPage){
		a.on('click', function(){
			table.navigatePage(table.page - 1);
		});
	}
	a.html('<i class="left chevron icon"></i>');
	
	for(var i=0; i < table.pageCount; i++){
		var a = $(document.createElement('a')).appendTo(ul);
		a.addClass('item');
		a.href = '###';
		if(i == table.page){
			a.addClass('active');
			a.html(i+1);
		} else {
			a.attr('page', i);
			a.on('click', function(){
				table.navigatePage(this.getAttribute('page'));
			});
			a.html((i + 1));
		}
	}
	
	
	var a = $(document.createElement('a')).appendTo(ul);
	if(isLastPage) a.addClass('disabled');
	a.addClass('icon item')
	a.href = '###';
	if(!isLastPage){
		a.on('click', function(){
			table.navigatePage(table.page + 1);
		});
	}
	a.html('<i class="right chevron icon"></i>');
	
}

/**
 * 标准错误渲染器
 * @param element
 * @param value
 * @param table
 * @param _1
 * @param rows
 * @param index
 * @param row
 * @param columnName
 */
d2js.Renderers.stderr = d2js.KNOWN_RENDERERS['stderr'] = function(element,  value, columnName, row, index, rows, _1, table){
	var e = $(element), v = value;
	if(value == null){
		e.hide();
	} else {
		e.attr('class', '');
		switch(v.level){
		case 'warning' :
			e.addClass('ui yellow message');
			break;
		default :
			e.addClass('ui red message');
		}
		e.html(value.message);
		e.show();
	}
}

/**
 * 字段错误渲染器
 */
d2js.Renderers.flderr = d2js.KNOWN_RENDERERS['flderr'] = function(element,  value, columnName, row, index, rows, _1, table){
	var e = $(element), v = value;
	var helpDiv = null;
	if(e.is('.ui.orange.label')){
		helpDiv = e;
		e = helpDiv.parent();
	} else {
		helpDiv = e.find('.ui.orange.label');
		if(helpDiv.length == 0){
			helpDiv = $(document.createElement('div')).appendTo(e).addClass('ui orange label');
		}
	}	
	if(value == null){
		e.closest('.field').removeClass('error');
		helpDiv.html('').hide();
	} else {
		e.closest('.field').addClass('error');
		helpDiv.html(value.message || value + '').show();// .css('display', 'inline-block');
	}
}

/**
 * dropdown 渲染器
 * ```html
 * <select renderer="$dropdown" collector="c|s"></select>
 * ```
 */
d2js.Renderers.$dropdown = function(element, value){
	if($(element).parent().is('.ui.dropdown')){
		$(element).parent().dropdown('set selected', value);
	} else {
		$(element).val(value);
		$(element).dropdown();
	}
}

/**
 * choose 渲染器
 * ```html
    <div class="ui buttons" renderer="$choose" collector="$choose|n|s">
        <button class="ui basic button" value="0">0</button>
        <button class="ui basic button" value="1">1</button>
    </div>
   ```
 */
d2js.Renderers.$choose = function(element, value){
	$(element).find('*').each(function(index, ele){
		if($(ele).attr('value') == value){
			$(ele).addClass('choosed');
		} else {
			$(ele).removeClass('choosed');
		}
		$(ele).click(function(){
	        $(ele).addClass('choosed');
	        $(ele).siblings().removeClass('choosed');
	    });
	})
}

