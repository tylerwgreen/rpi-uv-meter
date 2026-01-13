module.paths.push(__dirname + '/app');
const L = require('gpioLcdScreenTest');

var lcd = L.init({
	// consoleLoggingLevel: null,
	boardDebug: true,
	lcdType: 'LCM1602',
	i2cAddress: 0x20
}).then(result => {
	var t = 0;
	var i = setInterval(function(){
		console.log('foo|' + t);
		L.lines.top.update('foofoofoofoof|' + t);
		L.lines.bottom.update('barbarbarbarb|' + t);
		t++;
		/* .then(lcd.lines.bottom.update('bar'))
		.then(() => {
			console.log('bar');
		}); */
	}, 50);
})
.catch(error => {
	console.log(error);
});
