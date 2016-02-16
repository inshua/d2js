package test.js;

import java.util.Date;

import org.apache.log4j.PropertyConfigurator;

public class TestJavaDate {
	public static void main(String[] args) {
		PropertyConfigurator.configure("./log4j.properties");

		System.out.println(new Date(1443062211825L + 480*60000).toGMTString());
	}
}
