# d2js 的 orm：entity-map
==================

闲话少说，服务器端：

```js
// author.d2js
d2js.entityMap = {
	name : 'Author', 
	table: 'author',        
	map: {
		books : {
				type : 'Book',
				d2js:'book-entity.d2js',
				relation: 'many',   // many|one
				key: 'id', 
				fk: 'author',
				isOwner : true, 
		}
	}   
}

d2js.fetch = function(params){
	sql{.
		select * from author where 1 = 1
		sql{.?(params.name) and strpos(name, :name) > 0 .}
	.}
	var r = this.query(this.orderBy(sql, params._sorts, {id:'asc'}), params, params._page);
	return r.orm(this);
}

d2js.validate = function(row, action){
	$V(this, row, {
		name : V.notNull,
		email : V.email,
		info : V.attrs(['linkin']),
		'info,linkin': V.shortest(5)
	});
}
```

```js
// book.d2js

d2js.entityMap = {
	name : 'Book', 
	table : 'book', 
	map: {
		author : { type: 'Author', d2js: 'author-entity.d2js', relation: 'one', key: 'author', fk: 'id' },
		publisher : { type: 'Publisher', d2js: 'publisher-entity.d2js', relation: 'one', key: 'publisher_id', fk: 'id'}		
	}
}

d2js.fetch = function(params){
	sql{.
		select * from book b where 1=1
		code{. 
			sql{.?(params.title) and strpos(b.title, :title) > 0  .}
		.}
	.}
	sql = this.orderBy(sql, params._sorts, {'b.title' : 'asc'});
	return this.query(sql, params, params._page).orm(this);
}

d2js.validate = function(rcd, action){
	$V(this, rcd, {title : [V.notNull]})
}

```

```js
// publisher.d2js 略
```

每个实体类型对应一个 d2js 文件。d2js 文件通过定义 entityMap 指定与其它实体类型的映射方式。

在查询结果中，调用 d2js.DataTable 的 `orm(this, filter)` 方法递归提取关联实体。

这时，返回的数据中就包含了关联数据。

前端js：

```js
	'use strict';
	
	(async function(){
		await d2js.meta.load(['/path/to/author-entity.d2js', '/path/to/book-entity.d2js', '/path/to/publisher-entity.d2js']);
		
		let author2 = await d2js.root.Author.fetchById(2);      // 提取id=2的作者信息
		$('.container').bindRoot(author2).render();     // 渲染

        console.log(author2.books[0].title);        // 容器元素对象

        var book = new d2js.root.Book();
        book.title = '雪';
        author2.books.push(book);   // 添加新元素
        author2.submit();       // 连带提交
	})();
```

对比 d2js.DataTable 形式，entity map 有以下特点：

1. 主从关系在前端已经转换为简单的`容器-元素`关系，单个实体支持 submit 等操作。
1. 属性转化为对象的 property，支持赋值后自动修改 _state，不需要使用 _set('attr', value)
1. 支持使用 new EntityType 形式创建对象
1. 容器的变化可以反映到对象的 owner 上，如上面的 book 对象加入 books 后，其 author 即变为 author2。
1. 反之 entity.owner = newOwer 也可以反映到 newOwer 的相应容器元素中

## d2js.Entity.dynamic  d2js.List.dynamic

对于一些简单的单表应用，如对该 entity map 的某些特性感兴趣，而又不想修改后台代码，可以使用 d2js.Entity.dynamic  d2js.List.dynamic 对接后台。

如下代码可以对接示例的 author.d2js：

```js
 	'use strict';
	
	(async function(){
		
		
		var authors = await d2js.List.dynamic.fetch('/d2js-test/author.d2js');
		console.log(authors);
		
	})();
```
当然，上面这种做法是不能得到 author.books 的。

另外，当客户端不加载 meta 时，也可以用 dynamic 方式与包含 entity map 的服务器输出对接。

```js
 	'use strict';
	
	(async function(){
		var book = await d2js.Entity.dynamic.fetch('/d2js-test/entity/book-entity.d2js', 'getOne', {id : 2});
		console.log(book);
	})();
```
当作为展示用途时，上面的做法已经足够了。