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
package org.siphon.d2js;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.LineNumberReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Stack;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.commons.io.IOUtils;
import org.apache.commons.io.input.CountingInputStream;
import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.el.parser.ParseException;

public class EmbedSqlTranslator {

	private final static int STATE_CODE = 1;
	private final static int STATE_SQL = 2;
	
	
	private int state = STATE_CODE;
	
	private static class CodePart{
		public String name;
		public List<String> lines = new ArrayList<String>();
		public StringBuffer currentLine = new StringBuffer();
		public boolean atLineHead = true;
		public boolean isFollowSql = false;
		public boolean isInCode = false;		// SQL 块是否属于 code 块
		public boolean isBlank() {
			return StringUtils.join(lines, "").trim().isEmpty() && currentLine.toString().trim().isEmpty();
		}
	}
	
	private Stack<CodePart> sqls = new Stack<CodePart>();
	
	private CodePart code = new CodePart();
	
	/**
	 * code{. .}
	 * sql{. .}
	 * @param code
	 * @return
	 * @throws Exception 
	 */
	public String translate(String code) throws Exception{
		try {
//			Lexer lexer = new Lexer(code);
//			for(Token token = lexer.nextToken(); token.tokenType != Token.TOKEN_EOF; token = lexer.nextToken()){
//				System.out.println(String.format("%s (%s-%s): %s", token.tokenType, token.start, token.length, token.getText()));
//			}
			
			Parser parser = new Parser(new Lexer(code));
			Node node = parser.outter();

			generateCode(node);
			
			return StringUtils.join( this.code.lines, System.lineSeparator()) + System.lineSeparator() + this.code.currentLine;
		} catch(UnexceptedTokenException e){			
			throw new Exception(e.getMessage() + " near " + getLineNear(code, e.getStart()), e);
		} catch (Exception e) {
			//e.printStackTrace();
			throw e;
		}
	}
	
	
	private String getLineNear(String code, int pos) {
		
		DataInputStream inputStream = new DataInputStream(IOUtils.toInputStream(code));
		
		String line = null;
		int lineHead = 0;
		int lineIndex = 0;
		try {
			while(inputStream.available() >= code.length() - pos){
				lineHead = code.length() - inputStream.available();
				line = inputStream.readLine();
				lineIndex ++;
			}
		} catch (IOException e) {
			// e.printStackTrace();
		}
		
		String s = "LN " + lineIndex + ":" + (pos - lineHead + 1) + " " + line;
		
		return s;
	}


