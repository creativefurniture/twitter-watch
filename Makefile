run:
	node index.js

download-nitter-rss:
	rm -f nitter-rss-linux-amd64
	wget "https://github.com/haliliceylan/nitter-rss/releases/download/v0.0.1/nitter-rss-linux-amd64"
	chmod +x nitter-rss-linux-amd64