// BiliSilverCatcher ver 1.1.10
// TODO: 改进识别算法
// TODO: 浏览器兼容性
// features: 自动签到, 自动领瓜子(跨天,支持不同时区), localStorage记录当日瓜子和历史瓜子
// update: 支持新版UI(2016/1/21)
// update: 支持新版UI(2016/8/1)

var /*<class>*/ BiliSilverCatcher = function(autoMode, debug) {
	this.preload();
	this.version = "1.1.10";
	var canvas = document.getElementById('bcsCanvas');
	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.width = 300;
		canvas.height = 100;
		canvas.id = "bcsCanvas";
		canvas.style.top = "200px";
		if (!debug) canvas.style.display = "none";
		canvas.style.position = "absolute";
		document.body.appendChild(canvas);
	}
	var context = canvas.getContext('2d');
	context.font = '40px agencyfbbold'; // 字体
	context.textBaseline = 'top';
	this.context = context;
	this.canvas = canvas;
	this.autoMode = autoMode || false;
	this.currentTask = null; // {time,silver,retryTimes}
	this.dailyTasks = { date: this.getDate(), state: 0, tasks: [] }; // {date,state,tasks:[{time,silver,retryTimes}]}
	this.dailyHistory = []; // [{date,state,silver,tasksCount}] state:1=finished 0=unfinished
	this.moreTotalSilver = 0;
	this.debug = debug;
	this.signs = {}; // [date].1/0
	this.load();
	if (!window.OCRAD)
		(function(a,d){d=document.createElement('script');d.src=a;document.body.appendChild(d)})('http://7xpat8.com1.z0.glb.clouddn.com/bsc/ocrad.js');//('http://s.0w0.be/bsc/ocrad.js');
	if (!window.basad) {
		window.basad = 1;
		$('<div class="ctrl-item gold-seeds"><i class="live-icon-small new-hinter" style="vertical-align: middle;"></i><a target="bsc" href="/24544" title="喂作者瓜子" class="link bili-link">脚本已启用</a></div>').insertBefore($(".control-panel>:first"))
	}
};
BiliSilverCatcher.prototype = {
preload: function() {
	// Date.format prototype
	Date.prototype.format = function(pattern) {
		var returnValue = pattern;
		var format = {
			"y+": this.getFullYear(),
			"M+": this.getMonth()+1,
			"d+": this.getDate(),
			"H+": this.getHours(),
			"m+": this.getMinutes(),
			"s+": this.getSeconds(),
			"S": this.getMilliseconds(),
			"h+": (this.getHours()%12),
			"a": (this.getHours()/12) <= 1? "AM":"PM"
		};
		for(var key in format) {
			var regExp = new RegExp("("+key+")");
			if(regExp.test(returnValue)) {
				var zero = "";
				for(var i = 0; i < RegExp.$1.length; i++) { zero += "0"; }
				var replacement = RegExp.$1.length == 1? format[key]:(zero+format[key]).substring(((""+format[key]).length));
				returnValue = returnValue.replace(RegExp.$1, replacement);
			}
		}
		return returnValue;
	};
},
showStatus: function() {
	console.log("==== BiliSilverCatcher Status ====");
	console.log("今日已领取: " + this.getDailyTotalSilver() + "瓜子");
	console.log("累计总领取: " + this.getTotalSilver() + "瓜子");
},
debugLog: function(d) {
	if (this.debug) console.log((new Date()).toLocaleString(), d);
},
load: function() {
	if (typeof localStorage == "undefined") return;
	if (localStorage["bscData"]) {
		var data = JSON.parse(localStorage["bscData"]); // {lastDayTasks:{date,state,tasks:[{silver}]},moreTotalSilver,dailyHistory:[{date,state,silver,tasksCount}]}
		this.dailyTasks = data.lastDayTasks;
		this.moreTotalSilver = data.moreTotalSilver;
		this.dailyHistory = data.dailyHistory;
	}
	this.refreshTask();
},
save: function() {
	if (typeof localStorage == "undefined") return;
	var data = {
		lastDayTasks: this.dailyTasks,
		moreTotalSilver: this.moreTotalSilver,
		dailyHistory: this.dailyHistory,
	};
	localStorage["bscData"] = JSON.stringify(data);
},
refreshTask: function() {
	// 处理跨日转存
	var today = this.getDate();
	if (this.dailyTasks.date != today) {
		if (this.dailyHistory.length > 6) {
			this.moreTotalSilver += this.dailyHistory.shift().silver;
		}
		this.dailyHistory.push({
			date: this.dailyTasks.date,
			state: this.dailyTasks.state,
			silver: this.getDailyTotalSilver(),
			tasksCount: this.dailyTasks.tasks.length
		});
		this.dailyTasks.date = today;
		this.dailyTasks.state = 0;
		this.dailyTasks.tasks = [];
		this.save();
		return true;
	}
	return false;
},
startTask: function() {
	this.dailyTasks.tasks.push(this.currentTask = { time: this.getTime(), silver: ~~$(".waiting-panel span:last").text(), retryTimes: 0 });
	var msg = new Notification(this.currentTask.silver + "瓜子已就绪", {
		body: "点击转到页面" + (this.autoMode ? "（2秒后自动领取）" : ""),
		icon: "//static.hdslb.com/live-static/images/1.png"
	});
	if (this.autoMode) {
		setTimeout(function() {
			msg.close();
			$(".treasure-box").click();
		}, 2000);
	}
	msg.onclick = function() {
		$(".treasure-box").click();
		$(".acquiring-panel .live-input").focus();
	};
},
finishTask: function() {
	this.debugLog("成功领取" + this.currentTask.silver + "瓜子");
	var msg = new Notification(this.currentTask.silver + "瓜子自动领取成功", {
		body: "今日已领取" + this.getDailyTotalSilver() + "瓜子",
		icon: "//static.hdslb.com/live-static/images/7.png"
	});
	this.currentTask = null;
	setTimeout(function() { msg.close() }, 5e3);
	this.refreshTask() || this.save();
},
startDailyTask: function() {
	this.debugLog("开始新一轮瓜子收集");
	$(".treasure-box-ctnr").show(); // TODO: 处理不存在.treasure的情况
	if (!this.getDailyTotalSilver()) return;
	var msg = new Notification("新的一天开始了", {
		body: "今天的瓜子也一定会大丰收的~",
		icon: "//static.hdslb.com/live-static/images/1.png"
	});
	setTimeout(function() { msg.close() }, 5e3);
	this.refreshTask();
},
finishDailyTask: function() {
	if (this.dailyTasks.state) return;
	this.debugLog("今日收集结束");
	this.currentTask = null;
	this.dailyTasks.state = 1;
	if (this.getDailyTotalSilver()) {
		var msg = new Notification("大丰收~", {
			body: "今天的" + this.getDailyTotalSilver() + "瓜子已全部领完~",
			icon: "//static.hdslb.com/live-static/images/7.png"
		});
		setTimeout(function() { msg.close() }, 1e4);
	}
	this.refreshTask() || this.save();
},
getTime: function() {
	var d = new Date();
	d.setTime(d.getTime() + d.getTimezoneOffset() * 6e4 + 288e5); // GMT+8
	return d.format("HHmmss");
},
getDate: function() {
	var d = new Date();
	d.setTime(d.getTime() + d.getTimezoneOffset() * 6e4 + 144e5); // GMT+4, 瓜子刷新时间为每天4点
	return d.format("yyMMdd");
},
getSignDate: function() {
	var d = new Date();
	d.setTime(d.getTime() + d.getTimezoneOffset() * 6e4 + 288e5); // GMT+8, 签到刷新时间为每天0点
	return d.format("yyMMdd");
},
getDailyTotalSilver: function() {
	var t = 0;
	for (var i = 0; i < this.dailyTasks.tasks.length; i++)
		t += this.dailyTasks.tasks[i].silver;
	return t;
},
getTotalSilver: function() {
	// TODO
	var t = this.moreTotalSilver;
	for (var i = 0; i < this.dailyTasks.tasks.length; i++)
		t += this.dailyTasks.tasks[i].silver;
	for (var i = 0; i < this.dailyHistory.length; i++)
		t += this.dailyHistory[i].silver;
	return t;
},
loadImage: function(img) {
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.drawImage(img, 0, 0);
	this.img = img;
},
getQuestion: function() {
	var q = OCRAD(_bsc.context.getImageData(0, 0, 120, 40));
	q = q.replace(/[Zz]/g, "2").replace(/[Oo]/g, "0").replace(/g/g, "9").replace(/[lI]/g, "1").replace(/[Ss]/g, "5").replace(/_/g, "4").replace(/B/g, "8").replace(/b/g, "6");
	this.debugLog(q);
	return q;
},
getAnwser: function(question) {
	if (question.endsWith("-") || question.endsWith("+")) {
		question = question.substring(0, question.length - 1);
	}
	return eval(question);
},
doSign: function(callback) {
	var _this = this;
	if (_this.signs[_this.getDate()]) return;
	$.get("/sign/doSign", function(d) {
		var e = JSON.parse(d);
		_this.debugLog("自动签到");
		_this.debugLog(e);
		if (e.code == 0) {
			var msg = new Notification("自动签到成功", {
				body: "获得" + e.data.silver + "瓜子~",
				icon: "//static.hdslb.com/live-static/images/7.png"
			});
			setTimeout(function() { msg.close() }, 5e3);
			_this.signs[_this.getDate()] = 1;
			callback && callback();
		} else if (e.code == -500) {
			_this.signs[_this.getDate()] = 1;
		}
	});
},
setListener: function() {
	var _this = this;
	console.log("BiliSilverCatcher ver " + this.version);
	console.log("瓜子掉下去了!~接下来会上来金的还是银的呢~");
	var retryCooldownFlag = 0, taskFailedFlag = 0;
	// 自动签到
	var signCooldownFlag = 0;
	var Listener = function() {
		if (!signCooldownFlag) {
			signCooldownFlag = 1;
			_this.doSign();
			setTimeout(function() { signCooldownFlag = 0 }, 3e5); // 5min
		}
		// 跨日处理
		if (_this.dailyTasks.date != _this.getDate())
			_this.startDailyTask();
		if (!$(".treasure-box-ctnr").length || $(".treasure-box-ctnr").css("display") == "none") {
			taskFailedFlag = 0;
			_this.finishDailyTask();
			return;
		}
		// 验证码处理
		var img = $(".captcha-img")[0];
		if (img) img.onload = _this.autoMode ? function() {
			_this.loadImage(img);
			$(".acquiring-panel .live-input").val(_this.getAnwser(_this.getQuestion()));
			// 高级版 $(".get-award-btn").click();
			var o = document.createEvent("MouseEvent");
			o.initEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 0, null);
			$(".get-award-btn")[0].dispatchEvent(o);
			setTimeout(function() { retryCooldownFlag = 0 }, 2e3);
		} : null;
		if (_this.currentTask) {
			var successBtn = $(".acknowledge-btn").filter(function() { return $(this).text() == "我知道了" });
			if (successBtn.length && $("div.count-down").text() != "00:00") {
				successBtn.click();
				_this.finishTask();
			} else {
				if (_this.currentTask.retryTimes > 10) {
					if (!taskFailedFlag) {
						taskFailedFlag = 1;
						var msg = new Notification(_this.currentTask.silver + "瓜子自动领取失败", {
							body: "点击手动领取",
							icon: "//static.hdslb.com/live-static/images/1.png"
						});
						msg.onclick = function() {
							$(".treasure-box").click();
							$(".acquiring-panel .live-input").focus();
						};
						setTimeout(function() { msg.close() }, 5e3);
					}
				} else {
					if (retryCooldownFlag) return;
					retryCooldownFlag = 1;
					$(".treasure-box").click();
					++_this.currentTask.retryTimes;
				}
			}
		}
		// 开始新task
		if (!_this.currentTask && $("div.count-down").text() == "00:00") {
			_this.startTask();
		}
	};
	Listener.interval = setInterval(Listener, 1e3);
	Listener.clear = function() { clearInterval(Listener.interval) };
	_this.listener = Listener;
}
};
Notification.requestPermission();

if (window._bsc && window._bsc.listener) window._bsc.listener.clear();
var _bsc = window._bsc = new BiliSilverCatcher(!window._bscManual, typeof __commandLineAPI == "object");
_bsc.setListener();
