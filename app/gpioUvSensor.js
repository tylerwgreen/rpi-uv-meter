// Vishay Semiconductors VEML6075 UVA and UVB Light Sensor
// i2c bus help from: https://github.com/xoblite/BreakoutGardener
const i2c = require('i2c-bus');

var gpioUvSensor = {
	_bus: null,
	_busNumber: null,
	_busAddress: null,
	_integrationTimesMs: null,
	_integrationTimeMs: null,
	_dynamicRangeHigh: null,
	_logReadingsToConsoleFlag: null,
	_logger: null,
	_sensorReadings: {
		uva: 0,
		uvb: 0,
		uvcomp1: 0,
		uvcomp2: 0,
	},
	init: function(logger, config){
// console.log(config);
		gpioUvSensor._busNumber = config.bus.number;
		gpioUvSensor._busAddress = config.bus.address;
		gpioUvSensor._integrationTimesMs = config.integrationTimesMs;
		gpioUvSensor._integrationTimeMs = config.integrationTimesMs[config.integrationTimeInitialIndex];
		gpioUvSensor._reconfigureSensorIntervalMs = config.reconfigureSensorIntervalMs;
		gpioUvSensor._dynamicRangeHigh = config.dynamicRangeHigh;
		gpioUvSensor._logReadingsToConsoleFlag = config.logReadingsToConsole;
		gpioUvSensor._logRawReadingsToConsoleFlag = config.logRawReadingsToConsole;
		gpioUvSensor._logger = logger.getLogger('gpioUvSensor', config.consoleLoggingLevel);
		gpioUvSensor._logger.debug('gpioUvSensor.init()');
		gpioUvSensor._logger.verbose('initializing gpioUvSensor');
		return i2c.openPromisified(gpioUvSensor._busNumber, {
			forceAccess: false
		})
		.then(bus => {
			gpioUvSensor._bus = bus;
			return bus.readWord(gpioUvSensor._busAddress, 0x0c);
		})
		.then(deviceId => {
			return new Promise((resolve, reject) => {
				// Identify using the i2c device ID (0x26) of the VEML6075 device...
				if((deviceId & 0xff) == 0x26){
					resolve();
				}else{
					reject('Bad deviceId: ' + deviceId);
				}
			});
		})
		.then(gpioUvSensor._configureDevice)
		.then(result => {
			return new Promise((resolve, reject) => {
				gpioUvSensor.measurement._tick.init();
				gpioUvSensor._logger.debug('gpioUvSensor initialized');
				resolve();
			});
		})
		.catch(error => {
			gpioUvSensor._logger.error('init: ' + error);
			return new Promise((resolve, reject) => {
				reject(error);
			});
		})
	},
	// 0b........
	// 0b.......X bit 0:	0 = power on, 1 = shut down
	// 0b......X. bit 1:	0 = active force mode disable (normal mode), 1 = active force mode enable
	// 0b.....x.. bit 2:	0 = 0 = no active force mode trigger, 1 = trigger one measurement; With UV_AF = 1 the VEML6075 conducts one measurement every time the host writes UV_Trig = 1. This bit returns to “0” automatically.
	// 0b....X... bit 3:	0 = normal dynamic setting, 1 = high dynamic setting; (HD Setting) is set to 1 for High Dynamic setting [Higher Bit Depth (HD Bit): A higher bit depth allows for a wider dynamic range, enabling the photodiode to capture a broader range of light intensities with greater precision. This is important in applications where the light levels vary significantly, as it ensures that both dim and bright signals can be accurately detected and quantified.]
	//						If you change the HD setting from the default "Normal" mode, the standard UV Index (UVI) calculation formulas provided in the application notes may not be correct anymore, and you would need to adjust the calibration coefficients accordingly.
	// 0b.XXX.... bit 4:6:	(0 : 0 : 0) = 50 ms, (0 : 0 : 1) = 100 ms, (0 : 1 : 0) = 200 ms, (0 : 1 : 1) = 400 ms, (1 : 0 : 0) = 800 ms, (1 : 0 : 1) = reserved, (1 : 1 : 0) = reserved, (1 : 1 : 1) = reserved.
	//						determine comand code for specified integrationTimeMs [Longer Integration Time: Ideal for situations where the light levels are low or the signal is weak. Provides better sensitivity by allowing more time to accumulate photons, leading to a higher SNR. Suitable for applications where precision and accuracy are more critical than speed.]
	// 0bX....... bit 7:	reserved (n/a)
	_configureDevice: function(){
		gpioUvSensor._logger.silly('gpioUvSensor._configureDevice()');
		return gpioUvSensor._bus.writeByte(gpioUvSensor._busAddress, 0x00, 0b00000001) // bit 0 = 1 = Power off ("shut down")
		.then(gpioUvSensor._getIntegrationTimeCommandCode)
		.then(integrationTimeCommandCode => {
			return gpioUvSensor._bus.writeByte(gpioUvSensor._busAddress, 0x00, integrationTimeCommandCode);
		})
		.catch(error => {
			gpioUvSensor._logger.error('_configureDevice: ' + error);
			return new Promise((resolve, reject) => {
				reject(error);
			});
		});
	},
	_getIntegrationTimeCommandCode: function(){
		gpioUvSensor._logger.silly('gpioUvSensor._getIntegrationTimeCommandCode()');
		return new Promise((resolve, reject) => {
			// high/low dynamic range
			if(gpioUvSensor._dynamicRangeHigh){
				switch(gpioUvSensor._integrationTimeMs){
					case 50:	resolve(0b00001000);	break;
					case 100:	resolve(0b00011000);	break;
					case 200:	resolve(0b00101000);	break;
					case 400:	resolve(0b00111000);	break;
					case 800:	resolve(0b01001000);	break;
					default:
						reject('Bad _integrationTimeMs: ' + gpioUvSensor._integrationTimeMs);
				}
			}else{
				switch(gpioUvSensor._integrationTimeMs){
					case 50:	resolve(0b00000000);	break;
					case 100:	resolve(0b00010000);	break;
					case 200:	resolve(0b00100000);	break;
					case 400:	resolve(0b00110000);	break;
					case 800:	resolve(0b01000000);	break;
					default:
						reject('Bad _integrationTimeMs: ' + gpioUvSensor._integrationTimeMs);
				}
			}
		});
	},
	_updateIntegrationTime: function(){
		gpioUvSensor._logger.silly('gpioUvSensor._updateIntegrationTime()');
var rand = Math.floor(Math.random() * ((gpioUvSensor._integrationTimesMs.length - 1) - 0 + 1)) + 0;
gpioUvSensor._integrationTimeMs = gpioUvSensor._integrationTimesMs[rand];
	},
	/* stop: function(callback){
		gpioUvSensor._logger.debug('gpioUvSensor.stop()');
		// Soft reset applicable I2C devices upon exit? (in my experience, e.g. the SGP30 becomes more reliable across restarts with this enabled)
		// Soft reset all [supporting/applicable] devices using the I2C General Call address (0x00)...
		gpioUvSensor._bus.sendByte(gpioUvSensor._busAddress, 0x06)
		.then(result => {
			gpioUvSensor._bus.close()
			.then(result => {
				gpioUvSensor._logger.debug('gpioUvSensor bus closed');
				callback();
			});
		});
	}, */
	/** Because the i2c reading is promisified, data readings from _readSensor() are not exact to time of function call */
	_readSensor: function(){
		gpioUvSensor._logger.silly('gpioUvSensor._readSensor()');
		// read data (read errors are reduced when there is less traffic on the i2c bus ie: less writes to the LCD means better uv read stability)
		// Uncalibrated UVA (peak sensitivity at 365 nm, in a range of about 350 nm to 375 nm)
		gpioUvSensor._bus.readWord(gpioUvSensor._busAddress, 0x07).then(word => {
			if(word >= 0)
				gpioUvSensor._sensorReadings.uva = word;
		})
		// Uncalibrated UVB (peak sensitivity at 330 nm, in a range of about 315 nm to 340 nm)
		gpioUvSensor._bus.readWord(gpioUvSensor._busAddress, 0x09).then(word => {
			if(word >= 0)
				gpioUvSensor._sensorReadings.uvb = word;
		})
		// UV compensation value 1 (peak sensitivity at about 450 nm [blue]) [information about the whole received light within the visible wavelength area, allows only visible noise to pass through]
		gpioUvSensor._bus.readWord(gpioUvSensor._busAddress, 0x0a).then(word => {
			if(word >= 0)
				gpioUvSensor._sensorReadings.uvcomp1 = word;
		})
		// UV compensation value 2 (peak sensitivity at about 510 nm [cyan]) [strength of the infrared content within the received light, allows only infrared noise to pass through]
		gpioUvSensor._bus.readWord(gpioUvSensor._busAddress, 0x0b).then(word => {
			if(word >= 0)
				gpioUvSensor._sensorReadings.uvcomp2 = word;
		})
// console.log(gpioUvSensor._sensorReadings);
	},
	measurement: {
		_data: {},
		_tick: {
			intervalRead: null,
			intervalReconfigure: null,
isReconfiguring: false,
			init: function(){
				gpioUvSensor._logger.debug('gpioUvSensor.measurement._tick.init()');
				gpioUvSensor.measurement._tick.intervalRead = setInterval(gpioUvSensor.measurement._tick.readSensor, gpioUvSensor._integrationTimeMs);
				// gpioUvSensor.measurement._tick.intervalReconfigure = setInterval(gpioUvSensor.measurement._tick.reconfigureSensor, gpioUvSensor._reconfigureSensorIntervalMs);
			},
			readSensor: function(){
				gpioUvSensor._logger.silly('gpioUvSensor.measurement._tick.readSensor()');
if(false === gpioUvSensor.measurement._tick.isReconfiguring){
					gpioUvSensor._readSensor();
					gpioUvSensor.measurement._convertData();
}
			},
			reconfigureSensor: function(){
				gpioUvSensor._logger.silly('gpioUvSensor.measurement._tick.reconfigureSensor()');
gpioUvSensor.measurement._tick.isReconfiguring = true;
				// new Promise((resolve, reject) => {resolve();})
				gpioUvSensor._updateIntegrationTime();
				gpioUvSensor._configureDevice()
				.then(result => {
gpioUvSensor.measurement._tick.isReconfiguring = false;
				});
			}
		},
		_convertData: function(){
			gpioUvSensor._logger.silly('gpioUvSensor.measurement._convertData()');
			// VIS and IR coefficients for a non-covered (i.e. open-air, non-diffused -> no glass or teflon filter) designs like the Adafruit breakout, as per the VEML6075 datasheet:
			var uva_a_coef = 2.22; // Default value for the UVA VIS coefficient ("a")
			var uva_b_coef = 1.33; // Default value for the UVA IR coefficient ("b")
			var uvb_c_coef = 2.95; // Default value for the UVB VIS coefficient ("c")
			var uvb_d_coef = 1.74; // Default value for the UVB IR coefficient ("d")
			var uva_resp = 0.001461; // UVA responsivity
			var uvb_resp = 0.002591; // UVB responsivity
			// correct responsivity for _integrationTimeMs (it is most likely that the default 50ms Integration Time was used to calculate the UVA & UVB responsivity)
			
			
			
//			uva_resp = uva_resp / (gpioUvSensor._integrationTimeMs / 50);
//			uvb_resp = uva_resp / (gpioUvSensor._integrationTimeMs / 50);
uva_resp = uva_resp / gpioUvSensor._integrationTimeMs;
uvb_resp = uva_resp / gpioUvSensor._integrationTimeMs;



			// adusted uva/uvb (for light outside the UVa/UVb spectrums, UVcomp1 and UVcomp2 should be low under LEDs) [These gain calibration factors, α, β, γ, δ, correct the output ratios of each channel for the device under test (DUT) in reference to the golden sample under a solar simulator, such as the Newport LCS100.]
			var uvaAdjusted = Math.round(gpioUvSensor._sensorReadings.uva - (uva_a_coef * gpioUvSensor._sensorReadings.uvcomp1) - (uva_b_coef * gpioUvSensor._sensorReadings.uvcomp2));
			var uvbAdjusted = Math.round(gpioUvSensor._sensorReadings.uvb - (uvb_c_coef * gpioUvSensor._sensorReadings.uvcomp1) - (uvb_d_coef * gpioUvSensor._sensorReadings.uvcomp2));
			// uv index (if uvb is less than 10% of uva, it is likely the sensor is reading 365nm LEDs [overcast outside light readings indicated adjusted UVb is about 20% less than adjusted UVa])
			if(uvbAdjusted < uvaAdjusted / 10){
				var uvIndex = +(uvaAdjusted * uva_resp).toFixed(2);
			}else{
				var uvIndex = +(((uvaAdjusted * uva_resp) + (uvbAdjusted * uvb_resp)) / 2).toFixed(2);
			}
			// ensure values >= 0
			uvaAdjusted = uvaAdjusted < 0 ? 0 : uvaAdjusted;
			uvbAdjusted = uvbAdjusted < 0 ? 0 : uvbAdjusted;
			uvIndex = uvIndex < 0 ? 0 : uvIndex;
			// uv index level
			var uvIndexLevel = 0;
			var uvIndexLevelText = 'Very Low';
			if (uvIndex > 10.9){
				uvIndexLevel = 5;
				uvIndexLevelText = 'Extreme';
			}else if(uvIndex > 7.9){
				uvIndexLevel = 4;
				uvIndexLevelText = 'Very High';
			}else if(uvIndex > 5.9){
				uvIndexLevel = 3;
				uvIndexLevelText = 'High';
			}else if(uvIndex > 2.9){
				uvIndexLevel = 2;
				uvIndexLevelText = 'Moderate';
			}else{
				uvIndexLevel = 1;
				uvIndexLevelText = 'Low';
			}
			gpioUvSensor.measurement._data = {
				config: {
					hd: gpioUvSensor._dynamicRangeHigh,
					it: gpioUvSensor._integrationTimeMs,
					uvcomp1: gpioUvSensor._sensorReadings.uvcomp1,
					uvcomp2: gpioUvSensor._sensorReadings.uvcomp2,
				},
				uva: {
					adj: uvaAdjusted,
					raw: gpioUvSensor._sensorReadings.uva,
				},
				uvb: {
					adj: uvbAdjusted,
					raw: gpioUvSensor._sensorReadings.uvb,
				},
				vis: {
					blue: gpioUvSensor._sensorReadings.uvcomp1,
					cyan: gpioUvSensor._sensorReadings.uvcomp2,
				},
				uvIndex: {
					index: uvIndex,
					level: uvIndexLevel,
					text: uvIndexLevelText
				}
			};
			gpioUvSensor.measurement._logDataToConsole();
		},
		_logDataToConsole: function(){
			if(!gpioUvSensor._logReadingsToConsoleFlag)
				return;
			var _d = gpioUvSensor.measurement._data;
			console.log(
				// '|HD',		(_d.config.hd ? 'T' : 'F')						.toString().padStart(0),
				'|IT',		_d.config.it									.toString().padStart(3),
				'|A',		(!_d.uva.raw ? 0 : _d.uva.raw)					.toString().padStart(7),
				'|B',		(!_d.uvb.raw ? 0 : _d.uvb.raw)					.toString().padStart(7),
				'|Comp1',	(!_d.config.uvcomp1 ? 0 : _d.config.uvcomp1)	.toString().padStart(7),
				'|Comp2',	(!_d.config.uvcomp2 ? 0 : _d.config.uvcomp2)	.toString().padStart(7),
				'|AAdj',	(!_d.uva.adj ? 0 : _d.uva.adj)					.toString().padStart(7),
				'|BAdj',	(!_d.uvb.adj ? 0 : _d.uvb.adj)					.toString().padStart(7),
				// '|Index',	(!_d.uvIndex.index ? 0 : _d.uvIndex.index)		.toString().padStart(5),
				// '|Level',	(!_d.uvIndex.level ? 0 : _d.uvIndex.level)		.toString().padStart(0),
				// '|Text',	(!_d.uvIndex.text ? 0 : _d.uvIndex.text)		.toString().padStart(9),
				// '|Blue',	(!_d.vis.blue ? 0 : _d.vis.blue)				.toString().padStart(9),
				// '|Cyan',	(!_d.vis.cyan ? 0 : _d.vis.cyan)				.toString().padStart(9),
			);
			return;
		},
		get: function(){
			gpioUvSensor._logger.silly('gpioUvSensor.measurement.get()');
			return gpioUvSensor.measurement._data;
		}
	},
}
module.exports = gpioUvSensor;