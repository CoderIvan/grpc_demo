const PROTO_PATH = `${__dirname}/../common/helloworld.proto`
// eslint-disable-next-line import/no-extraneous-dependencies
const bluebird = require('bluebird')
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
bluebird.promisifyAll(client)

async function main() {
	const request = { name: 'world' }

	console.log('[Client] >> %j', request)
	console.log('[Client] << %j', await client.sayHelloAsync(request))

	console.log('[Client] >> %j', request)
	console.log('[Client] << %j', await client.sayHelloAgainAsync(request))
}

main()
