import express, {Request, Response} from 'express';
import http from 'http';
import {MultiplayerService} from "./multiplayer.service";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

MultiplayerService.getInstance().initSocket(server)

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript with Express!');
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});