imports("./Date.js");


var ZonedDateTime = Java.type('java.time.ZonedDateTime'),
	ZoneId = Java.type('java.time.ZoneId'),
	LocalDateTime = Java.type('java.time.LocalDateTime'),
	LocalDate = Java.type('java.time.LocalDate'),
	LocalTime = Java.type('java.time.LocalTime'),
	Instant = Java.type('java.time.Instant'),
	TemporalAdjusters = Java.type('java.time.temporal.TemporalAdjusters'),
	DateTimeFormatter = Java.type('java.time.format.DateTimeFormatter');


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

/**
 * 将 js Date 类型转为 java.time.Instant
 * @returns {java.time.Instant} 
 */
Date.prototype.toInstant = function(){
	return Instant.ofEpochMilli(this.getTime() * 1);
}

/**
 * 将 js Date 类型转为 java.time.ZonedDateTime
 * usage:
 * ```js
 * 	new Date().toZonedDateTime('Europe/Berlin')
 * ```
 * @param zoneId {java.time.ZoneId|string} 时区
 * @returns {java.time.ZonedDateTime} 
 */
Date.prototype.toZonedDateTime = function(zoneId){
	if(ZoneId.class.isInstance(zoneId)){
		//
	} else {
		zoneId = ZoneId.of(zoneId);
	}
	return ZonedDateTime.ofInstant(Instant.ofEpochMilli(this.getTime() * 1), zoneId);
}


/**
 * 将 Java ZonedDateTime 类型转为 js Date
 * usage:
 * ```js
 * 	Date.from(ZonedDateTime.now())
 * ```
 * @returns {Date} 
 */
Date.fromZonedDateTime = function(zonedDateTime){
	if(zonedDateTime == null) return null;
	return new Date(zonedDateTime.toInstant().toEpochMilli() * 1);
};

/**
 * 将 Java Instant 类型转为 js Date
 * usage:
 * ```js
 * 	Date.from(Instant.now())
 * ```
 * @returns {Date} 
 */
Date.fromInstant = function(instant){
	if(instant == null) return null;
	return new Date(instant.toEpochMilli() * 1);
};


/**
 * 根据提供的转换规则，将 timestamp 和属于它的 zone (varchar) 字段合并
 * usage:
 * ```js
 * 	this.query('select now()::timestamp now, 'Europe/Berlin'::varchar(40) tz').mergeTimeZone({now:'tz'})
 * ```
 * @param timestampZoneMap {object} {field: timezoneField, ...}，可以有多个字段
 * @returns {D2JS.DataTable} this 
 */
D2JS.DataTable.prototype.mergeTimeZone = function(timestampZoneMap){
	for(var col in timestampZoneMap){if(timestampZoneMap.hasOwnProperty(col)){
		var zoneCol = timestampZoneMap[col];
		if(this.columns){
			this.columns.splice(this.columns.findIndex(function(column){return column.name == zoneCol}), 1); 
		}
		this.rows.forEach(function(row){
			var dt = row[col];
			if(dt != null){
				row[col] = row[col].toZonedDateTime(row[zoneCol]);
			}
		});
	}}
	return this;
}

/**
 * 从 ZonedDateTime 字段分拆出 ZoneId.toString() 并设置到另一个字段，通常就是附属的 timezone 信息字段。
 * usage:
 * ```js
 * 	$V(this, rcd, {post_at: T.splitTimeZone('post_at_tz')})
 *	// then we got rcd['post_at_tz'] = zone id
 * ```
 * @param zoneFld {string} 时区字段
 */
T.splitTimeZone =  function(zoneFld){
     return {name : 'splitTimeZone', check : function(v, fld, rcd){
			if(v != null){
				if(ZonedDateTime.class.isInstance(v)){
					rcd[zoneFld] = v.zone.toString();
				} else {
					return v + ' 不是 ZonedDateTime 类型';
				}
			}
		}
	}
}

