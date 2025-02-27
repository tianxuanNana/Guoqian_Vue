define(function (require, exports, moduel) {
	var $ = require('jquery')
	require('../common/common')
	var api = require('../../api/goods')
	var Vue = require('vue')
	var Vant = require('vant')
	var Lazyload = Vant.Lazyload
	Vue.config.devtools = true

	Vue.use(Vant)
	Vue.use(Lazyload)

	/* @searchType
	 * 筛选
	 * values: topDesc, priceAsc, priceDesc, salesDesc, scoreDesc, dateDesc
	 */
	var app = new Vue({
		data: function () {
			return {
				flag: '1',
				productList: [],
				keyword: '',
				sortData: [{
						label: '综合',
						name: '综合排序',
						val: 'topDesc',
					},
					{
						label: '新品',
						name: '新品优先',
						val: 'dateDesc',
					},
					{
						label: '评论',
						name: '评论从高到低',
						val: 'scoreDesc',
					}
				],
				filterData: {
					attributeInfo: [],
					brandInfo: [],
					categoryInfo: [],
					promotionInfo: [],
				},

				attrs: '',
				brandId: '',
				productCategoryId: 41,
				productTagId: '',
				endPrice: '',
				startPrice: '',
				type: '',
				promotionId: '',

				priceSelected: {},
				cateSelected: {},
				brandSelected: {},
				promotionSelected: {},
				attrSelect: [],
				filterItemIndex: 0,
				curSort: {},
				searchType: 'topDesc',
				loading: false,
				finished: false,
				error: false,
				page: 1,
				searchHistroy: [],
				show: {
					sort: false,
					filter: false
				},
				state: {
					filter: false,
					filterInit: true
				}
			}
		},
		created: function () {
			this.keyword = getParam('keyword') || ''
			this.productCategoryId = getParam('cId') || ''
			this.brandId = getParam('bId') || ''
			var isFilter = getParam('filter')
			if (isFilter == 'true') {
				isFilter = true
			} else {
				isFilter = false
			}
			this.state.filter = isFilter
			this.curSort = this.sortData[0]
			this.searchHistroy = JSON.parse(window.localStorage.getItem('searchHistroy')) || []
			this.getProduct()
		},
		mounted: function () {
			//this.$notify('');
		},
		watch: {
			'searchType': function () {
				this.page = 1
				this.finished = false
				this.productList = []
				this.getProduct()
			}
		},
		methods: {
			$url: $url,
			subSearch: function () {
				//提交搜索
				if (!this.keyword) {
					return false
				}
				this.state.filter = false
				this.page = 1
				this.finished = false
				this.productList = []
				this.getProduct()
				this.$refs.searchInput.blur()
				this.show.sort = false
			},
			saveHistroy: function () {
				//存储搜索历史
				var _self = this
				var flag = false
				if (!this.keyword) {
					return
				}
				this.searchHistroy.forEach(function (v) {
					if (v == _self.keyword) {
						flag = true
					}
				})
				if (!flag) {
					this.searchHistroy.unshift(this.keyword)
					window.localStorage.setItem('searchHistroy', JSON.stringify(this.searchHistroy))
				}
			},
			choiceSort: function (item) {
				//选中综合排序
				this.curSort = item
				this.searchType = item.val
				this.show.sort = false
			},
			toggleSort: function () {
				//开关综合选项
				if (this.flag == 1) {
					this.show.sort = !this.show.sort
				} else {
					this.choiceType(this.curSort.val, 1)
				}
			},
			choiceType: function (val, target) {
				//排序
				/* val
				 * @String || @Array
				 */
				this.show.sort = false
				var _self = this
				var type = ''
				var len = 0
				if (Array.isArray(val)) {
					val.forEach(function (v, i) {
						if (_self.searchType == v) {
							len = (i + 1) < val.length ? (i + 1) : 0
						}
					})
					type = val[len]
				} else {
					type = val
				}

				this.searchType = type
				this.flag = target
			},
			choiceAttr: function (item, parentItem, multiple) {
				//选择筛选项 
				/*
				 * @multiple 是否支持多选（当前为保留项，暂无业务逻辑）
				 */

				//指定处理价格
				if (parentItem.name === '价格') {
					if (this.priceSelected.option == item.option) {
						item.active = !item.active
					} else {
						this.priceSelected.active = false
						item.active = true
					}
					this.priceSelected = item
					return
				}

				//指定处理分类
				if (parentItem.name === '分类') {
					if (this.cateSelected == item) {
						item.active = !item.active
					} else {
						this.cateSelected.active = false
						item.active = true
					}
					this.cateSelected = item
					if (this.cateSelected.active) {
						this.productCategoryId = item.id
					} else {
						this.productCategoryId = getParam('cId') || ''
					}
					return
				}
				//指定处理品牌
				if (parentItem.name === '品牌') {
					if (this.brandSelected == item) {
						item.active = !item.active
					} else {
						this.brandSelected.active = false
						item.active = true
					}
					this.brandSelected = item
					if (this.brandSelected.active) {
						this.brandId = item.id
					} else {
						this.brandId = getParam('bId') || ''
					}
					return
				}
				//指定处理促销
				if (parentItem.name === '促销') {
					if (this.promotionSelected == item) {
						item.active = !item.active
					} else {
						this.promotionSelected.active = false
						item.active = true
					}
					this.promotionSelected = item
					if (this.promotionSelected.active) {
						this.promotionId = item.id
					} else {
						this.promotionId = ''
					}
					return
				}



				//属性通用处理价格
				if (multiple === true) {
					item.active = !item.active
				}
				if (item.active) {
					item.index = this.filterItemIndex
					this.attrSelect.splice(item.index, 0, item)
					this.filterItemIndex++
				} else {
					this.attrSelect.splice(item.index, 1, false)
				}
			},
			filterDone: function () {
				//筛选
				if (this.priceSelected.active) {
					this.startPrice = this.priceSelected.option.split('-')[0]
					this.endPrice = this.priceSelected.option.split('-')[1]
				} else {
					this.startPrice = ''
					this.endPrice = ''
				}

				var attrArr = []
				this.attrSelect.forEach(function (v) {
					if (v) {
						attrArr.push(v.option)
					}
				})
				this.attrs = attrArr.join(',')
				this.page = 1
				this.finished = false
				this.productList = []
				this.getProduct()
				this.show.filter = false
			},
			resetFilter: function () {
				//筛选重置

				//属性重置
				this.attrSelect.forEach(function (v) {
					if (v) {
						v.active = false
					}
				})
				this.attrSelect = []
				this.attrs = ''
				this.filterItemIndex = 0

				//价格重置
				this.priceSelected.active = false
				this.priceSelected = {}

				this.cateSelected.active = false
				this.cateSelected = {},

					this.brandSelected.active = false
				this.brandSelected = {},

					this.promotionSelected.active = false
				this.promotionSelected = {},


					this.productCategoryId = getParam('cId')
				this.type = ''
				this.attrs = ''
				this.brandId = getParam('bId')
				this.productTagId = ''
				this.endPrice = ''
				this.startPrice = ''
				this.promotionId = ''
				this.endPrice = ''

			},
			filterSearch: function () {
				//筛选搜索
				var _self = this
				return api.list({
						orderType: _self.searchType,
						attributeId: _self.attrs,
						brandId: _self.brandId,
						productCategoryId: _self.productCategoryId,
						productTagId: _self.productTagId,
						endPrice: _self.endPrice,
						startPrice: _self.startPrice,
						type: _self.type,
						promotionId: _self.promotionId,
						pageNumber: _self.page
					})
					.then(function (res) {
						if (res.code == 200) {
							if (_self.state.filterInit) {

								var data = res.data
								data.brandInfo = data.brandInfo || []
								data.brandInfo.forEach(function (v) {
									v.active = false
								})

								data.categoryInfo = data.categoryInfo || []
								data.categoryInfo.forEach(function (v) {
									v.active = false
								})

								data.promotionInfo = data.promotionInfo || []
								data.promotionInfo.forEach(function (v) {
									v.active = false
								})

								_self.filterData = data
							}
							_self.state.filterInit = false
							return res.data.productInfo
						}
					})
			},
			goodsSearch: function () {
				//商品搜索
				var _self = this
				return api.productSearch({
						keyword: _self.keyword,
                    orderType: _self.searchType,
						page: _self.page
					})
					.then(function (res) {
						if (res.code == 200) {
							return res.data
						}
					})
			},
			getProduct: function () {
				//获取产品
				var _self = this
				var productPromise
				if (this.state.filter) {
					productPromise = this.filterSearch()
				} else {
					productPromise = this.goodsSearch()
					this.saveHistroy()
				}
				_self.loading = true
				productPromise
					.then(function (data) {
						_self.productList = _self.productList.concat(data.content)
						if (_self.page >= data.totalPage) {
							_self.finished = true
						}
						_self.page++
					})
					.fail(function () {
						_self.error = true
						_self.$notify('网络错误');
					})
					.always(function () {
						_self.loading = false;
					})
			}
		}
	}).$mount('#page');

});