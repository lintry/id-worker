/**
 * id
 * Created by lintry on 2018/4/18.
 */

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


const IdWorker = require('..');

if (cluster.isMaster) {
    const workList = [];
    const pidMap = {};

    for(let i = 1; i< 7; i++) {
        workList.push(i)
    }

    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker) => {
        // 有worker进程建立，即开始监听message事件
        worker.on('message', (data) => {
            // 处理来自worker的请求，获取pid
            let matched = /(\d+)=(\d+)/g.exec(data);
            if (matched && matched.length === 3) {
                let pid = matched[2];
                if (workList.length) {
                    let work_id = workList.shift();

                    pidMap[pid] = work_id;
                    // 回传分配的workid
                    worker.send(`${pid}=${work_id}`)
                }
            }
        });
    });

    cluster.on('exit', (worker, code, signal) => {
        let work_id = pidMap[worker.process.pid];
        workList.push(work_id);

        console.log(`worker ${worker.process.pid} died`, code, signal);
        console.log('rest workid', workList)
    });
} else {
    process.on('message', data => {
        console.log(`I receive message #${cluster.worker.id}`, data);
        let matched = /(\d+)=(\d+)/g.exec(data);
        if (matched && matched.length === 3) {
            let [__, pid, worker_id] = matched;
            if (Number.parseInt(pid) === process.pid) {
                const idWorker = new IdWorker({datacenterId: 1, workerId: worker_id});
                for (let i=0;i<2;i++) {
                    console.log(process.pid, i, idWorker.nextId())
                }
                console.log(`I am worker #${cluster.worker.id}`);
                console.log(`Worker ${process.pid} started`);

                process.exit()
            }
        }
    });
    // 通知master自己的pid
    process.send(`${cluster.worker.id}=${process.pid}`);

}