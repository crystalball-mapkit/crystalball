/* eslint-disable prefer-rest-params */
/* eslint-disable no-param-reassign */
import jwtDecode from 'jwt-decode';

export function humanize(str) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, m => m.toUpperCase());
}

export function groupBy(items, key) {
  return items.reduce(
    (result, item) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {}
  );
}

export function parseVideoUrl(url) {
  let formattedUrl;

  // FORMAT VIMEO VIDEO URL
  if (url.includes('https://player.vimeo.com') || url.includes('https://www.youtube-nocookie.com')) {
    formattedUrl = url;
  }
  if (url.includes('https://vimeo.com/')) {
    const videoId = url.split('https://vimeo.com/')[1];
    formattedUrl = `https://player.vimeo.com/video/${videoId}`;
  }
  // FORMAT YOUTUBE VIDEO URL
  if (url.includes('https://www.youtube.com/watch?v=')) {
    let videoId = url.split('https://www.youtube.com/watch?v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition != -1) {
      videoId = videoId.substring(0, ampersandPosition);
    }
    formattedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
  return formattedUrl;
}

export function getNestedProperty(obj, key) {
  return key.split('.').reduce((o, x) => (typeof o === 'undefined' || o === null ? o : o[x]), obj);
}

export function addProps(obj, arr, val) {
  if (typeof arr === 'string') arr = arr.split('.');

  obj[arr[0]] = obj[arr[0]] || {};

  const tmpObj = obj[arr[0]];

  if (arr.length > 1) {
    arr.shift();
    addProps(tmpObj, arr, val);
  } else obj[arr[0]] = val;

  return obj;
}

export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function debounce(fn, delay) {
  let timeoutID = null;
  return function () {
    clearTimeout(timeoutID);
    const args = arguments;
    const that = this;
    timeoutID = setTimeout(() => {
      fn.apply(that, args);
    }, delay);
  };
}

export function getCurrentDate() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

export function getCurrentTime() {
  const today = new Date();
  return `${today.getHours()}-${today.getMinutes()}-${today.getSeconds()}`;
}

/**
 * Takes a hex value and prepends a zero if it's a single digit.
 * @param {string} hex Hex value to prepend if single digit.
 * @return {string} hex value prepended with zero if it was single digit,
 *     otherwise the same value that was passed in.
 * @hidden
 */
export function colorZeroPadding(hex) {
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Converts a color from RGB to hex representation.
 * @param {number[]} rgb rgb representation of the color.
 * @return {string} hex representation of the color.
 * @hidden
 */
export function rgbArrayToHex(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  // eslint-disable-next-line no-bitwise
  if (r !== (r & 255) || g !== (g & 255) || b !== (b & 255)) {
    throw Error(`"(${r},${g},${b})" is not a valid RGB color`);
  }
  const hexR = colorZeroPadding(r.toString(16));
  const hexG = colorZeroPadding(g.toString(16));
  const hexB = colorZeroPadding(b.toString(16));
  return `#${hexR}${hexG}${hexB}`;
}

// helper function to detect a CSS color
// Taken from Vuetify sources
// https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/mixins/colorable.ts
export function isCssColor(color) {
  return !!color && !!color.match(/^(#|(rgb|hsl)a?\()/);
}

export function validateToken(jwtToken) {
  if (!jwtToken) {
    return null;
  }
  const decodedToken = jwtDecode(jwtToken);
  if (decodedToken && decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
    return null;
  }
  return decodedToken;
}

export function Timer(fn, t) {
  let timerObj = setInterval(fn, t);

  this.stop = function () {
    if (timerObj) {
      clearInterval(timerObj);
      timerObj = null;
    }
    return this;
  };

  // start timer using current settings (if it's not already running)
  this.start = function () {
    if (!timerObj) {
      this.stop();
      timerObj = setInterval(fn, t);
    }
    return this;
  };

  // start with new or original interval, stop current interval
  this.reset = function (newT = t) {
    t = newT;
    return this.stop().start();
  };
}

export function getHtml(content, defaultLanguage, currentLanguage) {
  let html = content && content.html ? content.html : '';
  let htmlTranslations;
  if (content && content.htmlTranslations) {
    if (typeof content.htmlTranslations === 'string') {
      htmlTranslations = JSON.parse(content.htmlTranslations);
    } else {
      htmlTranslations = content.htmlTranslations;
    }
  }

  if (defaultLanguage !== currentLanguage && content && htmlTranslations && htmlTranslations[currentLanguage]) {
    html = htmlTranslations[currentLanguage];
  }
  return html;
}

export function deepMerge(obj1, obj2) {
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (obj2[key] instanceof Object && obj1[key] instanceof Object) {
        obj1[key] = deepMerge(obj1[key], obj2[key]);
      } else {
        obj1[key] = obj2[key];
      }
    }
  }
  return obj1;
}