	private void generateCode(Node node) throws ParseException {
		switch(state){
		case STATE_CODE :
			switch(node.nodeType){
			case Node.NODE_SQL :
				boolean inCondition = false;
				List<Token> tokens = node.chidlren.get(0).tokens;
				if(!tokens.isEmpty() 
						&& node.chidlren.size() >= 2 
						&& "?".equals(tokens.get(0).getText())
						&& node.chidlren.get(1).nodeType == Node.NODE_BACKET){
					inCondition = true;
					code.currentLine.append("if");
					generateCode(node.chidlren.get(1));
					code.currentLine.append("{");
					node.chidlren.remove(0);
					node.chidlren.remove(0);
				}
				String varname = null;
				if(!node.chidlren.isEmpty() && node.chidlren.get(0).nodeType == Node.NODE_BACKET){
					varname = generateIdentify(node.chidlren.get(0));
					node.chidlren.remove(0);
				} else if(sqls.isEmpty()){
					varname = "sql";		// default name
				}
				CodePart sql = null;
				if(varname != null){
					sql = new CodePart();
					sql.name = varname;
					sqls.push(sql);
					state = STATE_SQL;
					code.currentLine.append("var ").append(varname).append(" = ");
					for(Node c : node.chidlren) generateCode(c);
					sqls.pop();
					state = STATE_CODE;
					appendSqlToCode(sql);
				} else {		// continue sql
					state = STATE_SQL;
					sql = sqls.peek();
					sql.isFollowSql = true;
					sql.isInCode = true;
					for(Node c : node.chidlren) generateCode(c);
					state = STATE_CODE;
					appendSqlToCode(sql);
				}
				if(inCondition){
					code.currentLine.append("}");
				}
				
				break;
			case Node.NODE_ANY:
			case Node.NODE_CODE:
			case Node.NODE_BACKET:
				if(node.chidlren.size() > 0){
					for(Node c : node.chidlren) generateCode(c);
				} else {
					for(Token token : node.tokens){
						if(token.tokenType == Token.TOKEN_NEWLINE){
							code.lines.add(code.currentLine.toString());
							code.currentLine.setLength(0);
							code.atLineHead = true;
						} else {
							CharSequence s = token.getText();
							if(code.atLineHead && !s.toString().trim().isEmpty()){
								code.atLineHead = false;
							}
							code.currentLine.append(s);
						}
					}
				}
			}
			break;
			
		case STATE_SQL :
			switch(node.nodeType){
			case Node.NODE_CODE :
				appendSqlToCode(sqls);
				state = STATE_CODE;
				for(Node c : node.chidlren) generateCode(c);
				state = STATE_SQL;
				break;
			case Node.NODE_SQL :
				if(node.chidlren.size() >= 2 
						&& node.chidlren.get(0).tokens.isEmpty() == false && "?".equals(node.chidlren.get(0).tokens.get(0).getText())
						&& node.chidlren.get(1).nodeType == Node.NODE_BACKET){
					appendSqlToCode(sqls);
					
					code.currentLine.append("if");
					state = STATE_CODE;	// generate code like STATE_CODE;
					generateCode(node.chidlren.get(1));
					code.currentLine.append("{");
					
					node.chidlren.remove(0);
					node.chidlren.remove(0);
					state = STATE_SQL;
					generateCode(node);
					appendSqlToCode(sqls);
					code.currentLine.append("}");
					return;
				}
				String varname = null;
				if(node.chidlren.get(0).nodeType == Node.NODE_BACKET){
					varname = generateIdentify(node.chidlren.get(0));
					node.chidlren.remove(0);
				} else if(sqls.isEmpty()){
					varname = "sql";		// default name
				}
				CodePart sql = null;
				if(varname != null && !varname.equals(sqls.peek().name)){
					sql = new CodePart();
					sql.name = varname;
					sqls.push(sql);
					code.currentLine.append("var ").append(varname).append(" = ");
					for(Node c : node.chidlren) generateCode(c);
					sqls.pop();
					appendSqlToCode(sql);
				} else {
					sql = new CodePart();
					sql.name = sqls.peek().name;
					sql.isFollowSql = true;
					sqls.push(sql);
					for(Node c : node.chidlren) generateCode(c);
					sqls.pop();
					appendSqlToSql(sql);
				}
				break;
			case Node.NODE_ANY :
			case Node.NODE_BACKET:
				if(node.chidlren.size() > 0){
					for(Node c : node.chidlren) generateCode(c);
				} else {
					sql = sqls.peek();
					for(Token token : node.tokens){
						if(token.tokenType == Token.TOKEN_NEWLINE){
							sql.lines.add(sql.currentLine.toString());
							sql.currentLine.setLength(0);
							sql.atLineHead = true;
						} else {
							CharSequence s = token.getText(true);
							if(sql.atLineHead && !s.toString().trim().isEmpty()){
								sql.atLineHead = false;
							}
							sql.currentLine.append(s);
						}
					}
				}
			}
		}
	}

	private void appendSqlToCode(Stack<CodePart> sqls) {
		for(CodePart sql : sqls){
			appendSqlToCode(sql);
			sql.isFollowSql = true;
			sql.isInCode = true;
		}
	}


	private void appendSqlToSql(CodePart sql) {
		CodePart pSql = sqls.peek();
		for(String line : sql.lines){
			pSql.currentLine.append(line);
			pSql.lines.add(pSql.currentLine.toString());
			pSql.currentLine.setLength(0);
		}
		pSql.currentLine.append(sql.currentLine.toString());
	}


	private String generateIdentify(Node node) throws ParseException {
		String id = "";
		for(Node c : node.chidlren){
			if(c.nodeType != Node.NODE_ANY){
				throw new ParseException("in sql{.(id) .}, id must be a identity");
			} else {
				for(Token tk : c.tokens){
					if(tk.tokenType != Token.TOKEN_L_BACKET && tk.tokenType != Token.TOKEN_R_BACKET){
						id += tk.getText();
					}
				}
			}
		}
		return id.trim();
	}


