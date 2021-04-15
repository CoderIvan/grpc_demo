const path = require('path')
const fs = require('fs')
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

const feature_list = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/route_guide_db.json')))

function checkFeature(point) {
	let feature
	// Check if there is already a feature object for the given point
	for (let i = 0; i < feature_list.length; i += 1) {
		feature = feature_list[i]
		if (feature.location.latitude === point.latitude && feature.location.longitude === point.longitude) {
			return feature
		}
	}
	const name = ''
	feature = {
		name,
		location: point,
	}
	return feature
}

function getFeature(call, callback) {
	callback(null, checkFeature(call.request))
}

function main() {
	const server = new grpc.Server()
	server.addService(routeguide.RouteGuide.service, {
		getFeature,
		//   listFeatures,
		//   recordRoute,
		//   routeChat,
	})

	server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
		server.start()
	})
}

main()
