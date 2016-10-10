## 2016-10-10

对运行效率进行优化。

之前的模型为每个 d2js 创建一个引擎池，调用时不够则扩容，好处是可以方便的使用全局变量，表达 request, response 等相对容易。由于引擎很重，消耗的资源很大。

现在调整为只使用一个 nashorn 引擎，所有 d2js 都创建于同一个引擎，隔离放置于 allD2js ConcurrentHashMap<String, D2JS>。每次调用时提取 D2JS 对象，并为本次请求产生一个副本 D2JS 对象，该副本在这次响应结束后释放。request, response, out, session 等现在附着于该副本 D2JS 对象。

因此，在 d2js 中之前的 request, response, out, session 等，现在使用 this.request, this.response, this.out, this.session 方式访问。 

在 jssp 中仍可使用原方式。

与 request, response, session 等相关的函数，目前已调整。

* includeJssp 改为 this.includeJssp
* D2JS.DataTable.nest(...) 改为 nest(d2js,...) 
* 不再支持在 jssp 中使用 [% console.log() %]

本轮优化后，d2js 性能大致接近 jsp 的 50% - 90%。