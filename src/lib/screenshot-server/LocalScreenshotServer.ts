import bodyParser from "body-parser";
import express, { Express } from "express";
import { Server } from "net";
import { ScreenshotRenderer } from "../screenshot-renderer/api";
import { ScreenshotServer } from "./api";

/**
 * A local server with a /render POST endpoint, which takes a payload such as
 *
 * ```json
 * {
 *   "url": "https://www.google.com"
 * }
 * ```
 *
 * and returns a PNG screenshot of the URL.
 */
export class LocalScreenshotServer implements ScreenshotServer {
  private readonly app: Express;
  private server: Server | null = null;

  constructor(
    private readonly renderer: ScreenshotRenderer,
    private readonly port: number
  ) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.post("/render", async (req, res) => {
      const url = req.body.url;
      const viewport = req.body.viewport;
      const screenshot = await (viewport
        ? this.renderer.render(url, viewport)
        : this.renderer.render(url));
      res.contentType("image/png");
      res.end(screenshot);
    });
  }

  async start() {
    await this.renderer.start();
    return new Promise<void>(resolve => {
      this.server = this.app.listen(this.port, resolve);
    });
  }

  async stop() {
    const server = this.server;
    if (!server) {
      throw new Error(
        `Server is not running! Please make sure that start() was called.`
      );
    }
    await new Promise((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
    await this.renderer.stop();
  }
}