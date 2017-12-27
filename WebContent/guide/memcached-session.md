# 使用 memcached 共享 session

基于 https://github.com/magro/memcached-session-manager 实现了一个转换器: `org.siphon.javakaffee.msm.NashornTranscoderFactory`，利用这个转换器可以将 session 中的 java 及 nashorn js 对象转为 json 后存入 memcached（memcached-session-manager 也支持存入 redis 等，详见其文档）。

## META-INF/context.xml
```xml
<Context cookies="false"> <!-- cookies="false" 暴露 jsessionid，用于测试，实际运行不要添加-->
	<!--  ,n2:host2.yourdomain.com:11211 -->
  <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:localhost:11211"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="org.siphon.javakaffee.msm.NashornTranscoderFactory"
    />
</Context>
```

应用时要注意，session 中存放的 js 对象不能有 function，不能循环引用。
