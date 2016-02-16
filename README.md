# d2js, jssp 及 molecule 框架

## 初始化环境

### 开发与研究 d2js 项目
0. 安装  [jdk8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
0. 安装 [postgres9.4](http://www.postgresql.org/) 以上版本数据库
0. 在 postgres 中建立数据库，名为`bookstore`, 从 `bookstore/bookstore.backup` 恢复该数据库。
0. 下载解压[eclipse wtp](http://www.eclipse.org/webtools/)
0. 下载解压[tomcat7](http://tomcat.apache.org/download-70.cgi) 或以上版本
0. 在 eclipse 中导入 git 项目 [https://github.com/inshua/d2js.git](https://github.com/inshua/d2js.git)，这是一个 web 项目
0. 设置 tomcat `server.xml` 中 `connector` 的 `URIEncoding=”utf-8”`。
0. 在 `WebContent/META-INF/context.xml`中修改数据库连接。

启动网站后，打开 [http://localhost:8080/d2js/](http://localhost:8080/d2js/) 即可看到功能展示页面。

### 在自己的 web 项目中使用 d2js 技术

0. 确保上述 jdk, 数据库, web 服务器环境正常
0. 导入 [d2js.war](../build/org.siphon.d2js.war?raw=true)
0. 在 `WebContent/META-INF/context.xml`中修改数据库连接。
0. 修改 `jslib/molecule.js`，将 `Molecule.ModulesPath` 中的网站名称修改为你的项目名称

## 指南

* [d2js](guide/d2js.md)
* [jssp](guide/jssp.md)
* [molecule](guide/molecule.md)

指南中的例子需按上述开发与研究 d2js 项目的过程初始化环境后使用。

## 参考手册

在