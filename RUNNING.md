Run the WebSocket server locally and open the demo in browsers (desktop + phone).

1) Install dependencies and start server on your PC:

```bash
npm install
npm start
```

2) Open the demo in a browser on the same machine: open `index.html` (file://) or serve it via a simple HTTP server.

3) To view on your phone, ensure your phone can reach the PC's WebSocket address, then open the page on the phone using the PC's local IP (e.g. `http://192.168.0.10/index.html`) and change the WebSocket URL in `scanner.js` to `ws://192.168.0.10:8080` or use `ngrok`.

Notes:
- The server listens on port 8080 and simply broadcasts `{ type: 'scan', barcode, product }` messages to other connected clients.
- For cross-network testing, use `ngrok http 8080` or similar tunneling tools and update the WebSocket URL accordingly.
