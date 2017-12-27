package org.siphon.javakaffee.msm;

import org.apache.catalina.Manager;

import de.javakaffee.web.msm.MemcachedSessionService.SessionManager;
import de.javakaffee.web.msm.SessionAttributesTranscoder;
import de.javakaffee.web.msm.TranscoderFactory;

public class NashornTranscoderFactory implements TranscoderFactory {

	private NashornTranscoder transcoder;

	public SessionAttributesTranscoder createTranscoder(SessionManager manager) {
		return getTranscoder(manager); 
	}

	private NashornTranscoder getTranscoder (final Manager manager) {
		if(transcoder == null){
			transcoder = new NashornTranscoder(manager);
		}
		return transcoder;
	}
	
	public void setCopyCollectionsForSerialization(
			boolean copyCollectionsForSerialization) {
		
	}

	public void setCustomConverterClassNames(String[] customConverterClassNames) {	
	}


}
