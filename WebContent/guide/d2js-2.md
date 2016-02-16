# d2js (part ii)
==================
## 高级话题

### 调试渲染器和收集器

为了查明渲染器的行为，可以在 `<tag data="" renderer="">` 增加 `trace-render`，即
	
	<tag data="" renderer="" trace-render>
	
这样当渲染该元素时，会自动进入断点。

同样，启用 `trace-collect` 可以追踪收集器的行为。

### 禁用收集器

有时有的元素虽然指定了数据路径和收集器，但是暂时不需要收集，此时可指定 'no-collect' 为 true，该属性对子元素有屏蔽作用——除非对子元素收集。

### d2js 中的词典

在实际业务中，经常遇到枚举性质的词典，例如 `M=男 F=女`，数据库中存储的值为M,F，需要显示出来的是"男，女"。d2js 可以方便的处理词典。

对于一次性的词典，在渲染器直接指定即可。如
```html
<p id="info" data="gender" renderer="dict({M:'男', F:'女'})|std">
<script>
	$('#info').render({name : 'mary', gender: 'F'}, true);
</script>
```
对于多次使用的词典，可以创建为 `d2js.dataset.dicts` 的成员，如：
```html
<input id="info" data="gender" dict="gender" renderer="dict|std">
<script>
	d2js.dataset.dicts.gender = {M : '男', F: '女'};
	// 或简写为 
	Dicts.gender = {M : '男', F: '女'};
	
	$('#info').render({name : 'mary', gender: 'F'}, true);
</script>
```

此外，d2js 也支持数组性的词典，详见 d2js 手册。

### 渲染下拉列表框 select

下拉列表框实际上有两种类型的数据来源，一种是词典，一种是数据表。

对于词典性数据，如前述`性别`词典，期望得到

```html
	<select>
		<option value="M">男</option>
		<option value="F">女</option>
	</select>
```
由于 select 本身是一种单值输入控件，具有输入控件固有的数据路径，故不能对 select 使用 *data="词典" renderer="下拉列表"* 这样的表述。
对下拉列表提供数据，需要在外层嵌套一层 div 或其它元素。如前述`性别`词典，可以表述为：

```html
	<div data="#dicts" dict="gender" renderer="dictToList|options">
		<select data="gender" renderer="std"></select>
	</div>
	<script>
		Dicts.gender = {M : '男', F: '女'};
	
		$('#info').render({name : 'mary', gender: 'F'}, true);
	</script>
```

以 DataTable 为数据来源的下拉列表框，可以表述为:

```html
	<div data="#gender,rows" renderer="options('value', 'mean')">
		<select data="gender" renderer="std"></select>
	</div>
	<script>
		new d2js.DataTable('gender').fill([{value: 'M', mean: '男'}, {value: 'F', mean: '女'}]);
		$('#info').render();
	
		$('#info').render({name : 'mary', gender: 'F'}, true);
	</script>
```
其中 `renderer="options('value', 'mean')"`，当值字段为 id，含义字段为 name 时，可以缩写为 

	renderer="options"
	
### 表达式渲染器 expr

可以使用表达式渲染器渲染一些简单的内容，如：

```html
<div data="#person,rows,0" renderer="expr">
	<div class="header">{{name}}</div>
</div>
```

表达式渲染器书写更美观的，但是由于大量替换 innerHTML，效率较 std 渲染器低。

### 重复项渲染器 repeater

```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true">
		<div class="header" data="name" renderer="std"></div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```