	private void appendSqlToCode(CodePart sql) {
		boolean isFollow = sql.isFollowSql;
		boolean dirty = false;

		for(String line : sql.lines){
				if(line.trim().isEmpty()){
					code.currentLine.append(line);
					code.lines.add(code.currentLine.toString());
					code.currentLine.setLength(0);
				} else {
					if(!isFollow){
						line = line.replaceFirst("^\\s+", "");	// trim left
						code.currentLine.append("\"" + StringEscapeUtils.escapeJava(line) + "\"");
						isFollow = true;
					} else {
						line = line.replaceFirst("^\\s+", " ");
						if(sql.isInCode  && dirty == false){
							code.currentLine.append(sql.name + " += \"").append(StringEscapeUtils.escapeJava(line)).append("\"");
						} else {
							code.currentLine.append("+ \"").append(StringEscapeUtils.escapeJava(line)).append("\"");
						}
					}
					dirty = true;
					code.lines.add(code.currentLine.toString());
					code.currentLine.setLength(0);
				}
		}
		String line = sql.currentLine.toString();
		if(line.trim().isEmpty()){
			if(!isFollow){
				code.currentLine.append("''");
				dirty = true;
			} else {
				code.currentLine.append(line);
			}
//			code.lines.add(code.currentLine.toString());
//			code.currentLine.setLength(0);
		} else {
			if(!isFollow){
				line = line.replaceFirst("^\\s+", "");	// trim left
				code.currentLine.append("\"" + StringEscapeUtils.escapeJava(line) + "\"");
				isFollow = true;
				dirty = true;
			} else {
				if(sql.isInCode && dirty == false){
					code.currentLine.append(sql.name + " += \"").append(StringEscapeUtils.escapeJava(line)).append("\"");
				} else {
					code.currentLine.append("+ \"").append(StringEscapeUtils.escapeJava(line)).append("\"");
				}
				dirty = true;
			}
		}
		if(dirty){
			code.currentLine.append(";");
		}
		sql.currentLine.setLength(0);
		sql.lines.clear();
	}

	public static class Node{
		public List<Token> tokens = new ArrayList<Token>();
		public int nodeType;
		public List<Node> chidlren = new ArrayList<Node>();
		public Node parentNode;
		
		public Node(int nodeType){		// 此种方式初始化没有 tokens
			this.nodeType = nodeType;
		}
		
		public Node(Token token){		// 此种方式只用于初始化 ANY 类型,只有 ANY 类型的有 tokens
			this.nodeType = NODE_ANY;
			this.tokens.add(token);
		}
		
		public Node(int nodeType, Token token){		// 此种方式初始化也没有 tokens
			this.nodeType = nodeType;
			Node nd = new Node(token);
			this.addChild(nd);
		}
		
		public void addChild(Node child){
			this.chidlren.add(child);
			child.parentNode = this;
		}
		
		public final static int NODE_CODE = 1;
		public final static int NODE_SQL = 2;
		public final static int NODE_ANY = 3;
		public final static int NODE_BACKET = 4;
		
		@Override
		public String toString() {
			return this.toString(0);
		}

		private String toString(int depth) {
			StringBuffer sb = new StringBuffer();
			sb.append("(TYPE ").append(this.nodeType);
			if(!this.chidlren.isEmpty()){
				for(Node c : this.chidlren){
					sb.append(StringUtils.repeat('\t', depth)).append(c.toString(depth + 1));
					if(c.nodeType != Node.NODE_ANY) sb.append("\n");
				}
			}
			if(!this.tokens.isEmpty()){
				for(Token tk : this.tokens){
					sb.append("(").append(tk.tokenType).append(":").append(tk.code.subSequence(tk.start, tk.start + tk.length)).append(")");
				}
			}
			return sb.toString();
		}
	}
	
	public static class Parser {
		private Lexer lexer;

		public Parser(Lexer lexer){
			this.lexer = lexer;
		}
		
