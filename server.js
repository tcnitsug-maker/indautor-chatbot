app.use((req, res, next) => {
  if (req.url.endsWith(".js")) {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  }
  if (req.url.endsWith(".css")) {
    res.setHeader("Content-Type", "text/css; charset=UTF-8");
  }
  next();
});

