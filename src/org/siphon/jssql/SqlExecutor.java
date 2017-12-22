/*******************************************************************************
 * The MIT License (MIT)
 * Copyright © 2015 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the “Software”), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
package org.siphon.jssql;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.RowId;
import java.sql.SQLException;
import java.sql.SQLType;
import java.sql.Statement;
import java.sql.Time;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.Base64.Decoder;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.UUID;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.sql.DataSource;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeDate;
import jdk.nashorn.internal.objects.NativeFunction;
import jdk.nashorn.internal.objects.NativeObject;
import jdk.nashorn.internal.objects.NativeString;
import jdk.nashorn.internal.runtime.ConsString;
import jdk.nashorn.internal.runtime.ScriptFunction;
import jdk.nashorn.internal.runtime.ScriptObject;

import org.apache.commons.dbcp2.BasicDataSource;
import org.apache.commons.dbcp2.DelegatingPreparedStatement;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.postgresql.core.Oid;
import org.postgresql.util.ByteConverter;
import org.postgresql.util.PGobject;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.common.js.UnsupportedConversionException;

/*
 * query(sql, [1,2,"John"])
 * 
 * query(sql, [{'INT', 19}, 
 * 				{'DOUBLE': 20.2}, 
 * 				{'DECIMAL': 2.344}, 
 * 				{'BINARY': [1,2,3,4]},
 * 				{'BINARY': 'BASE64 String'},
 * 				{'DATE': JavascriptNativeDate},
 * 				{'DATE': 1381284810036},
 * 				{'DATE': '2013-02-29 22:22:22'},
 * 				{'TIME': '22:22:22'}
 * 				{'ARRAY': ['int4', 1, 2, 3]}	// 第一个元素必须是类型
 * 				{'JSON' : JSON OBJECT}
 * 				{'JSONB' : JSON OBJECT}
 * 			  ])
 *
 * 不指定类型时，数字有小数点默认取 DECIMAL 类型，没有小数点默认取INT类型。
 * 所有类型：
 * 	STRING, DECIMAL, INT, LONG, FLOAT, DOUBLE, DATE, ROWID, BINARY, BOOLEAN, OUTCURSOR, UNKNOWN, CLOB
 * 数据库的 BLOB LONGRAW 都输出为 BINARY, CLOB 输出为 STRING
 * 如果字符串很长,数据库已经定义为 CLOB, 建议使用 {CLOB : '长文本'} 方式——实际上只有 MERGE INTO 需要这样,不然会出现 ORA-00600[KOKLISMEM1: R_LENGTH IS 0] 
 * 接收有输出游标的存储过程值，使用  $OUTP()，详见函数说明 
 * 
 * @author Inshua <inshua@gmail.com>
 *
 */
public class SqlExecutor {

	private static Logger logger = Logger.getLogger(SqlExecutor.class);

	private DataSource dataSource;

	private String driverClass;

	private boolean oracle;

	private boolean postgreSQL;

	private boolean mySql;
	
	private int columnNameCase = COLUMN_NAME_CASE_LOWER;
	
	public final static int COLUMN_NAME_CASE_LOWER = 0;
	
	public final static int COLUMN_NAME_CASE_KEEP = 1;
	
	public final static int COLUMN_NAME_CASE_UPPER = 2;

	private ScriptEngine jsEngine;

	private org.siphon.common.js.JSON JSON;

	private JsTypeUtil jsTypeUtil;
	
	private String defaultJsonDbType;
	
	private ZoneId utcZone = ZoneId.of("UTC");

	public int getColumnNameCase() {
		return columnNameCase;
	}

	public void setColumnNameCase(int columnNameCase) {
		this.columnNameCase = columnNameCase;
	}

	public boolean isUseColumnLabelAsName() {
		return useColumnLabelAsName;
	}

	public void setUseColumnLabelAsName(boolean useColumnLabelAsName) {
		this.useColumnLabelAsName = useColumnLabelAsName;
	}

	private boolean useColumnLabelAsName;

	public SqlExecutor(DataSource dataSource, ScriptEngine jsEngine) throws ScriptException {
		this.dataSource = dataSource;
		this.jsEngine = jsEngine;
		jsTypeUtil = new JsTypeUtil(jsEngine);
		this.JSON = new org.siphon.common.js.JSON(jsEngine);

		if (this.dataSource instanceof org.apache.commons.dbcp2.BasicDataSource) {
			BasicDataSource bds = (BasicDataSource) this.dataSource;

			this.driverClass = bds.getDriverClassName();

			if ("org.postgresql.Driver".equals(this.driverClass)) {
				this.postgreSQL = true;
			} else if ("oracle.jdbc.driver.OracleDriver".equals(this.driverClass)) {
				this.oracle = true;
			} else if(this.driverClass.contains("mysql")){
				this.mySql = true;
			}
		}
	}

	public void release() {
		// TODO 关闭所有连接池连接
		logger.info("TODO SqlExecutor.relase()");
	}

	public Connection getConnection() throws SQLException {
		return getConnection(false);
	}

	public Connection getConnection(boolean beginTransaction) throws SQLException {
		Connection conn = this.dataSource.getConnection();
		if (beginTransaction) {
			conn.setAutoCommit(false);
		}
		return conn;
	}

