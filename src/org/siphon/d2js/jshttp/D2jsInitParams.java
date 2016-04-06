package org.siphon.d2js.jshttp;

public class D2jsInitParams {

	private String[] libs;
	private Object application;
	
	private String[] preloadJs;
	
	private Object globalLockObject;
	
	public String[] getLibs() {
		return libs;
	}

	public void setLibs(String[] value){
		this.libs = value;
	}

	public Object getApplication() {
		return application;
	}

	public void setApplication(Object application) {
		this.application = application;
	}

	public String[] getPreloadJs() {
		return this.preloadJs;
	}
	
	public void setPreloadJs(String[] value){
		this.preloadJs = value;
	}

	public void setGlobalLockObject(Object object) {
		this.globalLockObject = object;
	}

	public Object getGlobalLockObject() {
		return globalLockObject;
	}
}
