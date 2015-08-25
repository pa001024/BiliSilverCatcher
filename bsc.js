// BiliSilverCatcher ver.1.1.2
// TODO: 加入相应localStorage功能
// TODO: 改进识别算法
if (window._bsc && window._bsc.listener) window._bsc.listener.clear();

var /*<class>*/ BiliSilverCatcher = function(autoMode,debug) {
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
	// 加载字形库
	var context = canvas.getContext('2d');
	context.font = '40px agencyfbbold'; // 字体
	context.textBaseline = 'top';
	this.context = context;
	this.canvas = canvas;
	this.autoMode = false || autoMode;
	this.currentTask = null;//{silver,retryTimes}
	this.tasks = [];
	this.endDay = null;
	if (!window.OCRAD) 
		$(document.body).append($("<script>").attr("src","http://pa001024.github.io/BiliSilverCatcher/ocrad.js"));
};
BiliSilverCatcher.prototype.getTotalSilver = function() {
	var t = 0;
	for (var i = 0; i < this.tasks.length; i++) {
		t += this.tasks[i].silver;
	};
	return t;
};
BiliSilverCatcher.prototype.loadImage = function(img) {
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.drawImage(img, 0, 0);
	this.img = img;
};
BiliSilverCatcher.prototype.getQuestion = function() {
	return OCRAD(_bsc.context.getImageData(0, 0, 120,40)).replace(/[Zz]/g,"2").replace(/[Oo]/g,"0").replace(/g/g,"9").replace(/[lI]/g,"1").replace(/[Ss]/g,"5").replace(/_/g,"4").replace(/B/g,"8").replace(/b/g,"6");
};
BiliSilverCatcher.prototype.getAnwser = function(question) {
	if (question.endsWith("-") || question.endsWith("+")) {
		question = question.substring(0,question.length-1);
	}
	return eval(question);
};

BiliSilverCatcher.prototype.setListener = function() {
	var _this = this;
	var focusBox = function() {
		$(".treasure-box").click();
		$("#freeSilverCaptchaInput").focus();
	};
	console.log("BiliSilverCatcher ver.1.1.2");
	console.log("瓜子掉下去了!~接下来会上来金的还是银的呢~");
	var retryCooldownFlag = 0;
	var Listener = function() {
		// 跨日处理
		if (_this.endDay)
		if (_this.endDay == ~~(new Date()).format("D")) return; else $(".treasure").show();
		if (!$(".treasure").length || $(".treasure").css("display") == "none") {
			_this.currentTask = null;
			var msg = new Notification("大丰收~", {body: "今天的"+_this.getTotalSilver()+"瓜子已全部领完~",icon:"//static.hdslb.com/live-static/images/7.png"});
			_this.endDay = ~~(new Date()).format("D");
			setTimeout(function(){msg.close();}, 1e4);
			return;
		}
		// 验证码处理
		var img = document.getElementById('captchaImg');
		if (img) img.onload = _this.autoMode? function(){
			_this.loadImage(img);
			$("#freeSilverCaptchaInput").val(_this.getAnwser(_this.getQuestion()));
			$("#getFreeSilverAward").click();
			setTimeout(function(){retryCooldownFlag = 0}, 2e3);
		}: null;
		if (_this.currentTask) {
			var success = $(".tip-primary").filter(function(){if($(this).text()=="我知道了")return !0});
			if (success.length && $(".treasure-count-down").text() != "00:00") {
				var msg = new Notification(_this.currentTask.silver+"瓜子自动领取成功", {body: "今日已领取"+_this.getTotalSilver()+"瓜子",icon:"//static.hdslb.com/live-static/images/7.png"});
				success.click();
				_this.currentTask = null;
				setTimeout(function(){msg.close();}, 5e3);
			} else {
				if (_this.currentTask.retryTimes > 10) {
					var msg = new Notification(_this.currentTask.silver+"瓜子自动领取失败", {body: "点击手动领取",icon:"//static.hdslb.com/live-static/images/1.png"});
					msg.onclick = focusBox;
					setTimeout(function(){msg.close();}, 5e3);
				} else {
					if (retryCooldownFlag) return;
					retryCooldownFlag = 1;
					$(".treasure-box").click();
					++_this.currentTask.retryTimes;
				}
			}
		}
		// 检测当前task
		if (!_this.currentTask && $(".treasure-count-down").text() == "00:00") {
			_this.tasks.push(_this.currentTask = {silver: ~~$("#gz-num").text(), retryTimes: 0});
			var msg = new Notification(_this.currentTask.silver+"瓜子已就绪", {body: "点击转到页面"+(_this.autoMode?"（2秒后自动领取）":""),icon:"//static.hdslb.com/live-static/images/1.png"});
			if(_this.autoMode) {
				setTimeout(function(){
					msg.close();
					$(".treasure-box").click();
				}, 2000);
			}
			msg.onclick = focusBox;
		};
	};
	Listener.interval = setInterval(Listener, 1e3);
	Listener.clear = function(){clearInterval(Listener.interval);};
	_this.listener = Listener;
};
Notification.requestPermission();
var _bsc = window._bsc = new BiliSilverCatcher(true,true);
_bsc.setListener();