	public Connection beginTransaction() throws SQLException {
		return this.getConnection(true);
	}

	/**
	 * 
	 * @param function isFunction
	 * @throws Exception
	 */
	public void doTransaction(NativeFunction function) throws Exception {
		Connection conn = null;
		try {
			conn = beginTransaction();
			NativeFunction.call(function, "call", function);
			conn.commit();
		} catch (Exception e) {
			try {
				conn.rollback();
			} catch (SQLException e1) {
			}
			throw e;
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	/**
	 * 
	 * @param callProcStmt
	 * @param args isArray
	 * @return
	 * @throws SqlExecutorException
	 */
	public boolean call(String callProcStmt, NativeArray args) throws SqlExecutorException {
		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			return call(conn, callProcStmt, args);
		} catch (SQLException ex) {
			throw new SqlExecutorException(
					"error occurs when call " + callProcStmt + " with args : " + JSON.tryStringify(args), ex);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	// 执行存储过程
	/***
	 * 
	 * @param connection
	 * @param callProcStmt pkg.proc(?, ?, ?)
	 * @param args [arg1, arg2, {OUTCURSOR, arg3}]
	 * @return success or not
	 * @throws SqlExecutorException 
	 */
	public boolean call(Connection connection, String callProcStmt, NativeArray args) throws SqlExecutorException {
		if (connection == null) {
			return this.call(callProcStmt, args);
		}

		long start = System.currentTimeMillis();

		CallableStatement proc = null;
		boolean errorOccu = false;
		try {
			// if(logger.isDebugEnabled()) logger.debug("execute procedure " +
			// callProcStmt + " with args: " + JSON.tryStringify(args));

			proc = connection.prepareCall(String.format("{call %s}", callProcStmt));
			NativeArray nargs = args;
			setArgs(proc, nargs);
			boolean result = proc.execute();
			for (int i = 0; i < JsTypeUtil.getArrayLength(nargs); i++) {
				Object oarg = args.get(i);
				if (oarg instanceof ScriptObjectMirror) {
					ScriptObjectMirror arg = (ScriptObjectMirror) oarg;
					if (arg.containsKey("OUTCURSOR")) {
						Object oarr = arg.get("OUTCURSOR");
						if (oarr instanceof ScriptObjectMirror) {
							ScriptObjectMirror outArr = (ScriptObjectMirror) oarr;
							ResultSet rs = (ResultSet) proc.getObject(i + 1);
							ScriptObjectMirror rsArry = rsToDataTable(rs);
							rs.close();
							Object[] ids = rsArry.keySet().toArray();
							for (int j = 0; j < ids.length; j++) {
								outArr.put((String) ids[j], rsArry.get(ids[j]));
							}
						}
					} else if (arg.containsKey("OUT")) {
						int type = (int) arg.get("JDBC_TYPE");
						Object output = translateOutputParameterValue(type, proc, i + 1);
						arg.put("result", output);
					}
				}
			}
			return result;

		} catch (SQLException | UnsupportedDataTypeException | ScriptException | NoSuchMethodException e) {
			errorOccu = true;
			throw new SqlExecutorException("error occurs when execute " + callProcStmt + " with args : "
					+ JSON.tryStringify(args), e);
		} finally {
			long exhaust = System.currentTimeMillis() - start;
			if (exhaust > 30000) {
				logger.warn(String.format("%s with args:%s exhaust %s", callProcStmt, args, exhaust));
			}
			DbConnectionUtil.close(proc);
		}
	}

	public int execute(String sql, NativeArray args) throws SqlExecutorException {
		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			return execute(conn, sql, args);
		} catch (SQLException e) {
			throw new SqlExecutorException("error occurs when execute " + sql + " with args : " + JSON.tryStringify(args), e);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	public int execute(Connection connection, String sql, NativeArray args) throws SqlExecutorException {
		if (connection == null) {
			return this.execute(sql, args);
		}

		long start = System.currentTimeMillis();

		PreparedStatement ps = null;
		boolean errorOccu = false;
		try {
			// logger.debug("execute update " + sql + " with args: " +
			// JSON.tryStringify(args));

			ps = connection.prepareStatement(sql);
			setArgs(ps, args);
			return ps.executeUpdate();

		} catch (SQLException | UnsupportedDataTypeException | NoSuchMethodException | ScriptException e) {
			errorOccu = true;
			throw new SqlExecutorException("error occurs when execute " + sql + " with args : " + JSON.tryStringify(args), e);
		} finally {
			DbConnectionUtil.close(ps);

			long exhaust = System.currentTimeMillis() - start;
			if (exhaust > 30000) {
				logger.warn(String.format("%s with args:%s exhaust %s", sql, args, exhaust));
			}
		}
	}

	public Object query(String sql, NativeArray args, boolean returnSealed) throws SqlExecutorException {

		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			return query(conn, sql, args, returnSealed);
		} catch (SQLException ex) {
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), ex);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	/***
	 * 返回 {columns : [{name : , type : }, ...], rows : [{fieldName : value, fieldName : value, ...}])	
	 * @param connection
	 * @param sql
	 * @param args
	 * @return
	 * @throws SqlExecutorException 
	 */
	public Object query(Connection connection, String sql, NativeArray args, boolean returnSealed) throws SqlExecutorException {
		if (connection == null) {
			return this.query(sql, args, returnSealed);
		}

		long start = System.currentTimeMillis();

		PreparedStatement ps = null;
		ResultSet rs = null;
		boolean errorOccu = false;
		try {
			// logger.debug("execute query " + sql + " with args: " +
			// JSON.tryStringify(args));

			ps = connection.prepareStatement(sql);
			setArgs(ps, args);
			rs = ps.executeQuery();

			ScriptObjectMirror arr = rsToDataTable(rs);
			return  returnSealed ? jsTypeUtil.getSealed(arr) : arr;	// JSON.stringify(arr)
		} catch (SQLException | UnsupportedDataTypeException | ScriptException | NoSuchMethodException e) {
			errorOccu = true;
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), e);
		} finally {
			long exhaust = System.currentTimeMillis() - start;
			if (exhaust > 30000) {
				logger.warn(String.format("%s with args:%s exhaust %s", sql, args, exhaust));
			}
			DbConnectionUtil.close(rs);
			DbConnectionUtil.close(ps);
		}
	}

	public Object pageQuery(Connection connection, String sql, int start, int limit, NativeArray args)
			throws SqlExecutorException {
		if(limit == -1){
			return this.query(connection, sql, args, true);
		}

		if (connection == null) {
			return this.pageQuery(sql, start, limit, args);
		}

		String countSql = wrapTotalCount(sql);
		Object totalCount = queryScalar(connection, countSql, args);

		String pageSql = wrapPageSql(sql, start, limit);
		ScriptObjectMirror result = (ScriptObjectMirror) this.query(connection, pageSql, args, false);
		result.put("total", totalCount);
		result.put("start", start);

		return jsTypeUtil.getSealed(result);
	}

	public Object pageQuery(String sql, int start, int limit, NativeArray args) throws SqlExecutorException {

		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			return pageQuery(conn, sql, start, limit, args);
		} catch (SQLException ex) {
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), ex);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	final static String PAGE_SQL = "SELECT /*+ FIRST_ROWS */ *" + "  FROM (SELECT A.*, ROWNUM RN" + " FROM (%s) A"
			+ " WHERE ROWNUM <= %s)" + " WHERE RN > %s";

