/**
 * id.test.js
 * Created by lintry on 2018/4/18.
 */

const cluster = require('cluster');
const IdWorker = require('..');

class IdCluster extends IdWorker {
    constructor (config) {
        let {datacenterId, epoch} = config;
        let workerId = cluster.isMaster ? 0 : cluster.worker.id;

        super({datacenterId, workerId, epoch})
    }
}

let idCluster = new IdCluster({datacenterId: 1, workerIdBits: 10, datacenterIdBits: 10, sequenceBits: 2});
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`, code, signal);
    });
} else {
    console.log(`I am worker #${cluster.worker.id}`);
    console.log(`Worker ${process.pid} started`);
}

for (let i=0;i<40;i++) {
    console.log(process.pid, i, idCluster.nextId().toString())
}
