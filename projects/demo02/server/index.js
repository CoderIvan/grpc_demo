const path = require('path')
// eslint-disable-next-line import/no-extraneous-dependencies
const grpc = require('@grpc/grpc-js')
// eslint-disable-next-line import/no-extraneous-dependencies
const protoLoader = require('@grpc/proto-loader')
const { port } = require('../common/config')
const feature_list = require('../common/route_guide_db')

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../common/route_guide.proto'), {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
})
const { routeguide } = grpc.loadPackageDefinition(packageDefinition)

function checkFeature(point) {
	for (let i = 0; i < feature_list.length; i += 1) {
		const feature = feature_list[i]
		if (feature.location.latitude === point.latitude && feature.location.longitude === point.longitude) {
			return feature
		}
	}
	return {
		name: '',
		location: null,
	}
}

function getFeature(call, callback) {
	callback(null, checkFeature(call.request))
}

function listFeatures(call) {
	const { lo, hi } = call.request
	const left = Math.min(lo.longitude, hi.longitude)
	const right = Math.max(lo.longitude, hi.longitude)
	const top = Math.max(lo.latitude, hi.latitude)
	const bottom = Math.min(lo.latitude, hi.latitude)
	// For each feature, check if it is in the given bounding box
	feature_list.forEach((feature) => {
		if (feature.name === '') {
			return
		}
		const { longitude, latitude } = feature.location
		if (longitude >= left && longitude <= right && latitude >= bottom && latitude <= top) {
			call.write(feature)
		}
	})
	call.end()
}

const COORD_FACTOR = 1e7

function getDistance(start, end) {
	function toRadians(num) {
		return (num * Math.PI) / 180
	}
	const R = 6371000 // earth radius in metres
	const lat1 = toRadians(start.latitude / COORD_FACTOR)
	const lat2 = toRadians(end.latitude / COORD_FACTOR)
	const lon1 = toRadians(start.longitude / COORD_FACTOR)
	const lon2 = toRadians(end.longitude / COORD_FACTOR)

	const deltalat = lat2 - lat1
	const deltalon = lon2 - lon1
	const a = Math.sin(deltalat / 2) * Math.sin(deltalat / 2)
		+ Math.cos(lat1) * Math.cos(lat2)
		* Math.sin(deltalon / 2) * Math.sin(deltalon / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

function recordRoute(call, callback) {
	let point_count = 0
	let feature_count = 0
	let distance = 0
	let previous = null
	// Start a timer
	const start_time = process.hrtime()
	call.on('data', (point) => {
		point_count += 1
		if (checkFeature(point).name !== '') {
			feature_count += 1
		}
		if (previous != null) {
			distance += getDistance(previous, point)
		}
		previous = point
	})
	call.on('end', () => {
		callback(null, {
			point_count,
			feature_count,
			// eslint-disable-next-line no-bitwise
			distance: distance | 0,
			elapsed_time: process.hrtime(start_time)[0],
		})
	})
}

const route_notes = {}

function pointKey(point) {
	return `${point.latitude} ${point.longitude}`
}

function routeChat(call) {
	call.on('data', (note) => {
		const key = pointKey(note.location)
		if (route_notes[key]) {
			route_notes[key].forEach((n) => {
				call.write(n)
			})
		} else {
			route_notes[key] = []
		}
		route_notes[key].push(JSON.parse(JSON.stringify(note)))
		console.log(route_notes)
	})
	call.on('end', () => {
		call.end()
	})
}

function main() {
	const server = new grpc.Server()
	server.addService(routeguide.RouteGuide.service, {
		getFeature,
		listFeatures,
		recordRoute,
		routeChat,
	})

	server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
		server.start()
		console.log('[Server] Listen @ %d', port)
	})
}

main()
