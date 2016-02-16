/*
Date.js, an Date class extension, adding localized format, parse and week numbering.
Copyright 2009 Henrik Lindqvist <henrik.lindqvist@llamalab.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Extends the native <code>Date</code> class with additional functionality.
 * <p>Many of the date arithmetics are based on the information from 
 * <a href="http://http://www.merlyn.demon.co.uk/frames-1.htm" target="_blank">http://www.merlyn.demon.co.uk/frames-1.htm</a>.</p>
 * @class Date
 * @version 0.1
 * @author Henrik Lindqvist &lt;<a href="mailto:henrik.lindqvist@llamalab.com">henrik.lindqvist@llamalab.com</a>&gt;
 */
(function (d, dp) {

/**
 * Get the date localization data for a specific language.
 * <p>Standard localizations included:</p>
 * <ul>
 *  <li><code>en-US</code></li> 
 *  <li><code>iso</code> - Use for <a href="http://en.wikipedia.org/wiki/ISO_8601" 
 *    target="_blank">ISO8601</a> and Schema <a href="http://www.w3.org/TR/xmlschema11-2/#dateTime" 
 *    target="_blank"><code>dateTime</code></a></li> 
 * </ul>
 * <p>A good source of localization data are 
 * <a href="http://www.unicode.org/cldr/" target="_blank">http://www.unicode.org/cldr/</a>.</p>
 * @function {static object} i18n
 * @param {optional string} l - language, or user-agent language if omitted.
 * @returns localization data
 */
d.i18n = function (l) {
	return 'en-US';	// no navigator since run at server
	return (typeof l == 'string')
       ? (l in Date.i18n ? Date.i18n[l] : Date.i18n(l.substr(0, l.lastIndexOf('-'))))
       : (l || Date.i18n(navigator.language || navigator.browserLanguage || ''));
};
d.i18n.inherit = function (l, o) {
  l = Date.i18n(l);
  for (var k in l) if (typeof o[k] == 'undefined') o[k] = l[k];
  return o;
};
d.i18n[''] = // default
d.i18n['en'] = 
d.i18n['en-US'] = {
  months: {
    abbr: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],
    full: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
  },
  days: {
    abbr: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],
    full: [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ]
  },
  week: {   // Used by date pickers
    abbr: 'Wk',
    full: 'Week'
  },
  ad: 'AD',
  am: 'AM',
  pm: 'PM',
  gmt: 'GMT',
  z: ':',   // Hour - minute separator
  Z: '',    // Hour - minute separator
  fdow: 0,  // First day of week
  mdifw: 1  // Minimum days in first week
};
d.i18n['iso'] = d.i18n.inherit('en', {
  Z: ':',
  fdow: 1,
  mdifw: 4
});
/**
 * Milliseconds in a week.
 * @property {static read number} WEEK
 */
d.WEEK = 6048e5;
/**
 * Milliseconds in a day.
 * @property {static read number} DAY
 */
d.DAY = 864e5;
/**
 * Milliseconds in an hour.
 * @property {static read number} HOUR
 */
d.HOUR = 36e5;
/**
 * Milliseconds in a minute.
 * @property {static read number} MINUTE
 */
d.MINUTE = 6e4
/**
 * Milliseconds in a second.
 * @property {static read number} SECOND
 */
d.SECOND = 1000;
/**
 * New <code>Date</code> instance for todays date, with time at midnight.
 * @function {static Date} today
 * @returns todays date at midnight.
 * @see datePart
 */
d.today = function () {
  return new Date().datePart();
};
/**
 * Clone <code>this</code> date, creating a new instance.
 * @function {Date} clone
 * @returns clone of <code>this</code> date.
 */
dp.clone = function() {
  return new Date(+this);
};
/**
 * Create a new instance with only the date part from <code>this</code> date.
 * <p>The time for the new date will be midnight.</p>
 * @function {Date} datePart
 * @returns the date at midnight.
 * @see timePart
 */
dp.datePart = function () {
  with (this) return new Date(getFullYear(), getMonth(), getDate());
};
/**
 * Create a new instance with only the time part from <code>this</code> date.
 * <p>The date will be the JavaScript epoc (1970-01-01).</p>
 * @function {Date} timePart
 * @returns the time of <code>this</code> date.
 * @see datePart
 */
