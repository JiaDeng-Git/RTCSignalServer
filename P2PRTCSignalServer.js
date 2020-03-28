/**
 * 项  目：智能带屏音箱
   功  能：音视频通信
 * 开发者：邓嘉 JiaDeng-Git
 * 邮  箱：dengjiaiot@163.com
 * 技术点：Nodejs+socket.io
 */

'use strict'

var http = require('http');
var https = require('https');
var fs = require('fs');

var express = require('express');
var serveIndex = require('serve-index');

var socketIo = require('socket.io');

var log4js = require('log4js');

var USERCOUNT = 3;

log4js.configure({
	appenders:{
		file:{
			type:'file',
			filename:'app.log',
			layout:{
				type:'pattern',
				pattern:'%r %p - %m',
			}
		}
	},
	categories:{
		default:{
			appenders:['file'],
			level:'debug'
		}
	
	}
});

var logger = log4js.getLogger();

var app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));

// http server
var http_server = http.createServer(app);
http_server.listen(80, '0.0.0.0');

// https server
var options = {
	key: fs.readFileSync('../../Certs/3611119_www.xycloud.cloud.key'),
	cert: fs.readFileSync('../../Certs/3611119_www.xycloud.cloud.pem')
}

var https_server = https.createServer(options, app);

// 将 socket.io与https_server进行绑定
var io = socketIo.listen(https_server);

// 处理所有的连接请求
io.sockets.on('connection', (socket)=>{

	socket.on('message', (room, data)=>{
		socket.to(room).emit('message', room, data);
	});

	// 加入房间事件
	socket.on('join', (room)=>{
		socket.join(room);
		var myRoom = io.sockets.adapter.rooms[room];
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		
		logger.debug('Sig Server: The number of user in room is:' + users);

		// 如果加入后，人数不超过2，则加入成功
		if(users < USERCOUNT){
			// 向客户端返回加入成功消息
			socket.emit('joined', room, socket.id);

			// 如果房间内还有其它用户，则向该用户发送，有用户加入消息
			if(users > 1){
				socket.to(room).emit('otherjoin', room);
			}
		}else{ // 否则不允许加入，返回房间已满消息
			socket.leave(room);
			socket.emit('full', room, socket.id);
		}

	});

	// 离开房间事件
	socket.on('leave', (room)=>{
		var myRoom = io.sockets.adapter.rooms[room];
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		
		// users - 1
		logger.debug('Sig Server: The number of user in room is:' + (users-1));

		socket.to(room).emit('bye', room, socket.id);
                socket.emit('leaved', room, socket.id);
	});                                                         
});

https_server.listen(443, '0.0.0.0');

