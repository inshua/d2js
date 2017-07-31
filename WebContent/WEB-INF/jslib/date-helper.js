imports("./Date.js");


var ZonedDateTime = Java.type('java.time.ZonedDateTime'),
	ZoneId = Java.type('java.time.ZoneId'),
	LocalDateTime = Java.type('java.time.LocalDateTime'),
	LocalDate = Java.type('java.time.LocalDate'),
	LocalTime = Java.type('java.time.LocalTime'),
	Instant = Java.type('java.time.Instant');


(function(){
	var reg = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|((\+|\-)\d\d:\d\d(\[\w+\/\w+\])?))?)?$/;
	var prevParseDate = parseDate;
	parseDate = function(key, value){
		if(typeof value === 'string' && reg.test(value)){
			return ZonedDateTime.parse(value);
		}
		return value;
	}
})();


(function(){
	var reg = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|((\+|\-)\d\d:\d\d(\[\w+\/\w+\])?))?)?$/;
	
	var oldStringify = JSON.stringify;
	
	function zonedDatetimeReplacer(key, value){
		if(value != null && ZonedDateTime.class.isInstance(value)){
			return value.toString();
		} else {
			return value;
		}
	}
	
	function wrapReplacer(customReplacer, preserveReplacer){
		return function(key, value){
			if(customReplacer instanceof Function){
				value = customReplacer(key, value);
				return preserveReplacer(key, value);
			} else {
				if(customReplacer.indexOf(key) == -1){
					return undefined;
				} else {
					return preserveReplacer(key, value);
				}
			}
		}
	}
	
	JSON.stringify = function(value, replacer, space){
		if(replacer == null){
			return oldStringify.call(this, value, zonedDatetimeReplacer, space);
		} else {
			return oldStringify.call(this, value, wrapReplacer(replacer, zonedDatetimeReplacer), space);
		}
	}
})();


	
