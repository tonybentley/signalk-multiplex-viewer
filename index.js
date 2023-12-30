module.exports = function (app) {
	return {
		id: 'signalk-multiplex-viewer',
		name: 'NMEA Multiplex Viewer',
		description: 'Uses a signalk websocket to stream event data from emitters that map to NMEA sources',
		start: async (options) => {
			app.debug('Plugin Started')
		},
		stop: function () {
			app.debug("Plugin stopping...")
		},
		schema: {
			title: 'NMEA Multiplex Viewer',
			description: 'Uses a signalk websocket to stream event data from emitters that map to NMEA sources',
			properties: {
				logging: {
					type: 'string',
					title: 'Logging',
					enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
					default: 'debug'
				}
			}
		}
	};
}