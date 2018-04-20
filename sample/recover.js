/**
 * id.test.js
 * Created by lintry on 2018/4/18.
 */

const Long = require('long');
const IdWorker = require('..');
const idWorker = new IdWorker({datacenterId: 3, workerId: 9, workerIdBits: 10, datacenterIdBits: 10, sequenceBits: 2});
let next_id = idWorker.nextId();
for (let i=0;i<20;i++) {
    next_id = idWorker.nextId();
}
let id = Long.fromNumber(next_id);
console.log('id is', next_id);

console.log('define mask');
const timestamp_mask = new Long(0xffc00000, 0x7fffffff);
const datacenter_mask = new Long(0x3e0000);
const worker_mask = new Long(0x01f000);
const sequence_mask = new Long(0x0fff);

console.log('mask is', timestamp_mask.toString(16), datacenter_mask.toString(16), worker_mask.toString(16), sequence_mask.toString(16))

console.log('parsing id...');
console.log('timestamp', id.shiftRight(idWorker.timestampLeftShift).add(idWorker.epoch).toNumber());
console.log('datacenter id', id.and(datacenter_mask).shiftRight(idWorker.datacenterIdShift).toNumber());
console.log('worker id', id.and(worker_mask).shiftRight(idWorker.workerIdShift).toNumber());
console.log('sequence', id.and(sequence_mask).toNumber());

console.log('parsed:');

let {timestamp, datacenterId, workerId, sequence} = idWorker.parse(next_id);
console.log({timestamp, datacenterId, workerId, sequence});