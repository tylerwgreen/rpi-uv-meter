var app = {
	config: null,
	logger: null,
	_logger: null, // configuledRed logger object
	init: function(){
		// setup app environment
		module.paths.push(__dirname + '/app');
		process.env['APP_ROOT_DIR'] = __dirname;
		process.env['NODE_CONFIG_DIR'] = __dirname + '/app/config';
		process.env['APP_CACHE_DIR'] = __dirname + '/app/cache';
		// setup config module
		app.config = require('config');
		// setup logger module
		app._logger = require('logger');
		app._logger.init(app.config.get('logger'));
		app.logger = app._logger.getLogger('app', app.config.get('app.consoleLoggingLevel'));
		// initialize app
		app.logger.debug('app.init()');
		app.logger.verbose('initializing application');
		// new Promise((resolve, reject) => {resolve();})
		app.peripherals.init()
		.then(app.tasks.welcome)
		.then(app.tasks.read)
		.catch(error => {
			app.logger.error(error);
		});
	},
	tasks: {
		welcome: function(){
			app.logger.debug('app.tasks.welcome()');
			return new Promise((resolve, reject) => {
				app.peripherals.lcdScreen.update.top('Welcome!')
				.then(result => {
					return app.peripherals.lcdScreen.update.bottom(app.date.getDate() + '|' + app.date.getTime());
				})
				.then(result => {
					// pause welcome screen
					setTimeout(function(){
						resolve();
					}, app.config.get('tasks.welcome.pauseDurationMs'));
				})
				.catch(error => {
					app.logger.error('app.tasks.welcome: ' + error);
					reject();
				});
			});
		},
		read: function(){
			app.logger.debug('app.tasks.read()');
			var interval = setInterval(function(){
				var maxReadingPadding = 5; // The VEML6075 sensor outputs UVA and UVB light intensity as 16-bit digital values, meaning the maximum raw value for each channel is 65,535 counts.
				var data = app.peripherals.uvSensor.readings.get();
				// console.log(data);
				// console.log('a|' + data.uva.read + '|' + data.uva.accumulated + '|b|' + data.uvb.read + '|' + data.uvb.accumulated + '|s|' + data.elapsedSec);
				// app.peripherals.lcdScreen.shortenNumber(data.uvb.calc)
				app.peripherals.lcdScreen.update.top(
					app.peripherals.lcdScreen.padTextLeft(Math.round(data.uva.irra.mwm2), maxReadingPadding)
					+ app.peripherals.lcdScreen.padTextLeft(data.config.it, 6)
					+ app.peripherals.lcdScreen.padTextLeft(data.uvIndex.index.toFixed(1), 5)
				);
				app.peripherals.lcdScreen.update.bottom(
					app.peripherals.lcdScreen.padTextLeft(Math.round(data.uvb.irra.mwm2), maxReadingPadding)
					+ app.peripherals.lcdScreen.padTextLeft(data.visBlue.counts.raw + data.visCyan.counts.raw, 6)
					+ app.peripherals.lcdScreen.padTextLeft(data.uvIndex.level, 5)
				);
			}, app.config.get('tasks.read.intervalMs'));
		},
	},
	peripherals: {
		init: function(){
			app.logger.debug('app.peripherals.init()');
			app.logger.verbose('initializing peripherals');
			return new Promise((resolve, reject) => {
				// new Promise((resolve, reject) => {resolve();})
				app.peripherals.lcdScreen.init()
				.then(app.peripherals.uvSensor.init)
				.then(result => {
					app.logger.info('peripherals initialized');
					resolve('peripherals initialized');
				})
				.catch(error => {
					app.logger.error('app.peripherals.init: ' + error);
					reject();
				});
			});
		},
		uvSensor: {
			_uvSensor: null,
			init: function(){
				app.logger.debug('app.peripherals.uvSensor.init()');
				app.logger.verbose('initializing uvSensor');
				return new Promise((resolve, reject) => {
					app.peripherals.uvSensor._uvSensor = require('gpioUvSensor');
					app.peripherals.uvSensor._uvSensor.init(app._logger, app.config.get('peripherals.uvSensor.config')).then(result => {
						app.logger.info('uvSensor initialized');
						resolve('uvSensor initialized');
					});
				});
			},
			readings: {
				get: function(){
					app.logger.silly('app.peripherals.uvSensor.measurement.get()');
					return app.peripherals.uvSensor._uvSensor.measurement.get();
				}
			},
		},
		lcdScreen: {
			lcdScreen: null,
			init: function(){
				app.logger.debug('app.peripherals.lcdScreen.init()');
				app.logger.verbose('initializing lcdScreen');
				return new Promise((resolve, reject) => {
					app.peripherals.lcdScreen.lcdScreen = require('gpioLcdScreen');
					app.peripherals.lcdScreen.lcdScreen.init(app._logger, app.config.get('peripherals.lcdScreen.config')).then(result => {
						app.logger.info('lcdScreen initialized');
						resolve();
					})
					.catch(error => {
						reject(error);
					});
				});
			},
			reset: function(){
				app.logger.debug('app.peripherals.lcdScreen.reset()');
				return app.peripherals.lcdScreen.lcdScreen.lines.reset();
			},
			update: {
				top: function(text){
					app.logger.silly('app.peripherals.lcdScreen.update.top()');
					return app.peripherals.lcdScreen.lcdScreen.lines.top.update(text);
				},
				bottom: function(text){
					app.logger.silly('app.peripherals.lcdScreen.update.bottom()');
					return app.peripherals.lcdScreen.lcdScreen.lines.bottom.update(text);
				},
			},
			shortenNumber: function(num, decimals = 2){
				if(num >= 1000000){
					return (num / 1000000).toFixed(decimals) + 'm';
				}else if(num >= 1000){
					return (num / 1000).toFixed(decimals) + 'k';
				}
				return num;
			},
			padTextLeft: function(text, spaces, filler = ' '){
				return String(text).padStart(spaces, filler);
			},
			/* padTextRight: function(text, spaces, filler = ' '){
				return String(text).padEnd(spaces, filler);
			}, */
		},
	},
	date: {
		getDate: function(){
			app.logger.debug('app.date.getDate()');
			var dateObject = new Date();
			var d = ('0' + dateObject.getDate()).slice(-2);
			var m = ('0' + (dateObject.getMonth() + 1)).slice(-2);
			var y = dateObject.getFullYear();
			return y + '-' + m + '-' + d;
		},
		getTime: function(){
			app.logger.debug('app.date.getTime()');
			var dateObject = new Date();
			var h = ('0' + dateObject.getHours()).slice(-2);
			var m = ('0' + dateObject.getMinutes()).slice(-2);
			var s = ('0' + dateObject.getSeconds()).slice(-2);
			return h + ':' + m + ':' + s;
		}
	},
}
app.init();