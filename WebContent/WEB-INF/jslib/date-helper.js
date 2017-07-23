imports("./Date.js");

imports("./js-joda.js");

imports("./js-joda-timezone.js");

JSJoda.use(JSJodaTimezone);

var ZonedDateTime = JSJoda.ZonedDateTime,
	ZoneId = JSJoda.ZoneId,
	LocalDateTime = JSJoda.LocalDateTime,
	LocalDate = JSJoda.LocalDate,
	LocalTime = JSJoda.LocalTime;

//var ZonedDateTime = Java.type('java.time.ZonedDateTime'),
//	ZoneId = Java.type('java.time.ZoneId'),
//	LocalDateTime = Java.type('java.time.LocalDateTime'),
//	LocalDate = Java.type('java.time.LocalDate'),
//	LocalTime = Java.type('java.time.LocalTime');


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


ZonedDateTime.prototype.toJavaObject = function(){
	return java.time.ZonedDateTime.of(this.year(), this.monthValue(), this.dayOfMonth(), 
			this.hour(), this.minute(), this.second(), this.nano(),  java.time.ZoneId.of(this.zone().id()));
};

	
