/**
 * ID生成器
 * Created by lintry on 2018/4/18.
 */
const Long = require('long');

class IdWorker {

    /**
     * 初始化
     * @param config 配置对象
     * config.datacenterId 数据中心ID
     * config.workerId 进程ID
     * config.epoch 创世时间戳 default 1523182210789
     * config.datacenterIdBits 数据中心位数 default 5
     * config.workerIdBits 工作者位数 default 5
     * config.sequenceBits 序列号位数 default 12
     */
    constructor (config) {
        let {datacenterId, workerId, epoch, workerIdBits, datacenterIdBits, sequenceBits} = config
        this.sequenceBits = sequenceBits || 12;
        this.workerIdBits = workerIdBits || 5;
        this.datacenterIdBits = datacenterIdBits || 5;

        if (this.sequenceBits + this.workerIdBits + this.datacenterIdBits !== 22) {
            throw new Error('workerIdBits + datacenterIdBits + sequenceBits should equal to 22')
        }

        this.maxWorkerId = -1 ^ (-1 << this.workerIdBits);
        this.maxDatacenterId = -1 ^ (-1 << this.datacenterIdBits);

        this.workerIdShift = this.sequenceBits;
        this.datacenterIdShift = this.sequenceBits + this.workerIdBits;
        this.timestampLeftShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits;

        this.sequenceMask = -1 ^ (-1 << this.sequenceBits);
        this.workerMask = -1 ^ (-1 << this.workerIdBits) << this.workerIdShift;
        this.datacenterMask = -1 ^ (-1 << this.datacenterIdBits) << this.datacenterIdShift;
        this.timestampMask = new Long(0xffc00000, 0x7fffffff);

        this.lastTimestamp = -1;

        if (workerId > this.maxWorkerId || workerId < 0) {
            throw new Error(`worker Id ${workerId} can't be greater than ${this.maxWorkerId} or less than 0`)
        }

        if (datacenterId > this.maxDatacenterId || datacenterId < 0) {
            throw new Error(`datacenter Id ${datacenterId} can't be greater than ${this.maxDatacenterId} or less than 0`)
        }

        console.info("worker starting. timestamp left shift %d, datacenter id bits %d, worker id bits %d, sequence bits %d, worker id %d",
            this.timestampLeftShift, this.datacenterIdBits, this.workerIdBits, this.sequenceBits, workerId);

        console.log('timestamp left shift %d', this.timestampLeftShift);
        console.log('datacenterId bits %d, between 0 and %d, left shift %d', this.datacenterIdBits, this.maxDatacenterId, this.datacenterIdShift);
        console.log('workerId bits %d, between 0 and %d, left shift %d', this.workerIdBits, this.maxWorkerId, this.workerIdShift);
        console.log('sequence bits %d, mask %s', this.sequenceBits, this.sequenceMask.toString(16));


        this.workerId = workerId || 0;
        this.datacenterId = datacenterId || 0;
        this.sequence = 0;
        this.epoch = epoch || 1523182210789
    }

    /**
     * 生成新ID
     * @return {string}
     */
    nextId () {
        function tilNextMillis (lastTimestamp) {
            let timestamp = Date.now();
            while (timestamp <= lastTimestamp) {
                timestamp = Date.now()
            }
            return timestamp
        }

        let timestamp = Date.now();

        if (timestamp < this.lastTimestamp) {
            console.error("clock is moving backwards.  Rejecting requests until %d.", this.lastTimestamp);
            throw new Error(`Clock moved backwards.  Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`)
        }

        if (this.lastTimestamp === timestamp) {
            this.sequence = (this.sequence + 1) & this.sequenceMask;
            // console.log('alert same ', timestamp, this.sequence)
            if (this.sequence === 0) {
                timestamp = tilNextMillis(this.lastTimestamp)
            }
        } else {
            this.sequence = 0
        }

        this.lastTimestamp = timestamp;

        let timestampGap = Long.fromNumber(timestamp - this.epoch);
        let higher = timestampGap.shiftLeft(this.timestampLeftShift);
        let lower = (this.datacenterId << this.datacenterIdShift) | (this.workerId << this.workerIdShift) | this.sequence;

        return higher.or(lower).toString();
    }

    parse (id, radix) {
        let longId;
        if (id instanceof Long) {
            longId = id;
        } else if (typeof id === 'number') {
            longId = Long.fromNumber(id)
        } else if (typeof id === 'string') {
            longId = Long.fromString(id, radix || 10)
        }

        return {
            timestamp: longId.shiftRight(this.timestampLeftShift).add(this.epoch).toNumber(),
            datacenterId: longId.and(this.datacenterMask).shiftRight(this.datacenterIdShift).toNumber(),
            workerId: longId.and(this.workerMask).shiftRight(this.workerIdShift).toNumber(),
            sequence: longId.and(this.sequenceMask).toNumber()
        }
    }
}

module.exports = IdWorker;
