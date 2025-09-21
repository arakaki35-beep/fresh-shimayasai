const http = require('http'); //httpのモジュール？をインポート
const server = http.createServer((req,res) => { //reqとresを調べる
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8'});
    res.write('<h1>Hello NodeJS</h1>');
    res.end();
});

const port = process.env.PORT || 8080; //Render対応のため固定にしないらしい
server.listen(port);
console.log('Server listen on port' + port);