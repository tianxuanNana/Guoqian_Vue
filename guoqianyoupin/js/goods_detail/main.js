define(function (require, exports, moduel) {
	var $ = require('jquery')
	require('../common/common')
	var goodsApi = require('../../api/goods')
	var cartApi = require('../../api/cart')
	var commentApi = require('../../api/comments')
	var consultationApi = require('../../api/consultation')
	var notification = require('../../api/notification')
	var favorApi = require('../../api/goods_favor')
	var Vue = require('vue')
	var Vant = require('vant')
	var Lazyload = Vant.Lazyload
	var countDown = require('../../components/countdown')
	// var Share = require('../../components/share')
	var IScroll = require('iscrollProbe')
	var FastClick = require('../../libs/fastclick')
	Vue.use(Vant)
	Vue.use(Lazyload)
	FastClick.attach(document.body);

    // if(!loginInfo.token){//来自分享的用户没登录
    //     wxLogin('');
    //     // return
    // }

	var productScroll;
	var bottomDetailScroll;
	var app = new Vue({
		data: function () {
			return {
				goodsId: '',
				type: '',
				skuId: '',
				activitySkuId: '',
				groupSn: '',
				inviter: '',
				notifyPhone: '',
				goodsData: {
					validPromotions: []
				},
				skuData: [],
				seletedSku: [],
				currSKuDetail: {},
				seletedNum: 1,
				quantity: 1,
				maxQuantity: 9999,
				page: 1,
				comments: [],
				consultation: [],
				cartNum: 0,
				refer: 'none', //none 仅关闭,buy 立即购买, addCart 加入购物车
				show: {
					loading: false,
					pageLoading: true,
					finished: false,
					detail: false,
					skuModule: false,
					notify: false,
					// share: false,
					groups: false
				},
				swiperIndex: 0, //主页面tab index
				detailIndex: 0, //详情tab index
				activity: {
					endDate: 0,
					startDate: 0,
					currentDate: 0
				},
				msTime: { //倒计时数值
					show: false, //倒计时状态
					day: '', //天
					hour: '', //小时
					minutes: '', //分钟
					seconds: '' //秒
				},
				state: {
					init: true,
					product: true,
					commentLoading: false,
					commentFinished: false,
					commentError: false,
					skuLoading: false,
					notifyLoading: false
				},
				showParaDivFlag: 0,
				recommends: []
			}
		},
		created: function () {
			this.goodsId = getParam('id') || ''
			this.skuId = getParam('skuId') || ''
			this.activitySkuId = getParam('activitySkuId') || ''
			this.quantity = getParam('quantity') || 1
			this.type = getParam('type') || 'general'
			this.groupSn = getParam('groupSn') || ''
			this.inviter = getParam('inviter') || ''
			if (this.inviter == 'null' || this.inviter == 'undefined') {
				this.inviter = ''
			}
			// alert(location.href)
			if (!this.goodsId) {
				this.$toast('商品不存在')
				window.history.back(-1)
				return
			}
			this.cartNum = Number(localStorage.getItem('cartNum')) || 0
			this.getGoodsDetail().then(function () {
				setTimeout(function () {
					productScroll.refresh()
				}, 10);
			})
			this.getComments()
			this.getConsultation()
			this.getRecommends()

            var _self = this

            wx.miniProgram.getEnv(function(res) {
                if(!res.miniprogram){
                    _self.getWxConfig()
                }
            })

		},
		mounted: function () {
			//this.$notify('');
		},
		watch: {
			'show.detail': function () {
				this.$nextTick(function () {
					productScroll.refresh()
					bottomDetailScroll.refresh()
				})
			},
			detailIndex: function () {
				this.$nextTick(function () {
					bottomDetailScroll.refresh()
				})
			},
			quantity: function (newVal, oldVal) {
				if (!regModel.test('int', newVal)) {
					this.quantity = oldVal
				}
			}
		},
		components: {
			countDown: countDown,
			// Share: Share
		},
		methods: {
			$url: $url,
			dateFormat: dateFormat,
			getMsTime: function (res) {
				this.msTime = res
			},
			getGoodsDetail: function () {
				//获取详情数据
				var _self = this
				_self.show.pageLoading = true

				return goodsApi.productDetail({
						productId: _self.goodsId,
						groupSn: _self.groupSn,
						activitySkuId: _self.activitySkuId,
						productType: _self.type,
					})
					.then(function (res) {
						var data;
						if (res.code == 200) {
							data = res.data
							_self.goodsData = data

							//商品已下架
							if (!data.marketable) {
								_self.$toast({
									message: '商品已下架',
									duration: 1000
								})
								setTimeout(function () {
									window.history.back(-1)
								}, 1000)
							}
							//(new Date()).getTime()+5000 ||
							//_self.activity.startDate = data.startDate
							_self.activity.currentDate = (new Date()).getTime()
							_self.activity.endDate = data.activityEndDate
							_self.currSKuDetail.hasStock = !!data.stock
							_self.currSKuDetail.sn = data.sn
							_self.currSKuDetail.skuId = data.skuId
							_self.currSKuDetail.price = data.price
							_self.currSKuDetail.img = data.defaultImgae
							_self.currSKuDetail.marketPrice = data.marketPrice
							_self.currSKuDetail.validPromotions = data.validPromotions
							return [data.specificationItems, data.specificationValue]
						}
					})
					.then(function (data) {
						if (!data[0]) {
							return
						}
						//处理sku数据
						var skuData = jsonParse(data[0]),
							currSKu = data[1]
						skuData.forEach(function (v, i) {
							v.entries.forEach(function (item) {
								item.active = false
								if (item.value == currSKu[i].value) {
									_self.seletedSku[i] = item
									item.active = true
								}
							})
						})
						_self.skuData = skuData
					})
					.fail(function () {
						_self.$notify('网络错误');
					})
					.always(function () {
						_self.show.pageLoading = false
					})
			},
			getRecommends: function (delay) {
				//获取推荐
				var _self = this
				goodsApi.recommends({
						id: _self.goodsId
					})
					.then(function (res) {
						if (res.code == 200) {
							_self.recommends = res.data
						}
					})
			},
			getComments: function (delay) {
				//获取评论
				var _self = this
				delay = delay || 0
				_self.state.commentLoading = true
				commentApi.comments({
						id: _self.goodsId,
						page: _self.page
					})
					.then(function (res) {
						if (res.code == 200) {
							if (_self.page >= res.data.totalPage) {
								_self.state.commentFinished = true
							}
							_self.comments = _self.comments.concat(res.data.content)
						}
					})
					.fail(function () {
						_self.state.commentError = true
						throw ('comment loading error')
						//_self.$notify('网络错误');
					})
					.always(function () {
						_self.state.commentLoading = false
					})
			},
			getConsultation: function () {
				//获取咨询
				var _self = this
				consultationApi.product({
						id: _self.goodsId,
						page: 1
					})
					.then(function (res) {
						var data = []
						if (res.code == 200) {
							data = res.data.content
							//最多显示 2 组
							data.forEach(function (v, i) {
								if (i < 2) {
									_self.consultation.push(v)
								}
							})
						} else {
							throw ('consultation product Error')
						}
					})
					.fail(function () {
						throw ('consultation product Error')
					})
			},
			swiperContainer: function (index) {
				this.swiperIndex = index
			},
			swipeTo: function (index) {
				//主页面tab页面切换
				if (this.state.product) {
					this.$refs.swipe.swipeTo(index)
				}
			},
			swipeDetail: function (index) {
				//tab页面切换
				this.detailIndex = index
			},
			showSkuModule: function (refer) {
				//显示选取sku
				this.refer = refer
				var _self = this;
				setTimeout(function () {
					_self.show.skuModule = true
				}, 10)
			},
			choiceSku: function (item, parentIndex) {
				//选择sku规格
				var _self = this;
				// if (this.seletedSku[parentIndex]) {
				// 	if (this.seletedSku[parentIndex].id != item.id) {
				// 		this.seletedSku[parentIndex].active = false
				// 	}
				// }
				// item.active = !item.active


				if (this.seletedSku[parentIndex]) {
					this.seletedSku[parentIndex].active = false
				}
				item.active = true
				this.seletedSku[parentIndex] = item
				var skuVal = []
				this.seletedSku.forEach(function (v) {
					if (v.active) {
						skuVal.push(v.value)
					}
				})
				_self.state.skuLoading = true
				goodsApi.skuDetail({
						id: _self.goodsId,
						val: skuVal.join(',')
					})
					.then(function (res) {
						if (res.code == 200) {
							_self.currSKuDetail = res.data
							_self.currSKuDetail.img = res.data.specificationImg
						}
					})
					.fail(function () {
						_self.$notify('网络错误');
					})
					.always(function () {
						_self.state.skuLoading = false
					})
			},
			minus: function () {
				//数量减
				if (this.quantity <= 1) {
					return
				}
				this.quantity--
			},
			plus: function () {
				//数量加
				if (this.quantity >= this.maxQuantity) {
					this.$toast('数量超出范围')
					return
				}
				this.quantity++
			},
			choiceSkuDone: function () {
				//sku 选择完成
				if (!this.currSKuDetail.hasStock || this.quantity > this.currSKuDetail.hasStock) {
					this.$toast('库存不足')
					return
				}
				if (!regModel.test('int', this.quantity) || this.quantity < 1 || this.quantity > this.maxQuantity) {
					this.$toast('数量超出范围')
					return
				}

				var refer = this.refer
				if (refer == 'none') {
					this.show.skuModule = false
				}
				if (refer == 'addCart') {
					this.addCart()
				}
				if (refer == 'buy') {
					this.goBuy()
				}
			},
			addCart: function () {
				//添加购物车
				if (!loginInfo.token) {
					$url('login.html')
					return
				}
				var _self = this;
				cartApi.addCart({
						inviter: _self.inviter,
						skuId: _self.currSKuDetail.skuId,
						quantity: _self.quantity
					})
					.then(function (res) {
						_self.show.skuModule = false
						_self.getCartList()
						_self.$toast({
							message: res.message,
							duration: 1000
						})
					})
					.fail(function (res) {
						// _self.$notify('网络错误');
                        _self.$toast({
                            message: res.responseJSON.message,
                            duration: 1000
                        })
					})
			},
			getCartList: function () {
				//获取购物车信息
				var _self = this
				cartApi.cartList()
					.then(function (res) {
						if (res.code == 200) {
							var cartNum = 0
							res.data.forEach(function (v) {
								cartNum += Number(v.skuQuantity)
							})
							_self.cartNum = cartNum
							window.localStorage.setItem('cartNum', cartNum)
						}
					})
			},
			favorite: function () {
				//添加收藏
				var _self = this
				if (_self.goodsData.hasFavorite) {
					favorApi.remove(_self.goodsId)
						.then(function (res) {
							_self.$toast(res.message)
							_self.goodsData.hasFavorite = false
						})
						.fail(function () {
							_self.$notify('网络错误');
						})
				} else {
					favorApi.batchAdd({
							skuIdsValue: _self.goodsData.skuId
						})
						.then(function (res) {
							_self.$toast(res.message)
							_self.goodsData.hasFavorite = true
						})
						.fail(function () {
							_self.$notify('网络错误');
						})
				}
			},
			addNotify: function () {
				//到货通知
				var _self = this
				if (!regModel.test('tel', this.notifyPhone)) {
					_self.$toast('请输入有效的手机号')
					return
				}
				_self.state.notifyLoading = true
				notification.addNotify({
						skuId: this.currSKuDetail.skuId,
						phoneNo: this.notifyPhone
					})
					.then(function (res) {
						_self.show.notify = false
						_self.$toast({
							message: res.message,
							duration: 1000
						})
					})
					.fail(function () {
						_self.$notify('网络错误');
					})
					.always(function () {
						_self.state.notifyLoading = false
					})
			},
			groupBuy: function (item) {
				this.groupSn = item.groupSn
				this.showSkuModule('buy')
			},
			goBuy: function () {
				//跳转下单
				var _self = this
				var skuData = [{
					skuId: this.currSKuDetail.skuId,
					quantity: this.quantity
				}]
				var val = JSON.stringify(skuData)
				// $url('confirmorder.html?sku=' + val + '&type=' + _self.type + '&groupSn=' + _self.groupSn + '&inviter=' + _self.inviter)
                window.localStorage.setItem('cartGoods', val)
				$url('confirmorder.html?type=' + _self.type + '&groupSn=' + _self.groupSn + '&inviter=' + _self.inviter)
			},
            getWxConfig:function () {
				var _self = this

				if(getParam('from') || getParam('isappinstalled')){//解决微信二次分享签名失败
					window.location.href = 'goods_detail.html?id='+getParam('id')
				}

                resource({
                    type: 'GET',
                    api: '/weixin/wxAuth_config',
                    data: "currentUrl="+(window.location.href).split('#')[0]
                })
                    .then(function (result) {
                        if (result.code === 200) {
                        	var data = result.data;
                            wx.config({
                                debug: false,
                                appId: data.appId, // 必填，公众号的唯一标识
                                timestamp: data.timestamp, // 必填，生成签名的时间戳
                                nonceStr: data.nonceStr, // 必填，生成签名的随机串
                                signature: data.signature,// 必填，签名
                                jsApiList: ['showOptionMenu','updateAppMessageShareData','updateTimelineShareData','onMenuShareTimeline','onMenuShareAppMessage','onMenuShareQQ','onMenuShareWeibo','onMenuShareQZone'] // 必填，需要使用的JS接口列表
                            });

                            _self.wxReady();
                        }

                    })

            },
			wxReady:function () {//微信分享样式自定义
				var title = this.goodsData.name;
				var link = window.location.href;
				var imgUrl = this.currSKuDetail.img;
				var desc = this.goodsData.caption;

                wx.ready(function () {   //需在用户可能点击分享按钮前就先调用
                    wx.showOptionMenu();

                    // wx.updateAppMessageShareData({//自定义“分享给朋友”及“分享到QQ”
                    //     title: title, // 分享标题
                    //     desc: desc, // 分享描述
                    //     link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                    //     imgUrl: imgUrl, // 分享图标
                    //     success: function () {
                    //         // 设置成功
                    //     }
                    // })
                    //
                    // wx.updateTimelineShareData({//自定义“分享到朋友圈”及“分享到QQ空间”
                    //     title: title, // 分享标题
                    //     link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                    //     imgUrl: imgUrl, // 分享图标
                    //     success: function () {
                    //         // 设置成功
                    //     }
                    // })

                        wx.onMenuShareTimeline({
                            title: title, // 分享标题
                            link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                            imgUrl: imgUrl, // 分享图标
                            success: function () {
                                // 用户点击了分享后执行的回调函数
                            },
                        })

						wx.onMenuShareAppMessage({
							title: title, // 分享标题
							desc: desc, // 分享描述
							link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
							imgUrl: imgUrl, // 分享图标
							type: '', // 分享类型,music、video或link，不填默认为link
							dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
							success: function () {
							}
						});

						wx.onMenuShareQQ({
							title: title, // 分享标题
							desc: desc, // 分享描述
							link: link, // 分享链接
							imgUrl: imgUrl, // 分享图标
							success: function () {
							},
							cancel: function () {
							}
						});

						wx.onMenuShareWeibo({
                            title: title, // 分享标题
                            desc: desc, // 分享描述
                            link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                            imgUrl: imgUrl, // 分享图标
							success: function () {
							},
							cancel: function () {
							}
						});

                    wx.onMenuShareQZone({
                        title: title, // 分享标题
                        desc: desc, // 分享描述
                        link: link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                        imgUrl: imgUrl, // 分享图标
                        success: function () {
                        },
                        cancel: function () {
                        }
                    });
                })

            },
/*			openShare: function () {
				//打开分享
				if (!loginInfo.token) {
					$url('login.html')
					return
				}
				this.show.share = true
			},
			shareWeixinPerson: function () {
				Wechat.share({
					message: {
						title: this.goodsData.name,
						description: this.goodsData.caption,
						thumb: this.currSKuDetail.img,
						mediaTagName: this.goodsId,
						media: {
							type: Wechat.Type.WEBPAGE,
							webpageUrl: "http://192.168.212.47:8180/member/share/register?inviterId=" + loginInfo.userId + "&productId=" + this.goodsId + "&activitySkuId=" + this.activitySkuId + "&type=" + this.type
						},
						scene: Wechat.Scene.SESSION
					},
					scene: Wechat.Scene.SESSION // share to session
				}, function () {
					//alert("Success");
				}, function (reason) {
					//alert("Failed: " + reason);
				});

			},
			shareWeixinGroup: function () {
				Wechat.share({
					message: {
						title: this.goodsData.name,
						description: this.goodsData.caption,
						thumb: this.currSKuDetail.img,
						mediaTagName: this.goodsId,
						media: {
							type: Wechat.Type.WEBPAGE,
							webpageUrl: "http://192.168.212.47:8180/member/share/register?inviterId=" + loginInfo.userId + "&productId=" + this.goodsId + "&activitySkuId=" + this.activitySkuId + "&type=" + this.type
						},
						scene: Wechat.Scene.TIMELINE
					},
					scene: Wechat.Scene.TIMELINE // share to Timeline
				}, function () {
					//alert("Success");
				}, function (reason) {
					//alert("Failed: " + reason);
				});
			},
			shareQQPerson: function () {
				var args = {};
				args.client = QQSDK.ClientType.QQ;
				args.scene = QQSDK.Scene.QQ; //QQSDK.Scene.QQZone,QQSDK.Scene.Favorite
				args.url = "http://192.168.212.47:8180/member/share/register?inviterId=" + loginInfo.userId + "&productId=" + this.goodsId + "&activitySkuId=" + this.activitySkuId + "&type=" + this.type;
				args.title = this.goodsData.name;
				if (this.goodsData.caption=="")
					args.description = "　";
				else
					args.description =this.goodsData.caption;
				args.image = this.currSKuDetail.img;
				QQSDK.shareNews(function () {
					//alert('shareNews success');
				}, function (failReason) {
					//alert(failReason);
				}, args);
			},
			shareQQGroup: function () {
				var args = {};
				args.client = QQSDK.ClientType.QQ;
				args.scene = QQSDK.Scene.QQZone; //QQSDK.Scene.QQ,QQSDK.Scene.Favorite
				args.url = "http://192.168.212.47:8180/member/share/register?inviterId=" + loginInfo.userId + "&productId=" + this.goodsId + "&activitySkuId=" + this.activitySkuId + "&type=" + this.type;
				args.title = this.goodsData.name;
				if (this.goodsData.caption=="")
					args.description = "　";
				else
					args.description =this.goodsData.caption;
				args.description = this.goodsData.caption;
				args.image = this.currSKuDetail.img;
				QQSDK.shareNews(function () {
					//alert('shareNews success');
				}, function (failReason) {
					//alert(failReason);
				}, args);
			},
			shareWeibo: function () {
				var args = {};
				args.url = "http://192.168.212.47:8180/member/share/register?inviterId=" + loginInfo.userId + "&productId=" + this.goodsId + "&activitySkuId=" + this.activitySkuId + "&type=" + this.type;
				args.title = this.goodsData.name;
				args.description = this.goodsData.caption;
				args.image = this.currSKuDetail.img;
				WeiboSDK.shareToWeibo(function () {
					//alert('share success');
				}, function (failReason) {
					//alert(failReason);
				}, args);
			},*/
			showParaDiv: function () {
				if (app.showParaDivFlag) {
					$('#paraDiv').css("height", "9vw");
					app.showParaDivFlag = 0;
				} else {
					$('#paraDiv').css("height", "auto");
					app.showParaDivFlag = 1;
				}
			},
			phoneCall: function () {
				var ref = cordova.InAppBrowser.open(
	              "tel://400-8050939",
	              "_system",
	              "location=no"
	            );
			}
		}
	}).$mount('#page')

	productScroll = new IScroll('.product-wrapper', {
		probeType: 2,
		mouseWheel: false,
		fadeScrollbars: false,
		scrollbars: false
	});

	//上拉加载详情
	productScroll.on('scroll', function () {
		if (this.y + 60 < (this.maxScrollY)) {
			app.state.product = false
		}
	})

	//底部详情
	bottomDetailScroll = new IScroll('#bottom-detail', {
		probeType: 2,
		mouseWheel: false,
		fadeScrollbars: false,
		scrollbars: false
	});


	//底部详情下拉加载商品
	bottomDetailScroll.on('scroll', function () {
		if (this.y > 60) {
			app.state.product = true
		}
	})

	document.addEventListener('touchend', function () {
		if (!app.state.product) {
			app.show.detail = 1
		} else {
			app.show.detail = 0
		}
	})


	//阻止默认事件
	// document.addEventListener('touchmove', function (e) {
	// 	e.preventDefault();
	// }, isPassive() ? {
	// 	capture: false,
	// 	passive: false
	// } : false)

});
