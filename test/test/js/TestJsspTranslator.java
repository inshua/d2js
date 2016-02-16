package test.js;

import java.io.File;
import java.io.IOException;

import org.apache.commons.io.FileUtils;
import org.siphon.jssp.JsspTranslator;

public class TestJsspTranslator {
	
	public static void main(String[] args) throws IOException {
		String code = new JsspTranslator(FileUtils.readFileToString(new File("test/translation_test/test.jssp"))).translate();
		System.out.println(code);
	}

}
