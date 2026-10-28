# Circle Football matchmaking server

This small Node.js service pairs two players who click **Search for Opponents**. It does not host the game simulation: it only matches PeerJS IDs; the game then connects the players directly through PeerJS.

## Deploy (Render example)
1. Create a new GitHub repository for these two files (`server.js` and `package.json`).
2. In Render, create a **Web Service** from that repository.
3. Use build command `npm install` and start command `npm start`.
4. Deploy. Check `https://YOUR-SERVICE.onrender.com/health` returns `{"ok":true,...}`.
5. Copy the service URL and change `MATCHMAKING_SERVER_URL` in `circle_football_matchmaking_server_test.html` to its secure WebSocket URL, e.g. `wss://YOUR-SERVICE.onrender.com` (use your real service hostname).
6. Publish the updated HTML test copy and test from two devices. Both devices must keep the game page open while searching.

## Notes
- The host is the first player queued; the second is the guest.
- Existing Create Room / Join Room flows are unchanged.
- This initial version is a simple in-memory queue, so a server restart clears waiting players. It is designed for the initial 1v1 test, not large-scale matchmaking.