dp.timePart = function () {
  with (this) return new Date(1970, 0, 1, getHours(), getMinutes(), getSeconds(), getMilliseconds());
};
/**
 * Set the "raw" unlocalized weekday.
 * @function setDay
 * @param {number} d - the weekday (0-6).
 * @see getDay (<a href="http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Date:getDay" target="_blank">native</a>)
 */
dp.setDay = function (d) {
  with (this) setDate((getDate() - getDay()) + d);
};
/**
 * Get the localized day of week.
 * @function {number} getDayOfWeek
 * @param {optional} o - first day of week number, language string or localization object.
 * @returns the weekday (1-7).
 * @see setDayOfWeek
 */
dp.getDayOfWeek = function (o) {
  if (typeof o != 'number') o = Date.i18n(o).fdow;
  var d = this.getDay() - o;
  if (d < 0) d += 7;
  return d + 1;
};
/**
 * Set the localized day of week.
 * @function setDayOfWeek
 * @param {number} d - the weekday (1-7).
 * @param {optional} o - first day of week number, language string or localization object.
 * @see getDayOfWeek
 */
dp.setDayOfWeek = function (d, o) {
  with (this) setDate((getDate() - getDayOfWeek(o)) + d);
};
/**
 * Get the maximum days in the month for <code>this</code> date.
 * @function {number} getDaysInMonth
 * @returns the number of days in this month, 1-31.
 */
dp.getDaysInMonth = function () {
  with (this.clone()) {
    setDate(32);
    return 32 - getDate();
  }
};
/**
 * Get the maximum days in the year for <code>this</code> date.
 * @function {number} getDaysInYear
 * @returns the number of days in this year (1-366).
 */
dp.getDaysInYear = function () {
  var y = this.getFullYear();
  return Math.floor((Date.UTC(y+1, 0, 1) - Date.UTC(y, 0, 1)) / Date.DAY);
};
/**
 * Get the day of the year for <code>this</code> date.
 * @function {number} getDayOfYear
 * @returns the day of this year (1-366).
 * @see setDayOfYear
 */
dp.getDayOfYear = function () {
  return Math.floor((this - new Date(this.getFullYear(), 0, 1)) / Date.DAY) + 1;
};
/**
 * Set the day in the year for <code>this</code> date.
 * @function setDayOfYear
 * @param {number} d - the day of year (1-366).
 * @see getDayOfYear
 */
dp.setDayOfYear = function (d) {
  this.setMonth(0, d); 
};
/**
 * Get the week of month for <code>this</code> date.
 * @function {number} getWeekOfMonth
 * @param {optional} l - language string or localization object.
 * @returns the week number of this month (0-6).
 * @see setWeekOfMonth
 */
dp.getWeekOfMonth = function (l) {
  l = Date.i18n(l);
  with (this.clone()) {
    setDate(1);
    var d = (7 - (getDay() - l.fdow)) % 7;
    d = (d < l.mdifw) ? -d : (7 - d);
    return Math.ceil((this.getDate() + d) / 7);
  }
};
/**
 * Set the week of month for <code>this</code> date.
 * @function setWeekOfMonth
 * @param {number} w - the week number of this month (1-6).
 * @param {optional} l - language string or localization object.
 * @see setWeekOfMonth
 */
dp.setWeekOfMonth = function (w, l) {
  l = Date.i18n(l);
  with (this.clone()) {
    setDate(1);
    var d = (7 - (getDay() - l.fdow)) % 7;
    d = (d < l.mdifw) ? -d : (7 - d);
    setDate(d);
  }
};
/**
 * Get the week of year for <code>this</code> date.
 * @function {number} getWeekOfYear
 * @param {optional} l - language string or localization object.
 * @returns the week number of this year, 1-53.
 * @see setWeekOfMonth
 */
