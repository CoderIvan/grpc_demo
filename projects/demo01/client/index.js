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

const client = new hello_proto.Greeter(`localhost:${port}`, grpc.credentials.createInsecure())

function main() {
	const request = { name: 'world' }
	console.log('[Client] >> %j', request)
	client.sayHello(request, (err, response) => {
		console.log('[Client] << %j', response)
	})
}

main()
