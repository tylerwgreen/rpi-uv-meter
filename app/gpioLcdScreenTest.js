const {Board, LCD} = require('johnny-five');
const RaspiIO = require('raspi-io').RaspiIO;

var gpioLcdScreenTest = {
	_logger: null,
	_board: null,
	_lcd: null,
	init: function(config){ // init: function(logger, config){
		// gpioLcdScreenTest._logger = logger.getLogger('gpioLcdScreen', config.consoleLoggingLevel);
		// gpioLcdScreenTest._logger.debug('gpioLcdScreenTest.init()');
		// gpioLcdScreenTest._logger.verbose('initializing gpioLcdScreen');
		return new Promise((resolve, reject) => {
			gpioLcdScreenTest._board = new Board({
				io: new RaspiIO(),
				debug: config.boardDebug,
			});
			gpioLcdScreenTest._board.on('ready', () => {
				// for whatever reason, >> is printed to the console after the board is ready, add a new line to keep the conole log pretty
				console.log();
				// ==========
				// Use the board's `samplingInterval(ms)` to
				// control the actual MCU sampling rate.
				//
				// This will limit sampling of all Analog Input
				// and I2C sensors to once per second (1000 milliseconds)
				//
				// Keep in mind that calling this method
				// will ALWAYS OVERRIDE any per-sensor
				// interval/rate/frequency settings.
				// ==========
				// gpioLcdScreenTest._board.samplingInterval(1000);
				gpioLcdScreenTest._board.i2cConfig();
				gpioLcdScreenTest._lcd = new LCD({
					controller: config.lcdType,
					address: config.i2cAddress,
				});
				// gpioLcdScreenTest._logger.info('gpioLcdScreen initialized');
				resolve('gpioLcdScreen initialized');
			});
		});
	},
	_trimText: function(text){
		// gpioLcdScreenTest._logger.silly('gpioLcdScreenTest._trimText()');
		text = '' + text;
		text = text + '                ';
		text = text.slice(0, 16);
		return text;
	},
	lines: {
		reset: function(){
			// gpioLcdScreenTest._logger.debug('gpioLcdScreenTest.lines.reset()');
			return new Promise((resolve, reject) => {
				gpioLcdScreenTest._lcd.clear();
				resolve();
			});
		},
		top: {
			update: function(text){
				// gpioLcdScreenTest._logger.silly('gpioLcdScreenTest.lines.top.update()');
				return new Promise((resolve, reject) => {
					gpioLcdScreenTest._lcd.cursor(0, 0).print(gpioLcdScreenTest._trimText(text));
					resolve();
				});
			}
		},
		bottom: {
			update: function(text){
				// gpioLcdScreenTest._logger.silly('gpioLcdScreenTest.lines.bottom.update()');
				return new Promise((resolve, reject) => {
					gpioLcdScreenTest._lcd.cursor(1, 0).print(gpioLcdScreenTest._trimText(text));
					resolve();
				});
			}
		}
	},
}
module.exports = gpioLcdScreenTest;