dp.getWeekOfYear = function (l) {
  l = Date.i18n(l);
  with (this.clone()) {
    setMonth(0, 1);
    var d = (7 - (getDay() - l.fdow)) % 7;
    if (l.mdifw < d) d -= 7;
    setDate(d);
    var w = Math.ceil((+this - valueOf()) / Date.WEEK);
    return (w <= getWeeksInYear()) ? w : 1;
  }
};
/**
 * Set the week of year for <code>this</code> date.
 * @function setWeekOfYear
 * @param {number} w - the week number in this year, 1-53.
 * @param {optional} l - language string or localization object.
 * @see setWeekOfMonth
 */
dp.setWeekOfYear = function (w, l) {
  l = Date.i18n(l);
  with (this) {
    setMonth(0, 1);
    var d = (7 - (getDay() - l.fdow)) % 7;
    if (l.mdifw < d) d -= 7;
    d += w * 7;
    setDate(d);
  }
};
/**
 * Get the maximum weeks in the year of <code>this</code> date.
 * @function {number} getWeeksInYear
 * @returns the number of weeks in this year, 1-53.
 */
dp.getWeeksInYear = function () {
  var y = this.getFullYear();
  return 52 + (new Date(y, 0, 1).getDay() == 4 || new Date(y, 11, 31).getDay() == 4);
};
/**
 * Set the timezone offset for <code>this</code> date.
 * <p>This function only adjusts the date to the supplied offset, 
 * it doesn&rsquo;t actually set the timezone.</p>
 * @function setTimezoneOffset
 * @param {number} o - offset in minutes.
 * @see getTimezoneOffset (<a href="http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Date:getTimezoneOffset" traget="_blank">native</a>)
 */
dp.setTimezoneOffset = function (o) {
  with (this) setTime(valueOf() + ((getTimezoneOffset() + -o) * Date.MINUTE));
};
/**
 * Format <code>this</code> date into a string.
 * <p>For pattern syntax, see <a href="http://java.sun.com/javase/6/docs/api/java/text/SimpleDateFormat.html" target="_blank">java.text.SimpleDateFormat</a>.</p>
 * @function format
 * @param {string} p - the pattern string of format
 * @param l - the language (string) or locationzation data used
 * @see i18n
 */
dp.format = function (p, l) {
  p = p || 'yyyy-MM-dd hh:mm:ss';
  var i18n = Date.i18n(l);
  var d = this;
  var pad = function (n, l) {
    for (n = String(n), l -= n.length; --l >= 0; n = '0'+n);
    return n;
  };
  var tz = function (n, s) {
    return ((n<0)?'+':'-')+pad(Math.abs(n/60),2)+s+pad(Math.abs(n%60),2);
  };
  return p.replace(/([aDdEFGHhKkMmSsWwyZz])\1*|'[^']*'|"[^"]*"/g, function (m) {
    l = m.length;
    switch (m.charAt(0)) {
      case 'a': return (d.getHours() < 12) ? i18n.am : i18n.pm;
      case 'D': return pad(d.getDayOfYear(), l);
      case 'd': return pad(d.getDate(), l);
      case 'E': return i18n.days[(l > 3)?'full':'abbr'][d.getDay()];
      case 'F': return pad(d.getDayOfWeek(i18n), l);
      case 'G': return i18n.ad;
      case 'H': return pad(d.getHours(), l);
      case 'h': return pad(d.getHours() % 12 || 12, l);
      case 'K': return pad(d.getHours() % 12, l);
      case 'k': return pad(d.getHours() || 24, l);
      case 'M': return (l < 3) 
                     ? pad(d.getMonth() + 1, l)
                     : i18n.months[(l > 3)?'full':'abbr'][d.getMonth()];
      case 'm': return pad(d.getMinutes(), l);
      case 'S': return pad(d.getMilliseconds(), l);
      case 's': return pad(d.getSeconds(), l);
      case 'W': return pad(d.getWeekOfMonth(i18n), l);
      case 'w': return pad(d.getWeekOfYear(i18n), l);
      case 'y': return (l == 2) 
                     ? String(d.getFullYear()).substr(2)
                     : pad(d.getFullYear(), l);
      case 'Z': return tz(d.getTimezoneOffset(), i18n.Z);
      case 'z': return i18n.gmt+tz(d.getTimezoneOffset(), i18n.z);
      case "'":
      case '"': return m.substr(1, l - 2);
      default:  throw new Error('Illegal pattern');
    }
  });
}
/**
 * Parse a date string.
 * This function replaces the built-in <code>parse</code> but 
 * reverts back to the original if <code>p</code> is omitted.
 * <p>For pattern syntax, see <a href="http://java.sun.com/javase/6/docs/api/java/text/SimpleDateFormat.html" target="_blank">java.text.SimpleDateFormat</a>.</p>
 * @function {static Date} parse
 * @param {optional string} p - the pattern string of format.
 * @param {optional} l - the language (string) or locationzation data used.
 * @returns the parsed {@link Date}, or <code>NaN</code> on failure.
 * @see i18n
 */
