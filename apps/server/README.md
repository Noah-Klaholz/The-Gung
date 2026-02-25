# Dokumentation über Backend API/Architektur

Base URL: http://localhost:3000/api

WebSocket: ws://localhost:3000

## Lobby Handling

Lobby creation/joining is handled via REST Endpints as following:

| Method | Command          | Explanation |
| ------ | ---------------- | ----------- |
| POST   | lobby            |
| POST   | /lobby/:id/join  |
| GET    | /lobby/:id       |
| POST   | /lobby/:id/start |

