const path = require('path')
// eslint-disable-next-line import/no-extraneous-dependencies
const bluebird = require('bluebird')
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
const client = new routeguide.RouteGuide(`localhost:${port}`, grpc.credentials.createInsecure())
bluebird.promisifyAll(client)

const COORD_FACTOR = 1e7

async function send(point) {
	const feature = await client.getFeatureAsync(point)
	if (!feature.name) {
		console.log(`Found no feature at ${point.latitude / COORD_FACTOR}, ${point.longitude / COORD_FACTOR}`)
	} else {
		console.log(`Found feature called "${feature.name}" at ${feature.location.latitude / COORD_FACTOR}, ${feature.location.longitude / COORD_FACTOR}`)
	}
}

async function runGetFeature() {
	return Promise.all([
		send({ latitude: 409146138, longitude: -746188906 }),
		send({ latitude: 0, longitude: 0 }),
	])
}

async function runListFeatures() {
	const rectangle = {
		lo: {
			latitude: 400000000,
			longitude: -750000000,
		},
		hi: {
			latitude: 420000000,
			longitude: -730000000,
		},
	}
	console.log('Looking for features between 40, -75 and 42, -73')
	const call = client.listFeatures(rectangle)
	call.on('data', (feature) => {
		console.log(`Found feature called "${feature.name}" at ${
			feature.location.latitude / COORD_FACTOR}, ${
			feature.location.longitude / COORD_FACTOR}`)
	})
	return new Promise((resolve) => {
		call.on('end', () => {
			resolve()
		})
	})
}

function setTimeoutAsync(ms) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

function randomInt(a = 1, b = 0) {
	const lower = Math.ceil(Math.min(a, b))
	const upper = Math.floor(Math.max(a, b))
	return Math.floor(lower + Math.random() * (upper - lower + 1))
}

async function runRecordRoute() {
	let call
	const p = new Promise((resolve, reject) => {
		call = client.recordRoute((error, stats) => {
			if (error) {
				reject(error)
				return
			}
			console.log('Finished trip with', stats.point_count, 'points')
			console.log('Passed', stats.feature_count, 'features')
			console.log('Travelled', stats.distance, 'meters')
			console.log('It took', stats.elapsed_time, 'seconds')
			resolve()
		})
	})

	for (let i = 0; i < 10; i += 1) {
		const { location: { latitude, longitude } } = feature_list[randomInt(feature_list.length - 1)]
		console.log(new Date(), `Visiting point ${latitude / COORD_FACTOR}, ${longitude / COORD_FACTOR}`)
		call.write({ latitude, longitude })
		// eslint-disable-next-line no-await-in-loop
		await setTimeoutAsync(randomInt(500, 1500))
	}
	call.end()

	return p
}

async function runRouteChat() {
	const call = client.routeChat()

	const p = new Promise((resolve) => {
		call.on('data', (note) => {
			console.log(`Got message "${note.message}" at ${note.location.latitude}, ${note.location.longitude}`)
		})
		call.on('end', () => {
			resolve()
		})
	})

	const notes = [{
		location: {
			latitude: 0,
			longitude: 0,
		},
		message: 'First message',
	}, {
		location: {
			latitude: 0,
			longitude: 1,
		},
		message: 'Second message',
	}, {
		location: {
			latitude: 1,
			longitude: 0,
		},
		message: 'Third message',
	}, {
		location: {
			latitude: 0,
			longitude: 0,
		},
		message: 'Fourth message',
	}]
	for (let i = 0; i < notes.length; i += 1) {
		const note = notes[i]
		console.log(`Sending message "${note.message}" at ${note.location.latitude}, ${note.location.longitude}`)
		call.write(note)
	}

	call.end()

	return p
}

async function main() {
	await runGetFeature()
	console.log('-----------------------------------------------')
	await runListFeatures()
	console.log('-----------------------------------------------')
	await runRecordRoute()
	console.log('-----------------------------------------------')
	await runRouteChat()
	console.log('-----------------------------------------------')
}

main()
