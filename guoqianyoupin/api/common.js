define(function (require, exports, moduel) {
	var testInfo = {
		"token": "Y9Bd5HXH5/vHFhxE1ybQXkPPpp2pELANdzOgOFK/KZ6XJnO70W+QuAkj8Fh2pRLx80QKp0Y7ETjjFRqVRiGO+NGLOJhKumA8T+OZMb344BcKdpFbXM1+UT+if3K7Wc5ic5wz3Dnk1ILTBo4P8mM8/K/I9+yPpf4f9TC2PEqvAYs=",
		"issueDate": "2019-03-16 15:26:43",
		"expiration": "2019-03-23 15:26:43",
		"userName": "18616721420",
		"displayName": "18616721420",
		"uuid": "baac3fb1-ba3d-4c8e-9da7-d326268b00cc"
	}
	//写入测试
	//localStorage.setItem('loginInfo', JSON.stringify(testInfo))

	var loginInfo = JSON.parse(window.localStorage.getItem('loginInfo')) || {}

	//登录过期
	// if (loginInfo.expiration && (new Date()).getTime() >= (new Date(loginInfo.expiration)).getTime()) {
	// 	window.localStorage.removeItem('loginInfo')
	// 	window.localStorage.removeItem('cartNum')
	// }

	return {
		token: loginInfo.token || '',
		phoneNumber: loginInfo.phoneNumber || '',
		cardCode: loginInfo.cardCode || '',
        userName:loginInfo.userName
	}

});