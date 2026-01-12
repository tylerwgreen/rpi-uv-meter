const LCD = require('@oawu/lcd1602');

var gpioLcdScreen = {
	_logger: null,
	_board: null,
	_lcd: null,
	init: function(logger, config){
		gpioLcdScreen._logger = logger.getLogger('gpioLcdScreen', config.consoleLoggingLevel);
		gpioLcdScreen._logger.debug('gpioLcdScreen.init()');
		gpioLcdScreen._logger.verbose('initializing gpioLcdScreen');
		return new Promise((resolve, reject) => {
			gpioLcdScreen._lcd = new LCD(config.address);
			gpioLcdScreen.lines.reset().then(() => {
				resolve();
			});
		});
	},
	_trimText: function(text){
		gpioLcdScreen._logger.silly('gpioLcdScreen._trimText()');
		text = '' + text;
		text = text + '                ';
		text = text.slice(0, 16);
		return text;
	},
	lines: {
		reset: function(){
			gpioLcdScreen._logger.debug('gpioLcdScreen.lines.reset()');
			return new Promise((resolve, reject) => {
				gpioLcdScreen._lcd.clear(() => {
					resolve();
				});
			});
		},
		top: {
			update: function(text){
				gpioLcdScreen._logger.silly('gpioLcdScreen.lines.top.update()');
				return new Promise((resolve, reject) => {
					gpioLcdScreen._lcd.text(0, 0, gpioLcdScreen._trimText(text));
					resolve();
				});
			}
		},
		bottom: {
			update: function(text){
				gpioLcdScreen._logger.silly('gpioLcdScreen.lines.bottom.update()');
				return new Promise((resolve, reject) => {
					gpioLcdScreen._lcd.text(1, 0, gpioLcdScreen._trimText(text));
					resolve();
				});
			}
		}
	},
}
module.exports = gpioLcdScreen;