	protected String wrapPageSql(String sql, int start, int limit) {

		if (this.isOracle()) {
			return String.format(PAGE_SQL, sql, start + limit, start);
		} else {
			return sql + " limit " + limit + " offset " + start;
		}
	}

	public Object queryScalar(String sql, NativeArray args) throws SqlExecutorException {
		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			return queryScalar(conn, sql, args);
		} catch (SQLException ex) {
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), ex);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	public Object queryScalar(Connection connection, String sql, NativeArray args) throws SqlExecutorException {
		long start = System.currentTimeMillis();

		PreparedStatement ps = null;
		ResultSet rs = null;
		boolean errorOccu = false;
		try {
			// logger.debug("execute query " + sql + " with args: " +
			// JSON.tryStringify(args));

			ps = connection.prepareStatement(sql);
			setArgs(ps, args);
			rs = ps.executeQuery();

			if (rs.next()) {
				return rs.getObject(1);
			} else {
				return null;
			}

		} catch (SQLException | UnsupportedDataTypeException | NoSuchMethodException | ScriptException e) {
			errorOccu = true;
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), e);
		} finally {
			long exhaust = System.currentTimeMillis() - start;
			if (exhaust > 30000) {
				logger.warn(String.format("%s with args:%s exhaust %s", sql, args, exhaust));
			}
			DbConnectionUtil.close(rs);
			DbConnectionUtil.close(ps);
		}
	}

	protected String wrapTotalCount(String sql) {
		return "SELECT COUNT(*) cnt FROM (" + sql + ") t";
	}

	/**
	 * 
	 * @param sql
	 * @param args isArray
	 * @param traveler isFunction
	 * @throws SqlExecutorException
	 */
	public void travel(String sql, NativeArray args, ScriptFunction traveler) throws SqlExecutorException {
		Connection conn = null;
		try {
			conn = dataSource.getConnection();
			travel(conn, sql, args, traveler);
		} catch (SQLException ex) {
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), ex);
		} finally {
			DbConnectionUtil.close(conn, false);
		}
	}

	/***
	 * 游标方式操作结果集
	 * @param connection
	 * @param sql
	 * @param args
	 * @param travele 形如 function(columns, row) 的接收函数, return true 表示继续, return false 表示终止游标
	 * @return
	 * @throws SqlExecutorException 
	 */
	public void travel(Connection connection, String sql, NativeArray args, ScriptFunction traveler)
			throws SqlExecutorException {
		if (connection == null) {
			this.travel(sql, args, traveler);
			return;
		}

		long start = System.currentTimeMillis();

		PreparedStatement ps = null;
		ResultSet rs = null;
		boolean errorOccu = false;
		try {
			// logger.debug("execute travel " + sql + " with args: " +
			// JSON.tryStringify(args));

			ps = connection.prepareStatement(sql);
			setArgs(ps, args);
			rs = ps.executeQuery();
			ResultSetMetaData rsm = rs.getMetaData();
			ScriptObjectMirror columns = columnListToNativeArray(rsm);
			while (rs.next()) {
				ScriptObjectMirror item = jsTypeUtil.newObject();
				for (int i = 1; i <= rsm.getColumnCount(); i++) {
					String cname = this.useColumnLabelAsName ? rsm.getColumnLabel(i): rsm.getColumnName(i);
					String label = convertColumnName(cname);
					item.put(cname, fieldValueToNativeObject(rsm.getColumnType(i), rs, cname));
				}
				Object result = NativeFunction.call(traveler, traveler, item.to(ScriptObject.class), columns); // traveler.callMember("call", traveler, item, columns);
				if (JsTypeUtil.isTrue(result)) {
					break;
				}
			}
		} catch (SQLException | UnsupportedDataTypeException | ScriptException | NoSuchMethodException e) {
			errorOccu = true;
			throw new SqlExecutorException("error occurs when query " + sql + " with args : " + JSON.tryStringify(args), e);
		} finally {
			long exhaust = System.currentTimeMillis() - start;
			if (exhaust > 30000) {
				logger.warn(String.format("%s with args:%s exhaust %s", sql, args, exhaust));
			}
			DbConnectionUtil.close(rs);
			DbConnectionUtil.close(ps);
		}
	}

	private ScriptObjectMirror rsToDataTable(ResultSet rs) throws SQLException, SqlExecutorException, ScriptException {
		ResultSetMetaData rsm = rs.getMetaData();

		ScriptObjectMirror result = jsTypeUtil.newDataTable();
		int c = 0;
		result.put("columns", columnListToNativeArray(rsm));

		ScriptObjectMirror arr = jsTypeUtil.newArray();
		NativeArray narr = arr.to(NativeArray.class);
		while (rs.next()) {
			ScriptObjectMirror item = jsTypeUtil.newObject();
			for (int i = 1; i <= rsm.getColumnCount(); i++) {
				String cname = this.useColumnLabelAsName ? rsm.getColumnLabel(i): rsm.getColumnName(i);
				String label = convertColumnName(cname);
				item.put(label, fieldValueToNativeObject(rsm.getColumnType(i), rs, cname));
			}
			//NativeArray.pushObject(narr, item.to(ScriptObject.class));
			arr.callMember("push", item);
		}
		result.put("rows", arr);
		return result;  // JSON.stringify(result)
	}
	
	String convertColumnName(String columnName) {
		switch(this.columnNameCase){
		case 0: return columnName.toLowerCase(); 
		case 2: return columnName.toUpperCase();
		}
		return columnName;
	}

	private ScriptObjectMirror columnListToNativeArray(ResultSetMetaData rsm) throws SQLException, ScriptException {
		ScriptObjectMirror arr = jsTypeUtil.newArray();
		NativeArray narr = arr.to(NativeArray.class);
		// JSON.stringify(arr)
		for (int i = 1; i <= rsm.getColumnCount(); i++) {
			ScriptObjectMirror obj = jsTypeUtil.newObject();
			String cname = this.useColumnLabelAsName ? rsm.getColumnLabel(i): rsm.getColumnName(i);
			String label = convertColumnName(cname);
			obj.put("name", label);
			obj.put("type", translateTypeName(rsm.getColumnType(i), rsm.getColumnTypeName(i)));
			// NativeArray.pushObject(narr, obj.to(ScriptObject.class));
			arr.callMember("push", obj);
		}
		return arr;
	}

	private String translateTypeName(int columnType, String columnTypeName) {
		switch (columnType) {
		case Types.VARCHAR:
		case Types.CHAR:
		case Types.NCHAR:
		case Types.NVARCHAR:
		case Types.LONGVARCHAR:
		case Types.LONGNVARCHAR:
			return "STRING";

		case Types.INTEGER:
		case Types.SMALLINT:
			return "INT";
		case Types.BIGINT:
			return "LONG";
		case Types.FLOAT:
			return "FLOAT";
		case Types.REAL:
		case Types.DOUBLE:
			return "DOUBLE";
		case Types.NUMERIC:
		case Types.DECIMAL:
			return "DECIMAL";

		case Types.DATE:
		case Types.TIME:
		case Types.TIMESTAMP:
		case Types.TIME_WITH_TIMEZONE:
			return "DATE";
			
		case Types.ROWID:
			return "ROWID";

		case Types.BLOB:
			return "BINARY"; // return "BLOB";

		case Types.CLOB:
			return "STRING"; // return "CLOB";

		case Types.VARBINARY:
		case Types.LONGVARBINARY:
			return "BINARY";

		case Types.BOOLEAN:
			return "BOOLEAN";
			
		case Types.ARRAY:
			return "ARRAY";

		case Types.OTHER:
			return columnTypeName.toUpperCase();
			
		default:
			return "UNKNOWN";
		}
	}

	private Object fieldValueToNativeObject(int columnType, ResultSet rs, String columnName) throws SQLException,
			SqlExecutorException, ScriptException {

		// System.out.println("get column " + columnName + " type " +
		// columnType);
		// longraw 可以用 getObject() 提取，得到 byte[], 但是
		// ojdbc6 没有处理好 longraw，如果一张表同时有 BLOB 和
		// LONGRAW，使用 getObject 取 LongRaw，则会关闭某个特别的流，导致
		// BLOB 取出时抛出流已关闭的异常，因此，单独对 LONGRAW使用Binary读取
		// 如果 LongRaw 和 BLOB 同时存在，按 t.longraw, t.blob 正常, 按 t.blob,
		// t.longraw 查询，会出错

		// if (columnName.equals("datefld")) {
		// System.out.println();
		// }

		Object obj = rs.getObject(columnName);
		if (obj == null) {
			return null;
		} else {
			switch (columnType) {
			case Types.DATE:
				obj = rs.getDate(columnName); break;				
			case Types.TIME:
				obj = rs.getTime(columnName); break;
			case Types.TIMESTAMP:
				obj = rs.getTimestamp(columnName); break;
			case Types.TIMESTAMP_WITH_TIMEZONE:
				obj = rs.getTimestamp(columnName); break;
				// PG 的 TIMESTAMP WITH TIMEZONE 不会真正存储时区信息
				// 同时 JDBC 也没有适当的方法从数据库提取时区信息
				// 现在虽然靠 joda 打通了时区，遗憾的是数据库和 jdbc 支持都不好
			}

		}

		return jdbcReturnTypeToJsObject(obj);
	}

	private void setArgs(PreparedStatement ps, NativeArray args) throws SqlExecutorException, SQLException,
			UnsupportedDataTypeException, NoSuchMethodException, ScriptException {
		for (int i = 0; i < JsTypeUtil.getArrayLength(args); i++) {
			setArg(ps, i, args.get(i));
		}

	}

	void setArg(PreparedStatement ps, int index, Object arg)
			throws SQLException, SqlExecutorException, UnsupportedDataTypeException, NoSuchMethodException, ScriptException {
		boolean output = false;
		int outputParameterType = 0;
		CallableStatement cs = null;
		if (ps instanceof CallableStatement) {
			cs = (CallableStatement) ps;
			if (arg instanceof ScriptObjectMirror && ((ScriptObjectMirror) arg).containsKey("OUT")) {
				ScriptObjectMirror jsarg = ((ScriptObjectMirror) arg);
				outputParameterType = (int) jsarg.get("JDBC_TYPE");
				arg = jsarg.get("VALUE");
				output = true;
			}
		}
		if (output) {
			cs.registerOutParameter(index + 1, outputParameterType);
			if (JsTypeUtil.isNull(arg) || (arg instanceof Double && Double.isNaN((Double) arg))) {
				return;
			}
		}
		
		if (JsTypeUtil.isNull(arg)) {
			ps.setObject(index + 1, null);
		} else if (arg instanceof CharSequence) {
			ps.setString(index + 1, arg.toString());
		} else if( arg instanceof NativeString){
			ps.setString(index + 1, arg.toString());
		} else if (arg instanceof Double) { // js number always be
											// Double，but if its came from
											// JSON.parse， since JSON is jdk
											// given global object, it will
											// make Integer and ...
			double d = ((Double) arg).doubleValue();
			if (d == (int) d) {
				ps.setInt(index + 1, (int) d);
			} else if (d == (long) d) {
				ps.setLong(index + 1, (long) d);
			} else {
				ps.setBigDecimal(index + 1, new BigDecimal(d));
			}
		} else if (arg instanceof Integer) {
			ps.setInt(index + 1, (Integer) arg);
		} else if (arg instanceof Long) {
			ps.setLong(index + 1, (Long) arg);
		} else if (arg instanceof Float) {
			ps.setFloat(index + 1, (Float) arg);
		} else if (jsTypeUtil.isNativeDate(arg)) {
			ps.setTimestamp(index + 1, parseDate(arg));
		} else if(arg instanceof ZonedDateTime){
			ZonedDateTime zdt = (ZonedDateTime) arg;
			ps.setTimestamp(index + 1, new Timestamp(zdt.toInstant().toEpochMilli()));
		} else if (arg instanceof Boolean) {
			ps.setBoolean(index + 1, JsTypeUtil.isTrue(arg));
		} else if (arg instanceof ScriptObjectMirror || arg instanceof ScriptObject) {
			String attr = null;
			Object value = null;
			if(arg instanceof ScriptObjectMirror){
				ScriptObjectMirror atm = (ScriptObjectMirror) arg;
				if(atm.keySet().contains("toJavaObject")){
					Object obj = atm.callMember("toJavaObject");
					setArg(ps, index, obj);
					return;
				}

				attr = atm.keySet().iterator().next();
				value = atm.get(attr);
			} else {
				ScriptObject obj = (ScriptObject) arg;
				if(obj.containsKey("toJavaObject")){
					ScriptObjectMirror atm = (ScriptObjectMirror) jsTypeUtil.toScriptObjectMirror(obj);
					Object result = atm.callMember("toJavaObject");
					setArg(ps, index, result);
					return;
				}
				String[] arr = obj.getOwnKeys(false);
				if(arr.length == 0){
					throw new SqlExecutorException("js argument " + arg + " (" + arg.getClass() + ") at " + index +  " is an empty js object");
				}
				attr = arr[0];
				value = obj.get(attr);
			}

			if ("STRING".equals(attr)) {
				ps.setString(index + 1, String.valueOf(value));
			} else if ("DECIMAL".equals(attr)) {
				if (value instanceof Double) {
					ps.setBigDecimal(index + 1, new BigDecimal((Double) value));
				} else {
					ps.setBigDecimal(index + 1, new BigDecimal(value + ""));
				}
			} else if ("INT".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						ps.setObject(index + 1, null);
					} else {
						ps.setInt(index + 1, ((Double) value).intValue());
					}
				} else {
					ps.setInt(index + 1, new Integer(value + ""));
				}
			} else if ("BOOLEAN".equals(attr)) {
				ps.setBoolean(index + 1, JsTypeUtil.isTrue(arg));
			} else if ("DOUBLE".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						ps.setObject(index + 1, null);
					} else {
						ps.setDouble(index + 1, (double) value);
					}
				} else {
					ps.setDouble(index + 1, new Double(value + ""));
				}
			} else if ("FLOAT".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						ps.setObject(index + 1, null);
					} else {
						ps.setFloat(index + 1, (float) (double) value);
					}
				} else {
					ps.setFloat(index + 1, new Float(value + ""));
				}
			} else if ("DATE".equals(attr)) {
				ps.setTimestamp(index + 1, parseDate(value));
			} else if ("TIME".equals(attr)) {
				ps.setTimestamp(index + 1, parseTime(value));
			} else if ("BINARY".equals(attr)) {
				ps.setBytes(index + 1, parseBinary(value));
			} else if ("CLOB".equals(attr)) {
				Clob clob = ps.getConnection().createClob();
				clob.setString(1, String.valueOf(value));
				ps.setClob(index + 1, clob);
			} else if ("LONG".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						ps.setObject(index + 1, null);
					} else {
						ps.setLong(index + 1, ((Double) value).longValue());
					}
				} else {
					ps.setLong(index + 1, new Long(value + ""));
				}
			} else if ("OUTCURSOR".equals(attr)) {
				// cs.registerOutParameter(i+1, OracleTypes.CURSOR);
				cs.registerOutParameter(index + 1, -10);
			} else if ("ARRAY".equals(attr)) {
				if(value instanceof NativeArray){
					ps.setArray(index + 1, createSqlArray(ps.getConnection(), (NativeArray) value));
				}  else {
					setArg(ps, index, value);	// value is {ARRAY : ['int', e1, e2, ...]}
				}
				// ps.setObject(i+1, createSqlArray(ps.getConnection(),
				// (NativeArray) value));
			} else if ("JSON".equals(attr) || "JSONB".equals(attr)){
				PGobject obj = new PGobject();
				obj.setType(attr.toLowerCase());
				obj.setValue(this.JSON.tryStringify(value));
				ps.setObject(index + 1, obj);
			} else if("UUID".equals(attr)){
				if(value != null){
					ps.setObject(index + 1, UUID.fromString(value.toString()));
				} else {
					ps.setObject(index + 1, null);
				}
			} else {
				if(this.defaultJsonDbType != null){
					PGobject obj = new PGobject();
					obj.setType(this.defaultJsonDbType);
					obj.setValue(this.JSON.tryStringify(arg));
					ps.setObject(index + 1, obj);
				} else {
					throw new SqlExecutorException("js argument " + arg + " (" + arg.getClass() + ") not support");
				}
			}
		} else {
			throw new SqlExecutorException("js argument " + arg + " (" + arg.getClass() + ") at " + index +  " not support");
		}
	}
	
	private Object convertJsObjToJavaType(Object arg) throws UnsupportedDataTypeException, SqlExecutorException {
		if (JsTypeUtil.isNull(arg)) {
			return null;
		} else if (arg instanceof ScriptObjectMirror) {
			ScriptObjectMirror atm = (ScriptObjectMirror) arg;

			String attr = (String) atm.keySet().iterator().next();
			Object value = atm.get(attr);

			if ("STRING".equals(attr)) {
				return String.valueOf(value);
			} else if ("DECIMAL".equals(attr)) {
				if (value instanceof Double) {
					return new BigDecimal((Double) value);
				} else {
					return new BigDecimal(value + "");
				}
			} else if ("INT".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						return null;
					} else {
						return ((Double) value).intValue();
					}
				} else {
					return new Integer(value + "");
				}
			} else if ("BOOLEAN".equals(attr)) {
				return JsTypeUtil.isTrue(arg);
			} else if ("DOUBLE".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						return null;
					} else {
						return (double) value;
					}
				} else {
					return new Double(value + "");
				}
			} else if ("FLOAT".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						return null;
					} else {
						return (float) (double) value;
					}
				} else {
					return new Float(value + "");
				}
			} else if ("DATE".equals(attr)) {
				return parseDate(value);
			} else if ("TIME".equals(attr)) {
				return parseTime(value);
			} else if ("BINARY".equals(attr)) {
				return parseBinary(value);
			} else if ("CLOB".equals(attr)) {
				return String.valueOf(value);
			} else if ("LONG".equals(attr)) {
				if (value instanceof Double) {
					if (((Double) value).isNaN()) {
						return null;
					} else {
						return ((Double) value).longValue();
					}
				} else {
					return new Long(value + "");
				}
				// } else if ("ARRAY".equals(attr)){ // TODO 不支持数组中还有数组
				// NativeArray arr = (NativeArray) value;
			} else {
				throw new UnsupportedDataTypeException("js object " + arg + " (" + arg.getClass() + ") not support");
			}
		} else if (arg instanceof String) {
			return (String) arg;
		} else if (arg instanceof ConsString) {
			return arg.toString();
		} else if (arg instanceof Double) { // js number always be Double，but if
											// its came from JSON.parse， since
											// JSON is jdk given global object,
											// it will make Integer and ...
			double d = ((Double) arg).doubleValue();
			if (d == (int) d) {
				return (int) d;
			} else if (d == (long) d) {
				return (long) d;
			} else {
				return new BigDecimal(d);
			}
		} else if (arg instanceof Integer) {
			return arg;
		} else if (arg instanceof Long) {
			return arg;
		} else if (arg instanceof Float) {
			return arg;
		} else if (jsTypeUtil.isNativeDate(arg)) {
			return parseDate(arg);
		} else if (arg instanceof Boolean) {
			return parseBinary(arg);
		} else {
			throw new UnsupportedDataTypeException("js object " + arg + " (" + arg.getClass() + ") not support");
		}
	}

	private Array createSqlArray(Connection connection, NativeArray arr) throws SQLException, UnsupportedDataTypeException,
			SqlExecutorException {
		Object[] objs = new Object[JsTypeUtil.getArrayLength(arr)];
		for (int i = 0; i < JsTypeUtil.getArrayLength(arr); i++) {
			objs[i] = arr.get(i);
		}
		String type = (String) objs[0];

		objs = Arrays.copyOfRange(objs, 1, objs.length);
		for (int i = 0; i < objs.length; i++) {
			objs[i] = convertJsObjToJavaType(objs[i]);
		}
		Array result = connection.createArrayOf(type, objs);
		return result;
	}

	private Object translateOutputParameterValue(int sqlType, CallableStatement cs, int index) throws SQLException,
			SqlExecutorException, ScriptException {
		Object obj = cs.getObject(index);
		if (obj == null) {
			return null;
		} else {
			switch (sqlType) {
			case Types.DATE:
				obj = cs.getDate(index);
			case Types.TIME:
				obj = cs.getTime(index);
			case Types.TIMESTAMP:
				obj = cs.getTimestamp(index);
			}

		}

		Object result = jdbcReturnTypeToJsObject(obj);
		if (result instanceof String) {
			return ((String) result).trim();
		} else {
			return result;
		}
	}

	private Object jdbcReturnTypeToJsObject(Object obj) throws SQLException, SqlExecutorException, ScriptException {
		if (obj == null) {
			return null;
		} else if (obj instanceof String) {
			return obj;
		} else if (obj instanceof BigDecimal) {
			return ((BigDecimal) obj).doubleValue();
		} else if (obj instanceof Integer) {
			return ((Integer) obj).doubleValue();
		} else if (obj instanceof Float) {
			return ((Float) obj).doubleValue();
		} else if (obj instanceof Double) {
			return ((Double) obj).doubleValue();
		} else if (obj instanceof Byte) {
			return ((Byte) obj).doubleValue();
		} else if (obj instanceof Long) {
			return ((Long) obj).doubleValue();
		} else if (obj instanceof Timestamp) {
			Timestamp tstmp = ((java.sql.Timestamp) obj);
			return jsTypeUtil.toNativeDate(tstmp.getTime());
		} else if (obj instanceof java.sql.Date) {
			return jsTypeUtil.toNativeDate(((java.sql.Date) obj).getTime());
		} else if (obj instanceof Time) {
			return jsTypeUtil.toNativeDate(((java.sql.Time) obj).getTime());
		} else if (obj instanceof RowId) {
			return jsTypeUtil.bytesToNativeArray(((RowId) obj).getBytes());
		} else if (obj instanceof Boolean) {
			return ((Boolean) obj).booleanValue();
		} else if (obj instanceof byte[]) {
			// return bytesToNativeArray((byte[]) obj);
			return (byte[]) obj;
		} else if (obj instanceof Clob) {
			Reader strm = ((Clob) obj).getCharacterStream();
			StringBuffer sb = new StringBuffer();
			char[] buff = new char[1024];
			int count = 0;
			try {
				while ((count = strm.read(buff)) > 0) {
					sb.append(buff, 0, count);
				}
			} catch (IOException e) {
				throw new SqlExecutorException("", e);
			} finally {
				try {
					strm.close();
				} catch (IOException e) {
				}
			}
			return sb.toString();
		} else if (obj instanceof Blob) {
			InputStream in = ((Blob) obj).getBinaryStream();
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			try {
				byte[] buff1 = new byte[1024];
				for (int i = 0; (i = in.read(buff1)) > 0;) {
					out.write(buff1, 0, i);
				}
				out.flush();
				in.close();

				byte[] bytes = out.toByteArray();
				out.close();

				// return bytesToNativeArray(bytes);
				return bytes;
			} catch (IOException e) {
				throw new SqlExecutorException("got an error when read blob", e);
			}
		} else if (obj instanceof Array) {
			ScriptObjectMirror result = jsTypeUtil.newArray();
			NativeArray narr = result.to(NativeArray.class);
			Object arr = ((Array) obj).getArray();
			for (int i = 0; i < java.lang.reflect.Array.getLength(arr); i++) {
				Object v = jdbcReturnTypeToJsObject(java.lang.reflect.Array.get(arr, i));
				// NativeArray.push(narr, v);
				result.callMember("push", v);
			}
			return result;
		} else if(obj instanceof UUID){
			return obj.toString();
		} else if(obj instanceof PGobject){
			PGobject pgObj = (PGobject) obj;
			if("jsonb".equals(pgObj.getType()) || "json".equals(pgObj.getType())){
				try {
					return JSON.parse((String)pgObj.getValue());
				} catch (Exception e) {
					throw new SqlExecutorException("cannot parse json " + obj + "  " + obj.getClass());
				}
			} else {
				throw new SqlExecutorException("unknown object type " + obj + "  " + obj.getClass());
			}
		} else {
			throw new SqlExecutorException("unknown object type " + obj + "  " + obj.getClass());
		}
	}

	// oracle 字符串转义
	private static String fixOralceString(String str) {
		return str;
		// StringBuffer sb =null;
		//
		// boolean needTrans = false;
		// for (int i = 0; i < str.length() - 1; i++) {
		// if (str.charAt(i) == '&' && str.charAt(i + 1) != '&') {
		// needTrans = true;
		// break;
		// }
		// }
		// if (needTrans) {
		// sb = new StringBuffer();
		// for (int i = 0; i < str.length() - 1; i++) {
		// char c = str.charAt(i);
		// if (c == '&') {
		// if(str.charAt(i + 1) != '&'){
		// sb.append('&').append('&');
		// } else {
		// sb.append('&').append('&');
		// i++;
		// }
		// } else {
		// sb.append(c);
		// }
		// }
		// sb.append(str.charAt(str.length() - 1));
		// return sb.toString();
		// } else {
		// return str;
		// }
	}

	private byte[] parseBinary(Object value) throws SqlExecutorException {
		if (JsTypeUtil.isNull(value)) {
			return null;
		}
		if (value instanceof byte[]) {
			return (byte[]) value;
		} else if (value instanceof Byte[]) {
			return ArrayUtils.toPrimitive((Byte[]) value);
		}
		if (value instanceof ScriptObjectMirror && ((ScriptObjectMirror) value).isArray()) {
			value = ((ScriptObjectMirror) value).to(NativeArray.class);
		}
		if(value instanceof NativeArray){
			NativeArray arr = (NativeArray) value;
			byte[] r = new byte[JsTypeUtil.getArrayLength(arr)];
			for (int i = 0; i < JsTypeUtil.getArrayLength(arr); i++) {
				if (arr.get(i) instanceof Byte) {
					r[i] = (Byte) arr.get(i);
				} else if (arr.get(i) instanceof Double) {
					r[i] = ((Double) arr.get(i)).byteValue();
				} else if (arr.get(i) instanceof Integer) {
					r[i] = ((Integer) arr.get(i)).byteValue();
				}
			}
			return r;
		} else if (value instanceof String) {
			Decoder decoder = Base64.getDecoder();
			try {
				return decoder.decode((String) value);
			} catch (Exception e) {
				throw new SqlExecutorException("cannot parse base64 binary data " + value, e);
			}
		} else {
			throw new SqlExecutorException("unkown binary data " + value + " " + value.getClass());
		}
	}

	private SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

	private java.sql.Timestamp parseDate(Object value) throws SqlExecutorException {
		Long d;
		try {
			d = JsTypeUtil.parseDate(value);
		} catch (UnsupportedConversionException e) {
			throw new SqlExecutorException("parseDate failed " + value, e);
		}
		if(d == null) return null;
		return new java.sql.Timestamp(d.longValue());
	}
	
	private Timestamp dateToTimeStamp(java.util.Date date){
		if(this.isPostgreSQL()){
			return new java.sql.Timestamp(date.getTime() + date.getTimezoneOffset() * 60000);
		} else {
			return new java.sql.Timestamp(date.getTime());
		}
	}
	

	private SimpleDateFormat sdfTime = new SimpleDateFormat("HH:mm:ss");

	private java.sql.Timestamp parseTime(Object value) throws SqlExecutorException {
		Long d;
		try {
			d = JsTypeUtil.parseTime(value);
		} catch (UnsupportedConversionException e) {
			throw new SqlExecutorException("parseDate failed " + value, e);
		}
		if(d == null) return null;
		return new java.sql.Timestamp(d.longValue());
	}

	private java.sql.Timestamp nativeDateToTimeStamp(NativeDate value) {
		try {
			long time = JsTypeUtil.getTime(value);
			return dateToTimeStamp(new java.util.Date(time));
		} catch (Exception e) {
			return null;
		}
	}
	
	private java.sql.Timestamp nativeDateToTimeStamp(ScriptObjectMirror value) {
		try {
			long time = JsTypeUtil.getTime(value);
			return dateToTimeStamp(new java.util.Date(time));
		} catch (Exception e) {
			return null;
		}
	}


	public boolean isOracle() {
		return oracle;
	}

	public boolean isPostgreSQL() {
		return postgreSQL;
	}

	public boolean isMySql() {
		return mySql;
	}

	public String getDriverClass() {
		return driverClass;
	}

	public String getDefaultJsonDbType() {
		return defaultJsonDbType;
	}

	public void setDefaultJsonDbType(String defaultJsonDbType) {
		if(defaultJsonDbType != null){
			this.defaultJsonDbType = defaultJsonDbType.toLowerCase();
		} else {
			this.defaultJsonDbType = defaultJsonDbType;
		}
	}

}
