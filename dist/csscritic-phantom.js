/*! PhantomJS regression runner for CSS Critic - v0.2.0 - 2014-04-15
* http://www.github.com/cburgmer/csscritic
* Copyright (c) 2014 Christoph Burgmer, Copyright (c) 2012 ThoughtWorks, Inc.; Licensed MIT */
/* Integrated dependencies:
 * jsSHA.js (BSD License),
 * url (MIT License),
 * CSSOM (MIT License),
 * xmlserializer (MIT License),
 * ayepromise (BSD License & WTFPL),
 * imagediff.js (MIT License),
 * rasterizeHTML.js (MIT License) */

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

var csscriticLib = {};

csscriticLib.util = function () {
    var module = {};

    module.getDataURIForImage = function (image) {
        var canvas = window.document.createElement("canvas"),
            context = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        return canvas.toDataURL("image/png");
    };

    module.getImageForUrl = function (url, successCallback, errorCallback) {
        var image = new window.Image();

        image.onload = function () {
            successCallback(image);
        };
        if (errorCallback) {
            image.onerror = errorCallback;
        }
        image.src = url;
    };

    module.getImageForBinaryContent = function (content, callback) {
        var defer = ayepromise.defer(),
            image = new window.Image();

        defer.promise.then(callback, callback);

        image.onload = function () {
            defer.resolve(image);
        };
        image.onerror = function () {
            defer.reject();
        };
        image.src = 'data:image/png;base64,' + btoa(content);

        return defer.promise;
    };

    var getBinary = function (data) {
        var binaryContent = "";

        for (var i = 0; i < data.length; i++) {
            binaryContent += String.fromCharCode(data.charCodeAt(i) & 0xFF);
        }
        return binaryContent;
    };

    var getUncachableURL = function (url) {
        return url + "?_=" + Date.now();
    };

    module.ajax = function (url) {
        var defer = ayepromise.defer(),
            xhr = new XMLHttpRequest();

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) {
                defer.resolve(getBinary(xhr.response));
            } else {
                defer.reject();
            }
        };

        xhr.onerror = function () {
            defer.reject();
        };

        try {
            xhr.open('get', getUncachableURL(url), true);
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
            xhr.send();
        } catch (e) {
            defer.reject();
        }

        return defer.promise;
    };

    module.workAroundTransparencyIssueInFirefox = function (image, callback) {
        // Work around bug https://bugzilla.mozilla.org/show_bug.cgi?id=790468 where the content of a canvas
        //   drawn to another one will be slightly different if transparency is involved.
        // Here the reference image has been drawn to a canvas once (to serialize it to localStorage), while the
        //   image of the newly rendered page hasn't.  Solution: apply the same transformation to the second image, too.
        var dataUri;
        try {
            dataUri = module.getDataURIForImage(image);
        } catch (e) {
            // Fallback for Chrome & Safari
            callback(image);
            return;
        }

        module.getImageForUrl(dataUri, function (newImage) {
            callback(newImage);
        });
    };

    module.map = function (list, func, callback) {
        var completedCount = 0,
            results = [],
            i;

        if (list.length === 0) {
            callback(results);
        }

        var callForItem = function (idx) {
            function funcFinishCallback(result) {
                completedCount += 1;

                results[idx] = result;

                if (completedCount === list.length) {
                    callback(results);
                }
            }

            func(list[idx], funcFinishCallback);
        };

        for(i = 0; i < list.length; i++) {
            callForItem(i);
        }
    };

    return module;
};

/*
 A JavaScript implementation of the SHA family of hashes, as
 defined in FIPS PUB 180-2 as well as the corresponding HMAC implementation
 as defined in FIPS PUB 198a

 Copyright Brian Turek 2008-2013
 Distributed under the BSD License
 See http://caligatio.github.com/jsSHA/ for more information

 Several functions taken from Paul Johnston
*/
(function(T){function z(a,c,b){var g=0,f=[0],h="",l=null,h=b||"UTF8";if("UTF8"!==h&&"UTF16"!==h)throw"encoding must be UTF8 or UTF16";if("HEX"===c){if(0!==a.length%2)throw"srcString of HEX type must be in byte increments";l=B(a);g=l.binLen;f=l.value}else if("ASCII"===c||"TEXT"===c)l=J(a,h),g=l.binLen,f=l.value;else if("B64"===c)l=K(a),g=l.binLen,f=l.value;else throw"inputFormat must be HEX, TEXT, ASCII, or B64";this.getHash=function(a,c,b,h){var l=null,d=f.slice(),n=g,p;3===arguments.length?"number"!==
typeof b&&(h=b,b=1):2===arguments.length&&(b=1);if(b!==parseInt(b,10)||1>b)throw"numRounds must a integer >= 1";switch(c){case "HEX":l=L;break;case "B64":l=M;break;default:throw"format must be HEX or B64";}if("SHA-1"===a)for(p=0;p<b;p++)d=y(d,n),n=160;else if("SHA-224"===a)for(p=0;p<b;p++)d=v(d,n,a),n=224;else if("SHA-256"===a)for(p=0;p<b;p++)d=v(d,n,a),n=256;else if("SHA-384"===a)for(p=0;p<b;p++)d=v(d,n,a),n=384;else if("SHA-512"===a)for(p=0;p<b;p++)d=v(d,n,a),n=512;else throw"Chosen SHA variant is not supported";
return l(d,N(h))};this.getHMAC=function(a,b,c,l,s){var d,n,p,m,w=[],x=[];d=null;switch(l){case "HEX":l=L;break;case "B64":l=M;break;default:throw"outputFormat must be HEX or B64";}if("SHA-1"===c)n=64,m=160;else if("SHA-224"===c)n=64,m=224;else if("SHA-256"===c)n=64,m=256;else if("SHA-384"===c)n=128,m=384;else if("SHA-512"===c)n=128,m=512;else throw"Chosen SHA variant is not supported";if("HEX"===b)d=B(a),p=d.binLen,d=d.value;else if("ASCII"===b||"TEXT"===b)d=J(a,h),p=d.binLen,d=d.value;else if("B64"===
b)d=K(a),p=d.binLen,d=d.value;else throw"inputFormat must be HEX, TEXT, ASCII, or B64";a=8*n;b=n/4-1;n<p/8?(d="SHA-1"===c?y(d,p):v(d,p,c),d[b]&=4294967040):n>p/8&&(d[b]&=4294967040);for(n=0;n<=b;n+=1)w[n]=d[n]^909522486,x[n]=d[n]^1549556828;c="SHA-1"===c?y(x.concat(y(w.concat(f),a+g)),a+m):v(x.concat(v(w.concat(f),a+g,c)),a+m,c);return l(c,N(s))}}function s(a,c){this.a=a;this.b=c}function J(a,c){var b=[],g,f=[],h=0,l;if("UTF8"===c)for(l=0;l<a.length;l+=1)for(g=a.charCodeAt(l),f=[],2048<g?(f[0]=224|
(g&61440)>>>12,f[1]=128|(g&4032)>>>6,f[2]=128|g&63):128<g?(f[0]=192|(g&1984)>>>6,f[1]=128|g&63):f[0]=g,g=0;g<f.length;g+=1)b[h>>>2]|=f[g]<<24-h%4*8,h+=1;else if("UTF16"===c)for(l=0;l<a.length;l+=1)b[h>>>2]|=a.charCodeAt(l)<<16-h%4*8,h+=2;return{value:b,binLen:8*h}}function B(a){var c=[],b=a.length,g,f;if(0!==b%2)throw"String of HEX type must be in byte increments";for(g=0;g<b;g+=2){f=parseInt(a.substr(g,2),16);if(isNaN(f))throw"String of HEX type contains invalid characters";c[g>>>3]|=f<<24-g%8*4}return{value:c,
binLen:4*b}}function K(a){var c=[],b=0,g,f,h,l,r;if(-1===a.search(/^[a-zA-Z0-9=+\/]+$/))throw"Invalid character in base-64 string";g=a.indexOf("=");a=a.replace(/\=/g,"");if(-1!==g&&g<a.length)throw"Invalid '=' found in base-64 string";for(f=0;f<a.length;f+=4){r=a.substr(f,4);for(h=l=0;h<r.length;h+=1)g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(r[h]),l|=g<<18-6*h;for(h=0;h<r.length-1;h+=1)c[b>>2]|=(l>>>16-8*h&255)<<24-b%4*8,b+=1}return{value:c,binLen:8*b}}function L(a,
c){var b="",g=4*a.length,f,h;for(f=0;f<g;f+=1)h=a[f>>>2]>>>8*(3-f%4),b+="0123456789abcdef".charAt(h>>>4&15)+"0123456789abcdef".charAt(h&15);return c.outputUpper?b.toUpperCase():b}function M(a,c){var b="",g=4*a.length,f,h,l;for(f=0;f<g;f+=3)for(l=(a[f>>>2]>>>8*(3-f%4)&255)<<16|(a[f+1>>>2]>>>8*(3-(f+1)%4)&255)<<8|a[f+2>>>2]>>>8*(3-(f+2)%4)&255,h=0;4>h;h+=1)b=8*f+6*h<=32*a.length?b+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(l>>>6*(3-h)&63):b+c.b64Pad;return b}function N(a){var c=
{outputUpper:!1,b64Pad:"="};try{a.hasOwnProperty("outputUpper")&&(c.outputUpper=a.outputUpper),a.hasOwnProperty("b64Pad")&&(c.b64Pad=a.b64Pad)}catch(b){}if("boolean"!==typeof c.outputUpper)throw"Invalid outputUpper formatting option";if("string"!==typeof c.b64Pad)throw"Invalid b64Pad formatting option";return c}function U(a,c){return a<<c|a>>>32-c}function u(a,c){return a>>>c|a<<32-c}function t(a,c){var b=null,b=new s(a.a,a.b);return b=32>=c?new s(b.a>>>c|b.b<<32-c&4294967295,b.b>>>c|b.a<<32-c&4294967295):
new s(b.b>>>c-32|b.a<<64-c&4294967295,b.a>>>c-32|b.b<<64-c&4294967295)}function O(a,c){var b=null;return b=32>=c?new s(a.a>>>c,a.b>>>c|a.a<<32-c&4294967295):new s(0,a.a>>>c-32)}function V(a,c,b){return a^c^b}function P(a,c,b){return a&c^~a&b}function W(a,c,b){return new s(a.a&c.a^~a.a&b.a,a.b&c.b^~a.b&b.b)}function Q(a,c,b){return a&c^a&b^c&b}function X(a,c,b){return new s(a.a&c.a^a.a&b.a^c.a&b.a,a.b&c.b^a.b&b.b^c.b&b.b)}function Y(a){return u(a,2)^u(a,13)^u(a,22)}function Z(a){var c=t(a,28),b=t(a,
34);a=t(a,39);return new s(c.a^b.a^a.a,c.b^b.b^a.b)}function $(a){return u(a,6)^u(a,11)^u(a,25)}function aa(a){var c=t(a,14),b=t(a,18);a=t(a,41);return new s(c.a^b.a^a.a,c.b^b.b^a.b)}function ba(a){return u(a,7)^u(a,18)^a>>>3}function ca(a){var c=t(a,1),b=t(a,8);a=O(a,7);return new s(c.a^b.a^a.a,c.b^b.b^a.b)}function da(a){return u(a,17)^u(a,19)^a>>>10}function ea(a){var c=t(a,19),b=t(a,61);a=O(a,6);return new s(c.a^b.a^a.a,c.b^b.b^a.b)}function R(a,c){var b=(a&65535)+(c&65535);return((a>>>16)+(c>>>
16)+(b>>>16)&65535)<<16|b&65535}function fa(a,c,b,g){var f=(a&65535)+(c&65535)+(b&65535)+(g&65535);return((a>>>16)+(c>>>16)+(b>>>16)+(g>>>16)+(f>>>16)&65535)<<16|f&65535}function S(a,c,b,g,f){var h=(a&65535)+(c&65535)+(b&65535)+(g&65535)+(f&65535);return((a>>>16)+(c>>>16)+(b>>>16)+(g>>>16)+(f>>>16)+(h>>>16)&65535)<<16|h&65535}function ga(a,c){var b,g,f;b=(a.b&65535)+(c.b&65535);g=(a.b>>>16)+(c.b>>>16)+(b>>>16);f=(g&65535)<<16|b&65535;b=(a.a&65535)+(c.a&65535)+(g>>>16);g=(a.a>>>16)+(c.a>>>16)+(b>>>
16);return new s((g&65535)<<16|b&65535,f)}function ha(a,c,b,g){var f,h,l;f=(a.b&65535)+(c.b&65535)+(b.b&65535)+(g.b&65535);h=(a.b>>>16)+(c.b>>>16)+(b.b>>>16)+(g.b>>>16)+(f>>>16);l=(h&65535)<<16|f&65535;f=(a.a&65535)+(c.a&65535)+(b.a&65535)+(g.a&65535)+(h>>>16);h=(a.a>>>16)+(c.a>>>16)+(b.a>>>16)+(g.a>>>16)+(f>>>16);return new s((h&65535)<<16|f&65535,l)}function ia(a,c,b,g,f){var h,l,r;h=(a.b&65535)+(c.b&65535)+(b.b&65535)+(g.b&65535)+(f.b&65535);l=(a.b>>>16)+(c.b>>>16)+(b.b>>>16)+(g.b>>>16)+(f.b>>>
16)+(h>>>16);r=(l&65535)<<16|h&65535;h=(a.a&65535)+(c.a&65535)+(b.a&65535)+(g.a&65535)+(f.a&65535)+(l>>>16);l=(a.a>>>16)+(c.a>>>16)+(b.a>>>16)+(g.a>>>16)+(f.a>>>16)+(h>>>16);return new s((l&65535)<<16|h&65535,r)}function y(a,c){var b=[],g,f,h,l,r,s,u=P,t=V,v=Q,d=U,n=R,p,m,w=S,x,q=[1732584193,4023233417,2562383102,271733878,3285377520];a[c>>>5]|=128<<24-c%32;a[(c+65>>>9<<4)+15]=c;x=a.length;for(p=0;p<x;p+=16){g=q[0];f=q[1];h=q[2];l=q[3];r=q[4];for(m=0;80>m;m+=1)b[m]=16>m?a[m+p]:d(b[m-3]^b[m-8]^b[m-
14]^b[m-16],1),s=20>m?w(d(g,5),u(f,h,l),r,1518500249,b[m]):40>m?w(d(g,5),t(f,h,l),r,1859775393,b[m]):60>m?w(d(g,5),v(f,h,l),r,2400959708,b[m]):w(d(g,5),t(f,h,l),r,3395469782,b[m]),r=l,l=h,h=d(f,30),f=g,g=s;q[0]=n(g,q[0]);q[1]=n(f,q[1]);q[2]=n(h,q[2]);q[3]=n(l,q[3]);q[4]=n(r,q[4])}return q}function v(a,c,b){var g,f,h,l,r,t,u,v,z,d,n,p,m,w,x,q,y,C,D,E,F,G,H,I,e,A=[],B,k=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,
1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,
2361852424,2428436474,2756734187,3204031479,3329325298];d=[3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428];f=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];if("SHA-224"===b||"SHA-256"===b)n=64,g=(c+65>>>9<<4)+15,w=16,x=1,e=Number,q=R,y=fa,C=S,D=ba,E=da,F=Y,G=$,I=Q,H=P,d="SHA-224"===b?d:f;else if("SHA-384"===b||"SHA-512"===b)n=80,g=(c+128>>>10<<5)+31,w=32,x=2,e=s,q=ga,y=ha,C=ia,D=ca,E=ea,F=Z,G=aa,I=X,H=W,k=[new e(k[0],
3609767458),new e(k[1],602891725),new e(k[2],3964484399),new e(k[3],2173295548),new e(k[4],4081628472),new e(k[5],3053834265),new e(k[6],2937671579),new e(k[7],3664609560),new e(k[8],2734883394),new e(k[9],1164996542),new e(k[10],1323610764),new e(k[11],3590304994),new e(k[12],4068182383),new e(k[13],991336113),new e(k[14],633803317),new e(k[15],3479774868),new e(k[16],2666613458),new e(k[17],944711139),new e(k[18],2341262773),new e(k[19],2007800933),new e(k[20],1495990901),new e(k[21],1856431235),
new e(k[22],3175218132),new e(k[23],2198950837),new e(k[24],3999719339),new e(k[25],766784016),new e(k[26],2566594879),new e(k[27],3203337956),new e(k[28],1034457026),new e(k[29],2466948901),new e(k[30],3758326383),new e(k[31],168717936),new e(k[32],1188179964),new e(k[33],1546045734),new e(k[34],1522805485),new e(k[35],2643833823),new e(k[36],2343527390),new e(k[37],1014477480),new e(k[38],1206759142),new e(k[39],344077627),new e(k[40],1290863460),new e(k[41],3158454273),new e(k[42],3505952657),
new e(k[43],106217008),new e(k[44],3606008344),new e(k[45],1432725776),new e(k[46],1467031594),new e(k[47],851169720),new e(k[48],3100823752),new e(k[49],1363258195),new e(k[50],3750685593),new e(k[51],3785050280),new e(k[52],3318307427),new e(k[53],3812723403),new e(k[54],2003034995),new e(k[55],3602036899),new e(k[56],1575990012),new e(k[57],1125592928),new e(k[58],2716904306),new e(k[59],442776044),new e(k[60],593698344),new e(k[61],3733110249),new e(k[62],2999351573),new e(k[63],3815920427),new e(3391569614,
3928383900),new e(3515267271,566280711),new e(3940187606,3454069534),new e(4118630271,4000239992),new e(116418474,1914138554),new e(174292421,2731055270),new e(289380356,3203993006),new e(460393269,320620315),new e(685471733,587496836),new e(852142971,1086792851),new e(1017036298,365543100),new e(1126000580,2618297676),new e(1288033470,3409855158),new e(1501505948,4234509866),new e(1607167915,987167468),new e(1816402316,1246189591)],d="SHA-384"===b?[new e(3418070365,d[0]),new e(1654270250,d[1]),new e(2438529370,
d[2]),new e(355462360,d[3]),new e(1731405415,d[4]),new e(41048885895,d[5]),new e(3675008525,d[6]),new e(1203062813,d[7])]:[new e(f[0],4089235720),new e(f[1],2227873595),new e(f[2],4271175723),new e(f[3],1595750129),new e(f[4],2917565137),new e(f[5],725511199),new e(f[6],4215389547),new e(f[7],327033209)];else throw"Unexpected error in SHA-2 implementation";a[c>>>5]|=128<<24-c%32;a[g]=c;B=a.length;for(p=0;p<B;p+=w){c=d[0];g=d[1];f=d[2];h=d[3];l=d[4];r=d[5];t=d[6];u=d[7];for(m=0;m<n;m+=1)A[m]=16>m?
new e(a[m*x+p],a[m*x+p+1]):y(E(A[m-2]),A[m-7],D(A[m-15]),A[m-16]),v=C(u,G(l),H(l,r,t),k[m],A[m]),z=q(F(c),I(c,g,f)),u=t,t=r,r=l,l=q(h,v),h=f,f=g,g=c,c=q(v,z);d[0]=q(c,d[0]);d[1]=q(g,d[1]);d[2]=q(f,d[2]);d[3]=q(h,d[3]);d[4]=q(l,d[4]);d[5]=q(r,d[5]);d[6]=q(t,d[6]);d[7]=q(u,d[7])}if("SHA-224"===b)a=[d[0],d[1],d[2],d[3],d[4],d[5],d[6]];else if("SHA-256"===b)a=d;else if("SHA-384"===b)a=[d[0].a,d[0].b,d[1].a,d[1].b,d[2].a,d[2].b,d[3].a,d[3].b,d[4].a,d[4].b,d[5].a,d[5].b];else if("SHA-512"===b)a=[d[0].a,
d[0].b,d[1].a,d[1].b,d[2].a,d[2].b,d[3].a,d[3].b,d[4].a,d[4].b,d[5].a,d[5].b,d[6].a,d[6].b,d[7].a,d[7].b];else throw"Unexpected error in SHA-2 implementation";return a}"function"===typeof define&&typeof define.amd?define(function(){return z}):"undefined"!==typeof exports?"undefined"!==typeof module&&module.exports?module.exports=exports=z:exports=z:T.jsSHA=z})(this);