d.parse = function (s, p, l) {
  if (!p) return arguments.callee.original.call(this);
  var i18n = Date.i18n(l), d = new Date(1970,0,1,0,0,0,0);
  var pi = 0, si = 0, i, j, k, c;
  var num = function (x) {
    if (x) l = x;
    else if (!/[DdFHhKkMmSsWwy]/.test(p.charAt(pi))) l = Number.MAX_VALUE;
    for (i = si; --l >= 0 && /[0-9]/.test(s.charAt(si)); si++);
    if (i == si) throw 1;
    return parseInt(s.substring(i, si), 10);
  };
  var cmp = function (x) {
    if (s.substr(si, x.length).toLowerCase() != x.toLowerCase()) return false;
    si += x.length;
    return true;
  };
  var idx = function (x) {
    for (i = x.length; --i >= 0;) if (cmp(x[i])) return i+1;
    return 0;
  };
  try {
    while (pi < p.length) {
      c = p.charAt(l = pi);
      if (/[aDdEFGHhKkMmSsWwyZz]/.test(c)) {
        while (p.charAt(++pi) == c);
        l = pi - l;
        switch (c) {
          case 'a': if (cmp(i18n.pm)) d.setHours(12 + d.getHours());
                    else if (!cmp(i18n.am)) throw 2;
                    break;
          case 'D': d.setDayOfYear(num()); break;
          case 'd': d.setDate(num()); break;
          case 'E': if (i = idx(i18n.days.full)) d.setDay(i - 1);
                    else if (i = idx(i18n.days.abbr)) d.setDay(i - 1);
                    else throw 3;
                    break;
          case 'F': d.setDayOfWeek(num(), i18n); break;
          case 'G': if (!cmp(i18n.ad)) throw 4;
                    break;
          case 'H': 
          case 'k': d.setHours((i = num()) < 24 ? i : 0); break;
          case 'K':
          case 'h': d.setHours((i = num()) < 12 ? i : 0); break;
          case 'M': if (l < 3) d.setMonth(num() - 1); 
                    else if (i = idx(i18n.months.full)) d.setMonth(i - 1);
                    else if (i = idx(i18n.months.abbr)) d.setMonth(i - 1);
                    else throw 5;
                    break;
          case 'm': d.setMinutes(num()); break;
          case 'S': d.setMilliseconds(num()); break;
          case 's': d.setSeconds(num()); break;
          case 'W': d.setWeekOfMonth(num(), i18n); break;
          case 'w': d.setWeekOfYear(num(), i18n); break;
          case 'y': d.setFullYear((l == 2) ? 2000 + num() : num()); break;
          case 'z': if (!cmp(i18n.gmt)) throw 6;
          case 'Z': if (!/[+-]/.test(j = s.charAt(si++))) throw 6;
                    k = num(2) * 60;
                    if (!cmp(i18n[c])) throw 7;
                    k += num(2);
                    d.setTimezoneOffset((j == '+') ? -k : k);
        }
      }
      else if (/["']/.test(c)) {
        while (++pi < p.length && p.charAt(pi) != c);
        if (!cmp(p.substring(l+1, pi++))) throw 8;
      }
      else {
        while (pi < p.length && !/[aDdEFGHhKkMmSsWwyZz"']/.test(p.charAt(pi))) pi++;
        if (!cmp(p.substring(l, pi))) throw 9;
      }
    }
    return d;
  }
  catch (e) {
    if (e > 0) return Number.NaN;
    throw e;      
  }
};
d.parse.original = d.parse;

})(Date, Date.prototype);