		public Node outter() throws LexException, UnexceptedTokenException{
			Node node = new Node(Node.NODE_CODE);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					throw new UnexceptedTokenException(tk.start, ")");
				case Token.TOKEN_R_SQ_BRACKET :
					throw new UnexceptedTokenException(tk.start, "]");
				case Token.TOKEN_R_CURVE :
					throw new UnexceptedTokenException(tk.start, "}");
				case Token.TOKEN_CLOSE :
					throw new UnexceptedTokenException(tk.start, ".}");
				default :
					node.addChild(new Node(tk));	
				}
			}
			return node;
			
		}

		private Node curve(Token token) throws LexException, UnexceptedTokenException {
			Node node = new Node(Node.NODE_ANY, token);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					throw new UnexceptedTokenException(tk.start, ")");
				case Token.TOKEN_R_SQ_BRACKET :
					throw new UnexceptedTokenException(tk.start, "]");
				case Token.TOKEN_R_CURVE :
					node.addChild(new Node(tk));
					return node;
				case Token.TOKEN_CLOSE :
					throw new UnexceptedTokenException(tk.start, ".}");
				default :
					node.addChild(new Node(tk));	
				}
			}
			throw new UnexceptedTokenException("eof");
		}

		private Node sq_backet(Token token) throws LexException, UnexceptedTokenException {
			Node node = new Node(Node.NODE_ANY, token);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					throw new UnexceptedTokenException(tk.start, ")");
				case Token.TOKEN_R_SQ_BRACKET :
					node.addChild(new Node(tk));
					return node;
				case Token.TOKEN_R_CURVE :
					throw new UnexceptedTokenException(tk.start, "}");
				case Token.TOKEN_CLOSE :
					throw new UnexceptedTokenException(tk.start, ".}");
				default :
					node.addChild(new Node(tk));	
				}
			}
			throw new UnexceptedTokenException("eof");
		}

		private Node backet(Token token) throws LexException, UnexceptedTokenException {
			Node node = new Node(Node.NODE_BACKET, token);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					node.addChild(new Node(tk));
					return node;
				case Token.TOKEN_R_SQ_BRACKET :
					throw new UnexceptedTokenException(tk.start, "]");
				case Token.TOKEN_R_CURVE :
					throw new UnexceptedTokenException(tk.start, "}");
				case Token.TOKEN_CLOSE :
					throw new UnexceptedTokenException(tk.start, ".}");
				default :
					node.addChild(new Node(tk));	
				}
			}
			throw new UnexceptedTokenException("eof");
		}

		private Node code(Token token) throws LexException, UnexceptedTokenException {
			Node node = new Node(Node.NODE_CODE);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					throw new UnexceptedTokenException(tk.start, ")");
				case Token.TOKEN_R_SQ_BRACKET :
					throw new UnexceptedTokenException(tk.start, "]");
				case Token.TOKEN_R_CURVE :
					throw new UnexceptedTokenException(tk.start, "}");
				case Token.TOKEN_CLOSE :
					return node;
				default :
					node.addChild(new Node(tk));	
				}
			}
			throw new UnexceptedTokenException("eof");
		}

		private Node sql(Token token) throws UnexceptedTokenException, LexException {
			Node node = new Node(Node.NODE_SQL);
			for(Token tk = lexer.nextToken(); tk.tokenType != Token.TOKEN_EOF; tk = lexer.nextToken()){
				switch(tk.tokenType){
				case Token.TOKEN_SQL_START :
					node.addChild(sql(tk));
					break;
				case Token.TOKEN_CODE_START:
					node.addChild(code(tk));
					break;
				case Token.TOKEN_L_BACKET :
					node.addChild(backet(tk));
					break;
				case Token.TOKEN_L_SQ_BRACKET :
					node.addChild(sq_backet(tk));
					break;
				case Token.TOKEN_L_CURVE :
					node.addChild(curve(tk));
					break;
				case Token.TOKEN_R_BACKET :
					throw new UnexceptedTokenException(tk.start, ")");
				case Token.TOKEN_R_SQ_BRACKET :
					throw new UnexceptedTokenException(tk.start, "]");
				case Token.TOKEN_R_CURVE :
					throw new UnexceptedTokenException(tk.start, "}");
				case Token.TOKEN_CLOSE :
					return node;
				case Token.TOKEN_COMMENT :	// SQL 中的备注跳过
					;
					break;
				default :
					node.addChild(new Node(tk));	
				}
			}
			throw new UnexceptedTokenException("eof");
		}
	}
	
	private static class UnexceptedTokenException extends Exception{

		private int start;

		public UnexceptedTokenException(int start, String unexpected) {
			super("unexpected token " + unexpected + " at " + start);
			this.start = start;
		}

		public UnexceptedTokenException(String unexpected) {
			super("unexpected token " + unexpected);
		}

		public int getStart() {
			return start;
		}


		private static final long serialVersionUID = 6127948538074329561L;
	}
	
	private static class Token{
		public int tokenType;
		public int start;
		public int length;
		public CharSequence code;
		
		public Token(int tokenType, int start, CharSequence code){
			this.tokenType = tokenType;
			this.start = start;
			this.code = code;
		}
		
		public CharSequence getText() {
			return code.subSequence(start, start + length);
		}
		
		public CharSequence getText(boolean ignoreComment) {
			if(this.tokenType == Token.TOKEN_COMMENT && ignoreComment){
				CharSequence tx = this.getText();
				StringBuffer sb = new StringBuffer();
				for(int i =0; i<tx.length(); i++){
					char c = tx.charAt(i);
					if(c == '\r' || c == '\n'){
						sb.append(c);
					} else {
						sb.append(' ');
					}
				}
				return sb.toString();
			} else {
				return this.getText();
			}
		}

		public Token(int tokenType, int start, int length, CharSequence code){
			this.tokenType = tokenType;
			this.start = start;
			this.length = length;
			this.code = code;
		}
		
		@Override
		public String toString() {
			return this.getText().toString();
		}
		
		public final static int TOKEN_EOF = 0;
		public final static int TOKEN_CODE_START = 1;
		public final static int TOKEN_SQL_START = 2;
		public final static int TOKEN_CLOSE = 3;
		public final static int TOKEN_L_CURVE = 4;
		public final static int TOKEN_R_CURVE = 5;
		public final static int TOKEN_STRING = 6;
		public final static int TOKEN_L_BACKET = 7;
		public final static int TOKEN_R_BACKET = 8;
		public final static int TOKEN_L_SQ_BRACKET = 9;
		public final static int TOKEN_R_SQ_BRACKET = 10;
		public final static int TOKEN_ANY = 11;
		public final static int TOKEN_COMMENT = 12;
		public final static int TOKEN_NEWLINE = 13;
		
	}
	
	private static class LexException extends Exception{
		private static final long serialVersionUID = 2286790353377516212L;

		public LexException(String message){
			super(message);
		}
	}
	
	private static class Lexer{
		private String code;

		private int offset = 0;
		
		public Lexer(String code){
			this.code = code;
		}
		
		public Token nextToken() throws LexException{
			if(offset >= code.length()) return new Token(Token.TOKEN_EOF, offset, code);
			
			char c = code.charAt(offset);
			switch(c){
			case '"' :
			case '\'':
				Token tkString = new Token(Token.TOKEN_STRING, offset, code);
				char startSymbol = c;
				offset ++;
				for(; offset < code.length(); offset ++){
					c = code.charAt(offset);
					if(c == '\\') {
						offset ++;
						continue;
					}
					if(c == startSymbol){
						tkString.length = offset - tkString.start + 1;
						offset ++;
						return tkString;
					}
				}
				throw new LexException("string not ended, from " + tkString.start);
				
			case '/' :
				if(code.startsWith("//", offset)){
					Token tkLineComment = new Token(Token.TOKEN_COMMENT, offset, code);
					for(; offset < code.length(); offset ++){
						c = code.charAt(offset);
						if(c == '\r' || c == '\n') {
							tkLineComment.length = offset - tkLineComment.start;
							return tkLineComment;
						}
					}
					if(offset == code.length()){	// no more content
						tkLineComment.length = offset - tkLineComment.start;
						return tkLineComment;
					}
				} else if(code.startsWith("/*", offset)){
					Token tkComment = new Token(Token.TOKEN_COMMENT, offset, code);
					for(; offset < code.length() -1; offset ++){
						c = code.charAt(offset);
						if(c == '*' && code.startsWith("*/", offset)) {
							tkComment.length = offset - tkComment.start + 2;
							offset += 2;
							return tkComment;
						}
					}
					throw new LexException("commnet not ended, from " + tkComment.start);
				}
				break;
				
			case 's' :
				if(code.startsWith("sql{.", offset)){
					try{
						return new Token(Token.TOKEN_SQL_START, offset, 5, code);
					}finally{
						offset += 5;
					}
				}
				break;
			case 'c' :
				if(code.startsWith("code{.", offset)){
					try{
						return new Token(Token.TOKEN_CODE_START, offset, 6, code);
					} finally{
						offset += 6;
					}
				}
				break;
			case '.' :
				if(code.startsWith(".}", offset)){
					try{
						return new Token(Token.TOKEN_CLOSE, offset, 2, code);
					}finally{
						offset += 2;
					}
				}
				break;
			case '(' :
				return new Token(Token.TOKEN_L_BACKET, offset ++, 1, code);
			case ')' :
				return new Token(Token.TOKEN_R_BACKET, offset ++, 1, code);
			case '[' :
				return new Token(Token.TOKEN_L_SQ_BRACKET, offset ++, 1, code);
			case ']' :
				return new Token(Token.TOKEN_R_SQ_BRACKET, offset ++, 1, code);
			case '{' :
				return new Token(Token.TOKEN_L_CURVE, offset ++, 1, code);
			case '}' :
				return new Token(Token.TOKEN_R_CURVE, offset ++, 1, code);
			case '\r' :
			case '\n' :
				if(code.startsWith("\r\n", offset) || code.startsWith("\n\r", offset)){
					try{
					return new Token(Token.TOKEN_NEWLINE, offset, 2, code);
					}finally{
						offset +=2;
					}
				} else {
					return new Token(Token.TOKEN_NEWLINE, offset++, 1, code);
				}
					
			}
			return new Token(Token.TOKEN_ANY, offset ++, 1, code);
		}
	}

}
