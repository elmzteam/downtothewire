var _fs             = require("fs")
let denodeify       = require("denodeify")
let config          = require("../config")
let users           = require("../users")
let fs              = require("./utils").fs
let path            = require("path")

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
					return db.posts.count()
						.then((count) => ({
							title: "",
							posts,
							pagination: {
								right: count > 5 ? "/archive/2" : undefined
							}
						}))
				})
				.then(fillDefaultSidebar(db))
	},
	{
		path:/^\/archive\/([1-9][0-9]*)$/,
		page: "page.hbs",
		cache: true,
		prerender: range(5).map((i) => `/archive/${i + 1}`),
		context: ([_, pageNumber], db) => {
			pageNumber = parseInt(pageNumber);
			return aggregatePosts(db, { $sort: { timestamp: -1 } }, { $skip: (pageNumber - 1) * 5 }, { $limit: 5 })
				.then(fillAuthorInfo(db))
				.then((posts) => {
					posts.forEach((post) => post.short = true);
					return db.posts.count()
						.then((count) => ({
							title: "",
							posts,
							pagination: {
								left: pageNumber > 1 ? `/archive/${pageNumber - 1}` : undefined,
								right: count > pageNumber * 5 ? `/archive/${pageNumber + 1}` : undefined
							}
						}))
				})
				.then(fillDefaultSidebar(db))
		}
	},
	{
		path:/^\/editor(\/([0-9a-zA-Z_-]{7,14}))?$/,
		page: "editor.hbs",
		cache: false,
		context: ([_, __, postId], db) =>
			db.posts.findOne({ guid: postId })
				.then((post) => {
					if (post != undefined) {
						return {
							title: `Editing "${post.title}"`,
							post,
							admin: true
						}
					} else {
						return {
							title: `Editing New Post`,
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
				.then((posts) => {
					posts.forEach((post) => post.short = true);
					return {
						title: `Tagged "${tag}"`,
						posts: posts,
						filter: {
							type: "tag",
							tag: tag
						}
					};
				})
				.then(fillDefaultSidebar(db))
	},
	{
		path: new RegExp(`^\\/author\\/(${Object.keys(users).join("|")})$`),
		page: "page.hbs",
		cache: true,
		prerender: Object.keys(config.adminInfo).map((author) => `/author/${author}`),
		context: ([_, author], db) =>
			aggregatePosts(db, { $match: { author: users[author].gid } }, { $sort: { timestamp: -1 } })
				.then(fillAuthorInfo(db))
				.then((posts) => {
					posts.forEach((post) => post.short = true);
					return {
						title: `Posts by ${users[author].name}`,
						posts: posts,
						filter: {
							type: "author",
							author: users[author]
						}
					};
				})
				.then(fillDefaultSidebar(db))
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
						posts: [post]
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
						posts: [post]
					};
				})
	},
	{
		path:/^\/raw\/([0-9a-zA-Z_-]{7,14})$/,
		page: "raw.hbs",
		cache: true,
		prerender: (db) => {
			return db.posts.find({})
				.then((posts) => posts.map((post) => `/raw/${post.guid}`));
		},
		context: ([_, postId], db) =>
			db.posts.findOne({ guid: postId })
	},
	{
		path:/^\/files\/?/,
		page: "files.hbs",
		cache: false,
		context: (_, db) => 
			aggregatePosts(db, { $sort: { timestamp: -1 } })
				.then(fillAuthorInfo(db))
				.then((posts) => ({
					posts,
					admin: true
				}))
				.then(findFiles(db))
				
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
		prerender: ["/contact"],
		context: { users }
	},
	{
		path:/^\/about\/?$/,
		page: "about.hbs",
		cache: true,
		prerender: ["/about"],
		context: { users }
	},
	{
		path:/^\/404$/,
		page: "not-found.hbs",
		cache: true,
		prerender: ["/404"],
		context: {
			fourohfour: true
		}
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

function fillDefaultSidebar(db) {
	return (context) =>
		db.posts.distinct("tags")
			.then((tags) => {
				context.sidebar = [
					{
						title: "Authors",
						type: "authors",
						authors: Object.keys(users).map((name) => users[name])
					},
					{
						title: "Tags",
						type: "tags",
						tags
					}
				];
				return context;
			})
}

var getStats = (base) => (file) =>
	fs.stat(path.join(base, file)).then( (stats) => ({
		file: file,
		stats: stats,
	}))


function findFiles(db) {
	return (context) => {
		let base = path.join(__dirname, "..", config.paths.upload)
		return fs.readdir(base)
		.then( (files) => Promise.all(files.map(getStats(base))))
		.then( (files) => {
			files = files.sort( (a, b) => {
				if (b.stats.birthtime > a.stats.birthtime) return  1
				if (a.stats.birthtime > b.stats.birthtime) return -1
				return 0
			})
			context.files = files.map( (f) => {return {
				path: path.join("/upload/", f.file),
				delete: path.join("/static/", f.file), 
				name: f.file.split("-").splice(1).join("-")
			}})
			context.files.unshift({
				path: "/upload/{{file}}",
				delete: "/static/{{file}}",
				name: "{{short-file}}",
			})
			return context
		})
	}
}
