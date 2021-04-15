const path = require('path')
const util = require('util')
// eslint-disable-next-line import/no-extraneous-dependencies
const grpc = require('@grpc/grpc-js')
// eslint-disable-next-line import/no-extraneous-dependencies
const protoLoader = require('@grpc/proto-loader')

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../common/route_guide.proto'), {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
})
const { routeguide } = grpc.loadPackageDefinition(packageDefinition)
const client = new routeguide.RouteGuide('localhost:50051',
	grpc.credentials.createInsecure())

const COORD_FACTOR = 1e7

async function runGetFeature() {
	const getFeatureAsync = util.promisify(client.getFeature).bind(client)

	async function send(point) {
		const feature = await getFeatureAsync(point)

		if (feature.name === '') {
			console.log(`Found no feature at ${
				feature.location.latitude / COORD_FACTOR}, ${
				feature.location.longitude / COORD_FACTOR}`)
		} else {
			console.log(`Found feature called "${feature.name}" at ${
				feature.location.latitude / COORD_FACTOR}, ${
				feature.location.longitude / COORD_FACTOR}`)
		}
	}

	return Promise.all([
		send({ latitude: 409146138, longitude: -746188906 }),
		send({ latitude: 0, longitude: 0 }),
	])
}

async function main() {
	await runGetFeature()
}

main()
