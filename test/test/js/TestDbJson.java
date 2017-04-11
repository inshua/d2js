package test.js;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import org.apache.commons.dbcp2.BasicDataSource;
import org.postgresql.util.PGobject;

public class TestDbJson {

	public static void main(String[] args) throws SQLException {
		BasicDataSource bds = new BasicDataSource();
		bds.setDriverClassName("org.postgresql.Driver");

		bds.setUrl("jdbc:postgresql://localhost:5432/botao");

		bds.setUsername("postgres");
		bds.setPassword("pass4postgres");
		
		Connection conn = bds.getConnection();
		Statement statement = conn.createStatement();
		ResultSet rs = statement.executeQuery("select * from test_json");
		while(rs.next()){
			Object tag = rs.getObject("tag");			
			System.out.println(tag);
		}
		rs.close();
		statement.close();
		
		PreparedStatement ps = conn.prepareStatement("update test_json set tag = ? where id =1");
		PGobject obj = new PGobject();
		obj.setType("jsonb");
		obj.setValue("{\"name\":\"Mike\"}");
		ps.setObject(1, obj);
		ps.execute();
		
		conn.close();
	}
}