/*! rasterizeHTML.js - v0.8.0 - 2014-02-17
* http://www.github.com/cburgmer/rasterizeHTML.js
* Copyright (c) 2014 Christoph Burgmer; Licensed MIT */
/* Integrated dependencies:
 * url (MIT License),
 * CSSOM (MIT License),
 * ayepromise (BSD License & WTFPL),
 * xmlserializer (MIT License) */
!function(a){"object"==typeof exports?module.exports=a():"function"==typeof define&&define.amd?define(a):"undefined"!=typeof window?window.CSSOM=a():"undefined"!=typeof global?global.CSSOM=a():"undefined"!=typeof self&&(self.CSSOM=a())}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);throw new Error("Cannot find module '"+g+"'")}var j=c[g]={exports:{}};b[g][0].call(j.exports,function(a){var c=b[g][1][a];return e(c?c:a)},j,j.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){var d={CSSRule:a("./CSSRule").CSSRule,MatcherList:a("./MatcherList").MatcherList};d.CSSDocumentRule=function(){d.CSSRule.call(this),this.matcher=new d.MatcherList,this.cssRules=[]},d.CSSDocumentRule.prototype=new d.CSSRule,d.CSSDocumentRule.prototype.constructor=d.CSSDocumentRule,d.CSSDocumentRule.prototype.type=10,Object.defineProperty(d.CSSDocumentRule.prototype,"cssText",{get:function(){for(var a=[],b=0,c=this.cssRules.length;c>b;b++)a.push(this.cssRules[b].cssText);return"@-moz-document "+this.matcher.matcherText+" {"+a.join("")+"}"}}),c.CSSDocumentRule=d.CSSDocumentRule},{"./CSSRule":7,"./MatcherList":13}],2:[function(a,b,c){var d={CSSStyleDeclaration:a("./CSSStyleDeclaration").CSSStyleDeclaration,CSSRule:a("./CSSRule").CSSRule};d.CSSFontFaceRule=function(){d.CSSRule.call(this),this.style=new d.CSSStyleDeclaration,this.style.parentRule=this},d.CSSFontFaceRule.prototype=new d.CSSRule,d.CSSFontFaceRule.prototype.constructor=d.CSSFontFaceRule,d.CSSFontFaceRule.prototype.type=5,Object.defineProperty(d.CSSFontFaceRule.prototype,"cssText",{get:function(){return"@font-face {"+this.style.cssText+"}"}}),c.CSSFontFaceRule=d.CSSFontFaceRule},{"./CSSRule":7,"./CSSStyleDeclaration":8}],3:[function(a,b,c){var d={CSSRule:a("./CSSRule").CSSRule,CSSStyleSheet:a("./CSSStyleSheet").CSSStyleSheet,MediaList:a("./MediaList").MediaList};d.CSSImportRule=function(){d.CSSRule.call(this),this.href="",this.media=new d.MediaList,this.styleSheet=new d.CSSStyleSheet},d.CSSImportRule.prototype=new d.CSSRule,d.CSSImportRule.prototype.constructor=d.CSSImportRule,d.CSSImportRule.prototype.type=3,Object.defineProperty(d.CSSImportRule.prototype,"cssText",{get:function(){var a=this.media.mediaText;return"@import url("+this.href+")"+(a?" "+a:"")+";"},set:function(a){for(var b,c,d=0,e="",f="";c=a.charAt(d);d++)switch(c){case" ":case"	":case"\r":case"\n":case"\f":"after-import"===e?e="url":f+=c;break;case"@":e||a.indexOf("@import",d)!==d||(e="after-import",d+="import".length,f="");break;case"u":if("url"===e&&a.indexOf("url(",d)===d){if(b=a.indexOf(")",d+1),-1===b)throw d+': ")" not found';d+="url(".length;var g=a.slice(d,b);g[0]===g[g.length-1]&&('"'===g[0]||"'"===g[0])&&(g=g.slice(1,-1)),this.href=g,d=b,e="media"}break;case'"':if("url"===e){if(b=a.indexOf('"',d+1),!b)throw d+": '\"' not found";this.href=a.slice(d+1,b),d=b,e="media"}break;case"'":if("url"===e){if(b=a.indexOf("'",d+1),!b)throw d+': "\'" not found';this.href=a.slice(d+1,b),d=b,e="media"}break;case";":"media"===e&&f&&(this.media.mediaText=f.trim());break;default:"media"===e&&(f+=c)}}}),c.CSSImportRule=d.CSSImportRule},{"./CSSRule":7,"./CSSStyleSheet":10,"./MediaList":14}],4:[function(a,b,c){var d={CSSRule:a("./CSSRule").CSSRule,CSSStyleDeclaration:a("./CSSStyleDeclaration").CSSStyleDeclaration};d.CSSKeyframeRule=function(){d.CSSRule.call(this),this.keyText="",this.style=new d.CSSStyleDeclaration,this.style.parentRule=this},d.CSSKeyframeRule.prototype=new d.CSSRule,d.CSSKeyframeRule.prototype.constructor=d.CSSKeyframeRule,d.CSSKeyframeRule.prototype.type=9,Object.defineProperty(d.CSSKeyframeRule.prototype,"cssText",{get:function(){return this.keyText+" {"+this.style.cssText+"} "}}),c.CSSKeyframeRule=d.CSSKeyframeRule},{"./CSSRule":7,"./CSSStyleDeclaration":8}],5:[function(a,b,c){var d={CSSRule:a("./CSSRule").CSSRule};d.CSSKeyframesRule=function(){d.CSSRule.call(this),this.name="",this.cssRules=[]},d.CSSKeyframesRule.prototype=new d.CSSRule,d.CSSKeyframesRule.prototype.constructor=d.CSSKeyframesRule,d.CSSKeyframesRule.prototype.type=8,Object.defineProperty(d.CSSKeyframesRule.prototype,"cssText",{get:function(){for(var a=[],b=0,c=this.cssRules.length;c>b;b++)a.push("  "+this.cssRules[b].cssText);return"@"+(this._vendorPrefix||"")+"keyframes "+this.name+" { \n"+a.join("\n")+"\n}"}}),c.CSSKeyframesRule=d.CSSKeyframesRule},{"./CSSRule":7}],6:[function(a,b,c){var d={CSSRule:a("./CSSRule").CSSRule,MediaList:a("./MediaList").MediaList};d.CSSMediaRule=function(){d.CSSRule.call(this),this.media=new d.MediaList,this.cssRules=[]},d.CSSMediaRule.prototype=new d.CSSRule,d.CSSMediaRule.prototype.constructor=d.CSSMediaRule,d.CSSMediaRule.prototype.type=4,Object.defineProperty(d.CSSMediaRule.prototype,"cssText",{get:function(){for(var a=[],b=0,c=this.cssRules.length;c>b;b++)a.push(this.cssRules[b].cssText);return"@media "+this.media.mediaText+" {"+a.join("")+"}"}}),c.CSSMediaRule=d.CSSMediaRule},{"./CSSRule":7,"./MediaList":14}],7:[function(a,b,c){var d={};d.CSSRule=function(){this.parentRule=null,this.parentStyleSheet=null},d.CSSRule.STYLE_RULE=1,d.CSSRule.IMPORT_RULE=3,d.CSSRule.MEDIA_RULE=4,d.CSSRule.FONT_FACE_RULE=5,d.CSSRule.PAGE_RULE=6,d.CSSRule.WEBKIT_KEYFRAMES_RULE=8,d.CSSRule.WEBKIT_KEYFRAME_RULE=9,d.CSSRule.prototype={constructor:d.CSSRule},c.CSSRule=d.CSSRule},{}],8:[function(a,b,c){var d={};d.CSSStyleDeclaration=function(){this.length=0,this.parentRule=null,this._importants={}},d.CSSStyleDeclaration.prototype={constructor:d.CSSStyleDeclaration,getPropertyValue:function(a){return this[a]||""},setProperty:function(a,b,c){if(this[a]){var d=Array.prototype.indexOf.call(this,a);0>d&&(this[this.length]=a,this.length++)}else this[this.length]=a,this.length++;this[a]=b,this._importants[a]=c},removeProperty:function(a){if(!(a in this))return"";var b=Array.prototype.indexOf.call(this,a);if(0>b)return"";var c=this[a];return this[a]="",Array.prototype.splice.call(this,b,1),c},getPropertyCSSValue:function(){},getPropertyPriority:function(a){return this._importants[a]||""},getPropertyShorthand:function(){},isPropertyImplicit:function(){},get cssText(){for(var a=[],b=0,c=this.length;c>b;++b){var d=this[b],e=this.getPropertyValue(d),f=this.getPropertyPriority(d);f&&(f=" !"+f),a[b]=d+": "+e+f+";"}return a.join(" ")},set cssText(a){var b,c;for(b=this.length;b--;)c=this[b],this[c]="";Array.prototype.splice.call(this,0,this.length),this._importants={};var e=d.parse("#bogus{"+a+"}").cssRules[0].style,f=e.length;for(b=0;f>b;++b)c=e[b],this.setProperty(e[b],e.getPropertyValue(c),e.getPropertyPriority(c))}},c.CSSStyleDeclaration=d.CSSStyleDeclaration,d.parse=a("./parse").parse},{"./parse":18}],9:[function(a,b,c){var d={CSSStyleDeclaration:a("./CSSStyleDeclaration").CSSStyleDeclaration,CSSRule:a("./CSSRule").CSSRule};d.CSSStyleRule=function(){d.CSSRule.call(this),this.selectorText="",this.style=new d.CSSStyleDeclaration,this.style.parentRule=this},d.CSSStyleRule.prototype=new d.CSSRule,d.CSSStyleRule.prototype.constructor=d.CSSStyleRule,d.CSSStyleRule.prototype.type=1,Object.defineProperty(d.CSSStyleRule.prototype,"cssText",{get:function(){var a;return a=this.selectorText?this.selectorText+" {"+this.style.cssText+"}":""},set:function(a){var b=d.CSSStyleRule.parse(a);this.style=b.style,this.selectorText=b.selectorText}}),d.CSSStyleRule.parse=function(a){for(var b,c,e,f=0,g="selector",h=f,i="",j={selector:!0,value:!0},k=new d.CSSStyleRule,l="";e=a.charAt(f);f++)switch(e){case" ":case"	":case"\r":case"\n":case"\f":if(j[g])switch(a.charAt(f-1)){case" ":case"	":case"\r":case"\n":case"\f":break;default:i+=" "}break;case'"':if(h=f+1,b=a.indexOf('"',h)+1,!b)throw'" is missing';i+=a.slice(f,b),f=b-1;break;case"'":if(h=f+1,b=a.indexOf("'",h)+1,!b)throw"' is missing";i+=a.slice(f,b),f=b-1;break;case"/":if("*"===a.charAt(f+1)){if(f+=2,b=a.indexOf("*/",f),-1===b)throw new SyntaxError("Missing */");f=b+1}else i+=e;break;case"{":"selector"===g&&(k.selectorText=i.trim(),i="",g="name");break;case":":"name"===g?(c=i.trim(),i="",g="value"):i+=e;break;case"!":"value"===g&&a.indexOf("!important",f)===f?(l="important",f+="important".length):i+=e;break;case";":"value"===g?(k.style.setProperty(c,i.trim(),l),l="",i="",g="name"):i+=e;break;case"}":if("value"===g)k.style.setProperty(c,i.trim(),l),l="",i="";else{if("name"===g)break;i+=e}g="selector";break;default:i+=e}return k},c.CSSStyleRule=d.CSSStyleRule},{"./CSSRule":7,"./CSSStyleDeclaration":8}],10:[function(a,b,c){var d={StyleSheet:a("./StyleSheet").StyleSheet,CSSStyleRule:a("./CSSStyleRule").CSSStyleRule};d.CSSStyleSheet=function(){d.StyleSheet.call(this),this.cssRules=[]},d.CSSStyleSheet.prototype=new d.StyleSheet,d.CSSStyleSheet.prototype.constructor=d.CSSStyleSheet,d.CSSStyleSheet.prototype.insertRule=function(a,b){if(0>b||b>this.cssRules.length)throw new RangeError("INDEX_SIZE_ERR");var c=d.parse(a).cssRules[0];return c.parentStyleSheet=this,this.cssRules.splice(b,0,c),b},d.CSSStyleSheet.prototype.deleteRule=function(a){if(0>a||a>=this.cssRules.length)throw new RangeError("INDEX_SIZE_ERR");this.cssRules.splice(a,1)},d.CSSStyleSheet.prototype.toString=function(){for(var a="",b=this.cssRules,c=0;c<b.length;c++)a+=b[c].cssText+"\n";return a},c.CSSStyleSheet=d.CSSStyleSheet,d.parse=a("./parse").parse},{"./CSSStyleRule":9,"./StyleSheet":15,"./parse":18}],11:[function(a,b,c){var d={};d.CSSValue=function(){},d.CSSValue.prototype={constructor:d.CSSValue,set cssText(a){var b=this._getConstructorName();throw new Exception('DOMException: property "cssText" of "'+b+'" is readonly!')},get cssText(){var a=this._getConstructorName();throw new Exception('getter "cssText" of "'+a+'" is not implemented!')},_getConstructorName:function(){var a=this.constructor.toString(),b=a.match(/function\s([^\(]+)/),c=b[1];return c}},c.CSSValue=d.CSSValue},{}],12:[function(a,b,c){var d={CSSValue:a("./CSSValue").CSSValue};d.CSSValueExpression=function(a,b){this._token=a,this._idx=b},d.CSSValueExpression.prototype=new d.CSSValue,d.CSSValueExpression.prototype.constructor=d.CSSValueExpression,d.CSSValueExpression.prototype.parse=function(){for(var a,b=this._token,c=this._idx,d="",e="",f="",g=[];;++c){if(d=b.charAt(c),""==d){f="css expression error: unfinished expression!";break}switch(d){case"(":g.push(d),e+=d;break;case")":g.pop(d),e+=d;break;case"/":(a=this._parseJSComment(b,c))?a.error?f="css expression error: unfinished comment in expression!":c=a.idx:(a=this._parseJSRexExp(b,c))?(c=a.idx,e+=a.text):e+=d;break;case"'":case'"':a=this._parseJSString(b,c,d),a?(c=a.idx,e+=a.text):e+=d;break;default:e+=d}if(f)break;if(0==g.length)break}var h;return h=f?{error:f}:{idx:c,expression:e}},d.CSSValueExpression.prototype._parseJSComment=function(a,b){var c,d=a.charAt(b+1);if("/"==d||"*"==d){var e,f,g=b;return"/"==d?f="\n":"*"==d&&(f="*/"),e=a.indexOf(f,g+1+1),-1!==e?(e=e+f.length-1,c=a.substring(b,e+1),{idx:e,text:c}):(error="css expression error: unfinished comment in expression!",{error:error})}return!1},d.CSSValueExpression.prototype._parseJSString=function(a,b,c){var d,e=this._findMatchedIdx(a,b,c);return-1===e?!1:(d=a.substring(b,e+c.length),{idx:e,text:d})},d.CSSValueExpression.prototype._parseJSRexExp=function(a,b){var c=a.substring(0,b).replace(/\s+$/,""),d=[/^$/,/\($/,/\[$/,/\!$/,/\+$/,/\-$/,/\*$/,/\/\s+/,/\%$/,/\=$/,/\>$/,/\<$/,/\&$/,/\|$/,/\^$/,/\~$/,/\?$/,/\,$/,/delete$/,/in$/,/instanceof$/,/new$/,/typeof$/,/void$/],e=d.some(function(a){return a.test(c)});if(e){var f="/";return this._parseJSString(a,b,f)}return!1},d.CSSValueExpression.prototype._findMatchedIdx=function(a,b,c){for(var d,e=b,f=-1;;){if(d=a.indexOf(c,e+1),-1===d){d=f;break}var g=a.substring(b+1,d),h=g.match(/\\+$/);if(!h||h[0]%2==0)break;e=d}var i=a.indexOf("\n",b+1);return d>i&&(d=f),d},c.CSSValueExpression=d.CSSValueExpression},{"./CSSValue":11}],13:[function(a,b,c){var d={};d.MatcherList=function(){this.length=0},d.MatcherList.prototype={constructor:d.MatcherList,get matcherText(){return Array.prototype.join.call(this,", ")},set matcherText(a){for(var b=a.split(","),c=this.length=b.length,d=0;c>d;d++)this[d]=b[d].trim()},appendMatcher:function(a){-1===Array.prototype.indexOf.call(this,a)&&(this[this.length]=a,this.length++)},deleteMatcher:function(a){var b=Array.prototype.indexOf.call(this,a);-1!==b&&Array.prototype.splice.call(this,b,1)}},c.MatcherList=d.MatcherList},{}],14:[function(a,b,c){var d={};d.MediaList=function(){this.length=0},d.MediaList.prototype={constructor:d.MediaList,get mediaText(){return Array.prototype.join.call(this,", ")},set mediaText(a){for(var b=a.split(","),c=this.length=b.length,d=0;c>d;d++)this[d]=b[d].trim()},appendMedium:function(a){-1===Array.prototype.indexOf.call(this,a)&&(this[this.length]=a,this.length++)},deleteMedium:function(a){var b=Array.prototype.indexOf.call(this,a);-1!==b&&Array.prototype.splice.call(this,b,1)}},c.MediaList=d.MediaList},{}],15:[function(a,b,c){var d={};d.StyleSheet=function(){this.parentStyleSheet=null},c.StyleSheet=d.StyleSheet},{}],16:[function(a,b,c){var d={CSSStyleSheet:a("./CSSStyleSheet").CSSStyleSheet,CSSStyleRule:a("./CSSStyleRule").CSSStyleRule,CSSMediaRule:a("./CSSMediaRule").CSSMediaRule,CSSStyleDeclaration:a("./CSSStyleDeclaration").CSSStyleDeclaration,CSSKeyframeRule:a("./CSSKeyframeRule").CSSKeyframeRule,CSSKeyframesRule:a("./CSSKeyframesRule").CSSKeyframesRule};d.clone=function e(a){var b=new d.CSSStyleSheet,c=a.cssRules;if(!c)return b;for(var f={1:d.CSSStyleRule,4:d.CSSMediaRule,8:d.CSSKeyframesRule,9:d.CSSKeyframeRule},g=0,h=c.length;h>g;g++){var i=c[g],j=b.cssRules[g]=new f[i.type],k=i.style;if(k){for(var l=j.style=new d.CSSStyleDeclaration,m=0,n=k.length;n>m;m++){var o=l[m]=k[m];l[o]=k[o],l._importants[o]=k.getPropertyPriority(o)}l.length=k.length}i.hasOwnProperty("keyText")&&(j.keyText=i.keyText),i.hasOwnProperty("selectorText")&&(j.selectorText=i.selectorText),i.hasOwnProperty("mediaText")&&(j.mediaText=i.mediaText),i.hasOwnProperty("cssRules")&&(j.cssRules=e(i).cssRules)}return b},c.clone=d.clone},{"./CSSKeyframeRule":4,"./CSSKeyframesRule":5,"./CSSMediaRule":6,"./CSSStyleDeclaration":8,"./CSSStyleRule":9,"./CSSStyleSheet":10}],17:[function(a,b,c){"use strict";c.CSSStyleDeclaration=a("./CSSStyleDeclaration").CSSStyleDeclaration,c.CSSRule=a("./CSSRule").CSSRule,c.CSSStyleRule=a("./CSSStyleRule").CSSStyleRule,c.MediaList=a("./MediaList").MediaList,c.CSSMediaRule=a("./CSSMediaRule").CSSMediaRule,c.CSSImportRule=a("./CSSImportRule").CSSImportRule,c.CSSFontFaceRule=a("./CSSFontFaceRule").CSSFontFaceRule,c.StyleSheet=a("./StyleSheet").StyleSheet,c.CSSStyleSheet=a("./CSSStyleSheet").CSSStyleSheet,c.CSSKeyframesRule=a("./CSSKeyframesRule").CSSKeyframesRule,c.CSSKeyframeRule=a("./CSSKeyframeRule").CSSKeyframeRule,c.MatcherList=a("./MatcherList").MatcherList,c.CSSDocumentRule=a("./CSSDocumentRule").CSSDocumentRule,c.CSSValue=a("./CSSValue").CSSValue,c.CSSValueExpression=a("./CSSValueExpression").CSSValueExpression,c.parse=a("./parse").parse,c.clone=a("./clone").clone},{"./CSSDocumentRule":1,"./CSSFontFaceRule":2,"./CSSImportRule":3,"./CSSKeyframeRule":4,"./CSSKeyframesRule":5,"./CSSMediaRule":6,"./CSSRule":7,"./CSSStyleDeclaration":8,"./CSSStyleRule":9,"./CSSStyleSheet":10,"./CSSValue":11,"./CSSValueExpression":12,"./MatcherList":13,"./MediaList":14,"./StyleSheet":15,"./clone":16,"./parse":18}],18:[function(a,b,c){var d={};d.parse=function(a){for(var b,c,e,f,g,h,i,j,k,l,m=0,n="before-selector",o="",p={selector:!0,value:!0,atRule:!0,"importRule-begin":!0,importRule:!0,atBlock:!0,"documentRule-begin":!0},q=new d.CSSStyleSheet,r=q,s="",t=/@(-(?:\w+-)+)?keyframes/g,u=function(b){var c=a.substring(0,m).split("\n"),d=c.length,e=c.pop().length+1,f=new Error(b+" (line "+d+", char "+e+")");throw f.line=d,f.char=e,f.styleSheet=q,f};l=a.charAt(m);m++)switch(l){case" ":case"	":case"\r":case"\n":case"\f":p[n]&&(o+=l);break;case'"':b=m+1;do b=a.indexOf('"',b)+1,b||u('Unmatched "');while("\\"===a[b-2]);switch(o+=a.slice(m,b),m=b-1,n){case"before-value":n="value";break;case"importRule-begin":n="importRule"}break;case"'":b=m+1;do b=a.indexOf("'",b)+1,b||u("Unmatched '");while("\\"===a[b-2]);switch(o+=a.slice(m,b),m=b-1,n){case"before-value":n="value";break;case"importRule-begin":n="importRule"}break;case"/":"*"===a.charAt(m+1)?(m+=2,b=a.indexOf("*/",m),-1===b?u("Missing */"):m=b+1):o+=l,"importRule-begin"===n&&(o+=" ",n="importRule");break;case"@":if(a.indexOf("@-moz-document",m)===m){n="documentRule-begin",k=new d.CSSDocumentRule,k.__starts=m,m+="-moz-document".length,o="";break}if(a.indexOf("@media",m)===m){n="atBlock",g=new d.CSSMediaRule,g.__starts=m,m+="media".length,o="";break}if(a.indexOf("@import",m)===m){n="importRule-begin",m+="import".length,o+="@import";break}if(a.indexOf("@font-face",m)===m){n="fontFaceRule-begin",m+="font-face".length,i=new d.CSSFontFaceRule,i.__starts=m,o="";break}t.lastIndex=m;var v=t.exec(a);if(v&&v.index===m){n="keyframesRule-begin",j=new d.CSSKeyframesRule,j.__starts=m,j._vendorPrefix=v[1],m+=v[0].length-1,o="";break}"selector"==n&&(n="atRule"),o+=l;break;case"{":"selector"===n||"atRule"===n?(f.selectorText=o.trim(),f.style.__starts=m,o="",n="before-name"):"atBlock"===n?(g.media.mediaText=o.trim(),r=c=g,g.parentStyleSheet=q,o="",n="before-selector"):"fontFaceRule-begin"===n?(c&&(i.parentRule=c),i.parentStyleSheet=q,f=i,o="",n="before-name"):"keyframesRule-begin"===n?(j.name=o.trim(),c&&(j.parentRule=c),j.parentStyleSheet=q,r=c=j,o="",n="keyframeRule-begin"):"keyframeRule-begin"===n?(f=new d.CSSKeyframeRule,f.keyText=o.trim(),f.__starts=m,o="",n="before-name"):"documentRule-begin"===n&&(k.matcher.matcherText=o.trim(),c&&(k.parentRule=c),r=c=k,k.parentStyleSheet=q,o="",n="before-selector");break;case":":"name"===n?(e=o.trim(),o="",n="before-value"):o+=l;break;case"(":if("value"===n)if("expression"==o.trim()){var w=new d.CSSValueExpression(a,m).parse();w.error?u(w.error):(o+=w.expression,m=w.idx)}else b=a.indexOf(")",m+1),-1===b&&u('Unmatched "("'),o+=a.slice(m,b+1),m=b;else o+=l;break;case"!":"value"===n&&a.indexOf("!important",m)===m?(s="important",m+="important".length):o+=l;break;case";":switch(n){case"value":f.style.setProperty(e,o.trim(),s),s="",o="",n="before-name";break;case"atRule":o="",n="before-selector";break;case"importRule":h=new d.CSSImportRule,h.parentStyleSheet=h.styleSheet.parentStyleSheet=q,h.cssText=o+l,q.cssRules.push(h),o="",n="before-selector";break;default:o+=l}break;case"}":switch(n){case"value":f.style.setProperty(e,o.trim(),s),s="";case"before-name":case"name":f.__ends=m+1,c&&(f.parentRule=c),f.parentStyleSheet=q,r.cssRules.push(f),o="",n=r.constructor===d.CSSKeyframesRule?"keyframeRule-begin":"before-selector";break;case"keyframeRule-begin":case"before-selector":case"selector":c||u("Unexpected }"),r.__ends=m+1,q.cssRules.push(r),r=q,c=null,o="",n="before-selector"}break;default:switch(n){case"before-selector":n="selector",f=new d.CSSStyleRule,f.__starts=m;break;case"before-name":n="name";break;case"before-value":n="value";break;case"importRule-begin":n="importRule"}o+=l}return q},c.parse=d.parse,d.CSSStyleSheet=a("./CSSStyleSheet").CSSStyleSheet,d.CSSStyleRule=a("./CSSStyleRule").CSSStyleRule,d.CSSImportRule=a("./CSSImportRule").CSSImportRule,d.CSSMediaRule=a("./CSSMediaRule").CSSMediaRule,d.CSSFontFaceRule=a("./CSSFontFaceRule").CSSFontFaceRule,d.CSSStyleDeclaration=a("./CSSStyleDeclaration").CSSStyleDeclaration,d.CSSKeyframeRule=a("./CSSKeyframeRule").CSSKeyframeRule,d.CSSKeyframesRule=a("./CSSKeyframesRule").CSSKeyframesRule,d.CSSValueExpression=a("./CSSValueExpression").CSSValueExpression,d.CSSDocumentRule=a("./CSSDocumentRule").CSSDocumentRule},{"./CSSDocumentRule":1,"./CSSFontFaceRule":2,"./CSSImportRule":3,"./CSSKeyframeRule":4,"./CSSKeyframesRule":5,"./CSSMediaRule":6,"./CSSStyleDeclaration":8,"./CSSStyleRule":9,"./CSSStyleSheet":10,"./CSSValueExpression":12}]},{},[17])(17)}),!function(a){"object"==typeof exports?module.exports=a():"function"==typeof define&&define.amd?define(a):"undefined"!=typeof window?window.url=a():"undefined"!=typeof global?global.url=a():"undefined"!=typeof self&&(self.url=a())}(function(){var a;return function b(a,c,d){function e(g,h){if(!c[g]){if(!a[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);throw new Error("Cannot find module '"+g+"'")}var j=c[g]={exports:{}};a[g][0].call(j.exports,function(b){var c=a[g][1][b];return e(c?c:b)},j,j.exports,b,a,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){function d(a){return"[object Array]"===j.call(a)}function e(a,b){var c;if(null===a)c={__proto__:null};else{if("object"!=typeof a)throw new TypeError("typeof prototype["+typeof a+"] != 'object'");var d=function(){};d.prototype=a,c=new d,c.__proto__=a}return"undefined"!=typeof b&&Object.defineProperties&&Object.defineProperties(c,b),c}function f(a){return"object"!=typeof a&&"function"!=typeof a||null===a}function g(a){if(f(a))throw new TypeError("Object.keys called on a non-object");var b=[];for(var c in a)k.call(a,c)&&b.push(c);return b}function h(a){if(f(a))throw new TypeError("Object.getOwnPropertyNames called on a non-object");var b=g(a);return c.isArray(a)&&-1===c.indexOf(a,"length")&&b.push("length"),b}function i(a,b){return{value:a[b]}}var j=Object.prototype.toString,k=Object.prototype.hasOwnProperty;c.isArray="function"==typeof Array.isArray?Array.isArray:d,c.indexOf=function(a,b){if(a.indexOf)return a.indexOf(b);for(var c=0;c<a.length;c++)if(b===a[c])return c;return-1},c.filter=function(a,b){if(a.filter)return a.filter(b);for(var c=[],d=0;d<a.length;d++)b(a[d],d,a)&&c.push(a[d]);return c},c.forEach=function(a,b,c){if(a.forEach)return a.forEach(b,c);for(var d=0;d<a.length;d++)b.call(c,a[d],d,a)},c.map=function(a,b){if(a.map)return a.map(b);for(var c=new Array(a.length),d=0;d<a.length;d++)c[d]=b(a[d],d,a);return c},c.reduce=function(a,b,c){if(a.reduce)return a.reduce(b,c);var d,e=!1;2<arguments.length&&(d=c,e=!0);for(var f=0,g=a.length;g>f;++f)a.hasOwnProperty(f)&&(e?d=b(d,a[f],f,a):(d=a[f],e=!0));return d},c.substr="b"!=="ab".substr(-1)?function(a,b,c){return 0>b&&(b=a.length+b),a.substr(b,c)}:function(a,b,c){return a.substr(b,c)},c.trim=function(a){return a.trim?a.trim():a.replace(/^\s+|\s+$/g,"")},c.bind=function(){var a=Array.prototype.slice.call(arguments),b=a.shift();if(b.bind)return b.bind.apply(b,a);var c=a.shift();return function(){b.apply(c,a.concat([Array.prototype.slice.call(arguments)]))}},c.create="function"==typeof Object.create?Object.create:e;var l="function"==typeof Object.keys?Object.keys:g,m="function"==typeof Object.getOwnPropertyNames?Object.getOwnPropertyNames:h;if((new Error).hasOwnProperty("description")){var n=function(a,b){return"[object Error]"===j.call(a)&&(b=c.filter(b,function(a){return"description"!==a&&"number"!==a&&"message"!==a})),b};c.keys=function(a){return n(a,l(a))},c.getOwnPropertyNames=function(a){return n(a,m(a))}}else c.keys=l,c.getOwnPropertyNames=m;if("function"==typeof Object.getOwnPropertyDescriptor)try{Object.getOwnPropertyDescriptor({a:1},"a"),c.getOwnPropertyDescriptor=Object.getOwnPropertyDescriptor}catch(o){c.getOwnPropertyDescriptor=function(a,b){try{return Object.getOwnPropertyDescriptor(a,b)}catch(c){return i(a,b)}}}else c.getOwnPropertyDescriptor=i},{}],2:[function(a,b){function c(a,b){return m.isUndefined(b)?""+b:!m.isNumber(b)||!isNaN(b)&&isFinite(b)?m.isFunction(b)||m.isRegExp(b)?b.toString():b:b.toString()}function d(a,b){return m.isString(a)?a.length<b?a:a.slice(0,b):a}function e(a){return d(JSON.stringify(a.actual,c),128)+" "+a.operator+" "+d(JSON.stringify(a.expected,c),128)}function f(a,b,c,d,e){throw new p.AssertionError({message:c,actual:a,expected:b,operator:d,stackStartFunction:e})}function g(a,b){a||f(a,!0,b,"==",p.ok)}function h(a,b){if(a===b)return!0;if(m.isBuffer(a)&&m.isBuffer(b)){if(a.length!=b.length)return!1;for(var c=0;c<a.length;c++)if(a[c]!==b[c])return!1;return!0}return m.isDate(a)&&m.isDate(b)?a.getTime()===b.getTime():m.isRegExp(a)&&m.isRegExp(b)?a.source===b.source&&a.global===b.global&&a.multiline===b.multiline&&a.lastIndex===b.lastIndex&&a.ignoreCase===b.ignoreCase:m.isObject(a)||m.isObject(b)?j(a,b):a==b}function i(a){return"[object Arguments]"==Object.prototype.toString.call(a)}function j(a,b){if(m.isNullOrUndefined(a)||m.isNullOrUndefined(b))return!1;if(a.prototype!==b.prototype)return!1;if(i(a))return i(b)?(a=o.call(a),b=o.call(b),h(a,b)):!1;try{var c,d,e=n.keys(a),f=n.keys(b)}catch(g){return!1}if(e.length!=f.length)return!1;for(e.sort(),f.sort(),d=e.length-1;d>=0;d--)if(e[d]!=f[d])return!1;for(d=e.length-1;d>=0;d--)if(c=e[d],!h(a[c],b[c]))return!1;return!0}function k(a,b){return a&&b?"[object RegExp]"==Object.prototype.toString.call(b)?b.test(a):a instanceof b?!0:b.call({},a)===!0?!0:!1:!1}function l(a,b,c,d){var e;m.isString(c)&&(d=c,c=null);try{b()}catch(g){e=g}if(d=(c&&c.name?" ("+c.name+").":".")+(d?" "+d:"."),a&&!e&&f(e,c,"Missing expected exception"+d),!a&&k(e,c)&&f(e,c,"Got unwanted exception"+d),a&&e&&c&&!k(e,c)||!a&&e)throw e}var m=a("util"),n=a("_shims"),o=Array.prototype.slice,p=b.exports=g;p.AssertionError=function(a){this.name="AssertionError",this.actual=a.actual,this.expected=a.expected,this.operator=a.operator,this.message=a.message||e(this)},m.inherits(p.AssertionError,Error),p.fail=f,p.ok=g,p.equal=function(a,b,c){a!=b&&f(a,b,c,"==",p.equal)},p.notEqual=function(a,b,c){a==b&&f(a,b,c,"!=",p.notEqual)},p.deepEqual=function(a,b,c){h(a,b)||f(a,b,c,"deepEqual",p.deepEqual)},p.notDeepEqual=function(a,b,c){h(a,b)&&f(a,b,c,"notDeepEqual",p.notDeepEqual)},p.strictEqual=function(a,b,c){a!==b&&f(a,b,c,"===",p.strictEqual)},p.notStrictEqual=function(a,b,c){a===b&&f(a,b,c,"!==",p.notStrictEqual)},p.throws=function(){l.apply(this,[!0].concat(o.call(arguments)))},p.doesNotThrow=function(){l.apply(this,[!1].concat(o.call(arguments)))},p.ifError=function(a){if(a)throw a}},{_shims:1,util:4}],3:[function(a,b,c){function d(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function e(a){return a.charCodeAt(0)}var f=c,g=a("util"),h=a("_shims"),i=a("buffer").Buffer;f.unescapeBuffer=function(a,b){for(var c,d,f,g=new i(a.length),h="CHAR",j=0,k=0;j<=a.length;j++){var l=a.charCodeAt(j);switch(h){case"CHAR":switch(l){case e("%"):c=0,d=0,h="HEX0";break;case e("+"):b&&(l=e(" "));default:g[k++]=l}break;case"HEX0":if(h="HEX1",f=l,e("0")<=l&&l<=e("9"))c=l-e("0");else if(e("a")<=l&&l<=e("f"))c=l-e("a")+10;else{if(!(e("A")<=l&&l<=e("F"))){g[k++]=e("%"),g[k++]=l,h="CHAR";break}c=l-e("A")+10}break;case"HEX1":if(h="CHAR",e("0")<=l&&l<=e("9"))d=l-e("0");else if(e("a")<=l&&l<=e("f"))d=l-e("a")+10;else{if(!(e("A")<=l&&l<=e("F"))){g[k++]=e("%"),g[k++]=f,g[k++]=l;break}d=l-e("A")+10}g[k++]=16*c+d}}return g.slice(0,k-1)},f.unescape=function(a,b){return f.unescapeBuffer(a,b).toString()},f.escape=function(a){return encodeURIComponent(a)};var j=function(a){return g.isString(a)?a:g.isBoolean(a)?a?"true":"false":g.isNumber(a)?isFinite(a)?a:"":""};f.stringify=f.encode=function(a,b,c,d){return b=b||"&",c=c||"=",g.isNull(a)&&(a=void 0),g.isObject(a)?h.map(h.keys(a),function(d){var e=f.escape(j(d))+c;return g.isArray(a[d])?h.map(a[d],function(a){return e+f.escape(j(a))}).join(b):e+f.escape(j(a[d]))}).join(b):d?f.escape(j(d))+c+f.escape(j(a)):""},f.parse=f.decode=function(a,b,c,e){b=b||"&",c=c||"=";var h={};if(!g.isString(a)||0===a.length)return h;var i=/\+/g;a=a.split(b);var j=1e3;e&&g.isNumber(e.maxKeys)&&(j=e.maxKeys);var k=a.length;j>0&&k>j&&(k=j);for(var l=0;k>l;++l){var m,n,o,p,q=a[l].replace(i,"%20"),r=q.indexOf(c);r>=0?(m=q.substr(0,r),n=q.substr(r+1)):(m=q,n="");try{o=decodeURIComponent(m),p=decodeURIComponent(n)}catch(s){o=f.unescape(m,!0),p=f.unescape(n,!0)}d(h,o)?g.isArray(h[o])?h[o].push(p):h[o]=[h[o],p]:h[o]=p}return h}},{_shims:1,buffer:6,util:4}],4:[function(a,b,c){function d(a,b){var d={seen:[],stylize:f};return arguments.length>=3&&(d.depth=arguments[2]),arguments.length>=4&&(d.colors=arguments[3]),o(b)?d.showHidden=b:b&&c._extend(d,b),u(d.showHidden)&&(d.showHidden=!1),u(d.depth)&&(d.depth=2),u(d.colors)&&(d.colors=!1),u(d.customInspect)&&(d.customInspect=!0),d.colors&&(d.stylize=e),h(d,a,d.depth)}function e(a,b){var c=d.styles[b];return c?"["+d.colors[c][0]+"m"+a+"["+d.colors[c][1]+"m":a}function f(a){return a}function g(a){var b={};return G.forEach(a,function(a){b[a]=!0}),b}function h(a,b,d){if(a.customInspect&&b&&z(b.inspect)&&b.inspect!==c.inspect&&(!b.constructor||b.constructor.prototype!==b)){var e=b.inspect(d);return s(e)||(e=h(a,e,d)),e}var f=i(a,b);if(f)return f;var o=G.keys(b),p=g(o);if(a.showHidden&&(o=G.getOwnPropertyNames(b)),0===o.length){if(z(b)){var q=b.name?": "+b.name:"";return a.stylize("[Function"+q+"]","special")}if(v(b))return a.stylize(RegExp.prototype.toString.call(b),"regexp");if(x(b))return a.stylize(Date.prototype.toString.call(b),"date");if(y(b))return j(b)}var r="",t=!1,u=["{","}"];if(n(b)&&(t=!0,u=["[","]"]),z(b)){var w=b.name?": "+b.name:"";r=" [Function"+w+"]"}if(v(b)&&(r=" "+RegExp.prototype.toString.call(b)),x(b)&&(r=" "+Date.prototype.toUTCString.call(b)),y(b)&&(r=" "+j(b)),0===o.length&&(!t||0==b.length))return u[0]+r+u[1];if(0>d)return v(b)?a.stylize(RegExp.prototype.toString.call(b),"regexp"):a.stylize("[Object]","special");a.seen.push(b);var A;return A=t?k(a,b,d,p,o):o.map(function(c){return l(a,b,d,p,c,t)}),a.seen.pop(),m(A,r,u)}function i(a,b){if(u(b))return a.stylize("undefined","undefined");if(s(b)){var c="'"+JSON.stringify(b).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return a.stylize(c,"string")}return r(b)?a.stylize(""+b,"number"):o(b)?a.stylize(""+b,"boolean"):p(b)?a.stylize("null","null"):void 0}function j(a){return"["+Error.prototype.toString.call(a)+"]"}function k(a,b,c,d,e){for(var f=[],g=0,h=b.length;h>g;++g)F(b,String(g))?f.push(l(a,b,c,d,String(g),!0)):f.push("");return G.forEach(e,function(e){e.match(/^\d+$/)||f.push(l(a,b,c,d,e,!0))}),f}function l(a,b,c,d,e,f){var g,i,j;if(j=G.getOwnPropertyDescriptor(b,e)||{value:b[e]},j.get?i=j.set?a.stylize("[Getter/Setter]","special"):a.stylize("[Getter]","special"):j.set&&(i=a.stylize("[Setter]","special")),F(d,e)||(g="["+e+"]"),i||(G.indexOf(a.seen,j.value)<0?(i=p(c)?h(a,j.value,null):h(a,j.value,c-1),i.indexOf("\n")>-1&&(i=f?i.split("\n").map(function(a){return"  "+a}).join("\n").substr(2):"\n"+i.split("\n").map(function(a){return"   "+a}).join("\n"))):i=a.stylize("[Circular]","special")),u(g)){if(f&&e.match(/^\d+$/))return i;g=JSON.stringify(""+e),g.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(g=g.substr(1,g.length-2),g=a.stylize(g,"name")):(g=g.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),g=a.stylize(g,"string"))}return g+": "+i}function m(a,b,c){var d=0,e=G.reduce(a,function(a,b){return d++,b.indexOf("\n")>=0&&d++,a+b.replace(/\u001b\[\d\d?m/g,"").length+1},0);return e>60?c[0]+(""===b?"":b+"\n ")+" "+a.join(",\n  ")+" "+c[1]:c[0]+b+" "+a.join(", ")+" "+c[1]}function n(a){return G.isArray(a)}function o(a){return"boolean"==typeof a}function p(a){return null===a}function q(a){return null==a}function r(a){return"number"==typeof a}function s(a){return"string"==typeof a}function t(a){return"symbol"==typeof a}function u(a){return void 0===a}function v(a){return w(a)&&"[object RegExp]"===C(a)}function w(a){return"object"==typeof a&&a}function x(a){return w(a)&&"[object Date]"===C(a)}function y(a){return w(a)&&"[object Error]"===C(a)}function z(a){return"function"==typeof a}function A(a){return null===a||"boolean"==typeof a||"number"==typeof a||"string"==typeof a||"symbol"==typeof a||"undefined"==typeof a}function B(a){return a&&"object"==typeof a&&"function"==typeof a.copy&&"function"==typeof a.fill&&"function"==typeof a.binarySlice}function C(a){return Object.prototype.toString.call(a)}function D(a){return 10>a?"0"+a.toString(10):a.toString(10)}function E(){var a=new Date,b=[D(a.getHours()),D(a.getMinutes()),D(a.getSeconds())].join(":");return[a.getDate(),I[a.getMonth()],b].join(" ")
}function F(a,b){return Object.prototype.hasOwnProperty.call(a,b)}var G=a("_shims"),H=/%[sdj%]/g;c.format=function(a){if(!s(a)){for(var b=[],c=0;c<arguments.length;c++)b.push(d(arguments[c]));return b.join(" ")}for(var c=1,e=arguments,f=e.length,g=String(a).replace(H,function(a){if("%%"===a)return"%";if(c>=f)return a;switch(a){case"%s":return String(e[c++]);case"%d":return Number(e[c++]);case"%j":try{return JSON.stringify(e[c++])}catch(b){return"[Circular]"}default:return a}}),h=e[c];f>c;h=e[++c])g+=p(h)||!w(h)?" "+h:" "+d(h);return g},c.inspect=d,d.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},d.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"},c.isArray=n,c.isBoolean=o,c.isNull=p,c.isNullOrUndefined=q,c.isNumber=r,c.isString=s,c.isSymbol=t,c.isUndefined=u,c.isRegExp=v,c.isObject=w,c.isDate=x,c.isError=y,c.isFunction=z,c.isPrimitive=A,c.isBuffer=B;var I=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];c.log=function(){console.log("%s - %s",E(),c.format.apply(c,arguments))},c.inherits=function(a,b){a.super_=b,a.prototype=G.create(b.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}})},c._extend=function(a,b){if(!b||!w(b))return a;for(var c=G.keys(b),d=c.length;d--;)a[c[d]]=b[c[d]];return a}},{_shims:1}],5:[function(a,b,c){c.readIEEE754=function(a,b,c,d,e){var f,g,h=8*e-d-1,i=(1<<h)-1,j=i>>1,k=-7,l=c?0:e-1,m=c?1:-1,n=a[b+l];for(l+=m,f=n&(1<<-k)-1,n>>=-k,k+=h;k>0;f=256*f+a[b+l],l+=m,k-=8);for(g=f&(1<<-k)-1,f>>=-k,k+=d;k>0;g=256*g+a[b+l],l+=m,k-=8);if(0===f)f=1-j;else{if(f===i)return g?0/0:1/0*(n?-1:1);g+=Math.pow(2,d),f-=j}return(n?-1:1)*g*Math.pow(2,f-d)},c.writeIEEE754=function(a,b,c,d,e,f){var g,h,i,j=8*f-e-1,k=(1<<j)-1,l=k>>1,m=23===e?Math.pow(2,-24)-Math.pow(2,-77):0,n=d?f-1:0,o=d?-1:1,p=0>b||0===b&&0>1/b?1:0;for(b=Math.abs(b),isNaN(b)||1/0===b?(h=isNaN(b)?1:0,g=k):(g=Math.floor(Math.log(b)/Math.LN2),b*(i=Math.pow(2,-g))<1&&(g--,i*=2),b+=g+l>=1?m/i:m*Math.pow(2,1-l),b*i>=2&&(g++,i/=2),g+l>=k?(h=0,g=k):g+l>=1?(h=(b*i-1)*Math.pow(2,e),g+=l):(h=b*Math.pow(2,l-1)*Math.pow(2,e),g=0));e>=8;a[c+n]=255&h,n+=o,h/=256,e-=8);for(g=g<<e|h,j+=e;j>0;a[c+n]=255&g,n+=o,g/=256,j-=8);a[c+n-o]|=128*p}},{}],6:[function(a,b,c){function d(a){return a.trim?a.trim():a.replace(/^\s+|\s+$/g,"")}function e(b,c,f){if(E||(E=a("assert")),!(this instanceof e))return new e(b,c,f);if(this.parent=this,this.offset=0,"base64"==c&&"string"==typeof b)for(b=d(b);b.length%4!=0;)b+="=";var h;if("number"==typeof f){this.length=g(c);for(var j=0;j<this.length;j++)this[j]=b.get(j+f)}else{switch(h=typeof b){case"number":this.length=g(b);break;case"string":this.length=e.byteLength(b,c);break;case"object":this.length=g(b.length);break;default:throw new Error("First argument needs to be a number, array or string.")}if(i(b))for(var j=0;j<this.length;j++)this[j]=b instanceof e?b.readUInt8(j):b[j];else if("string"==h)this.length=this.write(b,0,c);else if("number"===h)for(var j=0;j<this.length;j++)this[j]=0}}function f(a,b,c){return"number"!=typeof a?c:(a=~~a,a>=b?b:a>=0?a:(a+=b,a>=0?a:0))}function g(a){return a=~~Math.ceil(+a),0>a?0:a}function h(a){return(Array.isArray||function(a){return"[object Array]"=={}.toString.apply(a)})(a)}function i(a){return h(a)||e.isBuffer(a)||a&&"object"==typeof a&&"number"==typeof a.length}function j(a){return 16>a?"0"+a.toString(16):a.toString(16)}function k(a){for(var b=[],c=0;c<a.length;c++)if(a.charCodeAt(c)<=127)b.push(a.charCodeAt(c));else for(var d=encodeURIComponent(a.charAt(c)).substr(1).split("%"),e=0;e<d.length;e++)b.push(parseInt(d[e],16));return b}function l(a){for(var b=[],c=0;c<a.length;c++)b.push(255&a.charCodeAt(c));return b}function m(b){return a("base64-js").toByteArray(b)}function n(a,b,c,d){for(var e=0;d>e&&!(e+c>=b.length||e>=a.length);)b[e+c]=a[e],e++;return e}function o(a){try{return decodeURIComponent(a)}catch(b){return String.fromCharCode(65533)}}function p(a,b,c,d){var e=0;return d||(E.ok("boolean"==typeof c,"missing or invalid endian"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b+1<a.length,"Trying to read beyond buffer length")),b>=a.length?0:(c?(e=a[b]<<8,b+1<a.length&&(e|=a[b+1])):(e=a[b],b+1<a.length&&(e|=a[b+1]<<8)),e)}function q(a,b,c,d){var e=0;return d||(E.ok("boolean"==typeof c,"missing or invalid endian"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b+3<a.length,"Trying to read beyond buffer length")),b>=a.length?0:(c?(b+1<a.length&&(e=a[b+1]<<16),b+2<a.length&&(e|=a[b+2]<<8),b+3<a.length&&(e|=a[b+3]),e+=a[b]<<24>>>0):(b+2<a.length&&(e=a[b+2]<<16),b+1<a.length&&(e|=a[b+1]<<8),e|=a[b],b+3<a.length&&(e+=a[b+3]<<24>>>0)),e)}function r(a,b,c,d){var e,f;return d||(E.ok("boolean"==typeof c,"missing or invalid endian"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b+1<a.length,"Trying to read beyond buffer length")),f=p(a,b,c,d),e=32768&f,e?-1*(65535-f+1):f}function s(a,b,c,d){var e,f;return d||(E.ok("boolean"==typeof c,"missing or invalid endian"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b+3<a.length,"Trying to read beyond buffer length")),f=q(a,b,c,d),e=2147483648&f,e?-1*(4294967295-f+1):f}function t(b,c,d,e){return e||(E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(c+3<b.length,"Trying to read beyond buffer length")),a("./buffer_ieee754").readIEEE754(b,c,d,23,4)}function u(b,c,d,e){return e||(E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(c+7<b.length,"Trying to read beyond buffer length")),a("./buffer_ieee754").readIEEE754(b,c,d,52,8)}function v(a,b){E.ok("number"==typeof a,"cannot write a non-number as a number"),E.ok(a>=0,"specified a negative value for writing an unsigned value"),E.ok(b>=a,"value is larger than maximum value for type"),E.ok(Math.floor(a)===a,"value has a fractional component")}function w(a,b,c,d,e){e||(E.ok(void 0!==b&&null!==b,"missing value"),E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(void 0!==c&&null!==c,"missing offset"),E.ok(c+1<a.length,"trying to write beyond buffer length"),v(b,65535));for(var f=0;f<Math.min(a.length-c,2);f++)a[c+f]=(b&255<<8*(d?1-f:f))>>>8*(d?1-f:f)}function x(a,b,c,d,e){e||(E.ok(void 0!==b&&null!==b,"missing value"),E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(void 0!==c&&null!==c,"missing offset"),E.ok(c+3<a.length,"trying to write beyond buffer length"),v(b,4294967295));for(var f=0;f<Math.min(a.length-c,4);f++)a[c+f]=b>>>8*(d?3-f:f)&255}function y(a,b,c){E.ok("number"==typeof a,"cannot write a non-number as a number"),E.ok(b>=a,"value larger than maximum allowed value"),E.ok(a>=c,"value smaller than minimum allowed value"),E.ok(Math.floor(a)===a,"value has a fractional component")}function z(a,b,c){E.ok("number"==typeof a,"cannot write a non-number as a number"),E.ok(b>=a,"value larger than maximum allowed value"),E.ok(a>=c,"value smaller than minimum allowed value")}function A(a,b,c,d,e){e||(E.ok(void 0!==b&&null!==b,"missing value"),E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(void 0!==c&&null!==c,"missing offset"),E.ok(c+1<a.length,"Trying to write beyond buffer length"),y(b,32767,-32768)),b>=0?w(a,b,c,d,e):w(a,65535+b+1,c,d,e)}function B(a,b,c,d,e){e||(E.ok(void 0!==b&&null!==b,"missing value"),E.ok("boolean"==typeof d,"missing or invalid endian"),E.ok(void 0!==c&&null!==c,"missing offset"),E.ok(c+3<a.length,"Trying to write beyond buffer length"),y(b,2147483647,-2147483648)),b>=0?x(a,b,c,d,e):x(a,4294967295+b+1,c,d,e)}function C(b,c,d,e,f){f||(E.ok(void 0!==c&&null!==c,"missing value"),E.ok("boolean"==typeof e,"missing or invalid endian"),E.ok(void 0!==d&&null!==d,"missing offset"),E.ok(d+3<b.length,"Trying to write beyond buffer length"),z(c,3.4028234663852886e38,-3.4028234663852886e38)),a("./buffer_ieee754").writeIEEE754(b,c,d,e,23,4)}function D(b,c,d,e,f){f||(E.ok(void 0!==c&&null!==c,"missing value"),E.ok("boolean"==typeof e,"missing or invalid endian"),E.ok(void 0!==d&&null!==d,"missing offset"),E.ok(d+7<b.length,"Trying to write beyond buffer length"),z(c,1.7976931348623157e308,-1.7976931348623157e308)),a("./buffer_ieee754").writeIEEE754(b,c,d,e,52,8)}var E;c.Buffer=e,c.SlowBuffer=e,e.poolSize=8192,c.INSPECT_MAX_BYTES=50,e.prototype.get=function(a){if(0>a||a>=this.length)throw new Error("oob");return this[a]},e.prototype.set=function(a,b){if(0>a||a>=this.length)throw new Error("oob");return this[a]=b},e.byteLength=function(a,b){switch(b||"utf8"){case"hex":return a.length/2;case"utf8":case"utf-8":return k(a).length;case"ascii":case"binary":return a.length;case"base64":return m(a).length;default:throw new Error("Unknown encoding")}},e.prototype.utf8Write=function(a,b,c){return e._charsWritten=n(k(a),this,b,c)},e.prototype.asciiWrite=function(a,b,c){return e._charsWritten=n(l(a),this,b,c)},e.prototype.binaryWrite=e.prototype.asciiWrite,e.prototype.base64Write=function(a,b,c){return e._charsWritten=n(m(a),this,b,c)},e.prototype.base64Slice=function(){var b=Array.prototype.slice.apply(this,arguments);return a("base64-js").fromByteArray(b)},e.prototype.utf8Slice=function(){for(var a=Array.prototype.slice.apply(this,arguments),b="",c="",d=0;d<a.length;)a[d]<=127?(b+=o(c)+String.fromCharCode(a[d]),c=""):c+="%"+a[d].toString(16),d++;return b+o(c)},e.prototype.asciiSlice=function(){for(var a=Array.prototype.slice.apply(this,arguments),b="",c=0;c<a.length;c++)b+=String.fromCharCode(a[c]);return b},e.prototype.binarySlice=e.prototype.asciiSlice,e.prototype.inspect=function(){for(var a=[],b=this.length,d=0;b>d;d++)if(a[d]=j(this[d]),d==c.INSPECT_MAX_BYTES){a[d+1]="...";break}return"<Buffer "+a.join(" ")+">"},e.prototype.hexSlice=function(a,b){var c=this.length;(!a||0>a)&&(a=0),(!b||0>b||b>c)&&(b=c);for(var d="",e=a;b>e;e++)d+=j(this[e]);return d},e.prototype.toString=function(a,b,c){if(a=String(a||"utf8").toLowerCase(),b=+b||0,"undefined"==typeof c&&(c=this.length),+c==b)return"";switch(a){case"hex":return this.hexSlice(b,c);case"utf8":case"utf-8":return this.utf8Slice(b,c);case"ascii":return this.asciiSlice(b,c);case"binary":return this.binarySlice(b,c);case"base64":return this.base64Slice(b,c);case"ucs2":case"ucs-2":return this.ucs2Slice(b,c);default:throw new Error("Unknown encoding")}},e.prototype.hexWrite=function(a,b,c){b=+b||0;var d=this.length-b;c?(c=+c,c>d&&(c=d)):c=d;var f=a.length;if(f%2)throw new Error("Invalid hex string");c>f/2&&(c=f/2);for(var g=0;c>g;g++){var h=parseInt(a.substr(2*g,2),16);if(isNaN(h))throw new Error("Invalid hex string");this[b+g]=h}return e._charsWritten=2*g,g},e.prototype.write=function(a,b,c,d){if(isFinite(b))isFinite(c)||(d=c,c=void 0);else{var e=d;d=b,b=c,c=e}b=+b||0;var f=this.length-b;switch(c?(c=+c,c>f&&(c=f)):c=f,d=String(d||"utf8").toLowerCase()){case"hex":return this.hexWrite(a,b,c);case"utf8":case"utf-8":return this.utf8Write(a,b,c);case"ascii":return this.asciiWrite(a,b,c);case"binary":return this.binaryWrite(a,b,c);case"base64":return this.base64Write(a,b,c);case"ucs2":case"ucs-2":return this.ucs2Write(a,b,c);default:throw new Error("Unknown encoding")}},e.prototype.slice=function(a,b){var c=this.length;return a=f(a,c,0),b=f(b,c,c),new e(this,b-a,+a)},e.prototype.copy=function(a,b,c,d){var e=this;if(c||(c=0),(void 0===d||isNaN(d))&&(d=this.length),b||(b=0),c>d)throw new Error("sourceEnd < sourceStart");if(d===c)return 0;if(0==a.length||0==e.length)return 0;if(0>b||b>=a.length)throw new Error("targetStart out of bounds");if(0>c||c>=e.length)throw new Error("sourceStart out of bounds");if(0>d||d>e.length)throw new Error("sourceEnd out of bounds");d>this.length&&(d=this.length),a.length-b<d-c&&(d=a.length-b+c);for(var f=[],g=c;d>g;g++)E.ok("undefined"!=typeof this[g],"copying undefined buffer bytes!"),f.push(this[g]);for(var g=b;g<b+f.length;g++)a[g]=f[g-b]},e.prototype.fill=function(a,b,c){if(a||(a=0),b||(b=0),c||(c=this.length),"string"==typeof a&&(a=a.charCodeAt(0)),"number"!=typeof a||isNaN(a))throw new Error("value is not a number");if(b>c)throw new Error("end < start");if(c===b)return 0;if(0==this.length)return 0;if(0>b||b>=this.length)throw new Error("start out of bounds");if(0>c||c>this.length)throw new Error("end out of bounds");for(var d=b;c>d;d++)this[d]=a},e.isBuffer=function(a){return a instanceof e||a instanceof e},e.concat=function(a,b){if(!h(a))throw new Error("Usage: Buffer.concat(list, [totalLength])\n       list should be an Array.");if(0===a.length)return new e(0);if(1===a.length)return a[0];if("number"!=typeof b){b=0;for(var c=0;c<a.length;c++){var d=a[c];b+=d.length}}for(var f=new e(b),g=0,c=0;c<a.length;c++){var d=a[c];d.copy(f,g),g+=d.length}return f},e.isEncoding=function(a){switch((a+"").toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}},e.prototype.readUInt8=function(a,b){var c=this;return b||(E.ok(void 0!==a&&null!==a,"missing offset"),E.ok(a<c.length,"Trying to read beyond buffer length")),a>=c.length?void 0:c[a]},e.prototype.readUInt16LE=function(a,b){return p(this,a,!1,b)},e.prototype.readUInt16BE=function(a,b){return p(this,a,!0,b)},e.prototype.readUInt32LE=function(a,b){return q(this,a,!1,b)},e.prototype.readUInt32BE=function(a,b){return q(this,a,!0,b)},e.prototype.readInt8=function(a,b){var c,d=this;return b||(E.ok(void 0!==a&&null!==a,"missing offset"),E.ok(a<d.length,"Trying to read beyond buffer length")),a>=d.length?void 0:(c=128&d[a],c?-1*(255-d[a]+1):d[a])},e.prototype.readInt16LE=function(a,b){return r(this,a,!1,b)},e.prototype.readInt16BE=function(a,b){return r(this,a,!0,b)},e.prototype.readInt32LE=function(a,b){return s(this,a,!1,b)},e.prototype.readInt32BE=function(a,b){return s(this,a,!0,b)},e.prototype.readFloatLE=function(a,b){return t(this,a,!1,b)},e.prototype.readFloatBE=function(a,b){return t(this,a,!0,b)},e.prototype.readDoubleLE=function(a,b){return u(this,a,!1,b)},e.prototype.readDoubleBE=function(a,b){return u(this,a,!0,b)},e.prototype.writeUInt8=function(a,b,c){var d=this;c||(E.ok(void 0!==a&&null!==a,"missing value"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b<d.length,"trying to write beyond buffer length"),v(a,255)),b<d.length&&(d[b]=a)},e.prototype.writeUInt16LE=function(a,b,c){w(this,a,b,!1,c)},e.prototype.writeUInt16BE=function(a,b,c){w(this,a,b,!0,c)},e.prototype.writeUInt32LE=function(a,b,c){x(this,a,b,!1,c)},e.prototype.writeUInt32BE=function(a,b,c){x(this,a,b,!0,c)},e.prototype.writeInt8=function(a,b,c){var d=this;c||(E.ok(void 0!==a&&null!==a,"missing value"),E.ok(void 0!==b&&null!==b,"missing offset"),E.ok(b<d.length,"Trying to write beyond buffer length"),y(a,127,-128)),a>=0?d.writeUInt8(a,b,c):d.writeUInt8(255+a+1,b,c)},e.prototype.writeInt16LE=function(a,b,c){A(this,a,b,!1,c)},e.prototype.writeInt16BE=function(a,b,c){A(this,a,b,!0,c)},e.prototype.writeInt32LE=function(a,b,c){B(this,a,b,!1,c)},e.prototype.writeInt32BE=function(a,b,c){B(this,a,b,!0,c)},e.prototype.writeFloatLE=function(a,b,c){C(this,a,b,!1,c)},e.prototype.writeFloatBE=function(a,b,c){C(this,a,b,!0,c)},e.prototype.writeDoubleLE=function(a,b,c){D(this,a,b,!1,c)},e.prototype.writeDoubleBE=function(a,b,c){D(this,a,b,!0,c)}},{"./buffer_ieee754":5,assert:2,"base64-js":7}],7:[function(a,b){!function(){"use strict";function a(a){var b,c,e,f,g,h;if(a.length%4>0)throw"Invalid string. Length must be a multiple of 4";for(g=a.indexOf("="),g=g>0?a.length-g:0,h=[],e=g>0?a.length-4:a.length,b=0,c=0;e>b;b+=4,c+=3)f=d.indexOf(a[b])<<18|d.indexOf(a[b+1])<<12|d.indexOf(a[b+2])<<6|d.indexOf(a[b+3]),h.push((16711680&f)>>16),h.push((65280&f)>>8),h.push(255&f);return 2===g?(f=d.indexOf(a[b])<<2|d.indexOf(a[b+1])>>4,h.push(255&f)):1===g&&(f=d.indexOf(a[b])<<10|d.indexOf(a[b+1])<<4|d.indexOf(a[b+2])>>2,h.push(f>>8&255),h.push(255&f)),h}function c(a){function b(a){return d[a>>18&63]+d[a>>12&63]+d[a>>6&63]+d[63&a]}var c,e,f,g=a.length%3,h="";for(c=0,f=a.length-g;f>c;c+=3)e=(a[c]<<16)+(a[c+1]<<8)+a[c+2],h+=b(e);switch(g){case 1:e=a[a.length-1],h+=d[e>>2],h+=d[e<<4&63],h+="==";break;case 2:e=(a[a.length-2]<<8)+a[a.length-1],h+=d[e>>10],h+=d[e>>4&63],h+=d[e<<2&63],h+="="}return h}var d="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";b.exports.toByteArray=a,b.exports.fromByteArray=c}()},{}],8:[function(b,c,d){var e="undefined"!=typeof self?self:"undefined"!=typeof window?window:{};!function(b){function f(a){throw RangeError(I[a])}function g(a,b){for(var c=a.length;c--;)a[c]=b(a[c]);return a}function h(a,b){return g(a.split(H),b).join(".")}function i(a){for(var b,c,d=[],e=0,f=a.length;f>e;)b=a.charCodeAt(e++),b>=55296&&56319>=b&&f>e?(c=a.charCodeAt(e++),56320==(64512&c)?d.push(((1023&b)<<10)+(1023&c)+65536):(d.push(b),e--)):d.push(b);return d}function j(a){return g(a,function(a){var b="";return a>65535&&(a-=65536,b+=L(a>>>10&1023|55296),a=56320|1023&a),b+=L(a)}).join("")}function k(a){return 10>a-48?a-22:26>a-65?a-65:26>a-97?a-97:x}function l(a,b){return a+22+75*(26>a)-((0!=b)<<5)}function m(a,b,c){var d=0;for(a=c?K(a/B):a>>1,a+=K(a/b);a>J*z>>1;d+=x)a=K(a/J);return K(d+(J+1)*a/(a+A))}function n(a){var b,c,d,e,g,h,i,l,n,o,p=[],q=a.length,r=0,s=D,t=C;for(c=a.lastIndexOf(E),0>c&&(c=0),d=0;c>d;++d)a.charCodeAt(d)>=128&&f("not-basic"),p.push(a.charCodeAt(d));for(e=c>0?c+1:0;q>e;){for(g=r,h=1,i=x;e>=q&&f("invalid-input"),l=k(a.charCodeAt(e++)),(l>=x||l>K((w-r)/h))&&f("overflow"),r+=l*h,n=t>=i?y:i>=t+z?z:i-t,!(n>l);i+=x)o=x-n,h>K(w/o)&&f("overflow"),h*=o;b=p.length+1,t=m(r-g,b,0==g),K(r/b)>w-s&&f("overflow"),s+=K(r/b),r%=b,p.splice(r++,0,s)}return j(p)}function o(a){var b,c,d,e,g,h,j,k,n,o,p,q,r,s,t,u=[];for(a=i(a),q=a.length,b=D,c=0,g=C,h=0;q>h;++h)p=a[h],128>p&&u.push(L(p));for(d=e=u.length,e&&u.push(E);q>d;){for(j=w,h=0;q>h;++h)p=a[h],p>=b&&j>p&&(j=p);for(r=d+1,j-b>K((w-c)/r)&&f("overflow"),c+=(j-b)*r,b=j,h=0;q>h;++h)if(p=a[h],b>p&&++c>w&&f("overflow"),p==b){for(k=c,n=x;o=g>=n?y:n>=g+z?z:n-g,!(o>k);n+=x)t=k-o,s=x-o,u.push(L(l(o+t%s,0))),k=K(t/s);u.push(L(l(k,0))),g=m(c,r,d==e),c=0,++d}++c,++b}return u.join("")}function p(a){return h(a,function(a){return F.test(a)?n(a.slice(4).toLowerCase()):a})}function q(a){return h(a,function(a){return G.test(a)?"xn--"+o(a):a})}var r="object"==typeof d&&d,s="object"==typeof c&&c&&c.exports==r&&c,t="object"==typeof e&&e;(t.global===t||t.window===t)&&(b=t);var u,v,w=2147483647,x=36,y=1,z=26,A=38,B=700,C=72,D=128,E="-",F=/^xn--/,G=/[^ -~]/,H=/\x2E|\u3002|\uFF0E|\uFF61/g,I={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},J=x-y,K=Math.floor,L=String.fromCharCode;if(u={version:"1.2.3",ucs2:{decode:i,encode:j},decode:n,encode:o,toASCII:q,toUnicode:p},"function"==typeof a&&"object"==typeof a.amd&&a.amd)a(function(){return u});else if(r&&!r.nodeType)if(s)s.exports=u;else for(v in u)u.hasOwnProperty(v)&&(r[v]=u[v]);else b.punycode=u}(this)},{}],9:[function(a,b,c){!function(){"use strict";function b(a,b,c){if(a&&"object"==typeof a&&a.href)return a;if("string"!=typeof a)throw new TypeError("Parameter 'url' must be a string, not "+typeof a);var e={},f=a;f=f.trim();var j=i.exec(f);if(j){j=j[0];var k=j.toLowerCase();e.protocol=k,f=f.substr(j.length)}if(c||j||f.match(/^\/\/[^@\/]+@[^@\/]+/)){var l="//"===f.substr(0,2);!l||j&&t[j]||(f=f.substr(2),e.slashes=!0)}if(!t[j]&&(l||j&&!u[j])){var w=f.indexOf("@");if(-1!==w){for(var x=f.slice(0,w),y=!0,z=0,A=o.length;A>z;z++)if(-1!==x.indexOf(o[z])){y=!1;break}y&&(e.auth=decodeURIComponent(x),f=f.substr(w+1))}for(var B=-1,z=0,A=n.length;A>z;z++){var C=f.indexOf(n[z]);-1!==C&&(0>B||B>C)&&(B=C)}-1!==B?(e.host=f.substr(0,B),f=f.substr(B)):(e.host=f,f="");for(var D=g(e.host),E=Object.keys(D),z=0,A=E.length;A>z;z++){var F=E[z];e[F]=D[F]}e.hostname=e.hostname||"";var G="["===e.hostname[0]&&"]"===e.hostname[e.hostname.length-1];if(e.hostname.length>p)e.hostname="";else if(!G)for(var H=e.hostname.split(/\./),z=0,A=H.length;A>z;z++){var I=H[z];if(I&&!I.match(q)){for(var J="",K=0,L=I.length;L>K;K++)J+=I.charCodeAt(K)>127?"x":I[K];if(!J.match(q)){var M=H.slice(0,z),N=H.slice(z+1),O=I.match(r);O&&(M.push(O[1]),N.unshift(O[2])),N.length&&(f="/"+N.join(".")+f),e.hostname=M.join(".");break}}}if(e.hostname=e.hostname.toLowerCase(),!G){for(var P=e.hostname.split("."),Q=[],z=0;z<P.length;++z){var R=P[z];Q.push(R.match(/[^A-Za-z0-9_-]/)?"xn--"+h.encode(R):R)}e.hostname=Q.join(".")}e.host=(e.hostname||"")+(e.port?":"+e.port:""),e.href+=e.host,G&&(e.hostname=e.hostname.substr(1,e.hostname.length-2),"/"!==f[0]&&(f="/"+f))}if(!s[k])for(var z=0,A=m.length;A>z;z++){var S=m[z],T=encodeURIComponent(S);T===S&&(T=escape(S)),f=f.split(S).join(T)}var U=f.indexOf("#");-1!==U&&(e.hash=f.substr(U),f=f.slice(0,U));var V=f.indexOf("?");return-1!==V?(e.search=f.substr(V),e.query=f.substr(V+1),b&&(e.query=v.parse(e.query)),f=f.slice(0,V)):b&&(e.search="",e.query={}),f&&(e.pathname=f),u[j]&&e.hostname&&!e.pathname&&(e.pathname="/"),(e.pathname||e.search)&&(e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")),e.href=d(e),e}function d(a){"string"==typeof a&&(a=b(a));var c=a.auth||"";c&&(c=encodeURIComponent(c),c=c.replace(/%3A/i,":"),c+="@");var d=a.protocol||"",e=a.pathname||"",f=a.hash||"",g=!1,h="";void 0!==a.host?g=c+a.host:void 0!==a.hostname&&(g=c+(-1===a.hostname.indexOf(":")?a.hostname:"["+a.hostname+"]"),a.port&&(g+=":"+a.port)),a.query&&"object"==typeof a.query&&Object.keys(a.query).length&&(h=v.stringify(a.query));var i=a.search||h&&"?"+h||"";return d&&":"!==d.substr(-1)&&(d+=":"),a.slashes||(!d||u[d])&&g!==!1?(g="//"+(g||""),e&&"/"!==e.charAt(0)&&(e="/"+e)):g||(g=""),f&&"#"!==f.charAt(0)&&(f="#"+f),i&&"?"!==i.charAt(0)&&(i="?"+i),d+g+e+i+f}function e(a,b){return d(f(a,b))}function f(a,c){if(!a)return c;if(a=b(d(a),!1,!0),c=b(d(c),!1,!0),a.hash=c.hash,""===c.href)return a.href=d(a),a;if(c.slashes&&!c.protocol)return c.protocol=a.protocol,u[c.protocol]&&c.hostname&&!c.pathname&&(c.path=c.pathname="/"),c.href=d(c),c;if(c.protocol&&c.protocol!==a.protocol){if(!u[c.protocol])return c.href=d(c),c;if(a.protocol=c.protocol,!c.host&&!t[c.protocol]){for(var e=(c.pathname||"").split("/");e.length&&!(c.host=e.shift()););c.host||(c.host=""),c.hostname||(c.hostname=""),""!==e[0]&&e.unshift(""),e.length<2&&e.unshift(""),c.pathname=e.join("/")}return a.pathname=c.pathname,a.search=c.search,a.query=c.query,a.host=c.host||"",a.auth=c.auth,a.hostname=c.hostname||c.host,a.port=c.port,(void 0!==a.pathname||void 0!==a.search)&&(a.path=(a.pathname?a.pathname:"")+(a.search?a.search:"")),a.slashes=a.slashes||c.slashes,a.href=d(a),a}var f=a.pathname&&"/"===a.pathname.charAt(0),g=void 0!==c.host||c.pathname&&"/"===c.pathname.charAt(0),h=g||f||a.host&&c.pathname,i=h,j=a.pathname&&a.pathname.split("/")||[],e=c.pathname&&c.pathname.split("/")||[],k=a.protocol&&!u[a.protocol];if(k&&(delete a.hostname,delete a.port,a.host&&(""===j[0]?j[0]=a.host:j.unshift(a.host)),delete a.host,c.protocol&&(delete c.hostname,delete c.port,c.host&&(""===e[0]?e[0]=c.host:e.unshift(c.host)),delete c.host),h=h&&(""===e[0]||""===j[0])),g)a.host=c.host||""===c.host?c.host:a.host,a.hostname=c.hostname||""===c.hostname?c.hostname:a.hostname,a.search=c.search,a.query=c.query,j=e;else if(e.length)j||(j=[]),j.pop(),j=j.concat(e),a.search=c.search,a.query=c.query;else if("search"in c){if(k){a.hostname=a.host=j.shift();var l=a.host&&a.host.indexOf("@")>0?a.host.split("@"):!1;l&&(a.auth=l.shift(),a.host=a.hostname=l.shift())}return a.search=c.search,a.query=c.query,(void 0!==a.pathname||void 0!==a.search)&&(a.path=(a.pathname?a.pathname:"")+(a.search?a.search:"")),a.href=d(a),a}if(!j.length)return delete a.pathname,a.search?delete a.path:a.path="/"+a.search,a.href=d(a),a;for(var m=j.slice(-1)[0],n=(a.host||c.host)&&("."===m||".."===m)||""===m,o=0,p=j.length;p>=0;p--)m=j[p],"."==m?j.splice(p,1):".."===m?(j.splice(p,1),o++):o&&(j.splice(p,1),o--);if(!h&&!i)for(;o--;o)j.unshift("..");!h||""===j[0]||j[0]&&"/"===j[0].charAt(0)||j.unshift(""),n&&"/"!==j.join("/").substr(-1)&&j.push("");var q=""===j[0]||j[0]&&"/"===j[0].charAt(0);if(k){a.hostname=a.host=q?"":j.length?j.shift():"";var l=a.host&&a.host.indexOf("@")>0?a.host.split("@"):!1;l&&(a.auth=l.shift(),a.host=a.hostname=l.shift())}return h=h||a.host&&j.length,h&&!q&&j.unshift(""),a.pathname=j.join("/"),(void 0!==a.pathname||void 0!==a.search)&&(a.path=(a.pathname?a.pathname:"")+(a.search?a.search:"")),a.auth=c.auth||a.auth,a.slashes=a.slashes||c.slashes,a.href=d(a),a}function g(a){var b={},c=j.exec(a);return c&&(c=c[0],":"!==c&&(b.port=c.substr(1)),a=a.substr(0,a.length-c.length)),a&&(b.hostname=a),b}var h=a("punycode");c.parse=b,c.resolve=e,c.resolveObject=f,c.format=d;var i=/^([a-z0-9.+-]+:)/i,j=/:[0-9]*$/,k=["<",">",'"',"`"," ","\r","\n","	"],l=["{","}","|","\\","^","~","`"].concat(k),m=["'"].concat(k),n=["%","/","?",";","#"].concat(l).concat(m),o=["/","@","?","#"].concat(k),p=255,q=/^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,r=/^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,s={javascript:!0,"javascript:":!0},t={javascript:!0,"javascript:":!0},u={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0},v=a("querystring")}()},{punycode:8,querystring:3}]},{},[9])(9)}),!function(a){"object"==typeof exports?module.exports=a():"function"==typeof define&&define.amd?define(a):"undefined"!=typeof window?window.xmlserializer=a():"undefined"!=typeof global?global.xmlserializer=a():"undefined"!=typeof self&&(self.xmlserializer=a())}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);throw new Error("Cannot find module '"+g+"'")}var j=c[g]={exports:{}};b[g][0].call(j.exports,function(a){var c=b[g][1][a];return e(c?c:a)},j,j.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){var d=function(a){return a.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"")},e=function(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")},f=function(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},g=function(a){var b=a.value;return" "+a.name+'="'+e(b)+'"'},h=function(a){var b=Array.prototype.map.call(a.attributes||a.attrs,function(a){return a.name}).indexOf("xmlns")>=0;return"html"!==a.tagName.toLowerCase()||b?"":' xmlns="'+a.namespaceURI+'"'},i=function(a){return Array.prototype.map.call(a.childNodes,function(a){return m(a)}).join("")},j=function(a){var b="<"+a.tagName.toLowerCase();return b+=h(a),Array.prototype.forEach.call(a.attributes||a.attrs,function(a){b+=g(a)}),a.childNodes.length>0?(b+=">",b+=i(a),b+="</"+a.tagName.toLowerCase()+">"):b+="/>",b},k=function(a){var b=a.nodeValue||a.value||"";return f(b)},l=function(a){return"<!--"+a.data.replace(/-/g,"&#45;")+"-->"},m=function(a){return"#document"===a.nodeName||"#document-fragment"===a.nodeName?i(a):a.tagName?j(a):"#text"===a.nodeName?k(a):"#comment"===a.nodeName?l(a):void 0};c.serializeToString=function(a){return d(m(a))}},{}]},{},[1])(1)}),function(a,b){"function"==typeof define&&define.amd?define(b):"object"==typeof exports?module.exports=b():a.ayepromise=b()}(this,function(){"use strict";var a={},b=function(){var a=!1;return function(b){return function(){a||(a=!0,b.apply(null,arguments))}}},c=function(a){var b=a&&a.then;return null!==a&&"object"==typeof a&&"function"==typeof b?b.bind(a):void 0},d=function(a,b,c){setTimeout(function(){var d;try{d=b(c)}catch(e){return a.reject(e),void 0}d===a.promise?a.reject(new TypeError("Cannot resolve promise with itself")):a.resolve(d)},1)},e=function(a,b,c){b&&b.call?d(a,b,c):a.resolve(c)},f=function(a,b,c){b&&b.call?d(a,b,c):a.reject(c)},g=function(b,c){var d=a.defer();return{promise:d.promise,callFulfilled:function(a){e(d,b,a)},callRejected:function(a){f(d,c,a)}}},h=0,i=1,j=2;return a.defer=function(){var a,d=h,e=[],f=function(b){d=i,a=b,e.forEach(function(b){b.callFulfilled(a)})},k=function(b){d=j,a=b,e.forEach(function(b){b.callRejected(a)})},l=function(b){d===i?b.callFulfilled(a):d===j&&b.callRejected(a)},m=function(a,b){var c=g(a,b);return e.push(c),l(c),c.promise},n=function(a){var c=b();try{a(c(o),c(k))}catch(d){c(k)(d)}},o=function(a){var b;try{b=c(a)}catch(d){return k(d),void 0}b?n(b):f(a)},p=b();return{resolve:p(o),reject:p(k),promise:{then:m,fail:function(a){return m(null,a)}}}},a}),window.rasterizeHTMLInline=function(a){"use strict";var b=function(b){return a.util.joinUrl(b,".")},c=function(a){var c=a.map(function(c,d){return d===a.length-1&&(c={baseUrl:b(c.baseUrl)}),JSON.stringify(c)});return c},d=function(b,d){return d.cache!==!1&&"none"!==d.cache&&d.cacheBucket?a.util.memoize(b,c,d.cacheBucket):b},e=function(b,c){var d=b.attributes.src?b.attributes.src.nodeValue:null,e=a.util.getDocumentBaseUrl(b.ownerDocument),f=a.util.clone(c);return!f.baseUrl&&e&&(f.baseUrl=e),a.util.getDataURIForImageURL(d,f).then(function(a){return a},function(a){throw{resourceType:"image",url:a.url,msg:"Unable to load image "+a.url}})},f=function(b){return b.filter(function(b){var c=b.attributes.src?b.attributes.src.nodeValue:null;return null!==c&&!a.util.isDataUri(c)})},g=function(a){return Array.prototype.filter.call(a,function(a){return"image"===a.type})},h=function(a){return Array.prototype.slice.call(a)};a.loadAndInlineImages=function(b,c){var d=h(b.getElementsByTagName("img")),i=g(b.getElementsByTagName("input")),j=f(d.concat(i));return a.util.collectAndReportErrors(j.map(function(a){return e(a,c).then(function(b){a.attributes.src.nodeValue=b})}))};var i=function(b,c,d){var e=a.css.rulesForCssText(b);return a.css.loadCSSImportsForRules(e,c,d).then(function(c){return a.css.loadAndInlineCSSResourcesForRules(e,d).then(function(d){var f=c.errors.concat(d.errors),g=c.hasChanges||d.hasChanges;return g&&(b=a.css.cssRulesToText(e)),{hasChanges:g,content:b,errors:f}})})},j=function(b,c,e){var f=b.textContent,g=d(i,c);return g(f,e,c).then(function(c){return c.hasChanges&&(b.childNodes[0].nodeValue=c.content),a.util.cloneArray(c.errors)})},k=function(a){var b=a.getElementsByTagName("style");return Array.prototype.filter.call(b,function(a){return!a.attributes.type||"text/css"===a.attributes.type.nodeValue})};a.loadAndInlineStyles=function(b,c){var d,e=k(b),f=[],g=[];return d=a.util.clone(c),d.baseUrl=d.baseUrl||a.util.getDocumentBaseUrl(b),a.util.all(e.map(function(a){return j(a,d,g).then(function(a){f=f.concat(a)})})).then(function(){return f})};var l=function(a,b){var c,d=a.parentNode;b=b.trim(),b&&(c=a.ownerDocument.createElement("style"),c.type="text/css",c.appendChild(a.ownerDocument.createTextNode(b)),d.insertBefore(c,a)),d.removeChild(a)},m=function(b,c){return a.util.ajax(b,c).then(function(b){var c=a.css.rulesForCssText(b);return{content:b,cssRules:c}}).then(function(c){var d=a.css.adjustPathsOfCssResources(b,c.cssRules);return{content:c.content,cssRules:c.cssRules,hasChanges:d}}).then(function(b){return a.css.loadCSSImportsForRules(b.cssRules,[],c).then(function(a){return{content:b.content,cssRules:b.cssRules,hasChanges:b.hasChanges||a.hasChanges,errors:a.errors}})}).then(function(b){return a.css.loadAndInlineCSSResourcesForRules(b.cssRules,c).then(function(a){return{content:b.content,cssRules:b.cssRules,hasChanges:b.hasChanges||a.hasChanges,errors:b.errors.concat(a.errors)}})}).then(function(b){var c=b.content;return b.hasChanges&&(c=a.css.cssRulesToText(b.cssRules)),{content:c,errors:b.errors}})},n=function(b,c){var e=b.attributes.href.nodeValue,f=a.util.getDocumentBaseUrl(b.ownerDocument),g=a.util.clone(c);!g.baseUrl&&f&&(g.baseUrl=f);var h=d(m,c);return h(e,g).then(function(b){return{content:b.content,errors:a.util.cloneArray(b.errors)}})},o=function(a){var b=a.getElementsByTagName("link");return Array.prototype.filter.call(b,function(a){return a.attributes.rel&&"stylesheet"===a.attributes.rel.nodeValue&&(!a.attributes.type||"text/css"===a.attributes.type.nodeValue)})};a.loadAndInlineCssLinks=function(b,c){var d=o(b),e=[];
return a.util.all(d.map(function(a){return n(a,c).then(function(b){l(a,b.content+"\n"),e=e.concat(b.errors)},function(a){e.push({resourceType:"stylesheet",url:a.url,msg:"Unable to load stylesheet "+a.url})})})).then(function(){return e})};var p=function(b,c){var d=b.attributes.src.nodeValue,e=a.util.getDocumentBaseUrl(b.ownerDocument),f=a.util.clone(c);return!f.baseUrl&&e&&(f.baseUrl=e),a.util.ajax(d,f).fail(function(a){throw{resourceType:"script",url:a.url,msg:"Unable to load script "+a.url}})},q=function(a){return a.replace(/<\//g,"<\\/")},r=function(a,b){a.attributes.removeNamedItem("src"),a.textContent=q(b)},s=function(a){var b=a.getElementsByTagName("script");return Array.prototype.filter.call(b,function(a){return!!a.attributes.src})};return a.loadAndInlineScript=function(b,c){var d=s(b);return a.util.collectAndReportErrors(d.map(function(a){return p(a,c).then(function(b){r(a,b)})}))},a.inlineReferences=function(b,c){var d=[],e=[a.loadAndInlineImages,a.loadAndInlineStyles,a.loadAndInlineCssLinks];return c.inlineScripts!==!1&&e.push(a.loadAndInlineScript),a.util.all(e.map(function(a){return a(b,c).then(function(a){d=d.concat(a)})})).then(function(){return d})},a}(window.rasterizeHTMLInline||{}),window.rasterizeHTMLInline=function(a,b,c,d){"use strict";a.css={};var e=function(a,b,c){a.style.setProperty(b,c,a.style.getPropertyPriority(b))},f=function(a){var b,c=document.implementation.createHTMLDocument(""),d=document.createElement("style");return d.textContent=a,c.body.appendChild(d),b=d.sheet.cssRules,Array.prototype.slice.call(b)},g=function(){var a=f("a{background:url(i)}");return!a.length||a[0].cssText.indexOf("url()")>=0}();a.css.rulesForCssText=function(a){return g&&c.parse?c.parse(a).cssRules:f(a)};var h=function(a){return a.filter(function(a){return a.type===b.CSSRule.STYLE_RULE&&(a.style.getPropertyValue("background-image")||a.style.getPropertyValue("background"))})},i=function(a){var b=[];return a.forEach(function(a){a.style.getPropertyValue("background-image")?b.push({property:"background-image",value:a.style.getPropertyValue("background-image"),rule:a}):a.style.getPropertyValue("background")&&b.push({property:"background",value:a.style.getPropertyValue("background"),rule:a})}),b},j=function(a){return a.filter(function(a){return a.type===b.CSSRule.FONT_FACE_RULE&&a.style.getPropertyValue("src")})};a.css.cssRulesToText=function(a){return a.reduce(function(a,b){return a+b.cssText},"")};var k=function(a){var b=/^"(.*)"$/,c=/^'(.*)'$/;return b.test(a)?a.replace(b,"$1"):c.test(a)?a.replace(c,"$1"):a},l=function(a){var b=/^[\t\r\f\n ]*(.+?)[\t\r\f\n ]*$/;return a.replace(b,"$1")};a.css.extractCssUrl=function(a){var b,c=/^url\(([^\)]+)\)/;if(!c.test(a))throw new Error("Invalid url");return b=c.exec(a)[1],k(l(b))};var m=function(a){var b,c=/^format\(([^\)]+)\)/;return c.test(a)?(b=c.exec(a)[1],k(b)):null},n=function(b){var c,d=null;try{return c=a.css.extractCssUrl(b[0]),b[1]&&(d=m(b[1])),{url:c,format:d}}catch(e){}},o=function(a,b,c){var d="@font-face { font-family: "+b.style.getPropertyValue("font-family")+"; ";b.style.getPropertyValue("font-style")&&(d+="font-style: "+b.style.getPropertyValue("font-style")+"; "),b.style.getPropertyValue("font-weight")&&(d+="font-weight: "+b.style.getPropertyValue("font-weight")+"; "),d+="src: "+c+"}",p(a,b,d)},p=function(a,b,c){var d=a.indexOf(b),e=b.parentStyleSheet;e.insertRule(c,d+1),e.deleteRule(d),a[d]=e.cssRules[d]};a.css.adjustPathsOfCssResources=function(b,c){var d=h(c),f=i(d),g=!1;return f.forEach(function(c){var d,f=x(c.value),h=y(f);h.length>0&&(h.forEach(function(c){var d=f[c].url,e=a.util.joinUrl(b,d);f[c].url=e}),d=z(f),e(c.rule,c.property,d),g=!0)}),j(c).forEach(function(d){var e=d.style.getPropertyValue("src"),f=D(e),h=E(f);h.length>0&&(h.forEach(function(c){var d=f[c].url,e=a.util.joinUrl(b,d);f[c].url=e}),o(c,d,F(f)),g=!0)}),q(c).forEach(function(d){var e=d.href,f=a.util.joinUrl(b,e);p(c,d,"@import url("+f+");"),g=!0}),g};var q=function(a){return a.filter(function(a){return a.type===b.CSSRule.IMPORT_RULE&&a.href})},r=function(a,b,c){var d=a.indexOf(b);a.splice(d,1),c.forEach(function(b,c){a.splice(d+c,0,b)})},s=function(a){var b=/^"(.*)"$/,c=/^'(.*)'$/;return b.test(a)||c.test(a)},t=function(a){var b=d.defer();return b.resolve(a),b.promise},u=function(b,c,d,e){var f,g=c.href;return s(g)&&(g=k(g)),f=a.util.joinUrl(e.baseUrl,g),d.indexOf(f)>=0?(r(b,c,[]),t([])):(d.push(f),a.util.ajax(g,e).then(function(f){var h=a.css.rulesForCssText(f);return a.css.loadCSSImportsForRules(h,d,e).then(function(d){return a.css.adjustPathsOfCssResources(g,h),r(b,c,h),d.errors})},function(a){throw{resourceType:"stylesheet",url:a.url,msg:"Unable to load stylesheet "+a.url}}))};a.css.loadCSSImportsForRules=function(b,c,d){var e=q(b),f=[],g=!1;return a.util.all(e.map(function(a){return u(b,a,c,d).then(function(a){f=f.concat(a),g=!0},function(a){f.push(a)})})).then(function(){return{hasChanges:g,errors:f}})};var v=function(a){var b,c="\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",d="(url\\("+c+"\\)|[^,\\s]+)",e="(?:\\s*"+d+")+",f="^\\s*("+e+")(?:\\s*,\\s*("+e+"))*\\s*$",g=new RegExp(e,"g"),h=[],i=function(a){var b,c=new RegExp(d,"g"),e=[];for(b=c.exec(a);b;)e.push(b[1]),b=c.exec(a);return e};if(a.match(new RegExp(f))){for(b=g.exec(a);b;)h.push(i(b[0])),b=g.exec(a);return h}return[]},w=function(b){var c,d;for(c=0;c<b.length;c++)try{return d=a.css.extractCssUrl(b[c]),{url:d,idx:c}}catch(e){}},x=function(a){var b=v(a);return b.map(function(a){var b=w(a);return b?{preUrl:a.slice(0,b.idx),url:b.url,postUrl:a.slice(b.idx+1)}:{preUrl:a}})},y=function(b){var c=[];return b.forEach(function(b,d){b.url&&!a.util.isDataUri(b.url)&&c.push(d)}),c},z=function(a){var b=a.map(function(a){var b=[].concat(a.preUrl);return a.url&&b.push('url("'+a.url+'")'),a.postUrl&&(b=b.concat(a.postUrl)),b.join(" ")});return b.join(", ")},A=function(b,c){var d=x(b),e=y(d),f=!1;return a.util.collectAndReportErrors(e.map(function(b){var e=d[b].url;return a.util.getDataURIForImageURL(e,c).then(function(a){d[b].url=a,f=!0},function(a){throw{resourceType:"backgroundImage",url:a.url,msg:"Unable to load background-image "+a.url}})})).then(function(a){return{backgroundValue:z(d),hasChanges:f,errors:a}})},B=function(b,c){var d=h(b),f=i(d),g=[],j=!1;return a.util.all(f.map(function(a){return A(a.value,c).then(function(b){b.hasChanges&&(e(a.rule,a.property,b.backgroundValue),j=!0),g=g.concat(b.errors)})})).then(function(){return{hasChanges:j,errors:g}})},C=function(a){var b,c="\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",d="(local\\("+c+"\\))|(url\\("+c+"\\))(?:\\s+(format\\("+c+"\\)))?",e="^\\s*("+d+")(?:\\s*,\\s*("+d+"))*\\s*$",f=new RegExp(d,"g"),g=[],h=function(a){var b=[];return a.slice(1).forEach(function(a){a&&b.push(a)}),b};if(a.match(new RegExp(e))){for(b=f.exec(a);b;)g.push(h(b)),b=f.exec(a);return g}return[]},D=function(a){var b=C(a);return b.map(function(a){var b=n(a);return b?b:{local:a}})},E=function(b){var c=[];return b.forEach(function(b,d){b.url&&!a.util.isDataUri(b.url)&&c.push(d)}),c},F=function(a){return a.map(function(a){var b;return a.url?(b='url("'+a.url+'")',a.format&&(b+=' format("'+a.format+'")')):b=a.local,b}).join(", ")},G=function(b,c){var d=D(b),e=E(d),f=!1;return a.util.collectAndReportErrors(e.map(function(b){var e=d[b],g=e.format||"woff";return a.util.binaryAjax(e.url,c).then(function(a){var b=btoa(a);e.url="data:font/"+g+";base64,"+b,f=!0},function(a){throw{resourceType:"fontFace",url:a.url,msg:"Unable to load font-face "+a.url}})})).then(function(a){return{srcDeclarationValue:F(d),hasChanges:f,errors:a}})},H=function(b,c){var d=j(b),e=[],f=!1;return a.util.all(d.map(function(a){var d=a.style.getPropertyValue("src");return G(d,c).then(function(c){c.hasChanges&&(o(b,a,c.srcDeclarationValue),f=!0),e=e.concat(c.errors)})})).then(function(){return{hasChanges:f,errors:e}})};return a.css.loadAndInlineCSSResourcesForRules=function(b,c){var d=!1,e=[];return a.util.all([B,H].map(function(a){return a(b,c).then(function(a){d=d||a.hasChanges,e=e.concat(a.errors)})})).then(function(){return{hasChanges:d,errors:e}})},a}(window.rasterizeHTMLInline||{},window,window.CSSOM||{},ayepromise),window.rasterizeHTMLInline=function(a,b,c,d){"use strict";a.util={},a.util.getDocumentBaseUrl=function(a){return"about:blank"!==a.baseURI?a.baseURI:null},a.util.clone=function(a){var b,c={};for(b in a)a.hasOwnProperty(b)&&(c[b]=a[b]);return c},a.util.cloneArray=function(a){return Array.prototype.slice.apply(a,[0])},a.util.joinUrl=function(a,b){return d.resolve(a,b)},a.util.isDataUri=function(a){return/^data:/.test(a)},a.util.all=function(a){var b=c.defer(),d=a.length,e=[];return 0===a.length?(b.resolve([]),b.promise):(a.forEach(function(a,c){a.then(function(a){d-=1,e[c]=a,0===d&&b.resolve(e)},function(a){b.reject(a)})}),b.promise)},a.util.collectAndReportErrors=function(b){var c=[];return a.util.all(b.map(function(a){return a.fail(function(a){c.push(a)})})).then(function(){return c})};var e=null,f=function(a,b){return b===!1||"none"===b||"repeated"===b?((null===e||"repeated"!==b)&&(e=Date.now()),a+"?_="+e):a};a.util.ajax=function(d,e){var g,h=new b.XMLHttpRequest,i=c.defer(),j=a.util.joinUrl(e.baseUrl,d),k=function(){i.reject({msg:"Unable to load url",url:j})};g=f(j,e.cache),h.addEventListener("load",function(){200===h.status||0===h.status?i.resolve(h.response):k()},!1),h.addEventListener("error",k,!1);try{h.open("GET",g,!0),h.overrideMimeType(e.mimeType),h.send(null)}catch(l){k()}return i.promise},a.util.binaryAjax=function(b,c){var d=a.util.clone(c);return d.mimeType="text/plain; charset=x-user-defined",a.util.ajax(b,d).then(function(a){for(var b="",c=0;c<a.length;c++)b+=String.fromCharCode(255&a.charCodeAt(c));return b})};var g=function(a){var b=function(a,b){return a.substring(0,b.length)===b};return b(a,"<?xml")||b(a,"<svg")?"image/svg+xml":"image/png"};a.util.getDataURIForImageURL=function(b,c){return a.util.binaryAjax(b,c).then(function(a){var b=btoa(a),c=g(a);return"data:"+c+";base64,"+b})};var h=[],i=function(a){return h.indexOf(a)<0&&h.push(a),h.indexOf(a)};return a.util.memoize=function(a,b,c){if("object"!=typeof c)throw new Error("cacheBucket is not an object");return function(){var d,e=Array.prototype.slice.call(arguments),f=b(e),g=i(a);return c[g]&&c[g][f]?c[g][f]:(d=a.apply(null,e),c[g]=c[g]||{},c[g][f]=d,d)}},a}(window.rasterizeHTMLInline||{},window,ayepromise,url),window.rasterizeHTML=function(a,b,c,d){"use strict";var e={},f=[];e.util={},e.util.getConstantUniqueIdFor=function(a){return f.indexOf(a)<0&&f.push(a),f.indexOf(a)};var g=function(a){var b,c={};for(b in a)a.hasOwnProperty(b)&&(c[b]=a[b]);return c},h=function(a){return"object"==typeof a&&null!==a},i=function(a){return h(a)&&Object.prototype.toString.apply(a).match(/\[object (Canvas|HTMLCanvasElement)\]/i)},j=function(a){return"function"==typeof a};e.util.parseOptionalParameters=function(a){var b={canvas:null,options:{},callback:null};return j(a[0])?b.callback=a[0]:null==a[0]||i(a[0])?(b.canvas=a[0]||null,j(a[1])?b.callback=a[1]:(b.options=g(a[1]),b.callback=a[2]||null)):(b.options=g(a[0]),b.callback=a[1]||null),b};var k=function(b,c){return function(){var d=new b,e=d.open;return d.open=function(){var b=Array.prototype.slice.call(arguments),d=b.shift(),f=b.shift(),g=a.util.joinUrl(c,f);return e.apply(this,[d,g].concat(b))},d}};e.util.executeJavascript=function(a,b,e){var f=t(d.document,"iframe"),g=a.documentElement.outerHTML,h=[],i=c.defer(),j=function(){var a=f.contentDocument;d.document.getElementsByTagName("body")[0].removeChild(f),i.resolve({document:a,errors:h})};return f.onload=e>0?function(){setTimeout(j,e)}:j,f.contentDocument.open(),f.contentWindow.XMLHttpRequest=k(f.contentWindow.XMLHttpRequest,b),f.contentWindow.onerror=function(a){h.push({resourceType:"scriptExecution",msg:a})},f.contentDocument.write(g),f.contentDocument.close(),i.promise};var l=function(a,b,c){var d=a.createElement("iframe");return d.style.width=b+"px",d.style.height=c+"px",d.style.visibility="hidden",d.style.position="absolute",d.style.top=-1e4-c+"px",d.style.left=-1e4-b+"px",d.sandbox="allow-same-origin",a.getElementsByTagName("body")[0].appendChild(d),d};e.util.calculateDocumentContentSize=function(a,b,e){var f=a.documentElement.outerHTML,g=l(d.document,b,e),h=c.defer();return g.onload=function(){var a=g.contentDocument,b=Math.max(a.documentElement.scrollWidth,a.body.clientWidth),c=Math.max(a.documentElement.scrollHeight,a.body.scrollHeight,a.body.clientHeight);d.document.getElementsByTagName("body")[0].removeChild(g),h.resolve({width:b,height:c})},g.contentDocument.open(),g.contentDocument.write(f),g.contentDocument.close(),h.promise};var m=function(a,b){var c,e,f,g,h=/<html((?:\s+[^>]*)?)>/im.exec(b),i=d.document.implementation.createHTMLDocument("");if(h)for(c="<div"+h[1]+"></div>",i.documentElement.innerHTML=c,f=i.querySelector("div"),e=0;e<f.attributes.length;e++)g=f.attributes[e],a.documentElement.setAttribute(g.name,g.value)};e.util.parseHTML=function(a){var b;return(new DOMParser).parseFromString("<a></a>","text/html")?b=(new DOMParser).parseFromString(a,"text/html"):(b=d.document.implementation.createHTMLDocument(""),b.documentElement.innerHTML=a,m(b,a)),b};var n=null,o=function(a,b){return b===!1||"none"===b||"repeated"===b?((null===n||"repeated"!==b)&&(n=Date.now()),a+"?_="+n):a};e.util.loadDocument=function(b,d){var e=new window.XMLHttpRequest,f=a.util.joinUrl(d.baseUrl,b),g=o(f,d.cache),h=c.defer(),i=function(){h.reject({message:"Unable to load page"})};e.addEventListener("load",function(){200===e.status||0===e.status?h.resolve(e.responseXML):i()},!1),e.addEventListener("error",function(){i()},!1);try{e.open("GET",g,!0),e.responseType="document",e.send(null)}catch(j){i()}return h.promise};var p=function(){if(d.navigator.userAgent.indexOf("WebKit")>=0&&d.navigator.userAgent.indexOf("Chrome")<0)return!1;if(d.BlobBuilder||d.MozBlobBuilder||d.WebKitBlobBuilder)return!0;if(d.Blob)try{return new d.Blob(["<b></b>"],{type:"text/xml"}),!0}catch(a){return!1}return!1},q=function(a){var b,c="image/svg+xml;charset=utf-8",e=d.BlobBuilder||d.MozBlobBuilder||d.WebKitBlobBuilder;return e?(b=new e,b.append(a),b.getBlob(c)):new d.Blob([a],{type:c})},r=function(a){var b=d.URL||d.webkitURL||window;return p()?b.createObjectURL(q(a)):"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(a)},s=function(a){var b=d.URL||d.webkitURL||window;p()&&b.revokeObjectURL(a)},t=function(a,b){var c=a.createElement(b);return c.style.visibility="hidden",c.style.width="0px",c.style.height="0px",c.style.position="absolute",c.style.top="-10000px",c.style.left="-10000px",a.getElementsByTagName("body")[0].appendChild(c),c},u=function(a,b){var c=a.getElementById(b);return c||(c=t(a,"div"),c.id=b),c},v="rasterizeHTML_js_FirefoxWorkaround",w=function(){var a=d.navigator.userAgent.match(/Firefox\/(\d+).0/);return!a||!a[1]||parseInt(a[1],10)<17},x=function(a,b){var c,f=e.util.getConstantUniqueIdFor(a),g=b?b.ownerDocument:d.document;w()&&(c=u(g,v+f),c.innerHTML=a,c.className=v)},y=function(a){window.navigator.userAgent.indexOf("WebKit")>=0&&Array.prototype.forEach.call(a.getElementsByTagName("style"),function(a){a.textContent="span {}\n"+a.textContent})},z=function(a,b){var c=e.util.getConstantUniqueIdFor(a),f=b?b.ownerDocument:d.document,g=f.getElementById(v+c);g&&g.parentNode.removeChild(g)};e.util.addClassNameRecursively=function(a,b){a.className+=" "+b,a.parentNode!==a.ownerDocument&&e.util.addClassNameRecursively(a.parentNode,b)};var A=function(a,b){var c=a.parentStyleSheet,d=Array.prototype.indexOf.call(c.cssRules,a);c.insertRule(b,d+1),c.deleteRule(d)},B=function(a,b){var c=a.cssText.replace(/^[^\{]+/,""),d=b+" "+c;A(a,d)},C=function(a){return Array.prototype.reduce.call(a,function(a,b){return a+b.cssText},"")},D=function(a){a.textContent=C(a.sheet.cssRules)};e.util.rewriteStyleRuleSelector=function(a,b,c){var d=b+"(?=\\W|$)";Array.prototype.forEach.call(a.querySelectorAll("style"),function(a){var b=Array.prototype.filter.call(a.sheet.cssRules,function(a){return a.selectorText&&new RegExp(d).test(a.selectorText)});b.length&&(b.forEach(function(a){var b=a.selectorText.replace(new RegExp(d,"g"),c);B(a,b)}),D(a))})},e.util.fakeHover=function(a,b){var c=a.querySelector(b),d="rasterizehtmlhover";c&&(e.util.addClassNameRecursively(c,d),e.util.rewriteStyleRuleSelector(a,":hover","."+d))},e.util.fakeActive=function(a,b){var c=a.querySelector(b),d="rasterizehtmlactive";c&&(e.util.addClassNameRecursively(c,d),e.util.rewriteStyleRuleSelector(a,":active","."+d))},e.util.persistInputValues=function(a){var b=Array.prototype.slice.call(a.querySelectorAll("input")),c=Array.prototype.slice.call(a.querySelectorAll("textarea")),d=function(a){return"checkbox"===a.type||"radio"===a.type};b.filter(d).forEach(function(a){a.checked?a.setAttribute("checked",""):a.removeAttribute("checked")}),b.filter(function(a){return!d(a)}).forEach(function(a){a.setAttribute("value",a.value)}),c.forEach(function(a){a.textContent=a.value})},e.getSvgForDocument=function(a,c,d){var e;return y(a),e=b.serializeToString(a),'<svg xmlns="http://www.w3.org/2000/svg" width="'+c+'" height="'+d+'"><foreignObject width="100%" height="100%">'+e+"</foreignObject></svg>"},e.renderSvg=function(a,b){var e,f,g=c.defer(),h=function(){f.onload=null,f.onerror=null},i=function(){e&&s(e),z(a,b)};return x(a,b),e=r(a),f=new d.Image,f.onload=function(){h(),i(),g.resolve(f)},f.onerror=function(){i(),g.reject()},f.src=e,g.promise},e.drawImageOnCanvas=function(a,b){try{b.getContext("2d").drawImage(a,0,0)}catch(c){return!1}return!0},e.drawDocumentImage=function(a,b,c){var d=F(b,c);return c.hover&&e.util.fakeHover(a,c.hover),c.active&&e.util.fakeActive(a,c.active),e.util.calculateDocumentContentSize(a,d.width,d.height).then(function(b){return e.getSvgForDocument(a,b.width,b.height)}).then(function(a){return e.renderSvg(a,b)})};var E=function(a,b,c){var d={message:"Error rendering page"};return e.drawDocumentImage(a,b,c).then(function(a){var c;if(b&&(c=e.drawImageOnCanvas(a,b),!c))throw d;return a},function(){throw d})},F=function(a,b){var c=300,d=200,e=a?a.width:c,f=a?a.height:d,g=void 0!==b.width?b.width:e,h=void 0!==b.height?b.height:f;return{width:g,height:h}},G=function(b,c,d){var f,g=d.executeJsTimeout||0;return f=a.util.clone(d),f.inlineScripts=d.executeJs===!0,a.inlineReferences(b,f).then(function(a){return d.executeJs?e.util.executeJavascript(b,d.baseUrl,g).then(function(b){var c=b.document;return e.util.persistInputValues(c),{document:c,errors:a.concat(b.errors)}}):{document:b,errors:a}}).then(function(a){return E(a.document,c,d).then(function(b){return{image:b,errors:a.errors}})})};e.drawDocument=function(){var a=arguments[0],b=Array.prototype.slice.call(arguments,1),c=e.util.parseOptionalParameters(b),d=G(a,c.canvas,c.options);return c.callback&&d.then(function(a){c.callback(a.image,a.errors)},function(a){c.callback(null,[{resourceType:"document",msg:a.message}])}),d};var H=function(a,b,c,d){var f=e.util.parseHTML(a);return e.drawDocument(f,b,c,d)};e.drawHTML=function(){var a=arguments[0],b=Array.prototype.slice.call(arguments,1),c=e.util.parseOptionalParameters(b);return H(a,c.canvas,c.options,c.callback)};var I=function(a,b,c,d){var f=e.util.loadDocument(a,c).then(function(a){return e.drawDocument(a,b,c)});return d&&f.then(function(a){d(a.image,a.errors)},function(b){d(null,[{resourceType:"page",url:a,msg:b.message+" "+a}])}),f};return e.drawURL=function(){var a=arguments[0],b=Array.prototype.slice.call(arguments,1),c=e.util.parseOptionalParameters(b);return I(a,c.canvas,c.options,c.callback)},e}(window.rasterizeHTMLInline,window.xmlserializer,ayepromise,window);
// js-imagediff 1.0.3
// (c) 2011-2012 Carl Sutherland, Humble Software
// Distributed under the MIT License
// For original source and documentation visit:
// http://www.github.com/HumbleSoftware/js-imagediff

(function (name, definition) {
  var root = this;
  if (typeof module !== 'undefined') {
    try {
      var Canvas = require('canvas');
    } catch (e) {
      throw new Error(
        e.message + '\n' + 
        'Please see https://github.com/HumbleSoftware/js-imagediff#cannot-find-module-canvas\n'
      );
    }
    module.exports = definition(root, name, Canvas);
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
    define(definition);
  } else {
    root[name] = definition(root, name);
  }
})('imagediff', function (root, name, Canvas) {

  var
    TYPE_ARRAY        = /\[object Array\]/i,
    TYPE_CANVAS       = /\[object (Canvas|HTMLCanvasElement)\]/i,
    TYPE_CONTEXT      = /\[object CanvasRenderingContext2D\]/i,
    TYPE_IMAGE        = /\[object (Image|HTMLImageElement)\]/i,
    TYPE_IMAGE_DATA   = /\[object ImageData\]/i,

    UNDEFINED         = 'undefined',

    canvas            = getCanvas(),
    context           = canvas.getContext('2d'),
    previous          = root[name],
    imagediff, jasmine;

  // Creation
  function getCanvas (width, height) {
    var
      canvas = Canvas ?
        new Canvas() :
        document.createElement('canvas');
    if (width) canvas.width = width;
    if (height) canvas.height = height;
    return canvas;
  }
  function getImageData (width, height) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    return context.createImageData(width, height);
  }


  // Type Checking
  function isImage (object) {
    return isType(object, TYPE_IMAGE);
  }
  function isCanvas (object) {
    return isType(object, TYPE_CANVAS);
  }
  function isContext (object) {
    return isType(object, TYPE_CONTEXT);
  }
  function isImageData (object) {
    return !!(object &&
      isType(object, TYPE_IMAGE_DATA) &&
      typeof(object.width) !== UNDEFINED &&
      typeof(object.height) !== UNDEFINED &&
      typeof(object.data) !== UNDEFINED);
  }
  function isImageType (object) {
    return (
      isImage(object) ||
      isCanvas(object) ||
      isContext(object) ||
      isImageData(object)
    );
  }
  function isType (object, type) {
    return typeof (object) === 'object' && !!Object.prototype.toString.apply(object).match(type);
  }


  // Type Conversion
  function copyImageData (imageData) {
    var
      height = imageData.height,
      width = imageData.width,
      data = imageData.data,
      newImageData, newData, i;

    canvas.width = width;
    canvas.height = height;
    newImageData = context.getImageData(0, 0, width, height);
    newData = newImageData.data;

    for (i = imageData.data.length; i--;) {
        newData[i] = data[i];
    }

    return newImageData;
  }
  function toImageData (object) {
    if (isImage(object)) { return toImageDataFromImage(object); }
    if (isCanvas(object)) { return toImageDataFromCanvas(object); }
    if (isContext(object)) { return toImageDataFromContext(object); }
    if (isImageData(object)) { return object; }
  }
  function toImageDataFromImage (image) {
    var
      height = image.height,
      width = image.width;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, width, height);
  }
  function toImageDataFromCanvas (canvas) {
    var
      height = canvas.height,
      width = canvas.width,
      context = canvas.getContext('2d');
    return context.getImageData(0, 0, width, height);
  }
  function toImageDataFromContext (context) {
    var
      canvas = context.canvas,
      height = canvas.height,
      width = canvas.width;
    return context.getImageData(0, 0, width, height);
  }
  function toCanvas (object) {
    var
      data = toImageData(object),
      canvas = getCanvas(data.width, data.height),
      context = canvas.getContext('2d');

    context.putImageData(data, 0, 0);
    return canvas;
  }


  // ImageData Equality Operators
  function equalWidth (a, b) {
    return a.width === b.width;
  }
  function equalHeight (a, b) {
    return a.height === b.height;
  }
  function equalDimensions (a, b) {
    return equalHeight(a, b) && equalWidth(a, b);
  }
  function equal (a, b, tolerance) {

    var
      aData     = a.data,
      bData     = b.data,
      length    = aData.length,
      i;

    tolerance = tolerance || 0;

    if (!equalDimensions(a, b)) return false;
    for (i = length; i--;) if (aData[i] !== bData[i] && Math.abs(aData[i] - bData[i]) > tolerance) return false;

    return true;
  }


  // Diff
  function diff (a, b, options) {
    return (equalDimensions(a, b) ? diffEqual : diffUnequal)(a, b, options);
  }
  function diffEqual (a, b, options) {

    var
      height  = a.height,
      width   = a.width,
      c       = getImageData(width, height), // c = a - b
      aData   = a.data,
      bData   = b.data,
      cData   = c.data,
      length  = cData.length,
      row, column,
      i, j, k, v;

    for (i = 0; i < length; i += 4) {
      cData[i] = Math.abs(aData[i] - bData[i]);
      cData[i+1] = Math.abs(aData[i+1] - bData[i+1]);
      cData[i+2] = Math.abs(aData[i+2] - bData[i+2]);
      cData[i+3] = Math.abs(255 - Math.abs(aData[i+3] - bData[i+3]));
    }

    return c;
  }
  function diffUnequal (a, b, options) {

    var
      height  = Math.max(a.height, b.height),
      width   = Math.max(a.width, b.width),
      c       = getImageData(width, height), // c = a - b
      aData   = a.data,
      bData   = b.data,
      cData   = c.data,
      align   = options && options.align,
      rowOffset,
      columnOffset,
      row, column,
      i, j, k, v;


    for (i = cData.length - 1; i > 0; i = i - 4) {
      cData[i] = 255;
    }

    // Add First Image
    offsets(a);
    for (row = a.height; row--;){
      for (column = a.width; column--;) {
        i = 4 * ((row + rowOffset) * width + (column + columnOffset));
        j = 4 * (row * a.width + column);
        cData[i+0] = aData[j+0]; // r
        cData[i+1] = aData[j+1]; // g
        cData[i+2] = aData[j+2]; // b
        // cData[i+3] = aData[j+3]; // a
      }
    }

    // Subtract Second Image
    offsets(b);
    for (row = b.height; row--;){
      for (column = b.width; column--;) {
        i = 4 * ((row + rowOffset) * width + (column + columnOffset));
        j = 4 * (row * b.width + column);
        cData[i+0] = Math.abs(cData[i+0] - bData[j+0]); // r
        cData[i+1] = Math.abs(cData[i+1] - bData[j+1]); // g
        cData[i+2] = Math.abs(cData[i+2] - bData[j+2]); // b
      }
    }

    // Helpers
    function offsets (imageData) {
      if (align === 'top') {
        rowOffset = 0;
        columnOffset = 0;
      } else {
        rowOffset = Math.floor((height - imageData.height) / 2);
        columnOffset = Math.floor((width - imageData.width) / 2);
      }
    }

    return c;
  }


  // Validation
  function checkType () {
    var i;
    for (i = 0; i < arguments.length; i++) {
      if (!isImageType(arguments[i])) {
        throw {
          name : 'ImageTypeError',
          message : 'Submitted object was not an image.'
        };
      }
    }
  }


  // Jasmine Matchers
  function get (element, content) {
    element = document.createElement(element);
    if (element && content) {
      element.innerHTML = content;
    }
    return element;
  }

  jasmine = {

    toBeImageData : function () {
      return imagediff.isImageData(this.actual);
    },

    toImageDiffEqual : function (expected, tolerance) {

      if (typeof (document) !== UNDEFINED) {
        this.message = function () {
          var
            div     = get('div'),
            a       = get('div', '<div>Actual:</div>'),
            b       = get('div', '<div>Expected:</div>'),
            c       = get('div', '<div>Diff:</div>'),
            diff    = imagediff.diff(this.actual, expected),
            canvas  = getCanvas(),
            context;

          canvas.height = diff.height;
          canvas.width  = diff.width;

          div.style.overflow = 'hidden';
          a.style.float = 'left';
          b.style.float = 'left';
          c.style.float = 'left';

          context = canvas.getContext('2d');
          context.putImageData(diff, 0, 0);

          a.appendChild(toCanvas(this.actual));
          b.appendChild(toCanvas(expected));
          c.appendChild(canvas);

          div.appendChild(a);
          div.appendChild(b);
          div.appendChild(c);

          return [
            div,
            "Expected not to be equal."
          ];
        };
      }

      return imagediff.equal(this.actual, expected, tolerance);
    }
  };


  // Image Output
  function imageDataToPNG (imageData, outputFile, callback) {

    var
      canvas = toCanvas(imageData),
      base64Data,
      decodedImage;

    callback = callback || Function;

    base64Data = canvas.toDataURL().replace(/^data:image\/\w+;base64,/,"");
    decodedImage = new Buffer(base64Data, 'base64');
    require('fs').writeFile(outputFile, decodedImage, callback);
  }


  // Definition
  imagediff = {

    createCanvas : getCanvas,
    createImageData : getImageData,

    isImage : isImage,
    isCanvas : isCanvas,
    isContext : isContext,
    isImageData : isImageData,
    isImageType : isImageType,

    toImageData : function (object) {
      checkType(object);
      if (isImageData(object)) { return copyImageData(object); }
      return toImageData(object);
    },

    equal : function (a, b, tolerance) {
      checkType(a, b);
      a = toImageData(a);
      b = toImageData(b);
      return equal(a, b, tolerance);
    },
    diff : function (a, b, options) {
      checkType(a, b);
      a = toImageData(a);
      b = toImageData(b);
      return diff(a, b, options);
    },

    jasmine : jasmine,

    // Compatibility
    noConflict : function () {
      root[name] = previous;
      return imagediff;
    }
  };

  if (typeof module !== 'undefined') {
    imagediff.imageDataToPNG = imageDataToPNG;
  }

  return imagediff;
});

csscriticLib.phantomjsRenderer = function () {

    var module = {};

    var getFileUrl = function (address) {
        var fs = require("fs");

        return address.indexOf("://") === -1 ? "file://" + fs.absolute(address) : address;
    };

    var getDataUriForBase64PNG = function (pngBase64) {
        return "data:image/png;base64," + pngBase64;
    };

    var getImageForUrl = function (url) {
        var defer = ayepromise.defer(),
            image = new window.Image();

        image.onload = function () {
            defer.resolve(image);
        };
        image.onerror = defer.reject;
        image.src = url;

        return defer.promise;
    };

    var renderPage = function (page) {
        var base64PNG, imgURI;

        base64PNG = page.renderBase64("PNG");
        imgURI = getDataUriForBase64PNG(base64PNG);

        return getImageForUrl(imgURI);
    };

    var waitFor = function (millis) {
        var defer = ayepromise.defer();
        setTimeout(defer.resolve, millis);
        return defer.promise;
    };

    var openPage = function (url, width, height) {
        var defer = ayepromise.defer(),
            page = require("webpage").create(),
            errorneousResources = [];

        page.onResourceReceived = function (response) {
            var protocol = response.url.substr(0, 7);

            if (response.stage === "end" &&
                ((protocol !== "file://" && response.status >= 400) ||
                    (protocol === "file://" && !response.headers.length))) {
                errorneousResources.push(response.url);
            }
        };

        page.viewportSize = {
            width: width,
            height: height
        };

        page.open(url, function (status) {
            if (status === "success") {
                defer.resolve({
                    page: page,
                    errorneousResources: errorneousResources
                });
            } else {
                defer.reject();
            }
        });

        return defer.promise;
    };

    module.render = function (parameters) {
        return openPage(getFileUrl(parameters.url), parameters.width, parameters.height)
            .then(function (result) {
                return waitFor(200)
                    .then(function () {
                        return renderPage(result.page);
                    })
                    .then(function (image) {
                        return {
                            image: image,
                            errors: result.errorneousResources
                        };
                    });
            });
    };

    return module;
};

csscriticLib.filestorage = function (util) {
    var module = {};

    var fs = require("fs");

    module.options = {
        basePath: "./"
    };

    var filePathForKey = function (key) {
        return module.options.basePath + key + ".json";
    };

    module.storeReferenceImage = function (key, pageImage, viewport) {
        var uri, dataObj;

        uri = util.getDataURIForImage(pageImage);
        dataObj = {
            referenceImageUri: uri,
            viewport: {
                width: viewport.width,
                height: viewport.height
            }
        };

        fs.write(filePathForKey(key), JSON.stringify(dataObj), "w");
    };

    var parseStoredItem = function (dataObjString) {
        var dataObj;

        if (! dataObjString) {
            throw new Error("No data supplied");
        }

        dataObj = JSON.parse(dataObjString);

        if (!dataObj.referenceImageUri) {
            throw new Error("No reference image found");
        }

        return dataObj;
    };

    module.readReferenceImage = function (key, successCallback, errorCallback) {
        var filePath = filePathForKey(key),
            dataObj;

        if (! fs.exists(filePath)) {
            errorCallback();
            return;
        }

        try {
            dataObj = parseStoredItem(fs.read(filePath));
        } catch (e) {
            errorCallback();
            return;
        }

        util.getImageForUrl(dataObj.referenceImageUri, function (img) {
            var viewport = dataObj.viewport || {
                width: img.width,
                height: img.height
            };

            successCallback(img, viewport);
        }, errorCallback);
    };

    return module;
};

csscriticLib.main = function (renderer, storage, util, imagediff) {
    var module = {};

    var reporters, testCases;

    var clear = function () {
        reporters = [];
        testCases = [];
    };

    clear();

    var buildReportResult = function (comparison) {
        var viewportWidth = comparison.viewportWidth,
            viewportHeight = comparison.viewportHeight;
        var result = {
                status: comparison.status,
                pageUrl: comparison.pageUrl,
                pageImage: comparison.htmlImage
            };

        if (comparison.htmlImage) {
            result.resizePageImage = function (width, height, callback) {
                viewportWidth = width;
                viewportHeight = height;

                renderer.render({
                    url: comparison.pageUrl,
                    width: width,
                    height: height
                }).then(function (renderResult) {
                    result.pageImage = renderResult.image;
                    callback(renderResult.image);
                });
            };
            result.acceptPage = function () {
                storage.storeReferenceImage(comparison.pageUrl, result.pageImage, {
                    width: viewportWidth,
                    height: viewportHeight
                });
            };
        }

        if (comparison.referenceImage) {
            result.referenceImage = comparison.referenceImage;
        }

        if (comparison.renderErrors && comparison.renderErrors.length) {
            result.renderErrors = comparison.renderErrors;
        }

        return result;
    };

    var reportComparisonStarting = function (testCases, callback) {
        util.map(testCases, function (testCase, finishTestCase) {
            util.map(reporters, function (reporter, finishReporter) {
                if (reporter.reportComparisonStarting) {
                    reporter.reportComparisonStarting({pageUrl: testCase.url}, finishReporter);
                } else {
                    finishReporter();
                }
            }, finishTestCase);
        }, callback);
    };

    var reportComparison = function (comparison, callback) {
        var result = buildReportResult(comparison);

        util.map(reporters, function (reporter, finishUp) {
            if (reporter.reportComparison) {
                reporter.reportComparison(result, finishUp);
            } else {
                finishUp();
            }
        }, callback);
    };

    var reportTestSuite = function (passed, callback) {
        util.map(reporters, function (reporter, finish) {
            if (reporter.report) {
                reporter.report({success: passed}, finish);
            } else {
                finish();
            }
        }, callback);
    };

    module.addReporter = function (reporter) {
        reporters.push(reporter);
    };

    module.clearReporters = function () {
        reporters = [];
    };

    var workaroundFirefoxResourcesSporadicallyMissing = function (htmlImage, referenceImage) {
        if (referenceImage) {
            // This does nothing meaningful for us, but seems to trigger Firefox to load any missing resources.
            imagediff.diff(htmlImage, referenceImage);
        }
    };

    var loadPageAndReportResult = function (testCase, viewport, referenceImage, callback) {

        renderer.render({
            url: testCase.url,
            width: viewport.width,
            height: viewport.height
        }).then(function (renderResult) {
            var isEqual, textualStatus;

            workaroundFirefoxResourcesSporadicallyMissing(renderResult.image, referenceImage);

            util.workAroundTransparencyIssueInFirefox(renderResult.image, function (adaptedHtmlImage) {
                if (referenceImage) {
                    isEqual = imagediff.equal(adaptedHtmlImage, referenceImage);
                    textualStatus = isEqual ? "passed" : "failed";
                } else {
                    textualStatus = "referenceMissing";
                }

                reportComparison({
                        status: textualStatus,
                        pageUrl: testCase.url,
                        htmlImage: renderResult.image,
                        referenceImage: referenceImage,
                        renderErrors: renderResult.errors,
                        viewportWidth: viewport.width,
                        viewportHeight: viewport.height
                    },
                    function () {
                        callback(textualStatus === "passed");
                    }
                );
            });
        }, function () {
            var textualStatus = "error";

            reportComparison({
                    status: textualStatus,
                    pageUrl: testCase.url
                },
                function () {
                    callback(false);
                }
            );
        });
    };

    var compare = function (testCase, callback) {
        var defaultViewport = {width: 800, height: 100};

        storage.readReferenceImage(testCase.url, function (referenceImage, viewport) {
            loadPageAndReportResult(testCase, viewport, referenceImage, callback);
        }, function () {
            loadPageAndReportResult(testCase, defaultViewport, null, callback);
        });
    };

    module.add = function (testCase) {
        // Support url as only test case input
        if (typeof testCase === 'string') {
            testCase = {
                url: testCase
            };
        }

        testCases.push(testCase);
    };

    module.execute = function (callback) {
        reportComparisonStarting(testCases, function () {

            util.map(testCases, function (testCase, finish) {
                compare(testCase, finish);
            }, function (results) {
                var allPassed = results.indexOf(false) === -1;

                reportTestSuite(allPassed, function () {
                    if (callback) {
                        callback(allPassed);
                    }
                });
            });
        });
    };

    module.clear = clear;

    return module;
};

csscriticLib.signOffReporterUtil = function (util, rasterizeHTMLInline, JsSHA) {
    var module = {};

    var getFileUrl = function (address) {
        var fs;

        if (window.require) {
            fs = require("fs");

            return address.indexOf("://") === -1 ? "file://" + fs.absolute(address) : address;
        } else {
            return address;
        }
    };

    module.loadFullDocument = function (pageUrl, callback) {
        var absolutePageUrl = getFileUrl(pageUrl),
            doc = window.document.implementation.createHTMLDocument("");

        util.ajax(absolutePageUrl).then(function (content) {
            doc.documentElement.innerHTML = content;

            rasterizeHTMLInline.inlineReferences(doc, {baseUrl: absolutePageUrl, cache: false}).then(function () {
                callback('<html>' +
                    doc.documentElement.innerHTML +
                    '</html>');
            });
        }, function () {
            console.log("Error loading document for sign-off: " + pageUrl + ". For accessing URLs over HTTP you need CORS enabled on that server.");
        });
    };

    module.loadFingerprintJson = function (url, callback) {
        var absoluteUrl = getFileUrl(url);

        util.ajax(absoluteUrl).then(function (content) {
            callback(JSON.parse(content));
        });
    };

    module.calculateFingerprint = function (content) {
        var shaObj = new JsSHA(content, "TEXT");

        return shaObj.getHash("SHA-224", "HEX");
    };

    return module;
};

csscriticLib.signOffReporter = function (signOffReporterUtil) {
    var module = {};

    var calculateFingerprintForPage = function (pageUrl, callback) {
        signOffReporterUtil.loadFullDocument(pageUrl, function (content) {
            var actualFingerprint = signOffReporterUtil.calculateFingerprint(content);

            callback(actualFingerprint);
        });
    };

    var findPage = function (pageUrl, signedOffPages) {
        var signedOffPage = null;

        signedOffPages.forEach(function (entry) {
            if (entry.pageUrl === pageUrl) {
                signedOffPage = entry;
            }
        });

        return signedOffPage;
    };

    var acceptSignedOffPage = function (result, signedOffPages, callback) {
        var signedOffPageEntry;

        if (result.status === "failed" || result.status === "referenceMissing") {
            signedOffPageEntry = findPage(result.pageUrl, signedOffPages);

            calculateFingerprintForPage(result.pageUrl, function (actualFingerprint) {
                if (signedOffPageEntry) {
                    if (actualFingerprint === signedOffPageEntry.fingerprint) {
                        console.log("Generating reference image for " + result.pageUrl);
                        result.acceptPage();
                    } else {
                        console.log("Fingerprint does not match for " + result.pageUrl + ", current fingerprint " + actualFingerprint);
                    }
                } else {
                    console.log("No sign-off for " + result.pageUrl + ", current fingerprint " + actualFingerprint);
                }

                if (callback) {
                    callback();
                }
            });
        } else {
            if (callback) {
                callback();
            }
        }
    };

    module.SignOffReporter = function (signedOffPages) {
        return {
            reportComparison: function (result, callback) {
                if (! Array.isArray(signedOffPages)) {
                    signOffReporterUtil.loadFingerprintJson(signedOffPages, function (json) {
                        acceptSignedOffPage(result, json, callback);
                    });
                } else {
                    acceptSignedOffPage(result, signedOffPages, callback);
                }
            }
        };
    };

    return module;
};

csscriticLib.terminalReporter = function (console) {
    var module = {};

    var ATTRIBUTES_TO_ANSI = {
            "off": 0,
            "bold": 1,
            "red": 31,
            "green": 32
        };

    var inColor = function (string, color) {
        var color_attributes = color && color.split("+"),
            ansi_string = "";

        if (!color_attributes) {
            return string;
        }

        color_attributes.forEach(function (colorAttr) {
            ansi_string += "\033[" + ATTRIBUTES_TO_ANSI[colorAttr] + "m";
        });
        ansi_string += string + "\033[" + ATTRIBUTES_TO_ANSI['off'] + "m";

        return ansi_string;
    };

    var statusColor = {
            passed: "green+bold",
            failed: "red+bold",
            error: "red+bold",
            referenceMissing: "red+bold"
        };

    var reportComparison = function (result, callback) {
        var color = statusColor[result.status] || "",
            statusStr = inColor(result.status, color);
        if (result.renderErrors) {
            console.log(inColor("Error(s) loading " + result.pageUrl + ":", "red"));
            result.renderErrors.forEach(function (msg) {
                console.log(inColor("  " + msg, "red+bold"));
            });
        }

        console.log("Testing " + result.pageUrl + "... " + statusStr);

        if (callback) {
            callback();
        }
    };

    module.TerminalReporter = function () {
        return {
            reportComparison: reportComparison
        };
    };

    return module;
};

csscriticLib.htmlFileReporter = function () {
    var module = {};

    var reportComparison = function (result, basePath, callback) {
        var imagesToWrite = [];

        if (result.status !== "error") {
            imagesToWrite.push({
                imageUrl: result.pageImage.src,
                width: result.pageImage.width,
                height: result.pageImage.height,
                target: basePath + getTargetBaseName(result.pageUrl) + ".png"
            });
        }
        if (result.status === "failed") {
            imagesToWrite.push({
                imageUrl: result.referenceImage.src,
                width: result.referenceImage.width,
                height: result.referenceImage.height,
                target: basePath + getTargetBaseName(result.pageUrl) + ".reference.png"
            });
            imagesToWrite.push({
                imageUrl: getDifferenceCanvas(result.pageImage, result.referenceImage).toDataURL('image/png'),
                width: result.referenceImage.width,
                height: result.referenceImage.height,
                target: basePath + getTargetBaseName(result.pageUrl) + ".diff.png"
            });
        }

        renderUrlsToFile(imagesToWrite, function () {
            if (callback) {
                callback();
            }
        });
    };

    var compileReport = function (results, basePath, callback) {
        var fs = require("fs"),
            content = results.success ? "Passed" : "Failed",
            document = "<html><body>" + content + "</body></html>";

        fs.write(basePath + "index.html", document, "w");
        callback();
    };

    var getTargetBaseName = function (filePath) {
        var fileName = filePath.substr(filePath.lastIndexOf("/")+1),
            stripEnding = ".html";

        if (fileName.substr(fileName.length - stripEnding.length) === stripEnding) {
            fileName = fileName.substr(0, fileName.length - stripEnding.length);
        }
        return fileName;
    };

    var renderUrlsToFile = function (entrys, callback) {
        var urlsWritten = 0;

        if (entrys.length === 0) {
            callback();
            return;
        }

        entrys.forEach(function (entry) {
            renderUrlToFile(entry.imageUrl, entry.target, entry.width, entry.height, function () {
                urlsWritten += 1;

                if (entrys.length === urlsWritten) {
                    callback();
                }
            });
        });
    };

    var renderUrlToFile = function (url, filePath, width, height, callback) {
        var webpage = require("webpage"),
            page = webpage.create();

        page.viewportSize = {
            width: width,
            height: height
        };

        page.open(url, function () {
            page.render(filePath);

            callback();
        });
    };

    var getDifferenceCanvas = function (imageA, imageB) {
        var differenceImageData = imagediff.diff(imageA, imageB),
            canvas = document.createElement("canvas"),
            context;

        canvas.height = differenceImageData.height;
        canvas.width  = differenceImageData.width;

        context = canvas.getContext("2d");
        context.putImageData(differenceImageData, 0, 0);

        return canvas;
    };

    module.HtmlFileReporter = function (basePath) {
        basePath = basePath || "./";

        if (basePath[basePath.length - 1] !== '/') {
            basePath += '/';
        }

        return {
            reportComparison: function (result, callback) {
                return reportComparison(result, basePath, callback);
            },
            report: function (results, callback) {
                return compileReport(results, basePath, callback);
            }
        };
    };

    return module;
};

csscriticLib.phantomjsRunner = function (csscritic) {
    var system = require("system");

    var module = {};

    var parseArguments = function (args) {
        var i = 0,
            arg, value,
            parsedArguments = {
                opts: {},
                args: []
            };

        var getFollowingValue = function (args, i) {
            if (i + 1 >= args.length) {
                throw new Error("Invalid arguments");
            }
            return args[i+1];
        };

        while(i < args.length) {
            if (args[i].substr(0, 2) === "--") {
                if (args[i].indexOf('=') >= 0) {
                    arg = args[i].substring(0, args[i].indexOf('='));
                    value = args[i].substring(args[i].indexOf('=') + 1, args[i].length);
                } else {
                    arg = args[i];
                    value = getFollowingValue(args, i);

                    i += 1;
                }

                parsedArguments.opts[arg] = value;
            } else if (args[i][0] === "-") {
                arg = args[i];
                parsedArguments.opts[arg] = getFollowingValue(args, i);

                i += 1;
            } else {
                arg = args[i];
                parsedArguments.args.push(arg);
            }
            i += 1;
        }

        return parsedArguments;
    };

    var runCompare = function (testDocuments, signedOffPages, logToPath, doneHandler) {
        signedOffPages = signedOffPages || [];

        csscritic.addReporter(csscritic.SignOffReporter(signedOffPages));
        csscritic.addReporter(csscritic.TerminalReporter());
        if (logToPath) {
            csscritic.addReporter(csscritic.HtmlFileReporter(logToPath));
        }

        testDocuments.forEach(function (testDocument) {
            csscritic.add(testDocument);
        });

        csscritic.execute(doneHandler);
    };

    module.main = function () {
        var parsedArguments = parseArguments(system.args.slice(1)),
            signedOffPages = parsedArguments.opts['-f'],
            logToPath = parsedArguments.opts['--log'];

        if (parsedArguments.args.length < 1) {
            console.log("CSS critic regression runner for PhantomJS");
            console.log("Usage: phantomjs-regressionrunner.js [-f SIGNED_OFF.json] [--log PATH] A_DOCUMENT.html [ANOTHER_DOCUMENT.html ...]");
            phantom.exit(2);
        } else {
            runCompare(parsedArguments.args, signedOffPages, logToPath, function (passed) {
                var ret = passed ? 0 : 1;

                phantom.exit(ret);
            });
        }
    };

    return module;
};

(function () {
    "use strict";

    var util = csscriticLib.util(),
        phantomRenderer = csscriticLib.phantomjsRenderer(),
        filestorage = csscriticLib.filestorage(util);

    var csscritic = csscriticLib.main(
        phantomRenderer,
        filestorage,
        util,
        imagediff);

    // Export convenience constructors
    var signOffReporterUtil = csscriticLib.signOffReporterUtil(util, rasterizeHTMLInline, jsSHA),
        signOffReporter = csscriticLib.signOffReporter(signOffReporterUtil),
        htmlFileReporter = csscriticLib.htmlFileReporter(),
        terminalReporter = csscriticLib.terminalReporter(window.console);

    csscritic.HtmlFileReporter = htmlFileReporter.HtmlFileReporter;
    csscritic.SignOffReporter = signOffReporter.SignOffReporter;
    csscritic.TerminalReporter = terminalReporter.TerminalReporter;

    var runner = csscriticLib.phantomjsRunner(csscritic);
    runner.main();
}());
