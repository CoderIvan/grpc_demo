const PROTO_PATH = `${__dirname}/../common/helloworld.proto`
// eslint-disable-next-line import/no-extraneous-dependencies
const grpc = require('@grpc/grpc-js')
// eslint-disable-next-line import/no-extraneous-dependencies
const protoLoader = require('@grpc/proto-loader')
const { port } = require('../common/config')

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
})
const hello_proto = grpc.loadPackageDefinition(packageDefinition).helloworld

function sayHello(request) {
	return { message: `Hello ${request.name}` }
}

function sayHelloHandle(call, callback) {
	console.log('[Server] << %j', call.request)
	const response = sayHello(call.request)
	callback(null, response)
	console.log('[Server] >> %j', response)
}

function main() {
	const server = new grpc.Server()
	server.addService(hello_proto.Greeter.service, { sayHello: sayHelloHandle })

	server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
		server.start()
		console.log('[Server] Listen @ %d', port)
	})
}

main()
