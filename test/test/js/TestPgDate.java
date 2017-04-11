package test.js;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Properties;

import org.apache.commons.dbcp2.BasicDataSource;
import org.postgresql.Driver;
import org.postgresql.jdbc4.Jdbc4Connection;

public class TestPgDate {
	public static void main(String[] args) throws SQLException {
		BasicDataSource bds = new BasicDataSource();
		bds.setDriverClassName("org.postgresql.Driver");
	
		bds.setUrl("jdbc:postgresql://192.168.8.250:5432/botao");
	
		bds.setUsername("botao");
		bds.setPassword("pass4botao");
		
		//Connection conn = bds.getConnection();
		
		Properties props = new Properties();
		props.setProperty("user","botao");
		props.setProperty("password","pass4botao");
		Connection conn = DriverManager.getConnection("jdbc:postgresql://192.168.8.250:5432/botao", props);
		
		org.postgresql.jdbc4.Jdbc4Connection pconn = (Jdbc4Connection) conn;
		
		//conn.createStatement().execute("set time zone 'Asia/Shanghai'");
		conn.createStatement().execute("set time zone 'UTC'");
		
		String sql = "select to_json(?::timestamp) as a, to_json(current_timestamp::timestamp) as b";
		PreparedStatement ps = conn.prepareStatement(sql);
		// Timestamp timestamp = new Timestamp(new Date().getTime());
		// LocalDateTime dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(System.currentTimeMillis()), ZoneId.of("UTC"));
		
		Date date = new Date();
		Instant instant = Instant.ofEpochMilli(date.getTime() + date.getTimezoneOffset() * 60000);
		// LocalDateTime dateTime = LocalDateTime.ofEpochSecond(instant.getEpochSecond(), instant.getNano(), 0);				
		//Timestamp timestamp = Timestamp.valueOf(dateTime);
		
		Timestamp timestamp = Timestamp.from(instant);
		ps.setTimestamp(1, timestamp);
		
		// ps.setDate(1, new java.sql.Date(System.currentTimeMillis()));
		
		ResultSet rs = ps.executeQuery();
		while(rs.next()){
			System.out.println("a " + rs.getString("a") + ", b " + rs.getString("b"));
		}
		
		rs.close();
		ps.close();
		conn.close();
		
	}
}
