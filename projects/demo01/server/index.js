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

function sayHelloAgain(request) {
	return { message: `Hello again, ${request.name}` }
}

function wrap(func) {
	return (call, callback) => {
		console.log('[Server] << %j', call.request)
		const response = func(call.request)
		callback(null, response)
		console.log('[Server] >> %j', response)
	}
}

function wrapFuncMap(funcMap) {
	return Object.keys(funcMap).reduce((previousValue, funcName) => {
		// eslint-disable-next-line no-param-reassign
		previousValue[funcName] = wrap(funcMap[funcName])
		return previousValue
	}, {})
}

function main() {
	const server = new grpc.Server()
	server.addService(hello_proto.Greeter.service, wrapFuncMap({
		sayHello,
		sayHelloAgain,
	}))

	server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
		server.start()
		console.log('[Server] Listen @ %d', port)
	})
}

main()
