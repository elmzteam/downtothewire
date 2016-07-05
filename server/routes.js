var _fs             = require("fs")
let denodeify       = require("denodeify")
let config          = require("../config")

const fs = {
	readFile: denodeify(_fs.readFile)
}

module.exports = [
	{
		path:/^\/$/,
		page: "page.hbs",
		cache: true,
		prerender: ["/"],
		context: (_, db) =>
			aggregatePosts(db, { $sort: { timestamp: -1 } }, { $limit: 5 })
				.then(fillAuthorInfo(db))
				.then((posts) => {
					posts.forEach((post) => post.short = true);
					return {
						title: "",
						posts,
						sidebar: true
					};
				})
	},
	{
		path:/^\/archive\/([1-9][0-9]*)$/,
		page: "page.hbs",
		cache: true,
		prerender: range(5).map((i) => `/archive/${i + 1}`),
		context: ([_, pageNumber], db) =>
			aggregatePosts(db, { $sort: { timestamp: -1 } }, { $skip: (pageNumber - 1) * 5 }, { $limit: 5 })
				.then(fillAuthorInfo(db))
				.then((posts) => {
					posts.forEach((post) => post.short = true);
					return {
						title: `Archive, Page ${pageNumber}`,
						posts,
						sidebar: true
					};
				})
	},
	{
		path:/^\/editor(\/([0-9a-zA-Z_-]{7,14}))?$/,
		page: "editor.hbs",
		cache: false,
		context: ([_, __, postId], db) =>
			db.posts.findOne({ guid: postId })
				.then((post) => {
					if (post !== undefined) {
						return {
							title: `Editing "${post.title}"`,
							post,
							sidebar: false,
							admin: true
						}
					} else {
						return {
							title: `Editing New Post`,
							sidebar: false,
							admin: true
						}
					}
				})
	},
	{
		path:/^\/tag\/([a-z0-9\-]{1,16})$/,
		page: "page.hbs",
		cache: true,
		prerender: (db) => {
			return db.posts.distinct("tags", {})
				.then((tags) => tags.map((tag) => `/tag/${tag}`))
		},
		context: ([_, tag], db) =>
			aggregatePosts(db, { $match: { tags: tag } }, { $sort: { timestamp: -1 } })
				.then(fillAuthorInfo(db))
				.then((posts) => ({
					title: `Tagged "${tag}"`,
					posts: posts,
					sidebar: true
				}))
	},
	{
		path:/^\/author\/([a-zA-Z]{1,16})$/,
		page: "page.hbs",
		cache: true,
		prerenderFIXME: Object.keys(config.adminInfo).map((author) => `/author/${author}`),
		context: ([_, author], db) =>
			aggregatePosts(db, { $match: { author } }, { $sort: { timestamp: -1 } }) // FIXME
				.then(fillAuthorInfo(db))
				.then((posts) => ({
					title: `Posts by ${author}`,
					posts: posts,
					sidebar: true
				}))
	},
	{
		path:/^\/posts\/([0-9a-zA-Z_-]{7,14})$/,
		page: "page.hbs",
		cache: true,
		prerender: (db) => {
			return db.posts.find({})
				.then((posts) => posts.map((post) => `/posts/${post.guid}`));
		},
		context: ([_, postId], db) =>
			db.posts.findOne({ guid: postId })
				.then(fillAuthorInfo(db))
				.then((post) => ({
						title: post.title.text,
						posts: [post],
						sidebar: false
					}))
	},
	{
		path:/^\/preview\/([0-9a-zA-Z_-]{7,14})$/,
		page: "page.hbs",
		cache: false,
		context: ([_, postId], db) =>
			db.posts.findOne({ guid: postId })
				.then(fillAuthorInfo(db))
				.then((post) => {
					post.hideComments = true;
					return {
						title: post.title.text,
						posts: [post],
						sidebar: false
					};
				})
	},
	{
		path:/^\/raw\/([0-9a-zA-Z_-]{7,14})$/,
		page: "raw.hbs",
		cache: true,
		prerenderFIXME: (db) => {
			return db.posts.find({})
				.then((posts) => posts.map((post) => `/raw/${post.guid}`));
		}
	},
	{
		path:/^\/admin\/?$/,
		page: "admin.hbs",
		cache: false,
		context: (_, db) =>
			aggregatePosts(db, { $sort: { timestamp: -1 } })
				.then(fillAuthorInfo(db))
				.then((posts) => ({
					posts,
					admin: true
				}))
	},
	{
		path:/^\/rss\/?$/,
		page: "rss.hbs",
		cache: true,
		prerender: ["/rss"]
	},
	{
		path:/^\/contact\/?$/,
		page: "contact.hbs",
		cache: true,
		prerender: ["/contact"]
	},
	{
		path:/^\/about\/?$/,
		page: "about.hbs",
		cache: true,
		prerender: ["/about"]
	},
	{
		path:/^\/404$/,
		page: "single.hbs",
		cache: true,
		prerender: ["/404"]
	},
	{
		path:/^\/manifest.json$/,
		page: "manifest.json",
		cache: true,
		prerender: ["/manifest.json"]
	}
];

function fillAuthorInfo(db) {
	return (posts) => {
		if (Array.isArray(posts)) {
			return Promise.all(posts.map((post) => db.authors.findOne({ id: post.author })))
				.then((authors) => {
					posts.forEach((post, i) => post.author = authors[i]._json);
					return posts;
				});
		} else {
			return db.authors.findOne({ id: posts.author })
				.then((author) => {
					posts.author = author._json;
					return posts;
				});
		}
	}
}

function aggregatePosts(db, ...pipeline) {
	return db.posts.aggregate(...pipeline);
}

function range(a, b) {
	if (b === undefined) {
		b = a;
		a = 0;
	}

	return Array.from(new Array(b - a), (_, i) => i);
}