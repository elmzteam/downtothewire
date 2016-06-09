var handlebars = require("handlebars")
module.exports = {
	admins: [
		"zacharywade@gmail.com",
		"matthew.damon.savage@gmail.com",
		"dhlanm@gmail.com",
		"ellisstsung@gmail.com",
		"bzhang.2003@gmail.com",
		"lee123456771@gmail.com",
		"kyle.w.herndon@gmail.com",
		"dh4dt@virginia.edu",
	],
	rssInfo: {
		title: "Down to the Wire",
		description: "Technology and design only as serious as it needs to be",
		site_url: "http://dttw.tech",
		feed_url: "http://dttw.tech/rss",
		language: "en",
	},
	paths: {
		posts: "posts",
		client: "client",
		render: "render"
	},
	adminInfo: require("./users.js"),	
	sidebar: [{
		title: (new handlebars.SafeString("<a href='/about'>About</a>")),
		content: "Down to the Wire is a blog about everything new in tech"
	}],
}
