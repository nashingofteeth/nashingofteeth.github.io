chrome.browserAction.setBadgeBackgroundColor({color:[0, 0, 0, 255]});
function showTime() {
            var date = new Date();
            var milli = date.getMilliseconds();
            var seconds = date.getSeconds() * 1000;
            var minutes = date.getMinutes() * 60000;
            var hours = date.getHours() * 3600000;
            var totalMilli = milli + seconds + minutes + hours;
            var decimal = totalMilli/8640000;
            var fixed = parseFloat(decimal).toFixed(2);
            chrome.browserAction.setBadgeText({text: fixed});
}
setInterval(function(){showTime()});