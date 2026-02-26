const envPort = Number(process.env.SERVER_PORT);
export const SERVER_PORT = Number.isInteger(envPort) && envPort > 0 ? envPort : 9000;
export const SERVER_URL = `http://localhost:${SERVER_PORT}`;