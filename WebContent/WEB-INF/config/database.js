//var datasourceConfig = {
//	driverClassName: "org.postgresql.Driver", 
//	url: "jdbc:postgresql://localhost:5432/bookstore",
//	username: "postgres", 
//	password: "pass4postgres",
//	initConnectionSqls: "set time zone 'UTC';",
//	maxActive: 100, 
//	maxIdle: 30,
//	maxWait: 10000,
//	defaultJsonDbType: 'JSONB',
//};

var datasourceConfig = {
	driverClassName: "com.mysql.jdbc.Driver", 
	url: "jdbc:mysql://localhost:3306/bookstore?useUnicode=true&characterEncoding=utf-8",
	username: "root", 
	password: "",
	maxActive: 100, 
	maxIdle: 30,
	maxWait: 10000,
	columnNameCase: 1,	// KEEP
	useColumnLabelAsName: true,
};

//var datasourceConfig = {
//    isMongodb: true,
//    url: "localhost:27017",
//    database: 'test',
//}


