package test.js;

import java.io.File;
import java.io.IOException;

import org.apache.commons.io.FileUtils;
import org.siphon.d2js.EmbedSqlTranslator;
import org.siphon.jssp.JsspTranslator;

public class TestTranslation {

	public static void main(String[] args) throws IOException, Exception {
//		EmbedSqlTranslator t =  new EmbedSqlTranslator();
//		System.out.println(t.translate(FileUtils.readFileToString(new File("test/translation_test/t4.d2js"))));
		//System.out.println(t.translate(FileUtils.readFileToString(new File("test/translation_test/login.d2js"))));
		
//		JsspTranslator jsspTranslator = new JsspTranslator(FileUtils.readFileToString(new File("test/translation_test/test.jssp")));
//		String s = jsspTranslator.translate();
//		System.out.println(s);
//		EmbedSqlTranslator t =  new EmbedSqlTranslator();
//		System.out.println(t.translate(s));
		
		EmbedSqlTranslator t =  new EmbedSqlTranslator();
		System.out.println(t.translate(FileUtils.readFileToString(new File("test/translation_test/t5.d2js"))));
	}
	
}
