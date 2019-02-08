const express = require('express');
const app = express();
const mysql = require('mysql');
const fs = require('fs');
const qs   = require('querystring');
const ejs = require('ejs');
const cookieParser = require('cookie-parser')
const moment = require('moment');
const crypto = require("crypto");
const favicon = require("serve-favicon");
const compression = require("compression");
const mysql_settings = require(__dirname + "/mysql-env.js")

app.use(compression({level: 6}));
app.use(cookieParser());
app.use(favicon(__dirname + '/views/favicon.ico'));

process.on('unhandledRejection', console.dir);

const pool_db = mysql.createPool(mysql_settings);

function console_error(err){
    let red = '\u001b[41m';
    let reset_C = '\u001b[0m';
    console.error(`[${red}ERROR!${reset_C}]${err}`);
};

function renderForm(res, ok_or_no, url = 'houkoku.ejs'){
    let data = ejs.render(fs.readFileSync(__dirname + '/views/' + url, 'utf-8'), {
        'ok_or_no': ok_or_no
    });
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.write(data);
    res.end();
};

function go_db(speak, IP) {
    try{
        pool_db.getConnection((err, connection) => {
            if(err) { connection.release();throw err; };
            let date = moment().format('YYYY-MM-DD');
            speak = speak.replace(/&/g, '&#x26;').replace(/"/g, '&#x22;').replace(/'/, '&#x27;').replace(/`/g, '&#x60;').replace(/</g, '&#x3C;').replace(/>/, '&#x3E;');
            console.log(`\u001b[47m\u001b[34m${IP}\u001b[0m:\u001b[47m\u001b[31m${speak}\u001b[0m`);
            connection.query(`insert into speak(speaks, in_date, IP) values("${speak}", "${date}", "${IP}");`, (err) => {
                connection.release();
                if(err) throw err;
            });
        });
    }catch(err){
        console_error(err);
    };
};

app.get('*.js', (req, res) => {
    let js;
    try{
        js = fs.readFileSync(__dirname + '/views' + req.url, 'utf-8')
    }catch(err){
        js = "You're stupid."
    }
    res.writeHead(200, {'Content-Type' : 'text/javascript'});
    res.write(js);
    res.end();
});

app.get('*.css', (req, res) => {
    let css;
    try{
        css = fs.readFileSync(__dirname + '/views' + req.url, 'utf-8')
    }catch(err){
        css = "You're stupid."
    }
    res.writeHead(200, {'Content-Type' : 'text/css'});
    res.write(css);
    res.end();
});

// /toko にGETが来た時の処理
app.get('/toko', (req, res) => {
    renderForm(res, '', 'post.ejs');
});

// /toko にPOSTが来た時の処理
app.post('/toko', (req, res) => {
    res.cookie('toko_aftertime', '1', {maxAge: 30000})
    req.data = "";
    req.on("readable", () => {
        req.data += req.read() || '';
    });
    req.on("end", () => {
        let query = qs.parse(req.data);
        let speak = (query.speak.length <= 1500) ? query.speak : false;
        if(!speak || query.form !== 'Yes') miss_error(res, `不正な値が${req.ip}により送信されました`);
        else{ res.send("海に手紙を流しました。");go_db(speak, req.ip); };
    });
});

// / にGETが来た時の処理
app.get('/', (req, res) => {
    let promises = [];
    for (let i = 0; i < 7; i++){
        promise = new Promise(generate(i));
        promises.push(promise);
    };
    Promise.all(promises).then(resovles => {
        let sentences = resovles[0];
        for (let i = 1; i < 7; i++){
            if(resovles[i].length) sentences = sentences.concat(resovles[i]);
        };
        let sentence = sentences[Math.floor(Math.random() * sentences.length)];
        if(sentence === undefined) throw ['投稿がありません。', '/views/tokobusoku.ejs', 200];
        return sentence;
    }).then(sentence => {
        let data = ejs.render(fs.readFileSync(__dirname + '/views/hyoji.ejs', 'utf-8'), {
            'sentence':sentence.replace(/\n/g, '<br>') 
        });
        res.writeHead(200, {'Content-Type' : 'text/html'});
        res.write(data);
        res.end();
    }).catch(rejects => {
        miss_error(res, rejects[0], rejects[1], rejects[2]);
    });
});

// DBからi日前の投稿を呼び出して、配列で返す関数
function generate(i) {
    return (resolve, reject) => {
        pool_db.getConnection((err, connection) => {
            if(err){ console_error(err);reject([]); }
            let count = [];
            let day_db_name = moment().subtract(i, 'days').format('YYYY-MM-DD');
            connection.query(`select * from speak where in_date = "${day_db_name}"`, (err, results) => {
                if(!err) for(let in_i = 0; in_i < results.length ; in_i++) count.push(results[in_i].speaks);
                connection.release();
                resolve(count);
            });
        });
    };
};

// error出たときに呼ぶ関数
function miss_error(res, err = '不明なエラー', url = '/views/MISSerror.ejs', n = 500){
    let data = ejs.render(fs.readFileSync(__dirname + url, 'utf-8'));
    res.writeHead(n, {'Content-Type' : 'text/html'});
    res.write(data);
    res.end();
    console_error(err);
};

// 上記以外のURLにリクエストが来た時の処理
app.use((req, res) => {
    let data = ejs.render(fs.readFileSync(__dirname + '/views/URLerror.ejs', 'utf-8'));
    res.writeHead(404, {'Content-Type' : 'text/html'});
    res.write(data);
    res.end();
});

app.listen(process.env.PORT || 8000);

console.log('\u001b[42mlisten:8000\u001b[0m');