repeater渲染器对所提供的数组类型的数据进行循环，将 `repeater="true"` 的子元素视为模板，不断重复。
重复得到的克隆体元素，其具有 repeater-copy="true"属性，并获得 jQuery 的 repeater-obj 数据，即可以通过 $('[repeater-copy]).data('repeater-obj')访问相应的实际数据。如本例中，即可访问 DataRow 对象。
当数组为空时，子元素中 `repeater-empty="true"` 的子元素会被展示出来。

模板子元素，也即`repeater="true"`的元素，可以存在多个，并使用 when 表达式决定是否应当对本条数据展示，如：
```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true" when="gender='F'">
		<div class="girl header" data="name" renderer="std"></div>
		<div>女性促销信息</div>
	</div>
	<div repeater="true" when="gender='M'">
		<div class="boy header" data="name" renderer="std"></div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```
重复项渲染器中，可以使用 expr 渲染器。此时，expr 元素的数据路径可指定为 `this`：
```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true" data="this" renderer="expr">
		<div class="header">{{name}}</div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```

### 表格渲染器，页码渲染器及可以编辑单行的对话框

请见所提供的 `d2js-test/4.html` 的示例及其源码。

### d2js 中使用事务

d2js 中可以使用方便的使用数据库的事务。

```js
d2js.test = function(){
	return this.doTransaction(function(){
		this.execute('update staff set salary = salary * 1.1');
		return this.query('select * from staff where id = ?', [12]);
	})
}
```

### d2js 日志输出

d2js 现在使用 log4j 框架，每个引擎初始化即带有一个 `logger` 全局对象，可以使用 `logger.info, logger.debug, logger.error` 等日志函数，用法与 log4j 一样。

可以在日志中使用 `JSON.strigify(js object)` 输出 js 对象，包括数据库查询结果、接收到的参数等等。

可以在日志中使用 `logger.error('<<description>>', wrapJsError(e))` 打印错误堆栈日志。

完善的错误处理得益于 jdk8 以上版本所提供的 narshorn js 引擎。

### d2js 编写伪存储过程

事实上，如果不担心性能，d2js 可以部分取代存储过程，充当 js 语言编写的存储过程。

d2js 提供 query, queryRow, querScalar, travel 等便捷的函数获取数据，提供 insertRow, updateRow, deleteRow, mergeRow 等函数更新数据库，并支持事务、IN-OUT游标、JSON,JSONB,ARRAY等等各种数据库语言自己都难以驾驭的数据类型，同时，d2js 还可以使用 request,session,response等web服务器对象，所以将d2js视为一种存储过程编写机制也不失为一种有趣的尝试。

当然，由于d2js不运行于数据库服务器，每次执行SQL都将产生网络开销，所以效率不能与真正的存储过程相提并论。

但是在不考虑运行效率的场合，使用 d2js 的存储过程也有较大的优势：
* 动态语言不需要 orm 就可以取用存储在数据库中的业务对象，对商业逻辑的表达能力更强
* d2js 所依赖的 nashorn 引擎可以提供错误的堆栈信息，大部分数据库都没有错误堆栈
* 日志与服务器日志合在一处，便于排查错误
* 可以使用 js 的全部语法特性，并能通过 nashorn 引擎使用 java 语言的各种设施
* d2js 中可以方便的从 session 等服务器端对象获取所需信息
* 服务器可以联合使用其它的 nosql 数据库
* 在实际开发中，d2js 灵活的注入或构造查询结果数据，在数据库没有就绪时可以先构造假数据

### 服务器端数据校验

d2js 可以编写服务器校验逻辑，对输入的数据进行校验。如：

```js
d2js.create = function(rcd){
	$V(rcd, {
		name : [V.notNull, V.shortest(5)],
		gender : [V.inside(['M', 'F'])]
	});
	
	this.insertRow('author', rcd, ['name', 'gender']);
}
```
校验函数定义在 `WEB-INF/jslib/d2js/validation.js` 中。

当校验失败时，前端对应的数据行 row._error_at[colName] 将出现值，可以使用渲染器 `flderr` 将其绘出。可参考 `d2js-test/4.html`，该页面用到了 bootstrap.js 样式。

其中渲染字段错误的代码如：

```html
  <div class="form-group" data="#author,curr,_error_at,name" renderer="flderr" trace>
    <label>Name</label>
    <input type="text" class="form-control" data="#author,curr,name" renderer="std" collector="c|s">
  </div>
```

![d2js validation](images/d2js-validation.png?raw=true)

其中，`curr` 属性为当前行，是该页面对 table 插拔的一个自定义属性，不是 dataset 标准属性。

在后台 `.d2js` 文件中，也可以简单的引发其它错误：
```js
d2js.modify = function(rcd){
	throw new Error('permission denied');
}
```
使用下面 html 可以渲染校验错误：

```html
<div data="#author,curr,_error" renderer="stderr"></div>
```
![d2js validation](images/d2js-validation2.png?raw=true)

可见，d2js 中的渲染是涵摄很广的概念。DataTable,DataRow 的错误、分页、状态都可以通过渲染来表达。

### 自定义校验器

校验函数定义在 `WEB-INF/jslib/d2js/validation.js` 中。

如自定义校验器为全项目公共校验器，可以放在该文件中。

如自定义校验器为模块级校验器，可放于模块公共 js 文件中，模块中的各个 d2js 文件使用 `include()` 导入。

如自定义校验器为功能内公用校验器，可在该功能 d2js 中定义校验器对象，如：

```js
	var myValidator = {
		name : 'my validator',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.toUpperCase() != v) return '必须全部为大写字母';
		}
	}
	
	d2js.create = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), myValidator],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.insertRow('author', rcd, ['name', 'gender']);
	}
	
	d2js.modify = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), myValidator],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.updateRow('author', rcd, ['id', 'name', 'gender']);
	}
```

如为一次性使用，也可直接嵌入于函数中。如：

```js
	d2js.create = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), {
						name : 'my validator',
						check : function(v, fld){
							if(v==null||v=='') return;
							if(v.toUpperCase() != v) return '必须全部为大写字母';
						}
					}],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.insertRow('author', rcd, ['name', 'gender']);
	}
```

### 多国语言的建议

各种程序内消息，建议编写一个用法如下的函数 `LM(message)`(locale message):

```js
	var myValidator = {
		name : 'my validator',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.toUpperCase() != v) 
				return LM('必须全部为大写字母');	// 根据用户当前语言获取适合他阅读的消息
		}
	}
```

所有语言的消息可以放在 `WEB-INF/jslib/i18n` 中。以下面的形式存储:

```js
	LM['en-US'] = {
		'必须全部为大写字母' : 'must in uppercase',
		'权限不足': 'permission denied',
	}
```
这样，可以编写一个小工具，搜索所有项目中的字面常量，加入 `LM` 中。

如何实现 `LM` 函数呢？读者可自己思考。提示，在 d2js 中可以使用 session。


### json 字段的显示与收集

postgresql9.3 以后的版本都提供 json 数据类型，pg9.4以上支持 jsonb 数据类型（d2js 默认使用 jsonb 数据类型）。使用 d2js 可以尽情发挥json类型的优势。

示例数据表 author 有字段名为 info 的 jsonb 字段，用来存储其它字段中描述不周的信息。现假如需要将 linkin 账号放在 info 字段。

json 字段的值到网页前端即自动变成 js 对象。如上述 author 表的 info 字段为 jsonb 类型，可以使用 row.info.linkin 访问其 linkin 属性。

在界面渲染时，只要在数据路径使用
	
	info,linkin
	
即可显示该字段。

对于 json 中的属性，收集器不能再使用 `s` 收集器，使用 `s` 收集器不会引起 DataRow 的状态发生变化。对于此种对象类型的字段，应使用 `oc`收集器。即：

```html
	<input data="info,linkin" renderer="std" collector="c|oc">
```

d2js 数据校验方面，使用如下表达：

```js
d2js.create = function(rcd){
	$V(rcd, {
		name : [V.notNull, V.shortest(5)],
		gender : [V.inside(['M', 'F'])],
		info : [V.attrs(['linkin'])],	// 防止用户注入其它属性
		'info,linkin': [V.shortest(5)]
	});
	
	this.insertRow('author', rcd, ['name', 'gender', 'info']);
}
```
在 d2js 中，jsonb 数据类型可以畅通无阻的 insert, update。


### 主从表

在d2js中，主从表在前端汇合，后端不需要做声明。

前端声明两个表的关系的方法：

```js
	var author = new d2js.DataTable('author', 'author.d2js');
	var book = new d2js.DataTable('book', 'book.d2js');
	
	author.addRelation('id', 'book', 'author');
```

表之间的关系建立后，可以使用`findChildRows, findParentRows` 等函数访问子表行和父表行。

在调用主表的 `submit` 提交数据时，子表数据也会连带提交。服务器所预备的若干个 d2js 的数据更新函数会陆续发生调用。虽然被调用的函数分散在不同的 d2js 文件中，整个提交过程仍在同一个事务中进行，一旦出错即整体回滚。

尽管 d2js.dataset 支持表间关系，在实践中，d2js.DataTable 的数据来源通常**应当为查询结果集**，与数据库的表**不能**简单的一一对应，页面的d2js.dataset仅仅是RDBMS的一个**剪影(snap)**，千万要遏制把数据库结构照搬到网页上的冲动。


### 将d2js后端应用于其它前端框架

d2js 前后端耦合程度很低，作为一种 RESTful 接口，d2js 服务可以轻松运用于其它前端框架。这里给出一个 ExtJS 的前端实现作为分享：

```js
Ext.define('Ext.data.reader.D2jsJson', {
    extend: 'Ext.data.reader.Json',
    alias : 'reader.d2js',
    successProperty : null,
    messageProperty : null,
    totalProperty : 'total',
    
    getResponseData: function(response) {
        var data, error;
 
        try {
            data = Ext.decode(response.responseText);
            if(data.error) {
            	error = new Ext.data.ResultSet({
	                total  : 0, count  : 0, records: [], success: false,
	                message: data.error
	            });
            }
        } catch(ex){
        	error = new Ext.data.ResultSet({
        		total  : 0, count  : 0, records: [], success: false,
                message: response.responseText
            });
        }        
        if(!error){
        	try{        		
	            return this.readRecords(data);
	        } catch (ex) {
	        	error = new Ext.data.ResultSet({
	        		total  : 0, count  : 0, records: [], success: false,
	                message: ex.message
	            });	            
	        }
        }
        this.fireEvent('exception', this, response, error);
    	
        Ext.Logger.warn('Unable to parse the JSON returned by the server');

        return error;
    },
    
    getMeta : function(data){
    	return {root : 'rows', fields : data.columns};
    },

    readRecords: function(data) {
    	if(data.error){
    		throw new Error(data.error);
    	} else {
    		return this.callParent(arguments);
    	}
    },
    buildExtractors : function(){
    	this.callParent(arguments);
    	this.getRoot = function(data){
    		if(data.data) return data.data.rows;
    		if(data.rows) return data.rows;
    		return null;
    	}
    	this.getMeta = function(data){
    		if(data.data) return data.data.columns;
    		if(data.columns) return data.columns;
    		return null;
    	}
    }
	
});

Ext.define('Ext.data.writer.D2jsJson', {
    extend: 'Ext.data.writer.Json',
    alias : 'writer.d2js',
    writeRecords: function(request, data) {
    	var root = this.root;
        
        if (this.expandData) {
            data = this.getExpandedData(data);
        }
        
        if (this.allowSingle && data.length === 1) {
            data = data[0];
        }

        var params = request.params.params;
        if(params) params = JSON.parse(params);
        
        Ext.apply(params, data);
        
        request.params.params = JSON.stringify(params);
        
        return request;
    }, 
    getRecordData: function(record, operation) {
    	var r = this.callParent(arguments);
    	if(operation.action == 'update'){
    		r._origin = record.raw;
    	}
    	return r;
    }
});

Ext.define('Ext.data.proxy.D2js', {
    extend: 'Ext.data.proxy.Rest',
    alternateClassName: 'Ext.data.RestProxy',
    alias : 'proxy.d2js',
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'POST',
        destroy: 'POST'
    },
    d2jsMethods: {
        create : 'create',
        read   : 'fetch',
        update : 'modify',
        destroy: 'destroy'
    },
    reader : {
		type : 'd2js'
	}, writer : {
		type : 'd2js'
	},
	appendId : false,
	
    getParams: function(operation) {
        var me = this,
            params = {},
        	sorters = operation.sorters;
        
        params = operation.params.q || {};        

        if(operation.start != null && operation.limit != null){
        	params._page = {start : operation.start || 0, limit : operation.limit || 0};        
        }
        
        if(sorters){
	        var sorts = {};
	        for(var i=0; i<sorters.length; i++){
	        	sorts[sorters[i].property] = sorters[i].direction; 
	        }
	        params._sorts = sorts;
        }

        delete operation.params.q;
        
        params = { params : JSON.stringify(params)};
        if(operation.params._m){
        	params._m = operation.params._m; 
        } else {
        	params._m = this.d2jsMethods[operation.action];
        }
        return params;
    }
});

Ext.define('Org.Siphon.D2js.Store', {
	extend : 'Ext.data.Store', autoLoad : false,
	pageSize : 10, remoteSort : true, proxy : { type : 'db2js' }, listeners : {
		update : Ext.emptyFn
	}, load : function(options) {
		var bparams = this.baseParams;
		if (options && options.params && bparams && bparams.params) {
			Ext.applyIf(options.params, bparams.params);
		}
		options = Ext.applyIf(options || {}, bparams);
		this.callParent([ options ]);
	}, constructor : function(config) {
		this.proxy.model = this.model;
		this.callParent([ config ]);
		this.proxy.url = this.proxy.url || (this.model ? (new this.model()).url : null) || config.url;
		this.baseParams = config.baseParams;
	}, q : function(query) {	/* {cond : value, cond : value} */
		var qd = this.baseParams && this.baseParams.params && this.baseParams.params.q;
		if (qd) {
			qd = Ext.apply(qd, query);
		} else {
			qd = query;
		}
		if (!this.baseParams)
			this.baseParams = {};
		if (!this.baseParams.params)
			this.baseParams.params = {};
		this.baseParams.params.q = qd;
		return this;
	}, m : function(method) {
		if (!this.baseParams)
			this.baseParams = {};
		if (!this.baseParams.params)
			this.baseParams.params = {};
		this.baseParams.params._m = method;
		return this;
	}
});

/**
 * 使用方法  :
 * var store = Ext.create('Org.Siphon.DynaStore', {url : 'author.d2js'});
 * store.m('fetch').load({params : {name : 'Kant'}}); 
 */
Ext.define('Org.Siphon.DynaStore', {
	extend : 'Org.Siphon.Store', autoLoad : false, proxy : {
		type : 'db2js', reader : {type : 'db2js', useRemoteMeta : true} 
	},
	setProxy: function(proxy) {		// ext 忘了设置 proxy.store,但是在proxy.setModel(model, true)需要用到
		var p = this.callParent([proxy]);
		p.store = this;
		return p;
    },
    setModel: function(model){		// ext 没有这个函数,但是 proxy.setModel(model, true) 调用到了它
    	this.model = model;
    }
});

```

其它客户端形式也可以根据自身情况开发接口连接 d2js 服务或开发类似 d2js 的前端框架。
* .net 可以利用现有 ADO.net 的 DataSet 框架，编写 TableAdapter 实现调用服务器 .d2js 的功能，但由于控件无法插拔，较难实现 render 和 collect 体系；
* java 包括服务器端、Android 端，可以编写类似的 DataSet 框架，同样由于面向对象的控件无法插拔，较难实现 render 与 collect；
* ios 等其它平台与 java 同理。
