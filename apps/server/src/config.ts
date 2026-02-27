const renderPort = Number(process.env.PORT);
const envPort = Number(process.env.SERVER_PORT);

export const SERVER_PORT =
	(Number.isInteger(renderPort) && renderPort > 0 ? renderPort : undefined) ??
	(Number.isInteger(envPort) && envPort > 0 ? envPort : 9000);

export const SERVER_URL = `http://localhost:${SERVER_PORT}`;

const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

export const CORS_ORIGINS =
	configuredOrigins.length > 0
		? configuredOrigins
		: ["http://localhost:3000", "http://127.0.0.1:3000"];