import { readFile, writeFile } from "fs";
import { promisify } from "util";
import { Event } from "vs/base/common/event";
import * as storage from "vs/base/node/storage";

export class StorageDatabase implements storage.IStorageDatabase {

	public readonly onDidChangeItemsExternal = Event.None;
	private items = new Map<string, string>();
	private fetched: boolean = false;

	public constructor(private readonly path: string) {
		window.addEventListener("unload", () => {
			if (!navigator.sendBeacon) {
				throw new Error("cannot save state");
			}
			// TODO: Need to use navigator.sendBeacon instead of the web socket, or we
			// need to save when there is a change. Should we save as a sqlite3
			// database instead of JSON? Could send to the server the way the global
			// storage works. Or maybe fill `vscode-sqlite3` to do that.
			this.save();
		});
	}

	public async getItems(): Promise<Map<string, string>> {
		if (this.fetched) {
			return this.items;
		}
		try {
			const contents = await promisify(readFile)(this.path, "utf8");
			const json = JSON.parse(contents);
			Object.keys(json).forEach((key) => {
				this.items.set(key, json[key]);
			});
		} catch (error) {
			if (error.code && error.code !== "ENOENT") {
				throw error;
			}
		}

		this.fetched = true;

		return this.items;
	}

	public updateItems(request: storage.IUpdateRequest): Promise<void> {
		if (request.insert) {
			request.insert.forEach((value, key) => this.items.set(key, value));
		}

		if (request.delete) {
			request.delete.forEach(key => this.items.delete(key));
		}

		return Promise.resolve();
	}

	public close(): Promise<void> {
		return Promise.resolve();
	}

	public checkIntegrity(): Promise<string> {
		return Promise.resolve("ok");
	}

	private save(): Promise<void> {
		const json: { [key: string]: string } = {};
		this.items.forEach((value, key) => {
			json[key] = value;
		});

		return promisify(writeFile)(this.path, JSON.stringify(json));
	}

}

// @ts-ignore
storage.SQLiteStorageDatabase = StorageDatabase;