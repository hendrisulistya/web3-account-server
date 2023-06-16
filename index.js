// index.js
const app = require('./src/server');

const port = 3009;

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
