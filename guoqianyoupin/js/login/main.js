define(function (require, exports, moduel) {
	var $ = require('jquery');
	var Vue = require('vueDev');
	require('../common/common');

	//require('../api/login_register');

	var toUrl = function (url) {
		location.href = url
	}

	var app = new Vue({
		data: function () {
			return {
				checked: 1,
				mobile: '',
				code: '',
				timer: 60,
				cancelEvent: 0,
				bindAccessToken:'',
				bindUserId:'',
				bindChannel:'',
				show: {
					timer: 0,
					error: 0
				},
				errMsg: '',
				error: {
					mobile: '手机号码输入错误',
					code: '验证码输入错误',
					checked: '请阅读并同意《国乾优品用户协议》'
				},
				showWeixin: 0,
				showQQ: 0,
				showAlipay: 0,
                fromMini:true
			}
		},
		mounted: function () {

            wx.miniProgram.getEnv(function(res) {
                if(res.miniprogram){
                	this.fromMini = false;
				}
			})
			// Wechat.isInstalled(function (installed) {
			//     if (installed)
			//     {
			//     	app.showWeixin = 1;
			//     	app.showAlipay=1;
			//     }
			// }, function (reason) {
			// 	;
			// });

			// var args = {};
			// args.client = QQSDK.ClientType.QQ;
			// QQSDK.checkClientInstalled(function () {
			//   app.showQQ = 1
			// }, function () {
			//
			// }, args);

		},
		methods: {
			toUrl: toUrl,
			sendCode: sendCode,
			login: login,
			wxLogin: wxLogin,
/*            qqLogin: qqLogin,
            aliLogin: aliLogin*/
		}
	}).$mount('#page');

	//发送验证码
	function sendCode() {
		var _self = this;
		app.show.error = 0

		if (_self.cancelEvent) {
			return
		}
		var mobile = _self.mobile
		var isMobile = regModel.test('tel', mobile)
		if (!isMobile) {
			app.errMsg = app.error.mobile
			app.show.error = 1
			return
		}

        // $.ajax({
        //     type: "POST",
        //     url: "https://gquat.crmservices.cn/h5shop/api/weixin/checkMobile",
        //     data: {mobile: mobile, uniqueId: getParam('uniqueId') || loginInfo.uniqueId ||''},
        //     // dataType: "json",
        //     // contentType:'application/json',
        //     success: function(data){
        //         // alert(data)
        //     }
        // });


        resource({
            type: 'POST',
            // api: '/login',
            api: '/weixin/checkMobile',
            data: {
                mobile: mobile,
                uniqueId: getParam('uniqueId') || loginInfo.uniqueId ||'',
            }
        })
            .then(function (result) {
                if (result == 'success') {
                    _self.cancelEvent = 1
                    _self.show.timer = 1

                    resource({
                        type: 'POST',
                        // api: '/login/sendVerificationCode',
                        api: '/weixin/sendVerificationCode',
                        data: {
                            mobile: mobile
                        }
                    })
                        .then(timeCount)
                        .always(function () {
                            //重置状态
                            app.show.timer = 0
                            app.timer = 60
                            app.cancelEvent = 0
                        })

                } else {
                    // app.errMsg = app.error.code
                    app.errMsg = result.message
                    app.show.error = 1
                }
            })
            .fail(function (result) {

            })



	}

	//定时器
	function timeCount() {
		return iPromise(function (resolve, reject) {
			! function promise() {
				app.timer--
				if (app.timer <= 0) {
					resolve()
				} else {
					setTimeout(function () {
						promise()
					}, 1000)
				}
			}()
		})
	}

	//登录
	function login() {
		app.show.error = 0
		var mobile = this.mobile
		var code = this.code
		var checked = this.checked
		var isMobile = regModel.test('tel', mobile)
		var uniqueId = getParam('uniqueId') || loginInfo.uniqueId ||''

		if (!isMobile) {
			app.errMsg = app.error.mobile
			app.show.error = 1
			return
		}

		if (!code) {
			app.errMsg = app.error.code
			app.show.error = 1
			return
		}
		if (!checked) {
			app.errMsg = app.error.checked
			app.show.error = 1
			return
		}

		if(!uniqueId){
            wxLogin('');
            return
		}



        resource({
            type: 'POST',
            // api: '/login',
            api: '/weixin/post_wxLogin',
            params: {
                mobile: mobile,
                socialUserId: getParam('socialUserId') || loginInfo.socialUserId || '',
                uniqueId: getParam('uniqueId') || loginInfo.uniqueId ||'',
                verificationCode: code,
                jkcardToken:''
            }
        })
            .then(function (result) {
                if (result.code === 200) {
                    if (typeof result.data.needMobile == "undefined") {
                        //已经绑定直接登陆
                        result.data.uuid=uuid()
                        var loginInfoParam = result.data;
                        localStorage.setItem('loginInfo', JSON.stringify(loginInfoParam))
                        window.location.href = 'index.html'
                    }
                    if (result.data.needMobile==true)
                    {
                        alert("第一次授权请绑定手机号及验证码，输入完成请点击登陆");
                        return;
                    }

                } else {
                    // app.errMsg = app.error.code
                    app.errMsg = result.message
                    app.show.error = 1
                }
            })
            .fail(function (result) {

            })

	}

	/*function wxLogin() {
		var scope = "snsapi_userinfo",
		    state = "_" + (+new Date());



		Wechat.auth(scope, state, function (response) {
			//var url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=wx09ad67363eccbc91&secret=5703b703241f864e4f261d905d9932a4&code="+response.code +"&grant_type=authorization_code";
			//alert(JSON.stringify(response))

            resource({
				type: 'GET',
				api: '/socialUser/wechat/loginInfo?code='+response.code
			})
			.then(function (result) {
				if (result.code === 200) {
					app.bindUserId = result.data.openId;
					app.bindAccessToken = result.data.accessToken;
					app.bindChannel = "weixin";
					resource({
						type: 'POST',
						api: '/socialUser/login',
						params:{
							authCode: app.bindAccessToken,
							channel: app.bindChannel,
							mobile: '',
							uniqueId: app.bindUserId,
							verificationCode: ''
						}
					})
					.then(function (result) {
						if (result.code === 200) {
							if (typeof result.data.needMobile == "undefined") {
								//已经绑定直接登陆
								result.data.uuid=uuid()
								localStorage.setItem('loginInfo', JSON.stringify(result.data))
								window.location.href = 'user.html'
						　　}
							if (result.data.needMobile==true)
							{
								alert("第一次授权请绑定手机号及验证码，输入完成请点击登陆");
								return;
							}
						}
						else {
							alert("授权失败");
						}
					})
					.fail(function (result) {
						alert("授权失败");
					})


				}
				else {
					alert("授权失败");
				}
			})
			.fail(function (result) {
				alert("授权失败");
			})



		}, function (reason) {
		    alert("授权失败");
		});




	}*/


/*    function qqLogin() {

    	var args = {};
		args.client = QQSDK.ClientType.QQ;//QQSDK.ClientType.QQ,QQSDK.ClientType.TIM;
		QQSDK.ssoLogin(function (result) {
		  //alert(JSON.stringify(result))
		  	app.bindUserId = result.userid;
			app.bindAccessToken = result.access_token;
			app.bindChannel = "qq";
			resource({
				type: 'POST',
				api: '/socialUser/login',
				params:{
					authCode: app.bindAccessToken,
					channel: app.bindChannel,
					mobile: '',
					uniqueId: app.bindUserId,
					verificationCode: ''
				}
			})
			.then(function (result) {
				if (result.code === 200) {
					if (typeof result.data.needMobile == "undefined") { 
						//已经绑定直接登陆
						result.data.uuid=uuid()
						localStorage.setItem('loginInfo', JSON.stringify(result.data))
						window.location.href = 'user.html'
				　　}
					if (result.data.needMobile==true)
					{
						alert("第一次授权请绑定手机号及验证码，输入完成请点击登陆");
						return;
					}
				}
				else {
					alert("授权失败");
				}		
			})
			.fail(function (result) {
				alert("授权失败");
			})
		}, function (failReason) {
		  alert(failReason);
		}, args);
        
    }

    function aliLogin() {
        var authInfo  = '';
        resource({
			type: 'GET',
			api: '/socialUser/alipay/loginInfo'
		})
		.then(function (result) {
			authInfo = result;
			cordova.plugins.alipay.login(authInfo,function success(e){
				//alert(JSON.stringify(e))
				var result = e.result;

				app.bindUserId = getQueryString(result,"user_id");
				app.bindAccessToken = getQueryString(result,"auth_code");
				app.bindChannel = "alipay";
				resource({
					type: 'POST',
					api: '/socialUser/login',
					params:{
						authCode: app.bindAccessToken,
						channel: app.bindChannel,
						mobile: '',
						uniqueId: app.bindUserId,
						verificationCode: ''
					}
				})
				.then(function (result) {
					if (result.code === 200) {
						if (typeof result.data.needMobile == "undefined") { 
							//已经绑定直接登陆
							result.data.uuid=uuid()
							localStorage.setItem('loginInfo', JSON.stringify(result.data))
							window.location.href = 'user.html'
					　　}
						if (result.data.needMobile==true)
						{
							alert("第一次授权请绑定手机号及验证码，输入完成请点击登陆");
							return;
						}
					}
					else {
						alert("授权失败");
					}		
				})
				.fail(function (result) {
					alert("授权失败");
				})


			},function error(e){
				alert('Error:'+JSON.stringify(e));
			});
		})
		.fail(function (result) {

		})

		
    }*/

    function getQueryString(url,name) {  
	    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");  
	    var r = url.substr(1).match(reg);  
	    if (r != null) return unescape(r[2]); return null;  
	}  


});